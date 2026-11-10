import { useState } from 'react'
import { alpha } from '@mui/material/styles'
import {
  Alert,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  ArrowLeft,
  Award,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Ellipsis,
  FileText,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  QrCode,
  ReceiptText,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { setActiveTab } from '../store/customerDashboardSlice'
import { useAppDispatch } from '../store/hooks'
import { getDashboardPath } from '../routes/dashboardPaths'
import { CustomerBottomNavBar } from '../modules/customer/components/CustomerBottomNavBar'
import type { DashboardTab } from '../modules/types'
import type { BusinessSummary, MembershipSummary, PaymentSummary } from '../services/api'
import { CALLBACK_REASON_MAX_LENGTH, requestBusinessCallback } from '../services/api/callbackApi'

type DetailInvoice = { id: number; title: string; amount: string; status: string; date: string }
type DetailAppointment = { id: number; title: string; subtitle: string; status: string }

type CustomerBusinessDetailPageProps = {
  business: BusinessSummary
  memberships: MembershipSummary[]
  payments: PaymentSummary[]
  invoiceCount: number
  appointmentCount: number
  totalRevenue: number
  nextAppointmentLabel?: string
  recentInvoices: DetailInvoice[]
  recentAppointments: DetailAppointment[]
  loyaltyPoints?: number | null
}

type DetailActionRowProps = {
  icon: LucideIcon
  title: string
  subtitle: string
  onClick: () => void
}

function DetailActionRow({ icon: Icon, title, subtitle, onClick }: DetailActionRowProps) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        width: '100%',
        minHeight: 68,
        gap: 1.4,
        px: 1.25,
        py: 1,
        border: '1px solid var(--mui-palette-divider)',
        borderRadius: 2,
        background: 'var(--mui-palette-background-paper)',
        textAlign: 'left',
        transition: 'border-color 160ms ease, background-color 160ms ease, transform 160ms ease',
        '&:hover': { borderColor: 'primary.main', backgroundColor: 'action.hover', transform: 'translateY(-1px)' },
        '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <Box sx={{ width: 44, height: 44, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1.5, color: 'primary.main', background: 'primary.light' }}>
        <Icon size={20} strokeWidth={2.1} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ color: 'text.primary', fontSize: 14, fontWeight: 800, lineHeight: 1.25 }}>{title}</Typography>
        <Typography noWrap sx={{ mt: 0.35, color: 'text.secondary', fontSize: 12, lineHeight: 1.3 }}>{subtitle}</Typography>
      </Box>
      <ChevronRight size={19} color="var(--mui-palette-text-disabled)" />
    </ButtonBase>
  )
}

