import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItemButton, ListItemText, Stack, TextField } from '@mui/material'
import { CheckCircle2 } from 'lucide-react'
import { addCustomerToBusiness, searchMembershipUsers, type CustomerSummary } from '../../../services/api'

type AddCustomerDialogProps = {
  open: boolean
  businessId: number
  onClose: () => void
  onCreated: (customer: CustomerSummary) => void
  onAlreadyAdded?: (customer: CustomerSummary) => void
}

export function AddCustomerDialog({ open, businessId, onClose, onCreated, onAlreadyAdded }: AddCustomerDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CustomerSummary[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null)
  const [message, setMessage] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setQuery('')
    setResults([])
    setSelectedCustomer(null)
    setMessage('')
    onClose()
  }

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedQuery = query.trim()
    if (trimmedQuery.length < 2) {
      setMessage('Enter an email, mobile number, or BHive ID to search.')
      setResults([])
      setSelectedCustomer(null)
      return
    }

    setIsSearching(true)
    setMessage('')
    setSelectedCustomer(null)
    try {
      const customers = await searchMembershipUsers(businessId, trimmedQuery)
      setResults(customers)
      if (customers.length === 0) setMessage('No registered customer found. Ask them to register with BHive first.')
    } catch (error) {
      setResults([])
      setMessage(error instanceof Error ? error.message : 'Could not search registered customers.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAdd = async () => {
    if (!selectedCustomer?.profileId) return
    if (selectedCustomer.alreadyAdded) {
      onAlreadyAdded?.(selectedCustomer)
      handleClose()
      return
    }

    setIsSubmitting(true)
    setMessage('')
    const result = await addCustomerToBusiness(businessId, selectedCustomer.profileId)
    setIsSubmitting(false)
    if (!result.ok || !result.customer) {
      setMessage(result.message ?? 'Could not add this customer.')
      return
    }
    onCreated(result.customer)
    handleClose()
  }

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : handleClose} fullWidth maxWidth="xs">
      <Box component="form" autoComplete="off" onSubmit={(event) => void handleSearch(event)}>
        <DialogTitle>Add Registered Customer</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            {message && <Alert severity={message.startsWith('No registered') ? 'info' : 'error'}>{message}</Alert>}
            <Stack direction="row" spacing={1}>
              <TextField
                autoFocus
                fullWidth
                label="Email, mobile, or BHive ID"
                name="registered-customer-search"
                autoComplete="off"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSelectedCustomer(null)
                  setMessage('')
                }}
              />
              <Button type="submit" variant="outlined" disabled={isSearching || isSubmitting}>
                {isSearching ? 'Searching…' : 'Search'}
              </Button>
            </Stack>
            {results.length > 0 && (
              <List disablePadding>
                {results.map((customer) => {
                  const name = customer.fullName ?? customer.firstName ?? 'BHive customer'
                  const details = [customer.profileId, customer.email, customer.phoneNumber].filter(Boolean).join(' · ')
                  return (
                    <ListItemButton
                      key={customer.id}
                      selected={selectedCustomer?.id === customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider', mb: 0.75 }}
                    >
                      <ListItemText primary={name} secondary={details} />
                      {customer.alreadyAdded && <CheckCircle2 size={19} color="var(--mui-palette-success-main)" aria-label="Already added to this business" />}
                    </ListItemButton>
                  )
                })}
              </List>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            type="button"
            variant="contained"
            disabled={!selectedCustomer?.profileId || isSubmitting || isSearching || (selectedCustomer.alreadyAdded === true && !onAlreadyAdded)}
            onClick={() => void handleAdd()}
          >
            {isSubmitting ? 'Adding…' : selectedCustomer?.alreadyAdded ? onAlreadyAdded ? 'Use customer' : 'Already added' : 'Add customer'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
