import { useEffect, useState } from 'react'
import { alpha, Alert, Box, Card, CardContent, Chip, LinearProgress, Stack, Typography, useTheme } from '@mui/material'
import { Activity, CalendarClock, CircleDollarSign, UsersRound } from 'lucide-react'
import { fetchBusinessInsights, type BusinessInsights } from '../../../services/api'
import { RevenueTrendChart } from './RevenueTrendChart'

type BusinessInsightsWorkspaceProps = { businessId: number }

function money(amount: number) {
  return `₹${Number(amount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function BusinessInsightsWorkspace({ businessId }: BusinessInsightsWorkspaceProps) {
  const theme = useTheme()
  const [result, setResult] = useState<{
    businessId: number
    data?: BusinessInsights
    error?: string
  } | null>(null)

  useEffect(() => {
    let isCurrent = true
    fetchBusinessInsights(businessId).then((result) => {
      if (isCurrent) setResult({ businessId, data: result })
    }).catch((cause: unknown) => {
      if (isCurrent) setResult({
        businessId,
        error: cause instanceof Error ? cause.message : 'Could not load business insights.',
      })
    })
    return () => { isCurrent = false }
  }, [businessId])

  if (result?.businessId !== businessId) return <Typography color="text.secondary">Loading insights…</Typography>
  if (result.error) return <Alert severity="error">{result.error}</Alert>
  const data = result.data
  if (!data) return null

  const agingTotal = Math.max(...data.paymentAging.map((bucket) => bucket.amount), 1)
  const revenuePoints = data.revenueTrend.map((point) => ({ label: point.label, value: point.amount }))
  const acquisitionPoints = data.customers.acquisitionTrend.map((point) => ({ label: point.label, value: point.amount }))
  const metrics = [
    { label: 'Verified revenue', value: money(data.revenueTrend.reduce((sum, point) => sum + point.amount, 0)), detail: 'Collected in 6 months', icon: CircleDollarSign, tone: 'success' as const },
    { label: 'Active memberships', value: data.memberships.active.toLocaleString('en-IN'), detail: `${data.memberships.renewingSoon} renew in 30 days`, icon: CalendarClock, tone: 'primary' as const },
    { label: 'Renewal rate', value: `${Math.round(data.memberships.renewalRate * 100)}%`, detail: `${data.memberships.churned} churned memberships`, icon: Activity, tone: 'warning' as const },
    { label: 'Customer retention', value: `${Math.round(data.customers.retentionRate * 100)}%`, detail: `${data.customers.repeatCustomers} repeat customers`, icon: UsersRound, tone: 'secondary' as const },
  ]
  const agingTones = ['info', 'warning', 'warning', 'error'] as const

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 850 }}>Business insights</Typography>
          <Typography variant="body2" color="text.secondary">Collected revenue, receivables, membership health, and customer cohorts.</Typography>
        </Box>
        <Chip size="small" icon={<Activity size={15} />} label="6-month view" variant="outlined" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontWeight: 700 }} />
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
          <Card variant="outlined" key={label} sx={{ borderRadius: 1.5, minWidth: 0, borderTop: `3px solid ${theme.palette[tone].main}` }}>
            <CardContent sx={{ p: 1.4, '&:last-child': { pb: 1.4 } }}>
              <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', minWidth: 0 }}>
                <Box sx={{ width: 28, height: 28, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1, color: `${tone}.main`, bgcolor: alpha(theme.palette[tone].main, 0.1) }}><Icon size={15} /></Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1.25 }}>{label}</Typography>
              </Stack>
              <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 850, overflowWrap: 'anywhere' }}>{value}</Typography>
              <Typography variant="caption" color="text.secondary">{detail}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.2 }}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Collected revenue</Typography>
            <Typography variant="caption" color="text.secondary">Verified payments, month by month</Typography>
            <RevenueTrendChart points={revenuePoints} />
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Customer acquisition</Typography>
            <Typography variant="caption" color="text.secondary">New customer relationships, month by month</Typography>
            <RevenueTrendChart points={acquisitionPoints} />
            <Typography variant="caption" color="text.secondary">{data.customers.acquiredLast30Days} new {data.customers.acquiredLast30Days === 1 ? 'customer' : 'customers'} in the last 30 days</Typography>
          </CardContent>
        </Card>
      </Box>
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'baseline' }, justifyContent: 'space-between', gap: 0.4, mb: 1.4 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Outstanding invoice aging</Typography>
              <Typography variant="caption" color="text.secondary">Open balances grouped by due date</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">{data.paymentAging.reduce((sum, bucket) => sum + bucket.invoiceCount, 0)} invoices</Typography>
          </Stack>
          <Stack spacing={1.1}>
            {data.paymentAging.map((bucket, index) => (
              <Box key={bucket.label}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, mb: 0.45 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{bucket.label}</Typography>
                  <Typography variant="body2" color="text.secondary">{money(bucket.amount)} · {bucket.invoiceCount} invoices</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, bucket.amount / agingTotal * 100)}
                  color={agingTones[index] ?? 'info'}
                  sx={{ height: 7, borderRadius: 4, bgcolor: alpha(theme.palette[agingTones[index] ?? 'info'].main, 0.12), '& .MuiLinearProgress-bar': { borderRadius: 4 } }}
                />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
