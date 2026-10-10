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
  onOpenMenu: (event: MouseEvent<HTMLElement>) => void
}

export function AppHeader({ authUser, contextLabel, roleLabel, menuId, isMenuOpen, onOpenMenu }: AppHeaderProps) {
  const initials = (authUser?.name ?? 'User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <Box sx={{ px: 2.1, pt: 2.1, pb: 1.2, background: 'linear-gradient(180deg, var(--mui-palette-background-paper) 0%, var(--mui-palette-background-default) 100%)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1.2 }}>Good morning,</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15, color: 'text.primary' }}>{authUser?.name ?? 'User'}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.65, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ color: 'primary.main', fontWeight: 700, maxWidth: '58%' }}>
              {contextLabel}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>•</Typography>
            <Typography variant="body2" noWrap sx={{ color: 'text.secondary', fontWeight: 500 }}>{roleLabel}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexShrink: 0 }}>
          <ThemeModeToggle />
          <NotificationBell />
          <IconButton
            aria-label="Open menu"
            aria-controls={isMenuOpen ? menuId : undefined}
            aria-haspopup="true"
            aria-expanded={isMenuOpen ? 'true' : undefined}
            onClick={onOpenMenu}
            sx={{ width: 38, height: 38, p: 0, outline: isMenuOpen ? '2px solid var(--mui-palette-primary-light)' : 'none' }}
          >
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'success.light', color: 'success.dark', fontSize: 13, fontWeight: 800 }}>
              {initials || 'U'}
            </Avatar>
          </IconButton>
        </Box>
      </Box>
    </Box>
  )
}