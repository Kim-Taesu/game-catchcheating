export const STATUS_LABEL: Record<string, string>
export const BASIS_LABEL: Record<string, string>
export const SINGLE_ACTION_NOTE: string
export function statusLabel(c: { status?: string } | undefined): string | undefined
export function basisLine(tell: { basisKind?: string; basisNote?: string }): string
export function actionOf(entry: { tell?: { action?: string }; action?: string } | undefined): string
