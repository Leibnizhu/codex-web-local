<template>
  <DesktopLayout :is-sidebar-collapsed="isSidebarCollapsed">
    <template #sidebar>
      <section class="sidebar-root">
        <SidebarThreadControls
          v-if="!isSidebarCollapsed"
          class="sidebar-thread-controls-host"
          :is-sidebar-collapsed="isSidebarCollapsed"
          :is-auto-refresh-enabled="isAutoRefreshEnabled"
          :auto-refresh-button-label="autoRefreshButtonLabel"
          :ui-language="uiLanguage"
          :show-new-thread-button="true"
          @toggle-sidebar="setSidebarCollapsed(!isSidebarCollapsed)"
          @toggle-auto-refresh="onToggleAutoRefreshTimer"
          @start-new-thread="onStartNewThreadFromToolbar"
        >
          <button
            class="sidebar-search-toggle"
            type="button"
            :aria-pressed="isSidebarSearchVisible"
            :aria-label="t('app.searchThreads')"
            :title="t('app.searchThreads')"
            @click="toggleSidebarSearch"
          >
            <IconTablerSearch class="sidebar-search-toggle-icon" />
          </button>
        </SidebarThreadControls>

        <div v-if="!isSidebarCollapsed && isSidebarSearchVisible" class="sidebar-search-bar">
          <IconTablerSearch class="sidebar-search-bar-icon" />
          <input
            ref="sidebarSearchInputRef"
            v-model="sidebarSearchQuery"
            class="sidebar-search-input"
            type="text"
            :placeholder="t('app.filterThreads')"
            @keydown="onSidebarSearchKeydown"
          />
          <button
            v-if="sidebarSearchQuery.length > 0"
            class="sidebar-search-clear"
            type="button"
            :aria-label="t('app.clearSearch')"
            @click="clearSidebarSearch"
          >
            <IconTablerX class="sidebar-search-clear-icon" />
          </button>
        </div>

        <SidebarThreadTree :groups="projectGroups" :project-display-name-by-id="projectDisplayNameById"
          v-if="!isSidebarCollapsed"
          :selected-thread-id="selectedThreadId" :is-loading="isLoadingThreads"
          :search-query="sidebarSearchQuery"
          :ui-language="uiLanguage"
          @select="onSelectThread"
          @archive="onArchiveThread" @start-new-thread="onStartNewThread" @rename-project="onRenameProject"
          @remove-project="onRemoveProject" @reorder-project="onReorderProject" />

        <div v-if="!isSidebarCollapsed" class="sidebar-footer-actions">
          <button
            class="sidebar-footer-button"
            type="button"
            :aria-label="themeToggleLabel"
            :title="themeToggleLabel"
            @click="cycleThemeMode"
          >
            <IconThemeMode class="sidebar-footer-button-icon" :mode="uiTheme" />
          </button>
          <button
            class="sidebar-footer-button"
            type="button"
            :aria-label="languageToggleLabel"
            :title="languageToggleLabel"
            @click="toggleUiLanguage"
          >
            <span class="sidebar-footer-language-mark">{{ languageToggleMark }}</span>
          </button>
        </div>
      </section>
    </template>

    <template #content>
      <section class="content-root">
        <ContentHeader :title="contentTitle">
          <template #leading>
            <SidebarThreadControls
              v-if="isSidebarCollapsed"
              class="sidebar-thread-controls-header-host"
              :is-sidebar-collapsed="isSidebarCollapsed"
              :is-auto-refresh-enabled="isAutoRefreshEnabled"
              :auto-refresh-button-label="autoRefreshButtonLabel"
              :ui-language="uiLanguage"
              :show-new-thread-button="true"
              @toggle-sidebar="setSidebarCollapsed(!isSidebarCollapsed)"
              @toggle-auto-refresh="onToggleAutoRefreshTimer"
              @start-new-thread="onStartNewThreadFromToolbar"
            />
          </template>
          <template #actions>
            <button
              v-if="!isHomeRoute"
              class="content-header-diff-chip"
              type="button"
              :disabled="!canOpenWorkspaceDiff"
              @click="onOpenWorkspaceDiff"
            >
              <span class="content-header-diff-icon">+</span>
              <span class="content-header-diff-add">+{{ workspaceDiffTotals.additions }}</span>
              <span class="content-header-diff-del">-{{ workspaceDiffTotals.deletions }}</span>
            </button>
          </template>
        </ContentHeader>

        <section class="content-body">
          <template v-if="isHomeRoute">
            <div class="content-grid">
              <div class="new-thread-empty">
                <p class="new-thread-hero">{{ t('app.letsBuild') }}</p>
                <ComposerDropdown class="new-thread-folder-dropdown" :model-value="newThreadCwd"
                  :options="newThreadFolderOptions" :placeholder="t('app.chooseFolder')"
                  :disabled="newThreadFolderOptions.length === 0" @update:model-value="onSelectNewThreadFolder" />
              </div>

              <ThreadComposer :active-thread-id="composerThreadContextId" :disabled="isSendingMessage"
                :models="availableModelIds" :selected-model="selectedModelId"
                :selected-reasoning-effort="selectedReasoningEffort" :is-turn-in-progress="false"
                :ui-language="uiLanguage"
                :is-interrupting-turn="false" @submit="onSubmitThreadMessage"
                @update:selected-model="onSelectModel" @update:selected-reasoning-effort="onSelectReasoningEffort" />
            </div>
          </template>
          <template v-else>
            <div class="content-grid content-grid-thread" :class="{ 'content-grid-thread-has-preview': previewPanel !== null }">
              <div class="content-thread">
                <ThreadConversation :messages="filteredMessages" :is-loading="isLoadingMessages"
                  :active-thread-id="composerThreadContextId" :scroll-state="selectedThreadScrollState"
                  :project-cwd="selectedThread?.cwd ?? ''"
                  :file-changes="selectedThreadFileChanges"
                  :ui-language="uiLanguage"
                  :is-thinking-indicator-visible="isThinkingIndicatorVisible"
                  :pending-requests="selectedThreadServerRequests"
                  @update-scroll-state="onUpdateThreadScrollState"
                  @respond-server-request="onRespondServerRequest"
                  @open-file-reference="onOpenFileReference"
                  @open-file-diff="onOpenFileDiff"
                  @open-workspace-diff="onOpenWorkspaceDiff" />
              </div>

              <aside v-if="previewPanel" class="content-code-preview">
                <header class="content-code-preview-header">
                  <div class="content-code-preview-title-wrap">
                    <p class="content-code-preview-title">{{ previewPanelTitle }}</p>
                    <p v-if="previewPanelSubtitle" class="content-code-preview-subtitle">{{ previewPanelSubtitle }}</p>
                  </div>
                  <button
                    class="content-code-preview-close"
                    type="button"
                    :aria-label="t('app.closeCodePreview')"
                    @click="onCloseFilePreview"
                  >
                    <IconTablerX class="content-code-preview-close-icon" />
                  </button>
                </header>
                <section v-if="previewPanel.kind === 'workspace'" class="workspace-diff-panel">
                  <ul class="workspace-diff-list">
                    <li v-for="change in previewPanel.changes.files" :key="`workspace:${change.path}`" class="workspace-diff-item">
                      <button
                        type="button"
                        class="workspace-diff-item-button"
                        @click="toggleWorkspaceDiffFile(change.path)"
                      >
                        <span class="workspace-diff-item-path">{{ formatDisplayPath(change.path, previewPanel.cwd) }}</span>
                        <span class="workspace-diff-item-stats">
                          <span class="file-change-stats-add">+{{ change.additions }}</span>
                          <span class="file-change-stats-del">-{{ change.deletions }}</span>
                        </span>
                      </button>
                      <pre
                        v-if="isWorkspaceDiffFileExpanded(change.path)"
                        class="workspace-diff-item-body"
                      >
                        <div class="diff-lines">
                          <div
                            v-for="(line, index) in buildRenderableDiffLines(change.diff)"
                            :key="`wdiff:${change.path}:${index}`"
                            class="diff-line"
                            :class="`diff-line-${line.kind}`"
                          >
                            <span class="diff-ln-old">{{ line.oldLine ?? '' }}</span>
                            <span class="diff-ln-new">{{ line.newLine ?? '' }}</span>
                            <span class="diff-line-text">{{ line.text }}</span>
                          </div>
                        </div>
                      </pre>
                    </li>
                  </ul>
                </section>
                <pre v-else-if="previewPanel.kind === 'diff'" class="content-code-preview-body">
                  <div class="diff-lines">
                    <div
                      v-for="(line, index) in buildRenderableDiffLines(previewPanel.diff)"
                      :key="`pdiff:${previewPanel.path}:${index}`"
                      class="diff-line"
                      :class="`diff-line-${line.kind}`"
                    >
                      <span class="diff-ln-old">{{ line.oldLine ?? '' }}</span>
                      <span class="diff-ln-new">{{ line.newLine ?? '' }}</span>
                      <span class="diff-line-text">{{ line.text }}</span>
                    </div>
                  </div>
                </pre>
                <pre v-else-if="previewPanel.kind === 'file'" class="content-code-preview-body">
                  <div class="code-lines">
                    <div
                      v-for="(line, index) in renderableFilePreviewLines"
                      :key="`fline:${previewPanel.payload.path}:${index}:${line.oldLine ?? 'n'}:${line.newLine ?? 'n'}`"
                      class="diff-line"
                      :class="[ `diff-line-${line.kind}`, filePreviewHasDiff ? '' : 'code-line-single' ]"
                    >
                      <span class="diff-ln-old">{{ line.oldLine ?? '' }}</span>
                      <span v-if="filePreviewHasDiff" class="diff-ln-new">{{ line.newLine ?? '' }}</span>
                      <span class="hljs code-line-text" v-html="line.html || '&nbsp;'"></span>
                    </div>
                  </div>
                </pre>
                <pre v-else class="content-code-preview-body"><code class="hljs content-code-preview-code" v-html="highlightedPreviewHtml"></code></pre>
              </aside>
            </div>

            <div class="content-composer-row">
              <div
                v-if="isThinkingIndicatorVisible"
                class="content-thinking-indicator"
                aria-live="polite"
              >
                <span class="content-thinking-indicator-main">
                  <span class="content-thinking-indicator-label">{{ thinkingIndicatorLabel }}</span>
                  <span class="content-thinking-indicator-dots" aria-hidden="true">
                    <span class="content-thinking-indicator-dot" />
                    <span class="content-thinking-indicator-dot" />
                    <span class="content-thinking-indicator-dot" />
                  </span>
                </span>
                <span v-if="thinkingIndicatorDetail" class="content-thinking-indicator-detail">{{ thinkingIndicatorDetail }}</span>
              </div>
              <ThreadComposer :active-thread-id="composerThreadContextId"
                :disabled="isSendingMessage || isLoadingMessages" :models="availableModelIds"
                :selected-model="selectedModelId" :selected-reasoning-effort="selectedReasoningEffort"
                :ui-language="uiLanguage"
                :is-turn-in-progress="isSelectedThreadInProgress" :is-interrupting-turn="isInterruptingTurn"
                @submit="onSubmitThreadMessage" @update:selected-model="onSelectModel"
                @update:selected-reasoning-effort="onSelectReasoningEffort" @interrupt="onInterruptTurn" />
              </div>
          </template>
        </section>
      </section>
    </template>
  </DesktopLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DesktopLayout from './components/layout/DesktopLayout.vue'
