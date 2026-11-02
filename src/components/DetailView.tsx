import { useEffect, useState } from 'react'
import { alpha } from '@mui/material/styles'
import { Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Container, Divider, Paper, Stack, Typography } from '@mui/material'
import { ArrowLeft, CalendarDays, CreditCard, Mail, Phone, Plus, ReceiptText, ShieldCheck } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { BottomNavBar } from '../modules/business/components/BottomNavBar'
import { BusinessMenu } from '../modules/business/components/BusinessMenu'
import { AppointmentListCard } from '../modules/business/components/AppointmentListCard'
import { InvoiceGeneratorCard, type BusinessInvoiceForm, type InvoiceLineItemForm } from '../modules/business/components/InvoiceGeneratorCard'
import { CustomerMembershipManager } from '../modules/business/components/CustomerMembershipManager'
import { createInvoice, type DashboardData } from '../services/api'
import { addProfile, getCurrentUser, logoutUser, switchAccount, type Role } from '../services/auth'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import type { RootState } from '../store/store'
import { setActiveTab as setAdminTab } from '../store/adminDashboardSlice'
import { setAuthUser } from '../store/authSlice'
import { fetchBusinessDashboard, setActiveTab as setBusinessTab } from '../store/businessDashboardSlice'
import { setActiveTab as setCustomerTab, setSelectedCustomerId } from '../store/customerDashboardSlice'
import type { DashboardTab } from '../modules/types'
import { v4 as uuidv4 } from 'uuid';

function createInvoiceItem(): InvoiceLineItemForm {
  return { id: uuidv4(), productName: '', quantity: '1', unitPrice: '0', gstRate: '18' }
}

