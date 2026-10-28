import { useState } from 'react'
import { Box, ButtonBase, Chip, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material'
import { Bell, CalendarCheck2, Building2, ChevronRight, FileText, ReceiptText, UserRound, Users, WalletCards, X } from 'lucide-react'
import { ActivityPanel } from './ActivityPanel'
import { QuickActionGrid, type QuickActionId } from './QuickActionGrid'
import { RevenueTrendChart } from './RevenueTrendChart'
import { useAppSelector } from '../../../store/hooks'

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

export function BusinessDashboardOverview({ onQuickAction, onOpenInsights, onOpenInvoice, hasBusiness, appointmentsEnabled, membershipsEnabled }: { onQuickAction: (action: QuickActionId) => void; onOpenInsights: () => void; onOpenInvoice: (invoiceId: number) => void; hasBusiness: boolean; appointmentsEnabled: boolean; membershipsEnabled: boolean }) {
  const { data, loading, summary } = useAppSelector((state) => state.businessDashboard)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null)
  const pendingPayments = data.payments.filter((payment) => /pending/i.test(payment.status ?? ''))
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const appointmentsToday = data.appointments.filter((appointment) => (
    appointment.scheduledAt?.slice(0, 10) === today
    && !['CANCELLED', 'NO_SHOW'].includes(appointment.status?.toUpperCase() ?? '')
  ))
  const newAppointmentCount = data.appointments.filter((appointment) => (
    appointment.status?.toUpperCase() === 'BOOKED'
  )).length
  const appointmentCustomerCount = new Set(
    appointmentsToday.map((appointment) => appointment.customerId).filter((customerId): customerId is number => customerId != null),
  ).size
  const invoicesToday = data.invoices.filter((invoice) => invoice.issueDate === today)
  const invoiceCustomerCount = new Set(
    invoicesToday.map((invoice) => invoice.customerId).filter((customerId): customerId is number => customerId != null),
  ).size
  const activeMembershipCount = data.memberships.filter((membership) => membership.status?.toUpperCase() === 'ACTIVE').length
  const featureCustomerMetric = appointmentsEnabled
    ? {
        label: "Today's Appointment Customers",
        value: String(appointmentCustomerCount),
        detail: 'Unique customers with appointments today',
        icon: CalendarCheck2,
        tone: 'blue',
      }
    : membershipsEnabled
      ? {
          label: 'Active Memberships',
          value: String(activeMembershipCount),
          detail: 'Currently active memberships',
          icon: Users,
          tone: 'blue',
        }
      : {
          label: "Today's Invoice Customers",
          value: String(invoiceCustomerCount),
          detail: 'Unique customers with invoices created today',
          icon: UserRound,
          tone: 'blue',
        }
  const dailyActivityMetric = appointmentsEnabled || !membershipsEnabled
    ? {
        label: "Today's Invoices",
        value: String(invoicesToday.length),
        detail: 'Invoices created today',
        icon: FileText,
        tone: 'green',
      }
    : {
        label: 'New Customers',
        value: String(summary?.newCustomers ?? data.customers.length),
        detail: `${data.customers.length} customer profiles`,
        icon: UserRound,
        tone: 'green',
      }
  const summaryCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(summary?.totalRevenue ?? data.invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0)),
      detail: `${data.invoices.length} invoices`,
      icon: WalletCards,
      tone: 'green',
    },
    featureCustomerMetric,
    {
      label: 'Pending Payments',
      value: formatCurrency(summary?.pendingPayments ?? pendingPayments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)),
      detail: `${pendingPayments.length} pending ${pendingPayments.length === 1 ? 'payment' : 'payments'}`,
      icon: FileText,
      tone: 'amber',
    },
    dailyActivityMetric,
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
      id: entry.id,
      label: entry.name,
      detail: `${entry.meta} • ${entry.date}`,
      value: formatCurrency(entry.amount),
    }))
  const upcomingAppointments = data.appointments
    .filter((appointment) => {
      const status = appointment.status?.toUpperCase() ?? 'BOOKED'
      return ['BOOKED', 'CONFIRMED'].includes(status)
        && Boolean(appointment.scheduledAt)
        && new Date(appointment.scheduledAt ?? '').getTime() >= now.getTime()
    })
    .sort((first, second) => new Date(first.scheduledAt ?? '').getTime() - new Date(second.scheduledAt ?? '').getTime())
    .slice(0, 3)
  const selectedAppointment = data.appointments.find((appointment) => appointment.id === selectedAppointmentId)
  const selectedAppointmentCustomer = data.customers.find((customer) => customer.id === selectedAppointment?.customerId)

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.1 }}>
        <ButtonBase
          type="button"
          aria-label="Open business insights"
          onClick={onOpenInsights}
          disabled={!hasBusiness}
          sx={{
            gridColumn: '1 / -1',
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            alignItems: 'center',
            overflow: 'hidden',
            borderRadius: 2.6,
            background: 'linear-gradient(135deg, #078b68 0%, #04785e 100%)',
            color: '#ffffff',
            px: 1.8,
            py: 1.35,
            boxShadow: '0 8px 18px rgba(0, 115, 83, 0.16)',
            textAlign: 'left',
            '&:hover': { filter: 'brightness(1.04)' },
            '&.Mui-disabled': { color: '#ffffff', opacity: 0.7 },
          }}
        >
          {summaryCards.slice(0, 2).map((card, index) => (
            <Box key={card.label} sx={{ minWidth: 0, pr: index === 1 ? 2.8 : 1.1, pl: index === 1 ? 1.6 : 0, borderRight: index === 0 ? '1px solid rgba(255,255,255,0.18)' : 'none' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.25, color: 'rgba(255,255,255,0.9)' }}>{card.label}</Typography>
              <Typography sx={{ mt: 0.45, fontSize: 21, fontWeight: 800, lineHeight: 1.15, color: '#ffffff' }}>{loading ? '…' : card.value}</Typography>
              <Typography noWrap sx={{ mt: 0.5, fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.78)' }}>{card.detail}</Typography>
            </Box>
          ))}
          <ChevronRight size={19} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#ffffff' }} />
        </ButtonBase>

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
          ? [{ id: 'appointment' as const, label: 'Appointments', icon: CalendarCheck2, onClick: () => onQuickAction('appointment'), disabled: !hasBusiness, badge: newAppointmentCount }]
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
        <ActivityPanel
          title="Recent Transactions"
          entries={recentActivity.map((entry) => ({
            label: entry.label,
            detail: entry.detail,
            value: entry.value,
            badge: entry.label.slice(0, 2),
            ariaLabel: `View invoice ${entry.label}`,
            onClick: () => onOpenInvoice(entry.id),
          }))}
          emptyTitle="No activity"
          emptyDescription="Financial activity will show here."
        />
        <ActivityPanel
          title="Upcoming Appointments"
          entries={upcomingAppointments.map((appointment) => ({
            label: appointment.serviceName ?? 'Appointment',
            detail: appointment.status ?? 'BOOKED',
            value: appointment.scheduledAt
              ? new Date(appointment.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              : '—',
            badge: (appointment.serviceName ?? 'AP').slice(0, 2),
            ariaLabel: `View appointment details for ${appointment.serviceName ?? `appointment ${appointment.id}`}`,
            onClick: () => setSelectedAppointmentId(appointment.id),
          }))}
          emptyTitle="No appointments"
          emptyDescription="Upcoming customer appointments will appear here."
        />
      </Box>

      <Dialog open={selectedAppointmentId != null} onClose={() => setSelectedAppointmentId(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pr: 1.5 }}>
          <Typography component="span" variant="h6" sx={{ fontWeight: 800 }}>Appointment details</Typography>
          <IconButton aria-label="Close appointment details" onClick={() => setSelectedAppointmentId(null)} size="small">
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedAppointment ? (
            <Stack spacing={1.2}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, p: 1.3, borderRadius: 2, bgcolor: 'primary.light' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
                    {selectedAppointment.serviceName ?? 'Appointment'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedAppointmentCustomer?.fullName ?? selectedAppointmentCustomer?.firstName ?? 'Customer'}
                  </Typography>
                </Box>
                <Chip size="small" label={(selectedAppointment.status ?? 'BOOKED').replace('_', ' ')} color="primary" sx={{ fontWeight: 700 }} />
              </Box>
              <AppointmentDetailRow
                label="Scheduled"
                value={selectedAppointment.scheduledAt
                  ? new Date(selectedAppointment.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                  : 'Schedule pending'}
              />
              {selectedAppointment.durationMinutes != null && <AppointmentDetailRow label="Duration" value={`${selectedAppointment.durationMinutes} minutes`} />}
              {selectedAppointment.servicePrice != null && (
                <AppointmentDetailRow
                  label="Amount"
                  value={formatCurrency(selectedAppointment.servicePrice - (selectedAppointment.loyaltyDiscountAmount ?? 0))}
                />
              )}
              {selectedAppointmentCustomer?.email && <AppointmentDetailRow label="Email" value={selectedAppointmentCustomer.email} />}
              {selectedAppointmentCustomer?.phoneNumber && <AppointmentDetailRow label="Phone" value={selectedAppointmentCustomer.phoneNumber} />}
              {selectedAppointment.notes && <AppointmentDetailRow label="Customer note" value={selectedAppointment.notes} />}
              {selectedAppointment.businessNote && <AppointmentDetailRow label="Business note" value={selectedAppointment.businessNote} />}
            </Stack>
          ) : (
            <Typography color="text.secondary">Appointment details are unavailable. Refresh the dashboard and try again.</Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function AppointmentDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, py: 0.8, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontWeight: 700 }}>{label}</Typography>
      <Typography variant="body2" sx={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{value}</Typography>
    </Box>
  )
}
