// 발견 표시 저장. storage가 막혀 있어도 예외를 밖으로 내지 않는다.
const KEY = 'cf:discovered'

export function safeStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function loadDiscovered(s) {
  if (!s) return new Set()
  try {
    const raw = s.getItem(KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x) => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

export function markDiscovered(s, id) {
  if (!s) return
  try {
    const set = loadDiscovered(s)
    set.add(id)
    s.setItem(KEY, JSON.stringify([...set]))
  } catch {
    // 저장 실패는 무시
  }
}