import SidebarThreadTree from './components/sidebar/SidebarThreadTree.vue'
import ContentHeader from './components/content/ContentHeader.vue'
import ThreadConversation from './components/content/ThreadConversation.vue'
import ThreadComposer from './components/content/ThreadComposer.vue'
import ComposerDropdown from './components/content/ComposerDropdown.vue'
import SidebarThreadControls from './components/sidebar/SidebarThreadControls.vue'
import IconTablerSearch from './components/icons/IconTablerSearch.vue'
import IconTablerX from './components/icons/IconTablerX.vue'
import IconThemeMode from './components/icons/IconThemeMode.vue'
import { useDesktopState } from './composables/useDesktopState'
import { tUi, type UiLanguage, type UiTextKey } from './i18n/uiText'
import type { ReasoningEffort, ThreadScrollState, UiTurnFileChanges } from './types/codex'
import { fetchFilePreview, fetchWorkspaceChanges, type FilePreviewPayload } from './api/codexGateway'
import hljs from 'highlight.js/lib/common'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'codex-web-local.sidebar-collapsed.v1'
const UI_THEME_STORAGE_KEY = 'codex-web-local.ui-theme.v1'
const UI_LANGUAGE_STORAGE_KEY = 'codex-web-local.ui-language.v1'
type ThemeMode = 'light' | 'dark' | 'auto'

