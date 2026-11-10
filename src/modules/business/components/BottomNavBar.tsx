import { Box, ButtonBase, Typography } from '@mui/material'
import { BadgeCheck, Home, ReceiptText, Search, Users, type LucideIcon } from 'lucide-react'
import type { DashboardTab } from '../../types'

const roleNav: Array<{ key: DashboardTab; label: string; icon: LucideIcon }> = [
  { key: 'overview', label: 'Home', icon: Home },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'memberships', label: 'Memberships', icon: BadgeCheck },
  { key: 'invoices', label: 'Billing', icon: ReceiptText },
  { key: 'search', label: 'Search', icon: Search },
]

export type BottomNavBarProps = {
  activeTab: DashboardTab
  membershipsEnabled: boolean
  onChangeTab: (tab: DashboardTab) => void
}

export function BottomNavBar({ activeTab, membershipsEnabled, onChangeTab }: BottomNavBarProps) {
  const visibleRoleNav = roleNav.filter((tab) => tab.key !== 'memberships' || membershipsEnabled)
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 'calc(10px + env(safe-area-inset-bottom))',
        left: 12,
        right: 12,
        height: 66,
        backgroundColor: 'background.paper',
        border: '1px solid var(--mui-palette-divider)',
        borderRadius: 999,
        boxShadow: '0 8px 24px rgba(15, 3, 45, 0.14)',
        display: 'flex',
        alignItems: 'center',
        gap: 0.6,
        p: 0.55,
        zIndex: 10,
      }}
    >
      {visibleRoleNav.map((tab) => {
        const isActive = activeTab === tab.key
        const Icon = tab.icon

        return (
          <ButtonBase
            key={tab.key}
            type="button"
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChangeTab(tab.key)}
            sx={{
              flex: isActive ? '1.55 1 0%' : '1 1 0%',
              minWidth: 0,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isActive ? 0.9 : 0,
              backgroundColor: isActive ? 'primary.main' : 'transparent',
              borderRadius: 999,
              transition: 'flex 260ms cubic-bezier(0.2, 0.8, 0.2, 1), background-color 180ms ease, color 180ms ease, box-shadow 180ms ease',
              color: isActive ? 'primary.contrastText' : 'text.secondary',
              boxShadow: isActive ? '0 5px 14px rgba(78, 43, 204, 0.18)' : 'none',
              '&:hover': { backgroundColor: isActive ? 'primary.dark' : 'rgba(78, 43, 204, 0.07)' },
              '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
              '&:active': { transform: 'scale(0.97)' },
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
          >
            <Icon
              size={21}
              aria-hidden="true"
              strokeWidth={isActive ? 2.6 : 2}
              color={isActive ? 'var(--mui-palette-primary-contrastText)' : 'var(--mui-palette-text-secondary)'}
            />
            <Typography
              variant="caption"
              sx={{
                maxWidth: isActive ? 92 : 0,
                overflow: 'hidden',
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'translateX(0)' : 'translateX(-5px)',
                whiteSpace: 'nowrap',
                fontWeight: 700,
                fontSize: 13,
                lineHeight: 1.1,
                letterSpacing: 0,
                transition: 'max-width 240ms ease, opacity 160ms ease, transform 220ms ease',
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              }}
              aria-hidden={!isActive}
            >
              {tab.label}
            </Typography>
          </ButtonBase>
        )
      })}
    </Box>
  )
}
