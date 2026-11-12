import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { addCustomerToBusiness } from '../../../services/api'

type AddCustomerDialogProps = {
  open: boolean
  businessId: number
  onClose: () => void
  onCreated: () => void
}

const MAX_NAME_LENGTH = 30
const MAX_PHONE_LENGTH = 13

// Names may contain letters (any language), spaces, apostrophes, dots and hyphens only.
// Digits and other symbols are stripped as the user types or pastes.
const sanitizeName = (value: string) => value.replace(/[^\p{L}\s.'-]/gu, '').slice(0, MAX_NAME_LENGTH)
const isValidName = (value: string) => /^\p{L}[\p{L}\s.'-]*$/u.test(value)

// Mobile numbers may contain digits only, plus an optional "+" at the very start (e.g. +919876543210).
// Letters and special characters are stripped as the user types or pastes.
const sanitizePhone = (value: string) => {
  const hasPlus = value.trimStart().startsWith('+')
  return ((hasPlus ? '+' : '') + value.replace(/\D/g, '')).slice(0, MAX_PHONE_LENGTH)
}
// 10 digits, or +91 followed by 10 digits
const isValidPhone = (value: string) => /^(\+91)?\d{10}$/.test(value)

export function AddCustomerDialog({ open, businessId, onClose, onCreated }: AddCustomerDialogProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!isValidName(trimmedName)) {
      setMessage('Enter a valid full name using letters only.')
      return
    }

    const trimmedPhone = phone.trim()
    if (!isValidPhone(trimmedPhone)) {
      setMessage('Enter a valid 10-digit mobile number.')
      return
    }

    setIsSubmitting(true)
    setMessage('')
    const result = await addCustomerToBusiness(businessId, {
      name: trimmedName,
      phone: trimmedPhone,
      email: email.trim() || undefined,
    })
    setIsSubmitting(false)
    setMessage(result.ok ? 'Customer added to this business.' : result.message ?? 'Could not add this customer.')
    if (result.ok) onCreated()
  }

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="xs">
      <Box component="form" autoComplete="off" onSubmit={(event) => void handleSubmit(event)}>
        <DialogTitle>Add Customer</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            {message && <Alert severity={message.startsWith('Customer added') ? 'success' : 'error'}>{message}</Alert>}
            <TextField
              autoFocus
              required
              fullWidth
              label="Full name"
              name="customer-full-name"
              autoComplete="off"
              value={name}
              // Letters only; the length limit is enforced silently (no counter is shown).
              // sanitizeName also covers pasted text.
              onChange={(event) => setName(sanitizeName(event.target.value))}
              slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
            />
            <TextField
              required
              fullWidth
              label="Mobile number"
              type="tel"
              name="customer-mobile-number"
              autoComplete="off"
              value={phone}
              // Digits only (plus an optional leading +); sanitizePhone also covers pasted text.
              onChange={(event) => setPhone(sanitizePhone(event.target.value))}
              slotProps={{ htmlInput: { maxLength: MAX_PHONE_LENGTH, inputMode: 'tel' } }}
            />
            <TextField
              fullWidth
              label="Email address"
              type="email"
              name="customer-email-address"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 160 } }}
            />
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