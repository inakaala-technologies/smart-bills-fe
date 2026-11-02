
import { useMemo, useState } from 'react'
import {
  Box,
  Alert,
  Stack,
  Typography,
  TextField,
  InputAdornment,
  MenuItem,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { EmptyState } from '../../../components/EmptyState'
import { RecentActivityItem } from '../../../components/RecentActivityItem'
import {
  fetchBusinessById,
  fetchFamilyInvoices,
  type DashboardData,
  type InvoiceSummary,
} from '../../../services/api'
import { getErrorMessage } from '../../../services/api/httpClient'

type InvoiceFilter = 'ALL' | 'PAID' | 'UNPAID' | 'OVERDUE'
type InvoiceSort = 'NEWEST' | 'OLDEST' | 'HIGHEST' | 'LOWEST'
type InvoiceView = 'MY' | 'FAMILY'

type CustomerInvoicesListProps = {
  invoices: DashboardData['invoices']
  businesses: DashboardData['businesses']
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

export function CustomerInvoicesList({
  invoices,
  businesses,
}: CustomerInvoicesListProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<InvoiceFilter>('ALL')
  const [sort, setSort] = useState<InvoiceSort>('NEWEST')
  const [selectedInvoice, setSelectedInvoice] = useState<{
    invoice: InvoiceSummary
    businessName: string
  } | null>(null)

  const [view, setView] = useState<InvoiceView>('MY')
  const [familyInvoices, setFamilyInvoices] = useState<InvoiceSummary[]>([])
  const [familyBusinesses, setFamilyBusinesses] =
    useState<DashboardData['businesses']>([])
  const [familyLoaded, setFamilyLoaded] = useState(false)
  const [loadingFamily, setLoadingFamily] = useState(false)
  const [familyError, setFamilyError] = useState('')

  const selectView = async (nextView: InvoiceView | null) => {
    if (!nextView) return

    setView(nextView)

    if (nextView !== 'FAMILY' || familyLoaded || loadingFamily) return

    setLoadingFamily(true)
    setFamilyError('')

    try {
      const result = await fetchFamilyInvoices()
      setFamilyInvoices(result)

      const missingBusinessIds = [
        ...new Set(
          result
            .map((invoice) => invoice.businessId)
            .filter(
              (id): id is number =>
                typeof id === 'number' &&
                !businesses.some((business) => business.id === id),
            ),
        ),
      ]

      const fetchedBusinesses = await Promise.all(
        missingBusinessIds.map((id) => fetchBusinessById(id)),
      )

      setFamilyBusinesses(
        fetchedBusinesses.filter(
          (business): business is DashboardData['businesses'][number] =>
            business !== null,
        ),
      )

      setFamilyLoaded(true)
    } catch (error) {
      setFamilyError(
        getErrorMessage(error, 'Could not load family bills.'),
      )
    } finally {
      setLoadingFamily(false)
    }
  }

  const displayedInvoices =
    view === 'MY' ? invoices : familyInvoices

  const rows = displayedInvoices.map((invoice) => {
    const business =
      businesses.find((item) => item.id === invoice.businessId) ??
      (view === 'FAMILY'
        ? familyBusinesses.find(
            (item) => item.id === invoice.businessId,
          )
        : undefined) ??
      (view === 'MY' ? businesses[0] : undefined)

    const businessName =
      business?.businessName ??
      business?.name ??
      (view === 'FAMILY' && invoice.businessId
        ? `Business #${invoice.businessId}`
        : 'Business profile')

    const initials =
      businessName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'B'

    const invoiceDate = invoice.issueDate
      ? new Date(invoice.issueDate)
      : null

    const status = String(invoice.status ?? 'SENT').toUpperCase()
    const displayStatus = ['SENT', 'PENDING', 'UNPAID'].includes(status)
      ? 'Unpaid'
      : status.charAt(0) + status.slice(1).toLowerCase()
    const amountValue = invoice.totalAmount ?? 0

    return {
      id: invoice.id,
      invoice,
      businessId: invoice.businessId,
      businessName,
      invoiceNumber: invoice.invoiceNumber ?? `INV-${invoice.id}`,
      status,
      amount: formatCurrency(invoice.totalAmount),
      amountValue,
      timestamp: invoiceDate?.getTime() ?? 0,
      subtitle: `${invoice.invoiceNumber ?? `INV-${invoice.id}`} · ${displayStatus}`,
      date:
        invoiceDate?.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }) ?? '—',
      time:
        invoiceDate?.toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
        }) ?? '',
      badge: initials,
    }
  })

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows
      .filter((entry) => {
        const searchableDate = entry.timestamp
          ? new Date(entry.timestamp)
              .toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
              .toLowerCase()
          : ''

        const searchableAmount = String(entry.amountValue)
        const formattedAmount =
          entry.amountValue.toLocaleString('en-IN')
        const normalizedAmount = query.replace(/[₹,\s]/g, '')

        const matchesSearch =
          !query ||
          entry.invoiceNumber.toLowerCase().includes(query) ||
          entry.businessName.toLowerCase().includes(query) ||
          searchableDate.includes(query) ||
          searchableAmount.includes(normalizedAmount) ||
          formattedAmount.toLowerCase().includes(
            query.replace(/^₹/, ''),
          )

        const matchesStatus =
          filter === 'ALL' ||
          (filter === 'PAID' && entry.status === 'PAID') ||
          (filter === 'UNPAID' &&
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

  const totalCount =
    view === 'MY' ? invoices.length : familyInvoices.length

  const hasActiveFilters = Boolean(search.trim()) || filter !== 'ALL'

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        borderRadius: '24px',
        p: 2,
        border: '1px solid var(--mui-palette-divider)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          mb: 1.5,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 800, color: 'text.primary' }}
        >
          Documents &amp; Invoices
        </Typography>

        <Typography
          variant="caption"
          sx={(theme) => ({
            color: theme.palette.primary.main,
            fontWeight: 800,
          })}
        >
          {totalCount} total
        </Typography>
      </Box>

      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={view}
        onChange={(_, value: InvoiceView | null) =>
          void selectView(value)
        }
        sx={{ mb: 1.5 }}
      >
        <ToggleButton value="MY">My</ToggleButton>
        <ToggleButton value="FAMILY">Family</ToggleButton>
      </ToggleButtonGroup>

      {familyError && (
        <Alert severity="error" sx={{ mb: 1.25 }}>
          {familyError}
        </Alert>
      )}

      {loadingFamily && (
        <Typography sx={{ mb: 1, color: 'text.secondary' }}>
          Loading family bills…
        </Typography>
      )}

      {view === 'MY' && !loadingFamily && (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search invoice or business..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
          input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
             },
            }}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '12px' },
            }}
          />

          <Stack
            direction="row"
            spacing={0.8}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            {(
              [
                ['ALL', 'All'],
                ['PAID', 'Paid'],
                ['UNPAID', 'Unpaid'],
                ['OVERDUE', 'Overdue'],
              ] as const
            ).map(([value, label]) => (
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
            onChange={(event) =>
              setSort(event.target.value as InvoiceSort)
            }
          >
            <MenuItem value="NEWEST">Newest first</MenuItem>
            <MenuItem value="OLDEST">Oldest first</MenuItem>
            <MenuItem value="HIGHEST">Highest amount</MenuItem>
            <MenuItem value="LOWEST">Lowest amount</MenuItem>
          </TextField>
        </Stack>
      )}

      {!loadingFamily && filteredRows.length > 0 && (
        <Stack spacing={1.2}>
          {filteredRows.map((entry) => (
            <RecentActivityItem
              key={`${entry.businessId ?? 'business'}-${entry.id}`}
              title={entry.businessName}
              subtitle={entry.subtitle}
              amount={entry.amount}
              badge={entry.badge}
              date={entry.date}
              time={entry.time}
              accent="linear-gradient(135deg, #4E2BCC 0%, #905BF4 100%)"
              onClick={() => setSelectedInvoice({ invoice: entry.invoice, businessName: entry.businessName })}
            />
          ))}
        </Stack>
      )}

      <Dialog
        open={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 800 }}>Bill details</DialogTitle>
        {selectedInvoice && (
          <DialogContent dividers>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>Invoice number</Typography>
                <Typography sx={{ color: 'text.primary', fontWeight: 700 }}>
                  {selectedInvoice.invoice.invoiceNumber ?? `INV-${selectedInvoice.invoice.id}`}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>Business</Typography>
                <Typography sx={{ color: 'text.primary', fontWeight: 700 }}>{selectedInvoice.businessName}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>Status</Typography>
                <Typography sx={{ color: 'text.primary', fontWeight: 700 }}>
                  {['SENT', 'PENDING', 'UNPAID'].includes(String(selectedInvoice.invoice.status ?? 'SENT').toUpperCase())
                    ? 'Unpaid'
                    : selectedInvoice.invoice.status ?? 'Paid'}
                </Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>Issue date</Typography>
                  <Typography sx={{ color: 'text.primary' }}>
                    {selectedInvoice.invoice.issueDate
                      ? new Date(`${selectedInvoice.invoice.issueDate}T00:00:00`).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                      : 'Not provided'}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>Due date</Typography>
                  <Typography sx={{ color: 'text.primary' }}>
                    {selectedInvoice.invoice.dueDate
                      ? new Date(`${selectedInvoice.invoice.dueDate}T00:00:00`).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                      : 'Not provided'}
                  </Typography>
                </Box>
              </Stack>
              <Stack spacing={0.6} sx={{ borderTop: '1px solid var(--mui-palette-divider)', pt: 1.2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Typography sx={{ color: 'text.secondary' }}>Subtotal</Typography>
                  <Typography sx={{ color: 'text.primary' }}>{formatCurrency(selectedInvoice.invoice.subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Typography sx={{ color: 'text.secondary' }}>GST</Typography>
                  <Typography sx={{ color: 'text.primary' }}>{formatCurrency(selectedInvoice.invoice.gstAmount)}</Typography>
                </Box>
                {(selectedInvoice.invoice.invoiceDiscountAmount ?? 0) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ color: 'success.main' }}>Discount</Typography>
                    <Typography sx={{ color: 'success.main' }}>−{formatCurrency(selectedInvoice.invoice.invoiceDiscountAmount)}</Typography>
                  </Box>
                )}
                {(selectedInvoice.invoice.loyaltyPointsRedeemed ?? 0) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ color: 'success.main' }}>
                      Loyalty discount ({selectedInvoice.invoice.loyaltyPointsRedeemed} points)
                    </Typography>
                    <Typography sx={{ color: 'success.main' }}>−{formatCurrency(selectedInvoice.invoice.loyaltyDiscountAmount)}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, pt: 0.7, borderTop: '1px solid var(--mui-palette-divider)' }}>
                  <Typography sx={{ color: 'text.primary', fontWeight: 800 }}>Total</Typography>
                  <Typography sx={{ color: 'primary.main', fontWeight: 800 }}>
                    {formatCurrency(selectedInvoice.invoice.totalAmount)}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setSelectedInvoice(null)} sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {!loadingFamily &&
        filteredRows.length === 0 &&
        (view === 'MY' || familyLoaded) && (
          <EmptyState
            title={
              hasActiveFilters
                ? 'No matching invoices'
                : view === 'MY'
                  ? 'No bills'
                  : 'No family bills'
            }
            description={
              hasActiveFilters
                ? 'Try another search term or select a different filter.'
                : view === 'MY'
                  ? 'Your recent invoices will appear here.'
                  : 'Accepted family members’ invoices will appear here.'
            }
          />
        )}
    </Box>
  )
}
