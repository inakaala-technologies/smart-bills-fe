import { useEffect, useState } from 'react'
import { Alert, Box, ButtonBase, Chip, Dialog, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { ArrowUpRight, BellRing, CalendarCheck2, ChevronDown, FilePlus2, LockKeyhole, MoreVertical, UserRoundPlus, UsersRound, X, type LucideIcon } from 'lucide-react'
import { ActivityPanel } from './ActivityPanel'
import { QuickActionGrid, type QuickActionId } from './QuickActionGrid'
import { RevenueTrendChart } from './RevenueTrendChart'
import { useAppSelector } from '../../../store/hooks'
import { fetchBusinessRevenueTrend } from '../../../services/api/dashboardApi'
import type { BusinessInsightsInterval } from '../../../services/api/types'

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

function calculateInvoiceCollectionProgress(
  invoices: Array<{ id: number; totalAmount?: number; status?: string }>,
  payments: Array<{ invoiceId?: number; amount?: number; status?: string }>,
) {
  const verifiedByInvoice = new Map<number, number>()
  for (const payment of payments) {
    if (payment.invoiceId == null || payment.status?.toUpperCase() !== 'VERIFIED') continue
    verifiedByInvoice.set(
      payment.invoiceId,
      (verifiedByInvoice.get(payment.invoiceId) ?? 0) + Math.max(0, Number(payment.amount ?? 0)),
    )
  }

  const billableInvoices = invoices.filter((invoice) => !['DRAFT', 'CANCELLED'].includes(invoice.status?.toUpperCase() ?? ''))
  const billableRevenue = billableInvoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.totalAmount ?? 0)), 0)
  const completedRevenue = billableInvoices.reduce((sum, invoice) => {
    const invoiceAmount = Math.max(0, Number(invoice.totalAmount ?? 0))
    const completedAmount = invoice.status?.toUpperCase() === 'PAID'
      ? invoiceAmount
      : Math.min(invoiceAmount, verifiedByInvoice.get(invoice.id) ?? 0)
    return sum + completedAmount
  }, 0)
  const pendingInvoices = billableInvoices.filter((invoice) => {
    if (invoice.status?.toUpperCase() === 'PAID') return false
    const invoiceAmount = Math.max(0, Number(invoice.totalAmount ?? 0))
    const paidAmount = Math.min(invoiceAmount, verifiedByInvoice.get(invoice.id) ?? 0)
    return invoiceAmount - paidAmount > 0
  })
  const pendingRevenue = pendingInvoices.reduce((total, invoice) => {
    const invoiceAmount = Math.max(0, Number(invoice.totalAmount ?? 0))
    const paidAmount = Math.min(invoiceAmount, verifiedByInvoice.get(invoice.id) ?? 0)
    return total + Math.max(invoiceAmount - paidAmount, 0)
  }, 0)

  return {
    billableRevenue,
    completedRevenue,
    pendingRevenue,
    pendingInvoiceCount: pendingInvoices.length,
  }
}

function buildSalesTrend(
  invoices: Array<{ issueDate?: string; totalAmount?: number }>,
  interval: BusinessInsightsInterval,
  now: Date,
) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const buckets: Array<{ start: Date; end: Date; label: string }> = []

  if (interval === 'DAILY') {
    for (let offset = 6; offset >= 0; offset--) {
      const start = new Date(today)
      start.setDate(start.getDate() - offset)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      buckets.push({ start, end, label: String(start.getDate()) })
    }
  } else if (interval === 'WEEKLY') {
    const currentWeekStart = new Date(today)
    currentWeekStart.setDate(currentWeekStart.getDate() - ((currentWeekStart.getDay() + 6) % 7))
    for (let offset = 5; offset >= 0; offset--) {
      const start = new Date(currentWeekStart)
      start.setDate(start.getDate() - offset * 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      buckets.push({
        start,
        end,
        label: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      })
    }
  } else {
    for (let offset = 5; offset >= 0; offset--) {
      const start = new Date(today.getFullYear(), today.getMonth() - offset, 1)
      const end = new Date(today.getFullYear(), today.getMonth() - offset + 1, 1)
      buckets.push({
        start,
        end,
        label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      })
    }
  }

  return buckets.map(({ start, end, label }) => ({
    label,
    value: invoices.reduce((total, invoice) => {
      if (!invoice.issueDate) return total
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(invoice.issueDate)
      if (!match) return total
      const issueDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      if (Number.isNaN(issueDate.getTime())) return total
      if (issueDate < start || issueDate >= end) return total
      return total + Number(invoice.totalAmount ?? 0)
    }, 0),
  }))
}

