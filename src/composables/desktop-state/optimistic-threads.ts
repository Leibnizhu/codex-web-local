import type { UiProjectGroup, UiThread } from '../../types/codex'
import { flattenThreads } from './core-utils'

function normalizeMessageText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim()
}

export function deriveProjectNameFromCwd(cwd: string): string {
  const parts = cwd.split('/').filter(Boolean)
  return parts.at(-1) || cwd || 'unknown-project'
}

export function buildOptimisticThreadTitle(text: string): string {
  const normalized = normalizeMessageText(text)
  if (normalized.length === 0) return 'New thread'
  if (normalized.length <= 44) return normalized
  return `${normalized.slice(0, 44)}...`
}

export function createOptimisticThread(threadId: string, cwd: string, text: string): UiThread {
  const nowIso = new Date().toISOString()
  const trimmedCwd = cwd.trim()
  return {
    id: threadId,
    title: buildOptimisticThreadTitle(text),
    projectName: deriveProjectNameFromCwd(trimmedCwd),
    cwd: trimmedCwd,
    branch: '',
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    preview: normalizeMessageText(text),
    unread: false,
    inProgress: true,
  }
}

export function mergeOptimisticThreads(baseGroups: UiProjectGroup[], optimisticThreads: Iterable<UiThread>): UiProjectGroup[] {
  const nextGroups = baseGroups.map((group) => ({
    projectName: group.projectName,
    threads: [...group.threads],
  }))
  const groupsByName = new Map(nextGroups.map((group) => [group.projectName, group]))
  const existingThreadIds = new Set(flattenThreads(nextGroups).map((thread) => thread.id))

  for (const optimisticThread of optimisticThreads) {
    if (existingThreadIds.has(optimisticThread.id)) continue
    existingThreadIds.add(optimisticThread.id)

    const existingGroup = groupsByName.get(optimisticThread.projectName)
    if (existingGroup) {
      existingGroup.threads.unshift(optimisticThread)
    } else {
      const newGroup: UiProjectGroup = {
        projectName: optimisticThread.projectName,
        threads: [optimisticThread],
      }
      nextGroups.push(newGroup)
      groupsByName.set(newGroup.projectName, newGroup)
    }
  }

  for (const group of nextGroups) {
    group.threads.sort((first, second) => second.updatedAtIso.localeCompare(first.updatedAtIso))
  }

  return nextGroups
}

export function removeMaterializedOptimisticThreads(
  optimisticThreadById: Map<string, UiThread>,
  serverGroups: UiProjectGroup[],
): void {
  if (optimisticThreadById.size === 0) return
  const serverThreadIds = new Set(flattenThreads(serverGroups).map((thread) => thread.id))
  for (const threadId of serverThreadIds) {
    if (optimisticThreadById.has(threadId)) {
      optimisticThreadById.delete(threadId)
    }
  }
}