const {
  projectGroups,
  projectDisplayNameById,
  selectedThread,
  selectedThreadScrollState,
  selectedThreadServerRequests,
  selectedThreadFileChanges,
  selectedLiveOverlay,
  selectedThreadId,
  availableModelIds,
  selectedModelId,
  selectedReasoningEffort,
  messages,
  isLoadingThreads,
  isLoadingMessages,
  isSendingMessage,
  isInterruptingTurn,
  isAutoRefreshEnabled,
  autoRefreshSecondsLeft,
  refreshAll,
  selectThread,
  setThreadScrollState,
  archiveThreadById,
  sendMessageToSelectedThread,
  sendMessageToNewThread,
  interruptSelectedThreadTurn,
  setSelectedModelId,
  setSelectedReasoningEffort,
  respondToPendingServerRequest,
  renameProject,
  removeProject,
  reorderProject,
  toggleAutoRefreshTimer,
  startPolling,
  stopPolling,
} = useDesktopState()

const route = useRoute()
const router = useRouter()
const isRouteSyncInProgress = ref(false)
const hasInitialized = ref(false)
const newThreadCwd = ref('')
const isSidebarCollapsed = ref(loadSidebarCollapsed())
const uiTheme = ref<ThemeMode>(loadUiTheme())
const uiLanguage = ref<UiLanguage>(loadUiLanguage())
function t(key: UiTextKey, params?: Record<string, number | string>): string {
  return tUi(uiLanguage.value, key, params)
}
const sidebarSearchQuery = ref('')
const isSidebarSearchVisible = ref(false)
const sidebarSearchInputRef = ref<HTMLInputElement | null>(null)
type PreviewPanelState =
  | { kind: 'file'; payload: FilePreviewPayload }
  | { kind: 'diff'; path: string; diff: string; additions: number; deletions: number }
  | { kind: 'workspace'; cwd: string; changes: UiTurnFileChanges; expandedPaths: Record<string, boolean> }

type RenderableDiffLine = {
  kind: 'add' | 'del' | 'ctx'
  oldLine: number | null
  newLine: number | null
  text: string
}
type RenderableCodeLine = {
  kind: 'add' | 'del' | 'ctx'
  oldLine: number | null
  newLine: number | null
  html: string
}
const previewPanel = ref<PreviewPanelState | null>(null)
const workspaceDiffTotals = ref({ additions: 0, deletions: 0 })

const routeThreadId = computed(() => {
  const rawThreadId = route.params.threadId
  return typeof rawThreadId === 'string' ? rawThreadId : ''
})

const knownThreadIdSet = computed(() => {
  const ids = new Set<string>()
  for (const group of projectGroups.value) {
    for (const thread of group.threads) {
      ids.add(thread.id)
    }
  }
  return ids
})

const isHomeRoute = computed(() => route.name === 'home')
const contentTitle = computed(() => {
  if (isHomeRoute.value) return t('app.newThread')
  return selectedThread.value?.title ?? t('app.chooseThread')
})
const autoRefreshButtonLabel = computed(() =>
  isAutoRefreshEnabled.value
    ? t('app.autoRefreshIn', { seconds: autoRefreshSecondsLeft.value })
    : t('app.enableAutoRefresh'),
)
const themeToggleLabel = computed(() => {
  if (uiTheme.value === 'light') return t('app.themeLight')
  if (uiTheme.value === 'dark') return t('app.themeDark')
  return t('app.themeAuto')
})
const languageToggleLabel = computed(() =>
  uiLanguage.value === 'zh' ? t('app.languageChinese') : t('app.languageEnglish'),
)
const languageToggleMark = computed(() =>
  uiLanguage.value === 'zh' ? '中' : 'EN',
)
function normalizeActivityText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, ' ')
}
function isTransientActivityText(value: string): boolean {
  const normalized = normalizeActivityText(value)
  return normalized === 'thinking' || normalized === 'writing response' || normalized === 'waiting response'
}
const liveOverlay = computed(() => selectedLiveOverlay.value)
const thinkingIndicatorLabel = computed(() => {
  const activityLabel = normalizeActivityText(liveOverlay.value?.activityLabel ?? '')
  if (activityLabel === 'writing response') {
    return t('app.aiGenerating')
  }
  return t('app.aiThinking')
})
const thinkingIndicatorDetail = computed(() => {
  const overlay = liveOverlay.value
  if (!overlay) return ''
  if (overlay.reasoningText) return overlay.reasoningText
  const details = overlay.activityDetails.filter((item) =>
    item.trim().length > 0 && !isTransientActivityText(item),
  )
  if (details.length > 0) return details.join(' · ')
  if (overlay.activityLabel && !isTransientActivityText(overlay.activityLabel)) {
    return overlay.activityLabel
  }
  return ''
})
const isThinkingIndicatorVisible = computed(() =>
  !isHomeRoute.value && (isSelectedThreadInProgress.value || isSendingMessage.value || liveOverlay.value !== null),
)
const filteredMessages = computed(() =>
  messages.value.filter((message) => {
    const type = normalizeMessageType(message.messageType, message.role)
    if (type === 'worked') return true
    if (type === 'turnActivity.live' || type === 'turnError.live' || type === 'agentReasoning.live') return false
    return true
  }),
)
const composerThreadContextId = computed(() => (isHomeRoute.value ? '__new-thread__' : selectedThreadId.value))
const isSelectedThreadInProgress = computed(() => !isHomeRoute.value && selectedThread.value?.inProgress === true)
const canOpenWorkspaceDiff = computed(() => {
  if (isHomeRoute.value) return false
  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  return cwd.length > 0
})
const highlightedPreviewHtml = computed(() => {
  const preview = previewPanel.value
  if (!preview) return ''
  if (preview.kind === 'workspace' || preview.kind === 'file') return ''

  const content = preview.diff
  const language = 'diff'
  if (language) {
    try {
      return hljs.highlight(content, {
        language,
        ignoreIllegals: true,
      }).value
    } catch {
      return hljs.highlightAuto(content).value
    }
  }

  return hljs.highlightAuto(content).value
})
const renderableFilePreviewLines = computed<RenderableCodeLine[]>(() => {
  const preview = previewPanel.value
  if (!preview || preview.kind !== 'file') return []

  const content = preview.payload.content
  const plainLines = content.split('\n')
  const language = detectHighlightLanguage(preview.payload.path)
  const highlightedLines = highlightCodeByLines(content, language)
  const change = findTurnFileChangeByPath(preview.payload.path)

  if (!change || !change.diff) {
    return highlightedLines.map((lineHtml, index) => ({
      kind: 'ctx',
      oldLine: index + 1,
      newLine: null,
      html: lineHtml,
    }))
  }

  const annotations = buildFileDiffAnnotations(change.diff)
  const rendered: RenderableCodeLine[] = []

  for (let i = 0; i < plainLines.length; i += 1) {
    const lineNo = i + 1
    const deletedBefore = annotations.deletionsByNewPos.get(lineNo) ?? []
    for (const deleted of deletedBefore) {
      rendered.push({
        kind: 'del',
        oldLine: deleted.oldLine,
        newLine: null,
        html: highlightSingleLine(deleted.text, language),
      })
    }

    const isAdded = annotations.addedNewLines.has(lineNo)
    rendered.push({
      kind: isAdded ? 'add' : 'ctx',
      oldLine: isAdded ? null : lineNo,
      newLine: lineNo,
      html: highlightedLines[i] ?? '',
    })
  }

  const eofDeletions = annotations.deletionsByNewPos.get(plainLines.length + 1) ?? []
  for (const deleted of eofDeletions) {
    rendered.push({
      kind: 'del',
      oldLine: deleted.oldLine,
      newLine: null,
      html: highlightSingleLine(deleted.text, language),
    })
  }

  return rendered
})
const filePreviewHasDiff = computed(() => {
  const preview = previewPanel.value
  if (!preview || preview.kind !== 'file') return false
  const change = findTurnFileChangeByPath(preview.payload.path)
  return Boolean(change && change.diff && change.diff.trim().length > 0)
})
const previewPanelTitle = computed(() => {
  const preview = previewPanel.value
  if (!preview) return ''
  if (preview.kind === 'workspace') return '完整 Diff'
  if (preview.kind === 'diff') return `${formatDisplayPath(preview.path, selectedThread.value?.cwd ?? '')} (diff)`
  return formatDisplayPath(preview.payload.path, selectedThread.value?.cwd ?? '')
})
const previewPanelSubtitle = computed(() => {
  const preview = previewPanel.value
  if (!preview) return ''
  if (preview.kind === 'workspace') {
    return `${preview.changes.files.length} 个文件 +${preview.changes.totalAdditions} -${preview.changes.totalDeletions}`
  }
  if (preview.kind === 'diff') {
    if (preview.additions === 0 && preview.deletions === 0) return ''
    return `+${preview.additions} -${preview.deletions}`
  }
  return preview.payload.line ? `Line ${preview.payload.line}` : ''
})
const newThreadFolderOptions = computed(() => {
  const options: Array<{ value: string; label: string }> = []
  const seenCwds = new Set<string>()

  for (const group of projectGroups.value) {
    const cwd = group.threads[0]?.cwd?.trim() ?? ''
    if (!cwd || seenCwds.has(cwd)) continue
    seenCwds.add(cwd)
    options.push({
      value: cwd,
      label: projectDisplayNameById.value[group.projectName] ?? group.projectName,
    })
  }

  return options
})

