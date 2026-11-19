export type HubEvent = { type: 'enter' } | { type: 'play_start' } | { type: 'play_end'; ms: number }
export const HUB: string
export const GAME_HOST: string
export function eventBody(events: HubEvent[]): string
export function sendHubEvents(
  events: HubEvent[],
  opts?: { host?: string; beacon?: ((url: string, body: string) => boolean) | undefined },
): boolean
export function createPlayTracker(
  send?: (events: HubEvent[]) => void,
  now?: () => number,
): { start(): void; end(): void }
