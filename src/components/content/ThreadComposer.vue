<template>
  <form class="thread-composer" @submit.prevent="onSubmit">
    <div class="thread-composer-shell">
      <textarea
        v-model="draft"
        class="thread-composer-input"
        :placeholder="placeholderText"
        :disabled="disabled || !activeThreadId"
        rows="1"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
        @keydown.enter.exact.prevent="onEnterKeydown"
      />

      <div class="thread-composer-controls">
        <ComposerDropdown
          class="thread-composer-control"
          :model-value="selectedModel"
          :options="modelOptions"
          :placeholder="tUi(normalizedLanguage, 'composer.model')"
          menu-width="model"
          :show-option-icons="false"
          open-direction="up"
          :disabled="disabled || !activeThreadId || models.length === 0"
          @update:model-value="onModelSelect"
        />

        <ComposerDropdown
          class="thread-composer-control"
          :model-value="selectedReasoningEffort"
          :options="reasoningOptions"
          :placeholder="tUi(normalizedLanguage, 'composer.thinking')"
          :menu-title="reasoningLabel"
          :trigger-title="reasoningLabel"
          open-direction="up"
          :disabled="disabled || !activeThreadId || isTurnInProgress"
          @update:model-value="onReasoningEffortSelect"
        />

        <div v-if="activeThreadId" class="thread-composer-status-group">
          <span
            v-if="branchLabel"
            class="thread-composer-status-chip thread-composer-branch-chip"
            :title="branchLabel"
            :aria-label="branchLabel"
          >
            <IconBranchPretty class="thread-composer-branch-icon" />
            <span class="thread-composer-branch-text">{{ branchName }}</span>
            <IconTablerChevronDown class="thread-composer-branch-chevron" />
          </span>

          <div class="thread-composer-quota-wrap">
            <span
              v-if="rateLimitLabel"
              class="thread-composer-status-chip thread-composer-status-chip-action"
              :data-quota-level="quotaLevel"
              tabindex="0"
            >
              {{ rateLimitLabel }}
            </span>
            <div class="thread-composer-status-popover" role="status" aria-live="polite">
              <div class="thread-composer-popover-header">
                <span class="thread-composer-popover-header-left">
                  <span class="thread-composer-popover-gauge-icon" aria-hidden="true" />
                  <span class="thread-composer-popover-title">{{ tUi(normalizedLanguage, 'composer.quotaRemainingTitle') }}</span>
                </span>
              </div>
              <p v-if="quotaWindowRows.length === 0" class="thread-composer-popover-line">{{ tUi(normalizedLanguage, 'composer.quotaDataUnavailable') }}</p>
              <div
                v-for="(row, index) in quotaWindowRows"
                :key="`quota-window-${index}`"
                class="thread-composer-popover-row"
              >
                <span class="thread-composer-popover-row-duration">{{ row.durationText }}</span>
                <span class="thread-composer-popover-row-percent">{{ row.remainingPercentText }}</span>
                <span class="thread-composer-popover-row-reset">{{ row.resetAtText }}</span>
              </div>
              <p v-if="aiCreditsLabel" class="thread-composer-popover-line">{{ aiCreditsLabel }}</p>
            </div>
          </div>

          <div class="thread-composer-context-wrap">
            <button
              class="thread-composer-context-ring"
              type="button"
              :aria-label="contextUsageSummaryLabel"
              :title="contextUsageSummaryLabel"
              :data-level="contextLevel"
              :style="contextRingStyle"
            >
              <span class="thread-composer-context-ring-inner">{{ contextUsedPercentText }}</span>
            </button>
            <div class="thread-composer-status-popover thread-composer-status-popover-context" role="status" aria-live="polite">
              <p class="thread-composer-popover-title">{{ tUi(normalizedLanguage, 'composer.contextUsageTitle') }}</p>
              <p class="thread-composer-popover-line">{{ contextUsageSummaryLabel }}</p>
              <p class="thread-composer-popover-line">{{ contextTokenSummaryLabel }}</p>
              <p class="thread-composer-popover-hint">{{ tUi(normalizedLanguage, 'composer.contextAutoCompressHint') }}</p>
              <button
                class="thread-composer-compact-button"
                type="button"
                :disabled="!canCompactContext || isCompactingContext"
                @click="onCompactContext"
              >
                {{ isCompactingContext ? tUi(normalizedLanguage, 'composer.compacting') : tUi(normalizedLanguage, 'composer.compactNow') }}
              </button>
            </div>
          </div>
        </div>

        <button
          v-if="isTurnInProgress"
          class="thread-composer-stop"
          type="button"
          aria-label="Стоп"
          :disabled="disabled || !activeThreadId || isInterruptingTurn"
          @click="onInterrupt"
        >
          <IconTablerPlayerStopFilled class="thread-composer-stop-icon" />
        </button>
        <button
          class="thread-composer-submit"
          type="submit"
          aria-label="Send message"
          :disabled="!canSubmit"
        >
          <IconTablerArrowUp class="thread-composer-submit-icon" />
        </button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import type { ReasoningEffort, UiRateLimitUsage, UiThreadContextUsage } from '../../types/codex'
