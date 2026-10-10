import { createTheme, type Shadows } from '@mui/material/styles'

export const bhivePalette = {
  mode: 'light' as const,
  primary: {
    main: '#087b65',
    light: '#e4f2ed',
    dark: '#075847',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#29464a',
    light: '#e7eef0',
    dark: '#183437',
    contrastText: '#ffffff',
  },
  success: {
    main: '#16836b',
    light: '#e1f3ec',
    dark: '#0f624f',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#ad741d',
    light: '#fbf0d8',
    dark: '#795014',
    contrastText: '#ffffff',
  },
  error: {
    main: '#bd514b',
    light: '#f9e8e5',
    dark: '#913c37',
    contrastText: '#ffffff',
  },
  info: {
    main: '#34788a',
    light: '#e5f0f3',
    dark: '#285d6b',
    contrastText: '#ffffff',
  },
  background: {
    default: '#f2f6f4',
    paper: '#ffffff',
  },
  text: {
    primary: '#203638',
    secondary: '#617477',
    disabled: '#94a3a1',
  },
  divider: 'rgba(32, 54, 56, 0.10)',
}

export const bhiveDarkPalette = {
  mode: 'dark' as const,
  primary: { main: '#69cba6', light: '#a3e4c8', dark: '#35a47b', contrastText: '#10251d' },
  secondary: { main: '#a6bdba', light: '#d1dfdc', dark: '#708b86', contrastText: '#14201e' },
  success: { main: '#61c99e', light: '#b0ead0', dark: '#32966e', contrastText: '#10251d' },
  warning: { main: '#e8b75e', light: '#f5d89e', dark: '#bd852c', contrastText: '#2b2110' },
  error: { main: '#e8867e', light: '#f3b6af', dark: '#bd5a52', contrastText: '#2b1514' },
  info: { main: '#79b9c7', light: '#b4dbe2', dark: '#4c8c9b', contrastText: '#122428' },
  background: { default: '#101917', paper: '#192320' },
  text: { primary: '#e7efec', secondary: '#a6b5b0', disabled: '#778781' },
  divider: 'rgba(220, 239, 231, 0.12)',
}

const bhiveShadows = Array.from({ length: 25 }, (_, index) =>
  index === 0 ? 'none' : '0 8px 20px rgba(25, 55, 49, 0.07)',
) as Shadows

export const bhiveTheme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: { palette: bhivePalette },
    dark: { palette: bhiveDarkPalette },
  },
  defaultColorScheme: 'light',
  shape: {
    borderRadius: 10,
  },
  spacing: 8,
  typography: {
    fontFamily: 'Inter, "Segoe UI", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.06em',
    },
    h2: {
      fontWeight: 800,
      letterSpacing: '-0.05em',
    },
    h3: {
      fontWeight: 800,
      letterSpacing: '-0.04em',
    },
    h4: {
      fontWeight: 800,
      letterSpacing: '-0.05em',
    },
    h5: {
      fontWeight: 800,
      letterSpacing: '-0.04em',
    },
    h6: {
      fontWeight: 800,
      letterSpacing: '-0.04em',
    },
    subtitle1: {
      fontWeight: 700,
    },
    subtitle2: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  shadows: bhiveShadows,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          colorScheme: 'light dark',
          '--app-bg-start': 'var(--mui-palette-background-default)',
          '--app-bg-end': 'var(--mui-palette-background-default)',
          '--surface-soft': 'var(--mui-palette-background-default)',
          '--surface-strong': 'var(--mui-palette-background-paper)',
          '--border-soft': 'var(--mui-palette-divider)',
          '--accent-ink': 'var(--mui-palette-text-primary)',
          '--accent-muted': 'var(--mui-palette-text-secondary)',
        },
        html: {
          scrollBehavior: 'smooth',
        },
        body: {
          margin: 0,
          minHeight: '100vh',
          backgroundColor: 'var(--mui-palette-background-default)',
          color: 'var(--mui-palette-text-primary)',
          fontFamily: 'Inter, "Segoe UI", sans-serif',
        },
        '#root': {
          minHeight: '100vh',
        },
        '*': {
          boxSizing: 'border-box',
        },
        a: {
          color: 'inherit',
          textDecoration: 'none',
        },
        img: {
          display: 'block',
          maxWidth: '100%',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          minHeight: 42,
          paddingInline: '1rem',
          fontWeight: 700,
          letterSpacing: 0,
          transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
          '&:focus-visible': {
            outline: '3px solid color-mix(in srgb, var(--mui-palette-primary-main) 28%, transparent)',
            outlineOffset: 2,
          },
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          backgroundColor: 'var(--mui-palette-primary-main)',
          '&:hover': {
            backgroundColor: 'var(--mui-palette-primary-dark)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--mui-palette-background-paper)',
          border: '1px solid var(--mui-palette-divider)',
          boxShadow: '0 8px 22px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'var(--mui-palette-background-paper)',
          border: '1px solid var(--mui-palette-divider)',
          borderRadius: 10,
          boxShadow: '0 5px 14px rgba(25, 55, 49, 0.035)',
          transition: 'border-color 160ms ease, box-shadow 160ms ease',
          '&:hover': {
            borderColor: 'var(--mui-palette-primary-main)',
            boxShadow: '0 8px 18px rgba(0, 0, 0, 0.18)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: 'var(--mui-palette-background-paper)',
            transition: 'border-color 160ms ease, box-shadow 160ms ease',
            '& fieldset': {
              borderColor: 'var(--mui-palette-divider)',
            },
            '&:hover fieldset': {
              borderColor: 'var(--mui-palette-primary-main)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'var(--mui-palette-primary-main)',
              borderWidth: 1.5,
            },
          },
          '& .MuiInputLabel-root': {
            color: 'var(--mui-palette-text-secondary)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 7,
          fontWeight: 700,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid currentColor',
        },
        message: {
          lineHeight: 1.4,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          border: '1px solid var(--mui-palette-divider)',
          boxShadow: '0 14px 34px rgba(0, 0, 0, 0.24)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: '1px solid var(--mui-palette-divider)',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.3)',
        },
      },
    },
  },
})
