import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Box, Button, Container, Drawer, Paper, Snackbar, Stack, Typography } from '@mui/material'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { AppointmentDetailDialog } from '../../components/AppointmentDetailDialog'
import type { LocationValue } from '../../components/LocationPicker'
import {
  createBusiness,
  createInvoice,
  fetchAppointmentById,
  fetchAppointmentStaff,
  searchCustomers,
  setBusinessAppointmentsEnabled,
  setBusinessMembershipsEnabled,
  setBusinessPayslipsEnabled,
  setBusinessHomeServicesEnabled,
  setBusinessHomeVisitCharge,
  updateAppointmentStaff,
  updateAppointmentStatus,
  updateInvoiceStatus,
  type AppointmentStaffOption,
  type AppointmentStatus,
  type AppointmentSummary,
  type DashboardData,
} from '../../services/api'
import { addProfile, getCurrentUser, logoutUser, switchAccount, type Role } from '../../services/auth'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import type { RootState } from '../../store/store'
import { ArrowLeft, Search } from 'lucide-react'
import { BusinessProductsSection } from './components/BusinessProductsSection'
import { getBusinessProducts } from '../../services/api/billingApi'
import { fetchBusinessDashboard, fetchBusinessSummary, setActiveTab,setBusinessFeatures, setBusinessHomeVisitCharge as setBusinessHomeVisitChargeAction, setSelectedBusinessId } from '../../store/businessDashboardSlice'
import { setAuthUser } from '../../store/authSlice'
import { getDashboardPath } from '../../routes/dashboardPaths'
import { AppointmentListCard } from './components/AppointmentListCard'
import { AppointmentServiceManager } from './components/AppointmentServiceManager'
import { BottomNavBar } from './components/BottomNavBar'
import { BusinessOverview } from './components/BusinessOverview'
import { BusinessDashboardOverview } from './components/BusinessDashboardOverview'
import { BusinessProfileMenuPage } from './components/BusinessProfileMenuPage'
import { BusinessProfileCard } from './components/BusinessProfileCard'
import { BusinessOffersWorkspace } from './components/BusinessOffersWorkspace'
import { CustomerListCard } from './components/CustomerListCard'
import { InvoiceGeneratorCard, type BusinessInvoiceForm, type InvoiceLineItemForm } from './components/InvoiceGeneratorCard'
import { InvoiceListPanel } from './components/InvoiceListPanel'
import { MembershipWorkspace } from './components/MembershipWorkspace'
import { CustomerRetentionWorkspace } from './components/CustomerRetentionWorkspace'
import { CallbackRequestsWorkspace } from './components/CallbackRequestsWorkspace'
import { PayslipsWorkspace } from './components/PayslipsWorkspace'
import { BusinessInsightsWorkspace } from './components/BusinessInsightsWorkspace'
import { GlobalSearchWorkspace } from './components/GlobalSearchWorkspace'
import { LoyaltyWorkspace } from './components/LoyaltyWorkspace'
import { AddCustomerDialog } from './components/AddCustomerDialog'
import { SendMembershipNotificationDialog } from './components/SendMembershipNotificationDialog'
import type { BusinessFeature } from './components/BusinessProfileCard'
import type { QuickActionId } from './components/QuickActionGrid'
import type { DashboardTab } from '../types'
import { normalizeBusinessType } from '../../constants/businessTypes'
import { v4 as uuidv4 } from 'uuid'

const businessDashboardTabs: DashboardTab[] = ['overview', 'businesses', 'invoices', 'customers', 'appointments', 'memberships', 'loyalty', 'offers', 'retention', 'callbacks', 'payslips', 'insights', 'search', 'profile']

// Pale-to-ink header gradient sampled from the Figma swatch (compact headers)
const COMPACT_HEADER_GRADIENT = 'linear-gradient(180deg, #F1EBFC 0%, #CDBAF1 14%, #AE89F2 30%, #8C59F2 46%, #5B34D4 66%, #331A88 84%, #0F032D 100%)'

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

function getLocalDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function BusinessDashboard() {
  const navigate = useNavigate()
  const { tab: routeTab } = useParams()
  const dispatch = useAppDispatch()
  const authUser = getCurrentUser()
  const accountRoles = new Set((authUser?.accounts ?? []).map((account) => account.role).concat(authUser?.role ?? 'BUSINESS'))
  const availableAccounts = (authUser?.accounts ?? []).filter((account) => account.role !== authUser?.role)
  const missingProfileRoles = (['BUSINESS', 'CUSTOMER'] as Role[]).filter((role) => role !== authUser?.role && !accountRoles.has(role))
  const { data, activeTab, selectedBusinessId } = useAppSelector((state: RootState) => state.businessDashboard)
  const changeTab = useCallback((tab: DashboardTab, replace = false) => {
    dispatch(setActiveTab(tab))
    navigate(getDashboardPath('BUSINESS', tab), { replace })
  }, [dispatch, navigate])

  useEffect(() => {
    const matchingTab = businessDashboardTabs.find((tab) => tab === routeTab)
    if (matchingTab) {
      dispatch(setActiveTab(matchingTab))
    } else {
      changeTab('overview', true)
    }
  }, [changeTab, dispatch, routeTab])

  const selectedBusiness = data.businesses.find((business) => business.id === selectedBusinessId) ?? data.businesses[0] ?? null
  const appointmentsEnabled = selectedBusiness?.appointmentsEnabled ?? false
  const membershipsEnabled = selectedBusiness?.membershipsEnabled ?? true
  const homeServicesEnabled = selectedBusiness?.homeServicesEnabled ?? false
  const payslipsEnabled = selectedBusiness?.payslipsEnabled ?? false
  useEffect(() => {
    if (!selectedBusiness) return
    if ((activeTab === 'memberships' && !membershipsEnabled) || (activeTab === 'payslips' && !payslipsEnabled)) {
      changeTab('overview', true)
    }
  }, [activeTab, appointmentsEnabled, changeTab, membershipsEnabled, payslipsEnabled, selectedBusiness])

  const createInvoiceItem = (): InvoiceLineItemForm => ({
    id: uuidv4(),
    productName: '',
    quantity: '1',
    unitPrice: '0',
    gstRate: '18',
  })
  const [invoiceForm, setInvoiceForm] = useState<BusinessInvoiceForm>(() => ({
    customerId: data.customers[0]?.id ?? '',
    dueDate: '',
    discountType: 'AMOUNT',
    discountValue: '',
    items: [createInvoiceItem()],
  }))
  const [invoiceMessage, setInvoiceMessage] = useState('')
  const [invoiceToast, setInvoiceToast] = useState('')
  const [invoiceMessageSeverity, setInvoiceMessageSeverity] = useState<'error' | 'success'>('success')
  const [isInvoiceSubmitting, setIsInvoiceSubmitting] = useState(false)
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false)
  const [isProductsViewOpen, setIsProductsViewOpen] = useState(false)
  const [activeProductCount, setActiveProductCount] = useState(0)
  const [previewInvoiceId, setPreviewInvoiceId] = useState<number | null>(null)
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false)
  const [isProfilePageOpen, setIsProfilePageOpen] = useState(false)
  // Pinned (collapsed) header: appears smoothly on the Home tab once the page is scrolled
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [isHeaderPinned, setIsHeaderPinned] = useState(false)
  const heroEdgeRef = useRef<Element | null>(null)
  const pinnedHeaderRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    setIsHeaderPinned(false)
    heroEdgeRef.current = null
    if (pinnedHeaderRef.current) {
      pinnedHeaderRef.current.style.transform = 'translateY(-110%)'
      pinnedHeaderRef.current.style.opacity = '0'
    }
    scrollRef.current?.scrollTo({ top: 0 })
  }, [activeTab])
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [explicitAppointment, setExplicitAppointment] = useState<AppointmentSummary | null>(null)
  const setSelectedAppointmentForDetails = setExplicitAppointment
  const appointmentIdFromUrl = searchParams.get('appointmentId') ? Number(searchParams.get('appointmentId')) : null

  const selectedAppointmentForDetails = useMemo(() => {
    if (appointmentIdFromUrl) {
      const fromList = data.appointments.find((item) => item.id === appointmentIdFromUrl)
      if (fromList) return fromList
      if (explicitAppointment?.id === appointmentIdFromUrl) return explicitAppointment
    }
    return explicitAppointment
  }, [appointmentIdFromUrl, data.appointments, explicitAppointment])

  const [staffOptions, setStaffOptions] = useState<AppointmentStaffOption[]>([])

  const clearAppointmentUrlParam = () => {
    setExplicitAppointment(null)
    if (searchParams.has('appointmentId') || searchParams.has('tab')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('appointmentId')
      nextParams.delete('tab')
      setSearchParams(nextParams, { replace: true })
    }
  }

  useEffect(() => {
    if (!selectedBusiness?.id) return
    let isCurrent = true
    fetchAppointmentStaff(selectedBusiness.id)
      .then((opts) => {
        if (isCurrent) setStaffOptions(opts)
      })
      .catch(() => undefined)
    return () => {
      isCurrent = false
    }
  }, [selectedBusiness?.id])

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'appointments') {
      dispatch(setActiveTab('appointments'))
    }

    if (appointmentIdFromUrl && !data.appointments.some((item) => item.id === appointmentIdFromUrl) && explicitAppointment?.id !== appointmentIdFromUrl) {
      let isCurrent = true
      fetchAppointmentById(appointmentIdFromUrl)
        .then((fetched) => {
          if (isCurrent && fetched) setExplicitAppointment(fetched)
        })
        .catch(() => undefined)
      return () => {
        isCurrent = false
      }
    }
  }, [searchParams, appointmentIdFromUrl, data.appointments, explicitAppointment, dispatch])

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ appointmentId?: number }>).detail
      if (detail?.appointmentId) {
        const id = detail.appointmentId
        const existing = data.appointments.find((item) => item.id === id)
        if (existing) {
          setExplicitAppointment(existing)
        } else {
          void fetchAppointmentById(id).then((fetched) => {
            if (fetched) setExplicitAppointment(fetched)
          }).catch(() => undefined)
        }
      }
    }
    window.addEventListener('bhive:open-appointment', handleOpen)
    return () => window.removeEventListener('bhive:open-appointment', handleOpen)
  }, [data.appointments])

  const handleStatusChangeFromDialog = async (appointmentId: number, status: AppointmentStatus, note?: string) => {
    const result = await updateAppointmentStatus(appointmentId, status, note)
    if (!result.ok) {
      throw new Error(result.message ?? 'Could not update appointment status.')
    }

    dispatch(fetchBusinessDashboard(selectedBusinessId ?? undefined))
    setSelectedAppointmentForDetails((current) =>
      current && current.id === appointmentId
        ? result.appointment ?? { ...current, status, businessNote: note ?? current.businessNote }
        : current,
    )
  }

  const handleStaffAssignFromDialog = async (appointmentId: number, staffUserId?: number) => {
    const result = await updateAppointmentStaff(appointmentId, staffUserId)
    if (!result.ok) {
      throw new Error(result.message ?? 'Could not update the assigned staff member.')
    }

    dispatch(fetchBusinessDashboard(selectedBusinessId ?? undefined))
    setSelectedAppointmentForDetails((current) =>
      current && current.id === appointmentId ? { ...current, staffUserId } : current,
    )
  }

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
    } else if (action === 'appointment') {
      changeTab('appointments')
    } else if (action === 'membership') {
      dispatch(setActiveTab('memberships'))
    } else {
      setIsNotificationDialogOpen(true)
    }
  }

  const handleSaveHomeVisitCharge = async (charge: number) => {
    if (!selectedBusiness) return { ok: false, message: 'Select a business profile first.' }
    const result = await setBusinessHomeVisitCharge(selectedBusiness.id, charge)
    if (!result.ok || !result.business) return { ok: false, message: result.message }
    dispatch(setBusinessHomeVisitChargeAction({ businessId: selectedBusiness.id, homeVisitCharge: result.business.homeVisitCharge ?? 0 }))
    return { ok: true }
  }

  const handleFeatureToggle = async (feature: BusinessFeature, enabled: boolean) => {
    if (!selectedBusiness) return { ok: false, message: 'Select a business profile first.' }
    const result = feature === 'appointments'
      ? await setBusinessAppointmentsEnabled(selectedBusiness.id, enabled)
      : feature === 'homeServices'
        ? await setBusinessHomeServicesEnabled(selectedBusiness.id, enabled)
        : feature === 'payslips'
          ? await setBusinessPayslipsEnabled(selectedBusiness.id, enabled)
          : await setBusinessMembershipsEnabled(selectedBusiness.id, enabled)
    if (!result.ok || !result.business) {
      return { ok: false, message: result.message ?? 'Could not update this feature.' }
    }
    dispatch(setBusinessFeatures({
      businessId: selectedBusiness.id,
      appointmentsEnabled: result.business.appointmentsEnabled ?? false,
      membershipsEnabled: result.business.membershipsEnabled ?? true,
      homeServicesEnabled: result.business.homeServicesEnabled ?? false,
      payslipsEnabled: result.business.payslipsEnabled ?? false,
    }))
    return { ok: true }
  }

  useEffect(() => {
    if (selectedBusiness) dispatch(fetchBusinessSummary(selectedBusiness.id))
  }, [dispatch, selectedBusiness])

  useEffect(() => {
  let cancelled = false

  const loadActiveProductCount = async () => {
    if (!selectedBusiness?.id) {
      setActiveProductCount(0)
      return
    }

    try {
      const result = await getBusinessProducts(selectedBusiness.id)

      if (cancelled) return

      if (result.ok) {
        const count = result.products.filter(
          (product) => product.status === 'ACTIVE',
        ).length

        setActiveProductCount(count)
      }
    } catch (error) {
      console.error('Failed to load active product count:', error)
    }
  }

  void loadActiveProductCount()

  return () => {
    cancelled = true
  }
}, [selectedBusiness?.id])

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

  const handleInvoiceInput = (field: 'customerId' | 'dueDate' | 'discountType' | 'discountValue', value: string) => {
    if (field === 'discountType') {
      if (value !== 'PERCENTAGE' && value !== 'AMOUNT') return
      setInvoiceForm((current) => ({ ...current, discountType: value }))
      return
    }
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

    try {
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
      await dispatch(fetchBusinessDashboard(savedBusiness.id ?? undefined))
      changeTab('overview')
    } catch (error) {
      setBusinessMessage(error instanceof Error ? error.message : 'Could not save business details.')
    } finally {
      setIsCreatingBusiness(false)
    }
  }

  const handleCreateInvoice = async (status: 'DRAFT' | 'SENT' | 'PAID') => {
    const businessId = selectedBusinessId ?? selectedBusiness?.id ?? data.businesses[0]?.id
    const customerId = Number(invoiceForm.customerId)
    const items = invoiceForm.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      gstRate: Number(item.gstRate),
    }))

    if (!businessId || !customerId) {
      setInvoiceMessageSeverity('error')
      setInvoiceMessage('Select a customer before generating an invoice.')
      return 
    }

    if (items.some((item) => !item.productName.trim() || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice <= 0 || !Number.isFinite(item.gstRate) || item.gstRate < 0)) {
      setInvoiceMessageSeverity('error')
      setInvoiceMessage('Enter a product name, positive quantity and price, and a valid GST rate for every product.')
      return
    }

    const subtotal = Number(items.reduce((total, item) => total + item.quantity * item.unitPrice, 0).toFixed(2))
    const gstAmount = Number(items.reduce((total, item) => total + item.quantity * item.unitPrice * (item.gstRate / 100), 0).toFixed(2))
    const grossTotal = Number((subtotal + gstAmount).toFixed(2))
    const discountValue = Number(invoiceForm.discountValue)
    if (
      invoiceForm.discountValue.trim()
      && (!Number.isFinite(discountValue)
        || discountValue < 0
        || (invoiceForm.discountType === 'PERCENTAGE' && discountValue > 100))
    ) {
      setInvoiceMessageSeverity('error')
      setInvoiceMessage(invoiceForm.discountType === 'PERCENTAGE'
        ? 'Enter a discount percentage from 0 to 100.'
        : 'Enter a valid discount amount.')
      return
    }
    const invoiceDiscountAmount = invoiceForm.discountValue.trim()
      ? Number((invoiceForm.discountType === 'PERCENTAGE' ? grossTotal * discountValue / 100 : discountValue).toFixed(2))
      : 0
    if (invoiceDiscountAmount > grossTotal) {
      setInvoiceMessageSeverity('error')
      setInvoiceMessage('Discount amount cannot be greater than the invoice total.')
      return
    }
    const totalAmount = Number((grossTotal - invoiceDiscountAmount).toFixed(2))
    const issueDate = getLocalDate()
    // const issueDate = new Date().toISOString().slice(0, 10)
    setIsInvoiceSubmitting(true)
    try {
      const result = await createInvoice({
  businessId,
  customerId,
  invoiceNumber: `INV-${Date.now()}`,
  issueDate,
  ...(invoiceForm.dueDate ? { dueDate: invoiceForm.dueDate } : {}),
  subtotal,
  gstAmount,
  totalAmount,
  invoiceDiscountAmount,
  ...(invoiceForm.discountValue.trim() ? {
    invoiceDiscountType: invoiceForm.discountType,
    invoiceDiscountValue: discountValue,
  } : {}),
  status,
})

      if (!result.ok) {
  setInvoiceMessageSeverity('error')
  setInvoiceMessage(result.message ?? 'Invoice generation failed.')
  return
}

      setInvoiceMessage('')
      setIsInvoiceFormOpen(false)
      const invoiceLabel = result.invoice?.invoiceNumber ?? 'Invoice'
      setInvoiceToast(
        status === 'DRAFT' ? `${invoiceLabel} saved as a draft.`
          : status === 'PAID' ? `${invoiceLabel} created and marked as paid.`
            : `${invoiceLabel} created and sent.`
      )

      setInvoiceForm((current) => ({
        ...current,
        customerId: '',
        discountType: 'AMOUNT',
        discountValue: '',
        items: [createInvoiceItem()],
      }))

      setSelectedCustomer(null)
      setCustomerSearchText('')
      dispatch(fetchBusinessDashboard(businessId))
    } catch (error) {
setInvoiceMessageSeverity('error')
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

  // Newest invoice first (issue date, then id as tie-breaker). The list panel filters this same array,
  // so All / Draft / Pending / Paid / Overdue all keep the newest-to-oldest order.
  const invoiceTime = (issueDate?: string) => {
    const time = issueDate ? new Date(issueDate).getTime() : Number.NaN
    return Number.isNaN(time) ? 0 : time
  }
  const invoiceRows = [...data.invoices]
    .sort((first, second) => invoiceTime(second.issueDate) - invoiceTime(first.issueDate) || second.id - first.id)
    .map((invoice) => {
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
      customerPhone: customer?.phoneNumber,
      customerAddress: customer?.locationAddress,
      invoiceNumber: invoice.invoiceNumber ?? `INV-${invoice.id}`,
      status: invoice.status ?? 'SENT',
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      gstAmount: invoice.gstAmount,
      totalAmount: invoice.totalAmount,
      invoiceDiscountAmount: invoice.invoiceDiscountAmount,
      invoiceDiscountType: invoice.invoiceDiscountType,
      invoiceDiscountValue: invoice.invoiceDiscountValue,
      amount: formatCurrency(invoice.totalAmount),
      loyaltyDetails: (invoice.loyaltyPointsRedeemed ?? 0) > 0
        ? `${invoice.loyaltyPointsRedeemed} points redeemed · ${formatCurrency(invoice.loyaltyDiscountAmount)} discount`
        : undefined,
      date: invoiceDate && !Number.isNaN(invoiceDate.getTime())
        ? invoiceDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : '—',
      badge: initials,
    }
  })

  if (isProfilePageOpen) {
    return (
      <BusinessProfileMenuPage
        authUser={authUser}
        currentRole={authUser?.role ?? 'BUSINESS'}
        availableAccounts={availableAccounts}
        missingProfileRoles={missingProfileRoles}
        appointmentsEnabled={appointmentsEnabled}
        membershipsEnabled={membershipsEnabled}
        onBack={() => setIsProfilePageOpen(false)}
        onNavigateTab={(tab) => {
          setIsProfilePageOpen(false)
          changeTab(tab)
        }}
        onSwitchAccount={(role) => {
          const updated = switchAccount(role)
          if (updated) {
            dispatch(setAuthUser(updated))
            navigate(getDashboardPath(updated.role))
            window.location.reload()
          }
        }}
        onAddProfile={(role) => {
          const updated = addProfile(role)
          if (updated) {
            dispatch(setAuthUser(updated))
            navigate(getDashboardPath(updated.role))
            window.location.reload()
          }
        }}
        onLogout={() => {
          logoutUser()
          navigate('/')
        }}
        onProfilePictureUpdated={(user) => dispatch(setAuthUser(user))}
        business={selectedBusiness}
        onBannerUploaded={(updated) => dispatch(fetchBusinessDashboard(updated.id))}
      />
    )
  }

  // Header is built once: on the Home (overview) tab it is transparent and rendered
  // INSIDE the overview gradient (via topSlot); on every other tab it renders standalone.
  const appHeader = (
    <AppHeader
      authUser={authUser}
      contextLabel={selectedBusiness?.businessName ?? selectedBusiness?.name ?? 'Business workspace'}
      roleLabel="Business Owner"
      menuId="profile-menu-page"
      isMenuOpen={isProfilePageOpen}
      showWorkspaceContext={activeTab !== 'overview'}
      transparent={activeTab === 'overview'}
      onOpenMenu={() => setIsProfilePageOpen(true)}
    />
  )

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
          {activeTab === 'search' ? (
            // Figma "Search" screen: gradient header with lime search icon + title, bell and photo
            <Box sx={{ flexShrink: 0, background: COMPACT_HEADER_GRADIENT, borderRadius: '0 0 35px 35px', pb: 2.4 }}>
              <AppHeader
                authUser={authUser}
                contextLabel={selectedBusiness?.businessName ?? selectedBusiness?.name ?? 'Business workspace'}
                roleLabel="Business Owner"
                menuId="profile-menu-page"
                isMenuOpen={isProfilePageOpen}
                showWorkspaceContext={false}
                transparent
                pageTitle="Search"
                pageIcon={<Search size={26} strokeWidth={2} color="#CDF27E" aria-hidden="true" />}
                onOpenMenu={() => setIsProfilePageOpen(true)}
              />
            </Box>
          ) : (
            activeTab !== 'overview' && appHeader
          )}

          {activeTab === 'overview' && (
            <Box
              ref={pinnedHeaderRef}
              aria-hidden={!isHeaderPinned}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 5,
                pb: 2.2,
                background: COMPACT_HEADER_GRADIENT,
                borderRadius: '0 0 35px 35px',
                boxShadow: '0 10px 28px rgba(15, 3, 45, 0.28)',
                // transform/opacity are driven by scroll position (see onScroll) so the header follows the finger
                transform: 'translateY(-110%)',
                opacity: 0,
                pointerEvents: isHeaderPinned ? 'auto' : 'none',
                willChange: 'transform, opacity',
              }}
            >
              {appHeader}
            </Box>
          )}

          <Box
            ref={scrollRef}
            onScroll={(event) => {
              if (activeTab !== 'overview') return
              const container = event.currentTarget
              // The pinned header may only appear once the quick-action buttons have scrolled completely out of view.
              if (!heroEdgeRef.current || !container.contains(heroEdgeRef.current)) {
                heroEdgeRef.current = container.querySelector('[data-overview-hero]')
                  ?? Array.from(container.querySelectorAll('button, [role="button"]'))
                    .find((el) => /send reminders/i.test(el.textContent ?? '')) ?? null
              }
              const edge = heroEdgeRef.current
              // How far (px) the hero has scrolled past the top edge; the header glides in over the next 90px.
              const distance = edge
                ? container.getBoundingClientRect().top - (edge.getBoundingClientRect().bottom + (edge.hasAttribute('data-overview-hero') ? 0 : 32))
                : container.scrollTop - 380
              const raw = Math.min(1, Math.max(0, distance / 90))
              const eased = 1 - Math.pow(1 - raw, 2)
              const pinnedEl = pinnedHeaderRef.current
              if (pinnedEl) {
                pinnedEl.style.transform = `translateY(${(eased - 1) * 110}%)`
                pinnedEl.style.opacity = String(Math.min(1, eased * 1.5))
              }
              setIsHeaderPinned(raw > 0.5)
            }}
            sx={{
            px: activeTab === 'overview' ? 0 : { xs: 2, sm: 2.2 },
            pt: activeTab === 'overview' ? 0 : { xs: 2, sm: 2.2 },
            pb: 'calc(96px + env(safe-area-inset-bottom))',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehaviorY: 'contain',
          }}>
            <Stack spacing={1.6}>
              {isProductsViewOpen ? (
            <Stack spacing={2}>
              <Button
                variant="text"
                startIcon={<ArrowLeft size={18} />}
                onClick={() => setIsProductsViewOpen(false)}
                sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
              >
                Back to Business Profile
              </Button>

              <BusinessProductsSection
                businessId={selectedBusiness?.id ?? null}
                onProductCountChange={setActiveProductCount}
              />
            </Stack>
          ) : (
            <>
              {activeTab === 'overview' && (
                <BusinessDashboardOverview
                  topSlot={appHeader}
                  onQuickAction={handleQuickAction}
                  onOpenInsights={() => changeTab('insights')}
                  onOpenInvoices={() => changeTab('invoices')}
                  onOpenCustomers={() => changeTab('customers')}
                  onOpenInvoice={(invoiceId) => {
                    setPreviewInvoiceId(invoiceId)
                    changeTab('invoices')
                  }}
                  hasBusiness={Boolean(selectedBusiness)}
                  appointmentsEnabled={appointmentsEnabled}
                  membershipsEnabled={membershipsEnabled}
                />
              )}

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
  businessId={selectedBusiness.id}
  businessName={
    selectedBusiness.businessName ??
    selectedBusiness.name ??
    selectedBusiness.companyName ??
    'Your business'
  }
  businessLocation={
    [
      selectedBusiness.city,
      selectedBusiness.region,
      selectedBusiness.country,
    ]
      .filter(Boolean)
      .join(', ') ||
    selectedBusiness.address ||
    'Location unavailable'
  }
  hasMappedLocation={
    selectedBusiness.latitude != null &&
    selectedBusiness.longitude != null
  }
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
                  previewInvoiceId={previewInvoiceId}
                  onPreviewClosed={() => setPreviewInvoiceId(null)}
                />

                {isInvoiceFormOpen && (
                  <InvoiceGeneratorCard
                    open
                    businessId={selectedBusinessId ?? selectedBusiness?.id ?? data.businesses[0]?.id ?? 0}
                    data={data}
                    selectedCustomer={selectedCustomer}
                    customerSearchText={customerSearchText}
                    customerSearchResults={customerSearchText.trim() ? customerSearchResults : data.customers}
                    isCustomerSearching={isCustomerSearching}
                    invoiceForm={invoiceForm}
                    invoiceMessage={invoiceMessage}
                    invoiceMessageSeverity={invoiceMessageSeverity}
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
                )}
              </Stack>
            )}

            {activeTab === 'customers' && selectedBusiness && (
              <CustomerListCard
                businessId={selectedBusiness.id}
                customers={data.customers}
                onOpenCustomer={handleOpenCustomer}
                onAddCustomer={() => setIsAddCustomerOpen(true)}
              />
            )}

            {activeTab === 'retention' && selectedBusiness && (
              <CustomerRetentionWorkspace
                key={selectedBusiness.id}
                businessId={selectedBusiness.id}
                businessName={selectedBusiness.businessName ?? selectedBusiness.name ?? 'your business'}
                businessLocation={selectedBusiness.address ?? ''}
                hasMappedLocation={selectedBusiness.latitude != null && selectedBusiness.longitude != null}
                data={data}
                onUpdated={() => dispatch(fetchBusinessDashboard(selectedBusiness.id))}
              />
            )}

            {activeTab === 'callbacks' && selectedBusiness && (
              <CallbackRequestsWorkspace key={selectedBusiness.id} businessId={selectedBusiness.id} />
            )}

            {activeTab === 'loyalty' && selectedBusiness && (
              <LoyaltyWorkspace
                key={selectedBusiness.id}
                businessId={selectedBusiness.id}
                products={data.products}
              />
            )}

            {activeTab === 'payslips' && payslipsEnabled && selectedBusiness && (
              <PayslipsWorkspace key={selectedBusiness.id} businessId={selectedBusiness.id} />
            )}

            {activeTab === 'insights' && selectedBusiness && <BusinessInsightsWorkspace key={selectedBusiness.id} businessId={selectedBusiness.id} appointmentsEnabled={appointmentsEnabled} membershipsEnabled={membershipsEnabled} />}

            {activeTab === 'search' && (
              <GlobalSearchWorkspace
                data={data}
                appointmentsEnabled={appointmentsEnabled}
                membershipsEnabled={membershipsEnabled}
                onOpenCustomer={handleOpenCustomer}
                onChangeTab={changeTab}
              />
            )}

            {activeTab === 'memberships' && membershipsEnabled && selectedBusiness && (
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
                    homeServicesEnabled={homeServicesEnabled}
                    onToggleHomeServices={(enabled) => handleFeatureToggle('homeServices', enabled)}
                    homeVisitCharge={selectedBusiness.homeVisitCharge ?? 0}
                    onSaveHomeVisitCharge={handleSaveHomeVisitCharge}
                    onConfigurationChanged={() => dispatch(fetchBusinessDashboard(selectedBusiness.id))}
                  />
                )}
                {appointmentsEnabled && (
                  <AppointmentListCard
                    businessId={selectedBusinessId ?? selectedBusiness?.id ?? 0}
                    appointments={data.appointments}
                    customers={data.customers}
                    selectedAppointmentId={selectedAppointmentForDetails?.id}
                    onSelectAppointment={setSelectedAppointmentForDetails}
                    onUpdated={() => dispatch(fetchBusinessDashboard(selectedBusinessId ?? undefined))}
                  />
                )}
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
                  appointmentsEnabled={appointmentsEnabled}
                  membershipsEnabled={membershipsEnabled}
                  payslipsEnabled={payslipsEnabled}
                  onBusinessFieldChange={handleBusinessFieldChange}
                  onLocationChange={handleBusinessLocationChange}
                onSave={handleSaveBusinessProfile}
                onManageProducts={() => setIsProductsViewOpen(true)}
                onManageAppointments={() => changeTab('appointments')}
                activeProductCount={activeProductCount}
                onFeatureToggle={handleFeatureToggle}
              />
            )}
            </>
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

        <AppointmentDetailDialog
          open={Boolean(selectedAppointmentForDetails)}
          appointment={selectedAppointmentForDetails}
          businesses={data.businesses}
          customers={data.customers}
          role={authUser?.role ?? 'BUSINESS'}
          staffOptions={staffOptions}
          onClose={clearAppointmentUrlParam}
          onStatusChange={handleStatusChangeFromDialog}
          onStaffAssign={handleStaffAssignFromDialog}
        />

        <BottomNavBar
          activeTab={activeTab}
          membershipsEnabled={membershipsEnabled}
          onChangeTab={changeTab}
        />
      </Paper>
    </Container>
    <Drawer
      anchor="right"
      open={isProfilePageOpen}
      onClose={() => setIsProfilePageOpen(false)}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 444 },
            maxWidth: '100vw',
            bgcolor: 'background.default',
            overflow: 'hidden',
          },
        },
      }}
    >
      <BusinessProfileMenuPage
        authUser={authUser}
        currentRole={authUser?.role ?? 'BUSINESS'}
        availableAccounts={availableAccounts}
        missingProfileRoles={missingProfileRoles}
        appointmentsEnabled={appointmentsEnabled}
        membershipsEnabled={membershipsEnabled}
        payslipsEnabled={payslipsEnabled}
        onBack={() => setIsProfilePageOpen(false)}
        onNavigateTab={(tab) => {
          setIsProfilePageOpen(false)
          changeTab(tab)
        }}
        onSwitchAccount={(role) => {
          const updated = switchAccount(role)
          if (updated) {
            dispatch(setAuthUser(updated))
            navigate(getDashboardPath(updated.role))
            window.location.reload()
          }
        }}
        onAddProfile={(role) => {
          const updated = addProfile(role)
          if (updated) {
            dispatch(setAuthUser(updated))
            navigate(getDashboardPath(updated.role))
            window.location.reload()
          }
        }}
        onLogout={() => {
          logoutUser()
          navigate('/')
        }}
        onProfilePictureUpdated={(user) => dispatch(setAuthUser(user))}
        business={selectedBusiness}
        onBannerUploaded={(updated) => dispatch(fetchBusinessDashboard(updated.id))}
      />
    </Drawer>
    <Snackbar
      open={Boolean(invoiceToast)}
      autoHideDuration={4000}
      onClose={() => setInvoiceToast('')}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity="success" variant="filled" onClose={() => setInvoiceToast('')} sx={{ width: '100%' }}>{invoiceToast}</Alert>
    </Snackbar>
  </Box>
  )
}