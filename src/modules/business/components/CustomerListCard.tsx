import { alpha, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { EmptyState } from '../../../components/EmptyState'
import type { DashboardData } from '../../../services/api'

export type CustomerListCardProps = {
  customers: DashboardData['customers']
  onOpenCustomer: (customerId: number) => void
}

export function CustomerListCard({ customers, onOpenCustomer }: CustomerListCardProps) {
  return (
    <Card variant="outlined" sx={(theme) => ({ borderRadius: 3, border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}` })}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Customers</Typography>
        {customers.length > 0 ? (
          <Stack spacing={1.2}>
            {customers.map((customer) => (
              <Box key={customer.id} sx={(theme) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.8, borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.06)}` })}>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{customer.fullName ?? 'Customer'}</Typography>
                  <Typography variant="caption" color="text.secondary">{customer.email ?? 'No email'}</Typography>
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
