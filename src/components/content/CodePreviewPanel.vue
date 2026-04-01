<template>
  <aside class="content-code-preview">
    <header class="content-code-preview-header">
      <div class="content-code-preview-title-wrap">
        <p class="content-code-preview-title">{{ panelTitle }}</p>
        <p v-if="panelSubtitle" class="content-code-preview-subtitle">{{ panelSubtitle }}</p>
      </div>
      <button
        class="content-code-preview-close"
        type="button"
        :aria-label="closeLabel"
        @click="emit('close')"
      >
        <IconTablerX class="content-code-preview-close-icon" />
      </button>
    </header>
    <section v-if="panel.kind === 'workspace'" class="workspace-diff-panel">
      <div class="workspace-diff-mode-tabs" role="tablist" aria-label="Workspace diff modes">
        <button
          v-for="mode in workspaceDiffModes"
          :key="mode"
          type="button"
          class="workspace-diff-mode-tab"
          :class="{ 'is-active': panel.snapshot.mode === mode }"
          @click="emit('change-workspace-mode', mode)"
        >
          {{ getWorkspaceModeLabel(mode) }}
        </button>
      </div>
      <div class="workspace-diff-mode-meta">
        <p class="workspace-diff-mode-description">{{ workspaceModeDescription }}</p>
        <p v-if="workspaceModeRefs" class="workspace-diff-mode-refs">{{ workspaceModeRefs }}</p>
      </div>
      <p v-if="panel.snapshot.warning" class="workspace-diff-warning">{{ panel.snapshot.warning }}</p>
      <p v-if="panel.snapshot.files.length === 0" class="workspace-diff-empty">
        {{ workspaceEmptyMessage }}
      </p>
      <ul class="workspace-diff-list">
        <li v-for="change in panel.snapshot.files" :key="`workspace:${panel.snapshot.mode}:${change.path}`" class="workspace-diff-item">
          <button
            type="button"
            class="workspace-diff-item-button"
            @click="toggleWorkspaceDiffFile(change.path)"
          >
            <span class="workspace-diff-item-path">{{ formatDisplayPath(change.path, panel.cwd) }}</span>
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
    <pre v-else-if="panel.kind === 'diff'" class="content-code-preview-body">
      <div class="diff-lines">
        <div
          v-for="(line, index) in buildRenderableDiffLines(panel.diff)"
          :key="`pdiff:${panel.path}:${index}`"
          class="diff-line"
          :class="`diff-line-${line.kind}`"
        >
          <span class="diff-ln-old">{{ line.oldLine ?? '' }}</span>
          <span class="diff-ln-new">{{ line.newLine ?? '' }}</span>
          <span class="diff-line-text">{{ line.text }}</span>
        </div>
      </div>
    </pre>
    <pre v-else-if="panel.kind === 'file'" class="content-code-preview-body">
      <div class="code-lines">
        <div
          v-for="(line, index) in renderableFilePreviewLines"
          :key="`fline:${panel.payload.path}:${index}:${line.oldLine ?? 'n'}:${line.newLine ?? 'n'}`"
          class="diff-line"
          :class="[ `diff-line-${line.kind}`, hasDiff ? '' : 'code-line-single' ]"
        >
          <span class="diff-ln-old">{{ line.oldLine ?? '' }}</span>
          <span v-if="hasDiff" class="diff-ln-new">{{ line.newLine ?? '' }}</span>
          <span class="hljs code-line-text" v-html="line.html || '&nbsp;'"></span>
        </div>
      </div>
    </pre>
    <pre v-else class="content-code-preview-body"><code class="hljs content-code-preview-code" v-html="highlightedPreviewHtml"></code></pre>
  </aside>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { UiChangedFile, UiWorkspaceDiffMode, UiWorkspaceDiffSnapshot } from '../../types/codex'
import type { FilePreviewPayload } from '../../api/codexGateway'
import { formatDisplayPath } from '../../utils/pathUtils'
import IconTablerX from '../icons/IconTablerX.vue'
import { tUi, type UiLanguage } from '../../i18n/uiText'
import hljs from 'highlight.js/lib/common'

// ─── 类型 ────────────────────────────────────────────────────
export type PreviewPanelState =
  | { kind: 'file'; payload: FilePreviewPayload }
  | { kind: 'diff'; path: string; diff: string; additions: number; deletions: number }
  | { kind: 'workspace'; cwd: string; snapshot: UiWorkspaceDiffSnapshot; expandedPaths: Record<string, boolean> }

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

// ─── Props / Emits ───────────────────────────────────────────
const props = defineProps<{
  panel: PreviewPanelState
  cwd: string
  matchedFileDiff: UiChangedFile | null
  uiLanguage?: UiLanguage
  closeLabel: string
}>()

const emit = defineEmits<{
  close: []
  'change-workspace-mode': [mode: UiWorkspaceDiffMode]
}>()

const normalizedLanguage = computed<UiLanguage>(() => props.uiLanguage ?? 'zh')
const workspaceDiffModes: UiWorkspaceDiffMode[] = ['unstaged', 'staged', 'branch', 'lastCommit']

// ─── Workspace diff 展开状态 ─────────────────────────────────
const localExpandedPaths = reactive<Record<string, boolean>>({})

function isWorkspaceDiffFileExpanded(path: string): boolean {
  if (props.panel.kind === 'workspace') {
    return props.panel.expandedPaths[path] === true
  }
  return localExpandedPaths[path] === true
}

function toggleWorkspaceDiffFile(path: string): void {
  if (props.panel.kind === 'workspace') {
    props.panel.expandedPaths[path] = props.panel.expandedPaths[path] !== true
    return
  }
  localExpandedPaths[path] = localExpandedPaths[path] !== true
}

