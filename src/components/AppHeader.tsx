import { Avatar, Box, IconButton, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { User } from 'lucide-react'
import { NotificationBell } from './NotificationBell'
import { ThemeModeToggle } from './ThemeModeToggle'
import type { AuthUser } from '../services/auth'

/* Same gradient as the Search and Notifications headers */
const PAGE_HEADER_GRADIENT =
  'linear-gradient(180deg, #F1EBFC 0%, #CDBAF1 14%, #AE89F2 30%, #8C59F2 46%, #5B34D4 66%, #331A88 84%, #0F032D 100%)'

type AppHeaderProps = {
  authUser: Pick<AuthUser, 'name' | 'email' | 'profilePictureUrl'> | null
  contextLabel: string
  roleLabel: string
  menuId: string
  isMenuOpen: boolean
  showWorkspaceContext?: boolean
  /** When true the header has no background of its own, so a parent gradient shows through (Home screen). */
  transparent?: boolean
  /** Figma page-title header (e.g. Search): shows an icon + title on the left instead of the greeting. */
  pageTitle?: string
  pageIcon?: ReactNode
  /** Figma page header that draws its own long gradient + 35px bottom radius (Billing). Use with pageTitle and pageIcon. */
  pageGradient?: boolean
  onOpenMenu: (event: MouseEvent<HTMLElement>) => void
}

export function AppHeader({ authUser, contextLabel, roleLabel, menuId, isMenuOpen, showWorkspaceContext = true, transparent: transparentProp = false, pageTitle, pageIcon, pageGradient = false, onOpenMenu }: AppHeaderProps) {
  /* pageGradient uses the same compact look as `transparent` (no theme toggle, 44px avatar) but paints its own background */
  const transparent = transparentProp || pageGradient
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
      px: pageGradient ? '18px' : 2.2,
      pt: transparent ? 'calc(env(safe-area-inset-top, 0px) + 44px)' : 2.6,
      pb: pageGradient ? '24px' : transparent ? 0.5 : 1.6,
      color: '#ffffff',
      background: pageGradient
        ? PAGE_HEADER_GRADIENT
        : transparent
          ? 'none'
          : 'linear-gradient(180deg, #C39AF3 0%, #905BF4 42%, #4E2BCC 100%)',
      borderRadius: pageGradient ? '0 0 35px 35px' : transparent ? 0 : { xs: 0, sm: '24px 24px 0 0' },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        {pageTitle ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
            {pageIcon}
            <Typography component="h1" noWrap sx={{ fontSize: 28, fontWeight: 400, lineHeight: 1.15, color: '#ffffff' }}>
              {pageTitle}
            </Typography>
          </Box>
        ) : (
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', color: 'rgba(255,255,255,0.95)', fontSize: 16, fontWeight: transparent ? 300 : 500, lineHeight: 1.2 }}
          >
            {greeting}
          </Typography>
          <Typography
            variant="h6"
            sx={{ fontSize: transparent ? 24 : 27, fontWeight: transparent ? 400 : 500, lineHeight: 1.15, color: '#ffffff' }}
          >
            {authUser?.name ?? 'User'}
          </Typography>
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
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: transparent ? 1 : 0.55, flexShrink: 0 }}>
          {/* Figma Home header has no theme toggle (it lives under Profile > Appearance) */}
          {!transparent && <ThemeModeToggle contrast />}
          <NotificationBell contrast prominent />
          <IconButton
            aria-label="Open menu"
            aria-controls={isMenuOpen ? menuId : undefined}
            aria-haspopup="true"
            aria-expanded={isMenuOpen ? 'true' : undefined}
            onClick={onOpenMenu}
            sx={{
              width: transparent ? 44 : 54,
              height: transparent ? 44 : 54,
              p: 0,
              borderRadius: '50%',
              backgroundColor: transparent ? 'transparent' : 'rgba(255,255,255,0.16)',
              outline: isMenuOpen ? '2px solid rgba(255,255,255,0.7)' : 'none',
              '&:hover': { backgroundColor: transparent ? 'transparent' : 'rgba(255,255,255,0.26)' },
            }}
          >
            <Avatar
              src={authUser?.profilePictureUrl || undefined}
              alt={authUser?.name ? `${authUser.name} profile picture` : 'Profile picture'}
              sx={{
                width: transparent ? 44 : 48,
                height: transparent ? 44 : 48,
                bgcolor: transparent ? 'rgba(255,255,255,0.22)' : 'secondary.main',
                color: '#ffffff',
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              {/* Figma shows a photo; with no photo use a neutral person icon instead of "BU" initials */}
              {transparent ? <User size={22} strokeWidth={1.8} /> : initials || 'U'}
            </Avatar>
          </IconButton>
        </Box>
      </Box>
    </Box>
  )
}