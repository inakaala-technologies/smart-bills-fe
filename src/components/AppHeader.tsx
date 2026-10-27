import { Avatar, Box, IconButton, Typography } from '@mui/material'
import type { MouseEvent } from 'react'
import { NotificationBell } from './NotificationBell'
import { ThemeModeToggle } from './ThemeModeToggle'
import type { AuthUser } from '../services/auth'

type AppHeaderProps = {
  authUser: Pick<AuthUser, 'name' | 'email'> | null
  contextLabel: string
  roleLabel: string
  menuId: string
  isMenuOpen: boolean
  compact?: boolean
  onOpenMenu: (event: MouseEvent<HTMLElement>) => void
}

export function AppHeader({ authUser, contextLabel, roleLabel, menuId, isMenuOpen, compact = false, onOpenMenu }: AppHeaderProps) {
  const initials = (authUser?.name ?? 'User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <Box sx={{
      px: 2.1,
      pt: compact ? 2.6 : 2.1,
      pb: compact ? 1.6 : 1.8,
      color: '#ffffff',
      background: compact
        ? 'linear-gradient(180deg, #C39AF3 0%, #905BF4 42%, #4E2BCC 100%)'
        : 'linear-gradient(135deg, #0F032D 0%, #4E2BCC 72%, #905BF4 120%)',
      borderRadius: compact ? 0 : { xs: '0 0 24px 24px', sm: '0 0 24px 24px' },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: compact ? 17 : undefined, fontWeight: 500, lineHeight: 1.2 }}>Hello,</Typography>
          <Typography variant="h6" sx={{ fontSize: compact ? 27 : undefined, fontWeight: compact ? 500 : 800, lineHeight: 1.15, color: '#ffffff' }}>{authUser?.name ?? 'User'}</Typography>
          {!compact && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.65, minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ color: 'rgba(255,255,255,0.94)', fontWeight: 700, maxWidth: '58%' }}>
                {contextLabel}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>•</Typography>
              <Typography variant="body2" noWrap sx={{ color: 'rgba(255,255,255,0.78)', fontWeight: 500 }}>{roleLabel}</Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: compact ? 0.55 : 0.8, flexShrink: 0 }}>
          <ThemeModeToggle contrast />
          <NotificationBell contrast prominent={compact} />
          <IconButton
            aria-label="Open menu"
            aria-controls={isMenuOpen ? menuId : undefined}
            aria-haspopup="true"
            aria-expanded={isMenuOpen ? 'true' : undefined}
            onClick={onOpenMenu}
            sx={{ width: compact ? 54 : 40, height: compact ? 54 : 40, p: 0, borderRadius: '50%', backgroundColor: compact ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.18)', outline: isMenuOpen ? '2px solid rgba(255,255,255,0.7)' : 'none', '&:hover': { backgroundColor: 'rgba(255,255,255,0.26)' } }}
          >
            <Avatar sx={{ width: compact ? 48 : 34, height: compact ? 48 : 34, bgcolor: 'secondary.main', color: '#ffffff', fontSize: compact ? 16 : 13, fontWeight: 800 }}>
              {initials || 'U'}
            </Avatar>
          </IconButton>
        </Box>
      </Box>
    </Box>
  )
}