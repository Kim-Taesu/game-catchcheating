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
/** Result-screen note on a glasses-swap seat that was tapped before its swap (that tap ended the round). */
export const BEFORE_SWAP_NOTE = '안경을 바꾸기 전에 잡아서 오해가 됐어요. 그때는 아직 수상한 점이 보이지 않았어요.'
/** Behavior sentence of a round entry: cheater case -> tell.action, innocent -> action. */
export const actionOf = (entry) => entry?.tell?.action ?? entry?.action ?? ''
