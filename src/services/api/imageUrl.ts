/**
 * Adds a changing ?v=timestamp to an image URL so the browser loads the newly
 * uploaded image instead of showing the cached one.
 */
export function bustCache(url?: string | null): string | undefined {
  if (!url) return undefined
  return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`
}