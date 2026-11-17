// Display labels shared by the play screen (toast) and the result screen (lists).
export const STATUS_LABEL = {
  confirmed: '확인됨',
  investigating: '수사 중·일부 추정',
  mentioned: '거론됨',
}
export const BASIS_LABEL = {
  report: '보도',
  guideline: '감독 지침',
  community: '커뮤니티 정리',
  industry: '업계 설명',
}
/** Status label of a case, or undefined when it has none. */
export const statusLabel = (c) => STATUS_LABEL[c?.status]
/** "근거: <종류> (<메모>)" line for a case's tell. */
export const basisLine = (tell) =>
  `근거: ${BASIS_LABEL[tell.basisKind] ?? ''}${tell.basisNote ? ` (${tell.basisNote})` : ''}`
export const SINGLE_ACTION_NOTE = '단일 행동만으로는 부정행위라고 단정할 수 없습니다.'