import { tUi, type UiLanguage } from '../../i18n/uiText'
import IconTablerArrowUp from '../icons/IconTablerArrowUp.vue'
import IconTablerBrain from '../icons/IconTablerBrain.vue'
import IconTablerChevronDown from '../icons/IconTablerChevronDown.vue'
import IconBranchPretty from '../icons/IconBranchPretty.vue'
import IconTablerPlayerStopFilled from '../icons/IconTablerPlayerStopFilled.vue'
import IconTablerSettings from '../icons/IconTablerSettings.vue'
import ComposerDropdown from './ComposerDropdown.vue'

const props = defineProps<{
  activeThreadId: string
  models: string[]
  selectedModel: string
  selectedReasoningEffort: ReasoningEffort | ''
  threadBranch?: string
  contextUsage?: UiThreadContextUsage | null
  rateLimitUsage?: UiRateLimitUsage | null
  isCompactingContext?: boolean
  uiLanguage?: UiLanguage
  isTurnInProgress?: boolean
  isInterruptingTurn?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  submit: [text: string]
  interrupt: []
  'compact-context': []
  'update:selected-model': [modelId: string]
  'update:selected-reasoning-effort': [effort: ReasoningEffort | '']
}>()

const draft = ref('')
const isComposing = ref(false)
const normalizedLanguage = computed<UiLanguage>(() => props.uiLanguage ?? 'zh')
const reasoningOptions = computed<Array<{ value: ReasoningEffort; label: string; icon?: Component; iconProps?: Record<string, unknown> }>>(() => {
  return [
    { value: 'none', label: tUi(normalizedLanguage.value, 'composer.reasoning.none'), icon: IconTablerBrain, iconProps: { level: 0 } },
    { value: 'minimal', label: tUi(normalizedLanguage.value, 'composer.reasoning.minimal'), icon: IconTablerBrain, iconProps: { level: 1 } },
    { value: 'low', label: tUi(normalizedLanguage.value, 'composer.reasoning.low'), icon: IconTablerBrain, iconProps: { level: 2 } },
    { value: 'medium', label: tUi(normalizedLanguage.value, 'composer.reasoning.medium'), icon: IconTablerBrain, iconProps: { level: 3 } },
    { value: 'high', label: tUi(normalizedLanguage.value, 'composer.reasoning.high'), icon: IconTablerBrain, iconProps: { level: 4 } },
    { value: 'xhigh', label: tUi(normalizedLanguage.value, 'composer.reasoning.xhigh'), icon: IconTablerBrain, iconProps: { level: 5 } },
  ]
})

function toDisplayModelName(modelId: string): string {
  const normalized = modelId.trim().toLowerCase()
  if (!normalized) return modelId

  const knownLabels: Record<string, string> = {
    'gpt-5.4': 'GPT-5.4',
    'gpt-5.4-mini': 'GPT-5.4-Mini',
    'gpt-5.3-codex': 'GPT-5.3-Codex',
    'gpt-5.2-codex': 'GPT-5.2-Codex',
    'gpt-5.2': 'GPT-5.2',
    'gpt-5.1-codex-max': 'GPT-5.1-Codex-Max',
    'gpt-5.1-codex-mini': 'GPT-5.1-Codex-Mini',
  }
  const mapped = knownLabels[normalized]
  if (mapped) return mapped

  return modelId
}

