import { useCallback, useEffect, useMemo, useState } from 'react'
import { alpha } from '@mui/material/styles'
import {
  Box,
  Container,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import {
  Building2,
  FileText,
  Home,
  LayoutGrid,
  ReceiptText,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { AppointmentDetailDialog } from '../../components/AppointmentDetailDialog'
import { EmptyState } from '../../components/EmptyState'
import { RecentActivityItem } from '../../components/RecentActivityItem'
import { createInvoice, fetchAppointmentById, type AppointmentSummary } from '../../services/api'
import { getCurrentUser, logoutUser } from '../../services/auth'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchAdminDashboard, setActiveTab, setSelectedBusinessId } from '../../store/adminDashboardSlice'
import type { DashboardTab } from '../types'
import { AdminSummaryCards, AdminOverviewSection } from './components/AdminDashboardOverview'
import { AdminListCard, AdminProfileCard } from './components/AdminDashboardPanels'
import { AdminInvoiceGeneratorCard, type AdminInvoiceForm } from './components/AdminInvoiceGeneratorCard'

const roleNav: Array<{ key: DashboardTab; label: string; icon: LucideIcon }> = [
  { key: 'overview', label: 'Home', icon: Home },
  { key: 'businesses', label: 'Businesses', icon: LayoutGrid },
  { key: 'invoices', label: 'Documents', icon: FileText },
  { key: 'profile', label: 'Profile', icon: UserRound },
]

type DashboardMenuProps = {
  activeTab: DashboardTab
  anchorEl: null | HTMLElement
  isOpen: boolean
  onClose: () => void
  onChangeTab?: (tab: DashboardTab) => void
}

function DashboardMenu({ activeTab, anchorEl, isOpen, onClose, onChangeTab }: DashboardMenuProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  return (
    <Menu
      id="admin-menu"
      anchorEl={anchorEl}
      open={isOpen}
      onClose={onClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      slotProps={{
        paper: {
          sx: (theme) => ({
            mt: 1,
            minWidth: 180,
            borderRadius: 2.5,
            border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
            boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, 0.12)}`,
          }),
        },
      }}
    >
      {roleNav.map((tab) => (
        <MenuItem
          key={tab.key}
          selected={activeTab === tab.key}
          onClick={() => {
            if (onChangeTab) {
              onChangeTab(tab.key)
            } else {
              dispatch(setActiveTab(tab.key))
            }
            onClose()
          }}
          sx={{ gap: 1, py: 1.1, fontWeight: 600 }}
        >
          {tab.key === 'overview' ? <Home size={16} /> : tab.key === 'businesses' ? <Building2 size={16} /> : tab.key === 'invoices' ? <ReceiptText size={16} /> : <UserRound size={15} />}
          {tab.label}
        </MenuItem>
      ))}
      <MenuItem
        onClick={() => {
          logoutUser()
          onClose()
          navigate('/')
        }}
        sx={{ gap: 1, py: 1.1, fontWeight: 700, color: 'error.main' }}
      >
        Logout
      </MenuItem>
    </Menu>
  )
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const authUser = getCurrentUser()
  const { data, activeTab, selectedBusinessId } = useAppSelector((state) => state.adminDashboard)

  const selectedBusiness = data.businesses.find((business) => business.id === selectedBusinessId) ?? data.businesses[0] ?? null
  const [invoiceForm, setInvoiceForm] = useState<AdminInvoiceForm>(() => ({
    customerId: data.customers[0]?.id ?? '',
    productName: '',
    quantity: '1',
    unitPrice: '0',
    gstRate: '18',
    dueDate: '',
  }))
  const [invoiceMessage, setInvoiceMessage] = useState('')
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const isMenuOpen = Boolean(menuAnchorEl)
  const [searchParams, setSearchParams] = useSearchParams()
  const [explicitAppointment, setExplicitAppointment] = useState<AppointmentSummary | null>(null)
  const setSelectedAppointment = setExplicitAppointment
  const appointmentIdFromUrl = searchParams.get('appointmentId') ? Number(searchParams.get('appointmentId')) : null

  const selectedAppointment = useMemo(() => {
    if (appointmentIdFromUrl) {
      const fromList = data.appointments.find((item) => item.id === appointmentIdFromUrl)
      if (fromList) return fromList
      if (explicitAppointment?.id === appointmentIdFromUrl) return explicitAppointment
    }
    return explicitAppointment
  }, [appointmentIdFromUrl, data.appointments, explicitAppointment])

  const handleChangeTab = useCallback((tab: DashboardTab) => {
    dispatch(setActiveTab(tab))
    if (searchParams.has('appointmentId') || searchParams.has('tab')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('appointmentId')
      nextParams.delete('tab')
      setSearchParams(nextParams, { replace: true })
    }
  }, [dispatch, searchParams, setSearchParams])

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

  const recentActivity = data.invoices.slice(0, 3).map((invoice) => ({
    label: invoice.invoiceNumber ?? `INV-${invoice.id}`,
    detail: `${invoice.status ?? 'SENT'} • ${formatCurrency(invoice.totalAmount)}`,
    value: formatCurrency(invoice.totalAmount),
  }))

  const handleSelectBusiness = (businessId: number) => {
    dispatch(setSelectedBusinessId(businessId))
  }

  const handleOpenBusiness = (businessId: number) => {
    dispatch(setSelectedBusinessId(businessId))
    navigate(`/business/${businessId}`)
  }

  const handleInvoiceInput = (field: keyof typeof invoiceForm, value: string) => {
    setInvoiceForm((current) => ({ ...current, [field]: value }))
  }

  const handleCreateInvoice = async () => {
    const businessId = selectedBusinessId ?? selectedBusiness?.id ?? data.businesses[0]?.id
    const customerId = Number(invoiceForm.customerId)
    const quantity = Number(invoiceForm.quantity) || 1
    const unitPrice = Number(invoiceForm.unitPrice) || 0
    const gstRate = Number(invoiceForm.gstRate) || 0

    if (!businessId || !customerId || quantity <= 0 || unitPrice <= 0) {
      setInvoiceMessage('Select a customer and enter valid product details before generating an invoice.')
      return
    }

    const subtotal = quantity * unitPrice
    const gstAmount = subtotal * (gstRate / 100)
    const totalAmount = subtotal + gstAmount

    const result = await createInvoice({
      businessId,
      customerId,
      invoiceNumber: `INV-${Date.now()}`,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: invoiceForm.dueDate || undefined,
      subtotal,
      gstAmount,
      totalAmount,
      status: invoiceForm.dueDate ? 'SENT' : 'PAID',
    })

    if (!result.ok) {
      setInvoiceMessage(result.message ?? 'Invoice generation failed.')
      return
    }

    setInvoiceMessage(invoiceForm.dueDate
      ? `Invoice ${result.invoice?.invoiceNumber ?? 'generated'} sent as pending to the selected customer.`
      : `Invoice ${result.invoice?.invoiceNumber ?? 'generated'} created and marked as paid.`)
    setInvoiceForm((current) => ({ ...current, productName: '', quantity: '1', unitPrice: '0', gstRate: '18', dueDate: '' }))
    dispatch(fetchAdminDashboard())
  }

  const customerItems = data.customers.map((customer) => ({
    id: customer.id,
    title: customer.fullName ?? 'Customer',
    subtitle: customer.email ?? 'No email',
    action: { label: 'View', onClick: () => navigate(`/customer/${customer.id}`) },
  }))

  const appointmentItems = data.appointments.map((appointment) => ({
    id: appointment.id,
    title: appointment.serviceName ?? `Appointment ${appointment.id}`,
    subtitle: appointment.scheduledAt ? new Date(appointment.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Schedule pending',
    status: appointment.status ?? 'BOOKED',
    action: { label: 'View', onClick: () => setSelectedAppointment(appointment) },
  }))

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        py: { xs: 2, sm: 4 },
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <Container maxWidth="xs" disableGutters sx={{ px: { xs: 1.5, sm: 0 } }}>
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 412,
            mx: 'auto',
            borderRadius: '24px',
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
            contextLabel={authUser?.email ?? 'Admin workspace'}
            roleLabel="Administrator"
            menuId="admin-menu"
            isMenuOpen={isMenuOpen}
            onOpenMenu={(event) => setMenuAnchorEl(event.currentTarget)}
          />

          <DashboardMenu
            activeTab={activeTab}
            anchorEl={menuAnchorEl}
            isOpen={isMenuOpen}
            onClose={() => setMenuAnchorEl(null)}
            onChangeTab={handleChangeTab}
          />

          <Box sx={{ p: { xs: 2, sm: 2.2 }, pb: 10 }}>
            <Stack spacing={1.6}>
              <Box sx={(theme) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, background: alpha(theme.palette.primary.main, 0.06), borderRadius: 2.5, px: 1.2, py: 0.8 })}>
                <Typography variant="caption" sx={(theme) => ({ fontWeight: 700, color: theme.palette.primary.dark })}>Active business</Typography>
                <Select size="small" value={selectedBusinessId ?? data.businesses[0]?.id ?? ''} onChange={(event) => handleSelectBusiness(Number(event.target.value))} sx={{ minWidth: 150, '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, background: 'background.paper', borderRadius: 2 }}>
                  {data.businesses.map((business) => (
                    <MenuItem key={business.id} value={business.id}>{business.businessName ?? business.name ?? `Business ${business.id}`}</MenuItem>
                  ))}
                </Select>
              </Box>

            {activeTab === 'overview' && (
              <>
                <Box sx={(theme) => ({ background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.success.main, 0.08)} 54%, ${alpha(theme.palette.grey[50], 0.8)} 100%)`, borderRadius: 3.2, p: 1.8, border: `1px solid ${alpha(theme.palette.text.primary, 0.04)}`, boxShadow: `0 16px 30px ${alpha(theme.palette.success.main, 0.08)}` })}>
                  <Typography variant="caption" sx={(theme) => ({ color: theme.palette.primary.main, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' })}>BHive</Typography>
                  <Typography variant="h6" sx={{ mt: 0.7, fontWeight: 800, letterSpacing: '-0.05em' }}>Operations overview</Typography>
                  <Typography variant="body2" sx={(theme) => ({ mt: 0.7, color: theme.palette.text.secondary, maxWidth: 220 })}>
                    Keep a close watch on business performance and invoice flow.
                  </Typography>
                </Box>

                <AdminSummaryCards />

                <Box sx={(theme) => ({ background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${theme.palette.common.white} 100%)`, borderRadius: 3.5, p: 1.5, border: `1px solid ${alpha(theme.palette.text.primary, 0.05)}`, boxShadow: `0 14px 28px ${alpha(theme.palette.common.black, 0.04)}` })}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Recent activity</Typography>
                    <Typography variant="caption" sx={(theme) => ({ color: theme.palette.primary.main, fontWeight: 700 })}>See all</Typography>
                  </Box>

                  {recentActivity.length > 0 ? (
                    <Stack spacing={1.1}>
                      {recentActivity.map((entry, idx) => (
                        <RecentActivityItem
                          key={`${entry.label}-${idx}`}
                          title={entry.label}
                          subtitle={entry.detail}
                          amount={entry.value}
                          badge={entry.label.slice(0, 2).toUpperCase()}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <EmptyState title="No activity" description="Financial activity will show here." />
                  )}
                </Box>

                <AdminOverviewSection onOpenBusiness={handleOpenBusiness} />
                <AdminInvoiceGeneratorCard invoiceForm={invoiceForm} invoiceMessage={invoiceMessage} onInvoiceFieldChange={handleInvoiceInput} onCreateInvoice={handleCreateInvoice} />
              </>
            )}

            {activeTab === 'businesses' && <AdminOverviewSection onOpenBusiness={handleOpenBusiness} />}

            {activeTab === 'invoices' && <AdminInvoiceGeneratorCard invoiceForm={invoiceForm} invoiceMessage={invoiceMessage} onInvoiceFieldChange={handleInvoiceInput} onCreateInvoice={handleCreateInvoice} />}

            {activeTab === 'customers' && <AdminListCard title="Customers" items={customerItems} emptyTitle="No customers" emptyDescription="Customer records will appear here." />}
            {activeTab === 'appointments' && <AdminListCard title="Appointments" items={appointmentItems} emptyTitle="No appointments" emptyDescription="Scheduled bookings will show here." />}
            {activeTab === 'profile' && <AdminProfileCard authUser={authUser} />}
          </Stack>
        </Box>

        <AppointmentDetailDialog
          open={Boolean(selectedAppointment)}
          appointment={selectedAppointment}
          businesses={data.businesses}
          customers={data.customers}
          role="ADMIN"
          onClose={() => {
            setSelectedAppointment(null)
            clearAppointmentUrlParam()
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            bottom: 'calc(10px + env(safe-area-inset-bottom))',
            left: 12,
            right: 12,
            backgroundColor: 'background.paper',
            border: '1px solid var(--mui-palette-divider)',
            borderRadius: 999,
            boxShadow: '0 8px 24px rgba(15, 3, 45, 0.14)',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            py: 0.7,
            px: 0.6,
            zIndex: 10,
          }}
        >
          {roleNav.map((tab) => {
            const isActive = activeTab === tab.key
            const Icon = tab.icon

            return (
              <Box
                key={tab.key}
                onClick={() => handleChangeTab(tab.key)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.6,
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'primary.main' : 'transparent',
                  borderRadius: 999,
                  transition: 'background-color 0.18s ease, color 0.18s ease',
                  py: 0.7,
                  px: 0.4,
                  color: isActive ? 'primary.contrastText' : 'text.secondary',
                }}
              >
                <Icon
                  size={19}
                  strokeWidth={isActive ? 2.6 : 2}
                  color={isActive ? 'var(--mui-palette-primary-contrastText)' : 'var(--mui-palette-text-secondary)'}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '10px',
                    lineHeight: 1,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {tab.label}
                </Typography>
              </Box>
            )
          })}
        </Box>
      </Paper>
    </Container>
  </Box>
  )
}
