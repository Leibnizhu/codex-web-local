<template>
  <section class="shared-session-status-card" :data-state="snapshot.state">
    <header class="shared-session-status-header">
      <span class="shared-session-status-chip" :data-state="snapshot.state">{{ stateLabel }}</span>
      <p class="shared-session-status-owner">{{ ownerSentence }}</p>
    </header>

    <div class="shared-session-status-body">
      <p class="shared-session-status-summary">{{ summaryText }}</p>
      <p v-if="attentionText" class="shared-session-status-attention">{{ attentionText }}</p>
    </div>

    <div class="shared-session-status-meta">
      <span class="shared-session-status-pill">{{ ownerLabel }}</span>
      <span
        v-if="snapshot.attention.pendingApprovalCount > 0"
        class="shared-session-status-pill"
      >
        {{ t('app.sharedSessionPendingApprovals', { count: snapshot.attention.pendingApprovalCount }) }}
      </span>
      <span v-if="snapshot.activeTurnId" class="shared-session-status-pill">
        {{ t('app.sharedSessionActiveTurn') }} · {{ snapshot.activeTurnId }}
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UiSharedSessionSnapshot } from '../../types/codex'
import { tUi, type UiLanguage, type UiTextKey } from '../../i18n/uiText'

const props = defineProps<{
  snapshot: UiSharedSessionSnapshot
  uiLanguage?: UiLanguage
}>()

const normalizedLanguage = computed<UiLanguage>(() => props.uiLanguage ?? 'zh')

function t(key: UiTextKey, params?: Record<string, number | string>): string {
  return tUi(normalizedLanguage.value, key, params)
}

const ownerLabel = computed(() =>
  props.snapshot.owner === 'terminal'
    ? t('app.sharedSessionOwnerTerminal')
    : t('app.sharedSessionOwnerWeb'),
)

const ownerSentence = computed(() =>
  t('app.sharedSessionControlledBy', { owner: ownerLabel.value }),
)

const stateLabel = computed(() => {
  switch (props.snapshot.state) {
    case 'running':
      return t('app.sharedSessionStatusRunning')
    case 'needs_attention':
      return t('app.sharedSessionStatusNeedsAttention')
    case 'failed':
      return t('app.sharedSessionStatusFailed')
    case 'interrupted':
      return t('app.sharedSessionStatusInterrupted')
    case 'stale_owner':
      return t('app.sharedSessionStatusStaleOwner')
    default:
      return t('app.sharedSessionStatusIdle')
  }
})

const summaryText = computed(() => {
  const latestSummary = props.snapshot.latestTurnSummary?.summary?.trim() ?? ''
  if (latestSummary) {
    return latestSummary
  }

  const latestAssistantMessage = [...props.snapshot.timeline]
    .reverse()
    .find((entry) => entry.kind === 'assistant_message' || entry.kind === 'turn_summary')

  if (latestAssistantMessage?.text?.trim()) {
    return latestAssistantMessage.text.trim()
  }

  return t('app.sharedSessionLatestTurn')
})

const attentionText = computed(() => {
  const parts: string[] = []
  if (props.snapshot.attention.latestErrorMessage) {
    parts.push(t('app.sharedSessionLatestError', { message: props.snapshot.attention.latestErrorMessage }))
  }
  if (props.snapshot.attention.pendingApprovalCount > 0) {
    parts.push(t('app.sharedSessionPendingApprovals', { count: props.snapshot.attention.pendingApprovalCount }))
  }
  if (props.snapshot.attention.requiresReturnToOwner) {
    parts.push(t('app.sharedSessionReturnToOwner'))
  }
  return parts.join(' · ')
})
</script>

<style scoped>
@reference "tailwindcss";

.shared-session-status-card {
  @apply w-full max-w-180 mx-auto rounded-2xl border px-4 py-3 flex flex-col gap-3;
  border-color: var(--color-border-default);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--color-bg-elevated) 92%, white 8%), var(--color-bg-surface));
  box-shadow: 0 14px 36px color-mix(in srgb, var(--color-text-primary) 8%, transparent);
}

.shared-session-status-card[data-state='needs_attention'] {
  border-color: color-mix(in srgb, #f59e0b 55%, var(--color-border-default));
}

.shared-session-status-card[data-state='failed'] {
  border-color: color-mix(in srgb, #ef4444 55%, var(--color-border-default));
}

.shared-session-status-card[data-state='running'] {
  border-color: color-mix(in srgb, #16a34a 45%, var(--color-border-default));
}

.shared-session-status-header {
  @apply flex items-center justify-between gap-3 flex-wrap;
}

.shared-session-status-chip {
  @apply inline-flex items-center rounded-full px-2.5 py-1 text-[11px] leading-4 font-semibold;
  color: var(--color-text-primary);
  background: var(--color-bg-subtle);
}

.shared-session-status-chip[data-state='running'] {
  background: color-mix(in srgb, #16a34a 14%, var(--color-bg-subtle));
  color: #166534;
}

.shared-session-status-chip[data-state='needs_attention'] {
  background: color-mix(in srgb, #f59e0b 16%, var(--color-bg-subtle));
  color: #92400e;
}

.shared-session-status-chip[data-state='failed'] {
  background: color-mix(in srgb, #ef4444 14%, var(--color-bg-subtle));
  color: #991b1b;
}

.shared-session-status-chip[data-state='interrupted'],
.shared-session-status-chip[data-state='stale_owner'],
.shared-session-status-chip[data-state='idle'] {
  color: var(--color-text-secondary);
}

.shared-session-status-owner {
  @apply m-0 text-xs leading-5;
  color: var(--color-text-secondary);
}

.shared-session-status-body {
  @apply flex flex-col gap-1.5;
}

.shared-session-status-summary {
  @apply m-0 text-sm leading-5 font-medium whitespace-pre-wrap break-words;
  color: var(--color-text-primary);
}

.shared-session-status-attention {
  @apply m-0 text-xs leading-5 whitespace-pre-wrap break-words;
  color: var(--color-text-secondary);
}

.shared-session-status-meta {
  @apply flex flex-wrap gap-2;
}

.shared-session-status-pill {
  @apply inline-flex items-center rounded-full px-2.5 py-1 text-[11px] leading-4;
  color: var(--color-text-secondary);
  background: var(--color-bg-muted);
}
</style>
