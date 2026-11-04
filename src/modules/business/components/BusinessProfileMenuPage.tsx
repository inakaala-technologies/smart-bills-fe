import { useState } from 'react'
import { Box, Button, ButtonBase, Container, Paper, Stack, Typography } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  ChartColumnIncreasing,
  ChevronRight,
  CircleHelp,
  Home,
  Info,
  LogOut,
  Megaphone,
  Moon,
  PhoneCall,
  ReceiptText,
  Sun,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { ProfileManagerDialog } from '../../../components/ProfileManagerDialog'
import { ProfilePictureUpload } from '../../../components/ProfilePictureUpload'
import { BusinessBannerUpload } from '../../../components/BusinessBannerUpload'
import type { BusinessSummary } from '../../../services/api/types'
import type { AuthUser, Role } from '../../../services/auth'
import type { DashboardTab } from '../../types'

type BusinessProfileMenuPageProps = {
  authUser: Pick<AuthUser, 'name' | 'email' | 'profilePictureUrl'> | null
  currentRole: Role
  availableAccounts: Array<{ role: Role }>
  missingProfileRoles: Role[]
  appointmentsEnabled: boolean
  membershipsEnabled: boolean
  onBack: () => void
  onNavigateTab: (tab: DashboardTab) => void
  onSwitchAccount: (role: Role) => void
  onAddProfile: (role: Role) => void
  onLogout: () => void
  onProfilePictureUpdated: (user: AuthUser) => void
  business?: { id: number; bannerImageUrl?: string } | null
  onBannerUploaded?: (business: BusinessSummary) => void
  /** Optional: the Help and About pages are built later; until then these rows are inert. */
  onOpenHelp?: () => void
  onOpenAbout?: () => void
}

type ProfileMenuItem = {
  label: string
  icon: LucideIcon
  onClick: () => void
}

const LIME = '#CDF27E'
const INK = '#0F032D'

const sectionLabelSx = {
  mb: 0.8,
  ml: 0.5,
  color: 'text.secondary',
  fontSize: 10,
  fontWeight: 400,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
} as const

const groupCardSx = {
  overflow: 'hidden',
  borderRadius: '10px',
  border: 'none',
  boxShadow: '0 2px 12px rgba(78, 43, 204, 0.07)',
} as const

