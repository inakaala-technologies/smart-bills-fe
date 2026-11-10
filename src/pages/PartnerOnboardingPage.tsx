import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { Link } from 'react-router-dom'
import {
  fetchPartnerApplicationStatus,
  submitPartnerApplication,
  type PartnerApplicationForm,
  type PartnerApplicationStatus,
} from '../services/api/posPartnerApi'
import { getErrorMessage } from '../services/api/httpClient'

type SigningKeys = {
  publicKey: CryptoKey
  privateKey: CryptoKey
}

type StatusCredential = {
  applicationId: string
  statusAccessToken: string
}

const initialForm: PartnerApplicationForm = {
  partnerName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  retailerReference: '',
  retailerName: '',
  outletReference: '',
  outletName: '',
}

const statusStorageKey = 'bhive_pos_partner_application_status'

const receiptStatuses = [
  ['201 Created', 'A new QR-linked receipt was saved and linked to the customer.'],
  ['202 Accepted', 'A receipt was saved for an eligible email or phone match. The customer identity is not included in the response.'],
  ['400 Bad Request', 'The JSON, fields, headers, contact format, or approved retailer/outlet references are invalid.'],
  ['401 Unauthorized', 'The partner is inactive, or the signature or timestamp is invalid or expired.'],
  ['409 Conflict', 'The nonce was replayed, contact matching is disabled, or the idempotency key / external receipt ID was used before. Exact retries also return 409.'],
  ['413 Payload Too Large', 'The request body exceeds 1 MiB.'],
  ['422 Unprocessable Entity', 'The QR token is invalid, expired, or already used, or no eligible customer matches the email or phone.'],
  ['429 Too Many Requests', 'The request was rate-limited; follow the Retry-After header.'],
  ['500 Internal Server Error', 'BHive encountered an unexpected error. Check the result before retrying to avoid duplicate submissions.'],
]

