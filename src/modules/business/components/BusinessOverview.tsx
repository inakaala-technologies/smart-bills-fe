import { Box, Button, Chip, Stack, Typography, type Theme } from '@mui/material'
import { EmptyState } from '../../../components/EmptyState'
import { useAppSelector } from '../../../store/hooks'
import { parseDateOnly } from '../../../utils/date'

export type BusinessOverviewProps = {
  onOpenBusiness: (businessId: number) => void
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

/* Shared card look: solid theme surface (no white gradient), so it works in light AND dark. */
const cardSx = {
  bgcolor: 'background.paper',
  backgroundImage: 'none',
  borderRadius: '16px',
  p: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: '0 2px 12px rgba(78, 43, 204, 0.08)',
}

const statusChipSx = (theme: Theme) => ({
  fontWeight: 700,
  bgcolor: 'rgba(78,43,204,0.1)',
  color: '#4E2BCC',
  ...theme.applyStyles('dark', { bgcolor: 'rgba(144,91,244,0.22)', color: '#C9B3FA' }),
})

const viewButtonSx = (theme: Theme) => ({
  fontWeight: 700,
  textTransform: 'none' as const,
  color: '#4E2BCC',
  ...theme.applyStyles('dark', { color: '#B9A4F8' }),
})

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
          ? parseDateOnly(invoice.issueDate)?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) ?? '—'
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
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>Business snapshot</Typography>
          <Chip label={selectedBusiness?.status ?? 'active'} size="small" sx={statusChipSx} />
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>{activeBusinessLabel}</Typography>

        {businesses.length > 0 ? (
          <Stack spacing={1.2}>
            {businesses.slice(0, 3).map((business) => (
              <Box key={business.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{business.businessName ?? business.name ?? `Business ${business.id}`}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{business.email ?? 'No email'}</Typography>
                </Box>
                <Button size="small" variant="text" onClick={() => onOpenBusiness(business.id)} sx={viewButtonSx}>View</Button>
              </Box>
            ))}
          </Stack>
        ) : (
          <EmptyState title="No business data" description="Add a business connection to continue." />
        )}
      </Box>

      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>Recent invoices</Typography>
        </Box>

        {recentActivity.length > 0 ? (
          <Stack spacing={1.1}>
            {recentActivity.map((entry, idx) => (
              <Box key={`${entry.label}-${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.9, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{entry.label}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{entry.detail}</Typography>
                </Box>
                <Typography sx={{ fontWeight: 800, color: 'text.primary' }}>{entry.value}</Typography>
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