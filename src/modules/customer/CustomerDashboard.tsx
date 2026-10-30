import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import {
  CalendarCheck2,
  ChevronRight,
  Award,
  FileText,
  Home,
  LayoutGrid,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { AppointmentDetailDialog } from '../../components/AppointmentDetailDialog'
import { EmptyState } from '../../components/EmptyState'
import { ProfileManagerDialog } from '../../components/ProfileManagerDialog'
import { CustomerLocationCard } from './components/CustomerLocationCard'
import { HeroBanner, SummaryCards } from './components/CustomerDashboardOverview'
import { CustomerDashboardMenu } from './components/CustomerDashboardMenu'
import { CustomerInvoicesList } from './components/CustomerInvoicesList'
import { CustomerProfilePanel } from './components/CustomerProfilePanel'
import { CustomerAppointmentsPanel } from './components/CustomerAppointmentsPanel'
import { fetchNearbyOffers, type AppointmentSummary, type DashboardData } from '../../services/api'
import { addProfile, logoutUser, switchAccount, type Role } from '../../services/auth'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import type { RootState } from '../../store/store'
import { setAuthUser } from '../../store/authSlice'
import { setActiveTab, setSelectedBusinessId } from '../../store/customerDashboardSlice'
import type { DashboardTab } from '../types'
import { FamilyManagementDialog } from './components/FamilyManagementDialog'
import { CustomerBillsPage } from './components/CustomerBillsPage'

const roleNav: Array<{
  key: DashboardTab
  label: string
  icon: LucideIcon
}> = [
  { key: 'overview', label: 'Home', icon: Home },
  { key: 'businesses', label: 'Businesses', icon: LayoutGrid },
  { key: 'invoices', label: 'Documents', icon: FileText },
  { key: 'appointments', label: 'Bookings', icon: CalendarCheck2 },
  { key: 'rewards', label: 'Rewards', icon: Award },
  { key: 'profile', label: 'Profile', icon: UserRound },
]

// 'offers' is added so /dashboard/offers is a valid route.
const customerDashboardTabs: DashboardTab[] = [
  'overview',
  'businesses',
  'offers',
  'invoices',
  'appointments',
  'rewards',
  'memberships',
  'bills',
  'profile',
]

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₹${value.toLocaleString('en-IN')}`
}

export function CustomerDashboard() {
  const navigate = useNavigate()
  const { tab: routeTab } = useParams()
  const dispatch = useAppDispatch()
  const authUser = useAppSelector((state: RootState) => state.auth.authUser)
  const accountRoles = new Set((authUser?.accounts ?? []).map((account) => account.role).concat(authUser?.role ?? 'CUSTOMER'))
  const availableAccounts = (authUser?.accounts ?? []).filter((account) => account.role !== authUser?.role)
  const missingProfileRoles = (['BUSINESS', 'CUSTOMER'] as Role[]).filter((role) => role !== authUser?.role && !accountRoles.has(role))
  const { data, loading, activeTab } = useAppSelector((state: RootState) => state.customerDashboard)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [managerOpen, setManagerOpen] = useState(false)
  const [nearbyOffersCount, setNearbyOffersCount] = useState(0)
  const [activityNow] = useState(Date.now)
  const [explicitAppointment, setExplicitAppointment] = useState<AppointmentSummary | null>(null)
  const setSelectedAppointment = setExplicitAppointment
  const [selectedInvoice, setSelectedInvoice] = useState<DashboardData['invoices'][number] | null>(null)
  const isMenuOpen = Boolean(menuAnchorEl)

  const customerLatitude = data.customers[0]?.latitude
  const customerLongitude = data.customers[0]?.longitude
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false)

  useEffect(() => {
    const matchingTab = customerDashboardTabs.find((tab) => tab === routeTab)
    if (matchingTab) {
      dispatch(setActiveTab(matchingTab))
    } else {
      navigate('/dashboard/overview', { replace: true })
    }
  }, [dispatch, navigate, routeTab])

  useEffect(() => {
    if (customerLatitude === undefined || customerLongitude === undefined) return
    let isCurrent = true

    void fetchNearbyOffers(customerLatitude, customerLongitude)
      .then((offers) => {
        if (isCurrent) {
          setNearbyOffersCount(offers.length)
        }
      })
      .catch(() => {
        if (isCurrent) {
          setNearbyOffersCount(0)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [customerLatitude, customerLongitude])

  const handleChangeTab = (tab: DashboardTab) => {
    dispatch(setActiveTab(tab))
    navigate(`/dashboard/${tab}`)
  }

  const upcomingAppointmentActivities = data.appointments
    .filter((appointment) => {
      const status = appointment.status?.toUpperCase() ?? 'BOOKED'
      const scheduledTime = new Date(
        appointment.scheduledAt ?? '',
      ).getTime()

      return (
        status === 'CANCELLED' ||
        (scheduledTime > activityNow &&
          ['BOOKED', 'CONFIRMED'].includes(status))
      )
    })
    .sort((first, second) => {
      const firstTime = new Date(
        first.scheduledAt ?? '',
      ).getTime()

      const secondTime = new Date(
        second.scheduledAt ?? '',
      ).getTime()

      const firstIsUpcoming =
        firstTime > activityNow &&
        first.status?.toUpperCase() !== 'CANCELLED'

      const secondIsUpcoming =
        secondTime > activityNow &&
        second.status?.toUpperCase() !== 'CANCELLED'

      if (firstIsUpcoming !== secondIsUpcoming) {
        return firstIsUpcoming ? -1 : 1
      }

      return firstIsUpcoming
        ? firstTime - secondTime
        : secondTime - firstTime
    })
    .map((appointment) => {
      const business = data.businesses.find(
        (item) => item.id === appointment.businessId,
      )

      return {
        id: `appointment-${appointment.id}`,
        title:
          business?.businessName ??
          business?.name ??
          'Business',
        subtitle: appointment.serviceName ?? 'Appointment',
        date: new Date(
          appointment.scheduledAt ?? '',
        ).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        }),
        amount: appointment.status?.toUpperCase() ?? 'BOOKED',
        icon: CalendarCheck2,
        appointment,
        invoice: undefined,
      }
    })

  const invoiceActivities = data.invoices.map((invoice) => {
    const business =
      data.businesses.find(
        (item) => item.id === invoice.businessId,
      ) ?? data.businesses[0]

    const businessName =
      business?.businessName ?? business?.name ?? 'Business'

    return {
      id: `invoice-${invoice.id}`,
      title: businessName,
      subtitle: `Invoice #${invoice.invoiceNumber ?? invoice.id}`,
      date: invoice.issueDate
        ? new Date(invoice.issueDate).toLocaleDateString(
            'en-IN',
            {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            },
          )
        : '—',
      amount: formatCurrency(invoice.totalAmount),
      icon: ShoppingCart,
      appointment: undefined,
      invoice,
    }
  })

  const displayActivities = [
    ...upcomingAppointmentActivities,
    ...invoiceActivities,
  ].slice(0, 5)

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
            height: {
              xs: '100dvh',
              sm: 'calc(100dvh - 64px)',
            },
            maxHeight: {
              xs: '100dvh',
              sm: 'calc(100dvh - 64px)',
            },
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
            contextLabel={authUser?.email ?? 'Customer account'}
            roleLabel="Customer"
            menuId="customer-menu"
            isMenuOpen={isMenuOpen}
            onOpenMenu={(event) =>
              setMenuAnchorEl(event.currentTarget)
            }
          />

          {/* Main Content Area */}
          <Box
            sx={{
              px: { xs: 2, sm: 2.2 },
              pt: { xs: 2, sm: 2.2 },
              pb: 'calc(96px + env(safe-area-inset-bottom))',
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overscrollBehaviorY: 'contain',
            }}
          >
            <CustomerDashboardMenu
              tabs={roleNav}
              activeTab={activeTab}
              onChangeTab={handleChangeTab}
              anchorEl={menuAnchorEl}
              isOpen={isMenuOpen}
              onClose={() => setMenuAnchorEl(null)}
              currentRole={authUser?.role ?? 'CUSTOMER'}
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
            />

            {/* Profile Dialog */}
            <ProfileManagerDialog
              open={managerOpen}
              onClose={() => setManagerOpen(false)}
              currentRole={authUser?.role ?? 'CUSTOMER'}
              availableAccounts={availableAccounts}
              missingProfileRoles={missingProfileRoles}
              onSwitchAccount={(role: Role) => {
                const updated = switchAccount(role)

                if (updated) {
                  dispatch(setAuthUser(updated))
                  setManagerOpen(false)
                  navigate('/dashboard')
                  window.location.reload()
                }
              }}
              onAddProfile={(role: Role) => {
                const updated = addProfile(role)

                if (updated) {
                  dispatch(setAuthUser(updated))
                  setManagerOpen(false)
                  navigate('/dashboard')
                  window.location.reload()
                }
              }}
            />

            <FamilyManagementDialog
              open={familyDialogOpen}
              onClose={() => setFamilyDialogOpen(false)}
              currentUserId={Number(authUser?.id)}
            />

            {activeTab === 'bills' && <CustomerBillsPage />}

            {activeTab === 'overview' && (
              <Box>
                <HeroBanner />

                {/* The Offers tile in SummaryCards is the single entry to offers. */}
                <SummaryCards
                  data={data}
                  loading={loading}
                  offersCount={nearbyOffersCount}
                  onSelectTab={handleChangeTab}
                />

                {/* Insurance entry */}
                <Box
                  role="button"
                  tabIndex={0}
                  aria-label="Open insurance"
                  onClick={() => navigate('/insurance')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate('/insurance')
                    }
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.6,
                    mb: 2.4,
                    backgroundColor: 'background.paper',
                    borderRadius: '22px',
                    p: '14px 16px',
                    border: '1px solid var(--mui-palette-divider)',
                    cursor: 'pointer',
                    '&:focus-visible': {
                      outline: '3px solid var(--mui-palette-primary-main)',
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.6, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #065f46 0%, #0d9488 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        flexShrink: 0,
                      }}
                    >
                      <ShieldCheck size={22} strokeWidth={2.2} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '15px', lineHeight: 1.25 }}>
                        Insurance
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '13px', display: 'block', mt: 0.2 }}>
                        Health, vehicle, life, travel and more
                      </Typography>
                    </Box>
                  </Box>
                  <ChevronRight size={20} strokeWidth={2.2} color="var(--mui-palette-text-disabled)" />
                </Box>

                {/* Recent Activity */}
                <Box sx={{ mt: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1.6,
                      px: 0.4,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        color: 'text.primary',
                        fontSize: '18px',
                      }}
                    >
                      Recent activity
                    </Typography>

                    <Typography
                      variant="body2"
                      onClick={() => handleChangeTab('invoices')}
                      sx={{
                        color: 'primary.main',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      See all
                    </Typography>
                  </Box>

                  {displayActivities.length > 0 ? (
                    <Stack spacing={1.4}>
                      {displayActivities.map((entry) => {
                        const Icon = entry.icon

                        return (
                          <Box
                            key={entry.id}
                            role={
                              entry.appointment || entry.invoice
                                ? 'button'
                                : undefined
                            }
                            tabIndex={
                              entry.appointment || entry.invoice
                                ? 0
                                : undefined
                            }
                            aria-label={
                              entry.invoice
                                ? `View invoice details for ${
                                    entry.invoice.invoiceNumber ??
                                    entry.invoice.id
                                  }`
                                : entry.appointment
                                  ? `View appointment details for ${entry.title}`
                                  : undefined
                            }
                            onClick={
                              entry.invoice
                                ? () =>
                                    setSelectedInvoice(entry.invoice)
                                : entry.appointment
                                  ? () =>
                                      setSelectedAppointment(
                                        entry.appointment,
                                      )
                                  : undefined
                            }
                            onKeyDown={
                              entry.appointment || entry.invoice
                                ? (event) => {
                                    if (
                                      event.key === 'Enter' ||
                                      event.key === ' '
                                    ) {
                                      event.preventDefault()

                                      if (entry.invoice) {
                                        setSelectedInvoice(
                                          entry.invoice,
                                        )
                                      } else if (entry.appointment) {
                                        setSelectedAppointment(
                                          entry.appointment,
                                        )
                                      }
                                    }
                                  }
                                : undefined
                            }
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: 'background.paper',
                              borderRadius: '22px',
                              p: '14px 16px',
                              border:
                                '1px solid var(--mui-palette-divider)',
                              boxShadow:
                                '0 4px 14px rgba(0, 0, 0, 0.12)',
                              transition: 'all 0.18s ease',
                              cursor:
                                entry.appointment || entry.invoice
                                  ? 'pointer'
                                  : 'default',
                              '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow:
                                  '0 6px 18px rgba(0, 0, 0, 0.18)',
                              },
                              '&:focus-visible':
                                entry.appointment || entry.invoice
                                  ? {
                                      outline:
                                        '3px solid var(--mui-palette-primary-main)',
                                      outlineOffset: 2,
                                    }
                                  : undefined,
                            }}
                          >
                            {/* Activity icon and text */}
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.6,
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: '50%',
                                  background:
                                    'linear-gradient(135deg, #065f46 0%, #0d9488 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                  flexShrink: 0,
                                  boxShadow:
                                    '0 4px 10px rgba(6, 95, 70, 0.2)',
                                }}
                              >
                                <Icon
                                  size={22}
                                  strokeWidth={2.2}
                                />
                              </Box>

                              <Box
                                sx={{
                                  minWidth: 0,
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontWeight: 700,
                                    color: 'text.primary',
                                    fontSize: '15px',
                                    lineHeight: 1.25,
                                  }}
                                >
                                  {entry.title}
                                </Typography>

                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'text.secondary',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    display: 'block',
                                    mt: 0.2,
                                  }}
                                >
                                  {entry.subtitle}
                                </Typography>

                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'text.disabled',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    display: 'block',
                                    mt: 0.3,
                                  }}
                                >
                                  {entry.date}
                                </Typography>
                              </Box>
                            </Box>

                            {/* Amount or chevron */}
                            {entry.amount ? (
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  color: 'text.primary',
                                  fontSize: '15px',
                                  letterSpacing: '-0.02em',
                                  flexShrink: 0,
                                }}
                              >
                                {entry.amount}
                              </Typography>
                            ) : (
                              <Box
                                sx={{
                                  color: 'text.disabled',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <ChevronRight
                                  size={20}
                                  strokeWidth={2.2}
                                />
                              </Box>
                            )}
                          </Box>
                        )
                      })}
                    </Stack>
                  ) : (
                    <EmptyState
                      title="No recent activity"
                      description="Upcoming appointments and invoices will appear here."
                    />
                  )}
                </Box>

                <Dialog open={Boolean(selectedInvoice)} onClose={() => setSelectedInvoice(null)} fullWidth maxWidth="xs">
                  <DialogTitle sx={{ color: 'text.primary', fontWeight: 800 }}>Invoice details</DialogTitle>
                  {selectedInvoice && (
                    <DialogContent dividers>
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              fontWeight: 700,
                            }}
                          >
                            Invoice number
                          </Typography>

                          <Typography
                            sx={{
                              color: 'text.primary',
                              fontWeight: 700,
                            }}
                          >
                            {selectedInvoice.invoiceNumber ??
                              `INV-${selectedInvoice.id}`}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              fontWeight: 700,
                            }}
                          >
                            Business
                          </Typography>

                          <Typography
                            sx={{
                              color: 'text.primary',
                              fontWeight: 700,
                            }}
                          >
                            {data.businesses.find(
                              (business) =>
                                business.id ===
                                selectedInvoice.businessId,
                            )?.businessName ??
                              data.businesses.find(
                                (business) =>
                                  business.id ===
                                  selectedInvoice.businessId,
                              )?.name ??
                              'Business'}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              fontWeight: 700,
                            }}
                          >
                            Status
                          </Typography>

                          <Box>
                            <Chip
                              label={selectedInvoice.status ?? 'SENT'}
                              size="small"
                              color="success"
                              sx={{ mt: 0.4, fontWeight: 800 }}
                            />
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 1.5,
                          }}
                        >
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                fontWeight: 700,
                              }}
                            >
                              Issue date
                            </Typography>

                            <Typography sx={{ color: 'text.primary' }}>
                              {selectedInvoice.issueDate
                                ? new Date(
                                    `${selectedInvoice.issueDate}T00:00:00`,
                                  ).toLocaleDateString('en-IN', {
                                    dateStyle: 'medium',
                                  })
                                : 'Not provided'}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                fontWeight: 700,
                              }}
                            >
                              Due date
                            </Typography>

                            <Typography sx={{ color: 'text.primary' }}>
                              {selectedInvoice.dueDate
                                ? new Date(
                                    `${selectedInvoice.dueDate}T00:00:00`,
                                  ).toLocaleDateString('en-IN', {
                                    dateStyle: 'medium',
                                  })
                                : 'Not provided'}
                            </Typography>
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            borderTop:
                              '1px solid var(--mui-palette-divider)',
                            pt: 1.2,
                          }}
                        >
                          <Stack spacing={0.6}>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 1,
                              }}
                            >
                              <Typography sx={{ color: 'text.secondary' }}>
                                Subtotal
                              </Typography>

                              <Typography sx={{ color: 'text.primary' }}>
                                {formatCurrency(
                                  selectedInvoice.subtotal,
                                )}
                              </Typography>
                            </Box>

                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 1,
                              }}
                            >
                              <Typography sx={{ color: 'text.secondary' }}>
                                GST
                              </Typography>

                              <Typography sx={{ color: 'text.primary' }}>
                                {formatCurrency(
                                  selectedInvoice.gstAmount,
                                )}
                              </Typography>
                            </Box>
                            {(selectedInvoice.loyaltyPointsRedeemed ?? 0) > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                <Typography sx={{ color: 'success.main' }}>Loyalty discount ({selectedInvoice.loyaltyPointsRedeemed} points)</Typography>
                                <Typography sx={{ color: 'success.main' }}>−{formatCurrency(selectedInvoice.loyaltyDiscountAmount)}</Typography>
                              </Box>
                            )}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, pt: 0.7, borderTop: '1px solid var(--mui-palette-divider)' }}>
                              <Typography sx={{ color: 'text.primary', fontWeight: 800 }}>Total</Typography>
                              <Typography sx={{ color: 'primary.main', fontWeight: 800 }}>{formatCurrency(selectedInvoice.totalAmount)}</Typography>
                            </Box>
                          </Stack>
                        </Box>
                      </Stack>
                    </DialogContent>
                  )}

                  <DialogActions>
                    <Button
                      onClick={() => setSelectedInvoice(null)}
                      sx={{
                        color: 'primary.main',
                        fontWeight: 700,
                        textTransform: 'none',
                      }}
                    >
                      Close
                    </Button>
                  </DialogActions>
                </Dialog>
              </Box>
            )}

            {/* Businesses Tab: Show business details only */}
            {activeTab === 'businesses' && (
              <Box
                sx={{
                  backgroundColor: 'action.hover',
                  borderRadius: '24px',
                  p: 2,
                  border: '1px solid var(--mui-palette-divider)',
                }}
              >
                <CustomerLocationCard
                  key={`businesses:${data.customers[0]?.locationAddress ?? ''}:${data.customers[0]?.latitude ?? ''}:${data.customers[0]?.longitude ?? ''}`}
                  locationAddress={
                    data.customers[0]?.locationAddress
                  }
                  latitude={data.customers[0]?.latitude}
                  longitude={data.customers[0]?.longitude}
                  view="businesses"
                />
              </Box>
            )}

            {/* Offers Tab: nearby offers from businesses */}
            {activeTab === 'offers' && (
              <Box
                sx={{
                  backgroundColor: 'action.hover',
                  borderRadius: '24px',
                  p: 2,
                  border: '1px solid var(--mui-palette-divider)',
                }}
              >
                <CustomerLocationCard
                  key={`offers:${data.customers[0]?.locationAddress ?? ''}:${data.customers[0]?.latitude ?? ''}:${data.customers[0]?.longitude ?? ''}`}
                  locationAddress={
                    data.customers[0]?.locationAddress
                  }
                  latitude={data.customers[0]?.latitude}
                  longitude={data.customers[0]?.longitude}
                  view="offers"
                />
              </Box>
            )}

            {activeTab === 'invoices' && <CustomerInvoicesList invoices={data.invoices} businesses={data.businesses} />}
            {activeTab === 'appointments' && (
              <CustomerAppointmentsPanel
                appointments={data.appointments}
                businesses={data.businesses}
                customerId={Number(authUser?.id ?? 0)}
                selectedAppointmentId={explicitAppointment?.id}
                onSelectAppointment={setSelectedAppointment}
              />
            )}

            {/* Memberships Tab */}
            {activeTab === 'memberships' && (
              <Stack spacing={1.2}>
                <Box>
                  <Typography
                    sx={{
                      color: 'text.primary',
                      fontSize: 19,
                      fontWeight: 900,
                    }}
                  >
                    My memberships
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary' }}
                  >
                    Subscriptions and messages from your businesses
                  </Typography>
                </Box>

                {data.memberships.map((membership) => {
                  const business = data.businesses.find(
                    (item) =>
                      item.id === membership.businessId,
                  )

                  const daysRemaining = membership.endDate
                    ? Math.ceil(
                        (
                          new Date(
                            `${membership.endDate}T23:59:59`,
                          ).getTime() - activityNow
                        ) / 86400000,
                      )
                    : null

                  const membershipMessages =
                    data.membershipNotifications.filter(
                      (notification) =>
                        notification.membershipId ===
                        membership.id,
                    )

                  return (
                    <Card
                      key={membership.id}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        borderColor: 'divider',
                      }}
                    >
                      <CardContent sx={{ p: 1.4 }}>
                        <Stack
                          direction="row"
                          sx={{
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 1,
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                color: 'text.primary',
                                fontWeight: 900,
                              }}
                            >
                              {membership.planName}
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{ color: 'text.secondary' }}
                            >
                              {business?.businessName ??
                                business?.name ??
                                `Business #${membership.businessId}`}
                            </Typography>
                          </Box>

                          <Chip
                            size="small"
                            label={membership.status ?? 'PENDING'}
                            color={
                              membership.status === 'ACTIVE'
                                ? 'success'
                                : membership.status === 'PENDING'
                                  ? 'warning'
                                  : 'default'
                            }
                          />
                        </Stack>

                        <Typography
                          sx={{
                            mt: 1,
                            color: 'primary.main',
                            fontWeight: 800,
                          }}
                        >
                          {formatCurrency(membership.price)}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            mt: 0.3,
                            color: 'text.secondary',
                          }}
                        >
                          Valid {membership.startDate ?? '—'} to{' '}
                          {membership.endDate ?? '—'}
                        </Typography>

                        {daysRemaining !== null &&
                          membership.status === 'ACTIVE' && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                mt: 0.4,
                                color:
                                  daysRemaining <= 7
                                    ? 'warning.main'
                                    : 'text.secondary',
                                fontWeight: 700,
                              }}
                            >
                              {daysRemaining < 0
                                ? 'Expired'
                                : `Expires in ${daysRemaining} day${
                                    daysRemaining === 1 ? '' : 's'
                                  }`}
                            </Typography>
                          )}

                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 0.35,
                            color: 'text.secondary',
                          }}
                        >
                          Payment recorded as{' '}
                          {membership.paymentStatus ?? 'PENDING'}
                        </Typography>

                        {membershipMessages.map((notification) => (
                          <Alert
                            key={notification.id}
                            severity="info"
                            sx={{ mt: 1, borderRadius: 1.5 }}
                          >
                            {notification.message}
                          </Alert>
                        ))}
                      </CardContent>
                    </Card>
                  )
                })}

                {data.memberships.length === 0 && (
                  <EmptyState
                    title="No memberships yet"
                    description="Memberships linked to your BHive profile will appear here."
                  />
                )}
              </Stack>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <CustomerProfilePanel
                authUser={authUser}
                data={data}
                onProfileUpdated={(user) => dispatch(setAuthUser(user))}
                onOpenManageDialog={() => setManagerOpen(true)}
                onOpenBusinesses={() => handleChangeTab('businesses')}
                onOpenDocuments={() => handleChangeTab('invoices')}
                onOpenFamily={() => setFamilyDialogOpen(true)}
                onOpenBusiness={(businessId) => {
                  dispatch(setSelectedBusinessId(businessId))
                  navigate(`/business/${businessId}`)
                }}
                onLogout={() => {
                  logoutUser()
                  navigate('/')
                }}
              />
            )}
          </Box>

          <AppointmentDetailDialog
            open={Boolean(explicitAppointment)}
            appointment={explicitAppointment}
            businesses={data.businesses}
            customers={data.customers}
            role="CUSTOMER"
            onClose={() => setSelectedAppointment(null)}
          />

          {/* Bottom Navigation Bar */}
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
              gridTemplateColumns: `repeat(${roleNav.length}, minmax(0, 1fr))`,
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