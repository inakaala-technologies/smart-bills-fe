import { useEffect, useState } from 'react'
import { alpha, Alert, Box, Card, CardContent, Chip, LinearProgress, Stack, ToggleButton, ToggleButtonGroup, Typography, useTheme } from '@mui/material'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BadgeCheck,
  CalendarCheck2,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  FileText,
  ReceiptText,
  TrendingUp,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { fetchBusinessInsights, type BusinessInsights } from '../../../services/api'
import { useAppSelector } from '../../../store/hooks'

type BusinessInsightsWorkspaceProps = {
  businessId: number
  appointmentsEnabled: boolean
  membershipsEnabled: boolean
}

type TrendPoint = { key: string; label: string; amount: number }
type InsightPeriod = 'TODAY' | 'LAST_WEEK' | 'LAST_MONTH' | 'SIX_MONTHS'
type TrendBucket = { key: string; label: string; start: Date; end: Date }

const periodOptions: Array<{ value: InsightPeriod; label: string }> = [
  { value: 'TODAY', label: 'Today' },
  { value: 'LAST_WEEK', label: 'Last week' },
  { value: 'LAST_MONTH', label: 'Last month' },
  { value: 'SIX_MONTHS', label: 'Last 6 months' },
]

function money(amount: number) {
  return `₹${Number(amount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function parseDate(value?: string) {
  if (!value) return null
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short' })
}

function inRange(value: string | undefined, start: Date, end: Date) {
  const date = parseDate(value)
  return date != null && date >= start && date < end
}

function buildTrendBuckets(period: InsightPeriod, now: Date): TrendBucket[] {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(todayStart)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (period === 'TODAY') {
    return [{ key: dateKey(todayStart), label: 'Today', start: todayStart, end: tomorrow }]
  }
  if (period === 'LAST_WEEK') {
    return Array.from({ length: 7 }, (_value, index) => {
      const start = new Date(todayStart)
      start.setDate(todayStart.getDate() - 6 + index)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      return {
        key: dateKey(start),
        label: start.toLocaleDateString('en-IN', { weekday: 'short' }),
        start,
        end,
      }
    })
  }
  if (period === 'LAST_MONTH') {
    const startDate = new Date(todayStart)
    startDate.setDate(todayStart.getDate() - 29)
    return Array.from({ length: 5 }, (_value, index) => {
      const start = new Date(startDate)
      start.setDate(startDate.getDate() + index * 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      if (end > tomorrow) end.setTime(tomorrow.getTime())
      return { key: dateKey(start), label: `Week ${index + 1}`, start, end }
    })
  }
  return Array.from({ length: 6 }, (_value, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
    const end = index === 5
      ? tomorrow
      : new Date(now.getFullYear(), now.getMonth() - 4 + index, 1)
    return {
      key: monthKey(start),
      label: monthLabel(monthKey(start)),
      start,
      end,
    }
  })
}

function periodLabel(period: InsightPeriod) {
  return periodOptions.find((option) => option.value === period)?.label ?? 'Last 6 months'
}

function periodRangeLabel(period: InsightPeriod) {
  if (period === 'TODAY') return 'today'
  if (period === 'LAST_WEEK') return 'the last 7 days'
  if (period === 'LAST_MONTH') return 'the last 30 days'
  return 'the last 6 months'
}

function formatDateRange(start: Date, endExclusive: Date) {
  const end = new Date(endExclusive)
  end.setDate(end.getDate() - 1)
  const format = (date: Date) => date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${format(start)} – ${format(end)}`
}

function countByStatus<T extends { status?: string }>(rows: T[], status: string) {
  return rows.filter((row) => row.status?.toUpperCase() === status).length
}

