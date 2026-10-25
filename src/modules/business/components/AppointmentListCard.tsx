import { useEffect, useState } from 'react'
import { alpha, Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { EmptyState } from '../../../components/EmptyState'
import { fetchAppointmentStaff, updateAppointmentStaff, updateAppointmentStatus, type AppointmentStatus, type AppointmentStaffOption, type DashboardData } from '../../../services/api'

export type AppointmentListCardProps = {
  appointments: DashboardData['appointments']
  customers: DashboardData['customers']
  businessId: number
  selectedAppointmentId?: number | null
  onSelectAppointment?: (appointment: DashboardData['appointments'][number]) => void
  onUpdated: () => void
}

function statusColor(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'CONFIRMED' || status === 'COMPLETED') return 'success'
  if (status === 'BOOKED') return 'warning'
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'error'
  return 'default'
}

export function AppointmentListCard({
  appointments,
  customers,
  businessId,
  selectedAppointmentId,
  onSelectAppointment,
  onUpdated,
}: AppointmentListCardProps) {
  const [message, setMessage] = useState('')
  const [view, setView] = useState<'UPCOMING' | 'ALL' | 'CANCELLED'>('UPCOMING')
  const [selectedDate, setSelectedDate] = useState('')
  const [staff, setStaff] = useState<AppointmentStaffOption[]>([])
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [assigningId, setAssigningId] = useState<number | null>(null)
  const [pendingAction, setPendingAction] = useState<{ appointmentId: number; status: AppointmentStatus; label: string } | null>(null)
  const [businessNote, setBusinessNote] = useState('')
  const [now] = useState(Date.now)

  useEffect(() => {
    let isCurrent = true
    fetchAppointmentStaff(businessId).then((options) => { if (isCurrent) setStaff(options) }).catch(() => undefined)
    return () => { isCurrent = false }
  }, [businessId])

  const visibleAppointments = appointments.filter((appointment) => {
    if (selectedAppointmentId && appointment.id === selectedAppointmentId) return true
    const status = (appointment.status ?? 'BOOKED').toUpperCase()
    if (selectedDate && !appointment.scheduledAt?.startsWith(selectedDate)) return false
    if (view === 'CANCELLED') return status === 'CANCELLED'
    if (view === 'UPCOMING') return ['BOOKED', 'CONFIRMED'].includes(status) && new Date(appointment.scheduledAt ?? '').getTime() >= now
    return true
  }).sort((first, second) => new Date(first.scheduledAt ?? '').getTime() - new Date(second.scheduledAt ?? '').getTime())

  const handleStatusChange = async (appointmentId: number, status: AppointmentStatus, note?: string) => {
    setUpdatingId(appointmentId)
    setMessage('')
    const result = await updateAppointmentStatus(appointmentId, status, note)
    setUpdatingId(null)
    if (!result.ok) {
      setMessage(result.message ?? 'Could not update appointment.')
      return false
    }
    onUpdated()
    return true
  }

  const handleAction = (appointmentId: number, status: AppointmentStatus, label: string) => {
    if (status === 'CONFIRMED' || status === 'CANCELLED') {
      setPendingAction({ appointmentId, status, label })
      setBusinessNote('')
      return
    }
    void handleStatusChange(appointmentId, status)
  }

  const submitPendingAction = async () => {
    if (!pendingAction) return
    const succeeded = await handleStatusChange(pendingAction.appointmentId, pendingAction.status, businessNote.trim())
    if (succeeded) setPendingAction(null)
  }

  const assignStaff = async (appointmentId: number, value: string) => {
    setAssigningId(appointmentId)
    const result = await updateAppointmentStaff(appointmentId, value ? Number(value) : undefined)
    setAssigningId(null)
    if (!result.ok) {
      setMessage(result.message ?? 'Could not update staff assignment. The selected slot may no longer be available.')
      return
    }
    onUpdated()
  }

  return (
    <Card variant="outlined" sx={(theme) => ({ borderRadius: 2, border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}` })}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 0.4, mb: 1.4 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Appointment operations</Typography>
            <Typography variant="caption" color="text.secondary">Review bookings, assign staff, and update customer status.</Typography>
          </Box>
          <Chip size="small" label={`${visibleAppointments.length} shown`} variant="outlined" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontWeight: 700 }} />
        </Stack>
        {message && <Alert severity="error" sx={{ mb: 1.5 }}>{message}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.5, alignItems: { sm: 'center' } }}>
          <ToggleButtonGroup exclusive size="small" value={view} onChange={(_event, value: 'UPCOMING' | 'ALL' | 'CANCELLED' | null) => { if (value) setView(value) }} aria-label="Appointment list filter" sx={{ width: { xs: '100%', sm: 'auto' }, '& .MuiToggleButton-root': { flex: { xs: 1, sm: 'initial' }, px: { xs: 0.7, sm: 1.4 }, whiteSpace: 'nowrap' } }}>
            <ToggleButton value="UPCOMING">Upcoming</ToggleButton>
            <ToggleButton value="ALL">All</ToggleButton>
            <ToggleButton value="CANCELLED">Cancelled</ToggleButton>
          </ToggleButtonGroup>
          <TextField type="date" size="small" label="Day" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: { xs: '100%', sm: 190 } }} />
        </Stack>
        {visibleAppointments.length > 0 ? (
          <Stack spacing={1.2}>
            {visibleAppointments.map((appointment) => {
              const status = (appointment.status ?? 'BOOKED').toUpperCase()
              const customer = customers.find((item) => item.id === appointment.customerId)
              const actions: Array<{ label: string; status: AppointmentStatus }> = status === 'BOOKED'
                ? [{ label: 'Confirm', status: 'CONFIRMED' }, { label: 'Cancel', status: 'CANCELLED' }]
                : status === 'CONFIRMED'
                  ? [{ label: 'Complete', status: 'COMPLETED' }, { label: 'No-show', status: 'NO_SHOW' }, { label: 'Cancel', status: 'CANCELLED' }]
                  : []

              const isSelected = selectedAppointmentId === appointment.id
              return (
              <Box
                key={appointment.id}
                onClick={() => onSelectAppointment?.(appointment)}
                sx={(theme) => ({
                  display: 'grid',
                  gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto' },
                  alignItems: 'start',
                  gap: 1.2,
                  p: 1.2,
                  borderRadius: 1.5,
                  border: isSelected ? '1px solid var(--mui-palette-primary-main)' : `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
                  bgcolor: isSelected ? 'action.selected' : 'transparent',
                  cursor: onSelectAppointment ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 0 0 1px var(--mui-palette-primary-main)' : 'none',
                  '&:hover': onSelectAppointment ? {
                    bgcolor: 'action.hover',
                    borderColor: 'primary.main',
                  } : undefined,
                })}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 750, overflowWrap: 'anywhere' }}>{appointment.serviceName ?? `Appointment ${appointment.id}`}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {customer?.fullName ?? customer?.firstName ?? `Customer ${appointment.customerId ?? ''}`}
                  </Typography>
                  {(status === 'BOOKED' || status === 'CONFIRMED') && (
                    <TextField
                      select
                      size="small"
                      label="Staff or resource"
                      value={appointment.staffUserId ? String(appointment.staffUserId) : ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(event) => void assignStaff(appointment.id, event.target.value)}
                      disabled={assigningId === appointment.id}
                      sx={{ mt: 0.8, width: { xs: '100%', sm: 240 }, maxWidth: '100%' }}
                    >
                      <MenuItem value="">Unassigned</MenuItem>
                      {staff.map((option) => <MenuItem key={option.userId} value={String(option.userId)}>{option.label}</MenuItem>)}
                    </TextField>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {appointment.scheduledAt ? new Date(appointment.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Schedule pending'}
                    {appointment.durationMinutes ? ` · ${appointment.durationMinutes} min` : ''}
                    {appointment.servicePrice !== undefined ? ` · ₹${(appointment.servicePrice - (appointment.loyaltyDiscountAmount ?? 0)).toLocaleString('en-IN')}` : ''}
                  </Typography>
                  {(appointment.loyaltyPointsRedeemed ?? 0) > 0 && (
                    <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 700 }}>
                      {appointment.loyaltyPointsRedeemed} points redeemed · ₹{Number(appointment.loyaltyDiscountAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} off
                    </Typography>
                  )}
                  {appointment.notes && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{appointment.notes}</Typography>}
                </Box>
                <Stack direction={{ xs: 'row', sm: 'column' }} spacing={0.8} sx={{ alignItems: { xs: 'center', sm: 'flex-end' }, justifyContent: { xs: 'space-between', sm: 'flex-start' }, flexWrap: 'wrap', minWidth: 0 }}>
                  <Chip label={status.replace('_', ' ')} size="small" color={statusColor(status)} sx={{ fontWeight: 700 }} />
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
                    {onSelectAppointment && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectAppointment(appointment)
                        }}
                        sx={{ minWidth: 0, px: 0.8, textTransform: 'none', fontSize: '0.72rem', fontWeight: 700 }}
                      >
                        Details
                      </Button>
                    )}
                    {actions.map((action) => (
                      <Button
                        key={action.status}
                        size="small"
                        variant={action.status === 'CONFIRMED' || action.status === 'COMPLETED' ? 'contained' : 'text'}
                        color={action.status === 'CANCELLED' || action.status === 'NO_SHOW' ? 'error' : 'primary'}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAction(appointment.id, action.status, action.label)
                        }}
                        disabled={updatingId === appointment.id}
                        sx={{ minWidth: 0, px: 0.8, textTransform: 'none', fontSize: '0.72rem' }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              </Box>
              )
            })}
          </Stack>
        ) : (
          <EmptyState title={view === 'CANCELLED' ? 'No cancellations' : 'No appointments'} description={view === 'CANCELLED' ? 'Cancelled bookings will appear in this list.' : 'No bookings match this calendar view.'} />
        )}
      </CardContent>
      <Dialog open={Boolean(pendingAction)} onClose={() => setPendingAction(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{pendingAction?.status === 'CONFIRMED' ? 'Confirm appointment' : 'Cancel appointment'}</DialogTitle>
        <DialogContent>
          {message && <Alert severity="error" sx={{ mt: 1 }}>{message}</Alert>}
          <TextField
            autoFocus
            label="Message to customer (optional)"
            value={businessNote}
            onChange={(event) => setBusinessNote(event.target.value)}
            multiline
            minRows={3}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            helperText="This message will appear in the customer's appointment details."
            placeholder="Add any details the customer should know"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingAction(null)} sx={{ textTransform: 'none' }}>Back</Button>
          <Button
            variant="contained"
            color={pendingAction?.status === 'CANCELLED' ? 'error' : 'primary'}
            onClick={() => void submitPendingAction()}
            disabled={!pendingAction || updatingId === pendingAction.appointmentId}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {updatingId === pendingAction?.appointmentId ? 'Sending…' : pendingAction?.label}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
