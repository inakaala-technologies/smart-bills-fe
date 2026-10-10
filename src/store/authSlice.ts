import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { getCurrentUser, type AuthUser, type Role } from '../services/auth'

type LoginForm = {
  email: string
  password: string
}

type SignupForm = {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  role: Role
}

type AuthState = {
  authUser: AuthUser | null
  authError: string
  loginForm: LoginForm
  signupForm: SignupForm
}

const initialState: AuthState = {
  authUser: getCurrentUser(),
  authError: '',
  loginForm: { email: '', password: '' },
  signupForm: { name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'BUSINESS' },
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthUser: (state, action: PayloadAction<AuthUser | null>) => {
      state.authUser = action.payload
    },
    setAuthError: (state, action: PayloadAction<string>) => {
      state.authError = action.payload
    },
    clearAuthError: (state) => {
      state.authError = ''
    },
    setLoginForm: (state, action: PayloadAction<{ field: 'email' | 'password'; value: string }>) => {
      const { field, value } = action.payload
      state.loginForm[field] = value
    },
    setSignupForm: (state, action: PayloadAction<{ field: 'name' | 'email' | 'phone' | 'password' | 'confirmPassword'; value: string }>) => {
      const { field, value } = action.payload
      state.signupForm[field] = value
    },
    resetAuthForms: (state) => {
      state.loginForm = { email: '', password: '' }
      state.signupForm = { name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'BUSINESS' }
      state.authError = ''
    },
  },
})

export const {
  setAuthUser,
  setAuthError,
  clearAuthError,
  setLoginForm,
  setSignupForm,
  resetAuthForms,
} = authSlice.actions

export default authSlice.reducer