function TrendBars({ points, comparison }: { points: TrendPoint[]; comparison?: TrendPoint[] }) {
  const theme = useTheme()
  const maximum = Math.max(...points.map((point) => point.amount), ...(comparison?.map((point) => point.amount) ?? []), 1)

  return (
    <Box>
      <Stack direction="row" spacing={0.6} sx={{ alignItems: 'flex-end', height: 116, px: 0.4 }}>
        {points.map((point, index) => {
          const compareAmount = comparison?.[index]?.amount ?? 0
          const mainHeight = Math.max(point.amount > 0 ? 5 : 0, point.amount / maximum * 100)
          const compareHeight = Math.max(compareAmount > 0 ? 5 : 0, compareAmount / maximum * 100)
          return (
            <Stack key={point.key} spacing={0.7} sx={{ flex: 1, minWidth: 0, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <Stack direction="row" spacing={0.3} sx={{ alignItems: 'flex-end', width: '100%', height: 100, justifyContent: 'center' }}>
                <Box title={`${point.label}: ${money(point.amount)}`} sx={{ width: comparison ? '35%' : '58%', height: `${mainHeight}%`, minHeight: point.amount > 0 ? 4 : 0, borderRadius: '5px 5px 2px 2px', background: 'linear-gradient(180deg, #905BF4 0%, #4E2BCC 100%)', transition: 'height 250ms ease' }} />
                {comparison && <Box title={`${point.label}: ${money(compareAmount)}`} sx={{ width: '35%', height: `${compareHeight}%`, minHeight: compareAmount > 0 ? 4 : 0, borderRadius: '5px 5px 2px 2px', bgcolor: alpha(theme.palette.info.main, 0.65), transition: 'height 250ms ease' }} />}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, fontWeight: 650 }}>{point.label}</Typography>
            </Stack>
          )
        })}
      </Stack>
      {comparison && (
        <Stack direction="row" spacing={1.6} sx={{ mt: 1.2, justifyContent: 'center' }}>
          <Legend color="#0d8b70" label="Billed" />
          <Legend color={theme.palette.info.main} label="Collected" />
        </Stack>
      )}
    </Box>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650 }}>{label}</Typography>
    </Stack>
  )
}

function MetricTile({ label, value, detail, icon: Icon, color }: { label: string; value: string; detail: string; icon: LucideIcon; color: string }) {
  const theme = useTheme()
  return (
    <Card variant="outlined" sx={{ minWidth: 0, borderRadius: 2.2, borderColor: alpha(theme.palette.text.primary, 0.08), background: 'background.paper', boxShadow: '0 4px 14px rgba(23, 51, 48, 0.045)' }}>
      <CardContent sx={{ p: 1.35, '&:last-child': { pb: 1.35 } }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Box sx={{ width: 31, height: 31, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1.2, color, bgcolor: alpha(color, 0.1) }}>
            <Icon size={16} strokeWidth={2.2} />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750, lineHeight: 1.2 }}>{label}</Typography>
        </Stack>
        <Typography sx={{ mt: 1, color: 'text.primary', fontSize: 22, fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.1, overflowWrap: 'anywhere' }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.45, lineHeight: 1.3 }}>{detail}</Typography>
      </CardContent>
    </Card>
  )
}

function SectionHeading({ eyebrow, title, detail, icon: Icon }: { eyebrow?: string; title: string; detail: string; icon: LucideIcon }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
      <Box sx={{ width: 34, height: 34, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1.2, bgcolor: 'action.hover', color: 'primary.main' }}>
        <Icon size={17} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && <Typography sx={{ color: 'primary.main', fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{eyebrow}</Typography>}
        <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 850, lineHeight: 1.2 }}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{detail}</Typography>
      </Box>
    </Stack>
  )
}

function SummaryCard({ children }: { children: React.ReactNode }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2.4, borderColor: 'divider', overflow: 'hidden' }}>
      <CardContent sx={{ p: 1.6, '&:last-child': { pb: 1.6 } }}>{children}</CardContent>
    </Card>
  )
}

function statusColor(status: string) {
  if (['COMPLETED', 'PAID', 'ACTIVE'].includes(status)) return '#16845f'
  if (['BOOKED', 'CONFIRMED', 'SENT', 'PENDING', 'PARTIAL'].includes(status)) return '#b7791f'
  if (['CANCELLED', 'NO_SHOW', 'OVERDUE', 'EXPIRED'].includes(status)) return '#c64d4d'
  return '#64748b'
}

