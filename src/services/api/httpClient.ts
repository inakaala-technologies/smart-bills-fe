import axios, { AxiosHeaders, type AxiosAdapter, type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://13.233.126.174:8084'
const parsedApiBaseUrl = new URL(API_BASE_URL)
const isLoopbackApi = ['localhost', '127.0.0.1', '::1'].includes(parsedApiBaseUrl.hostname)
const isHttpPage = typeof window !== 'undefined' && window.location.protocol === 'http:'

if (import.meta.env.PROD && parsedApiBaseUrl.protocol !== 'https:' && !isLoopbackApi && !isHttpPage) {
  throw new Error('HTTPS pages must use an HTTPS API.')
}

export class ApiClientError extends Error {
  readonly status?: number
  readonly data?: unknown

  constructor(message: string, status?: number, data?: unknown) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.data = data
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true,
})

const mutationMethods = new Set(['post', 'put', 'patch', 'delete'])
const inFlightMutations = new Map<string, Promise<AxiosResponse>>()
const blobIdentities = new WeakMap<Blob, number>()
let nextBlobIdentity = 1
let refreshRequest: Promise<string | null> | null = null
const defaultAdapter: AxiosAdapter = axios.getAdapter(apiClient.defaults.adapter)

type RetryableRequestConfig = InternalAxiosRequestConfig & { refreshRetryAttempted?: boolean }

function isAuthSessionPath(pathname: string): boolean {
  return ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh', '/api/v1/auth/logout']
    .includes(pathname)
}

function isAuthSessionRequest(config: Parameters<AxiosAdapter>[0]): boolean {
  return isAuthSessionPath(new URL(config.url ?? '', config.baseURL ?? API_BASE_URL).pathname)
}

function requestNewAccessToken(): Promise<string | null> {
  if (refreshRequest) return refreshRequest

  refreshRequest = apiClient.post<{ accessToken?: string }>('/api/v1/auth/refresh', {})
    .then(({ data }) => {
      if (typeof data.accessToken !== 'string'
        || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(data.accessToken)) {
        return null
      }
      const rawSession = sessionStorage.getItem('bhive_session')
      if (!rawSession) return null
      const session = JSON.parse(rawSession) as Record<string, unknown>
      session.accessToken = data.accessToken
      sessionStorage.setItem('bhive_session', JSON.stringify(session))
      return data.accessToken
    })
    .catch(() => null)
    .finally(() => {
      refreshRequest = null
    })

  return refreshRequest
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? String(value)
  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    return `form:${Array.from(value.entries()).map(([name, entry]) => {
      if (typeof entry === 'string') return `${name}:${entry}`
      let identity = blobIdentities.get(entry)
      if (!identity) {
        identity = nextBlobIdentity++
        blobIdentities.set(entry, identity)
      }
      return `${name}:blob-${identity}`
    }).sort().join('|')}`
  }
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
    .join(',')}}`
}

function createIdempotencyKey(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  globalThis.crypto?.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function getMutationKey(config: Parameters<AxiosAdapter>[0]): string | null {
  const authorization = AxiosHeaders.from(config.headers).get('Authorization') ?? ''
  const tenantId = AxiosHeaders.from(config.headers).get('X-Tenant-Id') ?? ''
  return [
    config.method?.toLowerCase() ?? 'get',
    config.baseURL ?? '',
    config.url ?? '',
    stableSerialize(config.params),
    stableSerialize(config.data),
    String(authorization),
    String(tenantId),
  ].join('|')
}

apiClient.defaults.adapter = async (config) => {
  if (!mutationMethods.has(config.method?.toLowerCase() ?? '')) return defaultAdapter(config)
  if (isAuthSessionRequest(config)) return defaultAdapter(config)

  const mutationKey = getMutationKey(config)
  if (mutationKey === null) return defaultAdapter(config)

  const existingRequest = inFlightMutations.get(mutationKey)
  if (existingRequest) {
    return existingRequest.then((response) => ({
      ...response,
      config,
    }))
  }

  config.headers = AxiosHeaders.from(config.headers)
  const isMultipart = typeof FormData !== 'undefined' && config.data instanceof FormData
  if (isMultipart) {
    config.headers.delete('Idempotency-Key')
  } else if (!config.headers.has('Idempotency-Key')) {
    config.headers.set('Idempotency-Key', createIdempotencyKey())
  }

  const request = defaultAdapter(config)
  inFlightMutations.set(mutationKey, request)
  try {
    return await request
  } finally {
    if (inFlightMutations.get(mutationKey) === request) inFlightMutations.delete(mutationKey)
  }
}

apiClient.interceptors.request.use((config) => {
  const targetUrl = new URL(config.url ?? '', config.baseURL ?? API_BASE_URL)
  const apiOrigin = new URL(API_BASE_URL).origin
  const isPublicAuthRequest = isAuthSessionPath(targetUrl.pathname)
  config.headers = AxiosHeaders.from(config.headers)
  config.withCredentials = targetUrl.origin === apiOrigin

  if (targetUrl.origin === apiOrigin && !isPublicAuthRequest && typeof sessionStorage !== 'undefined') {
    try {
      const rawSession = sessionStorage.getItem('bhive_session')
      const session = rawSession ? JSON.parse(rawSession) as {
        accessToken?: string
        tenantId?: number
        role?: string
        activeRole?: string
        accounts?: Array<{ role?: string; tenantId?: number }>
      } : null
      const validToken = typeof session?.accessToken === 'string'
        && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(session.accessToken)
      const tenantId = Number(session?.tenantId)
      const selectedRole = session?.activeRole ?? session?.role
      const tenantAllowed = Number.isSafeInteger(tenantId) && tenantId > 0
        && session?.accounts?.some((account) => account.role === selectedRole && Number(account.tenantId) === tenantId)

      if (!validToken) {
        sessionStorage.removeItem('bhive_session')
        if (rawSession && typeof window !== 'undefined') {
          window.dispatchEvent(new Event('bhive:unauthorized'))
        }
      } else {
        config.headers.set('Authorization', `Bearer ${session.accessToken}`)
      }
      if (validToken && tenantAllowed) {
        config.headers.set('X-Tenant-Id', String(tenantId))
      } else {
        config.headers.delete('X-Tenant-Id')
      }
    } catch {
      sessionStorage.removeItem('bhive_session')
    }
  } else {
    config.headers.delete('Authorization')
    config.headers.delete('X-User-Id')
    config.headers.delete('X-Tenant-Id')
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: unknown }>) => {
    const requestConfig = error.config as RetryableRequestConfig | undefined
    const requestPath = requestConfig
      ? new URL(requestConfig.url ?? '', requestConfig.baseURL ?? API_BASE_URL).pathname
      : ''
    const hasAccessToken = Boolean(requestConfig?.headers.get('Authorization'))

    if (error.response?.status === 401 && requestConfig && hasAccessToken
      && !requestConfig.refreshRetryAttempted && !isAuthSessionPath(requestPath)) {
      requestConfig.refreshRetryAttempted = true
      const accessToken = await requestNewAccessToken()
      if (accessToken) {
        requestConfig.headers.set('Authorization', `Bearer ${accessToken}`)
        return apiClient.request(requestConfig)
      }
    }

    if (error.response?.status === 401 && hasAccessToken) {
      sessionStorage.removeItem('bhive_session')
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('bhive:unauthorized'))
    }
    const data = error.response?.data
    const message = typeof data?.message === 'string'
      ? data.message
      : error.message || 'Network request failed.'
    return Promise.reject(new ApiClientError(message, error.response?.status, data))
  },
)
