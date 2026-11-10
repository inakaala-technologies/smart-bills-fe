import { Box, CircularProgress, LinearProgress, Typography } from '@mui/material'

type PageLoaderProps = {
  label?: string
  fullScreen?: boolean
}

export function PageLoader({ label = 'Loading…', fullScreen = false }: PageLoaderProps) {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.4,
        minHeight: fullScreen ? '100dvh' : 220,
        width: '100%',
        ...(fullScreen ? { position: 'fixed', inset: 0, zIndex: 1250, bgcolor: 'background.default' } : {}),
      }}
    >
      <CircularProgress size={38} thickness={4.4} />
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650 }}>{label}</Typography>
    </Box>
  )
}

export function TopProgressBar({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <LinearProgress
      aria-label="Loading"
      sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1600, height: 3, bgcolor: 'transparent' }}
    />
  )
}