function formatDate(value?: string) {
  if (!value) return undefined
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function businessCategory(business: BusinessSummary) {
  const name = `${business.businessName ?? ''} ${business.businessType ?? ''}`
  if (/fitness|gym|sport/i.test(name)) return 'Fitness & Wellness'
  if (/salon|beauty|barber/i.test(name)) return 'Beauty & Personal Care'
  if (/bank|finance/i.test(name)) return 'Financial Services'
  return business.businessType && business.businessType !== 'SERVICE' ? business.businessType : 'Business & Services'
}

export function CustomerBusinessDetailPage({
  business,
  memberships,
  payments,
  invoiceCount,
  appointmentCount,
  totalRevenue,
  nextAppointmentLabel,
  recentInvoices,
  recentAppointments,
  loyaltyPoints,
}: CustomerBusinessDetailPageProps) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [callbackOpen, setCallbackOpen] = useState(false)
  const [callbackReason, setCallbackReason] = useState('')
  const [callbackSending, setCallbackSending] = useState(false)
  const [callbackError, setCallbackError] = useState('')
  const [callbackSent, setCallbackSent] = useState(false)

  const closeCallbackDialog = () => {
    if (callbackSending) return
    setCallbackOpen(false)
    setCallbackError('')
    if (callbackSent) {
      setCallbackSent(false)
      setCallbackReason('')
    }
  }

  const submitCallback = async () => {
    setCallbackSending(true)
    setCallbackError('')
    try {
      await requestBusinessCallback(business.id, callbackReason)
      setCallbackSent(true)
    } catch (error) {
      setCallbackError(error instanceof Error ? error.message : 'Could not send your callback request.')
    } finally {
      setCallbackSending(false)
    }
  }
  const businessName = business.businessName ?? business.name ?? 'Business'
  const businessInitials = businessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'B'
  const membership = memberships.find((item) => item.status?.toUpperCase() === 'ACTIVE') ?? memberships[0]
  const isRelationshipActive = (membership?.status?.toUpperCase() === 'ACTIVE') || /active/i.test(business.status ?? '')
  const paymentTotal = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
  const paymentLabel = payments.length > 0
    ? `₹${paymentTotal.toLocaleString('en-IN')} · ${payments.length} ${payments.length === 1 ? 'payment' : 'payments'}`
    : totalRevenue > 0 ? `₹${totalRevenue.toLocaleString('en-IN')} · ${invoiceCount} invoices` : 'No payments yet'
  const nextAppointment = nextAppointmentLabel
    ? `Next: ${nextAppointmentLabel}`
    : recentAppointments[0]?.subtitle ?? (appointmentCount > 0 ? `${appointmentCount} scheduled` : 'No upcoming appointments')
  const coverImage = business.bannerImageUrl || business.imageUrl

  const shareBusiness = async () => {
    if (navigator.share) {
      await navigator.share({ title: businessName, url: window.location.href }).catch(() => undefined)
      return
    }
    await navigator.clipboard?.writeText(window.location.href).catch(() => undefined)
  }

  const goToDashboardTab = (tab: 'invoices' | 'appointments' | 'loyalty') => {
    dispatch(setActiveTab(tab))
    navigate(getDashboardPath('CUSTOMER', tab))
  }

  const heroIcon = /fitness|gym|sport/i.test(businessName) ? Dumbbell : business.businessType?.toUpperCase() === 'SERVICE' ? FileText : WalletCards
  const BusinessIcon = heroIcon

  return (
    <Box sx={{ position: 'fixed', inset: 0, height: '100dvh', minHeight: 0, display: 'flex', justifyContent: 'center', background: 'background.default' }}>
      <Container maxWidth="xs" disableGutters sx={{ px: 0 }}>
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: 412,
            height: { xs: '100dvh', sm: 'calc(100dvh - 64px)' },
            maxHeight: { xs: '100dvh', sm: 'calc(100dvh - 64px)' },
            mx: 'auto',
            overflow: 'hidden',
            borderRadius: { xs: 0, sm: '24px' },
            background: 'background.paper',
            border: '1px solid var(--mui-palette-divider)',
            boxShadow: '0 18px 46px rgba(15, 3, 45, 0.10)',
          }}
        >
          <Box component="header" sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1, px: 1.5, pt: 1.25, pb: 1, borderBottom: '1px solid var(--mui-palette-divider)' }}>
            <IconButton
              aria-label="Back to dashboard"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1)
                } else {
                  navigate(getDashboardPath('CUSTOMER'))
                }
              }}
              sx={{ width: 40, height: 40, color: 'text.primary', borderRadius: 2, '&:hover': { backgroundColor: 'action.hover' } }}
            >
              <ArrowLeft size={19} />
            </IconButton>
            <Typography sx={{ flex: 1, color: 'text.primary', fontSize: 16, fontWeight: 800 }}>Business details</Typography>
            <IconButton aria-label="Share business" onClick={() => void shareBusiness()} sx={{ width: 40, height: 40, color: 'text.primary', borderRadius: 2, '&:hover': { backgroundColor: 'action.hover' } }}>
              <Ellipsis size={20} />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain', px: { xs: 2, sm: 2.25 }, pt: 1.75, pb: 'calc(96px + env(safe-area-inset-bottom))' }}>
            {coverImage ? (
              <Box
                component="img"
                src={coverImage}
                alt={`${businessName} business`}
                sx={{ display: 'block', width: '100%', height: 168, objectFit: 'cover', borderRadius: 2.5, background: 'primary.light' }}
              />
            ) : (
              <Box
                role="img"
                aria-label={`${businessName} themed banner`}
                sx={(theme) => ({
                  position: 'relative',
                  display: 'grid',
                  placeItems: 'center',
                  width: '100%',
                  height: 168,
                  overflow: 'hidden',
                  borderRadius: 2.5,
                  color: 'primary.contrastText',
                  background: `linear-gradient(120deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main} 55%, ${theme.palette.secondary.main})`,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: 220,
                    height: 220,
                    right: -54,
                    bottom: -132,
                    borderRadius: '50%',
                    backgroundColor: alpha(theme.palette.common.white, 0.12),
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    width: 120,
                    height: 120,
                    top: -66,
                    left: -38,
                    borderRadius: '50%',
                    border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                  },
                })}
              >
                <BusinessIcon size={56} strokeWidth={1.5} />
              </Box>
            )}

            <Box sx={{ position: 'relative', minHeight: 142, pl: 0.3, pt: 5.1 }}>
              <Avatar
                src={business.imageUrl || undefined}
                alt={`${businessName} profile`}
                sx={{
                  position: 'absolute',
                  top: -34,
                  left: 0,
                  width: 68,
                  height: 68,
                  border: '4px solid var(--mui-palette-background-paper)',
                  color: 'primary.contrastText',
                  background: 'linear-gradient(135deg, var(--mui-palette-primary-main), var(--mui-palette-secondary-main))',
                  boxShadow: '0 4px 14px rgba(15,3,45,0.14)',
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                {businessInitials}
              </Avatar>
              <Box sx={{ pr: loyaltyPoints == null ? 0 : 13.5 }}>
                <Typography noWrap sx={{ color: 'text.primary', fontSize: 20, fontWeight: 850, lineHeight: 1.25 }}>{businessName}</Typography>
              </Box>
              {loyaltyPoints != null && (
                <ButtonBase
                  aria-label={`${loyaltyPoints} reward points available. View loyalty`}
                  onClick={() => goToDashboardTab('loyalty')}
                  sx={(theme) => ({
                    position: 'absolute',
                    top: 34,
                    right: 0,
                    gap: 0.75,
                    pl: 0.5,
                    pr: 1.4,
                    py: 0.5,
                    borderRadius: '999px',
                    color: 'primary.contrastText',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.35)}`,
                    '&:hover': { transform: 'translateY(-1px)' },
                    transition: 'transform 160ms ease',
                  })}
                >
                  <Box sx={{ width: 26, height: 26, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.22)' }}>
                    <Award size={15} strokeWidth={2.3} />
                  </Box>
                  <Box sx={{ textAlign: 'left', lineHeight: 1 }}>
                    <Typography component="span" sx={{ display: 'block', fontSize: 16, fontWeight: 900, lineHeight: 1 }}>
                      {loyaltyPoints.toLocaleString('en-IN')}
                    </Typography>
                    <Typography component="span" sx={{ display: 'block', mt: 0.25, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', opacity: 0.9, textTransform: 'uppercase' }}>
                      Reward pts
                    </Typography>
                  </Box>
                </ButtonBase>
              )}
              <Typography sx={{ mt: 0.45, color: 'text.secondary', fontSize: 13 }}>{businessCategory(business)}</Typography>
              <Box sx={(theme) => ({ display: 'inline-flex', alignItems: 'center', gap: 0.7, mt: 1, px: 1.2, py: 0.55, borderRadius: '999px', color: isRelationshipActive ? theme.palette.success.main : theme.palette.text.secondary, background: isRelationshipActive ? alpha(theme.palette.success.main, 0.12) : theme.palette.action.hover, fontSize: 11, fontWeight: 800 })}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
                {isRelationshipActive ? 'Active relationship' : 'Relationship inactive'}
              </Box>
            </Box>

            <Box sx={{ mt: 0.5, p: 1.75, border: '1px solid var(--mui-palette-divider)', borderRadius: 2.5, background: 'background.paper', boxShadow: '0 5px 18px rgba(15,3,45,0.05)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box sx={{ width: 46, height: 46, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1.7, color: 'primary.main', background: 'primary.light' }}>
                  <CalendarDays size={21} strokeWidth={2.1} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>Membership</Typography>
                  <Typography noWrap sx={{ mt: 0.25, color: 'text.primary', fontSize: 15, fontWeight: 800, lineHeight: 1.25 }}>{membership?.planName ?? 'Membership details'}</Typography>
                  <Typography sx={{ mt: 0.35, color: 'text.secondary', fontSize: 11, lineHeight: 1.3 }}>
                    {membership?.endDate ? `Valid till ${formatDate(membership.endDate)}` : membership ? `${membership.status ?? 'Active'} membership` : 'No membership plan linked'}
                  </Typography>
                </Box>
                <ChevronRight size={19} color="var(--mui-palette-text-disabled)" />
              </Box>
              <Button
                fullWidth
                disabled={!membership}
                startIcon={<QrCode size={15} />}
                onClick={() => setCheckInOpen(true)}
                variant="contained"
                sx={{ mt: 1.5, minHeight: 44, borderRadius: 1.7, fontSize: 13, fontWeight: 800, textTransform: 'none' }}
              >
                Check-in / View QR
              </Button>
            </Box>

            <Typography sx={{ mt: 2.5, mb: 1, color: 'text.primary', fontSize: 15, fontWeight: 800 }}>Your activity</Typography>
            <Stack spacing={1.1}>
              <DetailActionRow
                icon={WalletCards}
                title="Payment history"
                subtitle={paymentLabel || `₹${totalRevenue.toLocaleString('en-IN')}`}
                onClick={() => goToDashboardTab('invoices')}
              />
              <DetailActionRow
                icon={ReceiptText}
                title="Receipts"
                subtitle={recentInvoices.length > 0 ? `View all receipts · ${invoiceCount} invoices` : 'View all receipts'}
                onClick={() => goToDashboardTab('invoices')}
              />
              {business.appointmentsEnabled && (
                <DetailActionRow
                  icon={CalendarDays}
                  title="Appointments"
                  subtitle={business.homeServicesEnabled ? `Home services available · ${nextAppointment}` : nextAppointment}
                  onClick={() => goToDashboardTab('appointments')}
                />
              )}
              <DetailActionRow
                icon={Phone}
                title="Contact business"
                subtitle="Call / Message / Location"
                onClick={() => setContactOpen(true)}
              />
              <DetailActionRow
                icon={PhoneCall}
                title="Request a callback"
                subtitle="Ask the business to call you back"
                onClick={() => setCallbackOpen(true)}
              />
            </Stack>
          </Box>

          <Dialog open={checkInOpen} onClose={() => setCheckInOpen(false)} fullWidth maxWidth="xs">
            <DialogTitle sx={{ color: 'text.primary', fontWeight: 800 }}>Membership check-in</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'grid', justifyItems: 'center', gap: 1, py: 1 }}>
                <Box sx={{ width: 92, height: 92, display: 'grid', placeItems: 'center', border: '1px solid var(--mui-palette-divider)', borderRadius: 2, color: 'primary.main', background: 'primary.light' }}>
                  <QrCode size={54} strokeWidth={1.7} />
                </Box>
                <Typography sx={{ color: 'text.secondary', fontSize: 12, textAlign: 'center' }}>Show your membership details at the business.</Typography>
                <Typography sx={{ color: 'text.primary', fontWeight: 800, fontSize: 13 }}>{membership?.planName ?? 'Membership'} · #{membership?.id}</Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCheckInOpen(false)} sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'none' }}>Close</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={contactOpen} onClose={() => setContactOpen(false)} fullWidth maxWidth="xs">
            <DialogTitle sx={{ color: 'text.primary', fontWeight: 800 }}>Contact {businessName}</DialogTitle>
            <DialogContent>
              <Stack spacing={1}>
                {business.phone && <ButtonBase component="a" href={`tel:${business.phone}`} sx={{ justifyContent: 'flex-start', gap: 1, py: 1, color: 'primary.main' }}><Phone size={16} /><Typography sx={{ fontSize: 12 }}>{business.phone}</Typography></ButtonBase>}
                {business.email && <ButtonBase component="a" href={`mailto:${business.email}`} sx={{ justifyContent: 'flex-start', gap: 1, py: 1, color: 'primary.main' }}><Mail size={16} /><Typography sx={{ fontSize: 12 }}>{business.email}</Typography></ButtonBase>}
                {business.address && <ButtonBase component="a" href={`https://maps.google.com/?q=${encodeURIComponent(business.address)}`} target="_blank" rel="noreferrer" sx={{ justifyContent: 'flex-start', gap: 1, py: 1, color: 'primary.main' }}><MapPin size={16} /><Typography sx={{ fontSize: 12 }}>{business.address}</Typography></ButtonBase>}
                {!business.phone && !business.email && !business.address && <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Contact details are not available yet.</Typography>}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setContactOpen(false)} sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'none' }}>Close</Button>
            </DialogActions>
          </Dialog>
          <Dialog open={callbackOpen} onClose={closeCallbackDialog} fullWidth maxWidth="xs">
            <DialogTitle sx={{ color: 'text.primary', fontWeight: 800 }}>Request a callback</DialogTitle>
            <DialogContent>
              {callbackSent ? (
                <Alert severity="success" sx={{ mt: 0.5 }}>
                  Request sent. {businessName} has been notified and will contact you soon.
                </Alert>
              ) : (
                <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                    {businessName} will see your name and contact details along with your request.
                  </Typography>
                  <TextField
                    label="Reason (optional)"
                    placeholder="e.g. Question about my membership"
                    value={callbackReason}
                    onChange={(event) => setCallbackReason(event.target.value.slice(0, CALLBACK_REASON_MAX_LENGTH))}
                    multiline
                    minRows={3}
                    fullWidth
                    disabled={callbackSending}
                    helperText={`${callbackReason.length}/${CALLBACK_REASON_MAX_LENGTH}`}
                  />
                  {callbackError && <Alert severity="error">{callbackError}</Alert>}
                </Stack>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={closeCallbackDialog} disabled={callbackSending} sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'none' }}>
                {callbackSent ? 'Close' : 'Cancel'}
              </Button>
              {!callbackSent && (
                <Button variant="contained" disableElevation onClick={() => void submitCallback()} disabled={callbackSending} sx={{ fontWeight: 800, textTransform: 'none' }}>
                  {callbackSending ? 'Sending…' : 'Send request'}
                </Button>
              )}
            </DialogActions>
          </Dialog>
          <CustomerBottomNavBar
            activeTab="businesses"
            onChangeTab={(tab: DashboardTab) => {
              dispatch(setActiveTab(tab))
              navigate(getDashboardPath('CUSTOMER', tab))
            }}
          />
        </Paper>
      </Container>
    </Box>
  )
}