onMounted(() => {
  window.addEventListener('keydown', onWindowKeyDown)
  applyThemeMode(uiTheme.value)
  setupSystemThemeSync()
  void initialize()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onWindowKeyDown)
  cleanupSystemThemeSync()
  stopPolling()
})

function toggleSidebarSearch(): void {
  isSidebarSearchVisible.value = !isSidebarSearchVisible.value
  if (isSidebarSearchVisible.value) {
    nextTick(() => sidebarSearchInputRef.value?.focus())
  } else {
    sidebarSearchQuery.value = ''
  }
}

function clearSidebarSearch(): void {
  sidebarSearchQuery.value = ''
  sidebarSearchInputRef.value?.focus()
}

function onSidebarSearchKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    isSidebarSearchVisible.value = false
    sidebarSearchQuery.value = ''
  }
}

function onSelectThread(threadId: string): void {
  if (!threadId) return
  if (route.name === 'thread' && routeThreadId.value === threadId) return
  void router.push({ name: 'thread', params: { threadId } })
}

function onArchiveThread(threadId: string): void {
  void archiveThreadById(threadId)
}

function onStartNewThread(projectName: string): void {
  const projectGroup = projectGroups.value.find((group) => group.projectName === projectName)
  const projectCwd = projectGroup?.threads[0]?.cwd?.trim() ?? ''
  if (projectCwd) {
    newThreadCwd.value = projectCwd
  }
  if (isHomeRoute.value) return
  void router.push({ name: 'home' })
}

function onStartNewThreadFromToolbar(): void {
  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  if (cwd) {
    newThreadCwd.value = cwd
  }
  if (isHomeRoute.value) return
  void router.push({ name: 'home' })
}

function onRenameProject(payload: { projectName: string; displayName: string }): void {
  renameProject(payload.projectName, payload.displayName)
}

function onRemoveProject(projectName: string): void {
  removeProject(projectName)
}

function onReorderProject(payload: { projectName: string; toIndex: number }): void {
  reorderProject(payload.projectName, payload.toIndex)
}

function onUpdateThreadScrollState(payload: { threadId: string; state: ThreadScrollState }): void {
  setThreadScrollState(payload.threadId, payload.state)
}

function onRespondServerRequest(payload: { id: number; result?: unknown; error?: { code?: number; message: string } }): void {
  void respondToPendingServerRequest(payload)
}

function onToggleAutoRefreshTimer(): void {
  toggleAutoRefreshTimer()
}

function cycleThemeMode(): void {
  const order: ThemeMode[] = ['light', 'dark', 'auto']
  const index = order.indexOf(uiTheme.value)
  uiTheme.value = order[(index + 1) % order.length]
}

function toggleUiLanguage(): void {
  uiLanguage.value = uiLanguage.value === 'zh' ? 'en' : 'zh'
}

function setSidebarCollapsed(nextValue: boolean): void {
  if (isSidebarCollapsed.value === nextValue) return
  isSidebarCollapsed.value = nextValue
  saveSidebarCollapsed(nextValue)
}

function onWindowKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return
  if (!event.ctrlKey && !event.metaKey) return
  if (event.shiftKey || event.altKey) return
  if (event.key.toLowerCase() !== 'b') return
  event.preventDefault()
  setSidebarCollapsed(!isSidebarCollapsed.value)
}

