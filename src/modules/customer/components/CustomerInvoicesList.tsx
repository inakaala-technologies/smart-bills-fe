import { Box, Stack, Typography } from '@mui/material'
import { EmptyState } from '../../../components/EmptyState'
import { RecentActivityItem } from '../../../components/RecentActivityItem'
import type { DashboardData } from '../../../services/api'

type CustomerInvoicesListProps = {
  invoices: DashboardData['invoices']
  businesses: DashboardData['businesses']
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

export function CustomerInvoicesList({ invoices, businesses }: CustomerInvoicesListProps) {
  const rows = invoices.slice(0, 6).map((invoice) => {
    const business = businesses.find((item) => item.id === invoice.businessId) ?? businesses[0]
    const businessName = business?.businessName ?? business?.name ?? 'Business profile'
    const initials = businessName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'B'

    const invoiceDate = invoice.issueDate ? new Date(invoice.issueDate) : null

    return {
      id: invoice.id,
      businessName,
      invoiceNumber: invoice.invoiceNumber ?? `INV-${invoice.id}`,
      status: invoice.status ?? 'SENT',
      loyaltySummary: (invoice.loyaltyPointsRedeemed ?? 0) > 0 ? ` · ${invoice.loyaltyPointsRedeemed} loyalty points redeemed` : '',
      amount: formatCurrency(invoice.totalAmount),
      date: invoiceDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) ?? '—',
      time: invoiceDate?.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) ?? '',
      badge: initials,
    }
  })

  return (
    <Box sx={{ backgroundColor: 'background.paper', borderRadius: '24px', p: 2, border: '1px solid var(--mui-palette-divider)', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.8 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.03em', color: 'text.primary' }}>Documents &amp; Invoices</Typography>
        <Typography variant="caption" sx={(theme) => ({ color: theme.palette.primary.main, fontWeight: 800 })}>{invoices.length} total</Typography>
      </Box>
      {rows.length > 0 ? (
        <Stack spacing={1.2}>
          {rows.map((entry) => (
            <RecentActivityItem
              key={entry.id}
              title={entry.businessName}
              subtitle={`${entry.invoiceNumber} • ${entry.status}${entry.loyaltySummary}`}
              amount={entry.amount}
              badge={entry.badge}
              date={entry.date}
              time={entry.time}
              accent="linear-gradient(135deg, #065f46 0%, #0d9488 100%)"
            />
          ))}
        </Stack>
      ) : (
        <EmptyState title="No bills" description="Your recent invoices will appear here." />
      )}
    </Box>
  )
}