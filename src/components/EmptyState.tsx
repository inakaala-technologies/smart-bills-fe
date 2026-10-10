import { alpha, Box, Button, Stack, Typography } from '@mui/material'
import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Box
      sx={(theme) => ({
        border: `1px dashed ${alpha(theme.palette.text.secondary, 0.35)}`,
        borderRadius: 1.25,
        background: theme.palette.action.hover,
        p: 2.25,
      })}
    >
      <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <Box
          sx={(theme) => ({
            width: 46,
            height: 46,
            borderRadius: 1.1,
            background: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.palette.text.primary,
          })}
        >
          <Inbox size={22} />
        </Box>
        <Typography variant="h6" sx={(theme) => ({ fontWeight: 700, color: theme.palette.text.primary })}>{title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360 }}>
          {description}
        </Typography>
        {actionLabel && onAction ? (
          <Button variant="contained" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Box>
  )
}
