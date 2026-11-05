import { Badge, Box, ButtonBase, Typography } from '@mui/material'
import type { LucideIcon } from 'lucide-react'

export type QuickActionId = 'invoice' | 'customer' | 'membership' | 'appointment' | 'notification'

export type QuickActionCardProps = {
  id: QuickActionId
  label: string
  icon: LucideIcon
  onClick: () => void
  disabled?: boolean
  badge?: number
}

// Figma: Create Invoice = lime #CDF27E, every other action = white. 20px radius, 88px tall.
const LIME = '#CDF27E'
const INK = '#0F032D'

export function QuickActionGrid({ actions }: { actions: QuickActionCardProps[] }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${actions.length}, minmax(0,1fr))`, gap: 0.8 }}>
      {actions.map(({ id, label, icon: Icon, onClick, disabled, badge }) => (
        <ButtonBase
          key={id}
          type="button"
          aria-label={badge ? `${label}, ${badge} new ${badge === 1 ? 'appointment' : 'appointments'}` : label}
          onClick={onClick}
          disabled={disabled}
          sx={{
            minWidth: 0,
            height: 88,
            minHeight: 88,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: id === 'invoice' ? LIME : '#FFFFFF',
            borderRadius: '20px',
            p: 0.5,
            textAlign: 'center',
            transition: 'filter 150ms ease, transform 150ms ease',
            '&:hover': {
              filter: 'brightness(0.96)',
            },
            '&:active': { transform: 'scale(0.97)' },
            '&.Mui-focusVisible': { outline: '2px solid var(--mui-palette-primary-main)', outlineOffset: 2 },
            // Keep the Figma colours readable while the backend is still loading a business
            '&.Mui-disabled': { opacity: 0.7 },
          }}
        >
          <Box sx={{ mx: 'auto', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK, mb: 0.35 }}>
            <Badge
              badgeContent={badge}
              color="error"
              max={99}
              invisible={!badge}
              sx={{ '& .MuiBadge-badge': { fontSize: 9, fontWeight: 800, minWidth: 16, height: 16, px: 0.4 } }}
            >
              <Icon size={20} />
            </Badge>
          </Box>
          <Typography sx={{ fontWeight: 400, color: INK, fontSize: 12, lineHeight: 1.1, maxWidth: 64 }}>{label}</Typography>
        </ButtonBase>
      ))}
    </Box>
  )
}