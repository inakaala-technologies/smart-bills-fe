import { Box, Stack, Typography } from '@mui/material'

export type ActivityPanelProps = {
  title: string
  entries: Array<{ label: string; detail: string; value: string; badge?: string }>
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
            <Box
              key={`${entry.label}-${idx}`}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.6,
                minWidth: 0,
                py: 0.35,
              }}
            >
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
                {(entry.badge ?? entry.label.slice(0, 2)).toUpperCase()}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap sx={{ fontWeight: 700, color: 'text.primary', fontSize: 10, lineHeight: 1.2 }}>
                  {entry.label}
                </Typography>
                <Typography noWrap sx={{ color: 'text.secondary', fontSize: 8.5, lineHeight: 1.2, mt: 0.2 }}>
                  {entry.detail}
                </Typography>
              </Box>
              <Typography noWrap sx={{ flexShrink: 0, fontWeight: 800, color: 'primary.main', fontSize: 8.5 }}>
                {entry.value}
              </Typography>
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography sx={{ color: 'text.secondary', fontSize: 9, lineHeight: 1.35 }}>{emptyTitle}. {emptyDescription}</Typography>
      )}
    </Box>
  )
}
