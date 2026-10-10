import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { createManagedMembership, fetchMembershipPlans, updateManagedMembership, type CustomerSummary, type MembershipPlanSummary, type MembershipSummary } from '../../../services/api'

type CustomerMembershipManagerProps = {
  open: boolean
  businessId: number
  customer: CustomerSummary
  memberships: MembershipSummary[]
  onClose: () => void
  onUpdated: () => void
}

type MembershipForm = {
  planId: string
  startDate: string
  endDate: string
  paymentStatus: 'PAID' | 'PENDING' | 'FREE'
}

function todayIso() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function formatDate(value?: string) {
  if (!value) return 'No end date'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatStatus(status?: string) {
  return status ?? 'PENDING'
}

export function CustomerMembershipManager({ open, businessId, customer, memberships, onClose, onUpdated }: CustomerMembershipManagerProps) {
  const [plans, setPlans] = useState<MembershipPlanSummary[]>([])
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null)
  const [editingMembership, setEditingMembership] = useState<MembershipSummary | null>(null)
  const [removingMembership, setRemovingMembership] = useState<MembershipSummary | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackSeverity, setFeedbackSeverity] = useState<'success' | 'error'>('success')
  const [form, setForm] = useState<MembershipForm>({ planId: '', startDate: todayIso(), endDate: '', paymentStatus: 'PENDING' })

  useEffect(() => {
    if (!open || !businessId) return
    let isCurrent = true
    fetchMembershipPlans(businessId)
      .then((result) => { if (isCurrent) setPlans(result) })
      .catch((error: unknown) => {
        if (isCurrent) {
          setFeedback(error instanceof Error ? error.message : 'Could not load membership plans.')
          setFeedbackSeverity('error')
        }
      })
    return () => { isCurrent = false }
  }, [businessId, open])

  const resetForm = () => {
    setFormMode(null)
    setEditingMembership(null)
    setForm({ planId: '', startDate: todayIso(), endDate: '', paymentStatus: 'PENDING' })
    setFeedback('')
  }

  const beginAdd = () => {
    setEditingMembership(null)
    setForm({ planId: plans.find((plan) => plan.active)?.id.toString() ?? '', startDate: todayIso(), endDate: '', paymentStatus: 'PENDING' })
    setFeedback('')
    setFormMode('add')
  }

  const beginEdit = (membership: MembershipSummary) => {
    setEditingMembership(membership)
    setForm({
      planId: String(membership.planId ?? ''),
      startDate: membership.startDate ?? todayIso(),
      endDate: membership.endDate ?? '',
      paymentStatus: (membership.paymentStatus ?? 'PENDING') as MembershipForm['paymentStatus'],
    })
    setFeedback('')
    setFormMode('edit')
  }

  const saveMembership = async () => {
    if (!form.planId || !form.startDate) {
      setFeedback('Choose a plan and start date.')
      setFeedbackSeverity('error')
      return
    }
    if (form.endDate && form.endDate < form.startDate) {
      setFeedback('End date must be on or after the start date.')
      setFeedbackSeverity('error')
      return
    }

    setSaving(true)
    const result = formMode === 'edit' && editingMembership
      ? await updateManagedMembership(businessId, editingMembership.id, {
          planId: Number(form.planId),
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          paymentStatus: form.paymentStatus,
          status: editingMembership.status ?? 'PENDING',
        })
      : await createManagedMembership(businessId, {
          planId: Number(form.planId),
          profileId: customer.profileId,
          memberName: customer.fullName ?? customer.firstName ?? 'Customer',
          email: customer.email,
          phone: customer.phoneNumber,
          startDate: form.startDate,
          paymentStatus: form.paymentStatus,
        })
    setSaving(false)

    if (!result.ok) {
      setFeedback(result.message ?? 'Could not save membership.')
      setFeedbackSeverity('error')
      return
    }

    setFormMode(null)
    setEditingMembership(null)
    setFeedback(formMode === 'edit' ? 'Membership updated.' : 'Membership added.')
    setFeedbackSeverity('success')
    onUpdated()
  }

  const removeMembership = async () => {
    if (!removingMembership) return
    setSaving(true)
    const result = await updateManagedMembership(businessId, removingMembership.id, {
      planId: removingMembership.planId ?? 0,
      startDate: removingMembership.startDate ?? todayIso(),
      endDate: removingMembership.endDate,
      paymentStatus: (removingMembership.paymentStatus ?? 'PENDING') as MembershipForm['paymentStatus'],
      status: 'CANCELLED',
    })
    setSaving(false)
    if (!result.ok) {
      setFeedback(result.message ?? 'Could not remove membership.')
      setFeedbackSeverity('error')
      setRemovingMembership(null)
      return
    }

    setRemovingMembership(null)
    setFeedback('Membership cancelled and retained in customer history.')
    setFeedbackSeverity('success')
    onUpdated()
  }

  const customerName = customer.fullName ?? customer.firstName ?? 'Customer'

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, fontWeight: 900 }}>
          {formMode === 'add' ? 'Add membership' : formMode === 'edit' ? 'Edit membership' : `${customerName}'s memberships`}
          {!formMode && <Button size="small" startIcon={<Plus size={15} />} onClick={beginAdd} disabled={!plans.some((plan) => plan.active)} sx={{ textTransform: 'none', fontWeight: 800 }}>Add</Button>}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.2}>
            {feedback && <Alert severity={feedbackSeverity}>{feedback}</Alert>}
            {formMode ? (
              <>
                <TextField
                  select
                  label="Plan"
                  value={form.planId}
                  onChange={(event) => setForm((current) => ({ ...current, planId: event.target.value }))}
                  fullWidth
                >
                  {plans.filter((plan) => plan.active || plan.id === editingMembership?.planId).map((plan) => (
                    <MenuItem key={plan.id} value={String(plan.id)}>{plan.name} · ₹{plan.price.toLocaleString('en-IN')}</MenuItem>
                  ))}
                </TextField>
                <TextField label="Start date" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                {formMode === 'edit' && <TextField label="End date" type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} fullWidth />}
                <TextField select label="Payment status" value={form.paymentStatus} onChange={(event) => setForm((current) => ({ ...current, paymentStatus: event.target.value as MembershipForm['paymentStatus'] }))} fullWidth>
                  <MenuItem value="PAID">Paid</MenuItem><MenuItem value="PENDING">Pending</MenuItem><MenuItem value="FREE">Free / complimentary</MenuItem>
                </TextField>
                {formMode === 'add' && <Typography variant="caption" color="text.secondary">The end date is set from the selected plan.</Typography>}
              </>
            ) : memberships.length ? (
              memberships.map((membership) => (
                <Card key={membership.id} variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 1.2, '&:last-child': { pb: 1.2 } }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>{membership.planName ?? 'Membership'}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatDate(membership.startDate)} – {formatDate(membership.endDate)}</Typography>
                      </Box>
                      <Chip size="small" label={formatStatus(membership.status)} />
                    </Stack>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.8, justifyContent: 'flex-end' }}>
                      <Button size="small" startIcon={<Pencil size={14} />} onClick={() => beginEdit(membership)} sx={{ textTransform: 'none' }}>Edit</Button>
                      {!['CANCELLED', 'RENEWED'].includes(membership.status ?? '') && (
                        <Button size="small" color="error" startIcon={<Trash2 size={14} />} onClick={() => setRemovingMembership(membership)} sx={{ textTransform: 'none' }}>Remove</Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">No memberships for this customer yet.</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          {formMode ? (
            <>
              <Button onClick={resetForm} color="inherit">Back</Button>
              <Button variant="contained" onClick={() => void saveMembership()} disabled={saving || !plans.some((plan) => plan.active || plan.id === editingMembership?.planId)}>
                {saving ? 'Saving…' : formMode === 'add' ? 'Add membership' : 'Save changes'}
              </Button>
            </>
          ) : <Button onClick={onClose}>Close</Button>}
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(removingMembership)} onClose={() => setRemovingMembership(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>Remove membership?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">This cancels the membership and keeps it in the customer’s history.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemovingMembership(null)} disabled={saving}>Keep membership</Button>
          <Button color="error" variant="contained" onClick={() => void removeMembership()} disabled={saving}>{saving ? 'Removing…' : 'Remove'}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}