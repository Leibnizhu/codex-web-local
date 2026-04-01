import type { ThreadScrollState, UiRateLimitUsage, UiThreadContextUsage } from '../../types/codex'

const READ_STATE_STORAGE_KEY = 'codex-web-local.thread-read-state.v1'
const SCROLL_STATE_STORAGE_KEY = 'codex-web-local.thread-scroll-state.v1'
const SELECTED_THREAD_STORAGE_KEY = 'codex-web-local.selected-thread-id.v1'
const PROJECT_ORDER_STORAGE_KEY = 'codex-web-local.project-order.v1'
const PROJECT_DISPLAY_NAME_STORAGE_KEY = 'codex-web-local.project-display-name.v1'
const AUTO_REFRESH_ENABLED_STORAGE_KEY = 'codex-web-local.auto-refresh-enabled.v1'
const CONTEXT_USAGE_STORAGE_KEY = 'codex-web-local.thread-context-usage.v2'
const RATE_LIMIT_USAGE_STORAGE_KEY = 'codex-web-local.rate-limit-usage.v1'
const WORKSPACE_BASE_BRANCH_STORAGE_KEY = 'codex-web-local.workspace-base-branch.v1'

function clamp(value: number, minValue: number, maxValue: number): number {
  return Math.min(Math.max(value, minValue), maxValue)
}

function normalizeThreadScrollState(value: unknown): ThreadScrollState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const rawState = value as Record<string, unknown>
  if (typeof rawState.scrollTop !== 'number' || !Number.isFinite(rawState.scrollTop)) return null
  if (typeof rawState.isAtBottom !== 'boolean') return null

  const normalized: ThreadScrollState = {
    scrollTop: Math.max(0, rawState.scrollTop),
    isAtBottom: rawState.isAtBottom,
  }

  if (typeof rawState.scrollRatio === 'number' && Number.isFinite(rawState.scrollRatio)) {
    normalized.scrollRatio = clamp(rawState.scrollRatio, 0, 1)
  }

  return normalized
}

function normalizeThreadContextUsage(value: unknown): UiThreadContextUsage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (typeof row.usedTokens !== 'number' || !Number.isFinite(row.usedTokens) || row.usedTokens < 0) return null
  if (typeof row.totalTokens !== 'number' || !Number.isFinite(row.totalTokens) || row.totalTokens <= 0) return null
  if (typeof row.usedPercent !== 'number' || !Number.isFinite(row.usedPercent)) return null
  if (typeof row.remainingPercent !== 'number' || !Number.isFinite(row.remainingPercent)) return null
  return {
    usedTokens: row.usedTokens,
    totalTokens: row.totalTokens,
    usedPercent: clamp(row.usedPercent, 0, 100),
    remainingPercent: clamp(row.remainingPercent, 0, 100),
  }
}

function normalizeRateLimitUsage(value: unknown): UiRateLimitUsage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (typeof row.usedPercent !== 'number' || !Number.isFinite(row.usedPercent)) return null
  if (typeof row.remainingPercent !== 'number' || !Number.isFinite(row.remainingPercent)) return null
  const windowDurationMins = typeof row.windowDurationMins === 'number' && Number.isFinite(row.windowDurationMins)
    ? row.windowDurationMins
    : null
  const resetsAt = typeof row.resetsAt === 'number' && Number.isFinite(row.resetsAt) ? row.resetsAt : null
  const rawWindows = Array.isArray(row.windows) ? row.windows : []
  const windows = rawWindows
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const windowRow = item as Record<string, unknown>
      if (typeof windowRow.usedPercent !== 'number' || !Number.isFinite(windowRow.usedPercent)) return null
      return {
        usedPercent: clamp(windowRow.usedPercent, 0, 100),
        windowDurationMins: typeof windowRow.windowDurationMins === 'number' && Number.isFinite(windowRow.windowDurationMins)
          ? windowRow.windowDurationMins
          : null,
        resetsAt: typeof windowRow.resetsAt === 'number' && Number.isFinite(windowRow.resetsAt)
          ? windowRow.resetsAt
          : null,
      }
    })
    .filter((item): item is { usedPercent: number; windowDurationMins: number | null; resetsAt: number | null } => item !== null)
  const creditsRaw = row.aiCredits
  const aiCredits = creditsRaw && typeof creditsRaw === 'object' && !Array.isArray(creditsRaw)
    ? {
      hasCredits: Boolean((creditsRaw as Record<string, unknown>).hasCredits),
      unlimited: Boolean((creditsRaw as Record<string, unknown>).unlimited),
      balance: typeof (creditsRaw as Record<string, unknown>).balance === 'string'
        ? ((creditsRaw as Record<string, unknown>).balance as string)
        : null,
    }
    : null
  return {
    usedPercent: clamp(row.usedPercent, 0, 100),
    remainingPercent: clamp(row.remainingPercent, 0, 100),
    windowDurationMins,
    resetsAt,
    windows,
    aiCredits,
    planType: typeof row.planType === 'string' ? row.planType : null,
  }
}

