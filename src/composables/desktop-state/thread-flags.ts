import type { UiProjectGroup, UiServerRequest } from '../../types/codex'

export function buildFlaggedThreadGroups(
  sourceGroups: UiProjectGroup[],
  selectedThreadId: string,
  inProgressById: Record<string, boolean>,
  readStateByThreadId: Record<string, string>,
  eventUnreadByThreadId: Record<string, boolean>,
): UiProjectGroup[] {
  return sourceGroups.map((group) => ({
    projectName: group.projectName,
    threads: group.threads.map((thread) => {
      const inProgress = inProgressById[thread.id] === true
      const isSelected = selectedThreadId === thread.id
      const lastReadIso = readStateByThreadId[thread.id]
      const unreadByEvent = eventUnreadByThreadId[thread.id] === true
      const unread = !isSelected && !inProgress && (unreadByEvent || lastReadIso !== thread.updatedAtIso)

      return {
        ...thread,
        inProgress,
        unread,
      }
    }),
  }))
}

export function filterPendingServerRequestsByThreadIds(
  pendingServerRequestsByThreadId: Record<string, UiServerRequest[]>,
  activeThreadIds: Set<string>,
  globalScope: string,
): Record<string, UiServerRequest[]> {
  const nextPending: Record<string, UiServerRequest[]> = {}
  for (const [threadId, requests] of Object.entries(pendingServerRequestsByThreadId)) {
    if (threadId === globalScope || activeThreadIds.has(threadId)) {
      nextPending[threadId] = requests
    }
  }
  return nextPending
}
