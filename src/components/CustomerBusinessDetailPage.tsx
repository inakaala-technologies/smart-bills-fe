import { useState } from 'react'
import {
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
  Typography,
} from '@mui/material'
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Ellipsis,
  FileText,
  Mail,
  MapPin,
  Phone,
  QrCode,
  ReceiptText,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { setActiveTab } from '../store/customerDashboardSlice'
import { useAppDispatch } from '../store/hooks'
import type { BusinessSummary, MembershipSummary, PaymentSummary } from '../services/api'

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
        minHeight: 52,
        gap: 1,
        px: 0.8,
        py: 0.5,
        border: '1px solid #edf1f2',
        borderRadius: 1.6,
        background: '#ffffff',
        textAlign: 'left',
      }}
    >
      <Box sx={{ width: 32, height: 32, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1.2, color: '#126b61', background: '#edf7f4' }}>
        <Icon size={17} strokeWidth={2.2} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ color: '#2d4652', fontSize: 10.5, fontWeight: 800, lineHeight: 1.2 }}>{title}</Typography>
        <Typography noWrap sx={{ mt: 0.2, color: '#7b8f97', fontSize: 8.8, lineHeight: 1.2 }}>{subtitle}</Typography>
      </Box>
      <ChevronRight size={15} color="#758992" />
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
}: CustomerBusinessDetailPageProps) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const businessName = business.businessName ?? business.name ?? 'Business'
  const membership = memberships.find((item) => item.status?.toUpperCase() === 'ACTIVE') ?? memberships[0]
  const isRelationshipActive = (membership?.status?.toUpperCase() === 'ACTIVE') || /active/i.test(business.status ?? '')
  const paymentTotal = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
  const paymentLabel = payments.length > 0
    ? `₹${paymentTotal.toLocaleString('en-IN')} · ${payments.length} ${payments.length === 1 ? 'payment' : 'payments'}`
    : totalRevenue > 0 ? `₹${totalRevenue.toLocaleString('en-IN')} · ${invoiceCount} invoices` : 'No payments yet'
  const nextAppointment = nextAppointmentLabel
    ? `Next: ${nextAppointmentLabel}`
    : recentAppointments[0]?.subtitle ?? (appointmentCount > 0 ? `${appointmentCount} scheduled` : 'No upcoming appointments')
  const coverImage = business.imageUrl
    ?? 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80'

  const shareBusiness = async () => {
    if (navigator.share) {
      await navigator.share({ title: businessName, url: window.location.href }).catch(() => undefined)
      return
    }
    await navigator.clipboard?.writeText(window.location.href).catch(() => undefined)
  }

  const goToDashboardTab = (tab: 'invoices' | 'appointments') => {
    dispatch(setActiveTab(tab))
    navigate('/dashboard')
  }

  const heroIcon = /fitness|gym|sport/i.test(businessName) ? Dumbbell : business.businessType?.toUpperCase() === 'SERVICE' ? FileText : WalletCards

  return (
    <Box sx={{ position: 'fixed', inset: 0, height: '100dvh', minHeight: 0, display: 'flex', justifyContent: 'center', background: '#edf3f0' }}>
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
            background: '#ffffff',
            border: '1px solid rgba(32, 54, 56, 0.10)',
            boxShadow: '0 18px 46px rgba(25, 55, 49, 0.10)',
          }}
        >
          <Box component="header" sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1, px: 1.4, pt: 1.05, pb: 0.7 }}>
            <IconButton
              aria-label="Back to dashboard"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1)
                } else {
                  navigate('/dashboard')
                }
              }}
              sx={{ width: 29, height: 34, color: '#183541' }}
            >
              <ArrowLeft size={19} />
            </IconButton>
            <Typography sx={{ flex: 1, color: '#243e4a', fontSize: 13, fontWeight: 800 }}>Business Details</Typography>
            <IconButton aria-label="Share business" onClick={() => void shareBusiness()} sx={{ width: 30, height: 34, color: '#243e4a' }}>
              <Ellipsis size={20} />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain', px: 1.35, pt: 0.5, pb: 'calc(24px + env(safe-area-inset-bottom))' }}>
            <Box component="img" src={coverImage} alt={`${businessName} business interior`} sx={{ display: 'block', width: '100%', height: 112, objectFit: 'cover', borderRadius: 1.8, background: 'linear-gradient(135deg, #d8ebe2, #eff5f3)' }} />

            <Box sx={{ position: 'relative', minHeight: 98, pl: 0.2, pt: 4.2 }}>
              <Box sx={{ position: 'absolute', top: -28, left: 0, width: 54, height: 54, display: 'grid', placeItems: 'center', border: '3px solid #fbfdfc', borderRadius: '50%', color: '#0c705b', background: '#e6f5ef', boxShadow: '0 3px 10px rgba(17,76,63,0.12)' }}>
                {(() => {
                  const Icon = heroIcon
                  return <Icon size={24} strokeWidth={2.5} />
                })()}
              </Box>
              <Typography noWrap sx={{ color: '#263e49', fontSize: 15, fontWeight: 800, lineHeight: 1.25 }}>{businessName}</Typography>
              <Typography sx={{ mt: 0.2, color: '#7a8e95', fontSize: 10 }}>{businessCategory(business)}</Typography>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.55, mt: 0.55, px: 0.95, py: 0.38, borderRadius: '999px', color: isRelationshipActive ? '#118452' : '#687b83', background: isRelationshipActive ? '#e4f7ec' : '#edf1f2', fontSize: 8.5, fontWeight: 800 }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                {isRelationshipActive ? 'Active relationship' : 'Relationship inactive'}
              </Box>
            </Box>

            <Box sx={{ mt: 0.35, p: 1.1, border: '1px solid #edf1f2', borderRadius: 1.9, background: '#ffffff', boxShadow: '0 4px 12px rgba(24,56,63,0.035)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9 }}>
                <Box sx={{ width: 31, height: 31, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1.1, color: 'primary.main', background: 'primary.light' }}>
                  <CalendarDays size={17} strokeWidth={2.2} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ color: '#334c58', fontSize: 9, fontWeight: 700, lineHeight: 1.2 }}>Membership</Typography>
                  <Typography noWrap sx={{ mt: 0.1, color: '#2c4551', fontSize: 10, fontWeight: 800, lineHeight: 1.2 }}>{membership?.planName ?? 'Membership details'}</Typography>
                  <Typography sx={{ mt: 0.25, color: '#748a92', fontSize: 8.5, lineHeight: 1.2 }}>
                    {membership?.endDate ? `Valid till ${formatDate(membership.endDate)}` : membership ? `${membership.status ?? 'Active'} membership` : 'No membership plan linked'}
                  </Typography>
                </Box>
                <ChevronRight size={15} color="#748993" />
              </Box>
              <Button
                fullWidth
                disabled={!membership}
                startIcon={<QrCode size={15} />}
                onClick={() => setCheckInOpen(true)}
                sx={{ mt: 0.9, minHeight: 30, borderRadius: 1.4, color: '#ffffff', background: 'linear-gradient(110deg, #078c67 0%, #04785d 100%)', fontSize: 9, fontWeight: 800, textTransform: 'none', '&:hover': { background: '#06785c' }, '&.Mui-disabled': { color: '#ffffff', background: '#9abeb2' } }}
              >
                Check-in / View QR
              </Button>
            </Box>

            <Stack spacing={0.75} sx={{ mt: 0.9 }}>
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
                  subtitle={nextAppointment}
                  onClick={() => goToDashboardTab('appointments')}
                />
              )}
              <DetailActionRow
                icon={Phone}
                title="Contact business"
                subtitle="Call / Message / Location"
                onClick={() => setContactOpen(true)}
              />
            </Stack>
          </Box>

          <Dialog open={checkInOpen} onClose={() => setCheckInOpen(false)} fullWidth maxWidth="xs">
            <DialogTitle sx={{ color: '#263f4c', fontWeight: 800 }}>Membership check-in</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'grid', justifyItems: 'center', gap: 1, py: 1 }}>
                <Box sx={{ width: 92, height: 92, display: 'grid', placeItems: 'center', border: '1px solid var(--mui-palette-divider)', borderRadius: 2, color: 'primary.main', background: 'primary.light' }}>
                  <QrCode size={54} strokeWidth={1.7} />
                </Box>
                <Typography sx={{ color: '#536b74', fontSize: 12, textAlign: 'center' }}>Show your membership details at the business.</Typography>
                <Typography sx={{ color: '#243e4a', fontWeight: 800, fontSize: 13 }}>{membership?.planName ?? 'Membership'} · #{membership?.id}</Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCheckInOpen(false)} sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'none' }}>Close</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={contactOpen} onClose={() => setContactOpen(false)} fullWidth maxWidth="xs">
            <DialogTitle sx={{ color: '#263f4c', fontWeight: 800 }}>Contact {businessName}</DialogTitle>
            <DialogContent>
              <Stack spacing={1}>
                {business.phone && <ButtonBase component="a" href={`tel:${business.phone}`} sx={{ justifyContent: 'flex-start', gap: 1, py: 1, color: 'primary.main' }}><Phone size={16} /><Typography sx={{ fontSize: 12 }}>{business.phone}</Typography></ButtonBase>}
                {business.email && <ButtonBase component="a" href={`mailto:${business.email}`} sx={{ justifyContent: 'flex-start', gap: 1, py: 1, color: 'primary.main' }}><Mail size={16} /><Typography sx={{ fontSize: 12 }}>{business.email}</Typography></ButtonBase>}
                {business.address && <ButtonBase component="a" href={`https://maps.google.com/?q=${encodeURIComponent(business.address)}`} target="_blank" rel="noreferrer" sx={{ justifyContent: 'flex-start', gap: 1, py: 1, color: 'primary.main' }}><MapPin size={16} /><Typography sx={{ fontSize: 12 }}>{business.address}</Typography></ButtonBase>}
                {!business.phone && !business.email && !business.address && <Typography sx={{ color: '#70858d', fontSize: 12 }}>Contact details are not available yet.</Typography>}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setContactOpen(false)} sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'none' }}>Close</Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Container>
    </Box>
  )
}