import { Box, Typography } from '@mui/material'

type RecentActivityItemProps = {
  title: string
  subtitle: string
  amount: string
  badge?: string
  date?: string
  time?: string
  accent?: string
  onClick?: () => void
}

export function RecentActivityItem({
  title,
  subtitle,
  amount,
  badge,
  date,
  time,
  accent = 'var(--mui-palette-primary-main)',
  onClick,
}: RecentActivityItemProps) {
  const displayBadge = badge?.trim() || 'B'

  return (
    <Box
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `View details for ${title}` : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      } : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.1,
        px: 1,
        py: 1,
        borderRadius: 1.25,
        backgroundColor: 'background.paper',
        border: '1px solid var(--mui-palette-divider)',
        ...(onClick && {
          cursor: 'pointer',
          '&:hover': { borderColor: 'primary.main', backgroundColor: 'action.hover' },
          '&:focus-visible': { outline: '2px solid var(--mui-palette-primary-main)', outlineOffset: 2 },
        }),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, minWidth: 0, flex: 1 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 1.1,
            background: accent,
            color: 'common.white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 14,
            flexShrink: 0,
            boxShadow: 'none',
          }}
        >
          {displayBadge}
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.92rem',
              lineHeight: 1.3,
              letterSpacing: 0,
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>

          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.45, mt: 0.15, fontWeight: 700 }}>
            {subtitle}
          </Typography>

          {(date || time) && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary', fontWeight: 700 }}>
              {date} {time ? `• ${time}` : ''}
            </Typography>
          )}
        </Box>
      </Box>

      <Typography sx={{ fontWeight: 800, color: 'text.primary', whiteSpace: 'nowrap', fontSize: '0.95rem', letterSpacing: 0 }}>
        {amount}
      </Typography>
    </Box>
  )
}
