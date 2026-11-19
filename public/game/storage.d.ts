export function safeStorage(): Storage | null
export function loadDiscovered(s: Storage | null): Set<string>
export function markDiscovered(s: Storage | null, id: string): void
