import { useState } from 'react'
import {
  Alert,
  Box,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { EmptyState } from '../../../components/EmptyState'
import { RecentActivityItem } from '../../../components/RecentActivityItem'
import {
  fetchBusinessById,
  fetchFamilyInvoices,
  type DashboardData,
  type InvoiceSummary,
} from '../../../services/api'
import { getErrorMessage } from '../../../services/api/httpClient'

type CustomerInvoicesListProps = {
  invoices: DashboardData['invoices']
  businesses: DashboardData['businesses']
}

type InvoiceView = 'MY' | 'FAMILY'

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

export function CustomerInvoicesList({ invoices, businesses }: CustomerInvoicesListProps) {
  const [view, setView] = useState<InvoiceView>('MY')
  const [familyInvoices, setFamilyInvoices] = useState<InvoiceSummary[]>([])
  const [familyBusinesses, setFamilyBusinesses] = useState<DashboardData['businesses']>([])
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

      const missingBusinessIds = [...new Set(
        result
          .map((invoice) => invoice.businessId)
          .filter((id): id is number =>
            typeof id === 'number' && !businesses.some((business) => business.id === id),
          ),
      )]

      const fetchedBusinesses = await Promise.all(
        missingBusinessIds.map((id) => fetchBusinessById(id)),
      )

      setFamilyBusinesses(
        fetchedBusinesses.filter(
          (business): business is DashboardData['businesses'][number] => business !== null,
        ),
      )
      setFamilyLoaded(true)
    } catch (error) {
      setFamilyError(getErrorMessage(error, 'Could not load family bills.'))
    } finally {
      setLoadingFamily(false)
    }
  }

  const displayedInvoices = view === 'MY'
    ? invoices.slice(0, 6)
    : [...familyInvoices].sort((first, second) =>
      new Date(second.issueDate ?? 0).getTime() - new Date(first.issueDate ?? 0).getTime(),
    )

  const rows = displayedInvoices.map((invoice) => {
    if (view === 'MY') {
      // Preserve the existing My invoices lookup and fallback behavior.
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
        businessId: invoice.businessId,
        businessName,
        subtitle: `${invoice.invoiceNumber ?? `INV-${invoice.id}`} · ${invoice.status ?? 'SENT'}`,
        amount: formatCurrency(invoice.totalAmount),
        date: invoiceDate?.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }) ?? '—',
        time: invoiceDate?.toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
        }) ?? '',
        badge: initials,
      }
    }

    const business = businesses.find((item) => item.id === invoice.businessId)
      ?? familyBusinesses.find((item) => item.id === invoice.businessId)
    const businessName = business?.businessName
      ?? business?.name
      ?? (invoice.businessId ? `Business #${invoice.businessId}` : 'Family bill')
    const initials = businessName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'B'
    const invoiceDate = invoice.issueDate ? new Date(invoice.issueDate) : null

    return {
      id: invoice.id,
      businessId: invoice.businessId,
      businessName,
      subtitle: `${invoice.invoiceNumber ?? `INV-${invoice.id}`} · ${invoice.status ?? 'SENT'}`,
      amount: formatCurrency(invoice.totalAmount),
      date: invoiceDate?.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) ?? '—',
      time: invoiceDate?.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
      }) ?? '',
      badge: initials,
    }
  })

  const totalCount = view === 'MY' ? invoices.length : familyInvoices.length

  return (
    <Box sx={{ backgroundColor: 'background.paper', borderRadius: '24px', p: 2, border: '1px solid var(--mui-palette-divider)', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
          Documents &amp; Invoices
        </Typography>
        <Typography variant="caption" sx={(theme) => ({ color: theme.palette.primary.main, fontWeight: 800 })}>
          {totalCount} total
        </Typography>
      </Box>

      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={view}
        onChange={(_, value: InvoiceView | null) => void selectView(value)}
        sx={{ mb: 1.5 }}
      >
        <ToggleButton value="MY">My</ToggleButton>
        <ToggleButton value="FAMILY">Family</ToggleButton>
      </ToggleButtonGroup>

      {familyError && <Alert severity="error" sx={{ mb: 1.25 }}>{familyError}</Alert>}

      {loadingFamily && (
        <Typography sx={{ mb: 1, color: 'text.secondary' }}>
          Loading family bills…
        </Typography>
      )}

      {!loadingFamily && rows.length > 0 && (
        <Stack spacing={1.2}>
          {rows.map((entry) => (
            <RecentActivityItem
              key={`${entry.businessId ?? 'business'}-${entry.id}`}
              title={entry.businessName}
              subtitle={entry.subtitle}
              amount={entry.amount}
              badge={entry.badge}
              date={entry.date}
              time={entry.time}
              accent="linear-gradient(135deg, #065f46 0%, #0d9488 100%)"
            />
          ))}
        </Stack>
      )}

      {!loadingFamily && rows.length === 0 && (view === 'MY' || familyLoaded) && (
        <EmptyState
          title={view === 'MY' ? 'No bills' : 'No family bills'}
          description={view === 'MY'
            ? 'Your recent invoices will appear here.'
            : 'Accepted family members’ invoices will appear here.'}
        />
      )}
    </Box>
  )
}