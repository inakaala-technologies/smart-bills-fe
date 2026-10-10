import { CssBaseline, ThemeProvider } from '@mui/material'
import { useEffect, useRef } from 'react'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import { bhiveTheme } from './theme/theme'

function App() {
  const recentButtonClicks = useRef(new WeakMap<Element, number>())

  useEffect(() => {
    const guardDuplicateClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return
      const button = event.target.closest('button, [role="button"], input[type="button"], input[type="submit"]')
      if (!button) return

      const now = performance.now()
      const previousClick = recentButtonClicks.current.get(button)
      if (previousClick !== undefined && now - previousClick < 600) {
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }
      recentButtonClicks.current.set(button, now)
    }

    document.addEventListener('click', guardDuplicateClick, true)
    return () => document.removeEventListener('click', guardDuplicateClick, true)
  }, [])

  return (
    <ThemeProvider theme={bhiveTheme} defaultMode="light">
      <CssBaseline />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