export function BusinessDashboardOverview({ onQuickAction, onOpenInsights, onOpenInvoice, onOpenInvoices, onOpenCustomers, hasBusiness, appointmentsEnabled, membershipsEnabled }: { onQuickAction: (action: QuickActionId) => void; onOpenInsights: () => void; onOpenInvoice: (invoiceId: number) => void; onOpenInvoices: () => void; onOpenCustomers: () => void; hasBusiness: boolean; appointmentsEnabled: boolean; membershipsEnabled: boolean }) {
  const { data, loading, summary, selectedBusinessId } = useAppSelector((state) => state.businessDashboard)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null)
  const [salesInterval, setSalesInterval] = useState<BusinessInsightsInterval>('MONTHLY')
  const [salesMenuAnchor, setSalesMenuAnchor] = useState<HTMLElement | null>(null)
  const [salesResult, setSalesResult] = useState<{
    businessId: number
    interval: BusinessInsightsInterval
    data?: Array<{ label: string; value: number }>
    error?: string
  } | null>(null)
  const currentSalesResult = salesResult?.businessId === selectedBusinessId && salesResult.interval === salesInterval
    ? salesResult
    : null

  useEffect(() => {
    if (!hasBusiness || selectedBusinessId == null) return
    let isCurrent = true
    fetchBusinessRevenueTrend(selectedBusinessId, salesInterval).then((trend) => {
      if (isCurrent) setSalesResult({ businessId: selectedBusinessId, interval: salesInterval, data: trend })
    }).catch((cause: unknown) => {
      if (isCurrent) setSalesResult({
        businessId: selectedBusinessId,
        interval: salesInterval,
        error: cause instanceof Error ? cause.message : 'Could not load sales data for this period.',
      })
    })
    return () => { isCurrent = false }
  }, [hasBusiness, selectedBusinessId, salesInterval])

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const appointmentsToday = data.appointments.filter((appointment) => (
    appointment.scheduledAt?.slice(0, 10) === today
    && !['CANCELLED', 'NO_SHOW'].includes(appointment.status?.toUpperCase() ?? '')
  ))
  const appointmentCustomerCount = new Set(
    appointmentsToday.map((appointment) => appointment.customerId).filter((customerId): customerId is number => customerId != null),
  ).size
  const activeMembershipCount = data.memberships.filter((membership) => membership.status?.toUpperCase() === 'ACTIVE').length
  const secondaryMetrics: Array<{ label: string; value: number; icon: LucideIcon }> = []
  if (appointmentsEnabled) secondaryMetrics.push({ label: 'Customers today', value: appointmentCustomerCount, icon: CalendarCheck2 })
  if (membershipsEnabled) secondaryMetrics.push({ label: 'Active memberships', value: activeMembershipCount, icon: UsersRound })
  const totalRevenueAmount = summary?.totalRevenue ?? data.invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0)
  const totalRevenue = formatCurrency(totalRevenueAmount)
  const newCustomerCount = summary?.newCustomers ?? data.customers.length
  const localCollectionProgress = calculateInvoiceCollectionProgress(data.invoices, data.payments)
  const pendingPaymentAmount = Math.max(summary?.pendingPayments ?? 0, localCollectionProgress.pendingRevenue)
  const pendingPaymentCount = Math.max(summary?.pendingPaymentCount ?? 0, localCollectionProgress.pendingInvoiceCount)
  const collectionTotal = Math.max(summary?.billableRevenue ?? localCollectionProgress.billableRevenue, 0)
  const collectedRevenueAmount = summary?.completedRevenue ?? localCollectionProgress.completedRevenue
  const completedRevenueAmount = Math.min(Math.max(collectedRevenueAmount, 0), collectionTotal)
  const remainingRevenueAmount = Math.max(collectionTotal - completedRevenueAmount, 0)
  const completedPercentage = collectionTotal > 0 ? completedRevenueAmount / collectionTotal * 100 : 0
  const remainingPercentage = collectionTotal > 0 ? 100 - completedPercentage : 0
  const revenueProgress = [
    { label: 'Completed', amount: completedRevenueAmount, percentage: completedPercentage, color: '#4E2BCC' },
    { label: 'Remaining', amount: remainingRevenueAmount, percentage: remainingPercentage, color: '#E8A23A' },
  ]
  const summaryCards: Array<{ title: string; value: string; detail: string; icon: LucideIcon; tone: 'amber' | 'purple'; onClick: () => void }> = [
    {
      title: 'Pending Payments',
      value: formatCurrency(pendingPaymentAmount),
      detail: `${pendingPaymentCount} ${pendingPaymentCount === 1 ? 'invoice' : 'invoices'}`,
      icon: LockKeyhole,
      tone: 'amber',
      onClick: onOpenInvoices,
    },
    {
      title: 'New Customers',
      value: newCustomerCount.toLocaleString('en-IN'),
      detail: 'New customer profiles',
      icon: UserRoundPlus,
      tone: 'purple',
      onClick: onOpenCustomers,
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
  const salesIntervalLabel = salesInterval.charAt(0) + salesInterval.slice(1).toLowerCase()
  const expectedSalesPointCount = salesInterval === 'DAILY' ? 7 : 6
  const salesTrend = currentSalesResult?.data?.length === expectedSalesPointCount
    ? currentSalesResult.data
    : buildSalesTrend(data.invoices, salesInterval, now)
  const salesPoints = salesTrend.map(({ label, value }) => {
    const monthMatch = /^(\d{4})-(\d{2})$/.exec(label)
    return {
      label: salesInterval === 'MONTHLY' && monthMatch
        ? new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1).toLocaleDateString('en-IN', { month: 'short' })
        : label,
      value: Number(value),
    }
  })

  return (
    <>
      <Box sx={{
        px: 2,
        pt: 1.4,
        pb: 1.5,
        background: 'linear-gradient(180deg, #4E2BCC 0%, #32128E 70%, #0F032D 100%)',
        borderRadius: '0 0 24px 24px',
      }}>
        <ButtonBase
            type="button"
            aria-label="Open business insights"
            onClick={onOpenInsights}
            disabled={!hasBusiness}
            sx={{
              display: 'grid',
              width: '100%',
              gridTemplateColumns: secondaryMetrics.length > 0
                ? 'minmax(0, 1.2fr) minmax(0, 0.8fr) 36px'
                : 'minmax(0, 1fr) 36px',
              alignItems: 'center',
              color: '#ffffff',
              textAlign: 'left',
              mb: 1.8,
              '&:hover': { opacity: 0.9 },
              '&.Mui-disabled': { color: '#ffffff', opacity: 0.7 },
            }}
          >
            <Box sx={{ minWidth: 0, pr: 0.8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.92)' }}>Total Revenue</Typography>
                <ChevronDown size={15} />
              </Box>
              <Typography noWrap sx={{ mt: 0.25, fontSize: 28, fontWeight: 500, lineHeight: 1.08, letterSpacing: '-1.1px', color: '#ffffff' }}>
                {loading ? '…' : totalRevenue}
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 12, fontWeight: 600, color: '#d5ffc4' }}>
                {data.invoices.length} {data.invoices.length === 1 ? 'invoice' : 'invoices'}
              </Typography>
            </Box>
          {secondaryMetrics.length > 0 && (
            <Box sx={{ minWidth: 0, pl: 1.2, ml: 0.3, borderLeft: '1px solid rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 0.6 }}>
              {secondaryMetrics.map(({ label, value, icon: Icon }) => (
                <Box key={label} sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.55, color: 'rgba(255,255,255,0.82)' }}>
                    <Icon size={14} />
                    <Typography noWrap sx={{ minWidth: 0, fontSize: 9.5, lineHeight: 1.2 }}>{label}</Typography>
                  </Box>
                  <Typography sx={{ mt: 0.2, fontSize: 18, lineHeight: 1.1, fontWeight: 750, color: '#ffffff' }}>{value}</Typography>
                </Box>
              ))}
            </Box>
          )}
          <Box sx={{ width: 36, height: 36, justifySelf: 'end', display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: '#ffffff', color: '#34413a' }}>
            <ArrowUpRight size={18} />
          </Box>
        </ButtonBase>
        <QuickActionGrid actions={[
          { id: 'invoice', label: 'Create Invoice', icon: FilePlus2, onClick: () => onQuickAction('invoice'), disabled: !hasBusiness },
          { id: 'customer', label: 'Add Customer', icon: UserRoundPlus, onClick: () => onQuickAction('customer'), disabled: !hasBusiness },
          { id: 'notification', label: 'Send Reminders', icon: BellRing, onClick: () => onQuickAction('notification'), disabled: !hasBusiness },
        ]} />
      </Box>

      <Stack spacing={1.6} sx={{ px: 2, pt: 1.7 }}>
        <Stack direction="row" spacing={1.5} sx={{ px: 0.5 }}>
          {revenueProgress.map(({ label, amount, percentage }) => (
            <Box key={label} sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ color: 'text.secondary', fontSize: 10, lineHeight: 1.2 }}>{label}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 10, lineHeight: 1.2, fontWeight: 700 }}>
                  {collectionTotal > 0 ? `${Math.round(percentage)}%` : '—'}
                </Typography>
              </Box>
              <Typography sx={{ mt: 0.25, color: 'text.primary', fontSize: 21, fontWeight: 500, letterSpacing: '-0.7px' }}>{formatCurrency(amount)}</Typography>
            </Box>
          ))}
        </Stack>
        <Box
          role="progressbar"
          aria-label="Revenue completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completedPercentage}
          aria-valuetext={collectionTotal > 0
            ? `${Math.round(completedPercentage)}% completed, ${Math.round(remainingPercentage)}% remaining`
            : 'No billed revenue'}
          sx={{
            display: 'flex',
            alignItems: 'stretch',
            gap: completedPercentage > 0 && remainingPercentage > 0 ? 0.75 : 0,
            height: 40,
            overflow: 'hidden',
            borderRadius: 1.8,
            bgcolor: 'action.hover',
          }}
        >
          <Box
            aria-hidden="true"
            sx={{
              flexGrow: completedPercentage,
              flexBasis: 0,
              minWidth: 0,
              bgcolor: '#4E2BCC',
              borderRadius: 'inherit',
              transition: 'flex-grow 300ms ease',
            }}
          />
          {completedPercentage > 0 && remainingPercentage > 0 && (
            <Box
              aria-hidden="true"
              sx={{ flex: '0 0 1px', bgcolor: '#70777D', alignSelf: 'stretch' }}
            />
          )}
          <Box
            aria-hidden="true"
            sx={{
              flexGrow: remainingPercentage,
              flexBasis: 0,
              minWidth: 0,
              bgcolor: '#D8D8D8',
              borderRadius: 'inherit',
              transition: 'flex-grow 300ms ease',
            }}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.2 }}>
          {summaryCards.map(({ title, value, detail, icon: Icon, tone, onClick }) => (
            <ButtonBase
              key={title}
              type="button"
              aria-label={`Open ${title}`}
              onClick={onClick}
              disabled={!hasBusiness}
              sx={{
                display: 'block',
                width: '100%',
                minWidth: 0,
                minHeight: 136,
                p: 1.6,
                borderRadius: 2.5,
                bgcolor: 'background.paper',
                boxShadow: '0 8px 20px rgba(20, 16, 35, 0.08)',
                textAlign: 'left',
                color: 'inherit',
                transition: 'box-shadow 150ms ease, transform 150ms ease',
                '&:hover': { boxShadow: '0 10px 24px rgba(20, 16, 35, 0.14)', transform: 'translateY(-1px)' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                '&.Mui-disabled': { opacity: 0.6 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: tone === 'amber' ? '#FFF2D8' : '#F0E9FF', color: tone === 'amber' ? '#F59E0B' : '#5D36D3' }}>
                  <Icon size={17} strokeWidth={2.1} />
                </Box>
                <ArrowUpRight size={17} color="#505650" />
              </Box>
              <Typography noWrap sx={{ color: 'text.primary', fontSize: 25, lineHeight: 1.1, fontWeight: 600, letterSpacing: '-0.7px' }}>{value}</Typography>
              <Typography noWrap sx={{ mt: 0.5, color: 'text.primary', fontSize: 11.5, lineHeight: 1.2 }}>{title}</Typography>
              <Typography noWrap sx={{ mt: 0.6, color: tone === 'amber' ? '#E89100' : '#4E2BCC', fontSize: 9.5, lineHeight: 1.2 }}>{detail}</Typography>
            </ButtonBase>
          ))}
        </Box>

        <Box sx={{ backgroundColor: 'background.paper', borderRadius: 2.5, p: 1.6, border: '1px solid var(--mui-palette-divider)', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
            <Typography sx={{ fontSize: 18, lineHeight: 1.2, fontWeight: 600, color: 'text.primary' }}>Sales Overview</Typography>
            <ButtonBase
              id="sales-period-button"
              type="button"
              aria-label={`Change sales period, currently ${salesIntervalLabel}`}
              aria-haspopup="menu"
              aria-expanded={Boolean(salesMenuAnchor)}
              onClick={(event) => setSalesMenuAnchor(event.currentTarget)}
              sx={{ minHeight: 32, px: 0.9, gap: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, color: 'text.secondary' }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{salesIntervalLabel}</Typography>
              <MoreVertical size={16} aria-hidden="true" />
            </ButtonBase>
          </Box>
          <Menu
            anchorEl={salesMenuAnchor}
            open={Boolean(salesMenuAnchor)}
            onClose={() => setSalesMenuAnchor(null)}
          >
            {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((interval) => (
              <MenuItem
                key={interval}
                selected={salesInterval === interval}
                onClick={() => {
                  setSalesInterval(interval)
                  setSalesMenuAnchor(null)
                }}
              >
                {interval.charAt(0) + interval.slice(1).toLowerCase()}
              </MenuItem>
            ))}
          </Menu>
          {!hasBusiness || selectedBusinessId == null ? (
            <Box role="status" sx={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontSize: 13 }}>
              Select a business to view sales data.
            </Box>
          ) : currentSalesResult?.error ? (
            <Alert severity="error" sx={{ minHeight: 110, alignItems: 'center' }}>{currentSalesResult.error}</Alert>
          ) : currentSalesResult?.data ? (
            <RevenueTrendChart key={`${selectedBusinessId}-${salesInterval}`} points={salesPoints} />
          ) : (
            <Box role="status" sx={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontSize: 13 }}>
              Loading {salesIntervalLabel.toLowerCase()} sales data…
            </Box>
          )}
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
      </Stack>

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
