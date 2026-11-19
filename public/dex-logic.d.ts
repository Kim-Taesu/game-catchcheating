import type { CaseEntry } from './game/round'

export type DexFilter = {
  region: 'all' | 'kr' | 'world'
  group: 'all' | CaseEntry['group']
  status: 'all' | CaseEntry['status']
}
export function filterCases(cases: CaseEntry[], f: DexFilter): CaseEntry[]
