import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'
import { Clock3, ReceiptText, RefreshCw, ShieldCheck } from 'lucide-react'
import {
  createReceiptLinkToken,
  fetchCustomerReceipts,
  fetchReceiptDeliveryPreference,
  updateReceiptDeliveryPreference,
  type CustomerReceipt,
  type ReceiptDeliveryPreference,
  type ReceiptLinkToken,
} from '../../../services/api/receiptApi'
import { getErrorMessage } from '../../../services/api/httpClient'

function getSecondsRemaining(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainder = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

export function CustomerReceiptsPage() {
  const [receiptLink, setReceiptLink] = useState<ReceiptLinkToken | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [receipts, setReceipts] = useState<CustomerReceipt[]>([])
  const [receiptsLoading, setReceiptsLoading] = useState(true)
  const [receiptsError, setReceiptsError] = useState('')
  const [deliveryPreference, setDeliveryPreference] = useState<ReceiptDeliveryPreference | null>(null)
  const [preferenceLoading, setPreferenceLoading] = useState(true)
  const [preferenceSaving, setPreferenceSaving] = useState(false)
  const [preferenceError, setPreferenceError] = useState('')

  useEffect(() => {
    let active = true
    fetchCustomerReceipts()
      .then((items) => {
        if (active) setReceipts(items)
      })
      .catch((fetchError: unknown) => {
        if (active) setReceiptsError(getErrorMessage(fetchError, 'Could not load your receipts.'))
      })
      .finally(() => {
        if (active) setReceiptsLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    fetchReceiptDeliveryPreference()
      .then((preference) => {
        if (active) setDeliveryPreference(preference)
      })
      .catch((fetchError: unknown) => {
        if (active) setPreferenceError(getErrorMessage(fetchError, 'Could not load receipt delivery settings.'))
      })
      .finally(() => {
        if (active) setPreferenceLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!receiptLink) return

    const updateExpiry = () => {
      const remaining = getSecondsRemaining(receiptLink.expiresAt)
      setSecondsRemaining(remaining)
      if (remaining === 0) setReceiptLink(null)
    }

    updateExpiry()
    const intervalId = window.setInterval(updateExpiry, 1000)
    return () => window.clearInterval(intervalId)
  }, [receiptLink])

  const handleCreateQr = async () => {
    setLoading(true)
    setError('')
    setReceiptLink(null)

    const result = await createReceiptLinkToken()
    if (result.ok && result.token) {
      setSecondsRemaining(getSecondsRemaining(result.token.expiresAt))
      setReceiptLink(result.token)
    } else {
      setError(result.message ?? 'Could not create a receipt QR code.')
    }
    setLoading(false)
  }

  const handleRefreshReceipts = async () => {
    setReceiptsLoading(true)
    setReceiptsError('')
    try {
      setReceipts(await fetchCustomerReceipts())
    } catch (fetchError: unknown) {
      setReceiptsError(getErrorMessage(fetchError, 'Could not load your receipts.'))
    } finally {
      setReceiptsLoading(false)
    }
  }

  const handleReceiptDeliveryToggle = async (channel: 'email' | 'phone', enabled: boolean) => {
    if (!deliveryPreference) return
    setPreferenceSaving(true)
    setPreferenceError('')
    try {
      const emailEnabled = channel === 'email' ? enabled : deliveryPreference.emailEnabled
      const phoneEnabled = channel === 'phone' ? enabled : deliveryPreference.phoneEnabled
      setDeliveryPreference(await updateReceiptDeliveryPreference(emailEnabled, phoneEnabled))
    } catch (saveError: unknown) {
      setPreferenceError(getErrorMessage(saveError, 'Could not update receipt delivery settings.'))
    } finally {
      setPreferenceSaving(false)
    }
  }

  return (
    <Stack spacing={2.5} sx={{ pb: 3 }}>
      <Box>
        <Typography sx={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.045em' }}>
          Shopping receipts
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8, lineHeight: 1.6 }}>
          Receive receipts from participating stores directly in BHive.
        </Typography>
      </Box>

      <Card elevation={0} sx={{ borderRadius: 3.5, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', textAlign: 'center' }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 3,
                display: 'grid',
                placeItems: 'center',
                color: 'primary.main',
                bgcolor: 'action.hover',
              }}
            >
              <ReceiptText size={25} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
                Get a receipt at checkout
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
                Generate a temporary QR code and ask the cashier to scan it after your purchase.
              </Typography>
            </Box>

            {receiptLink ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, alignItems: 'center' }}>
                <Box
                  role="img"
                  aria-label="Temporary receipt QR code"
                  sx={{ p: 1.5, bgcolor: '#fff', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                >
                  <QRCodeSVG value={receiptLink.token} size={208} level="M" includeMargin />
                </Box>
                <Typography
                  variant="body2"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.7, fontWeight: 700 }}
                  color={secondsRemaining > 0 ? 'text.primary' : 'error.main'}
                >
                  <Clock3 size={16} />
                  {secondsRemaining > 0
                    ? `Expires in ${formatCountdown(secondsRemaining)}`
                    : 'This QR code has expired.'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  The QR code is for one receipt and can only be used once.
                </Typography>
              </Box>
            ) : (
              <Button
                variant="contained"
                onClick={handleCreateQr}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshCw size={17} />}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 800, px: 2.5 }}
              >
                {loading ? 'Creating secure QR...' : 'Generate receipt QR'}
              </Button>
            )}

            {receiptLink && (
              <Button
                variant="text"
                onClick={handleCreateQr}
                disabled={loading}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Generate a new QR code
              </Button>
            )}

            {error && <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>{error}</Alert>}
          </Box>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ borderRadius: 3.5, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Typography sx={{ fontWeight: 800, fontSize: 17 }}>Receipts by email or mobile</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6, lineHeight: 1.6 }}>
            Receipt matching by the email and mobile in your BHive customer profile is on by default. Turn off either channel if you do not want retailers to use it.
          </Typography>
          <FormControlLabel
            sx={{ mt: 1 }}
            control={(
              <Switch
                checked={deliveryPreference?.emailEnabled ?? false}
                onChange={(event) => { void handleReceiptDeliveryToggle('email', event.target.checked) }}
                disabled={
                  preferenceLoading
                  || preferenceSaving
                  || (!deliveryPreference?.emailAvailable && !deliveryPreference?.emailEnabled)
                  || (!deliveryPreference?.contactMatchingEnabled && !deliveryPreference?.emailEnabled)
                }
              />
            )}
            label={`Use my customer-profile email${preferenceSaving ? ' (updating...)' : ''}`}
          />
          <FormControlLabel
            control={(
              <Switch
                checked={deliveryPreference?.phoneEnabled ?? false}
                onChange={(event) => { void handleReceiptDeliveryToggle('phone', event.target.checked) }}
                disabled={
                  preferenceLoading
                  || preferenceSaving
                  || (!deliveryPreference?.phoneAvailable && !deliveryPreference?.phoneEnabled)
                  || (!deliveryPreference?.contactMatchingEnabled && !deliveryPreference?.phoneEnabled)
                }
              />
            )}
            label="Use my customer-profile mobile number"
          />
          {preferenceLoading && <CircularProgress size={18} sx={{ ml: 1 }} />}
          {preferenceError && <Alert severity="error" sx={{ mt: 1 }}>{preferenceError}</Alert>}
          {deliveryPreference && !deliveryPreference.emailAvailable && (
            <Alert severity="warning" sx={{ mt: 1 }}>Add a valid email address to your BHive account to enable email matching.</Alert>
          )}
          {deliveryPreference && !deliveryPreference.phoneAvailable && (
            <Alert severity="warning" sx={{ mt: 1 }}>Add a valid mobile number to your BHive account to enable mobile matching.</Alert>
          )}
          {deliveryPreference && !deliveryPreference.contactMatchingEnabled && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Contact matching is disabled in this environment until contact verification is configured.
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            You can change these choices at any time. BHive uses the contact only to find your account; it does not share it with the retailer. In this development environment, saved contacts are treated as verified. OTP verification must be enabled before production.
          </Typography>
        </CardContent>
      </Card>

      <Alert icon={<ShieldCheck size={18} />} severity="info">
        Only show this QR code when you want to share a receipt. It expires after five minutes. BHive never shares your phone number with the store through this QR code.
      </Alert>

      <Card elevation={0} sx={{ borderRadius: 3.5, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 17 }}>Your receipt inbox</Typography>
            <Button size="small" onClick={handleRefreshReceipts} disabled={receiptsLoading}>Refresh</Button>
          </Box>
          {receiptsError && <Alert severity="error" sx={{ mt: 1 }}>{receiptsError}</Alert>}
          {receiptsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>
          ) : receipts.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.7, lineHeight: 1.6 }}>
              No receipts yet. Receipts sent by participating retailers will appear here.
            </Typography>
          ) : (
            <Stack spacing={1.5} sx={{ mt: 1.2 }}>
              {receipts.map((receipt) => (
                <Box key={receipt.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 800 }}>{receipt.retailerName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {receipt.outletName} · {receipt.receiptNumber}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: receipt.currency }).format(receipt.totalAmount)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.6, display: 'block' }}>
                    {new Date(receipt.transactionAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Stack spacing={0.6}>
                    {receipt.items.map((item, index) => (
                      <Box key={`${receipt.id}-${index}`} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="body2">{item.productName} × {item.quantity}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: receipt.currency }).format(item.lineTotal)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}
