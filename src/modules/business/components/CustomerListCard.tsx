import { useEffect, useState } from 'react'
import { alpha, Alert, Avatar, Box, Button, ButtonBase, Card, CardContent, Chip, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material'
import { ChevronRight, Plus, Search, Star, UserRound, UsersRound, X } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import { fetchBusinessLoyaltyBalances, type DashboardData } from '../../../services/api'

export type CustomerListCardProps = {
  customers: DashboardData['customers']
  businessId: number
  onOpenCustomer: (customerId: number) => void
  onAddCustomer: () => void
}

function customerName(customer: DashboardData['customers'][number]) {
  return customer.fullName?.trim()
    || [customer.firstName, customer.lastName].filter(Boolean).join(' ')
    || `Customer ${customer.id}`
}

function customerInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export function CustomerListCard({ customers, businessId, onOpenCustomer, onAddCustomer }: CustomerListCardProps) {
  const [balances, setBalances] = useState<Record<number, number>>({})
  const [balanceError, setBalanceError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let isCurrent = true
    fetchBusinessLoyaltyBalances(businessId).then((records) => {
      if (isCurrent) setBalances(Object.fromEntries(records.map((record) => [record.customerId, record.balance])))
    }).catch((error: unknown) => {
      if (isCurrent) setBalanceError(error instanceof Error ? error.message : 'Could not load customer loyalty balances.')
    })
    return () => { isCurrent = false }
  }, [businessId])

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredCustomers = customers.filter((customer) => {
    const searchableText = [
      customerName(customer),
      customer.email,
      customer.phoneNumber,
      customer.profileId,
      String(customer.id),
    ].filter(Boolean).join(' ').toLocaleLowerCase()
    return !normalizedQuery || searchableText.includes(normalizedQuery)
  })
  const totalLoyaltyPoints = customers.reduce((total, customer) => total + Number(balances[customer.id] ?? 0), 0)

  return (
    <Stack spacing={1.4}>
      <Card variant="outlined" sx={(theme) => ({ borderRadius: 3, borderColor: alpha(theme.palette.text.primary, 0.08), boxShadow: '0 8px 22px rgba(19, 48, 43, 0.06)' })}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
              <Box>
                <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 1.4, bgcolor: 'primary.main', color: '#fff' }}>
                    <UsersRound size={17} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.15 }}>Customers</Typography>
                    <Typography variant="caption" color="text.secondary">Manage customer profiles and loyalty</Typography>
                  </Box>
                </Stack>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<Plus size={15} />}
                onClick={onAddCustomer}
                sx={{ alignSelf: { xs: 'stretch', sm: 'center' }, borderRadius: 1.8, fontWeight: 800, textTransform: 'none', boxShadow: 'none' }}
              >
                Add customer
              </Button>
            </Stack>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.8 }}>
              <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.1, borderRadius: 1.8, bgcolor: 'action.hover', borderColor: 'transparent' }}>
                <Box sx={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 1.2, bgcolor: 'background.paper', color: 'primary.main' }}><UserRound size={15} /></Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Total customers</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>{customers.length.toLocaleString('en-IN')}</Typography>
                </Box>
              </Paper>
              <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.1, borderRadius: 1.8, bgcolor: 'action.hover', borderColor: 'transparent' }}>
                <Box sx={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 1.2, bgcolor: 'background.paper', color: 'warning.main' }}><Star size={15} /></Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Loyalty points</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>{totalLoyaltyPoints.toLocaleString('en-IN')}</Typography>
                </Box>
              </Paper>
            </Box>

            <TextField
              size="small"
              fullWidth
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email or mobile"
              slotProps={{
                htmlInput: { 'aria-label': 'Search customers by name, email, or mobile number' },
                input: {
                  startAdornment: <InputAdornment position="start"><Search size={17} color="var(--mui-palette-text-secondary)" /></InputAdornment>,
                  endAdornment: query && (
                    <InputAdornment position="end">
                      <IconButton aria-label="Clear customer search" size="small" onClick={() => setQuery('')} edge="end"><X size={15} /></IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.8, bgcolor: 'background.paper' } }}
            />

            {balanceError && <Alert severity="warning" sx={{ borderRadius: 1.8 }}>{balanceError}</Alert>}

            {filteredCustomers.length > 0 ? (
              <Stack spacing={0.75}>
                {filteredCustomers.map((customer) => {
                  const name = customerName(customer)
                  const points = Number(balances[customer.id] ?? 0)
                  return (
                    <ButtonBase
                      key={customer.id}
                      type="button"
                      onClick={() => onOpenCustomer(customer.id)}
                      aria-label={`View ${name}'s customer profile`}
                      sx={{
                        width: '100%',
                        p: 1.1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        textAlign: 'left',
                        transition: 'border-color 150ms ease, background-color 150ms ease, transform 150ms ease',
                        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                        '&:active': { transform: 'scale(0.995)' },
                        '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ width: '100%', alignItems: 'center', minWidth: 0 }}>
                        <Avatar sx={{ width: 40, height: 40, flexShrink: 0, bgcolor: alpha('#087b65', 0.12), color: 'primary.main', fontSize: 13, fontWeight: 850 }}>
                          {customerInitials(name) || <UserRound size={17} />}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography noWrap sx={{ color: 'text.primary', fontSize: 13, fontWeight: 800 }}>{name}</Typography>
                          <Typography noWrap variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.15 }}>
                            {customer.email ?? customer.phoneNumber ?? 'No contact details'}
                          </Typography>
                          {customer.email && customer.phoneNumber && (
                            <Typography noWrap variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10 }}>
                              {customer.phoneNumber}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          size="small"
                          icon={<Star size={12} />}
                          label={`${points.toLocaleString('en-IN')} pts`}
                          sx={{ flexShrink: 0, height: 25, fontSize: 10, fontWeight: 800, bgcolor: alpha('#b7791f', 0.1), color: 'warning.dark', '& .MuiChip-icon': { color: 'warning.main' } }}
                        />
                        <ChevronRight size={17} color="var(--mui-palette-text-secondary)" />
                      </Stack>
                    </ButtonBase>
                  )
                })}
              </Stack>
            ) : customers.length > 0 ? (
              <Box sx={{ py: 2.2, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 750 }}>No customers match “{query.trim()}”</Typography>
                <Button size="small" onClick={() => setQuery('')} sx={{ mt: 0.4, textTransform: 'none', fontWeight: 750 }}>Clear search</Button>
              </Box>
            ) : (
              <EmptyState title="No customers yet" description="Add your first customer to start tracking invoices and loyalty." />
            )}

            {filteredCustomers.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                Showing {filteredCustomers.length} of {customers.length} customers
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
