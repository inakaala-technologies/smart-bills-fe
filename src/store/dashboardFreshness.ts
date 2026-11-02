import { getApiCacheEpoch } from '../services/api/httpClient'

const DASHBOARD_TTL_MS = 60_000

export type DashboardFreshness = {
  loadedAt: number | null
  loadedEpoch: number | null
  loadedKey: string | null
}

export const emptyFreshness: DashboardFreshness = { loadedAt: null, loadedEpoch: null, loadedKey: null }

export function markLoaded(key: string): DashboardFreshness {
  return { loadedAt: Date.now(), loadedEpoch: getApiCacheEpoch(), loadedKey: key }
}

// Fresh = same user/scope, loaded recently, and no successful write since.
export function isDashboardFresh(state: DashboardFreshness, key: string): boolean {
  return state.loadedKey === key
    && state.loadedAt !== null
    && Date.now() - state.loadedAt < DASHBOARD_TTL_MS
    && state.loadedEpoch === getApiCacheEpoch()
}
