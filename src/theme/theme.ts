import { createTheme, type Shadows } from '@mui/material/styles'

export const bhivePalette = {
  mode: 'light' as const,
  primary: {
    main: '#4E2BCC',
    light: '#EFE8FF',
    dark: '#38209B',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#905BF4',
    light: '#F1E9FF',
    dark: '#7140CE',
    contrastText: '#ffffff',
  },
  success: {
    main: '#4E2BCC',
    light: '#EFE8FF',
    dark: '#38209B',
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
    default: '#EFEFEF',
    paper: '#ffffff',
  },
  text: {
    primary: '#0F032D',
    secondary: '#716A83',
    disabled: '#9B96A8',
  },
  divider: 'rgba(15, 3, 45, 0.10)',
}

export const bhiveDarkPalette = {
  mode: 'dark' as const,
  primary: { main: '#A783FF', light: '#D5C3FF', dark: '#4E2BCC', contrastText: '#0F032D' },
  secondary: { main: '#B99AFF', light: '#E0D2FF', dark: '#905BF4', contrastText: '#0F032D' },
  success: { main: '#A783FF', light: '#D5C3FF', dark: '#4E2BCC', contrastText: '#0F032D' },
  warning: { main: '#e8b75e', light: '#f5d89e', dark: '#bd852c', contrastText: '#2b2110' },
  error: { main: '#e8867e', light: '#f3b6af', dark: '#bd5a52', contrastText: '#2b1514' },
  info: { main: '#A783FF', light: '#D5C3FF', dark: '#4E2BCC', contrastText: '#0F032D' },
  background: { default: '#0F032D', paper: '#1B1243' },
  text: { primary: '#F7F3FF', secondary: '#C4B9DE', disabled: '#8E83A8' },
  divider: 'rgba(239, 239, 239, 0.12)',
}

const bhiveShadows = Array.from({ length: 25 }, (_, index) =>
  index === 0 ? 'none' : '0 8px 22px rgba(15, 3, 45, 0.07)',
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
          '--bhive-ink': '#0F032D',
          '--bhive-primary': '#4E2BCC',
          '--bhive-accent': '#905BF4',
          '--bhive-canvas': '#EFEFEF',
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
          borderRadius: 14,
          minHeight: 44,
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
          boxShadow: '0 8px 22px rgba(15, 3, 45, 0.06)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'var(--mui-palette-background-paper)',
          border: '1px solid var(--mui-palette-divider)',
          borderRadius: 18,
          boxShadow: '0 5px 18px rgba(15, 3, 45, 0.055)',
          transition: 'border-color 160ms ease, box-shadow 160ms ease',
          '&:hover': {
            borderColor: 'var(--mui-palette-primary-main)',
            boxShadow: '0 8px 22px rgba(15, 3, 45, 0.10)',
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
            borderRadius: 12,
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
          borderRadius: 14,
          border: '1px solid var(--mui-palette-divider)',
          boxShadow: '0 14px 34px rgba(0, 0, 0, 0.24)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          border: '1px solid var(--mui-palette-divider)',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.3)',
        },
      },
    },
  },
})
