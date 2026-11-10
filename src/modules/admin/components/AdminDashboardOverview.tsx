import { alpha } from '@mui/material/styles'
import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import { CalendarCheck2, FileText, LayoutGrid, Users } from 'lucide-react'
import { DashboardListRow } from '../../../components/DashboardListRow'
import { EmptyState } from '../../../components/EmptyState'
import { useAppSelector } from '../../../store/hooks'

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

export function AdminSummaryCards() {
  const { data, loading } = useAppSelector((state) => state.adminDashboard)
  const summaryCards = [
    { label: 'Businesses', count: data.businesses.length, icon: LayoutGrid },
    { label: 'Customers', count: data.customers.length, icon: Users },
    { label: 'Invoices', count: data.invoices.length, icon: FileText },
    { label: 'Appointments', count: data.appointments.length, icon: CalendarCheck2 },
  ]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: { xs: 1.2, sm: 1.6 }, my: 2.2 }}>
      {summaryCards.map(({ label, count, icon: Icon }) => (
        <Box
          key={label}
          sx={(theme) => ({
            minWidth: 0,
            minHeight: 104,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: { xs: 1.4, sm: 2 },
            backgroundColor: 'background.paper',
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: '0 5px 18px rgba(15, 3, 45, 0.045)',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 10px 24px rgba(15, 3, 45, 0.09)',
            },
          })}
        >
          <Box sx={(theme) => ({ flexShrink: 0, width: 46, height: 46, borderRadius: 2, backgroundColor: alpha(theme.palette.primary.main, 0.09), color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
              <Icon size={20} strokeWidth={2.2} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {label}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.25, color: 'text.primary', fontWeight: 800, letterSpacing: '-0.04em' }}>
              {loading ? '—' : count.toLocaleString('en-IN')}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export function AdminOverviewSection({ onOpenBusiness }: { onOpenBusiness: (businessId: number) => void }) {
  const { data, selectedBusinessId } = useAppSelector((state) => state.adminDashboard)
  const selectedBusiness = data.businesses.find((business) => business.id === selectedBusinessId) ?? data.businesses[0] ?? null
  const recentInvoices = data.invoices.slice(0, 3)

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.1fr) minmax(0, 0.9fr)' }, gap: 2, alignItems: 'stretch' }}>
      <Box sx={(theme) => ({ minWidth: 0, background: theme.palette.background.paper, borderRadius: 3, p: { xs: 1.7, sm: 2.2 }, border: `1px solid ${theme.palette.divider}` })}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Business snapshot</Typography>
          <Chip
            label={selectedBusiness?.status ?? (selectedBusiness ? 'active' : 'No businesses')}
            size="small"
            color={selectedBusiness ? 'success' : 'default'}
            sx={{ fontWeight: 700 }}
          />
        </Box>
        {data.businesses.length > 0 ? (
          <Stack spacing={1.2}>
            {data.businesses.slice(0, 3).map((business) => (
              <DashboardListRow key={business.id} title={business.businessName ?? business.name ?? `Business ${business.id}`} subtitle={business.email ?? 'No email'} trailing={<Button size="small" variant="text" onClick={() => onOpenBusiness(business.id)}>View</Button>} />
            ))}
          </Stack>
        ) : <EmptyState title="No businesses" description="Business records will appear here when an account is onboarded." />}
      </Box>

      <Box sx={(theme) => ({ minWidth: 0, background: theme.palette.background.paper, borderRadius: 3, p: { xs: 1.7, sm: 2.2 }, border: `1px solid ${theme.palette.divider}` })}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Recent invoices</Typography>
        {recentInvoices.length > 0 ? (
          <Stack spacing={1.1}>
            {recentInvoices.map((invoice) => (
              <DashboardListRow key={invoice.id} title={invoice.invoiceNumber ?? `INV-${invoice.id}`} subtitle={`${invoice.status ?? 'SENT'} • ${formatCurrency(invoice.totalAmount)}`} trailing={<Typography sx={{ fontWeight: 800 }}>{formatCurrency(invoice.totalAmount)}</Typography>} />
            ))}
          </Stack>
        ) : <EmptyState title="No activity" description="Financial activity will show here." />}
      </Box>
    </Box>
  )
}