// ─── HTML 转义 ───────────────────────────────────────────────
function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
}

// ─── 代码高亮 ────────────────────────────────────────────────
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

// ─── Diff 解析 ───────────────────────────────────────────────
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

// ─── Computed ────────────────────────────────────────────────
const panelTitle = computed(() => {
  if (props.panel.kind === 'workspace') return tUi(normalizedLanguage.value, 'diffPanel.title')
  if (props.panel.kind === 'diff') return `${formatDisplayPath(props.panel.path, props.cwd)} (diff)`
  return formatDisplayPath(props.panel.payload.path, props.cwd)
})

const panelSubtitle = computed(() => {
  if (props.panel.kind === 'workspace') {
    return `${props.panel.snapshot.files.length} ${tUi(normalizedLanguage.value, 'diffPanel.filesUnit')} +${props.panel.snapshot.totalAdditions} -${props.panel.snapshot.totalDeletions}`
  }
  if (props.panel.kind === 'diff') {
    if (props.panel.additions === 0 && props.panel.deletions === 0) return ''
    return `+${props.panel.additions} -${props.panel.deletions}`
  }
  return props.panel.payload.line ? `Line ${props.panel.payload.line}` : ''
})

function getWorkspaceModeLabel(mode: UiWorkspaceDiffMode): string {
  if (mode === 'unstaged') return tUi(normalizedLanguage.value, 'diffPanel.mode.unstaged')
  if (mode === 'staged') return tUi(normalizedLanguage.value, 'diffPanel.mode.staged')
  if (mode === 'branch') return tUi(normalizedLanguage.value, 'diffPanel.mode.branch')
  return tUi(normalizedLanguage.value, 'diffPanel.mode.lastCommit')
}

const workspaceModeDescription = computed(() => {
  if (props.panel.kind !== 'workspace') return ''
  const mode = props.panel.snapshot.mode
  if (mode === 'unstaged') return tUi(normalizedLanguage.value, 'diffPanel.desc.unstaged')
  if (mode === 'staged') return tUi(normalizedLanguage.value, 'diffPanel.desc.staged')
  if (mode === 'branch') return tUi(normalizedLanguage.value, 'diffPanel.desc.branch')
  return tUi(normalizedLanguage.value, 'diffPanel.desc.lastCommit')
})

const workspaceModeRefs = computed(() => {
  if (props.panel.kind !== 'workspace') return ''
  const baseRef = props.panel.snapshot.baseRef?.trim() ?? ''
  const targetRef = props.panel.snapshot.targetRef?.trim() ?? ''
  if (!baseRef && !targetRef) return ''
  if (!baseRef) return targetRef
  if (!targetRef) return baseRef
  return `${baseRef} -> ${targetRef}`
})

const workspaceEmptyMessage = computed(() => {
  if (props.panel.kind !== 'workspace') return ''
  if (props.panel.snapshot.warning) {
    return tUi(normalizedLanguage.value, 'diffPanel.empty.warning')
  }
  if (props.panel.snapshot.mode === 'branch' && !props.panel.snapshot.baseRef) {
    return tUi(normalizedLanguage.value, 'diffPanel.empty.branchBaseMissing')
  }
  return tUi(normalizedLanguage.value, 'diffPanel.empty.noChanges')
})

const highlightedPreviewHtml = computed(() => {
  if (props.panel.kind === 'workspace' || props.panel.kind === 'file') return ''
  const content = props.panel.diff
  try {
    return hljs.highlight(content, {
      language: 'diff',
      ignoreIllegals: true,
    }).value
  } catch {
    return hljs.highlightAuto(content).value
  }
})

const hasDiff = computed(() => {
  return Boolean(props.matchedFileDiff?.diff?.trim())
})

const renderableFilePreviewLines = computed<RenderableCodeLine[]>(() => {
  if (props.panel.kind !== 'file') return []

  const content = props.panel.payload.content
  const plainLines = content.split('\n')
  const language = detectHighlightLanguage(props.panel.payload.path)
  const highlightedLines = highlightCodeByLines(content, language)
  const change = props.matchedFileDiff

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
</script>

<style scoped>
@reference "tailwindcss";

.content-code-preview {
  @apply min-h-0 min-w-0 w-full rounded-xl border border-zinc-200 bg-zinc-50 flex flex-col overflow-hidden;
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

.workspace-diff-mode-tabs {
  @apply sticky top-0 z-10 flex flex-wrap gap-1 border-b border-zinc-200 bg-white px-2 py-2;
}

.workspace-diff-mode-tab {
  @apply rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-medium text-zinc-600 transition hover:bg-zinc-100;
}

.workspace-diff-mode-tab.is-active {
  @apply border-zinc-900 bg-zinc-900 text-white;
}

.workspace-diff-mode-meta {
  @apply border-b border-zinc-200 bg-zinc-50 px-2.5 py-2;
}

.workspace-diff-mode-description {
  @apply m-0 text-[11px] leading-4 text-zinc-700;
}

.workspace-diff-mode-refs {
  @apply mt-1 mb-0 text-[10px] leading-4 text-zinc-500;
}

.workspace-diff-warning {
  @apply m-0 border-b border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-4 text-amber-800;
}

.workspace-diff-empty {
  @apply m-0 border-b border-zinc-200 bg-zinc-50 px-2.5 py-3 text-[11px] leading-4 text-zinc-500;
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

.file-change-stats-add {
  @apply text-[11px] text-[#16a34a] font-medium;
}

.file-change-stats-del {
  @apply text-[11px] text-[#ef4444] font-medium;
}
</style>
