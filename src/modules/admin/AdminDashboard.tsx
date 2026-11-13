import { useCallback, useEffect, useMemo, useState } from 'react'
import { alpha } from '@mui/material/styles'
import {
  Box,
  ButtonBase,
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
  CalendarDays,
  FileText,
  Home,
  LayoutGrid,
  KeyRound,
  ReceiptText,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { AppointmentDetailDialog } from '../../components/AppointmentDetailDialog'
import { createInvoice, fetchAppointmentById, type AppointmentSummary } from '../../services/api'
import { getCurrentUser, logoutUser } from '../../services/auth'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchAdminDashboard, setActiveTab, setSelectedBusinessId } from '../../store/adminDashboardSlice'
import type { DashboardTab } from '../types'
import { AdminSummaryCards, AdminOverviewSection } from './components/AdminDashboardOverview'
import { AdminListCard, AdminProfileCard } from './components/AdminDashboardPanels'
import { AdminInvoiceGeneratorCard, type AdminInvoiceForm } from './components/AdminInvoiceGeneratorCard'
import { AdminPosPartnerApplications } from './components/AdminPosPartnerApplications'
import { getDashboardPath } from '../../routes/dashboardPaths'

const roleNav: Array<{ key: DashboardTab; label: string; icon: LucideIcon }> = [
  { key: 'overview', label: 'Home', icon: Home },
  { key: 'businesses', label: 'Businesses', icon: LayoutGrid },
  { key: 'invoices', label: 'Documents', icon: FileText },
  { key: 'profile', label: 'Profile', icon: UserRound },
]
const adminNavigation: Array<{ key: DashboardTab; label: string; icon: LucideIcon }> = [
  { key: 'overview', label: 'Overview', icon: Home },
  { key: 'businesses', label: 'Businesses', icon: Building2 },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'appointments', label: 'Appointments', icon: CalendarDays },
  { key: 'invoices', label: 'Invoices', icon: FileText },
  { key: 'partner-applications', label: 'POS partners', icon: KeyRound },
  { key: 'profile', label: 'Profile', icon: UserRound },
]
const adminDashboardTabs: DashboardTab[] = ['overview', 'businesses', 'invoices', 'customers', 'appointments', 'profile', 'partner-applications']

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
      {adminNavigation.map((tab) => {
        const Icon = tab.icon
        return (
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
            <Icon size={16} />
            {tab.label}
          </MenuItem>
        )
      })}
      <MenuItem
        onClick={() => {
          navigate('/dev/receipt-sender')
          onClose()
        }}
        sx={{ gap: 1, py: 1.1, fontWeight: 600 }}
      >
        <ReceiptText size={16} />
        Receipt sender test
      </MenuItem>
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

