import { apiClient, getErrorMessage } from './api/httpClient'

export type Role = 'ADMIN' | 'BUSINESS' | 'CUSTOMER'

export type LinkedAccount = {
  role: Role
  tenantId?: number
  businessId?: number
  status?: string
}

export type AuthUser = {
  id: string
  name: string
  email: string
  phone?: string
  accessToken: string
  role: Role
  activeRole?: Role
  tenantId?: number
  businessId?: number
  accounts?: LinkedAccount[]
  createdAt: string
}

const SESSION_KEY = 'bhive_session'

export function getCurrentUser(): AuthUser | null {
  localStorage.removeItem(SESSION_KEY)
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    const session = JSON.parse(raw) as Partial<AuthUser>
    if (!session.accessToken || typeof session.accessToken !== 'string') {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return session as AuthUser
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getCurrentUser()?.accessToken)
}

export function logoutUser(): void {
  sessionStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(SESSION_KEY)
  void apiClient.post('/api/v1/auth/logout', {}).catch(() => undefined)
}

async function callApi<T>(path: string, payload?: Record<string, unknown>, method?: 'GET' | 'POST' | 'PUT'): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const response = await apiClient.request<T>({
      url: path,
      method: method ?? (payload ? 'POST' : 'GET'),
      data: payload,
    })
    return { ok: true, data: response.data }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Network error.') }
  }
}

export function switchAccount(accountRole: Role): AuthUser | null {
  const current = getCurrentUser()
  if (!current) return null

  const existingRoles = new Set((current.accounts ?? []).map((account) => account.role).concat(current.role))
  if (accountRole === 'BUSINESS' && existingRoles.has('BUSINESS') && !current.accounts?.some((account) => account.role === 'BUSINESS')) {
    const fallback: AuthUser = { ...current, role: 'BUSINESS', activeRole: 'BUSINESS' }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(fallback))
    return fallback
  }
  if (accountRole === 'CUSTOMER' && existingRoles.has('CUSTOMER') && !current.accounts?.some((account) => account.role === 'CUSTOMER')) {
    const fallback: AuthUser = { ...current, role: 'CUSTOMER', activeRole: 'CUSTOMER' }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(fallback))
    return fallback
  }

  const matchingAccount = (current.accounts ?? []).find((account) => account.role === accountRole)
  if (!matchingAccount) {
    return null
  }

  const updatedUser: AuthUser = {
    ...current,
    role: accountRole,
    activeRole: accountRole,
    tenantId: Number(matchingAccount.tenantId ?? current.tenantId ?? 1),
    businessId: matchingAccount.businessId ? Number(matchingAccount.businessId) : current.businessId,
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser))
  return updatedUser
}

export function addProfile(accountRole: Role): AuthUser | null {
  const current = getCurrentUser()
  if (!current) return null

  const existingRoles = new Set((current.accounts ?? []).map((account) => account.role).concat(current.role))
  if (existingRoles.has(accountRole)) {
    return current
  }
  return null
}

