import { Box, Button, Container, Paper, Stack, Typography, type Theme } from '@mui/material'
import {
  ArrowLeft,
  Building2,
  FileText,
  Globe,
  Home,
  Mail,
  MapPinned,
  Phone,
  ReceiptText,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../services/auth'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import type { RootState } from '../store/store'
import { setActiveTab as setAdminTab } from '../store/adminDashboardSlice'
import { setActiveTab as setBusinessTab } from '../store/businessDashboardSlice'
import { setActiveTab as setCustomerTab } from '../store/customerDashboardSlice'
import type { BusinessSummary } from '../services/api'
import type { DashboardTab } from '../modules/types'
import { getDashboardPath } from '../routes/dashboardPaths'

type BusinessDetailPageProps = {
  business: BusinessSummary
  invoiceCount: number
  paymentCount: number
  appointmentCount: number
  totalRevenue: number
  nextAppointmentLabel?: string
  recentInvoices: Array<{ id: number; title: string; amount: string; status: string; date: string }>
  recentAppointments: Array<{ id: number; title: string; subtitle: string; status: string }>
}

function getInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'B'
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '₹0'
  return `₹${value.toLocaleString('en-IN')}`
}

const bottomNavTabs: Array<{ key: DashboardTab; label: string }> = [
  { key: 'overview', label: 'Home' },
  { key: 'businesses', label: 'Business' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'profile', label: 'Profile' },
]

/* ---- Dark-mode safe style helpers (theme tokens + applyStyles, no theme.palette) ---- */
const violetText = (theme: Theme) => ({
  color: '#4E2BCC',
  ...theme.applyStyles('dark', { color: '#B9A4F8' }),
})

const violetTint = (theme: Theme) => ({
  bgcolor: 'rgba(78,43,204,0.1)',
  color: '#4E2BCC',
  ...theme.applyStyles('dark', { bgcolor: 'rgba(144,91,244,0.22)', color: '#C9B3FA' }),
})

const groupPanelSx = (theme: Theme) => ({
  mt: 0.1,
  borderRadius: '16px',
  border: '1px solid',
  borderColor: 'divider',
  p: 1.2,
  bgcolor: '#F7F5FD',
  ...theme.applyStyles('dark', { bgcolor: 'rgba(255,255,255,0.04)' }),
})

const sectionCardSx = {
  bgcolor: 'background.paper',
  backgroundImage: 'none',
  borderRadius: '16px',
  border: '1px solid',
  borderColor: 'divider',
  p: 1.4,
}

const rowCardSx = {
  bgcolor: 'background.paper',
  backgroundImage: 'none',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '16px',
}