export function AdminDashboard() {
  const navigate = useNavigate()
  const { tab: routeTab } = useParams()
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
    navigate(getDashboardPath('ADMIN', tab))
  }, [dispatch, navigate])

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
    const requestedTab = routeTab ?? searchParams.get('tab')
    const matchingTab = adminDashboardTabs.find((tab) => tab === requestedTab)
    if (routeTab && !matchingTab) {
      navigate(getDashboardPath('ADMIN', 'overview'), { replace: true })
      return
    }
    if (matchingTab) {
      dispatch(setActiveTab(matchingTab))
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
  }, [searchParams, routeTab, appointmentIdFromUrl, data.appointments, explicitAppointment, dispatch, navigate])

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
        px: { xs: 0, sm: 2 },
        py: { xs: 0, sm: 3 },
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <Container maxWidth="xl" disableGutters sx={{ width: '100%' }}>
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            mx: 'auto',
            minHeight: { xs: '100vh', sm: 'calc(100vh - 48px)' },
            borderRadius: { xs: 0, sm: 4 },
            backgroundColor: 'background.paper',
            border: '1px solid var(--mui-palette-divider)',
            boxShadow: { xs: 'none', sm: '0 18px 46px rgba(15, 3, 45, 0.08)' },
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

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '236px minmax(0, 1fr)' }, flex: 1, minHeight: 0 }}>
            <Box
              component="aside"
              sx={(theme) => ({
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                gap: 1.5,
                p: 2.2,
                borderRight: `1px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.primary.main, 0.025),
              })}
            >
              <Box sx={{ px: 1, pb: 0.5 }}>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: '0.12em' }}>
                  Admin workspace
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Manage BHive operations
                </Typography>
              </Box>
              <Stack component="nav" aria-label="Admin dashboard navigation" spacing={0.5}>
                {adminNavigation.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.key
                  return (
                    <ButtonBase
                      key={tab.key}
                      onClick={() => handleChangeTab(tab.key)}
                      aria-current={isActive ? 'page' : undefined}
                      sx={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        gap: 1.2,
                        px: 1.2,
                        py: 1.15,
                        borderRadius: 2,
                        color: isActive ? 'primary.dark' : 'text.secondary',
                        backgroundColor: isActive ? 'primary.light' : 'transparent',
                        '&:hover': { backgroundColor: isActive ? 'primary.light' : 'action.hover' },
                      }}
                    >
                      <Icon size={18} />
                      <Typography variant="body2" sx={{ fontWeight: isActive ? 800 : 600 }}>
                        {tab.label}
                      </Typography>
                    </ButtonBase>
                  )
                })}
              </Stack>
              <Box sx={{ mt: 'auto', p: 1.2, borderRadius: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700 }}>
                  Signed in as
                </Typography>
                <Typography variant="body2" noWrap sx={{ mt: 0.35, fontWeight: 700 }}>
                  {authUser?.email ?? 'Administrator'}
                </Typography>
              </Box>
            </Box>

            <Box component="main" sx={{ minWidth: 0, p: { xs: 2, sm: 2.5, lg: 3.5 }, pb: { xs: 11, md: 3.5 } }}>
              <Stack spacing={2.2}>
              {activeTab !== 'partner-applications' && <Box sx={(theme) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, background: alpha(theme.palette.primary.main, 0.06), borderRadius: 2.5, px: 1.2, py: 0.8 })}>
                <Typography variant="caption" sx={(theme) => ({ fontWeight: 700, color: theme.palette.primary.dark })}>Active business</Typography>
                <Select size="small" value={selectedBusinessId ?? data.businesses[0]?.id ?? ''} onChange={(event) => handleSelectBusiness(Number(event.target.value))} sx={{ minWidth: 150, '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, background: 'background.paper', borderRadius: 2 }}>
                  {data.businesses.map((business) => (
                    <MenuItem key={business.id} value={business.id}>{business.businessName ?? business.name ?? `Business ${business.id}`}</MenuItem>
                  ))}
                </Select>
              </Box>}

            {activeTab === 'overview' && (
              <>
                <Box sx={(theme) => ({ background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.secondary.main, 0.07)} 54%, ${theme.palette.background.paper} 100%)`, borderRadius: 3.2, p: { xs: 2, sm: 2.5 }, border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`, boxShadow: `0 16px 30px ${alpha(theme.palette.primary.main, 0.08)}` })}>
                  <Typography variant="caption" sx={(theme) => ({ color: theme.palette.primary.main, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' })}>BHive</Typography>
                  <Typography variant="h6" sx={{ mt: 0.7, fontWeight: 800, letterSpacing: '-0.05em' }}>Operations overview</Typography>
                  <Typography variant="body2" sx={(theme) => ({ mt: 0.7, color: theme.palette.text.secondary, maxWidth: 520 })}>
                      Monitor businesses, customer activity, appointments, invoices, and POS partner onboarding from one workspace.
                  </Typography>
                </Box>

                <AdminSummaryCards />

                <AdminOverviewSection onOpenBusiness={handleOpenBusiness} />
                <AdminInvoiceGeneratorCard invoiceForm={invoiceForm} invoiceMessage={invoiceMessage} onInvoiceFieldChange={handleInvoiceInput} onCreateInvoice={handleCreateInvoice} />
              </>
            )}

            {activeTab === 'businesses' && <AdminOverviewSection onOpenBusiness={handleOpenBusiness} />}

            {activeTab === 'invoices' && <AdminInvoiceGeneratorCard invoiceForm={invoiceForm} invoiceMessage={invoiceMessage} onInvoiceFieldChange={handleInvoiceInput} onCreateInvoice={handleCreateInvoice} />}

            {activeTab === 'customers' && <AdminListCard title="Customers" items={customerItems} emptyTitle="No customers" emptyDescription="Customer records will appear here." />}
            {activeTab === 'appointments' && <AdminListCard title="Appointments" items={appointmentItems} emptyTitle="No appointments" emptyDescription="Scheduled bookings will show here." />}
            {activeTab === 'partner-applications' && <AdminPosPartnerApplications />}
            {activeTab === 'profile' && <AdminProfileCard authUser={authUser} />}
              </Stack>
            </Box>
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
            '@media (min-width:900px)': { display: 'none' },
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
              <ButtonBase
                key={tab.key}
                onClick={() => handleChangeTab(tab.key)}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
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
                  width: '100%',
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
              </ButtonBase>
            )
          })}
        </Box>
      </Paper>
    </Container>
  </Box>
  )
}
