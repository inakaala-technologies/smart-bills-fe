import { useState, type FormEvent } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material'
import { sendMembershipReminder, type DashboardData } from '../../../services/api'

type SendMembershipNotificationDialogProps = {
  open: boolean
  businessId: number
  memberships: DashboardData['memberships']
  customers: DashboardData['customers']
  onClose: () => void
}

export function SendMembershipNotificationDialog({ open, businessId, memberships, customers, onClose }: SendMembershipNotificationDialogProps) {
  const [membershipId, setMembershipId] = useState('')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState<{ text: string; severity: 'success' | 'error' } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const eligibleMemberships = memberships.filter((membership) =>
    membership.businessId === businessId
      && membership.customerId != null
      && membership.endDate
      && !['CANCELLED', 'SUSPENDED'].includes(membership.status ?? ''),
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!membershipId) return
    setIsSubmitting(true)
    setFeedback(null)
    const result = await sendMembershipReminder(Number(membershipId), message.trim() || undefined)
    setIsSubmitting(false)
    setFeedback({
      text: result.message ?? (result.ok ? 'Membership reminder sent.' : 'Could not send membership reminder.'),
      severity: result.ok ? 'success' : 'error',
    })
  }

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={(event) => void handleSubmit(event)}>
        <DialogTitle>Send Membership Notification</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Alert severity="info">Sends an in-app renewal reminder to the selected member. Leave the message blank to use the default reminder.</Alert>
            {feedback && <Alert severity={feedback.severity}>{feedback.text}</Alert>}
            {eligibleMemberships.length > 0 ? (
              <TextField select required fullWidth label="Member subscription" value={membershipId} onChange={(event) => setMembershipId(event.target.value)}>
                {eligibleMemberships.map((membership) => {
                  const customer = customers.find((item) => item.id === membership.customerId)
                  const memberName = customer?.fullName ?? customer?.firstName ?? `Member #${membership.customerId}`
                  return <MenuItem key={membership.id} value={String(membership.id)}>{memberName} · {membership.planName ?? 'Membership'} · due {membership.endDate}</MenuItem>
                })}
              </TextField>
            ) : (
              <Alert severity="warning">There are no memberships with renewal dates available for a reminder.</Alert>
            )}
            <TextField fullWidth multiline minRows={3} label="Message (optional)" value={message} onChange={(event) => setMessage(event.target.value)} slotProps={{ htmlInput: { maxLength: 1000 } }} helperText={`${message.length}/1000`} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={onClose} disabled={isSubmitting}>Close</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || !membershipId || eligibleMemberships.length === 0}>{isSubmitting ? 'Sending…' : 'Send notification'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}