export async function signUpUser(input: { name: string; email: string; phone?: string; password: string; confirmPassword: string; role: Role; locationAddress: string; latitude: number | null; longitude: number | null; country?: string; region?: string; city?: string }) {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const phone = input.phone?.trim() ?? ''
  const password = input.password

  if (!name || !email || !password || !input.country?.trim() || !input.region?.trim() || !input.city?.trim()) {
    return { ok: false, message: 'Name, email, password, country, state or region, and city or town are required.' }
  }

  if (name.length > 120 || email.length > 254 || phone.length > 30
    || input.country.trim().length > 80 || input.region.trim().length > 80 || input.city.trim().length > 80) {
    return { ok: false, message: 'One or more fields exceed the allowed length.' }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Please enter a valid email address.' }
  }

  if (password.length < 6 || new TextEncoder().encode(password).length > 72) {
    return { ok: false, message: 'Password must be between 6 and 72 UTF-8 bytes.' }
  }

  if (input.role === 'ADMIN') {
    return { ok: false, message: 'Administrator accounts cannot be created through public registration.' }
  }

  const coordinatesAreValid = (input.latitude === null && input.longitude === null)
    || (typeof input.latitude === 'number' && Number.isFinite(input.latitude) && Math.abs(input.latitude) <= 90
      && typeof input.longitude === 'number' && Number.isFinite(input.longitude) && Math.abs(input.longitude) <= 180)
  if (!coordinatesAreValid) {
    return { ok: false, message: 'Location coordinates are invalid.' }
  }

  if (password !== input.confirmPassword) {
    return { ok: false, message: 'Passwords do not match.' }
  }

  const apiResult = await callApi<{ id?: number | string; name?: string; email?: string; phone?: string; role?: Role; activeRole?: Role; tenantId?: number; businessId?: number; accessToken?: string; accounts?: Array<{ role?: Role; tenantId?: number; businessId?: number; status?: string }>; message?: string }>('/api/v1/auth/register', {
    name,
    email,
    phone,
    locationAddress: [input.city.trim(), input.region.trim(), input.country.trim()].join(', '),
    country: input.country.trim(),
    region: input.region.trim(),
    city: input.city.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    password,
    role: input.role,
  })

  if (!apiResult.ok || !apiResult.data) {
    return { ok: false, message: apiResult.message ?? 'Registration failed.' }
  }

  const responseData = apiResult.data
  if (!responseData.accessToken) {
    return { ok: false, message: 'The server did not return an access token. Please try again.' }
  }
  const fallbackAccounts = [{ role: input.role, tenantId: Number(responseData.tenantId ?? 1), businessId: Number(responseData.businessId ?? 0) || undefined, status: 'ACTIVE' }]
  const user: AuthUser = {
    id: String(responseData.id ?? '1'),
    name: responseData.name ?? name,
    email: responseData.email ?? email,
    phone: responseData.phone ?? (phone || undefined),
    accessToken: responseData.accessToken,
    role: responseData.role ?? input.role,
    activeRole: responseData.activeRole ?? (responseData.role ?? input.role),
    tenantId: Number(responseData.tenantId ?? 1),
    businessId: Number(responseData.businessId ?? 0) || undefined,
    accounts: (responseData.accounts?.length ? responseData.accounts : fallbackAccounts).map((account) => ({
      role: account.role ?? input.role,
      tenantId: account.tenantId ?? Number(responseData.tenantId ?? 1),
      businessId: (account.businessId ?? Number(responseData.businessId ?? 0)) || undefined,
      status: account.status ?? 'ACTIVE',
    })),
    createdAt: new Date().toISOString(),
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  return { ok: true, user }
}

export async function getCurrentUserProfile(): Promise<AuthUser | null> {
  const requestedSession = getCurrentUser()
  const apiResult = await callApi<{ id?: number | string; name?: string; email?: string; phone?: string; role?: Role; activeRole?: Role; tenantId?: number; businessId?: number; accessToken?: string; accounts?: Array<{ role?: Role; tenantId?: number; businessId?: number; status?: string }>; message?: string }>('/api/v1/auth/me')

  if (!apiResult.ok || !apiResult.data) {
    return null
  }

  const currentSession = getCurrentUser()
  if (requestedSession?.id !== currentSession?.id || requestedSession?.email !== currentSession?.email) {
    return currentSession
  }

  const responseData = apiResult.data
  const fallbackAccounts = [{ role: responseData.role ?? 'BUSINESS', tenantId: Number(responseData.tenantId ?? 1), businessId: Number(responseData.businessId ?? 0) || undefined, status: 'ACTIVE' }]
  const user: AuthUser = {
    id: String(responseData.id ?? '1'),
    name: responseData.name ?? 'User',
    email: responseData.email ?? '',
    phone: responseData.phone ?? undefined,
    accessToken: responseData.accessToken ?? requestedSession?.accessToken ?? '',
    role: responseData.role ?? 'BUSINESS',
    activeRole: responseData.activeRole ?? (responseData.role ?? 'BUSINESS'),
    tenantId: Number(responseData.tenantId ?? 1),
    businessId: Number(responseData.businessId ?? 0) || undefined,
    accounts: (responseData.accounts?.length ? responseData.accounts : fallbackAccounts).map((account) => ({
      role: account.role ?? 'BUSINESS',
      tenantId: account.tenantId ?? Number(responseData.tenantId ?? 1),
      businessId: (account.businessId ?? Number(responseData.businessId ?? 0)) || undefined,
      status: account.status ?? 'ACTIVE',
    })),
    createdAt: new Date().toISOString(),
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  return user
}

export async function updateCurrentUserProfile(input: {
  name: string
  phone: string
  location: {
    country?: string
    region?: string
    city?: string
    latitude: number | null
    longitude: number | null
  }
}) {
  const name = input.name.trim()
  const phone = input.phone.trim()
  const requestedSession = getCurrentUser()

  if (!name) {
    return { ok: false, message: 'Name is required.' }
  }
  if (name.length > 120 || phone.length > 30) {
    return { ok: false, message: 'Name or phone number exceeds the allowed length.' }
  }
  if (!requestedSession) {
    return { ok: false, message: 'Your session has expired. Please sign in again.' }
  }
  if (!input.location.country?.trim() || !input.location.region?.trim() || !input.location.city?.trim()) {
    return { ok: false, message: 'Select a country, state or region, and city or town.' }
  }
  if (input.location.country.trim().length > 80 || input.location.region.trim().length > 80 || input.location.city.trim().length > 80) {
    return { ok: false, message: 'Location fields must be 80 characters or fewer.' }
  }
  const coordinatesAreValid = (input.location.latitude === null && input.location.longitude === null)
    || (typeof input.location.latitude === 'number' && Number.isFinite(input.location.latitude)
      && Math.abs(input.location.latitude) <= 90 && typeof input.location.longitude === 'number'
      && Number.isFinite(input.location.longitude) && Math.abs(input.location.longitude) <= 180)
  if (!coordinatesAreValid) {
    return { ok: false, message: 'Location coordinates are invalid.' }
  }

  const apiResult = await callApi<{ id?: number | string; name?: string; phone?: string }>('/api/v1/auth/me', {
    name,
    phone,
    country: input.location.country.trim(),
    region: input.location.region.trim(),
    city: input.location.city.trim(),
    latitude: input.location.latitude,
    longitude: input.location.longitude,
  }, 'PUT')
  if (!apiResult.ok || !apiResult.data) {
    return { ok: false, message: apiResult.message ?? 'Could not update your profile.' }
  }

  const currentSession = getCurrentUser()
  if (currentSession?.id !== requestedSession.id || currentSession.email !== requestedSession.email) {
    return { ok: false, message: 'Your session changed. Please try again.' }
  }

  const updatedUser: AuthUser = {
    ...currentSession,
    name: apiResult.data.name ?? name,
    phone: apiResult.data.phone ?? (phone || undefined),
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser))
  return { ok: true, user: updatedUser }
}

export async function loginUser(input: { identifier: string; password: string; role?: Role }) {
  const identifier = input.identifier.trim()
  const password = input.password
  const isEmail = identifier.includes('@')

  if (!identifier || !password || new TextEncoder().encode(password).length > 72) {
    return { ok: false, message: 'Email or phone number and password are required.' }
  }
  if (isEmail && (identifier.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))) {
    return { ok: false, message: 'Please enter a valid email address.' }
  }
  if (!isEmail && identifier.length > 30) {
    return { ok: false, message: 'Phone number must be 30 characters or fewer.' }
  }

  const apiResult = await callApi<{ id?: number | string; name?: string; email?: string; phone?: string; role?: Role; activeRole?: Role; tenantId?: number; businessId?: number; accessToken?: string; accounts?: Array<{ role?: Role; tenantId?: number; businessId?: number; status?: string }>; message?: string }>('/api/v1/auth/login', {
    ...(isEmail ? { email: identifier } : { phone: identifier }),
    password,
  })

  if (!apiResult.ok || !apiResult.data) {
    return { ok: false, message: apiResult.message ?? 'Invalid email or password.' }
  }

  const responseData = apiResult.data
  if (!responseData.accessToken) {
    return { ok: false, message: 'The server did not return an access token. Please try again.' }
  }

  if (input.role && responseData.role && responseData.role !== input.role) {
    return { ok: false, message: `This account is not registered as a ${input.role.toLowerCase()} user.` }
  }

  const fallbackAccounts = [{ role: responseData.role ?? input.role ?? 'BUSINESS', tenantId: Number(responseData.tenantId ?? 1), businessId: Number(responseData.businessId ?? 0) || undefined, status: 'ACTIVE' }]
  const user: AuthUser = {
    id: String(responseData.id ?? '1'),
    name: responseData.name ?? responseData.email ?? responseData.phone ?? identifier,
    email: responseData.email ?? (isEmail ? identifier : ''),
    phone: responseData.phone ?? (!isEmail ? identifier : undefined),
    accessToken: responseData.accessToken,
    role: responseData.role ?? input.role ?? 'BUSINESS',
    activeRole: responseData.activeRole ?? (responseData.role ?? input.role ?? 'BUSINESS'),
    tenantId: Number(responseData.tenantId ?? 1),
    businessId: Number(responseData.businessId ?? 0) || undefined,
    accounts: (responseData.accounts?.length ? responseData.accounts : fallbackAccounts).map((account) => ({
      role: account.role ?? input.role ?? 'BUSINESS',
      tenantId: account.tenantId ?? Number(responseData.tenantId ?? 1),
      businessId: (account.businessId ?? Number(responseData.businessId ?? 0)) || undefined,
      status: account.status ?? 'ACTIVE',
    })),
    createdAt: new Date().toISOString(),
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  return { ok: true, user }
}
