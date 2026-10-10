import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { addCustomerToBusiness } from '../../../services/api'

type AddCustomerDialogProps = {
  open: boolean
  businessId: number
  onClose: () => void
  onCreated: () => void
}

export function AddCustomerDialog({ open, businessId, onClose, onCreated }: AddCustomerDialogProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    const result = await addCustomerToBusiness(businessId, {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
    })
    setIsSubmitting(false)
    setMessage(result.ok ? 'Customer added to this business.' : result.message ?? 'Could not add this customer.')
    if (result.ok) onCreated()
  }

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={(event) => void handleSubmit(event)}>
        <DialogTitle>Add Customer</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            {message && <Alert severity={message.startsWith('Customer added') ? 'success' : 'error'}>{message}</Alert>}
            <TextField autoFocus required fullWidth label="Full name" value={name} onChange={(event) => setName(event.target.value)} slotProps={{ htmlInput: { maxLength: 120 } }} />
            <TextField required fullWidth label="Mobile number" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} slotProps={{ htmlInput: { maxLength: 30 } }} />
            <TextField fullWidth label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} slotProps={{ htmlInput: { maxLength: 160 } }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>{isSubmitting ? 'Adding…' : 'Add customer'}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}