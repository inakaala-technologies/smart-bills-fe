import { Box, ButtonBase, Stack, Typography } from '@mui/material'

export type ActivityPanelProps = {
  title: string
  entries: Array<{ label: string; detail: string; value: string; badge?: string; onClick?: () => void; ariaLabel?: string }>
  emptyTitle: string
  emptyDescription: string
}

export function ActivityPanel({ title, entries, emptyTitle, emptyDescription }: ActivityPanelProps) {
  return (
    <Box sx={{ minWidth: 0, p: 1, borderRadius: 2, backgroundColor: 'background.paper', border: '1px solid var(--mui-palette-divider)', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.14)' }}>
      <Typography noWrap sx={{ fontWeight: 800, color: 'text.primary', fontSize: 11, lineHeight: 1.25, mb: 0.8 }}>
        {title}
      </Typography>

      {entries.length > 0 ? (
        <Stack spacing={0.65}>
          {entries.map((entry, idx) => (
            <Box key={`${entry.label}-${idx}`}>
              {entry.onClick ? (
                <ButtonBase
                  type="button"
                  onClick={entry.onClick}
                  aria-label={entry.ariaLabel ?? `View details for ${entry.label}`}
                  sx={{
                    width: '100%',
                    borderRadius: 1.2,
                    textAlign: 'left',
                    '&:hover': { backgroundColor: 'action.hover' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 1 },
                  }}
                >
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.6,
                    minWidth: 0,
                    width: '100%',
                    py: 0.35,
                  }}>
                    <ActivityBadge label={entry.badge ?? entry.label.slice(0, 2)} />
                    <ActivitySummary label={entry.label} detail={entry.detail} value={entry.value} />
                  </Box>
                </ButtonBase>
              ) : (
                <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.6,
                minWidth: 0,
                py: 0.35,
                }}>
                  <ActivityBadge label={entry.badge ?? entry.label.slice(0, 2)} />
                  <ActivitySummary label={entry.label} detail={entry.detail} value={entry.value} />
                </Box>
              )}
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography sx={{ color: 'text.secondary', fontSize: 9, lineHeight: 1.35 }}>{emptyTitle}. {emptyDescription}</Typography>
      )}
    </Box>
  )
}

function ActivityBadge({ label }: { label: string }) {
  return (
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: 'success.light',
        display: 'grid',
        placeItems: 'center',
        color: 'success.dark',
        fontWeight: 800,
        fontSize: 8,
        flexShrink: 0,
      }}
    >
      {label.toUpperCase()}
    </Box>
  )
}

function ActivitySummary({ label, detail, value }: { label: string; detail: string; value: string }) {
  return (
    <>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography noWrap sx={{ fontWeight: 700, color: 'text.primary', fontSize: 10, lineHeight: 1.2 }}>
          {label}
        </Typography>
        <Typography noWrap sx={{ color: 'text.secondary', fontSize: 8.5, lineHeight: 1.2, mt: 0.2 }}>
          {detail}
        </Typography>
      </Box>
      <Typography noWrap sx={{ flexShrink: 0, fontWeight: 800, color: 'primary.main', fontSize: 8.5 }}>
        {value}
      </Typography>
    </>
  )
}