const modelOptions = computed(() =>
  props.models.map((modelId) => ({
    value: modelId,
    label: toDisplayModelName(modelId),
    icon: IconTablerSettings,
  })),
)
const reasoningLabel = computed(() =>
  tUi(normalizedLanguage.value, 'composer.reasoningEffort'),
)
const branchLabel = computed(() => {
  const branch = props.threadBranch?.trim() ?? ''
  if (!branch) return ''
  return `${tUi(normalizedLanguage.value, 'composer.branch')} ${branch}`
})
const branchName = computed(() => props.threadBranch?.trim() ?? '')
const rateLimitLabel = computed(() => {
  const usage = props.rateLimitUsage
  if (!usage) return ''
  const remaining = Math.max(0, Math.round(usage.remainingPercent))
  return tUi(normalizedLanguage.value, 'composer.quotaRemaining', { percent: remaining })
})
const quotaLevel = computed<'normal' | 'warn' | 'danger'>(() => {
  const usage = props.rateLimitUsage
  if (!usage) return 'normal'
  const remaining = Math.max(0, usage.remainingPercent)
  if (remaining < 5) return 'danger'
  if (remaining < 20) return 'warn'
  return 'normal'
})
function formatWindowDuration(minutes: number | null): string {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    return tUi(normalizedLanguage.value, 'composer.quotaWindowUnknown')
  }
  const rounded = Math.round(minutes)
  if (rounded % 10080 === 0) {
    return tUi(normalizedLanguage.value, 'composer.quotaWindowWeeks', { weeks: rounded / 10080 })
  }
  if (rounded % 1440 === 0) {
    return tUi(normalizedLanguage.value, 'composer.quotaWindowDays', { days: rounded / 1440 })
  }
  if (rounded % 60 === 0) {
    return tUi(normalizedLanguage.value, 'composer.quotaWindowHours', { hours: rounded / 60 })
  }
  return tUi(normalizedLanguage.value, 'composer.quotaWindowMinutes', { minutes: rounded })
}
function formatResetAt(seconds: number | null): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '--'
  const targetDate = new Date(seconds * 1000)
  const now = new Date()
  const locale = normalizedLanguage.value === 'zh' ? 'zh-CN' : 'en-US'
  const isSameDay = targetDate.getFullYear() === now.getFullYear()
    && targetDate.getMonth() === now.getMonth()
    && targetDate.getDate() === now.getDate()
  if (isSameDay) {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(targetDate)
  }
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(targetDate)
}
const quotaWindowRows = computed<Array<{ durationText: string; remainingPercentText: string; resetAtText: string }>>(() => {
  const usage = props.rateLimitUsage
  if (!usage) return []
  const windows = usage.windows ?? []
  return windows.slice(0, 2).map((row) => {
    const remainingPercent = Math.max(0, Math.round(100 - row.usedPercent))
    return {
      durationText: formatWindowDuration(row.windowDurationMins),
      remainingPercentText: `${remainingPercent}%`,
      resetAtText: formatResetAt(row.resetsAt),
    }
  })
})
const aiCreditsLabel = computed(() => {
  const usage = props.rateLimitUsage
  const credits = usage?.aiCredits ?? null
  if (!credits) return ''
  if (credits.unlimited) {
    return tUi(normalizedLanguage.value, 'composer.aiCreditsUnlimited')
  }
  const balance = credits.balance?.trim() ?? ''
  if (balance) {
    return tUi(normalizedLanguage.value, 'composer.aiCreditsBalance', { balance })
  }
  return credits.hasCredits
    ? tUi(normalizedLanguage.value, 'composer.aiCreditsAvailable')
    : tUi(normalizedLanguage.value, 'composer.aiCreditsDepleted')
})
const contextUsedPercent = computed(() => {
  const usage = props.contextUsage
  if (!usage) return null
  return Math.min(Math.max(usage.usedPercent, 0), 100)
})
const contextLevel = computed(() => {
  const percent = contextUsedPercent.value
  if (percent === null) return 'idle'
  if (percent >= 90) return 'danger'
  if (percent >= 70) return 'warn'
  return 'ok'
})
const contextUsedPercentText = computed(() => {
  const percent = contextUsedPercent.value
  if (percent === null) return '--'
  return `${Math.round(percent)}%`
})
const contextRingStyle = computed(() => {
  const percent = contextUsedPercent.value
  const fill = percent === null ? 0 : percent
  return {
    '--context-ring-fill': `${fill}%`,
  } as Record<string, string>
})
const contextUsageSummaryLabel = computed(() => {
  const usage = props.contextUsage
  if (!usage) {
    return tUi(normalizedLanguage.value, 'composer.contextDataUnavailable')
  }
  return tUi(normalizedLanguage.value, 'composer.contextUsageSummary', {
    used: Math.round(usage.usedPercent),
    remaining: Math.round(usage.remainingPercent),
  })
})
function formatTokenCount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (value < 1000) return String(Math.round(value))
  const formatted = value / 1000
  return `${formatted.toFixed(formatted >= 10 ? 0 : 1)}k`
}
const contextTokenSummaryLabel = computed(() => {
  const usage = props.contextUsage
  if (!usage) {
    return tUi(normalizedLanguage.value, 'composer.contextDataUnavailable')
  }
  return tUi(normalizedLanguage.value, 'composer.contextTokensSummary', {
    usedTokens: formatTokenCount(usage.usedTokens),
    totalTokens: formatTokenCount(usage.totalTokens),
  })
})
const canCompactContext = computed(() => {
  if (props.disabled) return false
  if (!props.activeThreadId) return false
  return true
})
const isCompactingContext = computed(() => props.isCompactingContext === true)

