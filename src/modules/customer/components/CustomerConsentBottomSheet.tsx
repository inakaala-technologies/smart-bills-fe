import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  Drawer,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material'
import { ShieldCheck, X } from 'lucide-react'

export const CUSTOMER_CONSENT_STATEMENT_VERSION = '1' as const

const CUSTOMER_CONSENT_STATEMENT = `InGyro Smart Bills – Customer Consent

I voluntarily authorize InGyro to retrieve and process the information requested for the bill, document, insurance, or vehicle-related service I have selected.

I understand and acknowledge that:

1. The information I provide in the form will be used to identify and retrieve the requested records from the relevant service provider or authorized data source.
2. My requested information may be transmitted to the relevant provider or authorized service through InGyro's backend integration.
3. The retrieved information will be displayed to me within the InGyro platform and may be stored in my account's saved records, where applicable.
4. My information will be processed only for the purpose of fulfilling this specific request and related service operations.
5. This consent applies only to the current manual request. It does not authorize recurring, scheduled, or automatic data retrieval.
6. I understand that this InGyro consent acknowledgement is separate from any additional consent or authorization required by the external provider or API Setu.
7. I can choose not to proceed. If I do not provide consent, the requested retrieval will not be initiated.

I confirm that I have read and understood this information and voluntarily authorize InGyro to process my information for the selected request.`

type CustomerConsentBottomSheetProps = {
  open: boolean
  purpose: string
  categoryName: string
  providerName: string
  dataItems: string[]
  unavailableNotice?: string
  errorMessage?: string
  busy?: boolean
  onCancel: () => void
  onContinue: () => void
}

export function CustomerConsentBottomSheet({
  open,
  purpose,
  categoryName,
  providerName,
  dataItems,
  unavailableNotice,
  errorMessage,
  busy = false,
  onCancel,
  onContinue,
}: CustomerConsentBottomSheetProps) {
  const [checked, setChecked] = useState(false)

  const handleCancel = () => {
    if (busy) return
    setChecked(false)
    onCancel()
  }

  const handleContinue = () => {
    if (!checked || busy) return
    setChecked(false)
    onContinue()
  }

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={handleCancel}
      aria-labelledby="customer-consent-title"
      sx={{
        '& .MuiDrawer-paper': {
          width: '100%',
          maxWidth: 600,
          maxHeight: 'min(90dvh, 760px)',
          mx: 'auto',
          borderRadius: { xs: '22px 22px 0 0', sm: '24px 24px 0 0' },
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          overflowY: 'auto',
          pb: 'max(16px, env(safe-area-inset-bottom))',
        },
      }}
    >
      <Box sx={{ width: 36, height: 4, borderRadius: 999, bgcolor: 'action.disabled', mx: 'auto', mt: 1.2 }} />
      <Stack spacing={2} sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box
              sx={{
                display: 'grid',
                placeItems: 'center',
                width: 42,
                height: 42,
                flexShrink: 0,
                borderRadius: 2.5,
                color: 'primary.main',
                bgcolor: 'action.selected',
              }}
            >
              <ShieldCheck size={22} />
            </Box>
            <Box>
              <Typography id="customer-consent-title" sx={{ fontWeight: 900, fontSize: 19 }}>
                Your consent
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review before fetching {categoryName.toLowerCase()} information
              </Typography>
            </Box>
          </Box>
          <Button
            onClick={handleCancel}
            aria-label="Close consent"
            color="inherit"
            sx={{ minWidth: 40, width: 40, height: 40, p: 0, borderRadius: '50%' }}
          >
            <X size={20} />
          </Button>
        </Stack>

        <Divider />

        <Box>
          <Typography variant="caption" color="text.secondary">
            Published consent statement · Version {CUSTOMER_CONSENT_STATEMENT_VERSION}
          </Typography>
          <Box
            role="region"
            aria-label={`InGyro consent statement version ${CUSTOMER_CONSENT_STATEMENT_VERSION}`}
            tabIndex={0}
            sx={{
              mt: 0.75,
              maxHeight: { xs: '32dvh', sm: '40dvh' },
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              p: 1.5,
              color: 'text.secondary',
              fontSize: 13,
              lineHeight: 1.65,
            }}
          >
            {CUSTOMER_CONSENT_STATEMENT}
          </Box>
        </Box>

        <Stack spacing={1.5}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.4 }}>Purpose</Typography>
            <Typography variant="body2" color="text.secondary">{purpose}</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.4 }}>Information accessed</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.6 }}>
              The details you entered for {providerName}, and the bill, policy, challan, or document details returned for this request:
            </Typography>
            <Stack component="ul" spacing={0.25} sx={{ m: 0, pl: 2.5 }}>
              {dataItems.map((item) => (
                <Typography key={item} component="li" variant="body2" color="text.secondary">
                  {item}
                </Typography>
              ))}
            </Stack>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.4 }}>Who accesses it</Typography>
            <Typography variant="body2" color="text.secondary">
              InGyro processes your request through its backend and the selected service provider’s configured integration.
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.4 }}>How it will be used</Typography>
            <Typography variant="body2" color="text.secondary">
              To retrieve and display the requested information and, when returned by the provider, keep it in your Smart Bills saved history. This applies to this manual request only; it does not enable automatic fetching.
            </Typography>
          </Box>
        </Stack>

        {unavailableNotice && <Alert severity="warning">{unavailableNotice}</Alert>}
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        <FormControlLabel
          control={
            <Checkbox
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
              slotProps={{ input: { 'aria-label': 'I have read and consent to this information access' } }}
            />
          }
          label={
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              I have read this information and consent to this fetch request.
            </Typography>
          }
          sx={{ alignItems: 'flex-start', mx: 0, '& .MuiCheckbox-root': { pt: 0.2, pl: 0, pr: 1 } }}
        />

        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          spacing={1.2}
          sx={{ justifyContent: 'flex-end' }}
        >
          <Button
            fullWidth
            variant="outlined"
            onClick={handleCancel}
            disabled={busy}
            sx={{ borderRadius: 2.5, py: 1.1, textTransform: 'none', fontWeight: 800 }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleContinue}
            disabled={!checked || busy}
            sx={{ borderRadius: 2.5, py: 1.1, textTransform: 'none', fontWeight: 800 }}
          >
            {busy ? 'Fetching…' : 'Continue'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}
