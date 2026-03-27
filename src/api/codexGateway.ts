import {
  fetchRpcMethodCatalog,
  fetchRpcNotificationCatalog,
  fetchPendingServerRequests,
  rpcCall,
  respondServerRequest,
  subscribeRpcNotifications,
  type RpcNotification,
} from './codexRpcClient'
import type {
  ConfigReadResponse,
  GetAccountRateLimitsResponse,
  ModelListResponse,
  ReasoningEffort,
  ThreadListResponse,
  ThreadReadResponse,
} from './appServerDtos'
import { normalizeCodexApiError } from './codexErrors'
import {
  normalizeLatestTurnFileChangesV2,
  normalizeThreadGroupsV2,
  normalizeThreadInProgressV2,
  normalizeThreadMessagesV2,
} from './normalizers/v2'
import type { UiMessage, UiProjectGroup, UiTurnFileChanges } from '../types/codex'

type CurrentModelConfig = {
  model: string
  reasoningEffort: ReasoningEffort | ''
}

export type FilePreviewPayload = {
  path: string
  line: number | null
  content: string
}

export type AccountRateLimitSnapshot = {
  usedPercent: number
  remainingPercent: number
  windowDurationMins: number | null
  resetsAt: number | null
  windows: Array<{
    usedPercent: number
    windowDurationMins: number | null
    resetsAt: number | null
  }>
  aiCredits: {
    hasCredits: boolean
    unlimited: boolean
    balance: string | null
  } | null
}

type RpcCallOptions = {
  signal?: AbortSignal
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function callRpc<T>(method: string, params?: unknown, options: RpcCallOptions = {}): Promise<T> {
  try {
    return await rpcCall<T>(method, params, options)
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }
    throw normalizeCodexApiError(error, `RPC ${method} failed`, method)
  }
}

function normalizeReasoningEffort(value: unknown): ReasoningEffort | '' {
  const allowed: ReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh']
  return typeof value === 'string' && allowed.includes(value as ReasoningEffort)
    ? (value as ReasoningEffort)
    : ''
}

async function getThreadGroupsV2(): Promise<UiProjectGroup[]> {
  const payload = await callRpc<ThreadListResponse>('thread/list', {
    archived: false,
    limit: 100,
    sortKey: 'updated_at',
  })
  return normalizeThreadGroupsV2(payload)
}

async function getThreadMessagesV2(threadId: string): Promise<UiMessage[]> {
  const payload = await callRpc<ThreadReadResponse>('thread/read', {
    threadId,
    includeTurns: true,
  })
  return normalizeThreadMessagesV2(payload)
}

async function getThreadConversationDataV2(
  threadId: string,
  options: RpcCallOptions = {},
): Promise<{ messages: UiMessage[]; fileChanges: UiTurnFileChanges | null; inProgress: boolean }> {
  const payload = await callRpc<ThreadReadResponse>('thread/read', {
    threadId,
    includeTurns: true,
  }, options)
  return {
    messages: normalizeThreadMessagesV2(payload),
    fileChanges: normalizeLatestTurnFileChangesV2(payload),
    inProgress: normalizeThreadInProgressV2(payload),
  }
}

export async function getThreadGroups(): Promise<UiProjectGroup[]> {
  try {
    return await getThreadGroupsV2()
  } catch (error) {
    throw normalizeCodexApiError(error, 'Failed to load thread groups', 'thread/list')
  }
}

export async function getThreadMessages(threadId: string): Promise<UiMessage[]> {
  try {
    return await getThreadMessagesV2(threadId)
  } catch (error) {
    throw normalizeCodexApiError(error, `Failed to load thread ${threadId}`, 'thread/read')
  }
}

export async function getThreadConversationData(
  threadId: string,
  options: RpcCallOptions = {},
): Promise<{ messages: UiMessage[]; fileChanges: UiTurnFileChanges | null; inProgress: boolean }> {
  try {
    return await getThreadConversationDataV2(threadId, options)
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }
    throw normalizeCodexApiError(error, `Failed to load thread ${threadId}`, 'thread/read')
  }
}

