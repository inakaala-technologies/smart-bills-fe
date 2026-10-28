import { useMemo, useState } from 'react'
import { Avatar, Box, Card, CardContent, InputAdornment, List, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material'
import type { LucideIcon } from 'lucide-react'
import { BadgeCheck, Building2, CalendarClock, CreditCard, FileText, Search, UserRound } from 'lucide-react'
import type { DashboardData } from '../../../services/api'
import type { DashboardTab } from '../../types'

type GlobalSearchWorkspaceProps = {
  data: DashboardData
  appointmentsEnabled: boolean
  membershipsEnabled: boolean
  onOpenCustomer: (customerId: number) => void
  onChangeTab: (tab: DashboardTab) => void
}

type SearchResult = {
  key: string
  category: string
  title: string
  detail: string
  icon: LucideIcon
  onSelect: () => void
}

function customerName(customer?: DashboardData['customers'][number]) {
  return customer?.fullName
    ?? [customer?.firstName, customer?.lastName].filter(Boolean).join(' ')
    ?? 'Customer'
}

function formatAmount(amount?: number) {
  return `₹${Number(amount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function GlobalSearchWorkspace({ data, appointmentsEnabled, membershipsEnabled, onOpenCustomer, onChangeTab }: GlobalSearchWorkspaceProps) {
  const [query, setQuery] = useState('')
  const results = useMemo<SearchResult[]>(() => {
    const entries: SearchResult[] = [
      ...data.customers.map((customer) => ({
        key: `customer-${customer.id}`,
        category: 'Customer',
        title: customerName(customer),
        detail: [customer.email, customer.phoneNumber].filter(Boolean).join(' · ') || 'Customer profile',
        icon: UserRound,
        onSelect: () => onOpenCustomer(customer.id),
      })),
      ...data.invoices.map((invoice) => {
        const customer = data.customers.find((item) => item.id === invoice.customerId)
        return {
          key: `invoice-${invoice.id}`,
          category: 'Invoice',
          title: invoice.invoiceNumber ?? `Invoice ${invoice.id}`,
          detail: `${customerName(customer)} · ${invoice.status ?? 'Invoice'} · ${formatAmount(invoice.totalAmount)}`,
          icon: FileText,
          onSelect: () => onChangeTab('invoices'),
        }
      }),
      ...data.payments.map((payment) => {
        const customer = data.customers.find((item) => item.id === payment.customerId)
        return {
          key: `payment-${payment.id}`,
          category: 'Payment',
          title: payment.referenceNumber ?? `Payment ${payment.id}`,
          detail: `${customerName(customer)} · ${payment.status ?? payment.paymentMethod ?? 'Payment'} · ${formatAmount(payment.amount)}`,
          icon: CreditCard,
          onSelect: () => onChangeTab('invoices'),
        }
      }),
      ...data.businesses.map((business) => ({
        key: `business-${business.id}`,
        category: 'Business',
        title: business.businessName ?? business.name ?? `Business ${business.id}`,
        detail: [business.businessType, business.city, business.region].filter(Boolean).join(' · ') || 'Business profile',
        icon: Building2,
        onSelect: () => onChangeTab('businesses'),
      })),
      ...(appointmentsEnabled ? data.appointments.map((appointment) => {
        const customer = data.customers.find((item) => item.id === appointment.customerId)
        return {
          key: `appointment-${appointment.id}`,
          category: 'Appointment',
          title: appointment.serviceName ?? `Appointment ${appointment.id}`,
          detail: `${customerName(customer)} · ${appointment.status ?? 'Booked'} · ${appointment.scheduledAt ?? 'Date not set'}`,
          icon: CalendarClock,
          onSelect: () => onChangeTab('appointments'),
        }
      }) : []),
      ...(membershipsEnabled ? data.memberships.map((membership) => {
        const customer = data.customers.find((item) => item.id === membership.customerId)
        return {
          key: `membership-${membership.id}`,
          category: 'Membership',
          title: membership.planName ?? `Membership ${membership.id}`,
          detail: `${customerName(customer)} · ${membership.status ?? 'Membership'}${membership.endDate ? ` · ends ${membership.endDate}` : ''}`,
          icon: BadgeCheck,
          onSelect: () => onChangeTab('memberships'),
        }
      }) : []),
    ]
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return []
    return entries.filter((entry) => `${entry.title} ${entry.detail} ${entry.category}`.toLocaleLowerCase().includes(normalizedQuery))
  }, [appointmentsEnabled, data, membershipsEnabled, onChangeTab, onOpenCustomer, query])

  return (
    <Stack spacing={1.4}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 850 }}>Search</Typography>
        <Typography variant="body2" color="text.secondary">Find customers, invoices, payments, and workspace records.</Typography>
      </Box>
      <TextField
        autoFocus
        fullWidth
        size="small"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search anything..."
        slotProps={{
          htmlInput: { 'aria-label': 'Search customers, invoices, payments, and workspace records' },
          input: { startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment> },
        }}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, backgroundColor: 'background.paper' } }}
      />
      <Card variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
        {query.trim() ? (
          results.length ? (
            <>
              <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {results.length} {results.length === 1 ? 'result' : 'results'}
                </Typography>
              </CardContent>
              <List disablePadding>
                {results.map((result) => {
                  const Icon = result.icon
                  return (
                    <ListItemButton
                      key={result.key}
                      onClick={result.onSelect}
                      divider
                      sx={{ gap: 1.2, py: 1.1, '&:last-child': { borderBottom: 0 } }}
                    >
                      <Avatar sx={{ width: 34, height: 34, bgcolor: 'action.hover', color: 'primary.main' }}>
                        <Icon size={17} />
                      </Avatar>
                      <ListItemText
                        primary={result.title}
                        secondary={result.detail}
                        sx={{
                          '& .MuiListItemText-primary': { fontSize: 14, fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                          '& .MuiListItemText-secondary': { fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{result.category}</Typography>
                    </ListItemButton>
                  )
                })}
              </List>
            </>
          ) : (
            <CardContent sx={{ py: 3, textAlign: 'center' }}>
              <Search size={22} color="var(--mui-palette-text-secondary)" />
              <Typography variant="body2" sx={{ mt: 0.8, fontWeight: 700 }}>No matching records</Typography>
              <Typography variant="caption" color="text.secondary">Try another name, number, email, or status.</Typography>
            </CardContent>
          )
        ) : (
          <CardContent sx={{ py: 3, textAlign: 'center' }}>
            <Box sx={{ display: 'grid', placeItems: 'center', color: 'primary.main' }}><Search size={22} /></Box>
            <Typography variant="body2" sx={{ mt: 0.8, fontWeight: 700 }}>Search your workspace</Typography>
            <Typography variant="caption" color="text.secondary">Search by customer name, phone, invoice number, payment reference, or record status.</Typography>
          </CardContent>
        )}
      </Card>
    </Stack>
  )
}
