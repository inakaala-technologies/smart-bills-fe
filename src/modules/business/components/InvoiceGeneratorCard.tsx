import { useEffect, useState } from 'react'
import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, MenuItem, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { ArrowRight, Plus, Trash2, X } from 'lucide-react'
import { type DashboardData } from '../../../services/api'
import { fetchBusinessMembershipPlans } from '../../../store/businessDashboardSlice'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'

export type InvoiceLineItemForm = {
  id: string
  productName: string
  quantity: string
  unitPrice: string
  gstRate: string
}

export type BusinessInvoiceForm = {
  customerId: number | string
  dueDate: string
  items: InvoiceLineItemForm[]
}

type InvoiceLineItemField = Exclude<keyof InvoiceLineItemForm, 'id'>

export type InvoiceGeneratorCardProps = {
  open: boolean
  businessId: number
  data: DashboardData
  selectedCustomer: DashboardData['customers'][number] | null
  customerSearchText: string
  customerSearchResults: DashboardData['customers']
  isCustomerSearching: boolean
  invoiceForm: BusinessInvoiceForm
  invoiceMessage: string
  isSubmitting: boolean
  onClose: () => void
  onCustomerSearchChange: (value: string) => void
  onCustomerSelection: (customer: DashboardData['customers'][number] | null) => void
  onInvoiceFieldChange: (field: 'customerId' | 'dueDate', value: string) => void
  onInvoiceItemChange: (id: string, field: InvoiceLineItemField, value: string) => void
  onAddItem: () => void
  onRemoveItem: (id: string) => void
  onCreateInvoice: (status: 'DRAFT' | 'SENT') => void
}

