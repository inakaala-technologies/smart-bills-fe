import { useEffect, useState } from 'react'
import { alpha, Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { EmptyState } from '../../../components/EmptyState'
import { fetchBusinessLoyaltyBalances, type DashboardData } from '../../../services/api'

export type CustomerListCardProps = {
  customers: DashboardData['customers']
  businessId: number
  onOpenCustomer: (customerId: number) => void
}

export function CustomerListCard({ customers, businessId, onOpenCustomer }: CustomerListCardProps) {
  const [balances, setBalances] = useState<Record<number, number>>({})
  const [balanceError, setBalanceError] = useState('')

  useEffect(() => {
    let isCurrent = true
    fetchBusinessLoyaltyBalances(businessId).then((records) => {
      if (isCurrent) setBalances(Object.fromEntries(records.map((record) => [record.customerId, record.balance])))
    }).catch((error) => {
      if (isCurrent) setBalanceError(error instanceof Error ? error.message : 'Could not load customer loyalty balances.')
    })
    return () => { isCurrent = false }
  }, [businessId])

  return (
    <Card variant="outlined" sx={(theme) => ({ borderRadius: 3, border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}` })}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Customers</Typography>
        {balanceError && <Alert severity="error" sx={{ mb: 1.3 }}>{balanceError}</Alert>}
        {customers.length > 0 ? (
          <Stack spacing={1.2}>
            {customers.map((customer) => (
              <Box key={customer.id} sx={(theme) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.8, borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.06)}` })}>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{customer.fullName ?? 'Customer'}</Typography>
                  <Typography variant="caption" color="text.secondary">{customer.email ?? 'No email'}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: 'success.main', fontWeight: 700 }}>
                    {Number(balances[customer.id] ?? 0).toLocaleString('en-IN')} loyalty points
                  </Typography>
                </Box>
                <Button size="small" variant="text" onClick={() => onOpenCustomer(customer.id)}>View</Button>
              </Box>
            ))}
          </Stack>
        ) : (
          <EmptyState title="No customers" description="Customer records will appear here." />
        )}
      </CardContent>
    </Card>
  )
}
