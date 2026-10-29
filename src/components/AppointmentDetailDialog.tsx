import { useState, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material'
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  IndianRupee,
  Mail,
  Phone,
  User,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react'
import type {
  AppointmentStaffOption,
  AppointmentStatus,
  AppointmentSummary,
  BusinessSummary,
  CustomerSummary,
} from '../services/api'
import type { Role } from '../services/auth'

export type AppointmentDetailDialogProps = {
  open: boolean
  appointment: AppointmentSummary | null
  businesses?: BusinessSummary[]
  customers?: CustomerSummary[]
  role?: Role
  staffOptions?: AppointmentStaffOption[]
  onClose: () => void
  onStatusChange?: (appointmentId: number, status: AppointmentStatus, note?: string) => Promise<unknown>
  onStaffAssign?: (appointmentId: number, staffUserId?: number) => Promise<unknown>
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

function getStatusColor(status?: string): 'info' | 'success' | 'warning' | 'error' | 'default' {
  switch (status?.toUpperCase()) {
    case 'CONFIRMED':
      return 'info'
    case 'COMPLETED':
      return 'success'
    case 'CANCELLED':
      return 'error'
    case 'NO_SHOW':
      return 'warning'
    case 'BOOKED':
    default:
      return 'info'
  }
}

export function AppointmentDetailDialog({
  open,
  appointment,
  businesses = [],
  customers = [],
  role = 'BUSINESS',
  staffOptions = [],
  onClose,
  onStatusChange,
  onStaffAssign,
}: AppointmentDetailDialogProps) {
  const [businessNoteInput, setBusinessNoteInput] = useState('')
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [renderedAt] = useState(() => Date.now())

  if (!appointment) return null

  const business = businesses.find((b) => b.id === appointment.businessId)
  const customer = customers.find((c) => c.id === appointment.customerId)
  const status = (appointment.status ?? 'BOOKED').toUpperCase()
  const isCancelled = status === 'CANCELLED'
  const isCompleted = status === 'COMPLETED'
  const isFuture = appointment.scheduledAt ? new Date(appointment.scheduledAt).getTime() > renderedAt : true
  const canCustomerCancel = role === 'CUSTOMER' && ['BOOKED', 'CONFIRMED'].includes(status) && isFuture

  const handleAction = async (newStatus: AppointmentStatus, note?: string) => {
    if (!onStatusChange) return
    setSubmittingAction(newStatus)
    setActionError('')
    try {
      await onStatusChange(appointment.id, newStatus, note)
      setIsEditingNote(false)
    } catch {
      setActionError('Could not update appointment status. Please try again.')
    } finally {
      setSubmittingAction(null)
    }
  }

  const handleAssignStaff = async (staffIdString: string) => {
    if (!onStaffAssign) return
    const staffId = staffIdString ? Number(staffIdString) : undefined
    setSubmittingAction('assign')
    setActionError('')
    try {
      await onStaffAssign(appointment.id, staffId)
    } catch {
      setActionError('Could not assign staff member. Please try again.')
    } finally {
      setSubmittingAction(null)
    }
  }

  const assignedStaffLabel = staffOptions.find((s) => s.userId === appointment.staffUserId)?.label
    ?? (appointment.staffUserId ? `Staff Member #${appointment.staffUserId}` : 'Unassigned')

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
          },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: 2.2,
          pb: 1.5,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1.5,
          borderBottom: '1px solid var(--mui-palette-divider)',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Chip
              label={status.replace('_', ' ')}
              color={getStatusColor(status)}
              size="small"
              sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 11 }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              ID: #{appointment.id}
            </Typography>
          </Stack>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.25 }}>
            {appointment.serviceName || 'Scheduled Appointment'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            {business?.businessName ?? business?.name ?? `Business #${appointment.businessId}`}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close dialog" sx={{ color: 'text.secondary' }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'background.default' }}>
        <Stack spacing={2}>
          {actionError && <Alert severity="error">{actionError}</Alert>}

          {/* Date, Time & Cost Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.5,
            }}
          >
            {/* Scheduled Date & Time */}
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.2,
                bgcolor: 'background.paper',
              }}
            >
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CalendarDays size={20} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                  Scheduled Date & Time
                </Typography>
                <Typography sx={{ fontWeight: 750, color: 'text.primary', fontSize: 14 }}>
                  {appointment.scheduledAt
                    ? new Date(appointment.scheduledAt).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Schedule pending'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  {appointment.scheduledAt
                    ? new Date(appointment.scheduledAt).toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : ''}
                </Typography>
              </Box>
            </Paper>

            {/* Price & Duration */}
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.2,
                bgcolor: 'background.paper',
              }}
            >
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                  color: 'success.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IndianRupee size={20} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                  Fee & Duration
                </Typography>
                <Typography sx={{ fontWeight: 800, color: 'text.primary', fontSize: 16 }}>
                  {formatCurrency(appointment.servicePrice)}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                  <Clock size={12} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {appointment.durationMinutes ? `${appointment.durationMinutes} mins duration` : 'Standard duration'}
                  </Typography>
                </Stack>
              </Box>
            </Paper>
          </Box>

          {/* Customer / Participant Information */}
          <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 750, textTransform: 'uppercase', display: 'block', mb: 1 }}>
              {role === 'CUSTOMER' ? 'Service Provider Details' : 'Customer Information'}
            </Typography>

            {role === 'CUSTOMER' ? (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Building2 size={16} color="#4E2BCC" />
                  <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {business?.businessName ?? business?.name ?? 'Business'}
                  </Typography>
                </Stack>
                {business?.address && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', pl: 3 }}>
                    {business.address}
                  </Typography>
                )}
                {business?.phone && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', pl: 3 }}>
                    <Phone size={14} color="#6b7280" />
                    <Typography variant="caption" component="a" href={`tel:${business.phone}`} sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}>
                      {business.phone}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            ) : (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <User size={16} color="#4E2BCC" />
                  <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {customer?.fullName ?? customer?.firstName ?? `Customer #${appointment.customerId ?? '—'}`}
                  </Typography>
                </Stack>
                {customer?.phoneNumber && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', pl: 3 }}>
                    <Phone size={14} color="#6b7280" />
                    <Typography variant="caption" component="a" href={`tel:${customer.phoneNumber}`} sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}>
                      {customer.phoneNumber}
                    </Typography>
                  </Stack>
                )}
                {customer?.email && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', pl: 3 }}>
                    <Mail size={14} color="#6b7280" />
                    <Typography variant="caption" component="a" href={`mailto:${customer.email}`} sx={{ color: 'text.secondary', textDecoration: 'none' }}>
                      {customer.email}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            )}
          </Paper>

          {/* Staff Assignment */}
          {(role === 'BUSINESS' || Boolean(appointment.staffUserId)) && (
            <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2, bgcolor: 'background.paper' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 750, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                Assigned Staff Member
              </Typography>
              {role === 'BUSINESS' && !isCancelled && !isCompleted ? (
                <TextField
                  select
                  size="small"
                  fullWidth
                  label="Select staff or resource"
                  value={appointment.staffUserId ? String(appointment.staffUserId) : ''}
                  onChange={(e) => void handleAssignStaff(e.target.value)}
                  disabled={submittingAction === 'assign'}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {staffOptions.map((opt) => (
                    <MenuItem key={opt.userId} value={String(opt.userId)}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <UserCheck size={16} color="#4E2BCC" />
                  <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.primary' }}>
                    {assignedStaffLabel}
                  </Typography>
                </Stack>
              )}
            </Paper>
          )}

          {/* Customer Booking Notes */}
          {appointment.notes && (
            <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2, bgcolor: 'background.paper' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 750, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                Customer Booking Notes
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.primary', bgcolor: 'action.hover', p: 1.2, borderRadius: 1.5, overflowWrap: 'anywhere' }}>
                "{appointment.notes}"
              </Typography>
            </Paper>
          )}

          {/* Business Note / Message */}
          {(role === 'BUSINESS' || appointment.businessNote) && (
            <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2, bgcolor: 'background.paper' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 750, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                Message From Business
              </Typography>
              {appointment.businessNote && !isEditingNote && (
                <Typography variant="body2" sx={{ color: 'primary.dark', bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08), p: 1.2, borderRadius: 1.5, mb: 1, overflowWrap: 'anywhere' }}>
                  {appointment.businessNote}
                </Typography>
              )}
              {role === 'BUSINESS' && !isCancelled && (
                <>
                  {!isEditingNote && appointment.businessNote ? (
                    <Button size="small" variant="text" onClick={() => { setBusinessNoteInput(appointment.businessNote ?? ''); setIsEditingNote(true); }}>
                      Edit note to customer
                    </Button>
                  ) : isEditingNote || !appointment.businessNote ? (
                    <Stack spacing={1}>
                      <TextField
                        size="small"
                        multiline
                        minRows={2}
                        fullWidth
                        placeholder="Add a message or instructions for the customer..."
                        value={businessNoteInput}
                        onChange={(e) => setBusinessNoteInput(e.target.value)}
                      />
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        {isEditingNote && (
                          <Button size="small" onClick={() => setIsEditingNote(false)}>
                            Cancel
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="contained"
                          disabled={submittingAction === 'note' || !businessNoteInput.trim()}
                          onClick={() => void handleAction(status as AppointmentStatus, businessNoteInput.trim())}
                        >
                          Save message
                        </Button>
                      </Stack>
                    </Stack>
                  ) : null}
                </>
              )}
            </Paper>
          )}

          {/* Creation Timestamp */}
          {appointment.createdAt && (
            <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center' }}>
              Booked on {new Date(appointment.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      {/* Action Footer */}
      <DialogActions sx={{ p: 2, justifyContent: 'space-between', bgcolor: 'background.paper' }}>
        <Box>
          {canCustomerCancel && (
            <Button
              color="error"
              variant="outlined"
              size="small"
              startIcon={<XCircle size={15} />}
              disabled={Boolean(submittingAction)}
              onClick={() => void handleAction('CANCELLED')}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Cancel booking
            </Button>
          )}

          {role === 'BUSINESS' && !isCancelled && !isCompleted && (
            <Stack direction="row" spacing={1}>
              {status === 'BOOKED' && (
                <Button
                  color="primary"
                  variant="contained"
                  size="small"
                  startIcon={<CheckCircle2 size={15} />}
                  disabled={Boolean(submittingAction)}
                  onClick={() => void handleAction('CONFIRMED')}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Confirm
                </Button>
              )}
              {status === 'CONFIRMED' && (
                <Button
                  color="success"
                  variant="contained"
                  size="small"
                  startIcon={<CheckCircle2 size={15} />}
                  disabled={Boolean(submittingAction)}
                  onClick={() => void handleAction('COMPLETED')}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Complete
                </Button>
              )}
              {status === 'CONFIRMED' && (
                <Button
                  color="warning"
                  variant="outlined"
                  size="small"
                  disabled={Boolean(submittingAction)}
                  onClick={() => void handleAction('NO_SHOW')}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  No-Show
                </Button>
              )}
              <Button
                color="error"
                variant="outlined"
                size="small"
                startIcon={<XCircle size={15} />}
                disabled={Boolean(submittingAction)}
                onClick={() => void handleAction('CANCELLED')}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Cancel
              </Button>
            </Stack>
          )}
        </Box>

        <Button onClick={onClose} variant="text" sx={{ fontWeight: 700, textTransform: 'none' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function Paper(props: { variant?: 'outlined' | 'elevation'; sx?: object; children: ReactNode }) {
  return (
    <Box
      sx={{
        border: '1px solid var(--mui-palette-divider)',
        ...props.sx,
      }}
    >
      {props.children}
    </Box>
  )
}