function toBase64(bytes: ArrayBuffer): string {
  const byteArray = new Uint8Array(bytes)
  let binary = ''
  byteArray.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function toPem(label: string, base64: string): string {
  const lines = base64.match(/.{1,64}/g)?.join('\n') ?? base64
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`
}

function canonicalApplication(form: PartnerApplicationForm, publicKey: string): string {
  return [
    'BHIVE_POS_ONBOARDING_V1',
    form.partnerName.trim(),
    form.contactName.trim(),
    form.contactEmail.trim().toLowerCase(),
    form.contactPhone.trim(),
    form.retailerReference.trim(),
    form.retailerName.trim(),
    form.outletReference.trim(),
    form.outletName.trim(),
    publicKey,
  ].join('\n')
}

function readStatusCredential(): StatusCredential | null {
  try {
    const stored = sessionStorage.getItem(statusStorageKey)
    if (!stored) return null
    const parsed = JSON.parse(stored) as Partial<StatusCredential>
    return typeof parsed.applicationId === 'string' && typeof parsed.statusAccessToken === 'string'
      ? { applicationId: parsed.applicationId, statusAccessToken: parsed.statusAccessToken }
      : null
  } catch {
    return null
  }
}

export function PartnerOnboardingPage() {
  const [form, setForm] = useState(initialForm)
  const [keys, setKeys] = useState<SigningKeys | null>(null)
  const [publicKeyBase64, setPublicKeyBase64] = useState('')
  const [credential, setCredential] = useState<StatusCredential | null>(readStatusCredential)
  const [applicationStatus, setApplicationStatus] = useState<PartnerApplicationStatus | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusStorageWarning, setStatusStorageWarning] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(() => Boolean(readStatusCredential()))

  useEffect(() => {
    if (!credential) return
    let active = true
    fetchPartnerApplicationStatus(credential.applicationId, credential.statusAccessToken)
      .then((status) => {
        if (active) {
          setApplicationStatus(status)
          setStatusMessage('')
        }
      })
      .catch((error: unknown) => {
        if (active) setStatusMessage(getErrorMessage(error, 'Could not load application status.'))
      })
      .finally(() => {
        if (active) setIsRefreshingStatus(false)
      })
    return () => { active = false }
  }, [credential])

  const updateForm = (field: keyof PartnerApplicationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const generateKeyPair = async () => {
    setErrorMessage('')
    setIsGeneratingKey(true)
    try {
      const generated = await window.crypto.subtle.generateKey(
        { name: 'Ed25519' },
        true,
        ['sign', 'verify'],
      )
      if (!('privateKey' in generated) || !('publicKey' in generated)) {
        throw new Error('The browser did not return an Ed25519 keypair.')
      }
      const publicKey = toBase64(await window.crypto.subtle.exportKey('spki', generated.publicKey))
      const privateKey = toBase64(await window.crypto.subtle.exportKey('pkcs8', generated.privateKey))
      setKeys({ publicKey: generated.publicKey, privateKey: generated.privateKey })
      setPublicKeyBase64(publicKey)
      const privateKeyFile = new Blob([toPem('PRIVATE KEY', privateKey)], { type: 'application/x-pem-file' })
      const downloadUrl = URL.createObjectURL(privateKeyFile)
      const downloadLink = document.createElement('a')
      downloadLink.href = downloadUrl
      downloadLink.download = 'bhive-pos-ed25519-private-key.pem'
      downloadLink.click()
      URL.revokeObjectURL(downloadUrl)
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Could not generate an Ed25519 keypair in this browser.'))
    } finally {
      setIsGeneratingKey(false)
    }
  }

  const refreshStatus = async () => {
    if (!credential) return
    setIsRefreshingStatus(true)
    setStatusMessage('')
    try {
      setApplicationStatus(await fetchPartnerApplicationStatus(
        credential.applicationId,
        credential.statusAccessToken,
      ))
    } catch (error: unknown) {
      setStatusMessage(getErrorMessage(error, 'Could not load application status.'))
    } finally {
      setIsRefreshingStatus(false)
    }
  }

  const submit = async () => {
    setErrorMessage('')
    if (!keys || !publicKeyBase64) {
      setErrorMessage('Generate and securely save an Ed25519 keypair before submitting.')
      return
    }
    setIsSubmitting(true)
    try {
      const normalizedForm = {
        ...form,
        contactEmail: form.contactEmail.trim().toLowerCase(),
      }
      const signatureBytes = await window.crypto.subtle.sign(
        'Ed25519',
        keys.privateKey,
        new TextEncoder().encode(canonicalApplication(normalizedForm, publicKeyBase64)),
      )
      const response = await submitPartnerApplication({
        ...normalizedForm,
        publicKey: publicKeyBase64,
        proofSignature: toBase64(signatureBytes),
      })
      const nextCredential = {
        applicationId: response.applicationId,
        statusAccessToken: response.statusAccessToken,
      }
      try {
        sessionStorage.setItem(statusStorageKey, JSON.stringify(nextCredential))
        setStatusStorageWarning('')
      } catch {
        setStatusStorageWarning('Browser session storage is unavailable. Keep this page open and save the status token shown below.')
      }
      setIsRefreshingStatus(true)
      setCredential(nextCredential)
      setStatusMessage('')
      setKeys(null)
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Could not submit partner application.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 5 }, minHeight: '100dvh' }}>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="overline" color="primary" sx={{ fontWeight: 800 }}>BHive POS integration</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>Partner onboarding</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Submit your integration details for BHive administrator review.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setHelpOpen(true)}
              aria-haspopup="dialog"
            >
              Help
            </Button>
          </Box>

          {credential ? (
            <Stack spacing={1.5}>
              <Alert severity={applicationStatus?.status === 'APPROVED' ? 'success' : applicationStatus?.status === 'REJECTED' ? 'error' : 'info'}>
                Application {credential.applicationId}: {isRefreshingStatus ? 'Checking status…' : applicationStatus?.status ?? 'Status unavailable'}
              </Alert>
              <Alert severity="warning">
                Save this status access token securely. It is shown only in this browser session and is required to check this application later.
              </Alert>
              {statusStorageWarning && <Alert severity="warning">{statusStorageWarning}</Alert>}
              <TextField
                label="Application status access token"
                value={credential.statusAccessToken}
                multiline
                minRows={2}
                slotProps={{ input: { readOnly: true } }}
              />
              {applicationStatus?.partnerId && (
                <Alert severity="success">
                  Approved partner ID: <strong>{applicationStatus.partnerId}</strong>. Use the private key you downloaded when submitting signed receipt requests.
                </Alert>
              )}
              {applicationStatus?.decisionReason && (
                <Alert severity={applicationStatus.status === 'REJECTED' ? 'warning' : 'info'}>
                  Admin note: {applicationStatus.decisionReason}
                </Alert>
              )}
              {statusMessage && <Alert severity="error">{statusMessage}</Alert>}
              <Button variant="outlined" onClick={refreshStatus} disabled={isRefreshingStatus}>
                Refresh application status
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  try {
                    sessionStorage.removeItem(statusStorageKey)
                  } catch {
                    setStatusStorageWarning('Could not clear the saved status token from this browser session.')
                  }
                  setCredential(null)
                  setApplicationStatus(null)
                }}
              >
                Start a new application
              </Button>
            </Stack>
          ) : (
            <>
              <Alert severity="warning">
                Your private key is generated in this browser and downloaded once. Keep it secure; BHive receives only the public key.
              </Alert>
              <Stack spacing={1.25}>
                <TextField required label="POS provider / partner name" value={form.partnerName} onChange={(event) => updateForm('partnerName', event.target.value)} slotProps={{ htmlInput: { maxLength: 160 } }} />
                <TextField required label="Contact person" value={form.contactName} onChange={(event) => updateForm('contactName', event.target.value)} slotProps={{ htmlInput: { maxLength: 160 } }} />
                <TextField required type="email" label="Contact email" value={form.contactEmail} onChange={(event) => updateForm('contactEmail', event.target.value)} slotProps={{ htmlInput: { maxLength: 254 } }} />
                <TextField required label="Contact phone" value={form.contactPhone} onChange={(event) => updateForm('contactPhone', event.target.value)} slotProps={{ htmlInput: { maxLength: 32 } }} />
                <TextField required label="Retailer name" value={form.retailerName} onChange={(event) => updateForm('retailerName', event.target.value)} slotProps={{ htmlInput: { maxLength: 160 } }} />
                <TextField required label="Retailer reference" value={form.retailerReference} onChange={(event) => updateForm('retailerReference', event.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
                <TextField required label="Outlet name" value={form.outletName} onChange={(event) => updateForm('outletName', event.target.value)} slotProps={{ htmlInput: { maxLength: 160 } }} />
                <TextField required label="Outlet reference" value={form.outletReference} onChange={(event) => updateForm('outletReference', event.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
              </Stack>
              {publicKeyBase64 && <Alert severity="success">Ed25519 public key generated; private key file downloaded.</Alert>}
              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
              <Button variant="outlined" onClick={generateKeyPair} disabled={isGeneratingKey || isSubmitting}>
                {isGeneratingKey ? 'Generating keypair…' : publicKeyBase64 ? 'Generate a new keypair' : 'Generate secure keypair'}
              </Button>
              <TextField
                label="Ed25519 public key (Base64)"
                value={publicKeyBase64}
                multiline
                minRows={2}
                slotProps={{ input: { readOnly: true } }}
              />
              <Button
                variant="contained"
                onClick={submit}
                disabled={isSubmitting || !keys || Object.values(form).some((value) => !value.trim())}
              >
                {isSubmitting ? 'Submitting…' : 'Submit application'}
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Already have an application? Its status is available in this browser session.
              </Typography>
            </>
          )}

          <Button component={Link} to="/" variant="text">Back to BHive sign in</Button>
        </Stack>
      </Paper>
      <Dialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        fullWidth
        maxWidth="md"
        scroll="paper"
        aria-labelledby="partner-onboarding-help-title"
      >
        <DialogTitle id="partner-onboarding-help-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          Partner onboarding and receipt API guide
          <IconButton autoFocus aria-label="Close help" onClick={() => setHelpOpen(false)} edge="end">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Box component="section">
              <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>1. Submit your partner application</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Complete every required field. Retailer and outlet references identify the exact locations authorized to send receipts; use those same values in each receipt request.
              </Typography>
              <Typography component="ul" sx={{ pl: 2.5, mb: 0 }}>
                <li><strong>partnerName:</strong> your integration/company name (up to 160 characters).</li>
                <li><strong>contactName, contactEmail, contactPhone:</strong> a representative BHive can reach (160, 254, and 32 characters maximum).</li>
                <li><strong>retailerName / retailerReference:</strong> the merchant name and stable POS ID (160 / 100 characters maximum).</li>
                <li><strong>outletName / outletReference:</strong> the store name and stable POS ID (160 / 100 characters maximum).</li>
              </Typography>
              <Typography sx={{ mt: 1 }}>
                Select <strong>Generate secure keypair</strong>. Your browser creates an Ed25519 keypair, downloads the private key as a PEM file, and places the Base64 public key in the form. Keep the private key in a server-side secret manager; do not send it to BHive, commit it, or share it. The browser signs the application proof with the private key.
              </Typography>
              <Typography sx={{ mt: 1 }}>
                The browser submits the application to <code>POST /api/v1/pos-partner-applications</code>, which returns <strong>201 Created</strong> with an application ID, a status access token, and <code>status: PENDING</code>. Save the token securely; the refresh button calls <code>GET /api/v1/pos-partner-applications/&lt;applicationId&gt;/status</code>, which returns <strong>200 OK</strong> and requires <code>X-Application-Access-Token</code>. The status becomes <strong>APPROVED</strong> or <strong>REJECTED</strong> after admin review. After approval, use the displayed partner ID and the private key you saved.
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                For reference, the browser signs these newline-separated fields with Ed25519 and submits the Base64 result as <code>proofSignature</code>. Email is lowercased before signing; you do not need to create the signature manually here.
              </Typography>
              <Typography
                component="pre"
                sx={{ mt: 1, p: 1.5, overflowX: 'auto', bgcolor: 'action.hover', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}
              >
                {'BHIVE_POS_ONBOARDING_V1\npartnerName\ncontactName\ncontactEmail (lowercase)\ncontactPhone\nretailerReference\nretailerName\noutletReference\noutletName\npublicKey (Base64 SPKI)'}
              </Typography>
            </Box>

            <Divider />

            <Box component="section">
              <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>2. Send a receipt after a successful sale</Typography>
              <Typography sx={{ mt: 0.5 }}>
                Send a server-to-server <strong>POST /api/v1/partner/receipts</strong> request with <strong>Content-Type: application/json</strong> and these headers:
              </Typography>
              <Typography component="ul" sx={{ pl: 2.5, mb: 1 }}>
                <li><strong>X-Partner-Id:</strong> the partner ID shown after approval.</li>
                <li><strong>X-Partner-Timestamp:</strong> current ISO-8601 UTC time, within five minutes of BHive's clock.</li>
                <li><strong>X-Partner-Nonce:</strong> a fresh, unique Base64URL value containing at least 16 random bytes.</li>
                <li><strong>X-Partner-Signature:</strong> Base64 Ed25519 signature from your private key.</li>
                <li><strong>Idempotency-Key:</strong> a stable key for this sale, no more than 128 characters.</li>
              </Typography>
              <Typography color="text.secondary">
                Sign the following newline-delimited header, including the final newline, followed immediately by the exact raw JSON body bytes:
              </Typography>
              <Typography
                component="pre"
                sx={{ mt: 1, p: 1.5, overflowX: 'auto', bgcolor: 'action.hover', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}
              >
                {'BHIVE_POS_RECEIPT_V1\nPOST\n/api/v1/partner/receipts\n<partnerId>\n<timestamp>\n<nonce>\n<idempotencyKey>\n<exact raw JSON body>'}
              </Typography>
            </Box>

            <Box component="section">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Receipt body values</Typography>
              <Typography color="text.secondary">
                Required values include an external receipt ID and receipt number (up to 100 characters), the approved retailer/outlet references, an ISO-8601 UTC transaction time, a three-letter uppercase currency, a positive total amount with at most two decimal places, and 1–100 line items. Each item needs a product name, positive quantity (up to three decimal places), unit price, and line total (up to two decimal places).
              </Typography>
              <Typography sx={{ mt: 1 }}>
                Provide exactly one recipient: a one-use customer QR token, a customer email, or a customer phone. Contact details must match an eligible BHive customer profile with that channel enabled.
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                For example, use <code>customerPhone: "+919876543210"</code> instead of email, or provide the customer's QR value as <code>customerLinkToken</code>. Do not send all three.
              </Typography>
              <Typography
                component="pre"
                sx={{ mt: 1, p: 1.5, overflowX: 'auto', bgcolor: 'action.hover', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}
              >
                {'{\n  "externalReceiptId": "sale-2026-001",\n  "receiptNumber": "R-1001",\n  "customerEmail": "customer@example.com",\n  "retailerReference": "<approved retailer reference>",\n  "outletReference": "<approved outlet reference>",\n  "transactionAt": "2026-11-09T05:30:00Z",\n  "currency": "INR",\n  "totalAmount": "125.00",\n  "items": [\n    {\n      "productName": "Tea",\n      "quantity": "1",\n      "unitPrice": "125.00",\n      "lineTotal": "125.00"\n    }\n  ]\n}'}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                For QR delivery, replace <code>customerEmail</code> with <code>customerLinkToken</code>. For phone delivery, use <code>customerPhone</code> instead. Never include more than one of these three recipient fields.
              </Typography>
            </Box>

            <Divider />

            <Box component="section">
              <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>3. Receipt API responses</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
                A successful contact match returns 202; an unknown, opted-out, or ambiguous contact returns a generic 422 without creating a receipt. The different statuses let an authenticated partner infer contact eligibility, so production contact matching remains disabled until contact verification and privacy review are complete.
              </Typography>
              <Stack component="ul" spacing={0.75} sx={{ pl: 2.5, m: 0 }}>
                {receiptStatuses.map(([status, description]) => (
                  <li key={status}>
                    <Typography variant="body2"><strong>{status}:</strong> {description}</Typography>
                  </li>
                ))}
              </Stack>
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                Duplicate IDs always return 409, including an exact retry. After a timeout, that conflict may mean the earlier request succeeded; reconcile the sale before treating it as failed. Use a fresh timestamp, nonce, and signature for a retry, but keep the body and IDs unchanged.
              </Alert>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
