import { useEffect, useState, type ReactNode } from 'react'
import { Alert, Box, ButtonBase, Chip, Dialog, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { ArrowUpRight, BellRing, CalendarCheck2, ChevronDown, FilePlus2, LockKeyhole, MoreVertical, Plus, UserRoundPlus, UsersRound, X, type LucideIcon } from 'lucide-react'
import { QuickActionGrid, type QuickActionId } from './QuickActionGrid'
import { RevenueTrendChart } from './RevenueTrendChart'
import { useAppSelector } from '../../../store/hooks'
import { fetchBusinessRevenueTrend } from '../../../services/api/dashboardApi'
import type { BusinessInsightsInterval } from '../../../services/api/types'

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

function formatLongDate(value?: string) {
  if (!value) return '—'
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return value
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatInvoiceStatus(status?: string) {
  const value = (status ?? '').toUpperCase()
  if (value === 'PAID') return 'Paid'
  if (value === 'SENT') return 'Unpaid'
  if (!value) return 'Unpaid'
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function formatEventTime(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const EVENT_BAR_COLORS = ['#B9A4F8', '#E8A317', '#34D399']

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

export function BusinessDashboardOverview({ onQuickAction, onOpenInsights, onOpenInvoice, onOpenInvoices, onOpenCustomers, hasBusiness, appointmentsEnabled, membershipsEnabled, topSlot }: { topSlot?: ReactNode; onQuickAction: (action: QuickActionId) => void; onOpenInsights: () => void; onOpenInvoice: (invoiceId: number) => void; onOpenInvoices: () => void; onOpenCustomers: () => void; hasBusiness: boolean; appointmentsEnabled: boolean; membershipsEnabled: boolean }) {
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
    { label: 'Completed', amount: completedRevenueAmount, percentage: completedPercentage, color: '#0F032D' },
    { label: 'Remaining', amount: remainingRevenueAmount, percentage: remainingPercentage, color: '#D9D9DC' },
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
    : data.invoices.slice(0, 4).map((invoice) => ({
        id: invoice.id,
        name: invoice.invoiceNumber ?? `INV-${invoice.id}`,
        amount: Number(invoice.totalAmount ?? 0),
        meta: invoice.status ?? 'SENT',
        date: invoice.issueDate ?? '',
      })))
    .slice(0, 4)
    .map((entry) => ({
      id: entry.id,
      label: entry.name,
      detail: `${formatLongDate(entry.date)} · ${formatInvoiceStatus(entry.meta)}`,
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
  const todayEvents = [...appointmentsToday].sort((first, second) => new Date(first.scheduledAt ?? '').getTime() - new Date(second.scheduledAt ?? '').getTime())
  const showingToday = todayEvents.length > 0
  const eventsToShow = (showingToday ? todayEvents : upcomingAppointments).slice(0, 3)
  const eventsCount = showingToday ? todayEvents.length : upcomingAppointments.length
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
      {/* Header: Figma "Rectangle 31" - one gradient behind greeting + revenue + actions, 35px bottom radius.
          The first ~110px is the pale status-bar zone from the Figma swatch (pixel stops), the rest scales with height.
          data-overview-hero lets the dashboard know when this block has fully scrolled away (pinned header). */}
      <Box
        data-overview-hero
        sx={{
          background: 'linear-gradient(180deg, #F1EBFC 0px, #CDBAF1 24px, #AE89F2 64px, #8C59F2 110px, #7648E4 36%, #5B34D4 52%, #4727BB 68%, #331A88 82%, #230F5E 92%, #0F032D 100%)',
          borderRadius: '0 0 35px 35px',
          pb: 2.2,
        }}
      >
        {topSlot}
        <Box sx={{ px: 2.2 }}>
          <ButtonBase
            type="button"
            aria-label="Open business insights"
            onClick={onOpenInsights}
            disabled={!hasBusiness}
            sx={{
              display: 'block',
              width: '100%',
              color: '#ffffff',
              textAlign: 'left',
              mt: 1.6,
              mb: 2,
              '&:hover': { opacity: 0.92 },
              '&.Mui-disabled': { color: '#ffffff', opacity: 0.7 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'rgba(255,255,255,0.9)' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 300 }}>Total Revenue</Typography>
              <ChevronDown size={14} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.4 }}>
              <Typography noWrap sx={{ fontSize: 42, fontWeight: 400, lineHeight: 1.1, letterSpacing: '-1px', color: '#ffffff' }}>
                {loading ? '…' : totalRevenue}
              </Typography>
              <Box sx={{ width: 42, height: 42, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: '#EFEFEF', color: '#0F032D' }}>
                <ArrowUpRight size={20} />
              </Box>
            </Box>
            <Typography sx={{ mt: 0.6, fontSize: 12, fontWeight: 400, color: '#CDF27E' }}>
              {data.invoices.length} {data.invoices.length === 1 ? 'invoice' : 'invoices'}
            </Typography>
            {secondaryMetrics.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.6, mt: 0.8 }}>
                {secondaryMetrics.map(({ label, value, icon: Icon }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'rgba(255,255,255,0.85)' }}>
                    <Icon size={12} />
                    <Typography sx={{ fontSize: 10.5 }}>{label}</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </ButtonBase>
          <QuickActionGrid actions={[
            { id: 'invoice', label: 'Create Invoice', icon: FilePlus2, onClick: () => onQuickAction('invoice'), disabled: !hasBusiness },
            { id: 'customer', label: 'Add Customer', icon: UserRoundPlus, onClick: () => onQuickAction('customer'), disabled: !hasBusiness },
            { id: 'notification', label: 'Send Reminders', icon: BellRing, onClick: () => onQuickAction('notification'), disabled: !hasBusiness },
          ]} />
        </Box>
      </Box>

      <Stack spacing={1.6} sx={{ px: 2, pt: 1.7 }}>
        {/* Completed / Remaining */}
        <Stack direction="row" spacing={1.5} sx={{ px: 0.5 }}>
          {revenueProgress.map(({ label, amount }) => (
            <Box key={label} sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 12, lineHeight: 1.2 }}>{label}</Typography>
              <Typography sx={{ mt: 0.3, color: 'text.primary', fontSize: 24, fontWeight: 400, letterSpacing: '-0.5px' }}>
                {formatCurrency(amount)}
              </Typography>
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
          sx={{ display: 'flex', gap: 1.2, height: 46 }}
        >
          <Box
            aria-hidden="true"
            sx={{ flexGrow: Math.max(completedPercentage, 12), flexBasis: 0, minWidth: 0, bgcolor: '#0F032D', borderRadius: '14px', transition: 'flex-grow 300ms ease' }}
          />
          <Box
            aria-hidden="true"
            sx={{ flexGrow: Math.max(remainingPercentage, 12), flexBasis: 0, minWidth: 0, bgcolor: '#D9D9DC', borderRadius: '14px', transition: 'flex-grow 300ms ease' }}
          />
        </Box>

        {/* Stat cards */}
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
                minHeight: 132,
                p: 1.5,
                borderRadius: '16px',
                bgcolor: 'background.paper',
                boxShadow: '0 2px 12px rgba(78, 43, 204, 0.08)',
                textAlign: 'left',
                color: 'inherit',
                transition: 'box-shadow 150ms ease',
                '&:hover': { boxShadow: '0 4px 16px rgba(78, 43, 204, 0.14)' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                '&.Mui-disabled': { opacity: 0.6 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
                <Box sx={{ width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: '8px', bgcolor: tone === 'amber' ? '#FFF2D8' : '#F0E9FF', color: tone === 'amber' ? '#F59E0B' : '#5D36D3' }}>
                  <Icon size={14} strokeWidth={2.1} />
                </Box>
                <ArrowUpRight size={15} color="#0F032D" />
              </Box>
              <Typography noWrap sx={{ color: 'text.primary', fontSize: 24, lineHeight: 1.1, fontWeight: 500, letterSpacing: '-0.5px' }}>{value}</Typography>
              <Typography noWrap sx={{ mt: 0.5, color: 'text.primary', fontSize: 11.5, lineHeight: 1.2 }}>{title}</Typography>
              <Typography noWrap sx={{ mt: 0.6, color: tone === 'amber' ? '#E89100' : '#4E2BCC', fontSize: 9.5, lineHeight: 1.2 }}>{detail}</Typography>
            </ButtonBase>
          ))}
        </Box>

        {/* Sales Overview */}
        <Box sx={{ backgroundColor: 'background.paper', borderRadius: '16px', p: 1.8, boxShadow: '0 2px 12px rgba(78, 43, 204, 0.08)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
            <Typography sx={{ fontSize: 16, lineHeight: 1.2, fontWeight: 500, color: 'text.primary' }}>Sales Overview</Typography>
            <ButtonBase
              id="sales-period-button"
              type="button"
              aria-label={`Change sales period, currently ${salesIntervalLabel}`}
              aria-haspopup="menu"
              aria-expanded={Boolean(salesMenuAnchor)}
              onClick={(event) => setSalesMenuAnchor(event.currentTarget)}
              sx={{ minHeight: 32, px: 0.9, gap: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: '8px', color: 'text.secondary' }}
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

        {/* Appointments (Figma): title + "+" + lime arrow, then a "Today - N events" panel with coloured side bars */}
        {appointmentsEnabled && (
          <Box sx={{ bgcolor: 'background.paper', borderRadius: '20px', boxShadow: '0 2px 12px rgba(78, 43, 204, 0.08)', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.4 }}>
              <Typography sx={{ fontSize: 18, lineHeight: 1.2, fontWeight: 500, color: 'text.primary' }}>Appointments</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  aria-label="Add appointment"
                  size="small"
                  disabled={!hasBusiness}
                  onClick={() => onQuickAction('appointment')}
                  sx={{ color: '#4E2BCC' }}
                >
                  <Plus size={20} />
                </IconButton>
                <IconButton
                  aria-label="Open appointments"
                  disabled={!hasBusiness}
                  onClick={() => onQuickAction('appointment')}
                  sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: '#CDF27E', color: '#0F032D', '&:hover': { bgcolor: '#C2EA6A' }, '&.Mui-disabled': { bgcolor: '#CDF27E', opacity: 0.6 } }}
                >
                  <ArrowUpRight size={16} />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: 1.5 }}>
              <Box sx={{ border: '1px solid rgba(15, 3, 45, 0.07)', borderRadius: '16px', p: 1.6 }}>
                {eventsToShow.length === 0 ? (
                  <Box role="status" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', py: 1 }}>
                    <Box sx={{ width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: '12px', bgcolor: '#F4F4F7', color: '#9A97A6', mb: 1 }}>
                      <CalendarCheck2 size={22} />
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>No appointments today</Typography>
                    <Typography sx={{ mt: 0.3, fontSize: 10.5, color: 'text.secondary' }}>All clear. Add a new event to get started.</Typography>
                  </Box>
                ) : (
                  <>
                    <Typography sx={{ fontSize: 15, color: 'text.secondary', mb: 1.4 }}>
                      {showingToday ? 'Today' : 'Upcoming'} - {eventsCount} {eventsCount === 1 ? 'event' : 'events'}
                    </Typography>
                    <Stack spacing={1.4}>
                      {eventsToShow.map((appointment, index) => (
                        <ButtonBase
                          key={appointment.id}
                          type="button"
                          aria-label={`View appointment details for ${appointment.serviceName ?? `appointment ${appointment.id}`}`}
                          onClick={() => setSelectedAppointmentId(appointment.id)}
                          sx={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            pl: 1,
                            borderLeft: '3px solid',
                            borderColor: EVENT_BAR_COLORS[index % EVENT_BAR_COLORS.length],
                            borderRadius: 0,
                          }}
                        >
                          <Typography noWrap sx={{ fontSize: 12, lineHeight: 1.25, color: 'text.primary' }}>
                            {appointment.serviceName ?? 'Appointment'}
                          </Typography>
                          <Typography sx={{ fontSize: 10, lineHeight: 1.3, color: 'text.secondary' }}>
                            {showingToday
                              ? formatEventTime(appointment.scheduledAt)
                              : `${new Date(appointment.scheduledAt ?? '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${formatEventTime(appointment.scheduledAt)}`}
                          </Typography>
                        </ButtonBase>
                      ))}
                    </Stack>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* Recent Transactions (Figma): plain list on the page, grey circle + invoice + date/status + amount */}
        <Box sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2, px: 0.5 }}>
            <Typography sx={{ fontSize: 18, lineHeight: 1.2, fontWeight: 500, color: 'text.primary' }}>Recent Transactions</Typography>
            <ButtonBase
              type="button"
              aria-label="See all invoices"
              disabled={!hasBusiness}
              onClick={onOpenInvoices}
              sx={{ fontSize: 10.5, color: '#4E2BCC', px: 0.5, borderRadius: '6px' }}
            >
              See all
            </ButtonBase>
          </Box>
          {recentActivity.length === 0 ? (
            <Typography sx={{ px: 0.5, fontSize: 13, color: 'text.secondary' }}>No activity yet. Financial activity will show here.</Typography>
          ) : (
            <Stack spacing={1.3}>
              {recentActivity.map((entry) => (
                <ButtonBase
                  key={entry.id}
                  type="button"
                  aria-label={`View invoice ${entry.label}`}
                  onClick={() => onOpenInvoice(entry.id)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.4, width: '100%', px: 0.5, textAlign: 'left', borderRadius: '12px' }}
                >
                  <Box aria-hidden="true" sx={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', bgcolor: '#F0F0F4' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 13, lineHeight: 1.25, color: 'text.primary' }}>{entry.label}</Typography>
                    <Typography noWrap sx={{ fontSize: 10, lineHeight: 1.35, color: 'text.secondary' }}>{entry.detail}</Typography>
                  </Box>
                  <Typography sx={{ flexShrink: 0, fontSize: 13, color: 'text.primary' }}>{entry.value}</Typography>
                </ButtonBase>
              ))}
            </Stack>
          )}
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