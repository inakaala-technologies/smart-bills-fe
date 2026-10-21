import { useEffect, useState } from 'react'
import { alpha } from '@mui/material/styles'
import { Box, Button, Card, CardContent, Chip, CircularProgress, Container, Divider, Paper, Stack, Typography } from '@mui/material'
import { CalendarDays, CreditCard, Plus, ReceiptText, ShieldCheck } from 'lucide-react'
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

function getDefaultDueDate() {
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10)
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
  const [isInvoiceSubmitting, setIsInvoiceSubmitting] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState<BusinessInvoiceForm>(() => ({ customerId: '', dueDate: getDefaultDueDate(), loyaltyPointsToRedeem: '0', items: [createInvoiceItem()] }))
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
  const fields: Array<[string, string]> = [
    ['Customer ID', String(detail.id)],
    ['Email', detail.email ?? 'Not provided'],
    ['Phone', detail.phoneNumber ?? 'Not provided'],
    ['Name', detail.fullName ?? 'Not provided'],
  ]
  const formatDate = (value?: string) => value
    ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date not available'
  const formatCurrency = (value?: number) => typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : '—'

  const openInvoiceDialog = () => {
    setInvoiceForm({ customerId: detail.id, dueDate: getDefaultDueDate(), loyaltyPointsToRedeem: '0', items: [createInvoiceItem()] })
    setInvoiceCustomer(detail)
    setInvoiceSearchText('')
    setInvoiceMessage('')
    setInvoiceDialogOpen(true)
  }

  const handleInvoiceFieldChange = (field: 'customerId' | 'dueDate' | 'loyaltyPointsToRedeem', value: string) => {
    setInvoiceForm((current) => ({ ...current, [field]: value }))
  }

  const handleInvoiceItemChange = (itemId: string, field: keyof Omit<InvoiceLineItemForm, 'id'>, value: string) => {
    setInvoiceForm((current) => ({ ...current, items: current.items.map((item) => item.id === itemId ? { ...item, [field]: value } : item) }))
  }

  const handleCreateInvoice = async (status: 'DRAFT' | 'SENT') => {
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
    setIsInvoiceSubmitting(true)
    try {
      const result = await createInvoice({
        businessId,
        customerId,
        invoiceNumber: `INV-${Date.now()}`,
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: invoiceForm.dueDate || getDefaultDueDate(),
        subtotal,
        gstAmount,
        totalAmount: Number((subtotal + gstAmount).toFixed(2)),
        status,
        loyaltyPointsToRedeem: Math.max(0, Math.floor(Number(invoiceForm.loyaltyPointsToRedeem) || 0)),
      })
      if (!result.ok) {
        setInvoiceMessage(result.message ?? 'Invoice generation failed.')
        return
      }

      setInvoiceMessage(status === 'DRAFT'
        ? `Invoice ${result.invoice?.invoiceNumber ?? 'draft'} saved as a draft.`
        : `Invoice ${result.invoice?.invoiceNumber ?? 'generated'} sent to the selected customer.`)
      setInvoiceForm((current) => ({ ...current, customerId: '', loyaltyPointsToRedeem: '0', items: [createInvoiceItem()] }))
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

  const handleBack = () => navigate('/dashboard')
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
        <Paper elevation={0} sx={{ borderRadius: 2.5, backgroundColor: 'background.paper', border: '1px solid var(--mui-palette-divider)', overflow: 'hidden' }}>
        <Box sx={{ px: 2.1, py: 2.1 }}>
          <Stack spacing={2}>
            <Button variant="text" onClick={handleBack} sx={(theme) => ({ alignSelf: 'flex-start', px: 0, fontWeight: 700, color: theme.palette.text.primary, textTransform: 'none' })}>
              ← Back
            </Button>

            <Box sx={(theme) => ({ background: theme.palette.primary.light, borderRadius: 1.25, p: 1.5, border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}` })}>
              <Typography variant="caption" sx={(theme) => ({ color: theme.palette.primary.main, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800 })}>
                {subtitle}
              </Typography>
              <Typography variant="h4" sx={(theme) => ({ mt: 0.8, fontWeight: 900, letterSpacing: '-0.07em', color: theme.palette.text.primary })}>{title}</Typography>
            </Box>

            <Box sx={(theme) => ({ background: theme.palette.common.white, borderRadius: 1.25, border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`, p: 1.2 })}>
              <Stack spacing={1}>
                {fields.map(([label, value]) => (
                  <Box key={label} sx={(theme) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.2, px: 0.8, py: 0.8, borderRadius: 1, background: theme.palette.background.default, border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}` })}>
                    <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 })}>
                      {label}
                    </Typography>
                    <Typography sx={(theme) => ({ fontWeight: 800, color: theme.palette.text.primary, textAlign: 'right', wordBreak: 'break-word' })}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Paper>

      <Stack spacing={1.5} sx={{ mt: 1.5, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Customer interactions</Typography>
          {role === 'BUSINESS' && businessId != null && (
            <Button size="small" variant="contained" startIcon={<Plus size={15} />} onClick={openInvoiceDialog} sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 800 }}>
              New invoice
            </Button>
          )}
        </Box>
        {historySections.map(({ title: sectionTitle, icon: Icon, records }) => (
          <Card key={sectionTitle} variant="outlined" sx={{ borderRadius: 2, borderColor: (theme) => alpha(theme.palette.text.primary, 0.1) }}>
            <CardContent sx={{ '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: records.length ? 1 : 0 }}>
                <Icon size={18} />
                <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 800 }}>{sectionTitle}</Typography>
                {sectionTitle === 'Memberships' && role === 'BUSINESS' && businessId != null && (
                  <Button size="small" onClick={() => setMembershipManagerOpen(true)} sx={{ minWidth: 0, px: 0.8, textTransform: 'none' }}>Manage</Button>
                )}
                <Chip size="small" label={records.length} />
              </Box>
              {records.length ? (
                <Stack divider={<Divider flexItem />}>
                  {records.map((record) => (
                    <Box key={record.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, py: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{record.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{record.detail}</Typography>
                      </Box>
                      <Chip size="small" variant="outlined" label={record.status} sx={{ flexShrink: 0 }} />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No {sectionTitle.toLowerCase()} recorded.</Typography>
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
            onClose={() => setInvoiceDialogOpen(false)}
            onCustomerSearchChange={setInvoiceSearchText}
            onCustomerSelection={(customer) => {
              setInvoiceCustomer(customer)
              if (customer) {
                handleInvoiceFieldChange('customerId', String(customer.id))
                handleInvoiceFieldChange('loyaltyPointsToRedeem', '0')
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
