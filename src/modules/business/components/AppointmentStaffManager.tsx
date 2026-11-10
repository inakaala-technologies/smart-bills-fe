import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import { UserPlus, Users } from 'lucide-react'
import { addAppointmentStaff, fetchAppointmentStaff, type AppointmentStaffView } from '../../../services/api'

export function AppointmentStaffManager({ businessId, onStaffAdded }: { businessId: number; onStaffAdded: () => void }) {
  const [staff, setStaff] = useState<AppointmentStaffView[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageSeverity, setMessageSeverity] = useState<'success' | 'error'>('success')

  useEffect(() => {
    let isCurrent = true
    fetchAppointmentStaff(businessId)
      .then((options) => {
        if (isCurrent) setStaff(options)
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setMessage(error instanceof Error ? error.message : 'Could not load appointment staff.')
          setMessageSeverity('error')
        }
      })
      .finally(() => {
        if (isCurrent) setLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [businessId])

  const handleAdd = async () => {
    const staffName = name.trim()
    const staffEmail = email.trim()
    const staffPhone = phone.trim()
    if (!staffName) {
      setMessage("Enter the staff member's name.")
      setMessageSeverity('error')
      return
    }
    if (!staffEmail && !staffPhone) {
      setMessage('Enter an email or phone number for the staff member.')
      setMessageSeverity('error')
      return
    }

    setSaving(true)
    setMessage('')
    const result = await addAppointmentStaff(businessId, {
      name: staffName,
      email: staffEmail || undefined,
      phone: staffPhone || undefined,
    })
    setSaving(false)
    if (!result.ok || !result.staff) {
      setMessage(result.message ?? 'Could not add appointment staff.')
      setMessageSeverity('error')
      return
    }

    const addedStaff = result.staff
    setStaff((current) => [...current.filter((item) => item.staffId !== addedStaff.staffId), addedStaff])
    setName('')
    setEmail('')
    setPhone('')
    setMessage(`${addedStaff.label} added to the staff roster.`)
    setMessageSeverity('success')
    onStaffAdded()
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider' }}>
      <CardContent>
        <Stack spacing={1.4}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 1.3, bgcolor: 'primary.light', color: 'primary.dark' }}>
              <Users size={18} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Appointment staff</Typography>
              <Typography variant="caption" color="text.secondary">
                Add a staff profile with or without a BHive account. Existing accounts are not changed.
              </Typography>
            </Box>
          </Stack>

          {message && <Alert severity={messageSeverity}>{message}</Alert>}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              fullWidth
              label="Staff name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
              required
            />
            <TextField
              size="small"
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={saving}
              slotProps={{ htmlInput: { maxLength: 255 } }}
            />
            <TextField
              size="small"
              fullWidth
              label="Phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={saving}
              slotProps={{ htmlInput: { maxLength: 30 } }}
            />
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              disableElevation
              startIcon={<UserPlus size={16} />}
              onClick={() => void handleAdd()}
              disabled={saving || !name.trim() || (!email.trim() && !phone.trim())}
              sx={{ minWidth: { sm: 132 }, textTransform: 'none', fontWeight: 800 }}
            >
              {saving ? 'Adding…' : 'Add staff'}
            </Button>
          </Stack>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 750, mb: 0.6 }}>
              Staff available for appointments
            </Typography>
            {loading ? (
              <Typography variant="body2" color="text.secondary">Loading staff…</Typography>
            ) : staff.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                {staff.map((member) => (
                  <Box key={member.staffId} sx={{ px: 1.2, py: 0.6, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 750 }}>{member.label}</Typography>
                    {(member.email || member.phone) && (
                      <Typography variant="caption" color="text.secondary">{[member.email, member.phone].filter(Boolean).join(' · ')}</Typography>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No staff profiles have been added yet.</Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
