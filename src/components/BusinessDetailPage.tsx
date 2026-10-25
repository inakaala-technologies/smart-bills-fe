import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
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
        sx={(theme) => ({
          width: '100%',
          maxWidth: 390,
          mx: 'auto',
          borderRadius: 2.5,
          background: theme.palette.common.white,
          border: `1px solid ${alpha(theme.palette.text.primary, 0.09)}`,
          overflow: 'hidden',
          boxShadow: `0 18px 42px ${alpha(theme.palette.common.black, 0.08)}`,
        })}
      >
        <Box sx={{ px: 2.1, py: 2.1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Button
              variant="text"
              onClick={handleBack}
              sx={(theme) => ({
                minWidth: 0,
                p: 0,
                color: theme.palette.text.primary,
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { background: 'transparent' },
              })}
            >
              <ArrowLeft size={18} style={{ marginRight: 8 }} />
              Business Details
            </Button>
            <Box sx={(theme) => ({ width: 8, height: 8, borderRadius: '50%', background: theme.palette.text.primary, opacity: 0.8 })} />
          </Box>

          <Box
            sx={{
              position: 'relative',
              height: 180,
              borderRadius: 1.25,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(21,89,59,0.78), rgba(186,230,253,0.7), rgba(255,255,255,0.4)), url("https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80") center/cover',
              border: '1px solid rgba(15,23,42,0.06)',
            }}
          >
            <Box
              sx={(theme) => ({
                position: 'absolute',
                left: 18,
                bottom: 18,
                width: 58,
                height: 58,
                borderRadius: 18,
                background: alpha(theme.palette.common.white, 0.94),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.palette.text.primary,
                fontWeight: 900,
                boxShadow: `0 12px 24px ${alpha(theme.palette.common.black, 0.18)}`,
              })}
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
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.success.main, 0.08)})`,
                border: `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
                color: theme.palette.primary.main,
                fontWeight: 800,
                fontSize: '0.72rem',
                mb: 1.15,
              })}
            >
              <Box sx={(theme) => ({ width: 6.5, height: 6.5, borderRadius: '50%', background: theme.palette.success.main, boxShadow: `0 0 0 2px ${alpha(theme.palette.success.main, 0.18)}` })} />
              Active
            </Box>

            <Typography
              sx={(theme) => ({
                fontWeight: 900,
                letterSpacing: '-0.075em',
                color: theme.palette.text.primary,
                lineHeight: 1.02,
                fontSize: 'clamp(2.1rem, 6.9vw, 3rem)',
              })}
            >
              {businessName}
            </Typography>
          </Box>

          <Box
            sx={(theme) => ({
              mt: 0.1,
              background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${theme.palette.common.white} 100%)`,
              borderRadius: 1.25,
              border: `1px solid ${alpha(theme.palette.text.primary, 0.05)}`,
              p: 1.2,
              boxShadow: `0 14px 30px ${alpha(theme.palette.common.black, 0.03)}`,
            })}
          >
            <Box sx={{ display: 'grid', gap: 0.8 }}>
              {primaryDetails.map(({ value, icon: Icon }) => (
                <Box
                  key={value}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.9,
                    px: 0.8,
                    py: 0.75,
                    borderRadius: 2.4,
                    background: '#fff',
                    border: '1px solid rgba(15,23,42,0.04)',
                    minHeight: 52,
                  }}
                >
                  <Box
                    sx={(theme) => ({
                      width: 32,
                      height: 32,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.success.main, 0.16)} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.palette.primary.main,
                      flexShrink: 0,
                    })}
                  >
                    <Icon size={16} />
                  </Box>

                  <Typography
                    sx={(theme) => ({
                      fontWeight: 800,
                      color: theme.palette.text.primary,
                      lineHeight: 1.25,
                      letterSpacing: '-0.03em',
                      wordBreak: 'break-word',
                    })}
                  >
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Typography variant="caption" sx={(theme) => ({ display: 'block', textAlign: 'right', color: theme.palette.text.secondary, fontWeight: 700, mt: 0.9 })}>
              last updated: 10 mins ago
            </Typography>
          </Box>

          <Box sx={(theme) => ({ mt: 1.8, background: theme.palette.common.white, borderRadius: 1.25, border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`, p: 1.4 })}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Complement info</Typography>
              <Typography variant="caption" sx={(theme) => ({ color: theme.palette.primary.main, fontWeight: 800 })}>More</Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
              {complementDetails.map(({ label, value, meta, icon: Icon }) => (
                <Box
                  key={label}
                  sx={(theme) => ({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.55,
                    p: 0.9,
                    borderRadius: 2.4,
                    border: `1px solid ${alpha(theme.palette.text.primary, 0.04)}`,
                    background: theme.palette.common.white,
                    minHeight: 92,
                  })}
                >
                  <Box sx={(theme) => ({ display: 'flex', alignItems: 'center', gap: 0.7, color: theme.palette.primary.main })}>
                    <Icon size={14} />
                    <Typography variant="caption" sx={(theme) => ({ fontWeight: 800, color: theme.palette.primary.main, textTransform: 'uppercase', letterSpacing: '0.08em' })}>
                      {label}
                    </Typography>
                  </Box>

                  <Typography sx={(theme) => ({ fontWeight: 900, color: theme.palette.text.primary, lineHeight: 1.25, wordBreak: 'break-word' })}>{value}</Typography>
                  <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary, fontWeight: 700 })}>{meta}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box
            sx={(theme) => ({
              mt: 1.6,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.success.main} 100%)`,
              color: theme.palette.common.white,
              borderRadius: 3,
              p: 1.1,
              textAlign: 'center',
              fontWeight: 800,
              boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.22)}`,
            })}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <MapPinned size={17} />
              <Typography sx={{ fontWeight: 800 }}>{business.address ?? 'Business location'}</Typography>
            </Box>
          </Box>

          <Box sx={(theme) => ({ mt: 2, background: theme.palette.common.white, borderRadius: 1.25, border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`, p: 1.4 })}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Recent invoices</Typography>
              <Typography variant="caption" sx={(theme) => ({ color: theme.palette.primary.main, fontWeight: 800 })}>{recentInvoices.length} total</Typography>
            </Box>

            {recentInvoices.length > 0 ? (
              <Stack spacing={1}>
                {recentInvoices.map((invoice) => (
                  <Box key={invoice.id} sx={(theme) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 0.8, px: 0.9, borderRadius: 2.3, background: theme.palette.common.white, border: `1px solid ${alpha(theme.palette.text.primary, 0.04)}` })}>
                    <Box>
                      <Typography sx={(theme) => ({ fontWeight: 800, color: theme.palette.text.primary })}>{invoice.title}</Typography>
                      <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary, fontWeight: 700 })}>{invoice.date}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={(theme) => ({ fontWeight: 800, color: theme.palette.text.primary })}>{invoice.amount}</Typography>
                      <Typography variant="caption" sx={(theme) => ({ color: theme.palette.primary.main, fontWeight: 700 })}>{invoice.status}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" sx={(theme) => ({ color: theme.palette.text.secondary, fontWeight: 700 })}>No recent invoices yet.</Typography>
            )}
          </Box>

          <Box sx={(theme) => ({ mt: 1.5, background: theme.palette.common.white, borderRadius: 1.25, border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`, p: 1.4 })}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Upcoming appointments</Typography>
              <Typography variant="caption" sx={(theme) => ({ color: theme.palette.primary.main, fontWeight: 800 })}>{recentAppointments.length} now</Typography>
            </Box>

            {recentAppointments.length > 0 ? (
              <Stack spacing={1}>
                {recentAppointments.map((appointment) => (
                  <Box key={appointment.id} sx={(theme) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 0.8, px: 0.9, borderRadius: 2.3, background: theme.palette.common.white, border: `1px solid ${alpha(theme.palette.text.primary, 0.04)}` })}>
                    <Box>
                      <Typography sx={(theme) => ({ fontWeight: 800, color: theme.palette.text.primary })}>{appointment.title}</Typography>
                      <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary, fontWeight: 700 })}>{appointment.subtitle}</Typography>
                    </Box>
                    <Typography variant="caption" sx={(theme) => ({ color: theme.palette.primary.main, fontWeight: 800 })}>{appointment.status}</Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" sx={(theme) => ({ color: theme.palette.text.secondary, fontWeight: 700 })}>No appointments scheduled yet.</Typography>
            )}
          </Box>
        </Box>
      </Paper>

      <Box sx={(theme) => ({ position: 'sticky', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', px: 1.5, pb: 1.2, pt: 1, background: `linear-gradient(180deg, rgba(255,255,255,0), ${alpha(theme.palette.common.white, 0.96)} 30%)` })}>
        <Box sx={(theme) => ({ width: '100%', maxWidth: 360, background: theme.palette.common.white, border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`, borderRadius: 1.25, boxShadow: `0 -5px 18px ${alpha(theme.palette.common.black, 0.06)}`, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', overflow: 'hidden' })}>
          {bottomNavTabs.map((tab) => {
            const isActive = activeTab === tab.key
            const Icon = tab.key === 'overview' ? Home : tab.key === 'businesses' ? Building2 : tab.key === 'invoices' ? ReceiptText : UserRound

            return (
              <Box
                key={tab.key}
                onClick={() => handleNavigateTab(tab.key)}
                sx={(theme) => ({
                  py: 1.2,
                  px: 0.5,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                  background: isActive ? alpha(theme.palette.success.main, 0.12) : theme.palette.common.white,
                  color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontWeight: 700,
                })}
              >
                <Icon size={18} />
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11 }}>{tab.label}</Typography>
              </Box>
            )
          })}
        </Box>
      </Box>
    </Container>
  )
}