function onSubmitThreadMessage(text: string): void {
  if (isHomeRoute.value) {
    void submitFirstMessageForNewThread(text)
    return
  }
  void sendMessageToSelectedThread(text)
}

function onSelectNewThreadFolder(cwd: string): void {
  newThreadCwd.value = cwd.trim()
}

function onSelectModel(modelId: string): void {
  setSelectedModelId(modelId)
}

function onSelectReasoningEffort(effort: ReasoningEffort | ''): void {
  setSelectedReasoningEffort(effort)
}

function onInterruptTurn(): void {
  void interruptSelectedThreadTurn()
}

function normalizePathSeparators(pathValue: string): string {
  return pathValue.replace(/\\/gu, '/')
}

function stripTrailingSlash(pathValue: string): string {
  if (!pathValue) return pathValue
  if (pathValue === '/') return pathValue
  return pathValue.replace(/\/+$/u, '')
}

function getBasename(pathValue: string): string {
  const normalized = normalizePathSeparators(pathValue)
  const name = normalized.split('/').filter(Boolean).pop()
  return name || pathValue
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
}

function highlightCodeByLines(content: string, language: string | null): string[] {
  let highlighted = ''
  if (language) {
    try {
      highlighted = hljs.highlight(content, {
        language,
        ignoreIllegals: true,
      }).value
    } catch {
      highlighted = hljs.highlightAuto(content).value
    }
  } else {
    highlighted = hljs.highlightAuto(content).value
  }
  return highlighted.split('\n')
}

function highlightSingleLine(text: string, language: string | null): string {
  if (!text) return ''
  if (language) {
    try {
      return hljs.highlight(text, {
        language,
        ignoreIllegals: true,
      }).value
    } catch {
      return escapeHtml(text)
    }
  }
  return escapeHtml(text)
}

function collapsePathSegments(pathValue: string): string {
  const normalized = normalizePathSeparators(pathValue.trim())
  if (!normalized) return ''

  const isWindowsAbs = /^[A-Za-z]:\//u.test(normalized)
  const isUnixAbs = normalized.startsWith('/')
  const hasRoot = isWindowsAbs || isUnixAbs

  const rawParts = normalized.split('/')
  const parts: string[] = []
  for (const part of rawParts) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (parts.length > 0 && parts[parts.length - 1] !== '..') {
        parts.pop()
      } else if (!hasRoot) {
        parts.push('..')
      }
      continue
    }
    parts.push(part)
  }

  if (isWindowsAbs) {
    const drive = rawParts[0] ?? ''
    const rest = parts.filter((part) => part.toLowerCase() !== drive.toLowerCase())
    return `${drive}/${rest.join('/')}`.replace(/\/+$/u, '')
  }

  if (isUnixAbs) {
    return `/${parts.join('/')}`.replace(/\/+$/u, '') || '/'
  }

  return parts.join('/')
}

function resolvePathWithCwd(pathValue: string, cwd: string): string {
  const target = normalizePathSeparators(pathValue.trim())
  if (!target) return ''
  if (target.startsWith('/') || /^[A-Za-z]:\//u.test(target)) {
    return collapsePathSegments(target)
  }

  const base = collapsePathSegments(cwd)
  if (!base) return collapsePathSegments(target)
  return collapsePathSegments(`${base}/${target}`)
}

function normalizePathForMatch(pathValue: string, cwd: string): string {
  const resolved = resolvePathWithCwd(pathValue, cwd)
  if (!resolved) return ''
  return resolved.toLowerCase()
}

function findTurnFileChangeByPath(pathValue: string): UiTurnFileChanges['files'][number] | null {
  const fileChanges = selectedThreadFileChanges.value
  if (!fileChanges || fileChanges.files.length === 0) return null

  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  const target = normalizePathForMatch(pathValue, cwd)
  if (!target) return null

  for (const change of fileChanges.files) {
    const candidate = normalizePathForMatch(change.path, cwd)
    if (candidate && candidate === target) return change
  }

  const normalizedTargetPath = normalizePathSeparators(pathValue.trim()).toLowerCase()
  const targetBase = getBasename(normalizedTargetPath)
  for (const change of fileChanges.files) {
    const candidateRaw = normalizePathSeparators(change.path.trim()).toLowerCase()
    if (!candidateRaw) continue
    if (candidateRaw.endsWith(`/${normalizedTargetPath}`) || candidateRaw === normalizedTargetPath) {
      return change
    }
    if (getBasename(candidateRaw) === targetBase) {
      return change
    }
  }
  return null
}

function buildFileDiffAnnotations(diff: string): {
  addedNewLines: Set<number>
  deletionsByNewPos: Map<number, Array<{ oldLine: number; text: string }>>
} {
  const addedNewLines = new Set<number>()
  const deletionsByNewPos = new Map<number, Array<{ oldLine: number; text: string }>>()
  const lines = diff.split('\n')

  let oldLine = 0
  let newLine = 0
  let inHunk = false

  for (const rawLine of lines) {
    if (
      rawLine.startsWith('diff --git ') ||
      rawLine.startsWith('index ') ||
      rawLine.startsWith('--- ') ||
      rawLine.startsWith('+++ ')
    ) {
      continue
    }

    if (rawLine.startsWith('@@')) {
      const match = rawLine.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/u)
      if (match) {
        oldLine = Number.parseInt(match[1], 10)
        newLine = Number.parseInt(match[2], 10)
        inHunk = true
      }
      continue
    }

    if (!inHunk) continue
    if (rawLine.startsWith('\\ No newline at end of file')) continue

    const marker = rawLine[0] ?? ' '
    const content = rawLine.length > 0 ? rawLine.slice(1) : ''

    if (marker === '+') {
      addedNewLines.add(newLine)
      newLine += 1
      continue
    }

    if (marker === '-') {
      const existing = deletionsByNewPos.get(newLine) ?? []
      existing.push({ oldLine, text: content })
      deletionsByNewPos.set(newLine, existing)
      oldLine += 1
      continue
    }

    oldLine += 1
    newLine += 1
  }

  return { addedNewLines, deletionsByNewPos }
}

