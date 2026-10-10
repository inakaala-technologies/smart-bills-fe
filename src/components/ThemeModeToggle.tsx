import { IconButton, Tooltip } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import { Moon, Sun } from 'lucide-react'

export function ThemeModeToggle() {
  const { mode, setMode } = useColorScheme()
  const isDarkMode = mode === 'dark'
  const label = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={() => setMode(isDarkMode ? 'light' : 'dark')} sx={{ width: 38, height: 38, color: 'text.secondary' }}>
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </IconButton>
    </Tooltip>
  )
}