export function DetailView() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { id } = useParams()
  const authUser = getCurrentUser()
  const adminState = useAppSelector((state: RootState) => state.adminDashboard)
  const businessState = useAppSelector((state: RootState) => state.businessDashboard)
  const customerState = useAppSelector((state: RootState) => state.customerDashboard)
  const role = authUser?.role ?? 'BUSINESS'
  const dashboard = role === 'ADMIN' ? adminState : role === 'CUSTOMER' ? customerState : businessState
  const businessId = role === 'BUSINESS' ? businessState.selectedBusinessId ?? businessState.data.businesses[0]?.id : undefined
  const business = businessState.data.businesses.find((item) => item.id === businessId) ?? businessState.data.businesses[0]
  const accountRoles = new Set((authUser?.accounts ?? []).map((account) => account.role).concat(authUser?.role ?? 'BUSINESS'))
  const availableAccounts = (authUser?.accounts ?? []).filter((account) => account.role !== authUser?.role)
  const missingProfileRoles = (['BUSINESS', 'CUSTOMER'] as Role[]).filter((accountRole) => accountRole !== authUser?.role && !accountRoles.has(accountRole))
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const isMenuOpen = Boolean(menuAnchorEl)
  const selectedCustomerId = role === 'CUSTOMER' ? customerState.selectedCustomerId : adminState.selectedCustomerId
  const customerDetail = Number(id ?? selectedCustomerId ?? 0)
  const detail = dashboard.data.customers.find((item) => item.id === customerDetail) ?? null
  const [membershipManagerOpen, setMembershipManagerOpen] = useState(false)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [invoiceCustomer, setInvoiceCustomer] = useState<DashboardData['customers'][number] | null>(null)
  const [invoiceSearchText, setInvoiceSearchText] = useState('')
  const [invoiceMessage, setInvoiceMessage] = useState('')
  const [invoiceMessageSeverity] =
  useState<'success' | 'error'>('success')
  const [isInvoiceSubmitting, setIsInvoiceSubmitting] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState<BusinessInvoiceForm>(() => ({
    customerId: '',
    dueDate: '',
    discountType: 'AMOUNT',
    discountValue: '',
    items: [createInvoiceItem()],
  }))
  const memberships = dashboard.data.memberships
    .filter((membership) => membership.customerId === customerDetail)
    .sort((first, second) => new Date(second.updatedAt ?? second.startDate ?? 0).getTime() - new Date(first.updatedAt ?? first.startDate ?? 0).getTime())
  const invoices = dashboard.data.invoices
    .filter((invoice) => invoice.customerId === customerDetail)
    .sort((first, second) => new Date(second.issueDate ?? 0).getTime() - new Date(first.issueDate ?? 0).getTime())
  const payments = dashboard.data.payments
    .filter((payment) => payment.customerId === customerDetail)
    .sort((first, second) => new Date(second.paymentDate ?? 0).getTime() - new Date(first.paymentDate ?? 0).getTime())
  const appointments = dashboard.data.appointments
    .filter((appointment) => appointment.customerId === customerDetail)
    .sort((first, second) => new Date(second.scheduledAt ?? 0).getTime() - new Date(first.scheduledAt ?? 0).getTime())

  useEffect(() => {
    if (role === 'CUSTOMER' && Number.isFinite(customerDetail) && customerDetail > 0) {
      dispatch(setSelectedCustomerId(customerDetail))
    }
  }, [customerDetail, dispatch, role])

  if (!detail && dashboard.loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={28} /></Box>
  }

  if (!detail) {
    return <Navigate to="/dashboard" replace />
  }

  const title = detail.fullName ?? 'Customer'
  const subtitle = 'Customer profile'
  const initials = title.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase()
  const totalInvoiced = invoices.reduce((total, invoice) => total + (typeof invoice.totalAmount === 'number' && Number.isFinite(invoice.totalAmount) ? invoice.totalAmount : 0), 0)
  const formatDate = (value?: string) => value
    ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date not available'
  const formatCurrency = (value?: number) => typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : '—'

  const openInvoiceDialog = () => {
    setInvoiceForm({
      customerId: detail.id,
      dueDate: '',
      discountType: 'AMOUNT',
      discountValue: '',
      items: [createInvoiceItem()],
    })
    setInvoiceCustomer(detail)
    setInvoiceSearchText('')
    setInvoiceMessage('')
    setInvoiceDialogOpen(true)
  }

  const handleInvoiceFieldChange = (field: 'customerId' | 'dueDate' | 'discountType' | 'discountValue', value: string) => {
    if (field === 'discountType') {
      if (value !== 'PERCENTAGE' && value !== 'AMOUNT') return
      setInvoiceForm((current) => ({ ...current, discountType: value }))
      return
    }
    setInvoiceForm((current) => ({ ...current, [field]: value }))
  }

  const handleInvoiceItemChange = (itemId: string, field: keyof Omit<InvoiceLineItemForm, 'id'>, value: string) => {
    setInvoiceForm((current) => ({ ...current, items: current.items.map((item) => item.id === itemId ? { ...item, [field]: value } : item) }))
  }

  const handleCreateInvoice = async (status: 'DRAFT' | 'SENT' | 'PAID') => {
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
    const grossAmount = Number((subtotal + gstAmount).toFixed(2))
    const discountValue = Number(invoiceForm.discountValue)
    if (
      invoiceForm.discountValue.trim()
      && (!Number.isFinite(discountValue)
        || discountValue < 0
        || (invoiceForm.discountType === 'PERCENTAGE' && discountValue > 100))
    ) {
      setInvoiceMessage(invoiceForm.discountType === 'PERCENTAGE'
        ? 'Enter a discount percentage from 0 to 100.'
        : 'Enter a valid discount amount.')
      return
    }
    const invoiceDiscountAmount = invoiceForm.discountValue.trim()
      ? Number((invoiceForm.discountType === 'PERCENTAGE' ? grossAmount * discountValue / 100 : discountValue).toFixed(2))
      : 0
    if (invoiceDiscountAmount > grossAmount) {
      setInvoiceMessage('Discount amount cannot be greater than the invoice total.')
      return
    }
    const invoiceStatus = status === 'DRAFT' ? 'DRAFT' : invoiceForm.dueDate ? 'SENT' : 'PAID'
    setIsInvoiceSubmitting(true)
    try {
      const result = await createInvoice({
        businessId,
        customerId,
        invoiceNumber: `INV-${Date.now()}`,
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: invoiceForm.dueDate || undefined,
        subtotal,
        gstAmount,
        totalAmount: Number((grossAmount - invoiceDiscountAmount).toFixed(2)),
        invoiceDiscountAmount,
        ...(invoiceForm.discountValue.trim() ? {
          invoiceDiscountType: invoiceForm.discountType,
          invoiceDiscountValue: discountValue,
        } : {}),
        status: invoiceStatus,
      })
      if (!result.ok) {
        setInvoiceMessage(result.message ?? 'Invoice generation failed.')
        return
      }

      setInvoiceMessage(invoiceStatus === 'DRAFT'
        ? `Invoice ${result.invoice?.invoiceNumber ?? 'draft'} saved as a draft.`
        : invoiceStatus === 'PAID'
          ? `Invoice ${result.invoice?.invoiceNumber ?? 'generated'} created and marked as paid.`
          : `Invoice ${result.invoice?.invoiceNumber ?? 'generated'} sent as pending to the selected customer.`)
      setInvoiceForm((current) => ({
        ...current,
        customerId: '',
        dueDate: '',
        discountType: 'AMOUNT',
        discountValue: '',
        items: [createInvoiceItem()],
      }))
      setInvoiceCustomer(null)
      setInvoiceSearchText('')
      dispatch(fetchBusinessDashboard(businessId))
    } catch (error) {
      setInvoiceMessage(error instanceof Error ? error.message : 'Invoice generation failed.')
    } finally {
      setIsInvoiceSubmitting(false)
    }
  }

  const historySections = [
    {
      title: 'Memberships',
      icon: ShieldCheck,
      records: memberships.map((membership) => ({
        id: membership.id,
        title: membership.planName ?? `Membership ${membership.id}`,
        detail: `${formatDate(membership.startDate)}${membership.endDate ? ` - ${formatDate(membership.endDate)}` : ''} · ${formatCurrency(membership.price)}${(membership.loyaltyPointsRedeemed ?? 0) > 0 ? ` · ${membership.loyaltyPointsRedeemed} points redeemed (${formatCurrency(membership.loyaltyDiscountAmount)} off)` : ''}`,
        status: membership.status ?? membership.paymentStatus ?? 'Recorded',
      })),
    },
    {
      title: 'Invoices',
      icon: ReceiptText,
      records: invoices.map((invoice) => ({
        id: invoice.id,
        title: invoice.invoiceNumber ?? `Invoice ${invoice.id}`,
        detail: `${formatDate(invoice.issueDate)} · ${formatCurrency(invoice.totalAmount)}${(invoice.loyaltyPointsRedeemed ?? 0) > 0 ? ` · ${invoice.loyaltyPointsRedeemed} points redeemed (${formatCurrency(invoice.loyaltyDiscountAmount)} off)` : ''}`,
        status: invoice.status ?? 'Recorded',
      })),
    },
    {
      title: 'Payments',
      icon: CreditCard,
      records: payments.map((payment) => ({
        id: payment.id,
        title: payment.referenceNumber ?? `Payment ${payment.id}`,
        detail: `${formatDate(payment.paymentDate)} · ${payment.paymentMethod ?? 'Payment'} · ${formatCurrency(payment.amount)}`,
        status: payment.status ?? 'Recorded',
      })),
    },
    ...(role === 'BUSINESS' ? [] : [{
      title: 'Appointments',
      icon: CalendarDays,
      records: appointments.map((appointment) => ({
        id: appointment.id,
        title: appointment.serviceName ?? `Appointment ${appointment.id}`,
        detail: appointment.scheduledAt
          ? `${new Date(appointment.scheduledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}${(appointment.loyaltyPointsRedeemed ?? 0) > 0 ? ` · ${appointment.loyaltyPointsRedeemed} points redeemed (${formatCurrency(appointment.loyaltyDiscountAmount)} off)` : ''}`
          : 'Schedule not available',
        status: appointment.status ?? 'Booked',
      })),
    }]),
  ]

