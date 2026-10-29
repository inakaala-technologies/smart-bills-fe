import { useEffect, useState } from 'react'
import { alpha } from '@mui/material/styles'
import { Box, Button, Card, CardContent, Chip, Container, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material'
import { ArrowRight, Bell, Building2, CalendarCheck2, FileText, LayoutGrid, Plus, Search, UserRound, Users } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { addBusinessMembership, createBusiness, createInvoice, type DashboardData } from '../services/api'
import { getCurrentUser, type Role } from '../services/auth'

export type DashboardTab = 'overview' | 'businesses' | 'customers' | 'appointments'

type DashboardPageProps = {
  authUser: { id: string; name: string; email: string; role: Role } | null
  data: DashboardData
  loading: boolean
  dashboardRole: Role
  activeTab: DashboardTab
  selectedBusinessId: number | null
  onSelectBusiness: (businessId: number) => void
  onLogout: () => void
  onOpenBusiness: (businessId: number) => void
  onOpenCustomer: (customerId: number) => void
  onRefreshData?: () => void
  onChangeTab: (tab: DashboardTab) => void
}

const tabs: Array<{ key: DashboardTab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'businesses', label: 'Businesses' },
  { key: 'customers', label: 'Customers' },
  { key: 'appointments', label: 'Appointments' },
]

