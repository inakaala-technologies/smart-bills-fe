import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, MenuItem, Skeleton, Stack, TextField, Typography } from '@mui/material'
import { CalendarCheck2, CalendarDays, CalendarPlus, Clock3, X } from 'lucide-react'
import { EmptyState } from '../../../components/EmptyState'
import { createAppointment, fetchAppointmentAvailability, fetchAppointmentServices, updateAppointmentStatus, type AppointmentAvailability, type AppointmentServiceSummary, type DashboardData } from '../../../services/api'
import { useAppDispatch } from '../../../store/hooks'
import { fetchCustomerDashboard } from '../../../store/customerDashboardSlice'
import { fetchLoyaltyBalance, fetchLoyaltySettings, type LoyaltyProgramSettings } from '../../../services/api'

type CustomerAppointmentsPanelProps = {
  appointments: DashboardData['appointments']
  businesses: DashboardData['businesses']
  customerId: number | null
}

function getDefaultAppointmentDateTime() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
  date.setSeconds(0, 0)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function CustomerAppointmentsPanel({ appointments, businesses, customerId }: CustomerAppointmentsPanelProps) {
  const dispatch = useAppDispatch()
  const [now] = useState(Date.now)
  const [businessId, setBusinessId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [servicesState, setServicesState] = useState<{ businessId: number; services: AppointmentServiceSummary[] }>({ businessId: 0, services: [] })
  const [appointmentDate, setAppointmentDate] = useState(() => getDefaultAppointmentDateTime().slice(0, 10))
  const [selectedSlot, setSelectedSlot] = useState('')
  const [staffUserId, setStaffUserId] = useState('')
  const [availabilityState, setAvailabilityState] = useState<{
    businessId: number
    serviceId: number
    date: string
    staffUserId: number | undefined
    result: AppointmentAvailability
    error?: boolean
  } | null>(null)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [messageSeverity, setMessageSeverity] = useState<'success' | 'error'>('success')
  const [isSaving, setIsSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState('0')
  const [loyaltyInfo, setLoyaltyInfo] = useState<{ customerId: number; businessId: number; balance: number; settings: LoyaltyProgramSettings } | null>(null)
  const [loyaltyError, setLoyaltyError] = useState('')

  const appointmentBusinesses = businesses.filter((business) => business.appointmentsEnabled)
  const selectedBusinessId = Number(businessId) || appointmentBusinesses[0]?.id || 0
  const services = servicesState.businessId === selectedBusinessId ? servicesState.services : []
  const selectedService = services.find((service) => service.id === Number(serviceId))
  const currentLoyaltyInfo = loyaltyInfo?.customerId === customerId && loyaltyInfo.businessId === selectedBusinessId ? loyaltyInfo : null
  const requestedPoints = Math.max(0, Math.floor(Number(loyaltyPointsToRedeem) || 0))
  const loyaltyDiscount = currentLoyaltyInfo?.settings.configured && currentLoyaltyInfo.settings.pointsPerCurrencyUnit && selectedService
    ? Math.min(
      requestedPoints / currentLoyaltyInfo.settings.pointsPerCurrencyUnit,
      selectedService.price * Number(currentLoyaltyInfo.settings.maxRedemptionPercent) / 100,
    )
    : 0
  const availabilityRequestMatches = availabilityState?.businessId === selectedBusinessId
    && availabilityState.serviceId === selectedService?.id
    && availabilityState.date === appointmentDate
    && availabilityState.staffUserId === (Number(staffUserId) || undefined)
  const availability = availabilityRequestMatches ? availabilityState.result : null
  const availabilityError = Boolean(availabilityRequestMatches && availabilityState.error)
  const checkingAvailability = Boolean(selectedService && !availability && !availabilityError)
  const sortedAppointments = [...appointments].sort((first, second) => (
    new Date(second.scheduledAt ?? '').getTime() - new Date(first.scheduledAt ?? '').getTime()
  ))

  useEffect(() => {
    if (!selectedBusinessId) return

    let isActive = true
    fetchAppointmentServices(selectedBusinessId).then((records) => {
      if (!isActive) return
      const available = records.filter((service) => service.enabled)
      setServicesState({ businessId: selectedBusinessId, services: available })
      setServiceId(available[0] ? String(available[0].id) : '')
    })

    return () => {
      isActive = false
    }
  }, [selectedBusinessId])

  useEffect(() => {
    if (!customerId || !selectedBusinessId) {
      setLoyaltyInfo(null)
      setLoyaltyError('')
      setLoyaltyPointsToRedeem('0')
      return
    }
    let isCurrent = true
    setLoyaltyError('')
    setLoyaltyPointsToRedeem('0')
    Promise.all([
      fetchLoyaltyBalance(selectedBusinessId, customerId),
      fetchLoyaltySettings(selectedBusinessId),
    ]).then(([balance, settings]) => {
      if (isCurrent) setLoyaltyInfo({ customerId, businessId: selectedBusinessId, balance: balance.balance, settings })
    }).catch((error) => {
      if (isCurrent) setLoyaltyError(error instanceof Error ? error.message : 'Could not load loyalty points.')
    })
    return () => { isCurrent = false }
  }, [customerId, selectedBusinessId])

  useEffect(() => {
    if (!selectedBusinessId || !selectedService) return
    let isCurrent = true
    fetchAppointmentAvailability(selectedBusinessId, selectedService.id, appointmentDate, Number(staffUserId) || undefined)
      .then((result) => {
        if (!isCurrent) return
        setAvailabilityState({ businessId: selectedBusinessId, serviceId: selectedService.id, date: appointmentDate, staffUserId: Number(staffUserId) || undefined, result })
        setSelectedSlot((current) => result.availableSlots.includes(current) ? current : result.availableSlots[0] ?? '')
      })
      .catch(() => {
        if (isCurrent) setAvailabilityState({ businessId: selectedBusinessId, serviceId: selectedService.id, date: appointmentDate, staffUserId: Number(staffUserId) || undefined, result: { date: appointmentDate, availableSlots: [], staff: [] }, error: true })
      })
    return () => { isCurrent = false }
  }, [appointmentDate, selectedBusinessId, selectedService, staffUserId])

  const handleBookAppointment = async () => {
    if (!selectedBusinessId || !selectedService || !selectedSlot || new Date(selectedSlot).getTime() <= now) {
      setMessage('Choose a business, service, and available future time.')
      setMessageSeverity('error')
      return
    }

    setIsSaving(true)
    setMessage('')
    const result = await createAppointment({
      businessId: selectedBusinessId,
      appointmentServiceId: selectedService.id,
      scheduledAt: selectedSlot,
      staffUserId: Number(staffUserId) || undefined,
      notes: notes.trim() || undefined,
      loyaltyPointsToRedeem: requestedPoints,
    })
    setIsSaving(false)

    if (!result.ok) {
      setMessage(result.message ?? 'Could not book this appointment.')
      setMessageSeverity('error')
      return
    }

    setNotes('')
    setLoyaltyPointsToRedeem('0')
    setMessage('Appointment request sent.')
    setMessageSeverity('success')
    dispatch(fetchCustomerDashboard())
  }

  const handleCancelAppointment = async (appointmentId: number) => {
    setUpdatingId(appointmentId)
    setMessage('')
    const result = await updateAppointmentStatus(appointmentId, 'CANCELLED')
    setUpdatingId(null)

    if (!result.ok) {
      setMessage(result.message ?? 'Could not cancel this appointment.')
      setMessageSeverity('error')
      return
    }

    setMessage('Appointment cancelled.')
    setMessageSeverity('success')
    dispatch(fetchCustomerDashboard())
  }

  const statusColor = (status?: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
      case 'COMPLETED':
        return 'success'
      case 'BOOKED':
        return 'warning'
      case 'NO_SHOW':
        return 'error'
      default:
        return 'default'
    }
  }

  return (
    <Box sx={{ p: 2, borderRadius: '24px', backgroundColor: 'background.paper' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.8 }}>
        <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Box sx={{ width: 40, height: 40, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 2, color: 'primary.dark', backgroundColor: 'primary.light' }}>
            <CalendarCheck2 size={20} strokeWidth={2.2} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>Appointments</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Bookings and requests</Typography>
          </Box>
        </Stack>
        <Chip label={`${appointments.length} ${appointments.length === 1 ? 'booking' : 'bookings'}`} size="small" sx={{ flexShrink: 0, bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 700 }} />
      </Stack>

      <Box component="section" sx={{ pb: 2.2, borderBottom: '1px solid var(--mui-palette-divider)' }}>
        <Stack spacing={1.25}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 800, fontSize: 15 }}>Book a service</Typography>
              <Typography variant="caption" color="text.secondary">Choose a service and an open appointment time.</Typography>
            </Box>
            {availability?.availableSlots.length ? <Chip size="small" color="success" variant="outlined" label={`${availability.availableSlots.length} times`} /> : null}
          </Stack>
          {appointmentBusinesses.length === 0 && <Alert severity="info" sx={{ borderRadius: 2 }}>None of your businesses are currently accepting appointment requests.</Alert>}
          <TextField select label="Business" value={selectedBusinessId ? String(selectedBusinessId) : ''} onChange={(event) => { setBusinessId(event.target.value); setServiceId('') }} disabled={appointmentBusinesses.length === 0} size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}>
            {appointmentBusinesses.map((business) => <MenuItem key={business.id} value={String(business.id)}>{business.businessName ?? business.name ?? `Business ${business.id}`}</MenuItem>)}
          </TextField>
          <TextField select label="Service" value={serviceId} onChange={(event) => setServiceId(event.target.value)} disabled={!services.length} size="small" required fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}>
            {services.map((service) => <MenuItem key={service.id} value={String(service.id)}>{service.name} · ₹{service.price.toLocaleString('en-IN')} · {service.durationMinutes} min</MenuItem>)}
          </TextField>
          {selectedService && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, p: 1.25, borderRadius: 2, bgcolor: 'action.hover', border: '1px solid var(--mui-palette-divider)' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: 'text.primary', fontWeight: 800, fontSize: 13 }}>{selectedService.name}</Typography>
                {selectedService.description && <Typography variant="caption" sx={{ display: 'block', mt: 0.2, color: 'text.secondary', lineHeight: 1.35 }}>{selectedService.description}</Typography>}
                <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mt: 0.7, color: 'text.secondary' }}>
                  <Clock3 size={13} />
                  <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 700 }}>{selectedService.durationMinutes} min</Typography>
                </Stack>
              </Box>
              <Typography sx={{ color: 'primary.main', fontWeight: 900, fontSize: 17, whiteSpace: 'nowrap' }}>₹{selectedService.price.toLocaleString('en-IN')}</Typography>
            </Box>
          )}
          {selectedService && currentLoyaltyInfo?.settings.configured && (
            <Stack spacing={0.8}>
              <Alert severity="info">
                You have {currentLoyaltyInfo.balance.toLocaleString('en-IN')} points with this business.
                {' '}Rate: {currentLoyaltyInfo.settings.pointsPerCurrencyUnit} points = ₹1; maximum discount {currentLoyaltyInfo.settings.maxRedemptionPercent}%.
              </Alert>
              <TextField
                label="Loyalty points to use"
                type="number"
                value={loyaltyPointsToRedeem}
                onChange={(event) => setLoyaltyPointsToRedeem(event.target.value)}
                slotProps={{ htmlInput: { min: 0, max: currentLoyaltyInfo.balance, step: 1 } }}
                helperText={`Available: ${currentLoyaltyInfo.balance.toLocaleString('en-IN')} points`}
                size="small"
              />
              {loyaltyDiscount > 0 && (
                <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 750 }}>
                  {requestedPoints} points discount: −₹{loyaltyDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Pay ₹{Math.max(0, selectedService.price - loyaltyDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              )}
            </Stack>
          )}
          {loyaltyError && <Alert severity="error">{loyaltyError}</Alert>}
          {selectedBusinessId > 0 && services.length === 0 && appointmentBusinesses.length > 0 && <Alert severity="info" sx={{ borderRadius: 2 }}>This business has not added any bookable services yet.</Alert>}
          <TextField label="Date" type="date" value={appointmentDate} onChange={(event) => { setAppointmentDate(event.target.value); setSelectedSlot('') }} size="small" required fullWidth slotProps={{ inputLabel: { shrink: true } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }} />
          {availability && availability.staff.length > 0 && (
            <TextField select label="Staff or resource" value={staffUserId} onChange={(event) => { setStaffUserId(event.target.value); setSelectedSlot('') }} size="small" fullWidth>
              <MenuItem value="">Any available staff</MenuItem>
              {availability.staff.map((staff) => <MenuItem key={staff.userId} value={String(staff.userId)}>{staff.label}</MenuItem>)}
            </TextField>
          )}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 750 }}>AVAILABLE TIMES</Typography>
            {availability?.availableSlots.length ? (
              <Box sx={{ mt: 0.7, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 0.7 }}>
                {availability.availableSlots.map((slot) => (
                  <Button key={slot} size="small" variant={selectedSlot === slot ? 'contained' : 'outlined'} onClick={() => setSelectedSlot(slot)} sx={{ textTransform: 'none', minWidth: 0, px: 0.8, whiteSpace: 'nowrap' }}>
                    {new Date(slot).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                  </Button>
                ))}
              </Box>
            ) : checkingAvailability ? (
              <Stack spacing={0.7} sx={{ mt: 0.8 }}>
                <Typography variant="caption" color="text.secondary">Checking available times…</Typography>
                <Skeleton variant="rounded" height={36} />
              </Stack>
            ) : availabilityError ? (
              <Alert severity="error" sx={{ mt: 0.7 }}>Could not load times. Try another date or refresh the page.</Alert>
            ) : <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>No available times for this day.</Typography>}
          </Box>
          <TextField label="Note (optional)" value={notes} onChange={(event) => setNotes(event.target.value)} size="small" multiline minRows={2} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }} />
          <Button variant="contained" startIcon={<CalendarPlus size={17} />} onClick={handleBookAppointment} disabled={!selectedService || !selectedSlot || isSaving} fullWidth sx={{ minHeight: 46, borderRadius: 2, textTransform: 'none', fontWeight: 800 }}>
            {isSaving ? 'Sending request…' : 'Request appointment'}
          </Button>
        </Stack>
      </Box>

      {message && <Alert severity={messageSeverity} sx={{ mt: 1.5, borderRadius: 2 }}>{message}</Alert>}
      <Box component="section" sx={{ pt: 2 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
          <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 800, fontSize: 15 }}>Your bookings</Typography>
          {appointments.length > 0 && <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>Most recent first</Typography>}
        </Stack>
        {sortedAppointments.length > 0 ? (
          <Stack spacing={1}>
            {sortedAppointments.map((appointment) => {
              const business = businesses.find((item) => item.id === appointment.businessId)
              const status = appointment.status?.toUpperCase() ?? 'BOOKED'
              const canCancel = ['BOOKED', 'CONFIRMED'].includes(status) && Boolean(appointment.scheduledAt) && new Date(appointment.scheduledAt ?? '').getTime() > now
              return (
                <Box key={appointment.id} sx={{ p: 1.25, border: '1px solid var(--mui-palette-divider)', borderRadius: 1.5, bgcolor: 'background.paper' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ color: 'text.primary', fontSize: 13, fontWeight: 800, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{appointment.serviceName ?? `Appointment ${appointment.id}`}</Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.2, color: 'text.secondary', fontWeight: 600, overflowWrap: 'anywhere' }}>{business?.businessName ?? business?.name ?? 'Business'}</Typography>
                    </Box>
                    <Chip label={status.replace('_', ' ')} color={statusColor(status)} size="small" sx={{ height: 23, fontSize: 10, fontWeight: 800, flexShrink: 0 }} />
                  </Stack>
                  <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mt: 1, color: 'text.secondary' }}>
                    <CalendarDays size={14} />
                    <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 700, lineHeight: 1.35 }}>{appointment.scheduledAt ? new Date(appointment.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Schedule pending'}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 0.65, gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      {[appointment.durationMinutes ? `${appointment.durationMinutes} min` : '', appointment.servicePrice !== undefined ? `₹${(appointment.servicePrice - (appointment.loyaltyDiscountAmount ?? 0)).toLocaleString('en-IN')}` : ''].filter(Boolean).join(' · ')}
                    </Typography>
                    {canCancel && <Button size="small" color="error" startIcon={<X size={13} />} onClick={() => handleCancelAppointment(appointment.id)} disabled={updatingId === appointment.id} sx={{ minWidth: 0, minHeight: 30, px: 0.8, textTransform: 'none', fontSize: 11, fontWeight: 700 }}>{updatingId === appointment.id ? 'Cancelling' : 'Cancel'}</Button>}
                  </Stack>
                  {(appointment.loyaltyPointsRedeemed ?? 0) > 0 && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.35, color: 'success.main', fontWeight: 700 }}>
                      {appointment.loyaltyPointsRedeemed} points redeemed · ₹{Number(appointment.loyaltyDiscountAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} discount
                    </Typography>
                  )}
                  {appointment.notes && <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', overflowWrap: 'anywhere' }}>Note: {appointment.notes}</Typography>}
                  {appointment.businessNote && <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'primary.main', fontWeight: 700, overflowWrap: 'anywhere' }}>Message from business: {appointment.businessNote}</Typography>}
                </Box>
              )
            })}
          </Stack>
        ) : (
          <EmptyState title="No appointments yet" description="Your bookings will appear here." />
        )}
      </Box>
    </Box>
  )
}