export async function getMethodCatalog(): Promise<string[]> {
  return fetchRpcMethodCatalog()
}

export async function getNotificationCatalog(): Promise<string[]> {
  return fetchRpcNotificationCatalog()
}

export function subscribeCodexNotifications(onNotification: (value: RpcNotification) => void): () => void {
  return subscribeRpcNotifications(onNotification)
}

export type { RpcNotification }

export async function replyToServerRequest(
  id: number,
  payload: { result?: unknown; error?: { code?: number; message: string } },
): Promise<void> {
  await respondServerRequest({
    id,
    ...payload,
  })
}

export async function getPendingServerRequests(): Promise<unknown[]> {
  return fetchPendingServerRequests()
}

export async function resumeThread(threadId: string): Promise<void> {
  await callRpc('thread/resume', { threadId })
}

export async function archiveThread(threadId: string): Promise<void> {
  await callRpc('thread/archive', { threadId })
}

function normalizeThreadIdFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const record = payload as Record<string, unknown>

  const thread = record.thread
  if (thread && typeof thread === 'object') {
    const threadId = (thread as Record<string, unknown>).id
    if (typeof threadId === 'string' && threadId.length > 0) {
      return threadId
    }
  }
  return ''
}

export async function startThread(cwd?: string, model?: string): Promise<string> {
  try {
    const params: Record<string, unknown> = {}
    if (typeof cwd === 'string' && cwd.trim().length > 0) {
      params.cwd = cwd.trim()
    }
    if (typeof model === 'string' && model.trim().length > 0) {
      params.model = model.trim()
    }
    const payload = await callRpc<{ thread?: { id?: string } }>('thread/start', params)
    const threadId = normalizeThreadIdFromPayload(payload)
    if (!threadId) {
      throw new Error('thread/start did not return a thread id')
    }
    return threadId
  } catch (error) {
    throw normalizeCodexApiError(error, 'Failed to start a new thread', 'thread/start')
  }
}

export async function startThreadTurn(
  threadId: string,
  text: string,
  model?: string,
  effort?: ReasoningEffort,
): Promise<void> {
  try {
    const params: Record<string, unknown> = {
      threadId,
      input: [{ type: 'text', text }],
    }
    if (typeof model === 'string' && model.length > 0) {
      params.model = model
    }
    if (typeof effort === 'string' && effort.length > 0) {
      params.effort = effort
    }
    await callRpc('turn/start', params)
  } catch (error) {
    throw normalizeCodexApiError(error, `Failed to start turn for thread ${threadId}`, 'turn/start')
  }
}

export async function interruptThreadTurn(threadId: string, turnId?: string): Promise<void> {
  const normalizedThreadId = threadId.trim()
  const normalizedTurnId = turnId?.trim() || ''
  if (!normalizedThreadId) return

  try {
    if (!normalizedTurnId) {
      throw new Error('turn/interrupt requires turnId')
    }
    await callRpc('turn/interrupt', { threadId: normalizedThreadId, turnId: normalizedTurnId })
  } catch (error) {
    throw normalizeCodexApiError(error, `Failed to interrupt turn for thread ${normalizedThreadId}`, 'turn/interrupt')
  }
}

export async function setDefaultModel(model: string): Promise<void> {
  await callRpc('setDefaultModel', { model })
}

export async function getAvailableModelIds(): Promise<string[]> {
  const payload = await callRpc<ModelListResponse>('model/list', {})
  const ids: string[] = []
  for (const row of payload.data) {
    const candidate = row.id || row.model
    if (!candidate || ids.includes(candidate)) continue
    ids.push(candidate)
  }
  return ids
}

export async function getCurrentModelConfig(): Promise<CurrentModelConfig> {
  const payload = await callRpc<ConfigReadResponse>('config/read', {})
  const model = payload.config.model ?? ''
  const reasoningEffort = normalizeReasoningEffort(payload.config.model_reasoning_effort)
  return { model, reasoningEffort }
}