const roleLabels: Record<Role, string> = {
  ADMIN: 'Admin',
  BUSINESS: 'Business',
  CUSTOMER: 'Customer',
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

export function DashboardPage({
  authUser,
  data,
  loading,
  dashboardRole,
  activeTab,
  selectedBusinessId,
  onSelectBusiness,
  onLogout,
  onOpenBusiness,
  onOpenCustomer,
  onRefreshData,
  onChangeTab,
}: DashboardPageProps) {
  const selectedBusiness = data.businesses.find((business) => business.id === selectedBusinessId) ?? data.businesses[0] ?? null

  const activeBusinessLabel = selectedBusiness ? (selectedBusiness.businessName ?? selectedBusiness.name ?? 'Business workspace') : 'No business selected'
  const [currentTime, setCurrentTime] = useState(new Date())

useEffect(() => {
  const interval = setInterval(() => {
    setCurrentTime(new Date())
  }, 60 * 1000)

  return () => clearInterval(interval)
}, [])

const hour = currentTime.getHours()

const greeting =
  hour >= 5 && hour < 13
    ? 'Good morning,'
    : hour >= 13 && hour < 16
      ? 'Good afternoon,'
      : hour >= 16 && hour < 20
        ? 'Good evening,'
        : 'Good night,'

  const [invoiceForm, setInvoiceForm] = useState<{ customerId: number | string; productName: string; description: string; quantity: string; unitPrice: string; gstRate: string; dueDate: string; notes: string }>(() => ({
    customerId: data.customers[0]?.id ?? '',
    productName: '',
    description: '',
    quantity: '1',
    unitPrice: '0',
    gstRate: '18',
    dueDate: '',
    notes: '',
  }))
  const [invoiceMessage, setInvoiceMessage] = useState('')
  const [businessForm, setBusinessForm] = useState({
    name: '',
    legalName: '',
    email: '',
    phone: '',
    address: '',
  })
  const [businessMessage, setBusinessMessage] = useState('')
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false)

  const selectedCustomerId = data.customers.some((customer) => customer.id === Number(invoiceForm.customerId))
    ? invoiceForm.customerId
    : data.customers[0]?.id ?? ''

  const handleInvoiceInput = (field: keyof typeof invoiceForm, value: string) => {
    setInvoiceForm((current) => ({ ...current, [field]: value }))
  }

  const handleCreateBusiness = async () => {
    const name = businessForm.name.trim()
    const email = businessForm.email.trim()

    if (!name) {
      setBusinessMessage('Business name is required.')
      return
    }

    const currentUser = getCurrentUser()
    setIsCreatingBusiness(true)
    setBusinessMessage('')

    const createResult = await createBusiness({
      name,
      legalName: businessForm.legalName || name,
      businessType: 'SERVICE',
      email: email || undefined,
      phone: businessForm.phone || undefined,
      address: businessForm.address || undefined,
      status: 'ACTIVE',
      tenantId: currentUser?.tenantId ?? 1,
    })

    if (!createResult.ok || !createResult.business) {
      setBusinessMessage(createResult.message ?? 'Could not create business.')
      setIsCreatingBusiness(false)
      return
    }

    const linkResult = await addBusinessMembership({
      businessId: Number(createResult.business.id),
      userId: Number(currentUser?.id ?? authUser?.id ?? 1),
      tenantId: currentUser?.tenantId ?? 1,
      role: 'MANAGER',
      status: 'ACTIVE',
    })

    if (!linkResult.ok) {
      setBusinessMessage(linkResult.message ?? 'Business was created, but access could not be linked.')
      setIsCreatingBusiness(false)
      return
    }

    setBusinessForm({ name: '', legalName: '', email: '', phone: '', address: '' })
    setBusinessMessage('Business created successfully.')
    setIsCreatingBusiness(false)
    onRefreshData?.()
  }

  const handleCreateInvoice = async () => {
    const businessId = selectedBusinessId ?? selectedBusiness?.id ?? data.businesses[0]?.id
    const customerId = Number(selectedCustomerId)
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
    const issueDate = new Date().toISOString().slice(0, 10)

    const result = await createInvoice({
      businessId,
      customerId,
      invoiceNumber: `INV-${Date.now()}`,
      issueDate,
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
    setInvoiceForm((current) => ({
      ...current,
      productName: '',
      description: '',
      quantity: '1',
      unitPrice: '0',
      gstRate: '18',
      dueDate: '',
      notes: '',
    }))
  }

  const summaryCards =
    dashboardRole === 'ADMIN'
      ? [
          { label: 'Businesses', value: data.businesses.length, tone: 'success' as const },
          { label: 'Customers', value: data.customers.length, tone: 'info' as const },
          { label: 'Invoices', value: data.invoices.length, tone: 'primary' as const },
          { label: 'Appointments', value: data.appointments.length, tone: 'warning' as const },
        ]
      : dashboardRole === 'CUSTOMER'
        ? [
            { label: 'My Bills', value: data.invoices.length, tone: 'primary' as const },
            { label: 'Businesses', value: data.businesses.length, tone: 'success' as const },
            { label: 'Appointments', value: data.appointments.length, tone: 'warning' as const },
            { label: 'Invoices', value: data.invoices.length, tone: 'secondary' as const },
          ]
        : [
            { label: 'Revenue', value: formatCurrency(data.invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0)), tone: 'success' as const },
            { label: 'Customers', value: data.customers.length, tone: 'info' as const },
            { label: 'Invoices', value: data.invoices.length, tone: 'primary' as const },
            { label: 'Appointments', value: data.appointments.length, tone: 'warning' as const },
          ]

  const recentActivity = data.invoices.slice(0, 3).map((invoice) => ({
    label: invoice.invoiceNumber ?? `INV-${invoice.id}`,
    detail: `${invoice.status ?? 'SENT'} • ${formatCurrency(invoice.totalAmount)}`,
    value: formatCurrency(invoice.totalAmount),
  }))

  const quickActions =
    dashboardRole === 'ADMIN'
      ? [
          { label: 'Add customer', icon: Users, target: 'customers' as DashboardTab },
          { label: 'Invoice', icon: FileText, target: 'overview' as DashboardTab },
          { label: 'Schedule', icon: CalendarCheck2, target: 'appointments' as DashboardTab },
        ]
      : dashboardRole === 'CUSTOMER'
        ? [
            { label: 'Bills', icon: FileText, target: 'overview' as DashboardTab },
            { label: 'Profile', icon: UserRound, target: 'customers' as DashboardTab },
            { label: 'Bookings', icon: CalendarCheck2, target: 'appointments' as DashboardTab },
          ]
        : [
            { label: 'Customers', icon: Users, target: 'customers' as DashboardTab },
            { label: 'Invoice', icon: FileText, target: 'overview' as DashboardTab },
            { label: 'Bookings', icon: CalendarCheck2, target: 'appointments' as DashboardTab },
          ]

  const renderOverview = () => (
    <Stack spacing={1.8}>
      <Box sx={(theme) => ({ background: alpha(theme.palette.primary.main, 0.03), borderRadius: 3, p: 1.5, border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}` })}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Business snapshot</Typography>
          <Chip label={selectedBusiness?.status ?? 'active'} size="small" sx={(theme) => ({ bgcolor: alpha(theme.palette.success.main, 0.14), color: theme.palette.success.dark, fontWeight: 700 })} />
        </Box>
        <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary, fontWeight: 700 })}>{activeBusinessLabel}</Typography>

        {data.businesses.length > 0 ? (
          <Stack spacing={1.2}>
            {data.businesses.slice(0, 3).map((business) => (
              <Box key={business.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{business.businessName ?? business.name ?? `Business ${business.id}`}</Typography>
                  <Typography variant="caption" color="text.secondary">{business.email ?? 'No email'}</Typography>
                </Box>
                <Button size="small" variant="text" onClick={() => onOpenBusiness(business.id)}>View</Button>
              </Box>
            ))}
          </Stack>
        ) : (
          <EmptyState title="No business data" description="Add a business connection to continue." />
        )}
      </Box>

      <Box sx={(theme) => ({ background: alpha(theme.palette.primary.main, 0.03), borderRadius: 3, p: 1.5, border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}` })}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Recent invoices</Typography>
          <Button size="small" variant="text" onClick={() => onChangeTab('overview')}>See all</Button>
        </Box>

        {recentActivity.length > 0 ? (
          <Stack spacing={1.1}>
            {recentActivity.map((entry, idx) => (
              <Box key={`${entry.label}-${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.9, borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{entry.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{entry.detail}</Typography>
                </Box>
                <Typography sx={(theme) => ({ fontWeight: 800, color: theme.palette.text.primary })}>{entry.value}</Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <EmptyState title="No activity" description="Financial activity will show here." />
        )}
      </Box>
    </Stack>
  )

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 390, mx: 'auto', borderRadius: 5, background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        {dashboardRole !== 'CUSTOMER' && data.businesses.length === 0 && (
          <Box sx={{ px: 2.1, pt: 2.1 }}>
            <Card variant="outlined" sx={{ borderRadius: 4, border: '1px solid var(--mui-palette-divider)', background: 'linear-gradient(180deg, var(--mui-palette-primary-light) 0%, var(--mui-palette-background-paper) 100%)' }}>
              <CardContent sx={{ p: 2.1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.5 }}>
                  <Box sx={{ width: 42, height: 42, borderRadius: 2.5, background: 'var(--mui-palette-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={20} color="#14532d" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Create your business</Typography>
                    <Typography variant="caption" color="text.secondary">Start your workspace and manage invoices from one place.</Typography>
                  </Box>
                </Box>

                <Stack spacing={1.2}>
                  <TextField size="small" label="Business name" value={businessForm.name} onChange={(event) => setBusinessForm((current) => ({ ...current, name: event.target.value }))} sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }} />
                  <TextField size="small" label="Legal name" value={businessForm.legalName} onChange={(event) => setBusinessForm((current) => ({ ...current, legalName: event.target.value }))} sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }} />
                  <TextField size="small" label="Email" value={businessForm.email} onChange={(event) => setBusinessForm((current) => ({ ...current, email: event.target.value }))} sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }} />
                  <TextField size="small" label="Phone" value={businessForm.phone} onChange={(event) => setBusinessForm((current) => ({ ...current, phone: event.target.value }))} sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }} />
                  <TextField size="small" label="Address" multiline minRows={2} value={businessForm.address} onChange={(event) => setBusinessForm((current) => ({ ...current, address: event.target.value }))} sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }} />
                  <Button
                    variant="contained"
                    disabled={isCreatingBusiness}
                    startIcon={<Plus size={15} />}
                    onClick={handleCreateBusiness}
                    sx={{ borderRadius: 2.5, background: '#1f7a4d', textTransform: 'none', fontWeight: 700, py: 0.8 }}
                  >
                    {isCreatingBusiness ? 'Creating...' : 'Create business'}
                  </Button>
                  {businessMessage ? <Typography variant="caption" color={businessMessage.includes('failed') || businessMessage.includes('Could not') ? 'error.main' : 'success.main'}>{businessMessage}</Typography> : null}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}

        <Box sx={(theme) => ({ px: 2.1, py: 2.1, background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${theme.palette.background.default} 100%)` })}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary, letterSpacing: 1.2, fontWeight: 700 })}> {greeting}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.04em' }}>{authUser?.name ?? 'User'}</Typography>
                <Typography variant="caption" sx={(theme) => ({ color: theme.palette.primary.main, fontWeight: 700 })}>{roleLabels[dashboardRole]} workspace</Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={(theme) => ({ width: 34, height: 34, borderRadius: 10, background: alpha(theme.palette.primary.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.palette.primary.main })}>
                  <Bell size={16} />
                </Box>
                <Box sx={(theme) => ({ width: 34, height: 34, borderRadius: 10, background: alpha(theme.palette.primary.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.palette.primary.main })}>
                  <LayoutGrid size={16} />
                </Box>
              </Box>
            </Box>

            <Box sx={(theme) => ({ display: 'flex', alignItems: 'center', gap: 1, background: alpha(theme.palette.primary.main, 0.03), border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`, borderRadius: 3, px: 1.2, py: 0.9, color: theme.palette.text.secondary })}>
              <Search size={15} />
              <Typography variant="body2" color="text.secondary">Search documents, businesses...</Typography>
            </Box>

            {dashboardRole !== 'CUSTOMER' && (
              <Box sx={(theme) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, background: alpha(theme.palette.primary.main, 0.06), borderRadius: 2.5, px: 1.2, py: 0.8 })}>
                <Typography variant="caption" sx={(theme) => ({ fontWeight: 700, color: theme.palette.primary.dark })}>Active business</Typography>
                <Select size="small" value={selectedBusinessId ?? data.businesses[0]?.id ?? ''} onChange={(event) => onSelectBusiness(Number(event.target.value))} sx={{ minWidth: 150, '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, background: 'background.paper', borderRadius: 2 }}>
                  {data.businesses.map((business) => (
                    <MenuItem key={business.id} value={business.id}>{business.businessName ?? business.name ?? `Business ${business.id}`}</MenuItem>
                  ))}
                </Select>
              </Box>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.2 }}>
              {summaryCards.map((card) => (
                <Card key={card.label} variant="outlined" sx={{ borderRadius: 2.5, border: 'none', background: card.tone, minHeight: 84 }}>
                  <CardContent sx={{ py: 1.4, px: 1.4 }}>
                    <Typography variant="caption" sx={(theme) => ({ fontWeight: 700, color: theme.palette.text.secondary })}>{card.label}</Typography>
                    <Typography variant="h6" sx={{ mt: 0.7, fontWeight: 800, letterSpacing: '-0.05em' }}>{loading ? '…' : card.value}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Stack>
        </Box>

        <Box sx={{ px: 2.1, py: 1.8 }}>
          <Stack spacing={1.6}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Quick actions</Typography>
              <Button variant="text" size="small" onClick={onLogout}>Logout</Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.1, overflowX: 'auto', pb: 0.4 }}>
              {quickActions.map(({ label, icon: Icon, target }) => (
                <Button
                  key={label}
                  variant="outlined"
                  startIcon={<Icon size={15} />}
                  onClick={() => onChangeTab(target)}
                  sx={(theme) => ({
                    borderRadius: 2.5,
                    borderColor: alpha(theme.palette.primary.main, 0.16),
                    background: alpha(theme.palette.primary.main, 0.03),
                    color: theme.palette.text.primary,
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    px: 1.5,
                    py: 0.7,
                    minWidth: 0,
                    boxShadow: 'none',
                    '&:hover': { background: alpha(theme.palette.success.main, 0.08), borderColor: alpha(theme.palette.primary.main, 0.28) },
                  })}
                >
                  {label}
                </Button>
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 0.8, overflowX: 'auto', pb: 0.4, borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
              {tabs.map((tab) => (
                <Button
                  key={tab.key}
                  variant={activeTab === tab.key ? 'contained' : 'text'}
                  onClick={() => onChangeTab(tab.key)}
                  sx={(theme) => ({
                    minWidth: 0,
                    borderRadius: 999,
                    background: activeTab === tab.key ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.06),
                    color: activeTab === tab.key ? theme.palette.common.white : theme.palette.text.secondary,
                    textTransform: 'none',
                    px: 1.3,
                    py: 0.7,
                    fontWeight: 700,
                  })}
                >
                  {tab.label}
                </Button>
              ))}
            </Box>

            {activeTab === 'overview' && renderOverview()}

            {activeTab === 'businesses' && (
              <Card variant="outlined" sx={{ borderRadius: 3, border: '1px solid rgba(15,23,42,0.06)' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Businesses</Typography>
                  {data.businesses.length > 0 ? (
                    <Stack spacing={1.2}>
                      {data.businesses.map((business) => (
                        <Box key={business.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.8, borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>{business.businessName ?? business.name ?? `Business ${business.id}`}</Typography>
                            <Typography variant="caption" color="text.secondary">{business.status ?? 'active'}</Typography>
                          </Box>
                          <Button size="small" variant="text" onClick={() => onOpenBusiness(business.id)}>View</Button>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <EmptyState title="No businesses" description="Create or connect a business to continue." />
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'customers' && (
              <Card variant="outlined" sx={{ borderRadius: 3, border: '1px solid rgba(15,23,42,0.06)' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>{dashboardRole === 'CUSTOMER' ? 'Customer profile' : 'Customers'}</Typography>
                  {data.customers.length > 0 ? (
                    <Stack spacing={1.2}>
                      {data.customers.map((customer) => (
                        <Box key={customer.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.8, borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>{customer.fullName ?? 'Customer'}</Typography>
                            <Typography variant="caption" color="text.secondary">{customer.email ?? 'No email'}</Typography>
                          </Box>
                          <Button size="small" variant="text" onClick={() => onOpenCustomer(customer.id)}>View</Button>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <EmptyState title="No customers" description="Customer records will appear here." />
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'overview' && dashboardRole !== 'CUSTOMER' && (
              <Card variant="outlined" sx={(theme) => ({ borderRadius: 3, border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}` })}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Generate invoice</Typography>
                  <Stack spacing={1.2}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="invoice-customer-select-label">Customer</InputLabel>
                      <Select labelId="invoice-customer-select-label" value={selectedCustomerId} label="Customer" onChange={(event) => handleInvoiceInput('customerId', String(event.target.value))}>
                        {data.customers.map((customer) => (
                          <MenuItem key={customer.id} value={customer.id}>{customer.fullName ?? 'Customer'}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField size="small" label="Product name" value={invoiceForm.productName} onChange={(event) => handleInvoiceInput('productName', event.target.value)} />
                    <TextField size="small" label="Quantity" type="number" value={invoiceForm.quantity} onChange={(event) => handleInvoiceInput('quantity', event.target.value)} />
                    <TextField size="small" label="Unit price" type="number" value={invoiceForm.unitPrice} onChange={(event) => handleInvoiceInput('unitPrice', event.target.value)} />
                    <TextField size="small" label="GST %" type="number" value={invoiceForm.gstRate} onChange={(event) => handleInvoiceInput('gstRate', event.target.value)} />
                    <TextField size="small" label="Due date (optional)" type="date" value={invoiceForm.dueDate} onChange={(event) => handleInvoiceInput('dueDate', event.target.value)} helperText="Leave blank to record as paid; add a due date to send as pending." />
                    <Button variant="contained" onClick={handleCreateInvoice} endIcon={<ArrowRight size={15} />} sx={(theme) => ({ borderRadius: 2.5, background: theme.palette.primary.main, textTransform: 'none', fontWeight: 700 })}>
                      {invoiceForm.dueDate ? 'Create pending invoice' : 'Create paid invoice'}
                    </Button>
                    {invoiceMessage ? <Typography variant="caption" color={invoiceMessage.includes('failed') || invoiceMessage.includes('Select') ? 'error.main' : 'success.main'}>{invoiceMessage}</Typography> : null}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {activeTab === 'appointments' && (
              <Card variant="outlined" sx={{ borderRadius: 3, border: '1px solid rgba(15,23,42,0.06)' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Appointments</Typography>
                  {data.appointments.length > 0 ? (
                    <Stack spacing={1.2}>
                      {data.appointments.map((appointment) => (
                        <Box key={appointment.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.8, borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>{appointment.serviceName ?? `Appointment ${appointment.id}`}</Typography>
                            <Typography variant="caption" color="text.secondary">{appointment.scheduledAt ? new Date(appointment.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Schedule pending'}</Typography>
                          </Box>
                          <Chip label={appointment.status ?? 'BOOKED'} size="small" sx={{ bgcolor: '#fff1c7', color: '#a16207', fontWeight: 700 }} />
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <EmptyState title="No appointments" description="Scheduled bookings will show here." />
                  )}
                </CardContent>
              </Card>
            )}
          </Stack>
        </Box>
      </Paper>
    </Container>
  )
}
