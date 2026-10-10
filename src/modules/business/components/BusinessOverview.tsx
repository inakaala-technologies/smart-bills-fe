import { alpha, Box, Button, Chip, Stack, Typography } from '@mui/material'
import { EmptyState } from '../../../components/EmptyState'
import { useAppSelector } from '../../../store/hooks'

export type BusinessOverviewProps = {
  onOpenBusiness: (businessId: number) => void
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

export function BusinessOverview({ onOpenBusiness }: BusinessOverviewProps) {
  const { data, selectedBusinessId, summary } = useAppSelector((state) => state.businessDashboard)
  const selectedBusiness = data.businesses.find((business) => business.id === selectedBusinessId) ?? data.businesses[0] ?? null
  const activeBusinessLabel = selectedBusiness ? (selectedBusiness.businessName ?? selectedBusiness.name ?? 'Business workspace') : 'No business selected'
  const recentActivity = (summary?.recentTransactions?.length
    ? summary.recentTransactions
    : data.invoices.slice(0, 3).map((invoice) => ({
        id: invoice.id,
        name: invoice.invoiceNumber ?? `INV-${invoice.id}`,
        amount: Number(invoice.totalAmount ?? 0),
        meta: invoice.status ?? 'SENT',
        date: invoice.issueDate
          ? new Date(invoice.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          : '—',
      })))
    .map((entry) => ({
      label: entry.name,
      detail: `${entry.meta} • ${entry.date}`,
      value: formatCurrency(entry.amount),
    }))
  const businesses = data.businesses

  return (
    <Stack spacing={1.8}>
      <Box sx={(theme) => ({ background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${theme.palette.common.white} 100%)`, borderRadius: 3.2, p: 1.5, border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`, boxShadow: `0 10px 20px ${alpha(theme.palette.common.black, 0.025)}` })}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Business snapshot</Typography>
          <Chip label={selectedBusiness?.status ?? 'active'} size="small" sx={(theme) => ({ bgcolor: alpha(theme.palette.success.main, 0.14), color: theme.palette.success.dark, fontWeight: 700 })} />
        </Box>
        <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary, fontWeight: 700 })}>{activeBusinessLabel}</Typography>

        {businesses.length > 0 ? (
          <Stack spacing={1.2}>
            {businesses.slice(0, 3).map((business) => (
              <Box key={business.id} sx={(theme) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.06)}` })}>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{business.businessName ?? business.name ?? `Business ${business.id}`}</Typography>
                  <Typography variant="caption" color="text.secondary">{business.email ?? 'No email'}</Typography>
                </Box>
                <Button size="small" variant="text" onClick={() => onOpenBusiness(business.id)}>View</Button>
              </Box>
            ))}
          </Stack>
        ) : (
          <EmptyState title="No business data" description="Add a business connection to continue." />
        )}
      </Box>

      <Box sx={(theme) => ({ background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${theme.palette.common.white} 100%)`, borderRadius: 3.2, p: 1.5, border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`, boxShadow: `0 10px 20px ${alpha(theme.palette.common.black, 0.025)}` })}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Recent invoices</Typography>
        </Box>

        {recentActivity.length > 0 ? (
          <Stack spacing={1.1}>
            {recentActivity.map((entry, idx) => (
              <Box key={`${entry.label}-${idx}`} sx={(theme) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.9, borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.06)}` })}>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{entry.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{entry.detail}</Typography>
                </Box>
                <Typography sx={(theme) => ({ fontWeight: 800, color: theme.palette.text.primary })}>{entry.value}</Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <EmptyState title="No activity" description="Financial activity will show here." />
        )}
      </Box>
    </Stack>
  )
}
