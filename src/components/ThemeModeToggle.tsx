import { IconButton, Tooltip } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import { Moon, Sun } from 'lucide-react'

export function ThemeModeToggle({ contrast = false }: { contrast?: boolean }) {
  const { mode, setMode } = useColorScheme()
  const isDarkMode = mode === 'dark'
  const label = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={() => setMode(isDarkMode ? 'light' : 'dark')} sx={{ width: 38, height: 38, color: contrast ? '#ffffff' : 'primary.main', backgroundColor: contrast ? 'rgba(255,255,255,0.14)' : 'transparent', '&:hover': { backgroundColor: contrast ? 'rgba(255,255,255,0.24)' : 'action.hover' } }}>
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </IconButton>
    </Tooltip>
  )
}
