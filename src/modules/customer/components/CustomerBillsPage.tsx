
import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  ArrowLeft,
  Droplets,
  ReceiptText,
  Smartphone,
  Wifi,
  Zap,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'

const billCategories = [
  {
    id: 'electricity',
    label: 'Electricity',
    description: 'Electricity bill payments',
    icon: Zap,
  },
  {
    id: 'water',
    label: 'Water',
    description: 'Water bill payments',
    icon: Droplets,
  },
  {
    id: 'mobile',
    label: 'Mobile Recharge',
    description: 'Recharge your number',
    icon: Smartphone,
  },
  {
    id: 'broadband',
    label: 'Broadband',
    description: 'Internet and Wi-Fi bills',
    icon: Wifi,
  },
  {
    id: 'other',
    label: 'Other Bills',
    description: 'Explore other payments',
    icon: ReceiptText,
  },
] as const

type BillCategory = (typeof billCategories)[number]['id']

const electricityProviders = [
  { label: 'PuVVNL', value: 'PuVVNL' },
  { label: 'MVVNL', value: 'MVVNL' },
  { label: 'DVVNL', value: 'DVVNL' },
  { label: 'PVVNL', value: 'PVVNL' },
]

const API_DISCOM_VALUE = 'PuVVNL,MVVNL,DVVNL,PVVNL'

export function CustomerBillsPage() {
  const [category, setCategory] =
    useState<BillCategory>('electricity')
  const [provider, setProvider] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] =
    useState<'info' | 'warning'>('info')

  const handleCategoryChange = (nextCategory: BillCategory) => {
    setCategory(nextCategory)
    setProvider('')
    setAccountNo('')
    setMessage('')
  }

  const handleContinue = () => {
    setMessage('')

    if (category !== 'electricity') {
      setMessageType('info')
      setMessage(
        'This bill category will be available after its provider API is integrated.',
      )
      return
    }

    if (!provider) {
      setMessageType('warning')
      setMessage('Please select your electricity provider.')
      return
    }

    if (!accountNo.trim()) {
      setMessageType('warning')
      setMessage('Please enter your electricity account number.')
      return
    }

    // Preview the fields for backend integration.
    // Do not call API Setu directly from the browser.
    const requestDetails = {
      format: 'xml',
      certificateParameters: {
        AccountNo: accountNo.trim(),
        Discom: API_DISCOM_VALUE,
      },
    }

    console.log('Validated electricity details:', {
      selectedProvider: provider,
      requestDetails,
    })

    setMessageType('info')
    setMessage(
      `Your details are validated for ${provider}. Bill fetching will work after the backend is connected.`,
    )
  }

  return (
    <Stack spacing={2.5} sx={{ pb: 3 }}>
      {/* Page heading */}
      <Box>
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={() => window.history.back()}
          sx={{
            mb: 1.5,
            px: 0,
            textTransform: 'none',
            fontWeight: 700,
          }}
        >
          Back to dashboard
        </Button>

        <Typography
          sx={{
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: '-0.045em',
            lineHeight: 1.2,
          }}
        >
          Pay your bills
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.8, lineHeight: 1.6 }}
        >
          Manage your utility bills and recharges in one place.
        </Typography>
      </Box>

      {/* Intro banner */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3.5,
          color: 'primary.contrastText',
          background:
            'linear-gradient(135deg, #155eef 0%, #3538cd 100%)',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: 2.3, '&:last-child': { pb: 2.3 } }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.16)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <ReceiptText size={25} />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: 17 }}>
                All bills, one place
              </Typography>
              <Typography
                variant="body2"
                sx={{ opacity: 0.9, mt: 0.4 }}
              >
                Select a category to get started.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Category selection */}
      <Box>
        <Typography sx={{ fontWeight: 900, fontSize: 17, mb: 1.3 }}>
          Choose a category
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 1.2,
          }}
        >
          {billCategories.map((item) => {
            const Icon = item.icon
            const selected = category === item.id

            return (
              <Card
                key={item.id}
                variant="outlined"
                onClick={() => handleCategoryChange(item.id)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 3,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? 'primary.main' : 'divider',
                  bgcolor: selected ? 'action.selected' : 'background.paper',
                  transition: 'border-color 0.18s ease',
                  ...(item.id === 'other'
                    ? { gridColumn: '1 / -1' }
                    : {}),
                }}
              >
                <CardContent
                  sx={{ p: 1.6, '&:last-child': { pb: 1.6 } }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1.2,
                    }}
                  >
                    <Box
                      sx={{
                        height: 42,
                        width: 42,
                        borderRadius: 2.5,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: selected
                          ? 'primary.main'
                          : 'action.hover',
                        color: selected
                          ? 'primary.contrastText'
                          : 'primary.main',
                      }}
                    >
                      <Icon size={21} />
                    </Box>

                    {selected && (
                      <ShieldCheck
                        size={18}
                        color="currentColor"
                      />
                    )}
                  </Box>

                  <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                    {item.label}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.5, lineHeight: 1.5 }}
                  >
                    {item.description}
                  </Typography>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      </Box>

      {/* Form */}
      <Card
        variant="outlined"
        sx={{ borderRadius: 3.5, borderColor: 'divider' }}
      >
        <CardContent sx={{ p: 2.2, '&:last-child': { pb: 2.2 } }}>
          <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
            {category === 'electricity'
              ? 'Electricity bill details'
              : billCategories.find((item) => item.id === category)?.label}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.6, mb: 2.2, lineHeight: 1.6 }}
          >
            {category === 'electricity'
              ? 'Select your distribution company and enter the account number shown on your bill.'
              : 'Provider and bill retrieval integration for this category is not available yet.'}
          </Typography>

          {category === 'electricity' && (
            <Stack spacing={2}>
              <TextField
                select
                fullWidth
                required
                label="Select Provider"
                value={provider}
                onChange={(event) => {
                  setProvider(event.target.value)
                  setMessage('')
                }}
                helperText="Choose the distribution company for your electricity connection."
              >
                {electricityProviders.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                required
                label="Account Number"
                placeholder="Enter your electricity account number"
                value={accountNo}
                onChange={(event) => {
                  setAccountNo(event.target.value)
                  setMessage('')
                }}
                slotProps={{ htmlInput: { maxLength: 30 } }}
                helperText="Enter the account number associated with your connection."
              />
            </Stack>
          )}

          {message && (
            <Alert
              severity={messageType}
              sx={{ mt: 2, borderRadius: 2 }}
            >
              {message}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleContinue}
            endIcon={<ChevronRight size={19} />}
            sx={{
              mt: 2.5,
              py: 1.45,
              borderRadius: 2.5,
              textTransform: 'none',
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            Continue
          </Button>
        </CardContent>
      </Card>

      {/* Security note */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 1,
          px: 1,
        }}
      >
        <ShieldCheck
          size={17}
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textAlign: 'left', lineHeight: 1.6 }}
        >
          Your account details should be handled securely. Actual bill
          retrieval requires backend API integration and valid consent.
        </Typography>
      </Box>
    </Stack>
  )
}
