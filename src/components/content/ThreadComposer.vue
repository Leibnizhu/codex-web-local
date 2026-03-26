<template>
  <form class="thread-composer" @submit.prevent="onSubmit">
    <div class="thread-composer-shell">
      <textarea
        v-model="draft"
        class="thread-composer-input"
        :placeholder="placeholderText"
        :disabled="disabled || !activeThreadId || isTurnInProgress"
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
          v-else
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
import type { ReasoningEffort } from '../../types/codex'
import { tUi, type UiLanguage } from '../../i18n/uiText'
import IconTablerArrowUp from '../icons/IconTablerArrowUp.vue'
import IconTablerBrain from '../icons/IconTablerBrain.vue'
import IconTablerPlayerStopFilled from '../icons/IconTablerPlayerStopFilled.vue'
import IconTablerSettings from '../icons/IconTablerSettings.vue'
import ComposerDropdown from './ComposerDropdown.vue'

const props = defineProps<{
  activeThreadId: string
  models: string[]
  selectedModel: string
  selectedReasoningEffort: ReasoningEffort | ''
  uiLanguage?: UiLanguage
  isTurnInProgress?: boolean
  isInterruptingTurn?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  submit: [text: string]
  interrupt: []
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

const canSubmit = computed(() => {
  if (props.disabled) return false
  if (!props.activeThreadId) return false
  if (props.isTurnInProgress) return false
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

.thread-composer-submit {
  @apply ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-zinc-900 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500;
}

.thread-composer-submit-icon {
  @apply h-5 w-5;
}

.thread-composer-stop {
  @apply ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-zinc-900 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500;
}

.thread-composer-stop-icon {
  @apply h-5 w-5;
}
</style>
