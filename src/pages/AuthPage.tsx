import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material'
import { ArrowRight, Building2, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LocationPicker, type LocationValue } from '../components/LocationPicker'
import { ThemeModeToggle } from '../components/ThemeModeToggle'
import { loginUser, signUpUser, type Role } from '../services/auth'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import type { RootState } from '../store/store'
import { clearAuthError, resetAuthForms, setAuthError, setAuthUser, setLoginForm, setSignupForm } from '../store/authSlice'

export function AuthPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const authState = useAppSelector((state: RootState) => state.auth)
  const { loginForm, signupForm, authError } = authState
  const [signupRole, setSignupRole] = useState<Role | null>(null)
  const [isSignupFlowActive, setIsSignupFlowActive] = useState(false)
  const [signupLocation, setSignupLocation] = useState<LocationValue>({ locationAddress: '', latitude: null, longitude: null })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)

  const updateLoginForm = (field: 'email' | 'password', value: string) => {
    dispatch(setLoginForm({ field, value }))
  }

  const updateSignupForm = (field: 'name' | 'email' | 'phone' | 'password' | 'confirmPassword', value: string) => {
    dispatch(setSignupForm({ field, value }))
  }

  const handleLogin = async () => {
    const email = loginForm.email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !loginForm.password) {
      dispatch(setAuthError('Enter a valid email address and password.'))
      return
    }
    if (submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    try {
      const result = await loginUser({ ...loginForm, email })

      if (!result.ok || !result.user) {
        dispatch(setAuthError(result.message ?? 'Login failed.'))
        return
      }

      dispatch(clearAuthError())
      dispatch(setAuthUser(result.user))
      dispatch(resetAuthForms())
      navigate('/dashboard')
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const handleSignup = async () => {
    if (submittingRef.current) return
    if (!signupRole) {
      dispatch(setAuthError('Please choose a role before creating your account.'))
      return
    }

    submittingRef.current = true
    setIsSubmitting(true)
    try {
      const result = await signUpUser({ ...signupForm, ...signupLocation, role: signupRole })

      if (!result.ok || !result.user) {
        dispatch(setAuthError(result.message ?? 'Sign up failed.'))
        return
      }

      dispatch(clearAuthError())
      dispatch(setAuthUser(result.user))
      dispatch(resetAuthForms())
      navigate('/dashboard')
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const startSignupFlow = () => {
    dispatch(clearAuthError())
    setSignupRole(null)
    setSignupLocation({ locationAddress: '', latitude: null, longitude: null })
    setIsSignupFlowActive(true)
  }

  const onBack = () => {
    dispatch(clearAuthError())
    dispatch(resetAuthForms())
    setSignupRole(null)
    setIsSignupFlowActive(false)
    navigate('/')
  }
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 }, minHeight: '100dvh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={0} sx={(theme) => ({ width: '100%', maxWidth: 420, mx: 'auto', borderRadius: 2.5, border: `1px solid ${theme.palette.divider}`, backgroundColor: 'background.paper', overflow: 'hidden', boxShadow: '0 18px 46px rgba(0, 0, 0, 0.18)' })}>
        <Box sx={{ px: { xs: 2.25, sm: 3 }, py: { xs: 2.25, sm: 3 }, backgroundColor: 'action.hover', borderBottom: '1px solid var(--mui-palette-divider)' }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Box sx={(theme) => ({ width: 36, height: 36, borderRadius: 1.2, background: theme.palette.primary.main, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.palette.common.white })}>
                  <Building2 size={18} />
                </Box>
                <Typography variant="h6" sx={(theme) => ({ fontWeight: 800, letterSpacing: 0, color: theme.palette.text.primary })}>BHive</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ThemeModeToggle />
                <Button variant="text" onClick={onBack} sx={(theme) => ({ minWidth: 0, color: theme.palette.text.primary, fontWeight: 700 })}>Back</Button>
              </Box>
            </Box>

            <Box sx={{ pt: 0.8 }}>
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.1em' }}>{isSignupFlowActive ? 'ACCOUNT SETUP' : 'ACCOUNT ACCESS'}</Typography>
              <Typography variant="h4" sx={(theme) => ({ mt: 0.2, fontWeight: 800, letterSpacing: 0, color: theme.palette.text.primary, lineHeight: 1.12 })}>{isSignupFlowActive ? 'Create an account' : 'Welcome back'}</Typography>
            </Box>

            <Stack spacing={1.35}>
              <TextField
                fullWidth
                label="Mobile number or Email"
                type="email"
                required
                disabled={isSubmitting}
                slotProps={{ htmlInput: { maxLength: 254 } }}
                value={loginForm.email}
                onChange={(event) => updateLoginForm('email', event.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.25, backgroundColor: 'background.paper' } }}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                required
                disabled={isSubmitting}
                slotProps={{ htmlInput: { maxLength: 72 } }}
                value={loginForm.password}
                onChange={(event) => updateLoginForm('password', event.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.25, backgroundColor: 'background.paper' } }}
              />

              {authError ? <Alert severity="error" sx={{ borderRadius: 2 }}>{authError}</Alert> : null}

              <Button variant="contained" size="large" endIcon={<ArrowRight size={18} />} onClick={handleLogin} disabled={isSubmitting} sx={{ borderRadius: 1.25, textTransform: 'none', fontWeight: 700, py: 1.2 }}>
                Continue
              </Button>
            </Stack>

            <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', display: 'block' }}>
              Don’t have an account? <Box component="span" sx={(theme) => ({ color: theme.palette.primary.main, fontWeight: 700, cursor: 'pointer' })} onClick={startSignupFlow}>Sign Up</Box>
            </Typography>
          </Stack>
        </Box>

        {isSignupFlowActive ? (
          <Box sx={{ px: { xs: 2.25, sm: 3 }, py: { xs: 2.25, sm: 3 }, backgroundColor: 'background.paper' }}>
            {!signupRole ? (
              <Stack spacing={1.6}>
                  <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0 }}>
                  Choose your account type
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => { setSignupLocation({ locationAddress: '', latitude: null, longitude: null }); setSignupRole('BUSINESS') }}
                  startIcon={<Building2 size={18} />}
                  sx={(theme) => ({ borderRadius: 1.25, borderColor: theme.palette.divider, color: theme.palette.text.primary, textTransform: 'none', fontWeight: 700, py: 1.25, justifyContent: 'flex-start' })}
                >
                  Business account
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => { setSignupLocation({ locationAddress: '', latitude: null, longitude: null }); setSignupRole('CUSTOMER') }}
                  startIcon={<UserRound size={18} />}
                  sx={(theme) => ({ borderRadius: 1.25, borderColor: theme.palette.divider, color: theme.palette.text.primary, textTransform: 'none', fontWeight: 700, py: 1.25, justifyContent: 'flex-start' })}
                >
                  Customer account
                </Button>
              </Stack>
            ) : (
              <Stack spacing={1.6}>
                  <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0 }}>
                  Create {signupRole === 'BUSINESS' ? 'Business' : 'Customer'} account
                </Typography>
                <TextField
                  fullWidth
                  label="Full name"
                  required
                  disabled={isSubmitting}
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                  value={signupForm.name}
                  onChange={(event) => updateSignupForm('name', event.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.25, backgroundColor: 'background.paper' } }}
                />
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  required
                  disabled={isSubmitting}
                  slotProps={{ htmlInput: { maxLength: 254 } }}
                  value={signupForm.email}
                  onChange={(event) => updateSignupForm('email', event.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.25, backgroundColor: 'background.paper' } }}
                />
                <TextField
                  fullWidth
                  label="Mobile number"
                  type="tel"
                  required
                  disabled={isSubmitting}
                  slotProps={{ htmlInput: { maxLength: 30 } }}
                  value={signupForm.phone}
                  onChange={(event) => updateSignupForm('phone', event.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.25, backgroundColor: 'background.paper' } }}
                />
                <LocationPicker value={signupLocation} onChange={setSignupLocation} />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  required
                  slotProps={{ htmlInput: { minLength: 6, maxLength: 72 } }}
                  disabled={isSubmitting}
                  value={signupForm.password}
                  onChange={(event) => updateSignupForm('password', event.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.25, backgroundColor: 'background.paper' } }}
                />
                <TextField
                  fullWidth
                  label="Confirm password"
                  type="password"
                  required
                  slotProps={{ htmlInput: { minLength: 6, maxLength: 72 } }}
                  disabled={isSubmitting}
                  value={signupForm.confirmPassword}
                  onChange={(event) => updateSignupForm('confirmPassword', event.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.25, backgroundColor: 'background.paper' } }}
                />
                {authError ? <Alert severity="error" sx={{ borderRadius: 2 }}>{authError}</Alert> : null}
                <Button variant="outlined" onClick={handleSignup} disabled={isSubmitting} sx={(theme) => ({ borderRadius: 1.25, borderColor: theme.palette.divider, color: theme.palette.text.primary, textTransform: 'none', fontWeight: 700, py: 1.15 })}>
                  {isSubmitting ? 'Creating account…' : 'Create account'}
                </Button>
              </Stack>
            )}
          </Box>
        ) : null}
      </Paper>
    </Container>
  )
}
