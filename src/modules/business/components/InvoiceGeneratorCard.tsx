import { useEffect, useState } from 'react'
import { addCustomerToBusiness, type DashboardData } from '../../../services/api'
import { Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, IconButton, MenuItem, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { ArrowRight, CalendarClock, CheckCircle2, CircleDollarSign, PackagePlus, Plus, ReceiptText, Trash2, UserRound, X } from 'lucide-react'
import { fetchLoyaltyBalance, fetchLoyaltySettings, type LoyaltyProgramSettings } from '../../../services/api'
import { fetchBusinessMembershipPlans } from '../../../store/businessDashboardSlice'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { getBusinessProducts, type BusinessProduct } from '../../../services/api/billingApi'

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
  loyaltyPointsToRedeem: string
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
  invoiceMessageSeverity: 'error' | 'success'
  isSubmitting: boolean
  onClose: () => void
  onCustomerSearchChange: (value: string) => void
  onCustomerSelection: (customer: DashboardData['customers'][number] | null) => void
  onInvoiceFieldChange: (field: 'customerId' | 'dueDate' | 'loyaltyPointsToRedeem', value: string) => void
  onInvoiceItemChange: (id: string, field: InvoiceLineItemField, value: string) => void
  onAddItem: () => void
  onRemoveItem: (id: string) => void
  onCreateInvoice: (status: 'DRAFT' | 'SENT' | 'PAID', invoiceMode: 'products' | 'membership') => void
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
  invoiceMessageSeverity,
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
  const [productsState, setProductsState] = useState<{
    businessId: number
    products: BusinessProduct[]
    loading: boolean
    error: string
  } | null>(null)
  const [isBillPreviewOpen, setIsBillPreviewOpen] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [isAddingCustomer, setIsAddingCustomer] = useState(false)
  const [addCustomerMessage, setAddCustomerMessage] = useState('')
  const invoiceMode = invoiceModeOverride ?? (membershipPlans.length > 0 ? 'membership' : 'products')
  const currentProductsState = productsState?.businessId === businessId ? productsState : null
  const businessProducts = currentProductsState?.products ?? []
  const productsLoading = currentProductsState?.loading ?? false
  const productsError = currentProductsState?.error ?? ''

  const [loyaltyState, setLoyaltyState] = useState<{
    customerId: number
    balance: number
    settings: LoyaltyProgramSettings
  } | null>(null)
  const [loyaltyError, setLoyaltyError] = useState<{ customerId: number; message: string } | null>(null)

  useEffect(() => {
    if (!open || !selectedCustomer) return
    let isCurrent = true
    const customerId = selectedCustomer.id
    Promise.all([
      fetchLoyaltyBalance(businessId, customerId),
      fetchLoyaltySettings(businessId),
    ]).then(([balance, settings]) => {
      if (isCurrent) {
        setLoyaltyState({ customerId, balance: balance.balance, settings })
        setLoyaltyError(null)
      }
    }).catch((error) => {
      if (isCurrent) {
        setLoyaltyError({
          customerId,
          message: error instanceof Error ? error.message : 'Could not load this customer’s loyalty balance.',
        })
      }
    })
    return () => { isCurrent = false }
  }, [businessId, open, selectedCustomer])

  useEffect(() => {
    if (!open || !businessId) return
    if (!membershipPlanState?.loaded && !membershipPlanState?.loading) {
      void dispatch(fetchBusinessMembershipPlans(businessId))
    }
  }, [businessId, dispatch, membershipPlanState?.loaded, membershipPlanState?.loading, open])
  useEffect(() => {
  if (!open || !businessId) return

  let cancelled = false

  const loadProducts = async () => {
    setProductsState((current) => ({
      businessId,
      products: current?.businessId === businessId ? current.products : [],
      loading: true,
      error: '',
    }))

    try {
      const result = await getBusinessProducts(businessId)

      if (cancelled) return

      if (!result.ok) {
        setProductsState({
          businessId,
          products: [],
          loading: false,
          error: result.message ?? 'Could not load saved products.',
        })
        return
      }

      setProductsState({
        businessId,
        products: result.products.filter((product) => product.status === 'ACTIVE'),
        loading: false,
        error: '',
      })
    } catch (error) {
      if (!cancelled) {
        setProductsState({
          businessId,
          products: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Could not load saved products.',
        })
      }
    }
  }

  void loadProducts()

  return () => {
    cancelled = true
  }
}, [open, businessId])

  const handleClose = () => {
    setIsBillPreviewOpen(false)
    setInvoiceModeOverride(null)
    setSelectedMembershipId('')
    setPreviewError('')
    onInvoiceFieldChange('loyaltyPointsToRedeem', '0')
    onClose()
  }

  
const handleAddCustomer = async () => {
  const name = newCustomerName.trim()
  const phone = newCustomerPhone.trim()
  const email = newCustomerEmail.trim()

  if (!name || !phone) {
    setAddCustomerMessage('Enter the customer name and mobile number.')
    return
  }

  setIsAddingCustomer(true)
  setAddCustomerMessage('')

  try {
    const result = await addCustomerToBusiness(businessId, {
      name,
      phone,
      email: email || undefined,
    })

    if (!result.ok || !result.customer) {
      setAddCustomerMessage(result.message ?? 'Could not add this customer.')
      return
    }

    onCustomerSelection(result.customer)
    onInvoiceFieldChange('customerId', String(result.customer.id))
    onCustomerSearchChange('')

    setNewCustomerName('')
    setNewCustomerPhone('')
    setNewCustomerEmail('')
    setIsAddCustomerOpen(false)
    setAddCustomerMessage('')
  } catch {
    setAddCustomerMessage('Could not add this customer. Please try again.')
  } finally {
    setIsAddingCustomer(false)
  }
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
  
  const handleContinueToPreview = () => {
    if (!selectedCustomer) {
      setPreviewError('Select a customer before continuing.')
      return
    }

    if (
      invoiceForm.items.some(
        (item) =>
          !item.productName.trim() ||
          !Number.isFinite(Number(item.quantity)) ||
          Number(item.quantity) <= 0 ||
          !Number.isFinite(Number(item.unitPrice)) ||
          Number(item.unitPrice) <= 0 ||
          !Number.isFinite(Number(item.gstRate)) ||
          Number(item.gstRate) < 0
      )
    ) {
      setPreviewError('Complete each item with a name, quantity, price, and valid GST rate.')
      return
    }

    setPreviewError('')
    setIsBillPreviewOpen(true)
  }

  const business = data.businesses.find(
    (item) => item.id === businessId
  )
  const businessName =
    business?.businessName ??
    business?.name ??
    business?.companyName ??
    business?.legalName ??
    'Business'

  const billableMemberships = data.memberships.filter((membership) =>
    membership.businessId === businessId
      && membership.customerId != null
      && membership.planId != null
      && !['CANCELLED', 'RENEWED', 'SUSPENDED'].includes(membership.status ?? ''),
  )
  const currentLoyaltyState = selectedCustomer && loyaltyState?.customerId === selectedCustomer.id ? loyaltyState : null
  const currentLoyaltyError = selectedCustomer && loyaltyError?.customerId === selectedCustomer.id
    ? loyaltyError.message
    : ''
  const loyaltyPoints = Math.max(0, Math.floor(Number(invoiceForm.loyaltyPointsToRedeem) || 0))
  const loyaltySettings = currentLoyaltyState?.settings
  const loyaltyDiscount = loyaltySettings?.configured && loyaltySettings.pointsPerCurrencyUnit
    ? Math.min(
      loyaltyPoints / loyaltySettings.pointsPerCurrencyUnit,
      (totals.subtotal + totals.tax) * (Number(loyaltySettings.maxRedemptionPercent) / 100),
    )
    : 0

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
    onInvoiceFieldChange('loyaltyPointsToRedeem', '0')
    onCustomerSearchChange('')
    onInvoiceItemChange(invoiceForm.items[0].id, 'productName', itemName)
    if (savedPrice != null) onInvoiceItemChange(invoiceForm.items[0].id, 'unitPrice', String(savedPrice))
  }

  return (
    <>
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      scroll="paper"
      sx={{ '& .MuiDialog-paper': { borderRadius: { xs: 2.5, sm: 3.2 }, overflow: 'hidden', boxShadow: '0 24px 70px rgba(14, 45, 38, 0.24)' } }}
    >
      <DialogTitle sx={{ p: { xs: 0.8, sm: 1.2 }, bgcolor: '#f4f7f6' }}>
        <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', px: { xs: 1.3, sm: 2 }, py: 1.5, borderRadius: 2.4, color: '#fff', background: 'linear-gradient(120deg, #0F032D 0%, #4E2BCC 70%, #905BF4 120%)' }}>
          <Box sx={{ width: 40, height: 40, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1.6, bgcolor: 'rgba(255,255,255,0.14)' }}>
            <ReceiptText size={20} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.15 }}>Create invoice</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.78)' }}>Prepare a clear bill for your customer</Typography>
          </Box>
          <IconButton aria-label="Close invoice form" onClick={handleClose} size="small" sx={{ color: '#fff' }}><X size={19} /></IconButton>
        </Stack>
      </DialogTitle>
      {!isBillPreviewOpen ? (
      <DialogContent dividers sx={{ p: { xs: 1.4, sm: 2.4 }, bgcolor: '#f4f7f6' }}>
        <Stack spacing={1.8}>
          {!membershipPlansLoading && membershipPlans.length > 0 && (
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={invoiceMode}
              aria-label="Invoice type"
              onChange={(_, value: 'products' | 'membership' | null) => value && setInvoiceModeOverride(value)}
              sx={{
                p: 0.4,
                bgcolor: '#e7eeec',
                borderRadius: 2,
                '& .MuiToggleButton-root': { flex: 1, minHeight: 40, border: 0, borderRadius: '8px !important', color: 'text.secondary', fontWeight: 800, textTransform: 'none' },
                '& .Mui-selected': { bgcolor: 'background.paper !important', color: 'primary.main !important', boxShadow: '0 2px 7px rgba(20, 54, 48, 0.12)' },
              }}
            >
              <ToggleButton value="products">Products</ToggleButton>
              <ToggleButton value="membership">Membership</ToggleButton>
            </ToggleButtonGroup>
          )}

          {membershipPlansError && <Alert severity="error">{membershipPlansError}</Alert>}

          <Box>
            <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 0.9 }}>
              <Box sx={{ width: 25, height: 25, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: 'primary.main', color: '#fff' }}><UserRound size={14} /></Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>Customer</Typography>
            </Stack>
          {invoiceMode === 'products' ? (
          <FormControl fullWidth size="small">
            {selectedCustomer ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, border: '1px solid', borderColor: 'success.light', borderRadius: 2, px: 1.3, py: 1.1, background: 'linear-gradient(120deg, rgba(15, 139, 112, 0.07), rgba(15, 139, 112, 0.015))', minHeight: 68 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 850, letterSpacing: 0.4, textTransform: 'uppercase' }}>Selected customer</Typography>
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
                    onInvoiceFieldChange('loyaltyPointsToRedeem', '0')
                    onCustomerSearchChange('')
                  }}
                  sx={{ minWidth: 'auto', color: 'text.secondary', textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}
                >
                  Clear
                </Button>
              </Box>
            ) : (
                <Stack spacing={1}>
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
                    onInvoiceFieldChange('loyaltyPointsToRedeem', '0')
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
                renderInput={(params) => <TextField {...params} label="Search customer" placeholder="Name, email or mobile" sx={{ '& .MuiInputBase-root': { borderRadius: 1.8, backgroundColor: 'background.paper' } }} />}
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
                <Button
                fullWidth
                startIcon={<Plus size={16} />}
                onClick={() => {
                  setAddCustomerMessage('')
                  setIsAddCustomerOpen(true)
                }}
                sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
              >
                Add New Customer
              </Button>
              </Stack>
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
          </Box>

          {selectedCustomer && (
            <Stack spacing={0.8}>
              {currentLoyaltyError && <Alert severity="error">{currentLoyaltyError}</Alert>}
              {currentLoyaltyState?.settings.configured ? (
                <>
                  <Alert severity="info">
                    {selectedCustomer.fullName ?? 'Customer'} has {currentLoyaltyState.balance.toLocaleString('en-IN')} points with this business.
                    {' '}Rate: {currentLoyaltyState.settings.pointsPerCurrencyUnit} points = ₹1; cap: {currentLoyaltyState.settings.maxRedemptionPercent}% per purchase.
                  </Alert>
                  <TextField
                    size="small"
                    label="Loyalty points to redeem"
                    type="number"
                    value={invoiceForm.loyaltyPointsToRedeem}
                    onChange={(event) => onInvoiceFieldChange('loyaltyPointsToRedeem', event.target.value)}
                    slotProps={{ htmlInput: { min: 0, max: currentLoyaltyState.balance, step: 1 } }}
                    helperText={`Available: ${currentLoyaltyState.balance.toLocaleString('en-IN')} points`}
                  />
                </>
              ) : !currentLoyaltyError && (
                <Alert severity="info">This business has not enabled point redemption for this customer.</Alert>
              )}
            </Stack>
          )}

          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Box>
              <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 25, height: 25, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: 'primary.main', color: '#fff' }}><PackagePlus size={14} /></Box>
                <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 850 }}>{invoiceMode === 'membership' ? 'Invoice items' : 'Products & services'}</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, ml: 4 }}>Add the items included in this bill.</Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Plus size={15} />}
              onClick={onAddItem}
              sx={{ flexShrink: 0, px: 1.2, borderRadius: 1.8, fontWeight: 750, textTransform: 'none' }}
            >
              {invoiceMode === 'membership' ? 'Add add-on' : 'Add item'}
            </Button>
          </Stack>

          <Stack spacing={1}>
            {invoiceForm.items.map((item, index) => {
              const quantity = Number(item.quantity)
              const unitPrice = Number(item.unitPrice)
              const gstRate = Number(item.gstRate)
              const lineTotal = quantity > 0 && unitPrice > 0
                ? quantity * unitPrice * (1 + (gstRate >= 0 ? gstRate : 0) / 100)
                : 0
              return (
              <Paper key={item.id} variant="outlined" sx={{ p: { xs: 1.15, sm: 1.5 }, borderRadius: 2, boxShadow: '0 3px 12px rgba(20, 54, 48, 0.045)', borderColor: 'rgba(32, 54, 56, 0.12)' }}>
                <Stack spacing={1}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Chip size="small" label={`${index + 1}`.padStart(2, '0')} sx={{ height: 22, minWidth: 30, fontSize: 10, fontWeight: 850, bgcolor: 'action.hover' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>Item</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>Line total</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 850 }}>{formatMoney(lineTotal)}</Typography>
                      <IconButton aria-label={`Remove item ${index + 1}`} size="small" onClick={() => onRemoveItem(item.id)} disabled={invoiceForm.items.length <= 1} sx={{ ml: 0.2, color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'error.50' } }}><Trash2 size={15} /></IconButton>
                    </Stack>
                  </Stack>
                  <Autocomplete<BusinessProduct, false, false, true>
                    freeSolo
                    fullWidth
                    options={businessProducts}
                    loading={productsLoading}
                    value={item.productName}
                    getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                    isOptionEqualToValue={(option, value) => typeof value !== 'string' && option.id === value.id}
                    onInputChange={(_, value, reason) => {
                      if (reason === 'input' || reason === 'clear') {
                        onInvoiceItemChange(item.id, 'productName', value)
                      }
                    }}
                    onChange={(_, value) => {
                      if (typeof value === 'string') {
                        onInvoiceItemChange(item.id, 'productName', value)
                        return
                      }

                      if (!value) {
                        onInvoiceItemChange(item.id, 'productName', '')
                        return
                      }

                      onInvoiceItemChange(item.id, 'productName', value.name)
                      onInvoiceItemChange(item.id, 'unitPrice', String(value.price))
                      onInvoiceItemChange(item.id, 'gstRate', String(value.gstRate ?? 0))
                    }}
                    renderOption={(props, product) => (
                      <Box component="li" {...props} key={product.id}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{product.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            ₹{Number(product.price).toLocaleString('en-IN')}
                            {' · '}
                            {product.unit || 'Unit not specified'}
                            {' · GST '}
                            {product.gstRate ?? 0}%
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label={invoiceMode === 'membership' ? 'Add-on name' : 'Product or service'}
                        placeholder="Select a saved item or type a name"
                        helperText={
                          productsLoading
                            ? 'Loading saved products…'
                            : productsError
                              ? 'Saved products could not be loaded. You can still enter an item manually.'
                              : businessProducts.length === 0
                                ? 'No saved products available. Enter an item name manually.'
                                : 'Select a saved item to fill its price and GST, or type manually.'
                        }
                      />
                    )}
                  />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr 0.85fr', gap: { xs: 0.7, sm: 1 } }}>
                    <TextField size="small" label="Qty" type="number" value={item.quantity} onChange={(event) => onInvoiceItemChange(item.id, 'quantity', event.target.value)} slotProps={{ htmlInput: { min: 1, step: 1 } }} />
                    <TextField size="small" label="Unit price" type="number" value={item.unitPrice} onChange={(event) => onInvoiceItemChange(item.id, 'unitPrice', event.target.value)} slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }} />
                    <TextField size="small" label="GST %" type="number" value={item.gstRate} onChange={(event) => onInvoiceItemChange(item.id, 'gstRate', event.target.value)} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
                  </Box>
                </Stack>
              </Paper>
              )
            })}
          </Stack>

          <Paper variant="outlined" sx={{ p: { xs: 1.4, sm: 1.8 }, borderRadius: 2.2, borderColor: 'rgba(32, 54, 56, 0.12)', boxShadow: '0 4px 14px rgba(20, 54, 48, 0.045)' }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 0.3 }}>
                <Box sx={{ width: 25, height: 25, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: 'primary.main', color: '#fff' }}><CircleDollarSign size={14} /></Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>Invoice summary</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Subtotal</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(totals.subtotal)}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">GST</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(totals.tax)}</Typography>
              </Stack>
              {loyaltyDiscount > 0 && (
                <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="body2" color="success.main">Loyalty discount ({loyaltyPoints} points)</Typography>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 750 }}>−{formatMoney(loyaltyDiscount)}</Typography>
                </Stack>
              )}
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 0.4, pt: 1.1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>{invoiceForm.dueDate ? 'Amount due' : 'Amount paid'}</Typography>
                  <Typography variant="caption" color="text.secondary">Including applicable taxes</Typography>
                </Box>
                <Typography variant="h5" color="primary.main" sx={{ fontWeight: 900, letterSpacing: '-0.04em' }}>{formatMoney(totals.subtotal + totals.tax - loyaltyDiscount)}</Typography>
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 1.4, sm: 1.8 }, borderRadius: 2.2, borderColor: invoiceForm.dueDate ? 'warning.light' : 'success.light', bgcolor: invoiceForm.dueDate ? 'rgba(183, 121, 31, 0.035)' : 'rgba(22, 132, 95, 0.035)' }}>
            <Stack direction="row" spacing={0.9} sx={{ alignItems: 'center', mb: 1 }}>
              <Box sx={{ width: 25, height: 25, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: invoiceForm.dueDate ? 'warning.main' : 'success.main', color: '#fff' }}><CalendarClock size={14} /></Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>Payment timing</Typography>
                <Typography variant="caption" color="text.secondary">Choose whether this bill is already paid or due later.</Typography>
              </Box>
              <Chip
                size="small"
                icon={invoiceForm.dueDate ? <CalendarClock size={13} /> : <CheckCircle2 size={13} />}
                label={invoiceForm.dueDate ? 'Pending' : 'Paid'}
                color={invoiceForm.dueDate ? 'warning' : 'success'}
                sx={{ fontWeight: 800 }}
              />
            </Stack>
            <TextField
              size="small"
              label="Due date (optional)"
              type="date"
              value={invoiceForm.dueDate}
              onChange={(event) => onInvoiceFieldChange('dueDate', event.target.value)}
              helperText={invoiceForm.dueDate ? `This invoice will be pending and due on ${invoiceForm.dueDate}.` : 'Leave blank to record this invoice as paid.'}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.7, bgcolor: 'background.paper' } }}
            />
          </Paper>
          {previewError && <Alert severity="error">{previewError}</Alert>}
          {invoiceMessage && <Alert severity={invoiceMessageSeverity}>{invoiceMessage}</Alert>}
        </Stack>
          </DialogContent>
    ) : (
      <DialogContent dividers>
         <Paper
          variant="outlined"
          sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, boxShadow: 'none' }}
        >
         
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            {businessName}
          </Typography>

          {business?.businessType && (
            <Typography variant="body2" color="text.secondary">
              {business.businessType}
            </Typography>
          )}

          {business?.address && (
            <Typography variant="body2" color="text.secondary">
              {business.address}
            </Typography>
          )}

          {(business?.city || business?.region || business?.country) && (
            <Typography variant="body2" color="text.secondary">
              {[business.city, business.region, business.country]
                .filter(Boolean)
                .join(', ')}
            </Typography>
          )}

          {business?.phone && (
            <Typography variant="body2">
              Phone: {business.phone}
            </Typography>
          )}

          {business?.email && (
            <Typography variant="body2">
              Email: {business.email}
            </Typography>
          )}

          {business?.gstin && (
            <Typography variant="body2">
              GSTIN: {business.gstin}
            </Typography>
          )}

          {business?.pan && (
            <Typography variant="body2">
              PAN: {business.pan}
            </Typography>
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
          INVOICE
        </Typography>


          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Bill summary
          </Typography>

          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', my: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
            Bill To
          </Typography>

          <Typography variant="body2">
            {selectedCustomer?.fullName ?? 'No customer selected'}
          </Typography>

          {selectedCustomer?.phoneNumber && (
            <Typography variant="body2" color="text.secondary">
              {selectedCustomer.phoneNumber}
            </Typography>
          )}

          {selectedCustomer?.email && (
            <Typography variant="body2" color="text.secondary">
              {selectedCustomer.email}
            </Typography>
          )}

          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {invoiceMode === 'membership' ? 'Due date' : 'Invoice date'}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {invoiceForm.dueDate || 'Not selected'}
            </Typography>
          </Box>

          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', my: 2 }} />

          <Stack spacing={1.5}>
            {invoiceForm.items.map((item, index) => {
              const quantity = Number(item.quantity) || 0
              const unitPrice = Number(item.unitPrice) || 0
              const gstRate = Number(item.gstRate) || 0
              const amount = quantity * unitPrice
              const tax = amount * gstRate / 100

              return (
                <Box
                  key={item.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 1,
                    pb: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {item.productName.trim() || `Item ${index + 1}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {quantity} × {formatMoney(unitPrice)} · GST {gstRate}%
                    </Typography>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, textAlign: 'right' }}
                  >
                    {formatMoney(amount + tax)}
                  </Typography>
                </Box>
              )
            })}
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 1,
              mt: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Subtotal
            </Typography>
            <Typography variant="body2">
              {formatMoney(totals.subtotal)}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              GST
            </Typography>
            <Typography variant="body2">
              {formatMoney(totals.tax)}
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Total
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              {formatMoney(totals.subtotal + totals.tax)}
            </Typography>
          </Box>
        </Paper>
      </DialogContent>
      )}
      <DialogActions sx={{ px: { xs: 1.2, sm: 2.2 }, py: 1.2, gap: 0.8, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', '& .MuiButton-root': { minHeight: 40, borderRadius: 1.8, fontWeight: 800, textTransform: 'none', whiteSpace: 'nowrap' } }}>
        {!isBillPreviewOpen ? (
          <>
            <Button onClick={handleClose} color="inherit" sx={{ px: { xs: 0.8, sm: 1.5 } }}>Cancel</Button>
            <Box sx={{ flex: 1 }} />
            <Button onClick={() => onCreateInvoice('DRAFT', invoiceMode)} disabled={isSubmitting} variant="outlined" sx={{ px: { xs: 1, sm: 1.8 } }}>Save draft</Button>
            <Button
              variant="contained"
              onClick={handleContinueToPreview}
              disabled={isSubmitting}
              endIcon={<ArrowRight size={15} />}
              sx={{ px: { xs: 1, sm: 2 }, fontSize: { xs: 10, sm: 13 }, boxShadow: '0 5px 12px rgba(8, 123, 101, 0.2)' }}
            >
              Continue
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setIsBillPreviewOpen(false)} color="inherit" sx={{ px: { xs: 0.8, sm: 1.5 } }}>Back to edit</Button>
            <Box sx={{ flex: 1 }} />
            <Button onClick={() => onCreateInvoice('DRAFT', invoiceMode)} disabled={isSubmitting} variant="outlined" sx={{ px: { xs: 1, sm: 1.8 } }}>Save draft</Button>
            <Button
              variant="contained"
              onClick={() => onCreateInvoice(invoiceForm.dueDate ? 'SENT' : 'PAID', invoiceMode)}
              disabled={isSubmitting}
              endIcon={<ArrowRight size={15} />}
              sx={{ px: { xs: 1, sm: 2 }, fontSize: { xs: 10, sm: 13 }, boxShadow: '0 5px 12px rgba(8, 123, 101, 0.2)' }}
            >
              {isSubmitting ? 'Saving…' : invoiceForm.dueDate ? 'Create pending invoice' : 'Create paid invoice'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>

    <Dialog
      open={isAddCustomerOpen}
      onClose={() => {
        if (!isAddingCustomer) setIsAddCustomerOpen(false)
      }}
      fullWidth
      maxWidth="xs"
    >
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault()
          void handleAddCustomer()
        }}
      >
        <DialogTitle>Add New Customer</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {addCustomerMessage && (
              <Alert severity="error">{addCustomerMessage}</Alert>
            )}

            <TextField
              autoFocus
              required
              fullWidth
              label="Customer name"
              value={newCustomerName}
              onChange={(event) => setNewCustomerName(event.target.value)}
            />

            <TextField
              required
              fullWidth
              label="Mobile number"
              type="tel"
              value={newCustomerPhone}
              onChange={(event) => setNewCustomerPhone(event.target.value)}
            />

            <TextField
              fullWidth
              label="Email address (optional)"
              type="email"
              value={newCustomerEmail}
              onChange={(event) => setNewCustomerEmail(event.target.value)}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button
            onClick={() => setIsAddCustomerOpen(false)}
            disabled={isAddingCustomer}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={isAddingCustomer}
          >
            {isAddingCustomer ? 'Adding...' : 'Add customer'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
    
  </>
  )
}