export function InvoiceGeneratorCard({
  open,
  businessId,
  data,
  selectedCustomer,
  customerSearchText,
  customerSearchResults,
  isCustomerSearching,
  invoiceForm,
  invoiceMessage,
  isSubmitting,
  onClose,
  onCustomerSearchChange,
  onCustomerSelection,
  onInvoiceFieldChange,
  onInvoiceItemChange,
  onAddItem,
  onRemoveItem,
  onCreateInvoice,
}: InvoiceGeneratorCardProps) {
  const dispatch = useAppDispatch()
  const membershipPlanState = useAppSelector((state) => state.businessDashboard.membershipPlansByBusiness[businessId])
  const membershipPlans = membershipPlanState?.plans ?? []
  const membershipPlansLoading = membershipPlanState?.loading ?? false
  const membershipPlansError = membershipPlanState?.error ?? ''
  const [invoiceModeOverride, setInvoiceModeOverride] = useState<'products' | 'membership' | null>(null)
  const [selectedMembershipId, setSelectedMembershipId] = useState('')
  const invoiceMode = invoiceModeOverride ?? (membershipPlans.length > 0 ? 'membership' : 'products')

  useEffect(() => {
    if (!open || !businessId) return
    if (!membershipPlanState?.loaded && !membershipPlanState?.loading) {
      void dispatch(fetchBusinessMembershipPlans(businessId))
    }
  }, [businessId, dispatch, membershipPlanState?.loaded, membershipPlanState?.loading, open])

  const handleClose = () => {
    setInvoiceModeOverride(null)
    setSelectedMembershipId('')
    onClose()
  }

  const getCustomerLabel = (customer: { fullName?: string; email?: string; phoneNumber?: string } | null | undefined) => {
    if (!customer) return ''
    return `${customer.fullName ?? 'Customer'}${customer.email ? ` • ${customer.email}` : ''}${customer.phoneNumber ? ` • ${customer.phoneNumber}` : ''}`
  }

  const totals = invoiceForm.items.reduce((result, item) => {
    const quantity = Number(item.quantity)
    const unitPrice = Number(item.unitPrice)
    const gstRate = Number(item.gstRate)
    const lineSubtotal = quantity > 0 && unitPrice > 0 ? quantity * unitPrice : 0
    return {
      subtotal: result.subtotal + lineSubtotal,
      tax: result.tax + lineSubtotal * (gstRate >= 0 ? gstRate : 0) / 100,
    }
  }, { subtotal: 0, tax: 0 })
  const formatMoney = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const billableMemberships = data.memberships.filter((membership) =>
    membership.businessId === businessId
      && membership.customerId != null
      && membership.planId != null
      && !['CANCELLED', 'RENEWED', 'SUSPENDED'].includes(membership.status ?? ''),
  )

  const handleMembershipSelection = (membershipId: string) => {
    setSelectedMembershipId(membershipId)
    const membership = billableMemberships.find((item) => String(item.id) === membershipId)
    if (!membership || !membership.customerId || !membership.planId || !invoiceForm.items[0]) return

    const plan = membershipPlans.find((item) => item.id === membership.planId)
    const customer = data.customers.find((item) => item.id === membership.customerId) ?? null
    const planName = membership.planName ?? plan?.name ?? 'Membership'
    const frequency = plan?.billingFrequency.toLowerCase().replaceAll('_', ' ') ?? 'subscription'
    const savedPrice = membership.price ?? plan?.price
    const itemName = planName.toLowerCase().includes(frequency) ? `${planName} membership` : `${planName} membership (${frequency})`

    onCustomerSelection(customer)
    onInvoiceFieldChange('customerId', String(membership.customerId))
    onCustomerSearchChange('')
    onInvoiceItemChange(invoiceForm.items[0].id, 'productName', itemName)
    if (savedPrice != null) onInvoiceItemChange(invoiceForm.items[0].id, 'unitPrice', String(savedPrice))
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, color: 'text.primary', fontWeight: 900 }}>
        Generate invoice
        <IconButton aria-label="Close invoice form" onClick={handleClose} size="small"><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5} sx={{ pt: 0.3 }}>
          {!membershipPlansLoading && membershipPlans.length > 0 && (
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={invoiceMode}
              aria-label="Invoice type"
              onChange={(_, value: 'products' | 'membership' | null) => value && setInvoiceModeOverride(value)}
            >
              <ToggleButton value="products">Products</ToggleButton>
              <ToggleButton value="membership">Membership</ToggleButton>
            </ToggleButtonGroup>
          )}

          {membershipPlansError && <Alert severity="error">{membershipPlansError}</Alert>}

          {invoiceMode === 'products' ? (
          <FormControl fullWidth size="small">
            {selectedCustomer ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, border: '1px solid var(--mui-palette-divider)', borderRadius: 2.8, px: 1.2, py: 1, backgroundColor: 'background.paper', minHeight: 62 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase' }}>Selected customer</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', whiteSpace: 'normal', lineHeight: 1.4, wordBreak: 'break-word' }}>
                    {selectedCustomer.fullName ?? 'Customer'}
                  </Typography>
                  {(selectedCustomer.email || selectedCustomer.phoneNumber) && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {selectedCustomer.email ?? ''}{selectedCustomer.email && selectedCustomer.phoneNumber ? ' • ' : ''}{selectedCustomer.phoneNumber ?? ''}
                    </Typography>
                  )}
                </Box>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    onCustomerSelection(null)
                    onInvoiceFieldChange('customerId', '')
                    onCustomerSearchChange('')
                  }}
                  sx={{ minWidth: 'auto', color: 'text.secondary', textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}
                >
                  Clear
                </Button>
              </Box>
            ) : (
              <Autocomplete
                options={customerSearchResults.length > 0 ? customerSearchResults : data.customers}
                value={selectedCustomer}
                inputValue={customerSearchText}
                onInputChange={(_, newValue, reason) => {
                  if (reason === 'reset') return
                  onCustomerSearchChange(newValue)
                }}
                onChange={(_, customer) => {
                  if (!customer) {
                    onCustomerSelection(null)
                    onInvoiceFieldChange('customerId', '')
                    onCustomerSearchChange('')
                    return
                  }

                  onCustomerSelection(customer)
                  onInvoiceFieldChange('customerId', String(customer.id))
                  onCustomerSearchChange('')
                }}
                loading={isCustomerSearching}
                filterOptions={(options) => options}
                getOptionLabel={getCustomerLabel}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => <TextField {...params} label="Search customer" placeholder="Name, email or mobile" sx={{ '& .MuiInputBase-root': { borderRadius: 2.4, backgroundColor: 'background.paper' } }} />}
                renderOption={(props, customer) => (
                  <Box component="li" {...props} key={customer.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{customer.fullName ?? 'Customer'}</Typography>
                    <Typography variant="caption" color="text.secondary">{customer.email ?? 'No email'}</Typography>
                    <Typography variant="caption" color="text.secondary">{customer.phoneNumber ?? 'No mobile number'}</Typography>
                  </Box>
                )}
                noOptionsText={isCustomerSearching ? 'Searching...' : 'No customer found'}
                clearOnEscape
                autoHighlight
                disablePortal
              />
            )}
          </FormControl>
          ) : (
            <Stack spacing={1}>
              <TextField
                select
                fullWidth
                size="small"
                label="Member subscription"
                value={selectedMembershipId}
                onChange={(event) => handleMembershipSelection(event.target.value)}
                disabled={membershipPlansLoading || billableMemberships.length === 0}
                helperText={membershipPlansLoading ? 'Loading membership plans…' : 'Select an enrolled member and plan to use its saved price.'}
              >
                {billableMemberships.map((membership) => {
                  const plan = membershipPlans.find((item) => item.id === membership.planId)
                  const customer = data.customers.find((item) => item.id === membership.customerId)
                  const memberName = customer?.fullName ?? customer?.firstName ?? `Member #${membership.customerId}`
                  const planName = membership.planName ?? plan?.name ?? 'Membership'
                  const price = membership.price ?? plan?.price ?? 0
                  const frequency = plan?.billingFrequency.toLowerCase().replaceAll('_', ' ')
                  const planLabel = frequency && !planName.toLowerCase().includes(frequency) ? `${planName} · ${frequency}` : planName
                  return <MenuItem key={membership.id} value={String(membership.id)}>{memberName} · {planLabel} · {formatMoney(price)}</MenuItem>
                })}
              </TextField>
              {!membershipPlansLoading && !membershipPlansError && billableMemberships.length === 0 && <Alert severity="info">There are no enrolled memberships to invoice for this business.</Alert>}
              <Alert severity="info">This creates a one-time invoice using the member’s saved plan price. Membership dates and automatic renewals are not changed.</Alert>
            </Stack>
          )}

          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 800 }}>{invoiceMode === 'membership' ? 'Invoice items' : 'Products'}</Typography>
            <Button size="small" startIcon={<Plus size={15} />} onClick={onAddItem} sx={{ textTransform: 'none' }}>{invoiceMode === 'membership' ? 'Add add-on' : 'Add product'}</Button>
          </Stack>

          <Stack spacing={1}>
            {invoiceForm.items.map((item, index) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 1.2, borderRadius: 1.5, boxShadow: 'none' }}>
                <Stack spacing={1}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>Product {index + 1}</Typography>
                    <IconButton aria-label={`Remove product ${index + 1}`} size="small" onClick={() => onRemoveItem(item.id)} disabled={invoiceForm.items.length <= 1} sx={{ color: 'error.main' }}><Trash2 size={15} /></IconButton>
                  </Stack>
                  <TextField size="small" label="Product name" value={item.productName} onChange={(event) => onInvoiceItemChange(item.id, 'productName', event.target.value)} fullWidth />
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
                    <TextField size="small" label="Quantity" type="number" value={item.quantity} onChange={(event) => onInvoiceItemChange(item.id, 'quantity', event.target.value)} slotProps={{ htmlInput: { min: 1, step: 1 } }} />
                    <TextField size="small" label="Unit price" type="number" value={item.unitPrice} onChange={(event) => onInvoiceItemChange(item.id, 'unitPrice', event.target.value)} slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }} />
                    <TextField size="small" label="GST %" type="number" value={item.gstRate} onChange={(event) => onInvoiceItemChange(item.id, 'gstRate', event.target.value)} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0.6, px: 0.5 }}>
            <Typography variant="body2" color="text.secondary">Subtotal</Typography><Typography variant="body2" sx={{ textAlign: 'right' }}>{formatMoney(totals.subtotal)}</Typography>
            <Typography variant="body2" color="text.secondary">GST</Typography><Typography variant="body2" sx={{ textAlign: 'right' }}>{formatMoney(totals.tax)}</Typography>
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 900 }}>Total</Typography><Typography variant="subtitle2" sx={{ color: 'text.primary', textAlign: 'right', fontWeight: 900 }}>{formatMoney(totals.subtotal + totals.tax)}</Typography>
          </Box>

          <TextField size="small" label="Due date" type="date" value={invoiceForm.dueDate} onChange={(event) => onInvoiceFieldChange('dueDate', event.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
          {invoiceMessage && <Alert severity={invoiceMessage.toLowerCase().includes('failed') || invoiceMessage.toLowerCase().includes('select') || invoiceMessage.toLowerCase().includes('enter') ? 'error' : 'success'}>{invoiceMessage}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Button onClick={() => onCreateInvoice('DRAFT')} disabled={isSubmitting} sx={{ fontWeight: 700 }}>Save draft</Button>
        <Button variant="contained" onClick={() => onCreateInvoice('SENT')} disabled={isSubmitting} endIcon={<ArrowRight size={15} />} sx={{ fontWeight: 800 }}>
          {isSubmitting ? 'Saving…' : 'Save & send'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