export function BusinessDetailPage({
  business,
  invoiceCount,
  paymentCount,
  appointmentCount,
  totalRevenue,
  nextAppointmentLabel,
  recentInvoices,
  recentAppointments,
}: BusinessDetailPageProps) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const authUser = getCurrentUser()
  const adminTab = useAppSelector((state: RootState) => state.adminDashboard.activeTab)
  const businessTab = useAppSelector((state: RootState) => state.businessDashboard.activeTab)
  const customerTab = useAppSelector((state: RootState) => state.customerDashboard.activeTab)
  const role = authUser?.role ?? 'BUSINESS'
  const activeTab = role === 'ADMIN' ? adminTab : role === 'CUSTOMER' ? customerTab : businessTab

  const businessName = business.businessName ?? business.name ?? 'Business'
  const legalName = business.legalName ?? businessName
  const initials = getInitials(businessName)

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(getDashboardPath(role))
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
    navigate(getDashboardPath(role, tab))
  }

  const primaryDetails = [
    { value: legalName, icon: Building2 },
    { value: business.email ?? 'Not provided', icon: Mail },
    { value: business.phone ?? 'Not provided', icon: Phone },
    { value: business.address ?? 'Not provided', icon: MapPinned },
  ].filter((item) => Boolean(item.value))

  const complementDetails = [
    {
      label: 'Revenue',
      value: formatCurrency(totalRevenue),
      meta: paymentCount > 0 ? `${paymentCount} payments` : 'No payments',
      icon: FileText,
    },
    {
      label: 'Invoices',
      value: `${invoiceCount}`,
      meta: 'Receipts',
      icon: Globe,
    },
    {
      label: 'Appointments',
      value: nextAppointmentLabel ?? `${appointmentCount}`,
      meta: 'Scheduled',
      icon: Phone,
    },
    {
      label: 'GSTIN',
      value: business.gstin ?? 'Not provided',
      meta: 'Tax ID',
      icon: FileText,
    },
    {
      label: 'PAN',
      value: business.pan ?? 'Not provided',
      meta: 'Account ID',
      icon: Globe,
    },
  ]

  return (
    <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 390,
          mx: 'auto',
          borderRadius: 2.5,
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          boxShadow: '0 18px 42px rgba(0,0,0,0.08)',
        }}
      >
        <Box sx={{ px: 2.1, py: 2.1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Button
              variant="text"
              onClick={handleBack}
              sx={{
                minWidth: 0,
                p: 0,
                color: 'text.primary',
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { background: 'transparent' },
              }}
            >
              <ArrowLeft size={18} style={{ marginRight: 8 }} />
              Business Details
            </Button>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.primary', opacity: 0.8 }} />
          </Box>

          <Box
            sx={{
              position: 'relative',
              height: 180,
              borderRadius: 1.25,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(21,89,59,0.78), rgba(186,230,253,0.7), rgba(255,255,255,0.4)), url("https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80") center/cover',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {/* Sits on top of a photo, so it stays white with dark ink in both modes */}
            <Box
              sx={{
                position: 'absolute',
                left: 18,
                bottom: 18,
                width: 58,
                height: 58,
                borderRadius: 18,
                background: 'rgba(255,255,255,0.94)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0F032D',
                fontWeight: 900,
                boxShadow: '0 12px 24px rgba(0,0,0,0.18)',
              }}
            >
              {initials}
            </Box>
          </Box>

          <Box sx={{ mt: 1.2, mb: 1.5 }}>
            <Box
              sx={(theme) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.55,
                px: 1.15,
                py: 0.38,
                borderRadius: 999,
                fontWeight: 800,
                fontSize: '0.72rem',
                mb: 1.15,
                ...violetTint(theme),
              })}
            >
              <Box sx={{ width: 6.5, height: 6.5, borderRadius: '50%', bgcolor: 'success.main' }} />
              Active
            </Box>

            <Typography
              sx={{
                fontWeight: 900,
                letterSpacing: '-0.075em',
                color: 'text.primary',
                lineHeight: 1.02,
                fontSize: 'clamp(2.1rem, 6.9vw, 3rem)',
              }}
            >
              {businessName}
            </Typography>
          </Box>

          <Box sx={groupPanelSx}>
            <Box sx={{ display: 'grid', gap: 0.8 }}>
              {primaryDetails.map(({ value, icon: Icon }) => (
                <Box
                  key={value}
                  sx={{
                    ...rowCardSx,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.9,
                    px: 0.8,
                    py: 0.75,
                    borderRadius: 2.4,
                    minHeight: 52,
                  }}
                >
                  <Box
                    sx={(theme) => ({
                      width: 32,
                      height: 32,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      ...violetTint(theme),
                    })}
                  >
                    <Icon size={16} />
                  </Box>

                  <Typography
                    sx={{
                      fontWeight: 800,
                      color: 'text.primary',
                      lineHeight: 1.25,
                      letterSpacing: '-0.03em',
                      wordBreak: 'break-word',
                    }}
                  >
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', color: 'text.secondary', fontWeight: 700, mt: 0.9 }}>
              last updated: 10 mins ago
            </Typography>
          </Box>

          <Box sx={{ ...sectionCardSx, mt: 1.8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'text.primary' }}>Complement info</Typography>
              <Typography variant="caption" sx={(theme) => ({ fontWeight: 800, ...violetText(theme) })}>More</Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
              {complementDetails.map(({ label, value, meta, icon: Icon }) => (
                <Box
                  key={label}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.55,
                    p: 0.9,
                    borderRadius: 2.4,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                    minHeight: 92,
                  }}
                >
                  <Box sx={(theme) => ({ display: 'flex', alignItems: 'center', gap: 0.7, ...violetText(theme) })}>
                    <Icon size={14} />
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'inherit', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {label}
                    </Typography>
                  </Box>

                  <Typography sx={{ fontWeight: 900, color: 'text.primary', lineHeight: 1.25, wordBreak: 'break-word' }}>{value}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>{meta}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box
            sx={{
              mt: 1.6,
              background: 'linear-gradient(135deg, #4E2BCC 0%, #905BF4 100%)',
              color: '#ffffff',
              borderRadius: 3,
              p: 1.1,
              textAlign: 'center',
              fontWeight: 800,
              boxShadow: '0 12px 24px rgba(78,43,204,0.22)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <MapPinned size={17} />
              <Typography sx={{ fontWeight: 800, color: '#ffffff' }}>{business.address ?? 'Business location'}</Typography>
            </Box>
          </Box>

          <Box sx={{ ...sectionCardSx, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'text.primary' }}>Recent invoices</Typography>
              <Typography variant="caption" sx={(theme) => ({ fontWeight: 800, ...violetText(theme) })}>{recentInvoices.length} total</Typography>
            </Box>

            {recentInvoices.length > 0 ? (
              <Stack spacing={1}>
                {recentInvoices.map((invoice) => (
                  <Box key={invoice.id} sx={{ ...rowCardSx, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 0.8, px: 0.9, borderRadius: 2.3 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: 'text.primary' }}>{invoice.title}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>{invoice.date}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontWeight: 800, color: 'text.primary' }}>{invoice.amount}</Typography>
                      <Typography variant="caption" sx={(theme) => ({ fontWeight: 700, ...violetText(theme) })}>{invoice.status}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>No recent invoices yet.</Typography>
            )}
          </Box>

          <Box sx={{ ...sectionCardSx, mt: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'text.primary' }}>Upcoming appointments</Typography>
              <Typography variant="caption" sx={(theme) => ({ fontWeight: 800, ...violetText(theme) })}>{recentAppointments.length} now</Typography>
            </Box>

            {recentAppointments.length > 0 ? (
              <Stack spacing={1}>
                {recentAppointments.map((appointment) => (
                  <Box key={appointment.id} sx={{ ...rowCardSx, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 0.8, px: 0.9, borderRadius: 2.3 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: 'text.primary' }}>{appointment.title}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>{appointment.subtitle}</Typography>
                    </Box>
                    <Typography variant="caption" sx={(theme) => ({ fontWeight: 800, ...violetText(theme) })}>{appointment.status}</Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>No appointments scheduled yet.</Typography>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Floating pill nav: transparent wrapper (no white fade band), themed pill, violet active tab */}
      <Box sx={{ position: 'sticky', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', px: 1.5, pb: 1.2, pt: 1, background: 'transparent' }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: 360,
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '999px',
            boxShadow: '0 8px 24px rgba(78,43,204,0.18)',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
            gap: 0.4,
            p: 0.6,
          }}
        >
          {bottomNavTabs.map((tab) => {
            const isActive = activeTab === tab.key
            const Icon = tab.key === 'overview' ? Home : tab.key === 'businesses' ? Building2 : tab.key === 'invoices' ? ReceiptText : UserRound

            return (
              <Box
                key={tab.key}
                role="button"
                tabIndex={0}
                onClick={() => handleNavigateTab(tab.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handleNavigateTab(tab.key)
                  }
                }}
                sx={{
                  py: 0.9,
                  px: 0.5,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.4,
                  borderRadius: '999px',
                  bgcolor: isActive ? '#4E2BCC' : 'transparent',
                  color: isActive ? '#ffffff' : 'text.secondary',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontWeight: 700,
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 1 },
                }}
              >
                <Icon size={18} />
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11, color: 'inherit' }}>{tab.label}</Typography>
              </Box>
            )
          })}
        </Box>
      </Box>
    </Container>
  )
}