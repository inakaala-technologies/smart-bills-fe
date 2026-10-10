import type { SxProps, Theme } from '@mui/material/styles'

export const themeTokens = {
  canvas: 'var(--mui-palette-background-default)',
  surface: 'var(--mui-palette-background-paper)',
  surfaceMuted: 'var(--mui-palette-action-hover)',
  border: 'var(--mui-palette-divider)',
  text: 'var(--mui-palette-text-primary)',
  mutedText: 'var(--mui-palette-text-secondary)',
  primary: 'var(--mui-palette-primary-main)',
  onPrimary: 'var(--mui-palette-primary-contrastText)',
} as const

export const appStyles = {
  shell: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: { xs: 1.25, sm: 2, md: 3 },
    background: 'linear-gradient(135deg, var(--mui-palette-background-default) 0%, var(--mui-palette-background-paper) 100%)',
  } satisfies SxProps<Theme>,

  panel: {
    width: '100%',
    maxWidth: 390,
    mx: 'auto',
    borderRadius: 2,
    border: '1px solid var(--mui-palette-divider)',
    background: 'var(--mui-palette-background-paper)',
    overflow: 'hidden',
    boxShadow: '0 18px 44px rgba(0, 0, 0, 0.16)',
  } satisfies SxProps<Theme>,

  surfaceCard: {
    background: 'var(--mui-palette-background-paper)',
    border: '1px solid var(--mui-palette-divider)',
    borderRadius: 1.25,
    boxShadow: '0 5px 14px rgba(25, 55, 49, 0.04)',
  } satisfies SxProps<Theme>,

  input: {
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.25,
      backgroundColor: 'background.paper',
    },
  } satisfies SxProps<Theme>,

  primaryButton: {
    borderRadius: 1.25,
    backgroundColor: 'primary.main',
    color: 'common.white',
    textTransform: 'none',
    fontWeight: 700,
    py: 1.35,
    '&:hover': {
      backgroundColor: 'primary.dark',
    },
  } satisfies SxProps<Theme>,
}