export function BusinessInsightsWorkspace({ businessId, appointmentsEnabled, membershipsEnabled }: BusinessInsightsWorkspaceProps) {
  const theme = useTheme()
  const dashboardData = useAppSelector((state) => state.businessDashboard.data)
  const [result, setResult] = useState<{
    businessId: number
    data?: BusinessInsights
    error?: string
  } | null>(null)
  const [period, setPeriod] = useState<InsightPeriod>('SIX_MONTHS')

  useEffect(() => {
    let isCurrent = true
    fetchBusinessInsights(businessId).then((data) => {
      if (isCurrent) setResult({ businessId, data })
    }).catch((cause: unknown) => {
      if (isCurrent) setResult({
        businessId,
        error: cause instanceof Error ? cause.message : 'Could not load historical business insights.',
      })
    })
    return () => { isCurrent = false }
  }, [businessId])

  const currentResult = result?.businessId === businessId ? result : null
  const apiData = currentResult?.data
  const now = new Date()
  const today = dateKey(now)
  const trendBuckets = buildTrendBuckets(period, now)
  const rangeStart = trendBuckets[0].start
  const rangeEnd = trendBuckets[trendBuckets.length - 1].end
  const rangeText = periodRangeLabel(period)
  const selectedDateRange = formatDateRange(rangeStart, rangeEnd)

  const appointments = dashboardData.appointments.filter((item) => item.businessId == null || item.businessId === businessId)
  const invoices = dashboardData.invoices.filter((item) => item.businessId == null || item.businessId === businessId)
  const payments = dashboardData.payments.filter((item) => item.businessId == null || item.businessId === businessId)
  const verifiedPaymentsByInvoice = new Map<number, number>()
  for (const payment of payments) {
    if (payment.status?.toUpperCase() !== 'VERIFIED' || payment.invoiceId == null) continue
    verifiedPaymentsByInvoice.set(
      payment.invoiceId,
      (verifiedPaymentsByInvoice.get(payment.invoiceId) ?? 0) + Number(payment.amount ?? 0),
    )
  }
  const memberships = dashboardData.memberships.filter((item) => item.businessId == null || item.businessId === businessId)
  const invoicesInWindow = invoices.filter((invoice) => inRange(invoice.issueDate, rangeStart, rangeEnd))
  const issuedInvoices = invoicesInWindow.filter((invoice) => !['DRAFT', 'CANCELLED'].includes(invoice.status?.toUpperCase() ?? ''))
  const billedTotal = issuedInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0)
  const invoiceDiscountTotal = issuedInvoices.reduce((sum, invoice) => sum + Number(invoice.invoiceDiscountAmount ?? 0), 0)
  const loyaltyDiscountTotal = issuedInvoices.reduce((sum, invoice) => sum + Number(invoice.loyaltyDiscountAmount ?? 0), 0)
  const grossBilledTotal = billedTotal + invoiceDiscountTotal + loyaltyDiscountTotal
  const totalDiscounts = invoiceDiscountTotal + loyaltyDiscountTotal
  const invoiceDiscountCount = issuedInvoices.filter((invoice) => Number(invoice.invoiceDiscountAmount ?? 0) > 0).length
  const discountRate = grossBilledTotal > 0 ? totalDiscounts / grossBilledTotal : 0
  const recentAppointments = appointments.filter((appointment) => inRange(appointment.scheduledAt, rangeStart, rangeEnd))
  const validVisitAppointments = recentAppointments.filter((appointment) => !['CANCELLED', 'NO_SHOW'].includes(appointment.status?.toUpperCase() ?? ''))
  const appointmentsToday = appointments.filter((appointment) => appointment.scheduledAt?.slice(0, 10) === today)
  const appointmentCustomersToday = new Set(
    appointmentsToday
      .filter((appointment) => !['CANCELLED', 'NO_SHOW'].includes(appointment.status?.toUpperCase() ?? ''))
      .map((appointment) => appointment.customerId)
      .filter((customerId): customerId is number => customerId != null),
  )
  const completedAppointments = recentAppointments.filter((appointment) => appointment.status?.toUpperCase() === 'COMPLETED')
  const appointmentCustomers = new Set(validVisitAppointments.map((appointment) => appointment.customerId).filter((id): id is number => id != null))
  const completedServiceValue = completedAppointments.reduce((sum, appointment) => (
    sum + Math.max(0, Number(appointment.servicePrice ?? 0) - Number(appointment.loyaltyDiscountAmount ?? 0))
  ), 0)
  const upcomingAppointments = appointments.filter((appointment) => {
    const scheduledAt = parseDate(appointment.scheduledAt)
    return scheduledAt != null && scheduledAt > now && scheduledAt <= new Date(now.getTime() + 30 * 86400000)
      && ['BOOKED', 'CONFIRMED'].includes(appointment.status?.toUpperCase() ?? '')
  })
  const activeMemberships = memberships.filter((membership) => (
    membership.status?.toUpperCase() === 'ACTIVE' && (!membership.endDate || membership.endDate >= today)
  ))
  const renewingMemberships = memberships.filter((membership) => {
    if (membership.status?.toUpperCase() !== 'ACTIVE' || !membership.endDate) return false
    const endDate = parseDate(membership.endDate)
    return endDate != null && endDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate())
      && endDate <= new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30)
  })
  const churnedMemberships = memberships.filter((membership) => ['EXPIRED', 'CANCELLED'].includes(membership.status?.toUpperCase() ?? ''))
  const invoiceStatusKeys = ['SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'DRAFT', 'CANCELLED']
  const invoiceStatusCounts = invoiceStatusKeys.map((status) => ({ status, count: countByStatus(invoicesInWindow, status) }))
  const appointmentStatusKeys = ['COMPLETED', 'CONFIRMED', 'BOOKED', 'CANCELLED', 'NO_SHOW']
  const appointmentStatusCounts = appointmentStatusKeys.map((status) => ({ status, count: countByStatus(recentAppointments, status) }))

  const billedTrend = trendBuckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    amount: issuedInvoices
      .filter((invoice) => inRange(invoice.issueDate, bucket.start, bucket.end))
      .reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0),
  }))
  const discountTrend = trendBuckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    amount: issuedInvoices
      .filter((invoice) => inRange(invoice.issueDate, bucket.start, bucket.end))
      .reduce((sum, invoice) => sum + Number(invoice.invoiceDiscountAmount ?? 0) + Number(invoice.loyaltyDiscountAmount ?? 0), 0),
  }))
  const collectedTrend = trendBuckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    amount: payments
      .filter((payment) => payment.status?.toUpperCase() === 'VERIFIED' && inRange(payment.paymentDate, bucket.start, bucket.end))
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0),
  })).map((point, index) => {
    const bucket = trendBuckets[index]
    const paidInvoiceAmountsWithoutPaymentRecords = issuedInvoices
      .filter((invoice) => invoice.status?.toUpperCase() === 'PAID' && inRange(invoice.issueDate, bucket.start, bucket.end))
      .reduce((sum, invoice) => (
        sum + Math.max(0, Number(invoice.totalAmount ?? 0) - (verifiedPaymentsByInvoice.get(invoice.id) ?? 0))
      ), 0)
    return { ...point, amount: point.amount + paidInvoiceAmountsWithoutPaymentRecords }
  })
  const appointmentTrend = trendBuckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    amount: appointments.filter((appointment) => inRange(appointment.scheduledAt, bucket.start, bucket.end)).length,
  }))
  const membershipTrend = trendBuckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    amount: memberships.filter((membership) => inRange(membership.startDate, bucket.start, bucket.end)).length,
  }))
  const customerActivityTrend = trendBuckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    amount: new Set(invoices
      .filter((invoice) => inRange(invoice.issueDate, bucket.start, bucket.end))
      .map((invoice) => invoice.customerId)
      .filter((customerId): customerId is number => customerId != null)).size,
  }))

  const verifiedRevenue = collectedTrend.reduce((sum, point) => sum + point.amount, 0)
  const activeMemberCount = apiData?.memberships.active ?? activeMemberships.length
  const renewingSoonCount = apiData?.memberships.renewingSoon ?? renewingMemberships.length
  const churnedCount = apiData?.memberships.churned ?? churnedMemberships.length
  const renewalRate = apiData?.memberships.renewalRate
    ?? (churnedCount + memberships.filter((membership) => membership.status?.toUpperCase() === 'RENEWED').length > 0
      ? memberships.filter((membership) => membership.status?.toUpperCase() === 'RENEWED').length
        / (churnedCount + memberships.filter((membership) => membership.status?.toUpperCase() === 'RENEWED').length)
      : 0)
  const repeatCustomerCount = apiData?.customers.repeatCustomers
    ?? new Set(invoices.reduce<number[]>((ids, invoice) => invoice.customerId == null ? ids : [...ids, invoice.customerId], [])
      .filter((customerId, index, all) => all.indexOf(customerId) !== index)).size
  const customerRetentionRate = apiData?.customers.retentionRate
    ?? (dashboardData.customers.length > 0 ? Math.min(1, repeatCustomerCount / dashboardData.customers.length) : 0)
  const acquiredLast30Days = apiData?.customers.acquiredLast30Days ?? 0
  const agingBuckets = apiData?.paymentAging ?? []
  const agingTotal = Math.max(...agingBuckets.map((bucket) => Number(bucket.amount ?? 0)), 1)
  const openInvoiceCount = agingBuckets.reduce((sum, bucket) => sum + bucket.invoiceCount, 0)
  const appointmentCompletionRate = recentAppointments.length > 0
    ? completedAppointments.length / recentAppointments.length
    : 0

  const loading = currentResult == null
  const apiError = currentResult?.error
  const selectedPeriodLabel = periodLabel(period)
  const invoiceMetrics = [
    { label: `Net billed · ${selectedPeriodLabel.toLowerCase()}`, value: money(billedTotal), detail: `${issuedInvoices.length} issued invoices`, icon: ReceiptText, color: '#0b8b70' },
    { label: `Discounts · ${selectedPeriodLabel.toLowerCase()}`, value: money(totalDiscounts), detail: `${Math.round(discountRate * 100)}% of gross · ${invoiceDiscountCount} invoice discounts + loyalty`, icon: CircleDollarSign, color: '#9b5b16' },
    { label: `Collected · ${selectedPeriodLabel.toLowerCase()}`, value: money(verifiedRevenue), detail: 'Verified payments + paid invoices', icon: CircleDollarSign, color: '#1877a8' },
    { label: 'Open invoices', value: String(openInvoiceCount), detail: `${money(agingBuckets.reduce((sum, bucket) => sum + Number(bucket.amount ?? 0), 0))} outstanding`, icon: FileText, color: '#c47a1a' },
  ]
  const featureMetrics = [
    ...(appointmentsEnabled ? [
      { label: `Customers · ${selectedPeriodLabel.toLowerCase()}`, value: appointmentCustomers.size.toLocaleString('en-IN'), detail: 'Unique customers with a visit', icon: UserRound, color: '#1877a8' },
      { label: `Completed · ${selectedPeriodLabel.toLowerCase()}`, value: completedAppointments.length.toLocaleString('en-IN'), detail: `${Math.round(appointmentCompletionRate * 100)}% of bookings in period`, icon: CalendarCheck2, color: '#16845f' },
      { label: 'Service value', value: money(completedServiceValue), detail: `Completed appointments · ${rangeText}`, icon: TrendingUp, color: '#7048a8' },
      { label: 'Upcoming · 30 days', value: upcomingAppointments.length.toLocaleString('en-IN'), detail: 'Booked or confirmed', icon: Clock3, color: '#c47a1a' },
    ] : []),
    ...(membershipsEnabled ? [
      { label: 'Active memberships', value: activeMemberCount.toLocaleString('en-IN'), detail: `${renewingSoonCount} renew in the next 30 days`, icon: BadgeCheck, color: '#16845f' },
      { label: 'Renewal rate', value: `${Math.round(renewalRate * 100)}%`, detail: `${churnedCount} churned memberships`, icon: CalendarClock, color: '#7048a8' },
    ] : []),
    ...(!appointmentsEnabled && !membershipsEnabled ? [
      { label: 'Invoice customers · today', value: new Set(invoices.filter((invoice) => invoice.issueDate === today).map((invoice) => invoice.customerId).filter((id): id is number => id != null)).size.toLocaleString('en-IN'), detail: 'Unique customers invoiced today', icon: UserRound, color: '#1877a8' },
    ] : []),
  ]
  const headerFeatures = [
    ...(appointmentsEnabled ? ['Appointments'] : []),
    ...(membershipsEnabled ? ['Memberships'] : []),
    'Invoices',
  ]
  const maxInvoiceStatusCount = Math.max(...invoiceStatusCounts.map((item) => item.count), 1)
  const maxAppointmentStatusCount = Math.max(...appointmentStatusCounts.map((item) => item.count), 1)
  const serviceCounts = new Map<string, number>()
  for (const appointment of validVisitAppointments) {
    const name = appointment.serviceName?.trim() || 'Appointment service'
    serviceCounts.set(name, (serviceCounts.get(name) ?? 0) + 1)
  }
  const topServices = [...serviceCounts.entries()].sort((first, second) => second[1] - first[1]).slice(0, 4)

  return (
    <Stack spacing={1.5} sx={{ pb: 1 }}>
      <Card sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        color: '#fff',
        background: 'linear-gradient(128deg, #0F032D 0%, #4E2BCC 55%, #905BF4 100%)',
        boxShadow: '0 14px 28px rgba(5, 102, 79, 0.22)',
      }}>
        <Box aria-hidden="true" sx={{ position: 'absolute', width: 190, height: 190, right: -62, top: -86, border: '1px solid rgba(255,255,255,0.13)', borderRadius: '50%', '&::after': { content: '""', position: 'absolute', inset: 18, border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50%' } }} />
        <CardContent sx={{ position: 'relative', p: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box>
              <Typography sx={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.7)' }}>BUSINESS PERFORMANCE</Typography>
              <Typography variant="h6" sx={{ mt: 0.25, fontWeight: 900, letterSpacing: '-0.025em' }}>Insights</Typography>
            </Box>
            <Chip size="small" icon={<Activity size={13} />} label={loading ? 'Updating' : selectedPeriodLabel} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.13)', fontWeight: 750, '& .MuiChip-icon': { color: '#fff' } }} />
          </Stack>
          <Typography sx={{ mt: 2.1, fontSize: 11, fontWeight: 650, color: 'rgba(255,255,255,0.76)' }}>Net billed revenue</Typography>
          <Typography sx={{ mt: 0.2, fontSize: 32, fontWeight: 900, letterSpacing: '-0.055em', lineHeight: 1.05 }}>{money(billedTotal)}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{issuedInvoices.length} invoices</Typography>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.55)' }} />
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{money(verifiedRevenue)} collected</Typography>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.55)' }} />
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{money(totalDiscounts)} discounts from {money(grossBilledTotal)} gross</Typography>
          </Stack>
          <Stack direction="row" spacing={0.65} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.65 }}>
            {headerFeatures.map((feature) => <Chip key={feature} size="small" label={feature} sx={{ height: 22, color: '#fff', border: '1px solid rgba(255,255,255,0.24)', bgcolor: 'rgba(255,255,255,0.08)', fontSize: 9, fontWeight: 750 }} />)}
          </Stack>
        </CardContent>
      </Card>

      <ToggleButtonGroup
        value={period}
        exclusive
        fullWidth
        size="small"
        aria-label="Insights date range"
        onChange={(_event, value: InsightPeriod | null) => {
          if (value) setPeriod(value)
        }}
        sx={{
          p: 0.4,
          borderRadius: 2,
          bgcolor: 'background.paper',
          '& .MuiToggleButton-root': { flex: 1, px: 0.5, py: 0.7, border: 0, borderRadius: '7px !important', fontSize: 10, fontWeight: 750, textTransform: 'none', whiteSpace: 'nowrap' },
          '& .Mui-selected': { bgcolor: 'primary.main !important', color: '#fff !important' },
        }}
      >
        {periodOptions.map((option) => (
          <ToggleButton key={option.value} value={option.value} aria-label={option.label}>{option.label}</ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Typography
        variant="caption"
        color="text.secondary"
        aria-live="polite"
        sx={{ mt: -0.8, textAlign: 'center', fontWeight: 650 }}
      >
        Showing data for {selectedDateRange}
      </Typography>

      {apiError && <Alert severity="warning" sx={{ borderRadius: 2 }}>Some historical analytics could not be loaded. Current invoice and feature activity is still shown.</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
        {invoiceMetrics.map((metric) => <MetricTile key={metric.label} {...metric} />)}
        {featureMetrics.map((metric) => <MetricTile key={metric.label} {...metric} />)}
      </Box>

      {appointmentsEnabled && (
        <SummaryCard>
          <SectionHeading eyebrow="Appointments" title="Booking performance" detail={`Demand, completion and service activity for ${rangeText}.`} icon={CalendarCheck2} />
          <Stack direction="row" spacing={0.7} sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 0.7 }}>
            <Chip size="small" variant="outlined" label={`${recentAppointments.length} bookings`} />
            <Chip size="small" variant="outlined" color="success" label={`${completedAppointments.length} completed`} />
            <Chip size="small" variant="outlined" color="warning" label={`${upcomingAppointments.length} upcoming`} />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>Appointment volume · {selectedPeriodLabel.toLowerCase()}</Typography>
          <Box sx={{ mt: 0.4 }}><TrendBars points={appointmentTrend} /></Box>
          <Box sx={{ mt: 1.5, pt: 1.3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>Popular services · {rangeText}</Typography>
            {topServices.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>No appointment activity in this period.</Typography>
            ) : (
              <Stack spacing={0.8} sx={{ mt: 1 }}>
                {topServices.map(([name, count]) => (
                  <Stack key={name} direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{name}</Typography>
                    <Typography variant="body2" color="text.secondary">{count} {count === 1 ? 'booking' : 'bookings'}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>
          <Box sx={{ mt: 1.5, pt: 1.3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>Booking outcomes · {rangeText}</Typography>
            <Stack spacing={0.9} sx={{ mt: 1 }}>
              {appointmentStatusCounts.filter((item) => item.count > 0).map((item) => (
                <StatusBar key={item.status} label={formatStatus(item.status)} count={item.count} maximum={maxAppointmentStatusCount} color={statusColor(item.status)} />
              ))}
              {recentAppointments.length === 0 && <Typography variant="body2" color="text.secondary">No appointments recorded in this period.</Typography>}
            </Stack>
          </Box>
        </SummaryCard>
      )}

      {membershipsEnabled && (
        <SummaryCard>
          <SectionHeading eyebrow="Memberships" title="Member health" detail="Active plans, upcoming renewals and membership growth." icon={BadgeCheck} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.8 }}>
            <MiniStat label="Active now" value={activeMemberCount} />
            <MiniStat label="Renewing soon" value={renewingSoonCount} />
            <MiniStat label="Churned" value={churnedCount} />
            <MiniStat label="Renewal rate" value={`${Math.round(renewalRate * 100)}%`} />
          </Box>
          <Box sx={{ mt: 1.5, pt: 1.3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>Membership starts · {selectedPeriodLabel.toLowerCase()}</Typography>
            <Box sx={{ mt: 0.4 }}><TrendBars points={membershipTrend} /></Box>
          </Box>
          {memberships.length === 0 && <Typography variant="caption" color="text.secondary">Membership activity will appear here as plans are joined.</Typography>}
        </SummaryCard>
      )}

      <SummaryCard>
        <SectionHeading eyebrow="Invoices" title="Billing performance" detail={`Gross sales, discounts, net billed and collections for ${rangeText}, plus current invoice health.`} icon={ReceiptText} />
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>Net billed vs collected · {selectedPeriodLabel.toLowerCase()}</Typography>
        <Box sx={{ mt: 0.4 }}><TrendBars points={billedTrend} comparison={collectedTrend} /></Box>
        <Box sx={{ mt: 1.1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>Discounts granted · {selectedPeriodLabel.toLowerCase()}</Typography>
          <TrendBars points={discountTrend} />
        </Box>
        <Box sx={{ mt: 1.5, pt: 1.3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>Revenue breakdown · {selectedPeriodLabel.toLowerCase()}</Typography>
          <Stack spacing={0.75} sx={{ mt: 1 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">Gross billed before discounts</Typography>
              <Typography variant="body2" sx={{ fontWeight: 750 }}>{money(grossBilledTotal)}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="body2" color="success.main">Invoice discounts ({invoiceDiscountCount} invoices)</Typography>
              <Typography variant="body2" color="success.main" sx={{ fontWeight: 750 }}>−{money(invoiceDiscountTotal)}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="body2" color="success.main">Loyalty discounts</Typography>
              <Typography variant="body2" color="success.main" sx={{ fontWeight: 750 }}>−{money(loyaltyDiscountTotal)}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, pt: 0.7, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>Net billed</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{money(billedTotal)}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Discounts are {Math.round(discountRate * 100)}% of gross billed revenue.
            </Typography>
          </Stack>
        </Box>
        <Box sx={{ mt: 1.6, pt: 1.3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>Invoice status</Typography>
            <Typography variant="caption" color="text.secondary">{issuedInvoices.length} issued in period</Typography>
          </Stack>
          <Stack spacing={0.9} sx={{ mt: 1 }}>
            {invoiceStatusCounts.filter((item) => item.count > 0).map((item) => (
              <StatusBar key={item.status} label={formatStatus(item.status)} count={item.count} maximum={maxInvoiceStatusCount} color={statusColor(item.status)} />
            ))}
            {issuedInvoices.length === 0 && <Typography variant="body2" color="text.secondary">No issued invoices in this period.</Typography>}
          </Stack>
        </Box>
        <Box sx={{ mt: 1.6, pt: 1.3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>Outstanding invoice aging</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Current open balances grouped by due date</Typography>
            </Box>
            <Chip size="small" label={`${openInvoiceCount} open`} sx={{ fontWeight: 750 }} />
          </Stack>
          {agingBuckets.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No outstanding invoice aging data.</Typography>
          ) : (
            <Stack spacing={1.1} sx={{ mt: 1.2 }}>
              {agingBuckets.map((bucket, index) => {
                const color = index >= 3 ? 'error' : index >= 1 ? 'warning' : 'success'
                return (
                  <Box key={bucket.label}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, mb: 0.45 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{bucket.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{money(bucket.amount)} · {bucket.invoiceCount}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={Math.min(100, Number(bucket.amount) / agingTotal * 100)} color={color} sx={{ height: 6, borderRadius: 5, bgcolor: alpha(theme.palette[color].main, 0.1), '& .MuiLinearProgress-bar': { borderRadius: 5 } }} />
                  </Box>
                )
              })}
            </Stack>
          )}
        </Box>
      </SummaryCard>

      <SummaryCard>
        <SectionHeading eyebrow="Customers" title="Customer relationships" detail="Repeat visits, retention and new customer acquisition." icon={UsersRound} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.8 }}>
          <MiniStat label="Retention" value={`${Math.round(customerRetentionRate * 100)}%`} />
          <MiniStat label="Repeat customers" value={repeatCustomerCount} />
          <MiniStat label="New · 30 days" value={acquiredLast30Days} />
          <MiniStat label="Appointment customers today" value={appointmentCustomersToday.size} />
        </Box>
        <Box sx={{ mt: 1.5, pt: 1.3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>Customers invoiced · {selectedPeriodLabel.toLowerCase()}</Typography>
          <Box sx={{ mt: 0.4 }}>
            <TrendBars points={customerActivityTrend} />
          </Box>
          <Typography variant="caption" color="text.secondary">{acquiredLast30Days} new {acquiredLast30Days === 1 ? 'customer' : 'customers'} in the last 30 days</Typography>
        </Box>
      </SummaryCard>
    </Stack>
  )
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <Box sx={{ p: 1.1, borderRadius: 1.6, bgcolor: 'action.hover', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650 }}>{label}</Typography>
      <Typography sx={{ mt: 0.2, fontSize: 18, fontWeight: 850, lineHeight: 1.1, overflowWrap: 'anywhere' }}>{value}</Typography>
    </Box>
  )
}

function StatusBar({ label, count, maximum, color }: { label: string; count: number; maximum: number; color: string }) {
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, mb: 0.4 }}>
        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700 }}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">{count}</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={count / maximum * 100} sx={{ height: 5, borderRadius: 4, bgcolor: alpha(color, 0.1), '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 } }} />
    </Box>
  )
}

function formatStatus(status: string) {
  return status.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
