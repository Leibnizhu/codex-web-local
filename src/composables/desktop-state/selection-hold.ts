export function holdThreadSelection(
  holdMap: Map<string, number>,
  threadId: string,
  holdMs: number,
  nowMs: number = Date.now(),
): void {
  if (!threadId) return
  holdMap.set(threadId, nowMs + holdMs)
}

export function consumeObservedThreadSelection(holdMap: Map<string, number>, threadId: string): void {
  if (!threadId) return
  if (!holdMap.has(threadId)) return
  holdMap.delete(threadId)
}

export function shouldKeepMissingSelectedThread(
  holdMap: Map<string, number>,
  threadId: string,
  nowMs: number,
): boolean {
  const holdUntilMs = holdMap.get(threadId)
  if (holdUntilMs === undefined) return false
  if (holdUntilMs <= nowMs) {
    holdMap.delete(threadId)
    return false
  }
  return true
}

export function clearExpiredThreadSelectionHolds(holdMap: Map<string, number>, nowMs: number): void {
  for (const [threadId, holdUntilMs] of holdMap.entries()) {
    if (holdUntilMs <= nowMs) {
      holdMap.delete(threadId)
    }
  }
}
