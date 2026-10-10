import { alpha, Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'

type DashboardListRowProps = {
  title: string
  subtitle?: string
  leading?: ReactNode
  trailing?: ReactNode
  accent?: string
}

export function DashboardListRow({ title, subtitle, leading, trailing, accent }: DashboardListRowProps) {
  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.2,
        py: 1,
        px: 0.9,
        borderRadius: 1.25,
        background: accent ?? theme.palette.common.white,
        border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
      })}
    >
      {leading}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={(theme) => ({ fontWeight: 800, color: theme.palette.text.primary, lineHeight: 1.35, letterSpacing: 0 })}>{title}</Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.18, fontWeight: 700 }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {trailing && (
        <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {trailing}
        </Box>
      )}
    </Box>
  )
}
