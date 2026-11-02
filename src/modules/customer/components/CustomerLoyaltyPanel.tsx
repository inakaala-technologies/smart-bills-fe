import { useEffect, useState } from 'react'
import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
import { Award } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { fetchLoyaltyBalance, type BusinessSummary, type LoyaltyBalance } from '../../../services/api'

type CustomerLoyaltyPanelProps = {
  customerId: number | null
  businesses: BusinessSummary[]
}

type BusinessBalance = {
  business: BusinessSummary
  balance?: LoyaltyBalance
  error?: string
}

export function CustomerLoyaltyPanel({ customerId, businesses }: CustomerLoyaltyPanelProps) {
  const navigate = useNavigate()
  const [balances, setBalances] = useState<BusinessBalance[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (customerId == null || businesses.length === 0) {
      setBalances([])
      setLoading(false)
      return
    }

    let isCurrent = true
    setLoading(true)
    Promise.all(businesses.map(async (business): Promise<BusinessBalance> => {
      try {
        const balance = await fetchLoyaltyBalance(business.id, customerId)
        return { business, balance }
      } catch (error) {
        return {
          business,
          error: error instanceof Error ? error.message : 'Could not load points balance.',
        }
      }
    })).then((results) => {
      if (isCurrent) setBalances(results)
    }).finally(() => {
      if (isCurrent) setLoading(false)
    })

    return () => { isCurrent = false }
  }, [businesses, customerId])

  return (
    <Stack spacing={1.6}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Your rewards</Typography>
        <Typography variant="body2" color="text.secondary">Check loyalty points you can use with each business.</Typography>
      </Box>
      {customerId == null ? (
        <Alert severity="info">Your customer profile is not available yet.</Alert>
      ) : businesses.length === 0 ? (
        <Alert severity="info">Your points will appear here once you are linked to a business with a loyalty programme.</Alert>
      ) : loading && balances.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={26} /></Box>
      ) : (
        <Stack spacing={1.2}>
          {balances.map(({ business, balance, error }) => (
            <Card
              key={business.id}
              component="button"
              type="button"
              variant="outlined"
              onClick={() => navigate(`/business/${business.id}`)}
              aria-label={`View ${business.businessName ?? business.name ?? 'business'} details`}
              sx={{
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 3,
                color: 'inherit',
                backgroundColor: 'background.paper',
                '&:hover': { borderColor: 'primary.main', backgroundColor: 'action.hover' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
              }}
            >
              <CardContent>
                {error ? (
                  <Alert severity="error">{business.businessName ?? business.name ?? 'Business'}: {error}</Alert>
                ) : (
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: 'primary.light', color: 'primary.dark' }}>
                      <Award size={22} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 750 }}>{business.businessName ?? business.name ?? 'Business'}</Typography>
                      <Typography variant="body2" color="text.secondary">Loyalty points</Typography>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 850, color: 'primary.main' }}>
                      {(balance?.balance ?? 0).toLocaleString('en-IN')}
                    </Typography>
                  </Stack>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