function normalizeUsedPercent(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(Math.max(value, 0), 100)
}

type RateLimitWindowInfo = {
  usedPercent: number
  windowDurationMins: number | null
  resetsAt: number | null
}

function normalizeWindowDuration(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return Math.round(value)
}

function normalizeResetAt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return Math.round(value)
}

function readWindowInfo(window: unknown): RateLimitWindowInfo | null {
  if (!window || typeof window !== 'object') return null
  const row = window as Record<string, unknown>
  const usedPercent = normalizeUsedPercent(row.usedPercent)
  if (usedPercent === null) return null
  return {
    usedPercent,
    windowDurationMins: normalizeWindowDuration(row.windowDurationMins),
    resetsAt: normalizeResetAt(row.resetsAt),
  }
}

function compareWindowDuration(first: RateLimitWindowInfo, second: RateLimitWindowInfo): number {
  const left = first.windowDurationMins ?? -1
  const right = second.windowDurationMins ?? -1
  if (left !== right) return left - right
  return first.usedPercent - second.usedPercent
}

function pickLongerWindow(snapshot: unknown): RateLimitWindowInfo | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  const row = snapshot as Record<string, unknown>
  const primary = readWindowInfo(row.primary)
  const secondary = readWindowInfo(row.secondary)
  if (!primary && !secondary) return null
  if (!primary) return secondary
  if (!secondary) return primary
  return compareWindowDuration(primary, secondary) >= 0 ? primary : secondary
}

function extractAllWindows(snapshot: unknown): RateLimitWindowInfo[] {
  if (!snapshot || typeof snapshot !== 'object') return []
  const row = snapshot as Record<string, unknown>
  const windows: RateLimitWindowInfo[] = []
  const primary = readWindowInfo(row.primary)
  const secondary = readWindowInfo(row.secondary)
  if (primary) windows.push(primary)
  if (secondary) windows.push(secondary)
  windows.sort((first, second) => second.usedPercent - first.usedPercent)
  return windows
}

function readCredits(snapshot: unknown): AccountRateLimitSnapshot['aiCredits'] {
  if (!snapshot || typeof snapshot !== 'object') return null
  const credits = (snapshot as Record<string, unknown>).credits
  if (!credits || typeof credits !== 'object') return null
  const row = credits as Record<string, unknown>
  const hasCredits = typeof row.hasCredits === 'boolean' ? row.hasCredits : false
  const unlimited = typeof row.unlimited === 'boolean' ? row.unlimited : false
  const balance = typeof row.balance === 'string' ? row.balance : null
  return { hasCredits, unlimited, balance }
}

function toRateLimitSnapshot(payload: GetAccountRateLimitsResponse): AccountRateLimitSnapshot | null {
  const candidates: unknown[] = [payload.rateLimits]
  if (payload.rateLimitsByLimitId && typeof payload.rateLimitsByLimitId === 'object') {
    candidates.push(...Object.values(payload.rateLimitsByLimitId))
  }

  let bestWindow: RateLimitWindowInfo | null = null
  let bestSnapshot: unknown = null
  for (const candidate of candidates) {
    const window = pickLongerWindow(candidate)
    if (!window) continue
    if (!bestWindow || compareWindowDuration(window, bestWindow) > 0) {
      bestWindow = window
      bestSnapshot = candidate
    }
  }

  if (!bestWindow) return null
  return {
    usedPercent: bestWindow.usedPercent,
    remainingPercent: Math.max(0, 100 - bestWindow.usedPercent),
    windowDurationMins: bestWindow.windowDurationMins,
    resetsAt: bestWindow.resetsAt,
    windows: extractAllWindows(bestSnapshot),
    aiCredits: readCredits(bestSnapshot),
  }
}