export function loadReadStateMap(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(READ_STATE_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Record<string, string>
  } catch {
    return {}
  }
}

export function saveReadStateMap(state: Record<string, string>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(READ_STATE_STORAGE_KEY, JSON.stringify(state))
}

export function loadAutoRefreshEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(AUTO_REFRESH_ENABLED_STORAGE_KEY) === '1'
}

export function saveAutoRefreshEnabled(value: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUTO_REFRESH_ENABLED_STORAGE_KEY, value ? '1' : '0')
}

export function loadThreadScrollStateMap(): Record<string, ThreadScrollState> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(SCROLL_STATE_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const normalizedMap: Record<string, ThreadScrollState> = {}
    for (const [threadId, state] of Object.entries(parsed as Record<string, unknown>)) {
      if (!threadId) continue
      const normalizedState = normalizeThreadScrollState(state)
      if (normalizedState) {
        normalizedMap[threadId] = normalizedState
      }
    }
    return normalizedMap
  } catch {
    return {}
  }
}

export function saveThreadScrollStateMap(state: Record<string, ThreadScrollState>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SCROLL_STATE_STORAGE_KEY, JSON.stringify(state))
}

export function loadSelectedThreadId(): string {
  if (typeof window === 'undefined') return ''
  const raw = window.localStorage.getItem(SELECTED_THREAD_STORAGE_KEY)
  return raw ?? ''
}

export function saveSelectedThreadId(threadId: string): void {
  if (typeof window === 'undefined') return
  if (!threadId) {
    window.localStorage.removeItem(SELECTED_THREAD_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(SELECTED_THREAD_STORAGE_KEY, threadId)
}

export function loadProjectOrder(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(PROJECT_ORDER_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const order: string[] = []
    for (const item of parsed) {
      if (typeof item === 'string' && item.length > 0 && !order.includes(item)) {
        order.push(item)
      }
    }
    return order
  } catch {
    return []
  }
}

export function saveProjectOrder(order: string[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PROJECT_ORDER_STORAGE_KEY, JSON.stringify(order))
}

export function loadProjectDisplayNames(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(PROJECT_DISPLAY_NAME_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const displayNames: Record<string, string> = {}
    for (const [projectName, displayName] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof projectName === 'string' && projectName.length > 0 && typeof displayName === 'string') {
        displayNames[projectName] = displayName
      }
    }
    return displayNames
  } catch {
    return {}
  }
}

export function saveProjectDisplayNames(displayNames: Record<string, string>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PROJECT_DISPLAY_NAME_STORAGE_KEY, JSON.stringify(displayNames))
}

export function loadThreadContextUsageMap(): Record<string, UiThreadContextUsage> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CONTEXT_USAGE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const normalizedMap: Record<string, UiThreadContextUsage> = {}
    for (const [threadId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!threadId) continue
      const normalized = normalizeThreadContextUsage(value)
      if (normalized) normalizedMap[threadId] = normalized
    }
    return normalizedMap
  } catch {
    return {}
  }
}

export function saveThreadContextUsageMap(state: Record<string, UiThreadContextUsage>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CONTEXT_USAGE_STORAGE_KEY, JSON.stringify(state))
}

export function loadRateLimitUsage(): UiRateLimitUsage | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(RATE_LIMIT_USAGE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return normalizeRateLimitUsage(parsed)
  } catch {
    return null
  }
}

export function saveRateLimitUsage(value: UiRateLimitUsage | null): void {
  if (typeof window === 'undefined') return
  if (!value) {
    window.localStorage.removeItem(RATE_LIMIT_USAGE_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(RATE_LIMIT_USAGE_STORAGE_KEY, JSON.stringify(value))
}

export function loadWorkspaceBaseBranchMap(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(WORKSPACE_BASE_BRANCH_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const normalized: Record<string, string> = {}
    for (const [cwd, branch] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof cwd !== 'string' || cwd.trim().length === 0) continue
      if (typeof branch !== 'string' || branch.trim().length === 0) continue
      normalized[cwd.trim()] = branch.trim()
    }
    return normalized
  } catch {
    return {}
  }
}

export function saveWorkspaceBaseBranchMap(state: Record<string, string>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(WORKSPACE_BASE_BRANCH_STORAGE_KEY, JSON.stringify(state))
}
