import { Box, ButtonBase, Typography } from '@mui/material'
import { useState } from 'react'

function formatCurrency(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

export function RevenueTrendChart({ points }: { points: Array<{ label: string; value: number }> }) {
  const chartPoints = points.map((point) => ({
    ...point,
    value: Number.isFinite(point.value) ? Math.max(point.value, 0) : 0,
  }))
  const maxValue = Math.max(...chartPoints.map((point) => point.value), 0)
  const peakIndex = chartPoints.reduce((bestIndex, point, index) => (
    point.value > chartPoints[bestIndex].value ? index : bestIndex
  ), 0)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const selectedIndex = activeIndex != null && activeIndex < chartPoints.length ? activeIndex : peakIndex

  if (!chartPoints.length || maxValue <= 0) {
    return <Box sx={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontWeight: 700 }}>No revenue data</Box>
  }

  return (
    <Box role="group" aria-label="Sales overview bar chart. Select a bar to view its value." sx={{ width: '100%', pt: 3.5 }}>
      <Box sx={{ height: 108, display: 'grid', gridTemplateColumns: `repeat(${chartPoints.length}, minmax(0, 1fr))`, alignItems: 'end', gap: 0.7 }}>
        {chartPoints.map((point, index) => (
          <ButtonBase
            key={`${point.label}-${index}`}
            type="button"
            aria-label={`${point.label}: ${formatCurrency(point.value)}`}
            aria-pressed={index === selectedIndex}
            onClick={() => setActiveIndex(index)}
            sx={{
              minWidth: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              borderRadius: 1.8,
              '&:hover .sales-bar': { filter: 'brightness(0.94)' },
              '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
            }}
          >
            <Box
              className="sales-bar"
              sx={{
                position: 'relative',
                width: '100%',
                height: `${point.value > 0 ? Math.max((point.value / maxValue) * 100, 18) : 0}%`,
                minHeight: point.value > 0 ? 20 : 0,
                borderRadius: 1.8,
                bgcolor: index === selectedIndex ? '#888888' : '#D9D9D9',
                transition: 'background-color 180ms ease, filter 180ms ease',
              }}
            >
              {index === selectedIndex && (
                <Box sx={{ position: 'absolute', bottom: 'calc(100% + 9px)', left: selectedIndex === 0 ? 0 : selectedIndex === chartPoints.length - 1 ? '100%' : '50%', transform: selectedIndex === 0 ? 'none' : selectedIndex === chartPoints.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)', px: 1.2, py: 0.65, borderRadius: '999px', bgcolor: '#8050D8', color: '#ffffff', whiteSpace: 'nowrap', fontSize: 10, lineHeight: 1.2, boxShadow: '0 6px 18px rgba(40, 25, 65, 0.18)' }}>
                  {formatCurrency(point.value)}
                </Box>
              )}
            </Box>
          </ButtonBase>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${chartPoints.length}, minmax(0, 1fr))`, gap: 0.7, mt: 0.7 }}>
        {chartPoints.map((point, index) => (
          <Typography key={`${point.label}-${index}-label`} noWrap sx={{ minWidth: 0, textAlign: 'center', color: index === selectedIndex ? 'primary.main' : 'text.primary', fontSize: 10, lineHeight: 1.2, fontWeight: index === selectedIndex ? 700 : 400 }}>
            {point.label}
          </Typography>
        ))}
      </Box>
    </Box>
  )
}