function formatDisplayPath(pathValue: string, cwd: string): string {
  const target = normalizePathSeparators(pathValue.trim())
  if (!target) return pathValue
  if (target.startsWith('./')) return target.slice(2)
  if (target.startsWith('../')) return target

  const normalizedCwd = stripTrailingSlash(normalizePathSeparators(cwd.trim()))
  if (normalizedCwd) {
    const lowerTarget = target.toLowerCase()
    const lowerCwd = normalizedCwd.toLowerCase()
    const prefix = `${lowerCwd}/`
    if (lowerTarget.startsWith(prefix)) {
      return target.slice(normalizedCwd.length + 1)
    }
  }

  const isAbsolute = target.startsWith('/') || /^[A-Za-z]:\//u.test(target)
  return isAbsolute ? getBasename(target) : target
}

function detectHighlightLanguage(path: string): string | null {
  const lowerPath = path.trim().toLowerCase()
  if (!lowerPath) return null

  if (lowerPath.endsWith('.ts') || lowerPath.endsWith('.tsx')) return 'typescript'
  if (lowerPath.endsWith('.js') || lowerPath.endsWith('.jsx') || lowerPath.endsWith('.mjs') || lowerPath.endsWith('.cjs')) return 'javascript'
  if (lowerPath.endsWith('.vue')) return 'xml'
  if (lowerPath.endsWith('.py')) return 'python'
  if (lowerPath.endsWith('.java')) return 'java'
  if (lowerPath.endsWith('.scala')) return 'scala'
  if (lowerPath.endsWith('.go')) return 'go'
  if (lowerPath.endsWith('.rs')) return 'rust'
  if (lowerPath.endsWith('.rb')) return 'ruby'
  if (lowerPath.endsWith('.php')) return 'php'
  if (lowerPath.endsWith('.json')) return 'json'
  if (lowerPath.endsWith('.yaml') || lowerPath.endsWith('.yml')) return 'yaml'
  if (lowerPath.endsWith('.toml')) return 'ini'
  if (lowerPath.endsWith('.md')) return 'markdown'
  if (lowerPath.endsWith('.sql')) return 'sql'
  if (lowerPath.endsWith('.sh') || lowerPath.endsWith('.bash') || lowerPath.endsWith('.zsh')) return 'bash'
  if (lowerPath.endsWith('.html') || lowerPath.endsWith('.xml')) return 'xml'
  if (lowerPath.endsWith('.css') || lowerPath.endsWith('.scss')) return 'css'
  return null
}

async function onOpenFileReference(payload: { path: string; line: number | null }): Promise<void> {
  const matchedDiff = findTurnFileChangeByPath(payload.path)
  if (matchedDiff) {
    onOpenFileDiff({
      path: matchedDiff.path,
      diff: matchedDiff.diff,
      additions: matchedDiff.additions,
      deletions: matchedDiff.deletions,
    })
    return
  }

  try {
    const resolved = await fetchFilePreview(payload.path, payload.line)
    previewPanel.value = { kind: 'file', payload: resolved }
  } catch {
    previewPanel.value = null
  }
}

function onCloseFilePreview(): void {
  previewPanel.value = null
}

function onOpenFileDiff(payload: { path: string; diff: string; additions: number; deletions: number }): void {
  previewPanel.value = {
    kind: 'diff',
    path: payload.path,
    diff: payload.diff || '',
    additions: payload.additions,
    deletions: payload.deletions,
  }
}

async function onOpenWorkspaceDiff(): Promise<void> {
  if (previewPanel.value?.kind === 'workspace') {
    previewPanel.value = null
    return
  }

  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  if (!cwd) return
  try {
    const changes = await fetchWorkspaceChanges(cwd)
    const normalizedChanges: UiTurnFileChanges = changes ?? {
      turnId: '__workspace__',
      files: [],
      totalAdditions: 0,
      totalDeletions: 0,
    }
    const expandedPaths: Record<string, boolean> = {}
    if (normalizedChanges.files.length > 0) {
      expandedPaths[normalizedChanges.files[0].path] = true
    }
    previewPanel.value = {
      kind: 'workspace',
      cwd,
      changes: normalizedChanges,
      expandedPaths,
    }
  } catch {
    previewPanel.value = null
  }
}

function buildRenderableDiffLines(diff: string): RenderableDiffLine[] {
  const lines = diff.split('\n')
  const rendered: RenderableDiffLine[] = []

  let oldLine = 0
  let newLine = 0
  let inHunk = false

  for (const rawLine of lines) {
    if (
      rawLine.startsWith('diff --git ') ||
      rawLine.startsWith('index ') ||
      rawLine.startsWith('--- ') ||
      rawLine.startsWith('+++ ')
    ) {
      continue
    }

    if (rawLine.startsWith('@@')) {
      const match = rawLine.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/u)
      if (match) {
        oldLine = Number.parseInt(match[1], 10)
        newLine = Number.parseInt(match[2], 10)
        inHunk = true
      }
      continue
    }

    if (!inHunk) continue
    if (rawLine.startsWith('\\ No newline at end of file')) continue

    const marker = rawLine[0] ?? ' '
    const content = rawLine.length > 0 ? rawLine.slice(1) : ''

    if (marker === '+') {
      rendered.push({
        kind: 'add',
        oldLine: null,
        newLine,
        text: content,
      })
      newLine += 1
      continue
    }

    if (marker === '-') {
      rendered.push({
        kind: 'del',
        oldLine,
        newLine: null,
        text: content,
      })
      oldLine += 1
      continue
    }

    rendered.push({
      kind: 'ctx',
      oldLine,
      newLine,
      text: marker === ' ' ? content : rawLine,
    })
    oldLine += 1
    newLine += 1
  }

  return rendered
}

function isWorkspaceDiffFileExpanded(path: string): boolean {
  const panel = previewPanel.value
  if (!panel || panel.kind !== 'workspace') return false
  return panel.expandedPaths[path] === true
}

function toggleWorkspaceDiffFile(path: string): void {
  const panel = previewPanel.value
  if (!panel || panel.kind !== 'workspace') return
  panel.expandedPaths[path] = panel.expandedPaths[path] !== true
}

async function refreshWorkspaceDiffTotals(): Promise<void> {
  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  if (!cwd) {
    workspaceDiffTotals.value = { additions: 0, deletions: 0 }
    return
  }
  try {
    const changes = await fetchWorkspaceChanges(cwd)
    if (!changes) {
      workspaceDiffTotals.value = { additions: 0, deletions: 0 }
      return
    }
    workspaceDiffTotals.value = {
      additions: changes.totalAdditions,
      deletions: changes.totalDeletions,
    }
  } catch {
    workspaceDiffTotals.value = { additions: 0, deletions: 0 }
  }
}

function loadSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1'
}

function loadUiTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'auto'
  const raw = window.localStorage.getItem(UI_THEME_STORAGE_KEY)
  return raw === 'light' || raw === 'dark' || raw === 'auto' ? raw : 'auto'
}

function loadUiLanguage(): UiLanguage {
  if (typeof window === 'undefined') return 'zh'
  const raw = window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY)
  return raw === 'en' ? 'en' : 'zh'
}

function saveSidebarCollapsed(value: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, value ? '1' : '0')
}

function saveUiTheme(value: ThemeMode): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(UI_THEME_STORAGE_KEY, value)
}

function saveUiLanguage(value: UiLanguage): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, value)
}

function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', resolveThemeMode(mode))
}

let cleanupSystemThemeSync = () => {}
function setupSystemThemeSync(): void {
  if (typeof window === 'undefined') return
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (uiTheme.value !== 'auto') return
    applyThemeMode('auto')
  }
  media.addEventListener('change', onChange)
  cleanupSystemThemeSync = () => {
    media.removeEventListener('change', onChange)
    cleanupSystemThemeSync = () => {}
  }
}

function normalizeMessageType(rawType: string | undefined, role: string): string {
  const normalized = (rawType ?? '').trim()
  if (normalized.length > 0) {
    return normalized
  }
  return role.trim() || 'message'
}

async function initialize(): Promise<void> {
  await refreshAll()
  hasInitialized.value = true
  await syncThreadSelectionWithRoute()
  await refreshWorkspaceDiffTotals()
  startPolling()
}

async function syncThreadSelectionWithRoute(): Promise<void> {
  if (isRouteSyncInProgress.value) return
  isRouteSyncInProgress.value = true

  try {
    if (route.name === 'home') {
      if (selectedThreadId.value !== '') {
        await selectThread('')
      }
      return
    }

    if (route.name === 'thread') {
      const threadId = routeThreadId.value
      if (!threadId) return

      if (!knownThreadIdSet.value.has(threadId)) {
        await router.replace({ name: 'home' })
        return
      }

      if (selectedThreadId.value !== threadId) {
        await selectThread(threadId)
      }
      return
    }

  } finally {
    isRouteSyncInProgress.value = false
  }
}

watch(
  () =>
    [
      route.name,
      routeThreadId.value,
      isLoadingThreads.value,
      knownThreadIdSet.value.has(routeThreadId.value),
      selectedThreadId.value,
    ] as const,
  async () => {
    if (!hasInitialized.value) return
    await syncThreadSelectionWithRoute()
  },
)

watch(
  () => selectedThreadId.value,
  async (threadId) => {
    if (!hasInitialized.value) return
    if (isRouteSyncInProgress.value) return
    if (isHomeRoute.value) return

    if (!threadId) {
      if (route.name !== 'home') {
        await router.replace({ name: 'home' })
      }
      return
    }

    if (route.name === 'thread' && routeThreadId.value === threadId) return
    await router.replace({ name: 'thread', params: { threadId } })
  },
)

watch(
  () => selectedThreadId.value,
  () => {
    previewPanel.value = null
    void refreshWorkspaceDiffTotals()
  },
)

watch(
  () => uiTheme.value,
  (mode) => {
    saveUiTheme(mode)
    applyThemeMode(mode)
  },
)

watch(
  () => uiLanguage.value,
  (language) => {
    saveUiLanguage(language)
  },
)

watch(
  () => selectedThreadFileChanges.value?.turnId ?? '',
  () => {
    void refreshWorkspaceDiffTotals()
  },
)

watch(
  () => newThreadFolderOptions.value,
  (options) => {
    if (options.length === 0) {
      newThreadCwd.value = ''
      return
    }
    const hasSelected = options.some((option) => option.value === newThreadCwd.value)
    if (!hasSelected) {
      newThreadCwd.value = options[0].value
    }
  },
  { immediate: true },
)

async function submitFirstMessageForNewThread(text: string): Promise<void> {
  try {
    const threadId = await sendMessageToNewThread(text, newThreadCwd.value)
    if (!threadId) return
    await router.replace({ name: 'thread', params: { threadId } })
  } catch {
    // Error is already reflected in state.
  }
}
</script>

<style scoped>
@reference "tailwindcss";

.sidebar-root {
  @apply min-h-full py-4 px-2 flex flex-col gap-2 select-none;
}

.sidebar-root input,
.sidebar-root textarea {
  @apply select-text;
}

.content-root {
  @apply h-full min-h-0 w-full flex flex-col overflow-y-hidden overflow-x-visible bg-white;
}

.sidebar-thread-controls-host {
  @apply mt-1 -translate-y-px px-2 pb-1;
}

.sidebar-search-toggle {
  @apply h-6.75 w-6.75 rounded-md border border-transparent bg-transparent text-zinc-600 flex items-center justify-center transition hover:border-zinc-200 hover:bg-zinc-50;
}

.sidebar-search-toggle[aria-pressed='true'] {
  @apply border-zinc-300 bg-zinc-100 text-zinc-700;
}

.sidebar-search-toggle-icon {
  @apply w-4 h-4;
}

.sidebar-search-bar {
  @apply flex items-center gap-1.5 mx-2 px-2 py-1 rounded-md border border-zinc-200 bg-white transition-colors focus-within:border-zinc-400;
}

.sidebar-search-bar-icon {
  @apply w-3.5 h-3.5 text-zinc-400 shrink-0;
}

.sidebar-search-input {
  @apply flex-1 min-w-0 bg-transparent text-sm text-zinc-800 placeholder-zinc-400 outline-none border-none p-0;
}

.sidebar-search-clear {
  @apply w-4 h-4 rounded text-zinc-400 flex items-center justify-center transition hover:text-zinc-600;
}

.sidebar-search-clear-icon {
  @apply w-3.5 h-3.5;
}

.sidebar-footer-actions {
  @apply mt-auto px-2 pb-1 pt-2 flex items-center justify-start gap-1;
}

.sidebar-footer-button {
  @apply h-7 w-7 rounded-md border border-transparent bg-transparent text-zinc-600 flex items-center justify-center transition hover:bg-zinc-100 hover:text-zinc-800;
}

.sidebar-footer-button-icon {
  @apply w-4 h-4;
}

.sidebar-footer-language-mark {
  @apply text-[10px] leading-none font-medium tracking-tight;
}

