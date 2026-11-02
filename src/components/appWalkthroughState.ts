export const START_WALKTHROUGH_EVENT = 'bhive:start-walkthrough'

const pendingKey = (userId: string) => `bhive_walkthrough_pending:${userId}`

export function markWalkthroughPending(userId: string): void {
  try {
    localStorage.setItem(pendingKey(userId), '1')
  } catch {
    // Storage can be unavailable (private mode); the tour is optional, so skip it.
  }
}

export function isWalkthroughPending(userId: string): boolean {
  try {
    return localStorage.getItem(pendingKey(userId)) === '1'
  } catch {
    return false
  }
}

export function clearWalkthroughPending(userId: string): void {
  try {
    localStorage.removeItem(pendingKey(userId))
  } catch {
    // Nothing to clear.
  }
}

export function startWalkthrough(): void {
  window.dispatchEvent(new Event(START_WALKTHROUGH_EVENT))
}