const handleBack = () => {
  if (window.history.length > 1) {
    navigate(-1)
  } else {
    navigate('/dashboard')
  }
}
  const handleNavigateTab = (tab: DashboardTab) => {
    if (role === 'ADMIN') {
      dispatch(setAdminTab(tab))
    } else if (role === 'CUSTOMER') {
      dispatch(setCustomerTab(tab))
    } else {
      dispatch(setBusinessTab(tab))
    }
    navigate('/dashboard')
  }

  const handleSwitchAccount = (accountRole: Role) => {
    const updated = switchAccount(accountRole)
    if (!updated) return
    dispatch(setAuthUser(updated))
    setMenuAnchorEl(null)
    navigate('/dashboard')
    window.location.reload()
  }

  const handleAddProfile = (accountRole: Role) => {
    const updated = addProfile(accountRole)
    if (!updated) return
    dispatch(setAuthUser(updated))
    setMenuAnchorEl(null)
    navigate('/dashboard')
    window.location.reload()
  }

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
          {role === 'BUSINESS' && (
            <>
              <AppHeader
                authUser={authUser}
                contextLabel={business?.businessName ?? business?.name ?? 'Business workspace'}
                roleLabel="Business Owner"
                menuId="business-menu"
                isMenuOpen={isMenuOpen}
                onOpenMenu={(event) => setMenuAnchorEl(event.currentTarget)}
              />
              <BusinessMenu
                activeTab={businessState.activeTab}
                appointmentsEnabled={business?.appointmentsEnabled ?? false}
                membershipsEnabled={business?.membershipsEnabled ?? true}
                anchorEl={menuAnchorEl}
                isOpen={isMenuOpen}
                onClose={() => setMenuAnchorEl(null)}
                onChangeTab={handleNavigateTab}
                currentRole={role}
                availableAccounts={availableAccounts}
                missingProfileRoles={missingProfileRoles}
                onSwitchAccount={handleSwitchAccount}
                onAddProfile={handleAddProfile}
                onLogout={() => {
                  logoutUser()
                  navigate('/')
                }}
              />
            </>
          )}
          <Box sx={{ px: { xs: 2, sm: 2.2 }, pt: { xs: 2, sm: 2.2 }, pb: 'calc(96px + env(safe-area-inset-bottom))', flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain' }}>
        <Paper elevation={0} sx={{ borderRadius: 3, backgroundColor: 'background.paper', border: '1px solid var(--mui-palette-divider)', overflow: 'hidden' }}>
          <Box sx={{ px: 2.1, py: 2 }}>
            <Stack spacing={1.8}>
              <Button
                variant="text"
                startIcon={<ArrowLeft size={17} />}
                onClick={handleBack}
                sx={{ alignSelf: 'flex-start', px: 0.5, fontWeight: 700, color: 'text.primary', textTransform: 'none' }}
              >
                Back
              </Button>

              <Box sx={(theme) => ({
                overflow: 'hidden',
                borderRadius: 2.5,
                p: 1.35,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${theme.palette.background.paper} 78%)`,
              })}>
                <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                  <Avatar sx={(theme) => ({
                    width: 44,
                    height: 44,
                    bgcolor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                  })}>
                    {initials || 'C'}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 750, letterSpacing: '0.06em', lineHeight: 1.3 }}>
                      {subtitle}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, overflowWrap: 'anywhere' }}>
                      {title}
                    </Typography>
                  </Box>
                </Stack>

                {(detail.email || detail.phoneNumber) && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7, mt: 1.1, ml: { xs: 0, sm: '3.75rem' } }}>
                    {detail.email && (
                      <Box
                        component="a"
                        href={`mailto:${detail.email}`}
                        aria-label={`Email ${title}`}
                        sx={(theme) => ({
                          minWidth: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.65,
                          px: 0.85,
                          py: 0.55,
                          borderRadius: 1.5,
                          color: 'text.secondary',
                          textDecoration: 'none',
                          bgcolor: alpha(theme.palette.background.paper, 0.72),
                          '&:hover': { color: 'primary.main', bgcolor: theme.palette.background.paper },
                        })}
                      >
                        <Mail size={14} />
                        <Typography variant="caption" sx={{ maxWidth: 175, fontWeight: 650 }} noWrap>{detail.email}</Typography>
                      </Box>
                    )}
                    {detail.phoneNumber && (
                      <Box
                        component="a"
                        href={`tel:${detail.phoneNumber}`}
                        aria-label={`Call ${title}`}
                        sx={(theme) => ({
                          minWidth: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.65,
                          px: 0.85,
                          py: 0.55,
                          borderRadius: 1.5,
                          color: 'text.secondary',
                          textDecoration: 'none',
                          bgcolor: alpha(theme.palette.background.paper, 0.72),
                          '&:hover': { color: 'primary.main', bgcolor: theme.palette.background.paper },
                        })}
                      >
                        <Phone size={14} />
                        <Typography variant="caption" sx={{ fontWeight: 650 }} noWrap>{detail.phoneNumber}</Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
                {[
                  { label: 'Invoices', value: invoices.length, icon: ReceiptText },
                  { label: 'Appointments', value: appointments.length, icon: CalendarDays },
                  { label: 'Memberships', value: memberships.length, icon: ShieldCheck },
                  { label: 'Total billed', value: formatCurrency(totalInvoiced), icon: CreditCard },
                ].map(({ label, value, icon: Icon }) => (
                  <Box
                    key={label}
                    sx={(theme) => ({
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1.1,
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                      bgcolor: theme.palette.background.default,
                    })}
                  >
                    <Box sx={(theme) => ({
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 1.5,
                      color: theme.palette.primary.main,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    })}>
                      <Icon size={16} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>{label}</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>{value}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Stack>
          </Box>
        </Paper>

      <Stack spacing={1.5} sx={{ mt: 1.5, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, px: 0.2 }}>
          <Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 850, letterSpacing: '-0.03em' }}>Customer activity</Typography>
            <Typography variant="body2" color="text.secondary">Invoices, memberships and payment history</Typography>
          </Box>
          {role === 'BUSINESS' && businessId != null && (
            <Button size="small" variant="contained" startIcon={<Plus size={15} />} onClick={openInvoiceDialog} sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 800, borderRadius: 2 }}>
              Invoice
            </Button>
          )}
        </Box>
        {historySections.map(({ title: sectionTitle, icon: Icon, records }) => (
          <Card key={sectionTitle} variant="outlined" sx={{ borderRadius: 2.5, borderColor: (theme) => alpha(theme.palette.text.primary, 0.09), boxShadow: '0 4px 16px rgba(20, 40, 40, 0.035)' }}>
            <CardContent sx={{ p: 1.6, '&:last-child': { pb: 1.6 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.1 }}>
                <Box sx={(theme) => ({ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 1.5, color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.09) })}>
                  <Icon size={17} />
                </Box>
                <Typography variant="subtitle1" component="h3" sx={{ flex: 1, fontWeight: 800 }}>{sectionTitle}</Typography>
                {sectionTitle === 'Memberships' && role === 'BUSINESS' && businessId != null && (
                  <Button size="small" onClick={() => setMembershipManagerOpen(true)} sx={{ minWidth: 0, px: 0.8, textTransform: 'none', fontWeight: 700 }}>Manage</Button>
                )}
                <Chip size="small" variant="outlined" label={records.length} sx={{ fontWeight: 700, borderColor: (theme) => alpha(theme.palette.text.primary, 0.12) }} />
              </Box>
              {records.length ? (
                <Stack divider={<Divider flexItem />}>
                  {records.map((record) => (
                    <Box key={record.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, py: 1.1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 750, overflowWrap: 'anywhere' }}>{record.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>{record.detail}</Typography>
                      </Box>
                      <Chip size="small" variant="outlined" label={record.status} sx={{ flexShrink: 0, maxWidth: '42%', fontWeight: 650, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ py: 1.1, px: 1.2, borderRadius: 1.5, bgcolor: 'background.default' }}>
                  <Typography variant="body2" color="text.secondary">No {sectionTitle.toLowerCase()} recorded yet.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
        {role === 'BUSINESS' && businessId != null && (
          <AppointmentListCard
            appointments={appointments.filter((appointment) => appointment.businessId == null || appointment.businessId === businessId)}
            customers={dashboard.data.customers}
            businessId={businessId}
            onUpdated={() => dispatch(fetchBusinessDashboard(businessId))}
          />
        )}
      </Stack>
      {role === 'BUSINESS' && businessId != null && (
        <>
          <CustomerMembershipManager
            open={membershipManagerOpen}
            businessId={businessId}
            customer={detail}
            memberships={memberships.filter((membership) => membership.businessId === businessId)}
            onClose={() => setMembershipManagerOpen(false)}
            onUpdated={() => dispatch(fetchBusinessDashboard(businessId))}
          />
          <InvoiceGeneratorCard
            open={invoiceDialogOpen}
            businessId={businessId}
            data={{
              ...dashboard.data,
              customers: [detail],
              memberships: memberships.filter((membership) => membership.businessId === businessId),
            }}
            selectedCustomer={invoiceCustomer}
            customerSearchText={invoiceSearchText}
            customerSearchResults={dashboard.data.customers}
            isCustomerSearching={false}
            invoiceForm={invoiceForm}
            invoiceMessage={invoiceMessage}
            isSubmitting={isInvoiceSubmitting}
            invoiceMessageSeverity={invoiceMessageSeverity}
            onClose={() => setInvoiceDialogOpen(false)}
            onCustomerSearchChange={setInvoiceSearchText}
            onCustomerSelection={(customer) => {
              setInvoiceCustomer(customer)
              if (customer) {
                handleInvoiceFieldChange('customerId', String(customer.id))
              }
            }}
            onInvoiceFieldChange={handleInvoiceFieldChange}
            onInvoiceItemChange={handleInvoiceItemChange}
            onAddItem={() => setInvoiceForm((current) => ({ ...current, items: [...current.items, createInvoiceItem()] }))}
            onRemoveItem={(itemId) => setInvoiceForm((current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId) }))}
            onCreateInvoice={(status) => void handleCreateInvoice(status)}
          />
        </>
      )}
          </Box>

          <BottomNavBar activeTab="customers" membershipsEnabled={business?.membershipsEnabled ?? true} onChangeTab={handleNavigateTab} />
        </Paper>
      </Container>
    </Box>
  )
}