const canSubmit = computed(() => {
  if (props.disabled) return false
  if (!props.activeThreadId) return false
  return draft.value.trim().length > 0
})

const placeholderText = computed(() =>
  props.activeThreadId
    ? tUi(normalizedLanguage.value, 'composer.typeMessage')
    : tUi(normalizedLanguage.value, 'composer.selectThreadFirst'),
)

function onSubmit(): void {
  const text = draft.value.trim()
  if (!text || !canSubmit.value) return
  emit('submit', text)
  draft.value = ''
}

function onCompositionStart(): void {
  isComposing.value = true
}

function onCompositionEnd(): void {
  isComposing.value = false
}

function onEnterKeydown(event: KeyboardEvent): void {
  if (event.shiftKey) return
  if (isComposing.value || event.isComposing) return
  onSubmit()
}

function onInterrupt(): void {
  emit('interrupt')
}

function onCompactContext(): void {
  emit('compact-context')
}

function onModelSelect(value: string): void {
  emit('update:selected-model', value)
}

function onReasoningEffortSelect(value: string): void {
  emit('update:selected-reasoning-effort', value as ReasoningEffort)
}

watch(
  () => props.activeThreadId,
  () => {
    draft.value = ''
  },
)
</script>

<style scoped>
@reference "tailwindcss";

.thread-composer {
  @apply w-full max-w-175 mx-auto px-6;
}

.thread-composer-shell {
  @apply rounded-2xl border border-zinc-300 bg-white p-3 shadow-sm;
}

.thread-composer-input {
  @apply w-full min-w-0 min-h-11 max-h-40 rounded-xl border-0 bg-transparent px-1 py-2 text-sm leading-6 text-zinc-900 outline-none transition resize-y;
}

.thread-composer-input:focus {
  @apply ring-0;
}

.thread-composer-input:disabled {
  @apply bg-zinc-100 text-zinc-500 cursor-not-allowed;
}

.thread-composer-controls {
  @apply mt-3 flex items-center gap-4;
}

.thread-composer-control {
  @apply shrink-0;
}

.thread-composer-control :deep(.composer-dropdown-trigger) {
  @apply text-[11px] text-zinc-600;
}

.thread-composer-control :deep(.composer-dropdown-trigger-icon) {
  @apply h-3.5 w-3.5;
}

