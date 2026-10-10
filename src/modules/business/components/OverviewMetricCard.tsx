import { Box, Typography } from '@mui/material'
import type { LucideIcon } from 'lucide-react'

export type OverviewMetricCardProps = {
  label: string
  value: string
  count?: number | string
  icon?: LucideIcon
  tone?: 'green' | 'blue' | 'purple' | 'amber'
}

export function OverviewMetricCard({ label, value, count, icon: Icon, tone = 'green' }: OverviewMetricCardProps) {
  const toneMap = {
    green: { color: 'success.dark', bg: 'success.light' },
    blue: { color: 'info.dark', bg: 'info.light' },
    purple: { color: 'secondary.dark', bg: 'secondary.light' },
    amber: { color: 'warning.dark', bg: 'warning.light' },
  }
  const iconColor = toneMap[tone]?.color ?? 'success.dark'
  const iconBg = toneMap[tone]?.bg ?? 'success.light'

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        borderRadius: '20px',
        py: 1.4,
        px: 0.8,
        minHeight: 98,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
        border: '1px solid var(--mui-palette-divider)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.18)',
        },
      }}
    >
      {Icon && (
        <Box sx={{ position: 'relative', mb: 1.1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              backgroundColor: iconBg,
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={20} strokeWidth={2.2} />
          </Box>

          {count !== undefined && (
            <Box
              sx={{
                position: 'absolute',
                top: -5,
                right: -6,
                minWidth: 18,
                height: 18,
                borderRadius: '999px',
                background: '#f97316',
                color: '#ffffff',
                border: '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.4,
                boxShadow: '0 2px 4px rgba(249, 115, 22, 0.3)',
              }}
            >
              <Typography sx={{ fontSize: '10px', fontWeight: 800, lineHeight: 1 }}>
                {count}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <Typography
        sx={{
          fontWeight: 800,
          color: 'text.primary',
          fontSize: '14px',
          lineHeight: 1.2,
          mb: 0.3,
          textAlign: 'center',
        }}
      >
        {value}
      </Typography>

      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: 'text.secondary',
          fontSize: '11px',
          textAlign: 'center',
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}
