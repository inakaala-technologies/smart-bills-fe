import { useCallback, useEffect, useState } from 'react'
import { Box, Container, Paper, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import type { LocationValue } from '../../components/LocationPicker'
import { createBusiness, createInvoice, searchCustomers, updateInvoiceStatus, type DashboardData } from '../../services/api'
import { addProfile, getCurrentUser, logoutUser, switchAccount, type Role } from '../../services/auth'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import type { RootState } from '../../store/store'
import { fetchBusinessDashboard, fetchBusinessSummary, setActiveTab, setSelectedBusinessId } from '../../store/businessDashboardSlice'
import { setAuthUser } from '../../store/authSlice'
import { AppointmentListCard } from './components/AppointmentListCard'
import { AppointmentServiceManager } from './components/AppointmentServiceManager'
import { BottomNavBar } from './components/BottomNavBar'
import { BusinessMenu } from './components/BusinessMenu'
import { BusinessOverview } from './components/BusinessOverview'
import { BusinessDashboardOverview } from './components/BusinessDashboardOverview'
import { BusinessProfileCard } from './components/BusinessProfileCard'
import { BusinessOffersWorkspace } from './components/BusinessOffersWorkspace'
import { CustomerListCard } from './components/CustomerListCard'
import { InvoiceGeneratorCard, type BusinessInvoiceForm, type InvoiceLineItemForm } from './components/InvoiceGeneratorCard'
import { InvoiceListPanel } from './components/InvoiceListPanel'
import { MembershipWorkspace } from './components/MembershipWorkspace'
import { CustomerRetentionWorkspace } from './components/CustomerRetentionWorkspace'
import { BusinessInsightsWorkspace } from './components/BusinessInsightsWorkspace'
import { AddCustomerDialog } from './components/AddCustomerDialog'
import { SendMembershipNotificationDialog } from './components/SendMembershipNotificationDialog'
import type { QuickActionId } from './components/QuickActionGrid'
import { normalizeBusinessType } from '../../constants/businessTypes'
import { v4 as uuidv4 } from 'uuid';

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

function defaultDueDate() {
  const dueDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
  return dueDate.toISOString().slice(0, 10)
}

export function BusinessDashboard() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const authUser = getCurrentUser()
  const accountRoles = new Set((authUser?.accounts ?? []).map((account) => account.role).concat(authUser?.role ?? 'BUSINESS'))
  const availableAccounts = (authUser?.accounts ?? []).filter((account) => account.role !== authUser?.role)
  const missingProfileRoles = (['BUSINESS', 'CUSTOMER'] as Role[]).filter((role) => role !== authUser?.role && !accountRoles.has(role))
  const { data, activeTab, selectedBusinessId } = useAppSelector((state: RootState) => state.businessDashboard)

  const selectedBusiness = data.businesses.find((business) => business.id === selectedBusinessId) ?? data.businesses[0] ?? null

  const createInvoiceItem = (): InvoiceLineItemForm => ({
    id: uuidv4(),
    productName: '',
    quantity: '1',
    unitPrice: '0',
    gstRate: '18',
  })
  const [invoiceForm, setInvoiceForm] = useState<BusinessInvoiceForm>(() => ({
    customerId: data.customers[0]?.id ?? '',
    dueDate: defaultDueDate(),
    items: [createInvoiceItem()],
  }))
  const [invoiceMessage, setInvoiceMessage] = useState('')
  const [isInvoiceSubmitting, setIsInvoiceSubmitting] = useState(false)
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false)
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const isMenuOpen = Boolean(menuAnchorEl)
  const [businessForm, setBusinessForm] = useState({
    name: selectedBusiness?.businessName ?? selectedBusiness?.name ?? '',
    legalName: selectedBusiness?.name ?? '',
    email: selectedBusiness?.email && selectedBusiness.email.trim() ? selectedBusiness.email : authUser?.email ?? '',
    phone: '',
    address: '',
    businessType: normalizeBusinessType(selectedBusiness?.businessType),
  })
  const [businessLocation, setBusinessLocation] = useState<LocationValue>({ locationAddress: '', latitude: null, longitude: null })
  const [businessMessage, setBusinessMessage] = useState('')
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false)
  const [customerSearchText, setCustomerSearchText] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState<typeof data.customers>([])
  const [isCustomerSearching, setIsCustomerSearching] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<DashboardData['customers'][number] | null>(null)
  const [previousSelectedBusiness, setPreviousSelectedBusiness] = useState(selectedBusiness)

  const refreshBusinessForm = useCallback((business: NonNullable<typeof selectedBusiness>) => {
    const userEmail = authUser?.email ?? ''
    setBusinessForm({
      name: business.businessName ?? business.name ?? '',
      legalName: business.legalName ?? business.name ?? business.businessName ?? '',
      email: business.email && business.email.trim() ? business.email : userEmail,
      phone: business.phone ?? '',
      address: business.address ?? '',
      businessType: normalizeBusinessType(business.businessType),
    })
    setBusinessLocation({
      locationAddress: business.address ?? '',
      latitude: business.latitude ?? null,
      longitude: business.longitude ?? null,
    })
  }, [authUser?.email])

  if (selectedBusiness !== previousSelectedBusiness) {
    setPreviousSelectedBusiness(selectedBusiness)
    if (selectedBusiness) refreshBusinessForm(selectedBusiness)
  }

  const handleQuickAction = (action: QuickActionId) => {
    if (action === 'invoice') {
      setInvoiceMessage('')
      dispatch(setActiveTab('invoices'))
      setIsInvoiceFormOpen(true)
    } else if (action === 'customer') {
      setIsAddCustomerOpen(true)
    } else if (action === 'membership') {
      dispatch(setActiveTab('memberships'))
    } else {
      setIsNotificationDialogOpen(true)
    }
  }

  useEffect(() => {
    if (selectedBusiness) dispatch(fetchBusinessSummary(selectedBusiness.id))
  }, [dispatch, selectedBusiness])

  useEffect(() => {
    if (!data.businesses.length || selectedBusinessId !== null) return
    dispatch(setSelectedBusinessId(data.businesses[0].id))
  }, [data.businesses, dispatch, selectedBusinessId])

  useEffect(() => {
    const query = customerSearchText.trim()

    if (!query) {
      return
    }

    let isCancelled = false
    const timer = window.setTimeout(async () => {
      setIsCustomerSearching(true)
      const results = await searchCustomers(query)
      if (isCancelled) {
        return
      }

      const filteredFallback = data.customers.filter((customer) => {
        const haystack = [
          customer.fullName ?? '',
          customer.email ?? '',
          customer.phoneNumber ?? '',
        ].join(' ').toLowerCase()
        return haystack.includes(query.toLowerCase())
      })

      setCustomerSearchResults(results.length > 0 ? results : filteredFallback)
      setIsCustomerSearching(false)
    }, 250)

    return () => {
      isCancelled = true
      window.clearTimeout(timer)
      setIsCustomerSearching(false)
    }
  }, [customerSearchText, data.customers])

  const handleInvoiceInput = (field: 'customerId' | 'dueDate', value: string) => {
    setInvoiceForm((current) => ({ ...current, [field]: value }))
  }

  const handleInvoiceItemChange = (id: string, field: keyof Omit<InvoiceLineItemForm, 'id'>, value: string) => {
    setInvoiceForm((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, [field]: value } : item) }))
  }

  const handleAddInvoiceItem = () => {
    setInvoiceForm((current) => ({ ...current, items: [...current.items, createInvoiceItem()] }))
  }

  const handleRemoveInvoiceItem = (id: string) => {
    setInvoiceForm((current) => ({ ...current, items: current.items.length > 1 ? current.items.filter((item) => item.id !== id) : current.items }))
  }

  const handleBusinessFieldChange = (field: 'name' | 'legalName' | 'phone' | 'address' | 'businessType', value: string) => {
    setBusinessForm((current) => ({ ...current, [field]: value }))
    if (field === 'address') setBusinessLocation((current) => ({ ...current, locationAddress: value }))
  }

  const handleBusinessLocationChange = (location: LocationValue) => {
    setBusinessLocation(location)
    setBusinessForm((current) => ({ ...current, address: location.locationAddress }))
  }

  const handleSaveBusinessProfile = async () => {
    const name = businessForm.name.trim()
    const email = businessForm.email.trim()

    if (!name) {
      setBusinessMessage('Business name is required.')
      return
    }
    if (!businessForm.businessType) {
      setBusinessMessage('Select a business type.')
      return
    }
    if (!businessLocation.country || !businessLocation.region || !businessLocation.city) {
      setBusinessMessage('Select a country, state or region, and city or town for the business location.')
      return
    }

    const currentUser = getCurrentUser()
    setIsCreatingBusiness(true)
    setBusinessMessage('')

    const result = await createBusiness({
      name,
      legalName: businessForm.legalName || name,
      businessType: businessForm.businessType,
      email: email || undefined,
      phone: businessForm.phone || undefined,
      address: [businessLocation.city, businessLocation.region, businessLocation.country].join(', '),
      country: businessLocation.country,
      region: businessLocation.region,
      city: businessLocation.city,
      latitude: businessLocation.latitude,
      longitude: businessLocation.longitude,
      status: 'ACTIVE',
      tenantId: currentUser?.tenantId ?? 1,
    })

    if (!result.ok || !result.business) {
      setBusinessMessage(result.message ?? 'Could not save business details.')
      setIsCreatingBusiness(false)
      return
    }

    const savedBusiness = result.business
    const fixedEmail = authUser?.email ?? savedBusiness.email ?? email
    setBusinessForm({
      name: savedBusiness.businessName ?? savedBusiness.name ?? name,
      legalName: savedBusiness.name ?? (businessForm.legalName || name),
      email: fixedEmail,
      phone: businessForm.phone,
      address: businessForm.address,
      businessType: normalizeBusinessType(savedBusiness.businessType ?? businessForm.businessType),
    })
    setBusinessLocation({
      locationAddress: savedBusiness.address ?? businessForm.address,
      latitude: savedBusiness.latitude ?? null,
      longitude: savedBusiness.longitude ?? null,
    })

    if (savedBusiness.id) {
      dispatch(setSelectedBusinessId(savedBusiness.id))
    }

    setBusinessMessage('Business profile saved successfully.')
    setIsCreatingBusiness(false)
    dispatch(fetchBusinessDashboard(savedBusiness.id ?? undefined))
    dispatch(setActiveTab('overview'))
  }

  const handleCreateInvoice = async (status: 'DRAFT' | 'SENT') => {
    const businessId = selectedBusinessId ?? selectedBusiness?.id ?? data.businesses[0]?.id
    const customerId = Number(invoiceForm.customerId)
    const items = invoiceForm.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      gstRate: Number(item.gstRate),
    }))

    if (!businessId || !customerId) {
      setInvoiceMessage('Select a customer before generating an invoice.')
      return
    }

    if (items.some((item) => !item.productName.trim() || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice <= 0 || !Number.isFinite(item.gstRate) || item.gstRate < 0)) {
      setInvoiceMessage('Enter a product name, positive quantity and price, and a valid GST rate for every product.')
      return
    }

    const subtotal = Number(items.reduce((total, item) => total + item.quantity * item.unitPrice, 0).toFixed(2))
    const gstAmount = Number(items.reduce((total, item) => total + item.quantity * item.unitPrice * (item.gstRate / 100), 0).toFixed(2))
    const totalAmount = Number((subtotal + gstAmount).toFixed(2))
    const issueDate = new Date().toISOString().slice(0, 10)

    setIsInvoiceSubmitting(true)
    try {
      const result = await createInvoice({
        businessId,
        customerId,
        invoiceNumber: `INV-${Date.now()}`,
        issueDate,
        dueDate: invoiceForm.dueDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
        subtotal,
        gstAmount,
        totalAmount,
        status,
      })

      if (!result.ok) {
        setInvoiceMessage(result.message ?? 'Invoice generation failed.')
        return
      }

      setInvoiceMessage(status === 'DRAFT'
        ? `Invoice ${result.invoice?.invoiceNumber ?? 'draft'} saved as a draft.`
        : `Invoice ${result.invoice?.invoiceNumber ?? 'generated'} sent to the selected customer.`)
      setInvoiceForm((current) => ({ ...current, customerId: '', items: [createInvoiceItem()] }))
      setSelectedCustomer(null)
      setCustomerSearchText('')
      dispatch(fetchBusinessDashboard(businessId))
    } catch (error) {
      setInvoiceMessage(error instanceof Error ? error.message : 'Invoice generation failed.')
    } finally {
      setIsInvoiceSubmitting(false)
    }
  }

  const handleInvoiceStatusChange = async (invoiceId: number, status: 'SENT' | 'PAID') => {
    const result = await updateInvoiceStatus(invoiceId, status)
    if (result.ok && selectedBusinessId) {
      dispatch(fetchBusinessDashboard(selectedBusinessId))
    }
    return result
  }

  const handleOpenCustomer = (customerId: number) => {
    navigate(`/customer/${customerId}`)
  }

  const invoiceRows = data.invoices.map((invoice) => {
    const customer = data.customers.find((item) => item.id === invoice.customerId)
    const customerName = customer?.fullName ?? 'Customer'
    const initials = customerName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'C'
    const invoiceDate = invoice.issueDate ? new Date(invoice.issueDate) : null

    return {
      id: invoice.id,
      customerName,
      customerEmail: customer?.email,
      invoiceNumber: invoice.invoiceNumber ?? `INV-${invoice.id}`,
      status: invoice.status ?? 'SENT',
      dueDate: invoice.dueDate,
      amount: formatCurrency(invoice.totalAmount),
      date: invoiceDate && !Number.isNaN(invoiceDate.getTime())
        ? invoiceDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : '—',
      badge: initials,
    }
  })

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        height: '100dvh',
        minHeight: 0,
        backgroundColor: 'background.default',
        py: { xs: 0, sm: 4 },
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <Container maxWidth="xs" disableGutters sx={{ px: 0 }}>
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 412,
            mx: 'auto',
            height: { xs: '100dvh', sm: 'calc(100dvh - 64px)' },
            maxHeight: { xs: '100dvh', sm: 'calc(100dvh - 64px)' },
            borderRadius: { xs: 0, sm: '24px' },
            backgroundColor: 'background.paper',
            border: '1px solid var(--mui-palette-divider)',
            boxShadow: '0 18px 46px rgba(0, 0, 0, 0.18)',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <AppHeader
            authUser={authUser}
            contextLabel={selectedBusiness?.businessName ?? selectedBusiness?.name ?? 'Business workspace'}
            roleLabel="Business Owner"
            menuId="business-menu"
            isMenuOpen={isMenuOpen}
            onOpenMenu={(event) => setMenuAnchorEl(event.currentTarget)}
          />

          <Box sx={{ px: { xs: 2, sm: 2.2 }, pt: { xs: 2, sm: 2.2 }, pb: 'calc(96px + env(safe-area-inset-bottom))', flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain' }}>
            <Stack spacing={1.6}>
              <BusinessMenu
                activeTab={activeTab}
                anchorEl={menuAnchorEl}
                isOpen={isMenuOpen}
                onClose={() => setMenuAnchorEl(null)}
                onChangeTab={(tab) => dispatch(setActiveTab(tab))}
                currentRole={authUser?.role ?? 'BUSINESS'}
                availableAccounts={availableAccounts}
                missingProfileRoles={missingProfileRoles}
                onSwitchAccount={(role: Role) => {
                  const updated = switchAccount(role)
                  if (updated) {
                    dispatch(setAuthUser(updated))
                    setMenuAnchorEl(null)
                    navigate('/dashboard')
                    window.location.reload()
                  }
                }}
                onAddProfile={(role: Role) => {
                  const updated = addProfile(role)
                  if (updated) {
                    dispatch(setAuthUser(updated))
                    setMenuAnchorEl(null)
                    navigate('/dashboard')
                    window.location.reload()
                  }
                }}
                onLogout={() => {
                  logoutUser()
                  navigate('/')
                }}
              />

            {activeTab === 'overview' && <BusinessDashboardOverview onQuickAction={handleQuickAction} hasBusiness={Boolean(selectedBusiness)} />}

            {activeTab === 'businesses' && (
              <BusinessOverview
                onOpenBusiness={(businessId) => {
                dispatch(setSelectedBusinessId(businessId))
                navigate(`/business/${businessId}`)
              }}
              />
            )}

            {activeTab === 'offers' && (
              selectedBusiness ? (
                <BusinessOffersWorkspace
                  key={selectedBusiness.id}
                  businessId={selectedBusiness.id}
                  businessName={selectedBusiness.businessName ?? selectedBusiness.name ?? 'your business'}
                  hasMappedLocation={selectedBusiness.latitude != null && selectedBusiness.longitude != null}
                />
              ) : (
                <Typography color="text.secondary">Create or select a business profile before posting offers.</Typography>
              )
            )}

            {activeTab === 'invoices' && (
              <Stack spacing={1.6}>
                <InvoiceListPanel
                  invoiceRows={invoiceRows}
                  onBack={() => dispatch(setActiveTab('overview'))}
                  onCreateInvoice={() => {
                    setInvoiceMessage('')
                    setIsInvoiceFormOpen(true)
                  }}
                  onUpdateStatus={handleInvoiceStatusChange}
                />

                <InvoiceGeneratorCard
                  open={isInvoiceFormOpen}
                  businessId={selectedBusinessId ?? selectedBusiness?.id ?? data.businesses[0]?.id ?? 0}
                  data={data}
                  selectedCustomer={selectedCustomer}
                  customerSearchText={customerSearchText}
                  customerSearchResults={customerSearchText.trim() ? customerSearchResults : data.customers}
                  isCustomerSearching={isCustomerSearching}
                  invoiceForm={invoiceForm}
                  invoiceMessage={invoiceMessage}
                  isSubmitting={isInvoiceSubmitting}
                  onClose={() => setIsInvoiceFormOpen(false)}
                  onCustomerSearchChange={setCustomerSearchText}
                  onCustomerSelection={(customer) => {
                    setSelectedCustomer(customer)
                    if (customer) {
                      handleInvoiceInput('customerId', String(customer.id))
                    }
                  }}
                  onInvoiceFieldChange={handleInvoiceInput}
                  onInvoiceItemChange={handleInvoiceItemChange}
                  onAddItem={handleAddInvoiceItem}
                  onRemoveItem={handleRemoveInvoiceItem}
                  onCreateInvoice={(status) => void handleCreateInvoice(status)}
                />
              </Stack>
            )}

            {activeTab === 'customers' && <CustomerListCard customers={data.customers} onOpenCustomer={handleOpenCustomer} />}

            {activeTab === 'retention' && selectedBusiness && (
              <CustomerRetentionWorkspace
                key={selectedBusiness.id}
                businessId={selectedBusiness.id}
                businessName={selectedBusiness.businessName ?? selectedBusiness.name ?? 'your business'}
                hasMappedLocation={selectedBusiness.latitude != null && selectedBusiness.longitude != null}
                data={data}
                onUpdated={() => dispatch(fetchBusinessDashboard(selectedBusiness.id))}
              />
            )}

            {activeTab === 'insights' && selectedBusiness && <BusinessInsightsWorkspace key={selectedBusiness.id} businessId={selectedBusiness.id} />}

            {activeTab === 'memberships' && selectedBusiness && (
              <MembershipWorkspace
                key={selectedBusiness.id}
                businessId={selectedBusiness.id}
                memberships={data.memberships}
                customers={data.customers}
                onUpdated={() => dispatch(fetchBusinessDashboard(selectedBusiness.id))}
              />
            )}

            {activeTab === 'appointments' && (
              <Stack spacing={1.6}>
                {selectedBusiness && (
                  <AppointmentServiceManager
                    key={selectedBusiness.id}
                    businessId={selectedBusiness.id}
                    appointmentsEnabled={selectedBusiness.appointmentsEnabled ?? false}
                    onConfigurationChanged={() => dispatch(fetchBusinessDashboard(selectedBusiness.id))}
                  />
                )}
                <AppointmentListCard
                  businessId={selectedBusinessId ?? selectedBusiness?.id ?? 0}
                  appointments={data.appointments}
                  customers={data.customers}
                  onUpdated={() => dispatch(fetchBusinessDashboard(selectedBusinessId ?? undefined))}
                />
              </Stack>
            )}

            {activeTab === 'profile' && (
              <BusinessProfileCard
                authUser={authUser}
                businessForm={businessForm}
                  location={businessLocation}
                profileId={selectedBusiness?.profileId}
                isCreatingBusiness={isCreatingBusiness}
                businessMessage={businessMessage}
                onBusinessFieldChange={handleBusinessFieldChange}
                  onLocationChange={handleBusinessLocationChange}
                onSave={handleSaveBusinessProfile}
              />
            )}
          </Stack>
        </Box>

        {selectedBusiness && (
          <>
            <AddCustomerDialog
              open={isAddCustomerOpen}
              businessId={selectedBusiness.id}
              onClose={() => setIsAddCustomerOpen(false)}
              onCreated={() => dispatch(fetchBusinessDashboard(selectedBusiness.id))}
            />
            <SendMembershipNotificationDialog
              open={isNotificationDialogOpen}
              businessId={selectedBusiness.id}
              memberships={data.memberships}
              customers={data.customers}
              onClose={() => setIsNotificationDialogOpen(false)}
            />
          </>
        )}

        <BottomNavBar activeTab={activeTab} onChangeTab={(tab) => dispatch(setActiveTab(tab))} />
      </Paper>
    </Container>
  </Box>
  )
}
