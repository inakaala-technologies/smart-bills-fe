import { Avatar, Box, IconButton, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { NotificationBell } from './NotificationBell'
import { ThemeModeToggle } from './ThemeModeToggle'
import type { AuthUser } from '../services/auth'

type AppHeaderProps = {
  authUser: Pick<AuthUser, 'name' | 'email' | 'profilePictureUrl'> | null
  contextLabel: string
  roleLabel: string
  menuId: string
  isMenuOpen: boolean
  showWorkspaceContext?: boolean
  onOpenMenu: (event: MouseEvent<HTMLElement>) => void
}

export function AppHeader({ authUser, contextLabel, roleLabel, menuId, isMenuOpen, showWorkspaceContext = true, onOpenMenu }: AppHeaderProps) {
  const initials = (authUser?.name ?? 'User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
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


  return (
    <Box sx={{
      px: 2.1,
      pt: 2.6,
      pb: 1.6,
      color: '#ffffff',
      background: 'linear-gradient(180deg, #C39AF3 0%, #905BF4 42%, #4E2BCC 100%)',
      borderRadius: { xs: 0, sm: '24px 24px 0 0' },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 17, fontWeight: 500, lineHeight: 1.2 }}>{greeting}</Typography>
          <Typography variant="h6" sx={{ fontSize: 27, fontWeight: 500, lineHeight: 1.15, color: '#ffffff' }}>{authUser?.name ?? 'User'}</Typography>
          {showWorkspaceContext && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.65, minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ color: 'rgba(255,255,255,0.94)', fontWeight: 700, maxWidth: '58%' }}>
                {contextLabel}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>•</Typography>
              <Typography variant="body2" noWrap sx={{ color: 'rgba(255,255,255,0.78)', fontWeight: 500 }}>{roleLabel}</Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.55, flexShrink: 0 }}>
          <ThemeModeToggle contrast />
          <NotificationBell contrast prominent />
          <IconButton
            aria-label="Open menu"
            aria-controls={isMenuOpen ? menuId : undefined}
            aria-haspopup="true"
            aria-expanded={isMenuOpen ? 'true' : undefined}
            onClick={onOpenMenu}
            sx={{ width: 54, height: 54, p: 0, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.16)', outline: isMenuOpen ? '2px solid rgba(255,255,255,0.7)' : 'none', '&:hover': { backgroundColor: 'rgba(255,255,255,0.26)' } }}
          >
            <Avatar
              src={authUser?.profilePictureUrl || undefined}
              alt={authUser?.name ? `${authUser.name} profile picture` : 'Profile picture'}
              sx={{ width: 48, height: 48, bgcolor: 'secondary.main', color: '#ffffff', fontSize: 16, fontWeight: 800 }}
            >
              {initials || 'U'}
            </Avatar>
          </IconButton>
        </Box>
      </Box>
    </Box>
  )
}