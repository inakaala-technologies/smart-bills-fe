import type { Role } from '../services/auth'

export function getDashboardPath(role: Role, tab?: string): string {
  const basePath = `/${role.toLowerCase()}/dashboard`
  return tab ? `${basePath}/${tab}` : basePath
}

export function isDashboardPathname(pathname: string): boolean {
  return /^\/(?:dashboard|(?:customer|business|admin)\/dashboard)(?:\/|$)/.test(pathname)
}
