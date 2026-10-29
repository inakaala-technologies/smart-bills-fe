import { useState } from 'react'
import { Alert, Avatar, Box, Button, Chip, Divider, InputAdornment, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { Award, BellRing, CalendarDays, Clock3, CreditCard, FileText, History, Search, ShieldCheck } from 'lucide-react'
import { sendMembershipReminder, type DashboardData } from '../../../services/api'
import { BusinessOffersWorkspace } from './BusinessOffersWorkspace'

type CustomerRetentionWorkspaceProps = {
  businessId: number
  businessName: string
  businessLocation: string // CHANGED: new prop
  hasMappedLocation: boolean
  data: DashboardData
  onUpdated: () => void
}

type HistoryItem = { id: string; date: string; kind: string; title: string; detail: string }

const historyIcons = {
  Invoice: FileText,
  Payment: CreditCard,
  Appointment: CalendarDays,
  Membership: ShieldCheck,
}

function labelFor(customer: DashboardData['customers'][number]) {
  return customer.fullName ?? [customer.firstName, customer.lastName].filter(Boolean).join(' ') ?? `Customer ${customer.id}`
}

function money(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function CustomerRetentionWorkspace({ businessId, businessName, businessLocation, hasMappedLocation, data, onUpdated }: CustomerRetentionWorkspaceProps) { // CHANGED: added businessLocation
  const [now] = useState(() => Date.now())
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [query, setQuery] = useState('')
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const businessCustomers = data.customers.filter((customer) => !customer.businessId || customer.businessId === businessId)
  const filteredCustomers = businessCustomers.filter((customer) => `${labelFor(customer)} ${customer.email ?? ''} ${customer.phoneNumber ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  const selectedId = customerId || filteredCustomers[0]?.id || businessCustomers[0]?.id || ''
  const selectedCustomer = businessCustomers.find((customer) => customer.id === selectedId)
  const customerInvoices = data.invoices.filter((invoice) => invoice.businessId === businessId && invoice.customerId === selectedId)
  const customerPayments = data.payments.filter((payment) => payment.businessId === businessId && payment.customerId === selectedId)
  const customerAppointments = data.appointments.filter((appointment) => appointment.businessId === businessId && appointment.customerId === selectedId)
  const customerMemberships = data.memberships.filter((membership) => membership.businessId === businessId && membership.customerId === selectedId)
  const verifiedSpend = customerPayments.filter((payment) => payment.status === 'VERIFIED').reduce((total, payment) => total + Number(payment.amount ?? 0), 0)
  const loyaltyPoints = Math.floor(verifiedSpend / 100)
  const latestActivity = [
    ...customerInvoices.map((invoice) => invoice.issueDate),
    ...customerPayments.map((payment) => payment.paymentDate),
    ...customerAppointments.map((appointment) => appointment.scheduledAt),
    ...customerMemberships.map((membership) => membership.updatedAt ?? membership.startDate),
  ].filter((value): value is string => Boolean(value)).map((value) => new Date(value).getTime()).filter(Number.isFinite).sort((first, second) => second - first)[0]
  const isMember = customerMemberships.some((membership) => membership.status === 'ACTIVE')
  const customerSegment = isMember ? 'MEMBERS' : loyaltyPoints >= 100 ? 'LOYAL' : latestActivity && now - latestActivity > 90 * 86400000 ? 'AT_RISK' : 'NEW'
  const history: HistoryItem[] = [
    ...customerInvoices.map((invoice) => ({ id: `invoice-${invoice.id}`, date: invoice.issueDate ?? '', kind: 'Invoice', title: invoice.invoiceNumber ?? `Invoice ${invoice.id}`, detail: `${invoice.status ?? 'Issued'} · ${money(Number(invoice.totalAmount ?? 0))}` })),
    ...customerPayments.map((payment) => ({ id: `payment-${payment.id}`, date: payment.paymentDate ?? '', kind: 'Payment', title: payment.referenceNumber ?? `Payment ${payment.id}`, detail: `${payment.status ?? 'Pending'} · ${money(Number(payment.amount ?? 0))}` })),
    ...customerAppointments.map((appointment) => ({ id: `appointment-${appointment.id}`, date: appointment.scheduledAt ?? '', kind: 'Appointment', title: appointment.serviceName ?? 'Appointment', detail: `${appointment.status ?? 'Booked'} · ${appointment.durationMinutes ?? 0} min` })),
    ...customerMemberships.map((membership) => ({ id: `membership-${membership.id}`, date: membership.startDate ?? '', kind: 'Membership', title: membership.planName ?? 'Membership', detail: `${membership.status ?? 'Pending'} · ends ${membership.endDate ?? 'not set'}` })),
  ].filter((item) => item.date).sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
  const renewals = customerMemberships.filter((membership) => membership.status === 'ACTIVE' && membership.endDate && new Date(`${membership.endDate}T23:59:59`).getTime() <= now + 30 * 86400000)
  const customerName = selectedCustomer ? labelFor(selectedCustomer) : ''
  const customerInitials = customerName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  const remind = async (membershipId: number) => {
    setSendingId(membershipId)
    setMessage('')
    const result = await sendMembershipReminder(membershipId)
    setMessage(result.message ?? (result.ok ? 'Renewal reminder sent.' : 'Could not send reminder.'))
    setSendingId(null)
    if (result.ok) onUpdated()
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 850 }}>Customer retention</Typography>
          <Typography variant="body2" color="text.secondary">Loyalty, customer history, renewal follow-up, and segmented offers.</Typography>
        </Box>
        <Chip icon={<History size={15} />} label={`${businessCustomers.length} ${businessCustomers.length === 1 ? 'customer' : 'customers'}`} size="small" variant="outlined" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontWeight: 700 }} />
      </Stack>

      <Paper variant="outlined" sx={{ p: { xs: 1.4, sm: 2 }, borderRadius: 2 }}>
        <Stack spacing={1.6}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              label="Find a customer"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              fullWidth
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={17} /></InputAdornment> } }}
            />
            <TextField size="small" select label="Customer" value={selectedId} onChange={(event) => setCustomerId(Number(event.target.value))} sx={{ minWidth: { sm: 240 } }}>
              {filteredCustomers.map((customer) => <MenuItem key={customer.id} value={customer.id}>{labelFor(customer)}</MenuItem>)}
            </TextField>
          </Stack>
          {selectedCustomer ? (
            <>
              <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', minWidth: 0 }}>
                <Avatar sx={{ width: 44, height: 44, bgcolor: 'primary.light', color: 'primary.dark', fontSize: 15, fontWeight: 800 }}>{customerInitials || '?'}</Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>{customerName}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{selectedCustomer.email ?? selectedCustomer.phoneNumber ?? 'No contact details'}</Typography>
                </Box>
                <Chip size="small" label={customerSegment.replace('_', ' ')} color={customerSegment === 'AT_RISK' ? 'warning' : customerSegment === 'LOYAL' ? 'success' : 'default'} sx={{ fontWeight: 750, flexShrink: 0 }} />
              </Stack>
              <Divider />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }, gap: { xs: 1.2, sm: 2 } }}>
                <Box>
                  <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', color: 'primary.main' }}><Award size={17} /><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>LOYALTY POINTS</Typography></Stack>
                  <Typography variant="h5" sx={{ mt: 0.35, fontWeight: 850 }}>{loyaltyPoints.toLocaleString('en-IN')}</Typography>
                  <Typography variant="caption" color="text.secondary">100 points = ₹100 reward</Typography>
                  <LinearProgress variant="determinate" value={loyaltyPoints % 100} sx={{ mt: 0.8, height: 5, borderRadius: 3 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>VERIFIED SPEND</Typography>
                  <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 850 }}>{money(verifiedSpend)}</Typography>
                  <Typography variant="caption" color="text.secondary">Payments received</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>HISTORY</Typography>
                  <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 850 }}>{history.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Recorded activities</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>LAST ACTIVITY</Typography>
                  <Typography variant="body1" sx={{ mt: 0.65, fontWeight: 800 }}>{latestActivity ? new Date(latestActivity).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No activity'}</Typography>
                  <Typography variant="caption" color="text.secondary">Across this business</Typography>
                </Box>
              </Box>
              {renewals.length > 0 && (
                <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'warning.light', color: 'warning.dark' }}>
                  <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', mb: 0.6 }}><BellRing size={16} /><Typography sx={{ fontWeight: 800 }}>Renewal follow-up</Typography></Stack>
                  <Stack spacing={0.3}>
                  {renewals.map((membership) => (
                    <Stack key={membership.id} direction={{ xs: 'column', sm: 'row' }} spacing={0.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', borderTop: '1px solid', borderColor: 'warning.main', pt: 0.7 }}>
                      <Box><Typography variant="body2" sx={{ fontWeight: 750 }}>{membership.planName}</Typography><Typography variant="caption">Expires {membership.endDate}</Typography></Box>
                      <Button size="small" color="warning" startIcon={<BellRing size={15} />} disabled={sendingId === membership.id} onClick={() => void remind(membership.id)} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, textTransform: 'none' }}>{sendingId === membership.id ? 'Sending…' : 'Send reminder'}</Button>
                    </Stack>
                  ))}
                  </Stack>
                </Box>
              )}
              {message && <Alert severity={message.includes('sent') ? 'success' : 'info'}>{message}</Alert>}
              <Stack spacing={0.6}>
                <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
                  <Typography sx={{ fontWeight: 800 }}>Recent activity</Typography>
                  <Typography variant="caption" color="text.secondary">Newest first · {history.length} total</Typography>
                </Stack>
                {history.length ? history.slice(0, 20).map((item) => (
                  <Stack key={item.id} direction="row" spacing={1} sx={{ alignItems: 'center', borderTop: '1px solid', borderColor: 'divider', pt: 0.8 }}>
                    {(() => { const Icon = historyIcons[item.kind as keyof typeof historyIcons] ?? Clock3; return <Box sx={{ width: 30, height: 30, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1.2, bgcolor: 'action.hover', color: 'primary.main' }}><Icon size={15} /></Box> })()}
                    <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{item.title}</Typography><Typography variant="caption" color="text.secondary">{item.kind} · {item.detail}</Typography></Box>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, textAlign: 'right' }}>{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Typography>
                  </Stack>
                )) : <Typography variant="body2" color="text.secondary">No invoices, payments, bookings, or memberships for this customer yet.</Typography>}
              </Stack>
            </>
          ) : <Typography variant="body2" color="text.secondary">No customers match this business.</Typography>}
        </Stack>
      </Paper>
      <Divider />
      <BusinessOffersWorkspace businessId={businessId} businessName={businessName} businessLocation={businessLocation} hasMappedLocation={hasMappedLocation} /> {/* CHANGED: pass businessLocation */}
    </Stack>
  )
}