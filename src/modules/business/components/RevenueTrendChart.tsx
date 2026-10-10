import { Box, useTheme } from '@mui/material'

export function RevenueTrendChart({ points }: { points: Array<{ label: string; value: number }> }) {
  const theme = useTheme()

  if (!points.length) {
    return <Box sx={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontWeight: 700 }}>No revenue data</Box>
  }

  const values = points.map((point) => point.value)
  const maxValue = Math.max(...values, 1)
  const minValue = Math.min(...values, 0)
  const range = maxValue - minValue || 1

  const chartPoints = points.map((point, index) => ({
    x: (index / Math.max(points.length - 1, 1)) * 100,
    y: 82 - ((point.value - minValue) / range) * 62,
  }))
  const coords = chartPoints.map(({ x, y }) => `${x},${y}`).join(' ')
  const areaCoords = `${coords} 100,90 0,90`

  return (
    <Box sx={{ height: 104, width: '100%' }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 82 }}>
        <defs>
          <linearGradient id="revenueLineGradient" x1="0" x2="1">
            <stop offset="0%" stopColor={theme.palette.primary.main} />
            <stop offset="100%" stopColor={theme.palette.success.main} />
          </linearGradient>
          <linearGradient id="revenueAreaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity="0.2" />
            <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[22, 48, 74].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e8efed" strokeWidth="0.8" />)}
        <polygon points={areaCoords} fill="url(#revenueAreaGradient)" />
        <polyline
          points={coords}
          fill="none"
          stroke="url(#revenueLineGradient)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {chartPoints.map(({ x, y }) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill="#ffffff" stroke={theme.palette.success.main} strokeWidth="1.4" />)}
      </svg>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.35, color: 'text.secondary', fontSize: 8, fontWeight: 600 }}>
        {points.map((point) => (
          <Box key={`${point.label}-${point.value}`} sx={{ minWidth: 0, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {point.label}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