.thread-composer-control :deep(.composer-dropdown-chevron) {
  @apply h-3 w-3;
}

.thread-composer-status-group {
  @apply ml-auto flex items-center gap-1.5;
}

.thread-composer-status-chip {
  @apply inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-600;
}

.thread-composer-status-chip-action {
  @apply cursor-default select-none;
}

.thread-composer-status-chip-action[data-quota-level='warn'] {
  @apply border-amber-200 bg-amber-50 text-amber-700;
}

.thread-composer-status-chip-action[data-quota-level='danger'] {
  @apply border-rose-200 bg-rose-50 text-rose-700;
}

.thread-composer-branch-chip {
  @apply gap-1.5 rounded-full border-zinc-200 bg-zinc-100 px-2.5 text-zinc-600;
}

.thread-composer-branch-icon {
  @apply h-3.5 w-3.5 shrink-0;
}

.thread-composer-branch-text {
  @apply text-[11px] text-zinc-600;
}

.thread-composer-branch-chevron {
  @apply h-3.5 w-3.5 shrink-0 text-zinc-500;
}

.thread-composer-quota-wrap,
.thread-composer-context-wrap {
  @apply relative flex items-center;
}

.thread-composer-context-ring {
  background: conic-gradient(var(--ring-color, #a1a1aa) var(--context-ring-fill), #e4e4e7 0%);
  @apply relative inline-flex h-6 w-6 items-center justify-center rounded-full border-0 p-0 text-[9px] text-zinc-700;
}

.thread-composer-context-ring[data-level='ok'] {
  --ring-color: #16a34a;
}

.thread-composer-context-ring[data-level='warn'] {
  --ring-color: #ca8a04;
}

.thread-composer-context-ring[data-level='danger'] {
  --ring-color: #dc2626;
}

.thread-composer-context-ring[data-level='idle'] {
  --ring-color: #a1a1aa;
}

.thread-composer-context-ring-inner {
  @apply inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[8px] font-medium;
}

.thread-composer-status-popover {
  @apply pointer-events-none invisible absolute bottom-8 right-0 z-20 w-54 rounded-xl border border-zinc-200 bg-white p-2 text-[11px] text-zinc-700 opacity-0 shadow-md transition;
}

.thread-composer-status-popover-context {
  @apply w-56;
}

.thread-composer-quota-wrap:hover .thread-composer-status-popover,
.thread-composer-quota-wrap:focus-within .thread-composer-status-popover,
.thread-composer-context-wrap:hover .thread-composer-status-popover,
.thread-composer-context-wrap:focus-within .thread-composer-status-popover {
  @apply pointer-events-auto visible opacity-100;
}

.thread-composer-popover-title {
  @apply m-0 text-xs font-semibold text-zinc-800;
}

.thread-composer-popover-header {
  @apply flex items-center;
}

.thread-composer-popover-header-left {
  @apply flex items-center gap-1.5;
}

.thread-composer-popover-gauge-icon {
  @apply inline-block h-3 w-3 rounded-full border border-zinc-500;
  clip-path: inset(25% 0 0 0);
}

.thread-composer-popover-line {
  @apply m-0 mt-1 text-[11px] leading-4 text-zinc-700;
}

.thread-composer-popover-row {
  @apply mt-1.5 grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[11px];
}

.thread-composer-popover-row-duration {
  @apply font-semibold text-zinc-700;
}

.thread-composer-popover-row-percent {
  @apply text-zinc-500;
}

.thread-composer-popover-row-reset {
  @apply text-zinc-500;
}

.thread-composer-popover-hint {
  @apply m-0 mt-1.5 text-[11px] leading-4 font-medium text-zinc-800;
}

.thread-composer-compact-button {
  @apply mt-2 inline-flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-zinc-900 px-2 py-1.5 text-[11px] font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-500;
}

.thread-composer-submit {
  @apply inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-zinc-900 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500;
}

.thread-composer-submit-icon {
  @apply h-5 w-5;
}

.thread-composer-stop {
  @apply inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-zinc-900 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500;
}

.thread-composer-stop-icon {
  @apply h-5 w-5;
}
</style>
