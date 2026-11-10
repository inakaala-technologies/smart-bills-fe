import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { API_BASE_URL } from '../services/api/httpClient'

const receiptEndpoint = '/api/v1/partner/receipts'
const receiptSigningPrefix = `BHIVE_POS_RECEIPT_V1\nPOST\n${receiptEndpoint}\n`

function decodePrivateKey(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')
  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error('Provide a valid PKCS#8 Ed25519 private key PEM.')
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

function toBase64(bytes: ArrayBuffer): string {
  const values = new Uint8Array(bytes)
  let binary = ''
  values.forEach((value) => { binary += String.fromCharCode(value) })
  return btoa(binary)
}

function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  let binary = ''
  bytes.forEach((value) => { binary += String.fromCharCode(value) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function createSampleBody(): string {
  return JSON.stringify({
    externalReceiptId: `dev-test-${Date.now()}`,
    receiptNumber: `DEV-${Date.now()}`,
    customerLinkToken: '',
    customerEmail: '',
    customerPhone: '',
    retailerReference: '',
    outletReference: '',
    transactionAt: new Date().toISOString(),
    currency: 'INR',
    totalAmount: '100.00',
    items: [
      {
        productName: 'Test product',
        quantity: '1',
        unitPrice: '100.00',
        lineTotal: '100.00',
      },
    ],
  }, null, 2)
}

export function DevReceiptSenderPage() {
  const [partnerId, setPartnerId] = useState('')
  const [privateKeyPem, setPrivateKeyPem] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(() => `dev-receipt-${Date.now()}`)
  const [requestBody, setRequestBody] = useState(createSampleBody)
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState('')

  const sendReceipt = async () => {
    setErrorMessage('')
    setResult('')

    if (!partnerId.trim() || !privateKeyPem.trim() || !idempotencyKey.trim()) {
      setErrorMessage('Enter the approved partner ID, its private key, and an idempotency key.')
      return
    }

    let requestData: unknown
    try {
      requestData = JSON.parse(requestBody)
    } catch {
      setErrorMessage('The receipt body must be valid JSON.')
      return
    }
    if (!requestData || typeof requestData !== 'object' || Array.isArray(requestData)) {
      setErrorMessage('The receipt body must be a JSON object.')
      return
    }
    if (new TextEncoder().encode(requestBody).length > 1_048_576) {
      setErrorMessage('The receipt body cannot exceed 1 MiB.')
      return
    }

    setSending(true)
    try {
      const timestamp = new Date().toISOString()
      const nonce = createNonce()
      const signedHeader = `${receiptSigningPrefix}${partnerId.trim()}\n${timestamp}\n${nonce}\n${idempotencyKey.trim()}\n`
      const key = await crypto.subtle.importKey(
        'pkcs8',
        decodePrivateKey(privateKeyPem),
        { name: 'Ed25519' },
        false,
        ['sign'],
      )
      const signature = await crypto.subtle.sign(
        'Ed25519',
        key,
        new TextEncoder().encode(signedHeader + requestBody),
      )

      const response = await fetch(new URL(receiptEndpoint, API_BASE_URL), {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'X-Partner-Id': partnerId.trim(),
          'X-Partner-Timestamp': timestamp,
          'X-Partner-Nonce': nonce,
          'X-Partner-Signature': toBase64(signature),
          'Idempotency-Key': idempotencyKey.trim(),
        },
        body: requestBody,
      })
      const responseBody = await response.text()
      setResult(`HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}\n${responseBody}`)
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Receipt request failed.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="warning.main" sx={{ fontWeight: 800 }}>
              Development-only tool
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>Receipt sender test</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
              Sends a signed request to {new URL(receiptEndpoint, API_BASE_URL).toString()}.
            </Typography>
          </Box>

          <Alert severity="warning">
          Use only a test partner key. The private key stays in this page's memory and is not sent to BHive or saved by this page. Do not use a production private key or share screenshots containing a receipt token, email address, or mobile number.
          </Alert>

          <TextField
            label="Approved partner ID"
            value={partnerId}
            onChange={(event) => setPartnerId(event.target.value)}
            autoComplete="off"
          />
          <TextField
            label="Ed25519 private key (PKCS#8 PEM)"
            value={privateKeyPem}
            onChange={(event) => setPrivateKeyPem(event.target.value)}
            multiline
            minRows={4}
            autoComplete="off"
            spellCheck={false}
          />
          <TextField
            label="Idempotency key"
            value={idempotencyKey}
            onChange={(event) => setIdempotencyKey(event.target.value)}
            helperText="Keep this and the body unchanged for retries. Each click creates a fresh timestamp, nonce, and signature."
            slotProps={{ htmlInput: { maxLength: 128 } }}
          />
          <TextField
            label="Receipt request body (JSON)"
            value={requestBody}
            onChange={(event) => setRequestBody(event.target.value)}
            multiline
            minRows={14}
            spellCheck={false}
          />

          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          {result && (
            <Alert severity={result.startsWith('HTTP 200') || result.startsWith('HTTP 201') || result.startsWith('HTTP 202') ? 'success' : 'error'}>
              <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'monospace' }}>
                {result}
              </Box>
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={sendReceipt} disabled={sending}>
              {sending ? 'Signing and sending…' : 'Sign and send receipt'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setPrivateKeyPem('')
                setPartnerId('')
                setRequestBody(createSampleBody())
                setIdempotencyKey(`dev-receipt-${Date.now()}`)
                setErrorMessage('')
                setResult('')
              }}
            >
              Clear test data
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Container>
  )
}
