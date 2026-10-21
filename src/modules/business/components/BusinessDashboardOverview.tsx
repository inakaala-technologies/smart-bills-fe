import { Box, Typography } from '@mui/material'
import { Bell, CalendarCheck2, Building2, ChevronRight, FileText, ReceiptText, UserRound, Users, WalletCards } from 'lucide-react'
import { ActivityPanel } from './ActivityPanel'
import { QuickActionGrid, type QuickActionId } from './QuickActionGrid'
import { RevenueTrendChart } from './RevenueTrendChart'
import { useAppSelector } from '../../../store/hooks'

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

export function BusinessDashboardOverview({ onQuickAction, hasBusiness, appointmentsEnabled, membershipsEnabled }: { onQuickAction: (action: QuickActionId) => void; hasBusiness: boolean; appointmentsEnabled: boolean; membershipsEnabled: boolean }) {
  const { data, loading, summary } = useAppSelector((state) => state.businessDashboard)
  const pendingPayments = data.payments.filter((payment) => /pending/i.test(payment.status ?? ''))
  const summaryCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(summary?.totalRevenue ?? data.invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0)),
      detail: `${data.invoices.length} invoices`,
      icon: WalletCards,
      tone: 'green',
    },
    {
      label: 'Active Members',
      value: String(summary?.activeMembers ?? data.customers.length),
      detail: `${data.memberships.filter((membership) => membership.status === 'ACTIVE').length} active memberships`,
      icon: Users,
      tone: 'blue',
    },
    {
      label: 'Pending Payments',
      value: formatCurrency(summary?.pendingPayments ?? pendingPayments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)),
      detail: `${pendingPayments.length} pending ${pendingPayments.length === 1 ? 'payment' : 'payments'}`,
      icon: FileText,
      tone: 'amber',
    },
    {
      label: 'New Customers',
      value: String(summary?.newCustomers ?? data.customers.length),
      detail: `${data.customers.length} customer profiles`,
      icon: UserRound,
      tone: 'green',
    },
  ]
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
  const upcomingRenewals = (summary?.upcomingRenewals?.length
    ? summary.upcomingRenewals
    : data.appointments.slice(0, 3).map((appointment) => ({
        id: appointment.id,
        name: appointment.serviceName ?? `Appointment ${appointment.id}`,
        daysLeft: 3,
        note: appointment.status ?? 'BOOKED',
      })))

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.1 }}>
        <Box sx={{ gridColumn: '1 / -1', position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignItems: 'center', overflow: 'hidden', borderRadius: 2.6, background: 'linear-gradient(135deg, #078b68 0%, #04785e 100%)', color: '#ffffff', px: 1.8, py: 1.35, boxShadow: '0 8px 18px rgba(0, 115, 83, 0.16)' }}>
          {summaryCards.slice(0, 2).map((card, index) => (
            <Box key={card.label} sx={{ minWidth: 0, pr: index === 1 ? 2.8 : 1.1, pl: index === 1 ? 1.6 : 0, borderRight: index === 0 ? '1px solid rgba(255,255,255,0.18)' : 'none' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.25, color: 'rgba(255,255,255,0.9)' }}>{card.label}</Typography>
              <Typography sx={{ mt: 0.45, fontSize: 21, fontWeight: 800, lineHeight: 1.15, color: '#ffffff' }}>{loading ? '…' : card.value}</Typography>
              <Typography noWrap sx={{ mt: 0.5, fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.78)' }}>{card.detail}</Typography>
            </Box>
          ))}
          <ChevronRight size={19} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#ffffff' }} />
        </Box>

        {summaryCards.slice(2).map((card) => {
          const Icon = card.icon
          const iconColor = card.tone === 'amber' ? 'warning.main' : 'success.main'
          const iconBackground = card.tone === 'amber' ? 'warning.light' : 'success.light'

          return (
            <Box key={card.label} sx={{ minWidth: 0, minHeight: 88, display: 'flex', alignItems: 'center', gap: 1, p: 1.25, borderRadius: 2.4, backgroundColor: 'background.paper', border: '1px solid var(--mui-palette-divider)', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.14)' }}>
              <Box sx={{ width: 32, height: 32, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', color: iconColor, backgroundColor: iconBackground }}><Icon size={16} strokeWidth={2.4} /></Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>{card.label}</Typography>
                <Typography sx={{ mt: 0.2, fontSize: 17, fontWeight: 800, lineHeight: 1.15, color: 'text.primary' }}>{loading ? '…' : card.value}</Typography>
                <Typography noWrap sx={{ mt: 0.35, fontSize: 9.5, fontWeight: 600, color: 'warning.main' }}>{card.detail}</Typography>
              </Box>
            </Box>
          )
        })}
      </Box>

      <QuickActionGrid actions={[
        { id: 'invoice', label: 'Create Invoice', icon: ReceiptText, onClick: () => onQuickAction('invoice'), disabled: !hasBusiness },
        { id: 'customer', label: 'Add Customer', icon: UserRound, onClick: () => onQuickAction('customer'), disabled: !hasBusiness },
        ...(appointmentsEnabled
          ? [{ id: 'appointment' as const, label: 'Appointments', icon: CalendarCheck2, onClick: () => onQuickAction('appointment'), disabled: !hasBusiness }]
          : membershipsEnabled
            ? [{ id: 'membership' as const, label: 'Membership', icon: Building2, onClick: () => onQuickAction('membership'), disabled: !hasBusiness }]
            : []),
        ...(membershipsEnabled
          ? [{ id: 'notification' as const, label: 'Send Notification', icon: Bell, onClick: () => onQuickAction('notification'), disabled: !hasBusiness }]
          : []),
      ]} />

      <Box sx={{ backgroundColor: 'background.paper', borderRadius: 2.4, p: 1.35, border: '1px solid var(--mui-palette-divider)', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.14)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Revenue Overview</Typography>
          <Typography variant="caption" sx={{ px: 0.8, py: 0.35, border: '1px solid var(--mui-palette-divider)', borderRadius: 1.2, color: 'text.secondary', fontWeight: 700 }}>Last 7 days⌄</Typography>
        </Box>
        <RevenueTrendChart points={summary?.revenueTrend ?? []} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
        <ActivityPanel title="Recent Transactions" entries={recentActivity.map((entry) => ({ label: entry.label, detail: entry.detail, value: entry.value, badge: entry.label.slice(0, 2) }))} emptyTitle="No activity" emptyDescription="Financial activity will show here." />
        <ActivityPanel title="Upcoming Renewals" entries={upcomingRenewals.map((entry) => ({ label: entry.name, detail: entry.note, value: `${entry.daysLeft} days`, badge: entry.name.slice(0, 2) }))} emptyTitle="No renewals" emptyDescription="No renewals scheduled." />
      </Box>
    </>
  )
}