export function BusinessProfileMenuPage({
  authUser,
  currentRole,
  availableAccounts,
  missingProfileRoles,
  appointmentsEnabled,
  membershipsEnabled,
  onBack,
  onNavigateTab,
  onSwitchAccount,
  onAddProfile,
  onLogout,
  onProfilePictureUpdated,
  business,
  onBannerUploaded,
  onOpenHelp,
  onOpenAbout,
}: BusinessProfileMenuPageProps) {
  const { mode, setMode } = useColorScheme()
  const [managerOpen, setManagerOpen] = useState(false)
  const sections: Array<{ title: string; items: ProfileMenuItem[] }> = [
    {
      title: 'Account',
      items: [
        { label: 'Profile', icon: UserRound, onClick: () => onNavigateTab('profile') },
        { label: 'Manage profiles', icon: UsersRound, onClick: () => setManagerOpen(true) },
        { label: 'Business', icon: Building2, onClick: () => onNavigateTab('businesses') },
      ],
    },
    {
      title: 'Growth & engagement',
      items: [
        { label: 'Loyalty points', icon: Award, onClick: () => onNavigateTab('loyalty') },
        { label: 'Retention', icon: UsersRound, onClick: () => onNavigateTab('retention') },
        { label: 'Callback requests', icon: PhoneCall, onClick: () => onNavigateTab('callbacks') },
        { label: 'Insights', icon: ChartColumnIncreasing, onClick: () => onNavigateTab('insights') },
        { label: 'Offers', icon: Megaphone, onClick: () => onNavigateTab('offers') },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { label: 'Home', icon: Home, onClick: () => onNavigateTab('overview') },
        { label: 'Invoices', icon: ReceiptText, onClick: () => onNavigateTab('invoices') },
        ...(appointmentsEnabled ? [{ label: 'Appointments', icon: CalendarCheck2, onClick: () => onNavigateTab('appointments') }] : []),
        ...(membershipsEnabled ? [{ label: 'Memberships', icon: BadgeCheck, onClick: () => onNavigateTab('memberships') }] : []),
      ],
    },
    {
      title: 'More info and support',
      items: [
        { label: 'Help', icon: CircleHelp, onClick: () => onOpenHelp?.() },
        { label: 'About', icon: Info, onClick: () => onOpenAbout?.() },
      ],
    },
  ]

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        bgcolor: 'background.default',
        py: { xs: 0, sm: 4 },
      }}
    >
      <Container maxWidth="xs" disableGutters sx={{ width: '100%', height: '100%', px: 0 }}>
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 412,
            mx: 'auto',
            height: { xs: '100dvh', sm: 'calc(100dvh - 64px)' },
            maxHeight: { xs: '100dvh', sm: 'calc(100dvh - 64px)' },
            borderRadius: { xs: 0, sm: '24px' },
            bgcolor: 'background.default',
            overflowY: 'auto',
            boxShadow: '0 18px 46px rgba(0, 0, 0, 0.12)',
          }}
        >
          {/* Figma: violet -> ink gradient header, 35px bottom radius */}
          <Box
            sx={{
              px: 2,
              pt: 'calc(env(safe-area-inset-top) + 40px)',
              pb: 3,
              color: '#ffffff',
              background: 'linear-gradient(180deg, #F1EBFC 0%, #CDBAF1 8%, #AE89F2 20%, #8C59F2 36%, #5B34D4 58%, #331A88 80%, #0F032D 100%)',
              borderRadius: '0 0 35px 35px',
            }}
          >
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: 40 }}>
              <ButtonBase
                type="button"
                aria-label="Back to dashboard"
                onClick={onBack}
                sx={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  bgcolor: '#ffffff',
                  color: '#4E2BCC',
                  zIndex: 1,
                  '&:hover': { bgcolor: '#F1EBFC' },
                }}
              >
                <ArrowLeft size={20} />
              </ButtonBase>
              <Typography sx={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 18, fontWeight: 400 }}>
                My Profile
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.8} sx={{ alignItems: 'center', mt: 2.2, px: 0.5 }}>
              <ProfilePictureUpload
                authUser={authUser}
                onUploaded={onProfilePictureUpdated}
                size={80}
                inverted
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 20, fontWeight: 400, lineHeight: 1.2 }}>{authUser?.name ?? 'User'}</Typography>
                <Typography noWrap sx={{ mt: 0.3, fontSize: 12, fontWeight: 300, color: 'rgba(255,255,255,0.88)' }}>{authUser?.email ?? ''}</Typography>
              </Box>
            </Stack>
          </Box>

          <Stack spacing={2} sx={{ px: 2, pt: 2.2, pb: 'calc(28px + env(safe-area-inset-bottom))' }}>
            {business && onBannerUploaded && (
              <BusinessBannerUpload
                businessId={business.id}
                bannerImageUrl={business.bannerImageUrl}
                onUploaded={onBannerUploaded}
              />
            )}
            {sections.map(({ title, items }) => (
              <Box component="section" key={title}>
                <Typography sx={sectionLabelSx}>{title}</Typography>
                <Paper variant="outlined" sx={groupCardSx}>
                  {items.map(({ label, icon: Icon, onClick }, index) => (
                    <ButtonBase
                      key={label}
                      type="button"
                      onClick={onClick}
                      sx={{
                        width: '100%',
                        minHeight: 44,
                        px: 1.6,
                        display: 'flex',
                        justifyContent: 'flex-start',
                        gap: 1.4,
                        color: 'text.primary',
                        '&:hover': { bgcolor: 'action.hover' },
                        ...(index < items.length - 1 ? { borderBottom: '1px solid', borderColor: 'rgba(15, 3, 45, 0.06)' } : {}),
                      }}
                    >
                      <Icon size={17} strokeWidth={1.6} />
                      <Typography sx={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 400 }}>{label}</Typography>
                      <ChevronRight size={16} color={INK} />
                    </ButtonBase>
                  ))}
                </Paper>
              </Box>
            ))}

            <Box component="section">
              <Typography sx={sectionLabelSx}>Appearance</Typography>
              <Paper variant="outlined" sx={{ ...groupCardSx, p: 0.6 }}>
                <Stack direction="row" sx={{ p: 0.4, borderRadius: '8px', bgcolor: 'action.hover' }}>
                  <Button
                    fullWidth
                    startIcon={<Sun size={14} />}
                    aria-pressed={mode !== 'dark'}
                    onClick={() => setMode('light')}
                    sx={{
                      minHeight: 34,
                      borderRadius: '8px',
                      color: mode !== 'dark' ? INK : 'text.primary',
                      bgcolor: mode !== 'dark' ? LIME : 'transparent',
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                      '&:hover': { bgcolor: mode !== 'dark' ? LIME : 'action.selected' },
                    }}
                  >
                    LIGHT
                  </Button>
                  <Button
                    fullWidth
                    startIcon={<Moon size={14} />}
                    aria-pressed={mode === 'dark'}
                    onClick={() => setMode('dark')}
                    sx={{
                      minHeight: 34,
                      borderRadius: '8px',
                      color: mode === 'dark' ? INK : 'text.primary',
                      bgcolor: mode === 'dark' ? LIME : 'transparent',
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                      '&:hover': { bgcolor: mode === 'dark' ? LIME : 'action.selected' },
                    }}
                  >
                    DARK
                  </Button>
                </Stack>
              </Paper>
            </Box>

            <Button
              fullWidth
              startIcon={<LogOut size={16} />}
              onClick={onLogout}
              sx={{
                minHeight: 44,
                borderRadius: '10px',
                bgcolor: '#FCE3E3',
                color: '#D52222',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.06em',
                '&:hover': { bgcolor: '#F9D2D2' },
              }}
            >
              LOGOUT
            </Button>
          </Stack>
        </Paper>
      </Container>

      <ProfileManagerDialog
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        currentRole={currentRole}
        availableAccounts={availableAccounts}
        missingProfileRoles={missingProfileRoles}
        onSwitchAccount={onSwitchAccount}
        onAddProfile={onAddProfile}
      />
    </Box>
  )
}