import { alpha, Card, CardContent, Stack, Typography, useTheme } from '@mui/material'

export type MetricTone = 'green' | 'blue' | 'purple' | 'amber' | 'pink'

type MetricCardProps = {
  label: string
  value: number | string
  tone?: MetricTone
}

export function MetricCard({ label, value, tone = 'blue' }: MetricCardProps) {
  const theme = useTheme()

  const toneMap: Record<MetricTone, { bg: string; color: string; glow: string }> = {
    green: { bg: alpha(theme.palette.success.main, 0.12), color: theme.palette.success.dark, glow: alpha(theme.palette.success.main, 0.18) },
    blue: { bg: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.dark, glow: alpha(theme.palette.info.main, 0.16) },
    purple: { bg: alpha(theme.palette.secondary.main, 0.08), color: theme.palette.secondary.dark, glow: alpha(theme.palette.secondary.main, 0.14) },
    amber: { bg: alpha(theme.palette.warning.main, 0.12), color: theme.palette.warning.dark, glow: alpha(theme.palette.warning.main, 0.18) },
    pink: { bg: alpha(theme.palette.error.main, 0.08), color: theme.palette.error.dark, glow: alpha(theme.palette.error.main, 0.14) },
  }

  const palette = toneMap[tone]

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 1.25,
        background: '#ffffff',
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        borderLeft: `3px solid ${palette.color}`,
        minHeight: 106,
        boxShadow: '0 4px 12px rgba(25, 55, 49, 0.035)',
        transition: 'border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          borderColor: alpha(palette.color, 0.4),
          boxShadow: `0 8px 18px ${palette.glow}`,
        },
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack spacing={1}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.05, letterSpacing: 0 }}>
            {value}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
