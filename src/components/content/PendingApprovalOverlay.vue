<template>
  <div v-if="model" class="pending-approval-overlay">
    <div class="pending-approval-overlay-backdrop" aria-hidden="true" />
    <div class="pending-approval-overlay-card">
      <ApprovalRequestCard
        :model="model"
        :ui-language="uiLanguage"
        @submit="onSubmit"
        @skip="onSkip"
        @open-workspace-diff="$emit('openWorkspaceDiff')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UiLanguage } from '../../i18n/uiText'
import type { UiServerRequest, UiTurnFileChanges } from '../../types/codex'
import ApprovalRequestCard from './ApprovalRequestCard.vue'
import { buildApprovalRequestDisplayModel, type ApprovalDecision } from '../../utils/approvalRequestDisplay'

const props = defineProps<{
  request: UiServerRequest
  fileChanges: UiTurnFileChanges | null
  uiLanguage?: UiLanguage
}>()

const emit = defineEmits<{
  submit: [payload: { id: number; result: { decision: ApprovalDecision } }]
  skip: [payload: { id: number; result: { decision: ApprovalDecision } }]
  openWorkspaceDiff: []
}>()

const model = computed(() =>
  buildApprovalRequestDisplayModel(
    props.request,
    props.fileChanges && props.fileChanges.turnId === props.request.turnId ? props.fileChanges : null,
  ),
)

function onSubmit(decision: ApprovalDecision): void {
  emit('submit', {
    id: props.request.id,
    result: { decision },
  })
}

function onSkip(): void {
  emit('skip', {
    id: props.request.id,
    result: { decision: model.value?.cancelDecision ?? 'cancel' },
  })
}
</script>

<style scoped>
@reference "tailwindcss";

.pending-approval-overlay {
  @apply relative w-full max-w-175 mx-auto px-6;
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
}

.pending-approval-overlay-backdrop {
  @apply absolute inset-x-4 -inset-y-2 rounded-[2rem];
  background: color-mix(in srgb, var(--color-bg-overlay) 68%, transparent);
  backdrop-filter: blur(8px);
}

.pending-approval-overlay-card {
  @apply relative z-10;
}

@media (max-width: 720px) {
  .pending-approval-overlay {
    @apply px-3;
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  }

  .pending-approval-overlay-backdrop {
    @apply inset-x-0;
  }

  .pending-approval-overlay-card {
    max-height: min(calc(100vh - 8.5rem - env(safe-area-inset-bottom, 0px)), 42rem);
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
