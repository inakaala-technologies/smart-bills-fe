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
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: { xs: 1.1, sm: 1.4 }, my: 2.2 }}>
      {summaryCards.map(({ label, count, icon: Icon }) => (
        <Box key={label} sx={{ backgroundColor: 'background.paper', borderRadius: '20px', py: 1.4, px: 0.8, minHeight: 98, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)', border: '1px solid var(--mui-palette-divider)', transition: 'transform 0.18s ease, box-shadow 0.18s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 20px rgba(0, 0, 0, 0.18)' } }}>
          <Box sx={{ position: 'relative', mb: 1.1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: 'success.light', color: 'success.dark', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} strokeWidth={2.2} />
            </Box>
            <Box sx={{ position: 'absolute', top: -5, right: -6, minWidth: 18, height: 18, borderRadius: '999px', backgroundColor: 'warning.main', color: 'warning.contrastText', border: '2px solid var(--mui-palette-background-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 0.4, boxShadow: '0 2px 4px color-mix(in srgb, var(--mui-palette-warning-main) 30%, transparent)' }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 800, lineHeight: 1 }}>{loading ? '…' : count}</Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '11px', textAlign: 'center', lineHeight: 1.2 }}>{label}</Typography>
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
    <Stack spacing={1.8}>
      <Box sx={(theme) => ({ background: theme.palette.background.paper, borderRadius: 3, p: 1.5, border: `1px solid ${theme.palette.divider}` })}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Business snapshot</Typography>
          <Chip label={selectedBusiness?.status ?? 'active'} size="small" sx={(theme) => ({ bgcolor: alpha(theme.palette.success.main, 0.14), color: theme.palette.success.dark, fontWeight: 700 })} />
        </Box>
        {data.businesses.length > 0 ? (
          <Stack spacing={1.2}>
            {data.businesses.slice(0, 3).map((business) => (
              <DashboardListRow key={business.id} title={business.businessName ?? business.name ?? `Business ${business.id}`} subtitle={business.email ?? 'No email'} trailing={<Button size="small" variant="text" onClick={() => onOpenBusiness(business.id)}>View</Button>} />
            ))}
          </Stack>
        ) : <EmptyState title="No businesses" description="Create or connect a business to continue." />}
      </Box>

      <Box sx={(theme) => ({ background: theme.palette.background.paper, borderRadius: 3, p: 1.5, border: `1px solid ${theme.palette.divider}` })}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Recent invoices</Typography>
        {recentInvoices.length > 0 ? (
          <Stack spacing={1.1}>
            {recentInvoices.map((invoice) => (
              <DashboardListRow key={invoice.id} title={invoice.invoiceNumber ?? `INV-${invoice.id}`} subtitle={`${invoice.status ?? 'SENT'} • ${formatCurrency(invoice.totalAmount)}`} trailing={<Typography sx={{ fontWeight: 800 }}>{formatCurrency(invoice.totalAmount)}</Typography>} />
            ))}
          </Stack>
        ) : <EmptyState title="No activity" description="Financial activity will show here." />}
      </Box>
    </Stack>
  )
}
