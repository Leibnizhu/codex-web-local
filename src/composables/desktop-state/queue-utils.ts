import type { ComposerSubmitPayload } from '../../types/codex'
import { buildQueuedMessagePreviewText, normalizeComposerSubmitPayload } from './message-utils'

type QueuedMessageState = {
  id: string
  payload: ComposerSubmitPayload
  text: string
  queuedAtIso: string
}

export type { QueuedMessageState }

export function enqueueQueuedMessage(
  stateByThreadId: Record<string, QueuedMessageState[]>,
  threadId: string,
  payload: ComposerSubmitPayload,
): Record<string, QueuedMessageState[]> {
  if (!threadId) return stateByThreadId
  const normalizedPayload = normalizeComposerSubmitPayload(payload)
  if (!normalizedPayload) return stateByThreadId

  const current = stateByThreadId[threadId] ?? []
  const queuedMessage: QueuedMessageState = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload: normalizedPayload,
    text: buildQueuedMessagePreviewText(normalizedPayload),
    queuedAtIso: new Date().toISOString(),
  }

  return {
    ...stateByThreadId,
    [threadId]: [...current, queuedMessage],
  }
}

export function dequeueQueuedMessage(
  stateByThreadId: Record<string, QueuedMessageState[]>,
  threadId: string,
): { nextStateByThreadId: Record<string, QueuedMessageState[]>; message: QueuedMessageState | null } {
  const current = stateByThreadId[threadId] ?? []
  if (current.length === 0) {
    return {
      nextStateByThreadId: stateByThreadId,
      message: null,
    }
  }

  const [message, ...rest] = current
  if (rest.length === 0) {
    const nextStateByThreadId = { ...stateByThreadId }
    delete nextStateByThreadId[threadId]
    return { nextStateByThreadId, message }
  }

  return {
    nextStateByThreadId: {
      ...stateByThreadId,
      [threadId]: rest,
    },
    message,
  }
}
