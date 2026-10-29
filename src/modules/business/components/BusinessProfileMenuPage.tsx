import { useState } from 'react'
import { Avatar, Box, Button, ButtonBase, Container, Paper, Stack, Typography } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  ChartColumnIncreasing,
  ChevronRight,
  Home,
  LogOut,
  Megaphone,
  Moon,
  ReceiptText,
  Sun,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { ProfileManagerDialog } from '../../../components/ProfileManagerDialog'
import type { AuthUser, Role } from '../../../services/auth'
import type { DashboardTab } from '../../types'

type BusinessProfileMenuPageProps = {
  authUser: Pick<AuthUser, 'name' | 'email'> | null
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
}

type ProfileMenuItem = {
  label: string
  icon: LucideIcon
  onClick: () => void
}

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
}: BusinessProfileMenuPageProps) {
  const { mode, setMode } = useColorScheme()
  const [managerOpen, setManagerOpen] = useState(false)
  const initials = (authUser?.name ?? 'User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U'

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
            bgcolor: 'background.paper',
            overflowY: 'auto',
            boxShadow: '0 18px 46px rgba(0, 0, 0, 0.12)',
          }}
        >
          <Box
            sx={{
              px: 1.5,
              pt: 'calc(env(safe-area-inset-top) + 12px)',
              pb: 2.4,
              color: '#ffffff',
              background: 'linear-gradient(180deg, #C39AF3 0%, #905BF4 42%, #4E2BCC 76%, #0F032D 125%)',
              borderRadius: '0 0 24px 24px',
            }}
          >
            <Stack direction="row" spacing={1.1} sx={{ alignItems: 'center' }}>
              <ButtonBase
                type="button"
                aria-label="Back to dashboard"
                onClick={onBack}
                sx={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.72)',
                  color: '#32128E',
                  '&:hover': { bgcolor: '#ffffff' },
                }}
              >
                <ArrowLeft size={19} />
              </ButtonBase>
              <Typography sx={{ fontSize: 17, fontWeight: 700 }}>My Profile</Typography>
            </Stack>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 1.5, px: 0.6 }}>
              <Avatar
                sx={{
                  width: 66,
                  height: 66,
                  bgcolor: 'rgba(15,3,45,0.5)',
                  color: '#ffffff',
                  fontSize: 20,
                  fontWeight: 800,
                  border: '2px solid rgba(255,255,255,0.35)',
                }}
              >
                {initials}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 19, fontWeight: 600 }}>{authUser?.name ?? 'User'}</Typography>
                <Typography noWrap sx={{ fontSize: 11, color: 'rgba(255,255,255,0.88)' }}>{authUser?.email ?? ''}</Typography>
              </Box>
            </Stack>
          </Box>

          <Stack spacing={1.7} sx={{ px: 1.5, pt: 1.7, pb: 'calc(24px + env(safe-area-inset-bottom))' }}>
            {sections.map(({ title, items }) => (
              <Box component="section" key={title}>
                <Typography sx={{ mb: 0.7, ml: 0.6, color: 'text.secondary', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {title}
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    overflow: 'hidden',
                    borderRadius: 2.2,
                    borderColor: 'rgba(15,3,45,0.06)',
                    boxShadow: '0 4px 12px rgba(15,3,45,0.06)',
                  }}
                >
                  {items.map(({ label, icon: Icon, onClick }, index) => (
                    <ButtonBase
                      key={label}
                      type="button"
                      onClick={onClick}
                      sx={{
                        width: '100%',
                        minHeight: 39,
                        px: 1.4,
                        display: 'flex',
                        justifyContent: 'flex-start',
                        gap: 1.3,
                        color: 'text.primary',
                        '&:hover': { bgcolor: 'action.hover' },
                        ...(index < items.length - 1 ? { borderBottom: '1px solid', borderColor: 'divider' } : {}),
                      }}
                    >
                      <Icon size={16} strokeWidth={1.8} />
                      <Typography sx={{ flex: 1, textAlign: 'left', fontSize: 12, fontWeight: 500 }}>{label}</Typography>
                      <ChevronRight size={16} />
                    </ButtonBase>
                  ))}
                </Paper>
              </Box>
            ))}

            <Box component="section">
              <Typography sx={{ mb: 0.7, ml: 0.6, color: 'text.secondary', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Appearance
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 0.7, borderRadius: 2.2, borderColor: 'rgba(15,3,45,0.06)', boxShadow: '0 4px 12px rgba(15,3,45,0.06)' }}
              >
                <Stack direction="row" sx={{ p: 0.35, borderRadius: 1.6, bgcolor: 'action.hover' }}>
                  <Button
                    fullWidth
                    startIcon={<Sun size={14} />}
                    aria-pressed={mode !== 'dark'}
                    onClick={() => setMode('light')}
                    sx={{
                      minHeight: 34,
                      borderRadius: 1.2,
                      color: 'text.primary',
                      bgcolor: mode !== 'dark' ? '#C8F36A' : 'transparent',
                      fontSize: 10,
                      fontWeight: 700,
                      '&:hover': { bgcolor: mode !== 'dark' ? '#C8F36A' : 'action.selected' },
                    }}
                  >
                    Light
                  </Button>
                  <Button
                    fullWidth
                    startIcon={<Moon size={14} />}
                    aria-pressed={mode === 'dark'}
                    onClick={() => setMode('dark')}
                    sx={{
                      minHeight: 34,
                      borderRadius: 1.2,
                      color: 'text.primary',
                      bgcolor: mode === 'dark' ? '#C8F36A' : 'transparent',
                      fontSize: 10,
                      fontWeight: 700,
                      '&:hover': { bgcolor: mode === 'dark' ? '#C8F36A' : 'action.selected' },
                    }}
                  >
                    Dark
                  </Button>
                </Stack>
              </Paper>
            </Box>

            <Button
              fullWidth
              startIcon={<LogOut size={16} />}
              onClick={onLogout}
              sx={{
                minHeight: 42,
                borderRadius: 999,
                bgcolor: 'rgba(255,80,80,0.12)',
                color: '#D52222',
                fontSize: 11,
                fontWeight: 800,
                '&:hover': { bgcolor: 'rgba(255,80,80,0.2)' },
              }}
            >
              Logout
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
