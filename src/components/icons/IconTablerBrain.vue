<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M15.5 13a3.5 3.5 0 0 0 0 -7a3 3 0 0 0 -5.46 -1a3 3 0 0 0 -4.54 2.5a3 3 0 0 0 .5 5.5" />
    <path d="M17 13a3 3 0 1 1 0 6h-1a3 3 0 0 1 -6 0h-2a3 3 0 1 1 0 -6h2" />
    <path d="M12 5.5v13.5" />
    <path v-if="normalizedLevel >= 1" d="M9.2 8.1c-.7 .4 -.7 1.4 0 1.8" />
    <path v-if="normalizedLevel >= 2" d="M14.8 8.1c.7 .4 .7 1.4 0 1.8" />
    <path v-if="normalizedLevel >= 3" d="M9.2 12.1c-.7 .4 -.7 1.4 0 1.8" />
    <path v-if="normalizedLevel >= 4" d="M14.8 12.1c.7 .4 .7 1.4 0 1.8" />
    <path v-if="normalizedLevel >= 5" d="M9.2 15.4c-.7 .4 -.7 1.3 0 1.7M14.8 15.4c.7 .4 .7 1.3 0 1.7" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    level?: number
  }>(),
  {
    level: 3,
  },
)

const normalizedLevel = computed(() => Math.max(0, Math.min(5, Math.round(props.level))))
</script>
