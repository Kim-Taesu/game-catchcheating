// 도감 필터 로직 (DOM 없음).
export function filterCases(cases, f) {
  return cases.filter((c) => {
    if (c.status === 'unverified') return f.status === 'unverified'
    if (f.status !== 'all' && c.status !== f.status) return false
    if (f.group !== 'all' && c.group !== f.group) return false
    if (f.region === 'kr') return c.origins.some((o) => o.country === 'KR')
    if (f.region === 'world') return c.origins.some((o) => o.country !== 'KR')
    return true
  })
}
