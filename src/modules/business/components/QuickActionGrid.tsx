import { Box, ButtonBase, Typography } from '@mui/material'
import type { LucideIcon } from 'lucide-react'

export type QuickActionId = 'invoice' | 'customer' | 'membership' | 'appointment' | 'notification'

export type QuickActionCardProps = {
  id: QuickActionId
  label: string
  icon: LucideIcon
  onClick: () => void
  disabled?: boolean
}

export function QuickActionGrid({ actions }: { actions: QuickActionCardProps[] }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 0.8 }}>
      {actions.map(({ id, label, icon: Icon, onClick, disabled }) => (
        <ButtonBase
          key={id}
          type="button"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          sx={{
            minWidth: 0,
            minHeight: 76,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--mui-palette-background-paper)',
            borderRadius: 1,
            p: 0.7,
            border: '1px solid var(--mui-palette-divider)',
            textAlign: 'center',
            transition: 'border-color 150ms ease, background-color 150ms ease, transform 150ms ease',
            '&:hover': {
              borderColor: 'var(--mui-palette-primary-main)',
              backgroundColor: 'color-mix(in srgb, var(--mui-palette-primary-main) 5%, var(--mui-palette-background-paper))',
            },
            '&:active': { transform: 'scale(0.97)' },
            '&.Mui-focusVisible': { outline: '2px solid var(--mui-palette-primary-main)', outlineOffset: 2 },
            '&.Mui-disabled': { opacity: 0.5 },
          }}
        >
          <Box sx={{ mx: 'auto', width: 31, height: 31, borderRadius: '50%', backgroundColor: 'color-mix(in srgb, var(--mui-palette-primary-main) 14%, var(--mui-palette-background-paper))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mui-palette-primary-main)', mb: 0.55 }}>
            <Icon size={16} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', fontSize: 10, lineHeight: 1.2 }}>{label}</Typography>
        </ButtonBase>
      ))}
    </Box>
  )
}
