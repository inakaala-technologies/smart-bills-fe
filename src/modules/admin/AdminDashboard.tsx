import { useState } from 'react'
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
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { EmptyState } from '../../components/EmptyState'
import { RecentActivityItem } from '../../components/RecentActivityItem'
import { createInvoice } from '../../services/api'
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
}

function DashboardMenu({ activeTab, anchorEl, isOpen, onClose }: DashboardMenuProps) {
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
            dispatch(setActiveTab(tab.key))
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

function defaultDueDate() {
  const dueDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
  return dueDate.toISOString().slice(0, 10)
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
    dueDate: defaultDueDate(),
  }))
  const [invoiceMessage, setInvoiceMessage] = useState('')
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const isMenuOpen = Boolean(menuAnchorEl)

  const recentActivity = data.invoices.slice(0, 3).map((invoice) => ({
    label: invoice.invoiceNumber ?? `INV-${invoice.id}`,
    detail: `${invoice.status ?? 'SENT'} • ${formatCurrency(invoice.totalAmount)}`,
    value: formatCurrency(invoice.totalAmount),
  }))

  const handleChangeTab = (tab: DashboardTab) => {
    dispatch(setActiveTab(tab))
  }

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
      dueDate: invoiceForm.dueDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
      subtotal,
      gstAmount,
      totalAmount,
      status: 'SENT',
    })

    if (!result.ok) {
      setInvoiceMessage(result.message ?? 'Invoice generation failed.')
      return
    }

    setInvoiceMessage(`Invoice ${result.invoice?.invoiceNumber ?? 'generated'} sent to the selected customer.`)
    setInvoiceForm((current) => ({ ...current, productName: '', quantity: '1', unitPrice: '0', gstRate: '18' }))
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

        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'background.paper',
            borderTop: '1px solid var(--mui-palette-divider)',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            py: 1.2,
            px: 1,
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
                  color: isActive ? '#10b981' : '#64748b',
                  transition: 'color 0.18s ease',
                  py: 0.5,
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.6 : 2}
                  color={isActive ? '#10b981' : '#64748b'}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '11px',
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
