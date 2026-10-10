import { Box, Typography } from '@mui/material'
import { BadgeCheck, Ellipsis, Home, ReceiptText, Users, type LucideIcon } from 'lucide-react'
import type { DashboardTab } from '../../types'

const roleNav: Array<{ key: DashboardTab; label: string; icon: LucideIcon }> = [
  { key: 'overview', label: 'Dashboard', icon: Home },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'memberships', label: 'Memberships', icon: BadgeCheck },
  { key: 'invoices', label: 'Billing', icon: ReceiptText },
  { key: 'profile', label: 'More', icon: Ellipsis },
]

export type BottomNavBarProps = {
  activeTab: DashboardTab
  onChangeTab: (tab: DashboardTab) => void
}

export function BottomNavBar({ activeTab, onChangeTab }: BottomNavBarProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'background.paper',
        borderTop: '1px solid var(--mui-palette-divider)',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        py: 1.2,
        px: 1,
        zIndex: 10,
      }}
    >
      {roleNav.map((tab) => {
        const isActive = activeTab === tab.key || (tab.key === 'profile' && !['overview', 'customers', 'memberships', 'invoices'].includes(activeTab))
        const Icon = tab.icon

        return (
          <Box
            key={tab.key}
            onClick={() => onChangeTab(tab.key)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.6,
              cursor: 'pointer',
              color: isActive ? 'primary.main' : 'text.secondary',
              transition: 'color 0.18s ease',
              py: 0.5,
            }}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.6 : 2}
              color={isActive ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-text-secondary)'}
            />
            <Typography
              variant="caption"
              sx={{
                fontWeight: isActive ? 800 : 600,
                fontSize: '11px',
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
  )
}
