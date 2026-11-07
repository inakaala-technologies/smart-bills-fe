import { useEffect, useState } from 'react'
import { alpha, Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { CalendarDays } from 'lucide-react'
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
    <Card
      variant="outlined"
      sx={(theme) => ({
        borderRadius: '16px',
        border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
        boxShadow: '0 2px 12px rgba(78, 43, 204, 0.07)',
        bgcolor: 'background.paper',
      })}
    >
      <CardContent sx={{ p: 1.6, '&:last-child': { pb: 1.6 } }}>
        {/* Header: title + count */}
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.6 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>Appointment operations</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3, lineHeight: 1.4 }}>
              Review bookings, assign staff, and update customer status.
            </Typography>
          </Box>
          <Chip size="small" label={`${visibleAppointments.length} shown`} variant="outlined" sx={{ flexShrink: 0, fontWeight: 600 }} />
        </Stack>

        {message && <Alert severity="error" sx={{ mb: 1.5 }}>{message}</Alert>}

        {/* Filters: full-width segmented control, then full-width day picker */}
        <Stack spacing={1} sx={{ mb: 1.8 }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={view}
            onChange={(_event, value: 'UPCOMING' | 'ALL' | 'CANCELLED' | null) => { if (value) setView(value) }}
            aria-label="Appointment list filter"
            sx={{ '& .MuiToggleButton-root': { flex: 1, px: 0.8, py: 0.9, whiteSpace: 'nowrap', textTransform: 'none', fontWeight: 600 } }}
          >
            <ToggleButton value="UPCOMING">Upcoming</ToggleButton>
            <ToggleButton value="ALL">All</ToggleButton>
            <ToggleButton value="CANCELLED">Cancelled</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            type="date"
            size="small"
            label="Day"
            fullWidth
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>

        {visibleAppointments.length > 0 ? (
          <Stack spacing={1.4}>
            {visibleAppointments.map((appointment) => {
              const status = (appointment.status ?? 'BOOKED').toUpperCase()
              const customer = customers.find((item) => item.id === appointment.customerId)
              const actions: Array<{ label: string; status: AppointmentStatus }> = status === 'BOOKED'
                ? [{ label: 'Confirm', status: 'CONFIRMED' }, { label: 'Cancel', status: 'CANCELLED' }]
                : status === 'CONFIRMED'
                  ? [{ label: 'Complete', status: 'COMPLETED' }, { label: 'No-show', status: 'NO_SHOW' }, { label: 'Cancel', status: 'CANCELLED' }]
                  : []
              const buttonCount = actions.length + (onSelectAppointment ? 1 : 0)

              const isSelected = selectedAppointmentId === appointment.id
              return (
                <Box
                  key={appointment.id}
                  onClick={() => onSelectAppointment?.(appointment)}
                  sx={(theme) => ({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.2,
                    p: 1.6,
                    borderRadius: '14px',
                    border: isSelected ? '1px solid var(--mui-palette-primary-main)' : `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                    bgcolor: isSelected ? 'action.selected' : 'background.paper',
                    cursor: onSelectAppointment ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 0 0 1px var(--mui-palette-primary-main)' : 'none',
                    '&:hover': onSelectAppointment ? {
                      bgcolor: 'action.hover',
                      borderColor: 'primary.main',
                    } : undefined,
                  })}
                >
                  {/* Row 1: service name + status pill */}
                  <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ minWidth: 0, flex: 1, fontSize: 15, fontWeight: 600, lineHeight: 1.3, overflowWrap: 'anywhere' }}>
                      {appointment.serviceName ?? `Appointment ${appointment.id}`}
                    </Typography>
                    <Chip label={status.replace('_', ' ')} size="small" color={statusColor(status)} sx={{ flexShrink: 0, fontWeight: 700 }} />
                  </Stack>

                  {/* Row 2: customer + date / duration / price */}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}>
                      {customer?.fullName ?? customer?.firstName ?? `Customer ${appointment.customerId ?? ''}`}
                    </Typography>
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.7, mt: 0.5, color: 'text.secondary' }}>
                      <CalendarDays size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                        {appointment.scheduledAt ? new Date(appointment.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Schedule pending'}
                        {appointment.durationMinutes ? ` · ${appointment.durationMinutes} min` : ''}
                        {appointment.servicePrice !== undefined ? ` · ₹${(appointment.servicePrice - (appointment.loyaltyDiscountAmount ?? 0)).toLocaleString('en-IN')}` : ''}
                      </Typography>
                    </Stack>
                    {(appointment.loyaltyPointsRedeemed ?? 0) > 0 && (
                      <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.4, fontWeight: 700 }}>
                        {appointment.loyaltyPointsRedeemed} points redeemed · ₹{Number(appointment.loyaltyDiscountAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} off
                      </Typography>
                    )}
                    {appointment.notes && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4 }}>{appointment.notes}</Typography>}
                  </Box>

                  {/* Row 3: staff dropdown, full width */}
                  {(status === 'BOOKED' || status === 'CONFIRMED') && (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Staff or resource"
                      value={appointment.staffUserId ? String(appointment.staffUserId) : ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(event) => void assignStaff(appointment.id, event.target.value)}
                      disabled={assigningId === appointment.id}
                    >
                      <MenuItem value="">Unassigned</MenuItem>
                      {staff.map((option) => <MenuItem key={option.userId} value={String(option.userId)}>{option.label}</MenuItem>)}
                    </TextField>
                  )}

                  {/* Row 4: equal-width action buttons */}
                  {buttonCount > 0 && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${buttonCount}, minmax(0, 1fr))`, gap: 0.8 }}>
                      {onSelectAppointment && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectAppointment(appointment)
                          }}
                          sx={{ minWidth: 0, minHeight: 36, px: 0.5, borderRadius: '10px', textTransform: 'none', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}
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
                          sx={{ minWidth: 0, minHeight: 36, px: 0.5, borderRadius: '10px', textTransform: 'none', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </Box>
                  )}
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