import { useMemo, useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  TextField,
  InputAdornment,
  MenuItem,
  Chip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { EmptyState } from '../../../components/EmptyState'
import { RecentActivityItem } from '../../../components/RecentActivityItem'
import type { DashboardData } from '../../../services/api'

type InvoiceFilter = 'ALL' | 'PAID' | 'SENT' | 'OVERDUE'
type InvoiceSort = 'NEWEST' | 'OLDEST' | 'HIGHEST' | 'LOWEST'
type CustomerInvoicesListProps = {
  invoices: DashboardData['invoices']
  businesses: DashboardData['businesses']
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

export function CustomerInvoicesList({ invoices, businesses }: CustomerInvoicesListProps) {
    const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<InvoiceFilter>('ALL')
  const [sort, setSort] = useState<InvoiceSort>('NEWEST')
  const rows = invoices.map((invoice) => {
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
  status: String(invoice.status ?? 'SENT').toUpperCase(),
  amount: formatCurrency(invoice.totalAmount),
  amountValue: invoice.totalAmount ?? 0,
  timestamp: invoiceDate?.getTime() ?? 0,
      date: invoiceDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) ?? '—',
      time: invoiceDate?.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) ?? '',
      badge: initials,
    }
  })
  const filteredRows = useMemo(() => {
   
const query = search.trim().toLowerCase()

return rows
  .filter((entry) => {
    const searchableDate = entry.timestamp
      ? new Date(entry.timestamp).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).toLowerCase()
      : ''

    const searchableAmount = String(entry.amountValue)
    const formattedAmount = entry.amountValue.toLocaleString('en-IN')

    const matchesSearch =
      !query ||
      entry.invoiceNumber.toLowerCase().includes(query) ||
      entry.businessName.toLowerCase().includes(query) ||
      searchableDate.includes(query) ||
      searchableAmount.includes(query.replace(/[₹,\s]/g, '')) ||
      formattedAmount.toLowerCase().includes(query.replace(/^₹/, ''))

    const matchesStatus =
      filter === 'ALL' ||
      (filter === 'PAID' && entry.status === 'PAID') ||
      (filter === 'SENT' &&
        ['SENT', 'PENDING', 'UNPAID'].includes(entry.status)) ||
      (filter === 'OVERDUE' && entry.status === 'OVERDUE')

    return matchesSearch && matchesStatus
  })
  .sort((a, b) => {
    switch (sort) {
      case 'OLDEST':
        return a.timestamp - b.timestamp
      case 'HIGHEST':
        return b.amountValue - a.amountValue
      case 'LOWEST':
        return a.amountValue - b.amountValue
      default:
        return b.timestamp - a.timestamp
    }
  })

  }, [rows, search, filter, sort])
  return (
    <Box sx={{ backgroundColor: 'background.paper', borderRadius: '24px', p: 2, border: '1px solid var(--mui-palette-divider)', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.8 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.03em', color: 'text.primary' }}>Documents &amp; Invoices</Typography>
        <Typography variant="caption" sx={(theme) => ({ color: theme.palette.primary.main, fontWeight: 800 })}>{invoices.length} total</Typography>
      </Box>
            <Stack spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search invoice or business..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />

        <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
          {([
            ['ALL', 'All'],
            ['PAID', 'Paid'],
            ['SENT', 'Sent'],
            ['OVERDUE', 'Overdue'],
          ] as const).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              clickable
              color={filter === value ? 'primary' : 'default'}
              variant={filter === value ? 'filled' : 'outlined'}
              onClick={() => setFilter(value)}
            />
          ))}
        </Stack>

        <TextField
          select
          fullWidth
          size="small"
          label="Sort invoices"
          value={sort}
          onChange={(event) => setSort(event.target.value as InvoiceSort)}
        >
          <MenuItem value="NEWEST">Newest first</MenuItem>
          <MenuItem value="OLDEST">Oldest first</MenuItem>
          <MenuItem value="HIGHEST">Highest amount</MenuItem>
          <MenuItem value="LOWEST">Lowest amount</MenuItem>
        </TextField>
      </Stack>
      {filteredRows.length > 0 ? (
        <Stack spacing={1.2}>
          {filteredRows.map((entry) => (
            <RecentActivityItem
              key={entry.id}
              title={entry.businessName}
              subtitle={`${entry.invoiceNumber} • ${entry.status}`}
              amount={entry.amount}
              badge={entry.badge}
              date={entry.date}
              time={entry.time}
              accent="linear-gradient(135deg, #065f46 0%, #0d9488 100%)"
            />
          ))}
        </Stack>
       ) : (
        <EmptyState
          title={
            search.trim() || filter !== 'ALL'
              ? 'No matching invoices'
              : 'No bills'
          }
          description={
            search.trim() || filter !== 'ALL'
              ? 'Try another search term or select a different filter.'
              : 'Your recent invoices will appear here.'
          }
        />
      )}
    </Box>
  )
}