.sidebar-thread-controls-header-host {
  @apply ml-1;
}

.content-header-diff-chip {
  @apply h-8 rounded-full border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-700 inline-flex items-center gap-1.5 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50;
}

.content-header-diff-icon {
  @apply inline-flex h-5 w-5 items-center justify-center rounded-md border border-zinc-400 text-sm leading-none text-zinc-600;
}

.content-header-diff-add {
  @apply text-[#16a34a] font-semibold;
}

.content-header-diff-del {
  @apply text-[#ef4444] font-semibold;
}

.content-body {
  @apply flex-1 min-h-0 w-full flex flex-col gap-3 pt-1 pb-4 overflow-y-hidden overflow-x-visible;
}

.content-error {
  @apply m-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700;
}

.content-grid {
  @apply flex-1 min-h-0 flex flex-col gap-3;
}

.content-thread {
  @apply flex-1 min-h-0;
}

.content-composer-row {
  @apply min-h-0 flex flex-col gap-2;
}

.content-thinking-indicator {
  @apply w-full max-w-175 mx-auto px-6 text-sm text-zinc-500 inline-flex flex-col items-start gap-0.5;
}

.content-thinking-indicator-main {
  @apply inline-flex items-center gap-1.5;
}

.content-thinking-indicator-label {
  @apply leading-5;
}

.content-thinking-indicator-dots {
  @apply inline-flex items-center gap-1;
}

.content-thinking-indicator-dot {
  @apply h-1.5 w-1.5 rounded-full bg-zinc-400;
  animation: thinking-dot-pulse 1.2s ease-in-out infinite;
}

.content-thinking-indicator-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.content-thinking-indicator-dot:nth-child(3) {
  animation-delay: 0.3s;
}

.content-thinking-indicator-detail {
  @apply text-xs leading-4 text-zinc-400 whitespace-pre-wrap;
}

@keyframes thinking-dot-pulse {
  0%, 70%, 100% {
    opacity: 0.2;
    transform: translateY(0);
  }

  35% {
    opacity: 1;
    transform: translateY(-1px);
  }
}

.content-grid-thread {
  @apply flex-row items-stretch;
}

.content-grid-thread .content-thread {
  @apply min-w-0;
}

.content-grid-thread-has-preview .content-thread {
  @apply basis-[58%];
}

.content-code-preview {
  @apply min-h-0 min-w-0 w-[42%] rounded-xl border border-zinc-200 bg-zinc-50 flex flex-col overflow-hidden;
}

.content-code-preview-header {
  @apply px-3 py-2 border-b border-zinc-200 bg-white flex items-start justify-between gap-2;
}

.content-code-preview-title-wrap {
  @apply min-w-0;
}

.content-code-preview-title {
  @apply m-0 text-xs leading-5 text-zinc-800 truncate;
}

.content-code-preview-subtitle {
  @apply m-0 text-[11px] leading-4 text-zinc-500;
}

.content-code-preview-close {
  @apply h-6 w-6 rounded-md border border-transparent bg-transparent text-zinc-500 flex items-center justify-center hover:border-zinc-200 hover:bg-zinc-100;
}

.content-code-preview-close-icon {
  @apply h-4 w-4;
}

.content-code-preview-body {
  @apply m-0 flex-1 min-h-0 overflow-auto px-2 py-1.5 text-[11px] leading-4 text-zinc-800 bg-zinc-50;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.content-code-preview-code {
  @apply block whitespace-pre;
}

.code-lines {
  @apply flex flex-col min-w-full;
}

.code-line-text {
  @apply px-2 text-xs leading-5 text-zinc-800 whitespace-pre;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.workspace-diff-panel {
  @apply m-0 flex-1 min-h-0 overflow-auto bg-zinc-50;
}

.workspace-diff-list {
  @apply list-none m-0 p-0;
}

.workspace-diff-item {
  @apply border-b border-zinc-200 last:border-b-0;
}

.workspace-diff-item-button {
  @apply w-full px-2.5 py-1.5 text-left bg-zinc-100 hover:bg-zinc-200 transition flex items-center justify-between gap-3;
}

.workspace-diff-item-path {
  @apply text-[11px] leading-4 text-zinc-800 truncate;
}

.workspace-diff-item-stats {
  @apply inline-flex items-center gap-2 shrink-0;
}

.workspace-diff-item-body {
  @apply m-0 border-t border-zinc-200 px-2 py-1.5 overflow-auto text-[11px] leading-4 bg-zinc-50;
}

.diff-lines {
  @apply flex flex-col min-w-full;
}

.diff-line {
  @apply grid items-start;
  grid-template-columns: 44px 44px minmax(0, 1fr);
}

.code-line-single {
  grid-template-columns: 44px minmax(0, 1fr);
}

.diff-line-add {
  @apply bg-emerald-50;
}

.diff-line-del {
  @apply bg-rose-50;
}

.diff-line-ctx {
  @apply bg-transparent;
}

.diff-ln-old,
.diff-ln-new {
  @apply text-right pr-1.5 text-[10px] leading-4 text-zinc-500 select-none border-r border-zinc-200;
}

.diff-line-add .diff-ln-new {
  @apply text-emerald-700;
}

.diff-line-del .diff-ln-old {
  @apply text-rose-700;
}

.diff-line-text {
  @apply px-1.5 text-[11px] leading-4 text-zinc-800 whitespace-pre;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

@media (max-width: 1100px) {
  .content-grid-thread {
    @apply flex-col;
  }

  .content-grid-thread-has-preview .content-thread {
    @apply basis-auto;
  }

  .content-code-preview {
    @apply w-full h-64;
  }
}

.new-thread-empty {
  @apply flex-1 min-h-0 flex flex-col items-center justify-center gap-0.5 px-6;
}

.new-thread-hero {
  @apply m-0 text-[2.5rem] font-normal leading-[1.05] text-zinc-900;
}

.new-thread-folder-dropdown {
  @apply text-[2.5rem] text-zinc-500;
}

.new-thread-folder-dropdown :deep(.composer-dropdown-trigger) {
  @apply h-auto text-[2.5rem] leading-[1.05];
}

.new-thread-folder-dropdown :deep(.composer-dropdown-value) {
  @apply leading-[1.05];
}

.new-thread-folder-dropdown :deep(.composer-dropdown-chevron) {
  @apply h-5 w-5 mt-0;
}

</style>