export async function getAccountRateLimitSnapshot(): Promise<AccountRateLimitSnapshot | null> {
  const payload = await callRpc<GetAccountRateLimitsResponse>('account/rateLimits/read')
  return toRateLimitSnapshot(payload)
}

export async function compactThreadContext(threadId: string): Promise<void> {
  const normalizedThreadId = threadId.trim()
  if (!normalizedThreadId) return
  await callRpc('thread/compact/start', { threadId: normalizedThreadId })
}

export async function fetchFilePreview(path: string, line?: number | null): Promise<FilePreviewPayload> {
  const normalizedPath = path.trim()
  if (!normalizedPath) {
    throw new Error('File path is required')
  }

  const query = new URLSearchParams({ path: normalizedPath })
  if (typeof line === 'number' && Number.isFinite(line) && line > 0) {
    query.set('line', String(Math.trunc(line)))
  }

  const response = await fetch(`/codex-api/file-preview?${query.toString()}`)
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw normalizeCodexApiError(payload, `Failed to preview file: ${normalizedPath}`, 'file-preview')
  }

  const row = payload as Partial<FilePreviewPayload> | null
  const content = typeof row?.content === 'string' ? row.content : ''
  const resolvedPath = typeof row?.path === 'string' ? row.path : normalizedPath
  const resolvedLine = typeof row?.line === 'number' && Number.isFinite(row.line) ? Math.trunc(row.line) : null
  return {
    path: resolvedPath,
    line: resolvedLine,
    content,
  }
}

export async function fetchWorkspaceChanges(cwd: string): Promise<UiTurnFileChanges | null> {
  const normalizedCwd = cwd.trim()
  if (!normalizedCwd) return null

  const query = new URLSearchParams({ cwd: normalizedCwd })
  const response = await fetch(`/codex-api/workspace-changes?${query.toString()}`)
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw normalizeCodexApiError(payload, `Failed to read workspace changes for ${normalizedCwd}`, 'workspace-changes')
  }

  const row = payload as {
    files?: Array<{ path?: string; additions?: number; deletions?: number; diff?: string }>
    totalAdditions?: number
    totalDeletions?: number
  } | null

  const files = Array.isArray(row?.files)
    ? row.files
      .map((file) => ({
        path: typeof file.path === 'string' ? file.path : '',
        additions: typeof file.additions === 'number' && Number.isFinite(file.additions) ? Math.max(0, Math.trunc(file.additions)) : 0,
        deletions: typeof file.deletions === 'number' && Number.isFinite(file.deletions) ? Math.max(0, Math.trunc(file.deletions)) : 0,
        diff: typeof file.diff === 'string' ? file.diff : '',
      }))
      .filter((file) => file.path.length > 0)
    : []

  if (files.length === 0) {
    return null
  }

  const totalAdditions = typeof row?.totalAdditions === 'number' && Number.isFinite(row.totalAdditions)
    ? Math.max(0, Math.trunc(row.totalAdditions))
    : files.reduce((sum, file) => sum + file.additions, 0)
  const totalDeletions = typeof row?.totalDeletions === 'number' && Number.isFinite(row.totalDeletions)
    ? Math.max(0, Math.trunc(row.totalDeletions))
    : files.reduce((sum, file) => sum + file.deletions, 0)

  return {
    turnId: '__workspace__',
    files,
    totalAdditions,
    totalDeletions,
  }
}

export async function fetchWorkspaceFullDiff(cwd: string): Promise<string> {
  const normalizedCwd = cwd.trim()
  if (!normalizedCwd) return ''

  const query = new URLSearchParams({ cwd: normalizedCwd })
  const response = await fetch(`/codex-api/workspace-diff?${query.toString()}`)
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw normalizeCodexApiError(payload, `Failed to read workspace diff for ${normalizedCwd}`, 'workspace-diff')
  }

  const record = payload as Record<string, unknown> | null
  return typeof record?.diff === 'string' ? record.diff : ''
}

// `thread/loaded/list` returns sessions loaded in memory, not currently running turns.
