import { useEffect, useMemo, useState } from 'react'
import { Box, ButtonBase, Paper, Stack, Typography } from '@mui/material'
import { ArrowDownRight, ArrowUpRight, Award, Minus } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import { fetchLoyaltyBalance, type BusinessSummary, type InvoiceSummary } from '../../../services/api'

type CustomerInsightsProps = {
  invoices: InvoiceSummary[]
  businesses: BusinessSummary[]
  customerId: number | null
}

const MONTHS_SHOWN = 6
const EXCLUDED_STATUSES = ['DRAFT', 'CANCELLED', 'VOID']
const PENDING_STATUSES = ['SENT', 'PENDING', 'UNPAID', 'OVERDUE']

const formatCurrency = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`

function monthLabel(key: string, long = false) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', long ? { month: 'long', year: 'numeric' } : { month: 'short' })
}

export function CustomerInsights({ invoices, businesses, customerId }: CustomerInsightsProps) {
  const [now] = useState(() => new Date())
  const currentKey = monthKey(now.getFullYear(), now.getMonth())
  const [selectedKey, setSelectedKey] = useState(currentKey)
  const [balances, setBalances] = useState<Array<{ name: string; balance: number }>>([])

  useEffect(() => {
    if (customerId == null || businesses.length === 0) return
    let isCurrent = true
    void Promise.all(businesses.map(async (business) => {
      try {
        const result = await fetchLoyaltyBalance(business.id, customerId)
        return { name: business.businessName ?? business.name ?? 'Business', balance: result.balance }
      } catch {
        return { name: '', balance: 0 }
      }
    })).then((results) => {
      if (isCurrent) setBalances(results.filter((item) => item.balance > 0).sort((a, b) => b.balance - a.balance))
    })
    return () => { isCurrent = false }
  }, [businesses, customerId])

  const monthKeys = useMemo(() => {
    const keys: string[] = []
    for (let offset = MONTHS_SHOWN - 1; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      keys.push(monthKey(date.getFullYear(), date.getMonth()))
    }
    return keys
  }, [now])

  const entries = useMemo(
    () => invoices
      .filter((invoice) => invoice.issueDate && !EXCLUDED_STATUSES.includes(String(invoice.status ?? 'SENT').toUpperCase()))
      .map((invoice) => ({
        invoice,
        key: String(invoice.issueDate).slice(0, 7),
        status: String(invoice.status ?? 'SENT').toUpperCase(),
        total: invoice.totalAmount ?? 0,
        discountSaved: invoice.invoiceDiscountAmount ?? 0,
        loyaltySaved: invoice.loyaltyDiscountAmount ?? 0,
        pointsUsed: invoice.loyaltyPointsRedeemed ?? 0,
      })),
    [invoices],
  )

  const totalsByMonth = useMemo(() => {
    const totals = new Map<string, number>()
    entries.forEach((entry) => totals.set(entry.key, (totals.get(entry.key) ?? 0) + entry.total))
    return totals
  }, [entries])

  const selectedEntries = useMemo(() => entries.filter((entry) => entry.key === selectedKey), [entries, selectedKey])
  const spent = selectedEntries.reduce((sum, entry) => sum + entry.total, 0)
  const paid = selectedEntries.filter((entry) => entry.status === 'PAID').reduce((sum, entry) => sum + entry.total, 0)
  const pending = selectedEntries.filter((entry) => PENDING_STATUSES.includes(entry.status)).reduce((sum, entry) => sum + entry.total, 0)
  const discountSaved = selectedEntries.reduce((sum, entry) => sum + entry.discountSaved, 0)
  const loyaltySaved = selectedEntries.reduce((sum, entry) => sum + entry.loyaltySaved, 0)
  const pointsUsed = selectedEntries.reduce((sum, entry) => sum + entry.pointsUsed, 0)
  const saved = discountSaved + loyaltySaved
  const billCount = selectedEntries.length
  const averageBill = billCount ? spent / billCount : 0
  const largestBill = selectedEntries.reduce((max, entry) => Math.max(max, entry.total), 0)
  const savingsRate = spent + saved > 0 ? (saved / (spent + saved)) * 100 : 0
  const lifetimePointsUsed = entries.reduce((sum, entry) => sum + entry.pointsUsed, 0)
  const lifetimeLoyaltySaved = entries.reduce((sum, entry) => sum + entry.loyaltySaved, 0)
  const lifetimeSaved = entries.reduce((sum, entry) => sum + entry.loyaltySaved + entry.discountSaved, 0)
  const availablePoints = balances.reduce((sum, item) => sum + item.balance, 0)

  const selectedIndex = monthKeys.indexOf(selectedKey)
  const previousTotal = selectedIndex > 0 ? totalsByMonth.get(monthKeys[selectedIndex - 1]) ?? 0 : undefined
  const changePercent = previousTotal && previousTotal > 0 ? ((spent - previousTotal) / previousTotal) * 100 : undefined

  const byBusiness = useMemo(() => {
    const totals = new Map<number | undefined, number>()
    selectedEntries.forEach((entry) => totals.set(entry.invoice.businessId, (totals.get(entry.invoice.businessId) ?? 0) + entry.total))
    return [...totals.entries()]
      .map(([businessId, total]) => ({
        name: businesses.find((business) => business.id === businessId)?.businessName
          ?? businesses.find((business) => business.id === businessId)?.name
          ?? 'Business',
        total,
      }))
      .sort((first, second) => second.total - first.total)
  }, [selectedEntries, businesses])

  const maxMonthTotal = Math.max(1, ...monthKeys.map((key) => totalsByMonth.get(key) ?? 0))
  const sixMonthTotal = monthKeys.reduce((sum, key) => sum + (totalsByMonth.get(key) ?? 0), 0)
  const monthsWithSpend = monthKeys.filter((key) => (totalsByMonth.get(key) ?? 0) > 0).length
  const averageMonthly = monthsWithSpend ? sixMonthTotal / monthsWithSpend : 0

  const TrendIcon = changePercent === undefined ? Minus : changePercent >= 0 ? ArrowUpRight : ArrowDownRight

  return (
    <Stack spacing={1.6}>
      <Box>
        <Typography sx={{ color: 'text.primary', fontSize: 19, fontWeight: 900 }}>Spending insights</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Track what you spend each month across businesses</Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: '20px',
          color: '#ffffff',
          background: 'linear-gradient(135deg, #0F032D 0%, #4E2BCC 62%, #905BF4 100%)',
        }}
      >
        <Typography sx={{ fontSize: 12, opacity: 0.85 }}>Spent in {monthLabel(selectedKey, true)}</Typography>
        <Typography sx={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em' }}>{formatCurrency(spent)}</Typography>
        <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mt: 0.4 }}>
          <TrendIcon size={15} />
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
            {changePercent === undefined
              ? 'No earlier month to compare'
              : `${Math.abs(changePercent).toFixed(0)}% ${changePercent >= 0 ? 'more' : 'less'} than ${monthLabel(monthKeys[selectedIndex - 1])}`}
          </Typography>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.6, borderRadius: '16px' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1.2 }}>Last {MONTHS_SHOWN} months</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end', height: 140 }}>
          {monthKeys.map((key) => {
            const total = totalsByMonth.get(key) ?? 0
            const isSelected = key === selectedKey
            return (
              <ButtonBase
                key={key}
                type="button"
                aria-label={`${monthLabel(key, true)}: ${formatCurrency(total)}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedKey(key)}
                sx={{ flex: 1, height: '100%', flexDirection: 'column', justifyContent: 'flex-end', gap: 0.5 }}
              >
                <Typography sx={{ fontSize: 9, fontWeight: 700, color: 'text.secondary' }}>
                  {total > 0 ? formatCurrency(total) : ''}
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    height: `${Math.max(4, (total / maxMonthTotal) * 90)}px`,
                    borderRadius: '8px 8px 4px 4px',
                    background: isSelected ? 'linear-gradient(180deg, #905BF4 0%, #4E2BCC 100%)' : 'rgba(78, 43, 204, 0.2)',
                    transition: 'height 240ms ease, background 180ms ease',
                  }}
                />
                <Typography sx={{ fontSize: 10, fontWeight: isSelected ? 800 : 600, color: isSelected ? 'primary.main' : 'text.secondary' }}>
                  {monthLabel(key)}
                </Typography>
              </ButtonBase>
            )
          })}
        </Stack>
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
          Monthly average: {formatCurrency(averageMonthly)}
        </Typography>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
        {[
          { label: 'Paid', value: paid },
          { label: 'Pending', value: pending },
          { label: 'Saved', value: saved },

        ].map((item) => (
          <Paper key={item.label} variant="outlined" sx={{ p: 1.2, borderRadius: '14px', textAlign: 'center' }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>{item.label}</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{formatCurrency(item.value)}</Typography>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
        {[
          { label: 'Bills', value: String(billCount) },
          { label: 'Average bill', value: formatCurrency(averageBill) },
          { label: 'Largest bill', value: formatCurrency(largestBill) },
        ].map((item) => (
          <Paper key={item.label} variant="outlined" sx={{ p: 1.2, borderRadius: '14px', textAlign: 'center' }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>{item.label}</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{item.value}</Typography>
          </Paper>
        ))}
      </Box>

      <Paper variant="outlined" sx={{ p: 1.6, borderRadius: '16px' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.2 }}>
          <Award size={16} color="#4E2BCC" />
          <Typography sx={{ fontSize: 13, fontWeight: 800 }}>Loyalty &amp; savings · {monthLabel(selectedKey)}</Typography>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.2 }}>
          {[
            { label: 'Points used', value: pointsUsed.toLocaleString('en-IN') },
            { label: 'Saved with points', value: formatCurrency(loyaltySaved) },
            { label: 'Saved with discounts', value: formatCurrency(discountSaved) },
            { label: 'Total saved', value: formatCurrency(saved) },
            { label: 'Available points', value: availablePoints.toLocaleString('en-IN') },
          ].map((item) => (
            <Box key={item.label}>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>{item.label}</Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{item.value}</Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="caption" sx={{ display: 'block', mt: 1.2, color: 'text.secondary' }}>
          {saved > 0
            ? `You saved ${savingsRate.toFixed(0)}% of what these bills would have cost.`
            : 'No discounts or points were used this month.'}
        </Typography>
        <Box sx={{ mt: 1.4, pt: 1.2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>All time</Typography>
          <Typography sx={{ fontSize: 12, mt: 0.4 }}>
            {lifetimePointsUsed.toLocaleString('en-IN')} points used · {formatCurrency(lifetimeLoyaltySaved)} saved with points · {formatCurrency(lifetimeSaved)} saved in total
          </Typography>
        </Box>
        {balances.length > 0 && (
          <Box sx={{ mt: 1.4, pt: 1.2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Points available · {availablePoints.toLocaleString('en-IN')}
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 0.6 }}>
              {balances.map((item) => (
                <Stack key={item.name} direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography noWrap sx={{ fontSize: 12, minWidth: 0 }}>{item.name}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{item.balance.toLocaleString('en-IN')} pts</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.6, borderRadius: '16px' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1.2 }}>Where you spent in {monthLabel(selectedKey)}</Typography>
        {byBusiness.length === 0 ? (
          <EmptyState title="No spending this month" description="Invoices issued this month will show up here." />
        ) : (
          <Stack spacing={1.2}>
            {byBusiness.map((item) => (
              <Box key={item.name}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.4 }}>
                  <Typography noWrap sx={{ fontSize: 12, fontWeight: 600, minWidth: 0 }}>{item.name}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{formatCurrency(item.total)}</Typography>
                </Stack>
                <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}>
                  <Box sx={{ width: `${spent > 0 ? (item.total / spent) * 100 : 0}%`, height: '100%', borderRadius: 3, bgcolor: 'primary.main' }} />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  )
}
