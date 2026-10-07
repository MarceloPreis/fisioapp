<script setup lang="ts">
import { computed } from 'vue'
import { WEEKDAY_INITIAL, WEEKDAY_LONG, formatRecurrence } from '../utils/sessionFormat'

const props = defineProps<{ days?: number[] | null }>()

const active = computed(() => new Set(props.days ?? []))

const getDayClass = (idx: number) => {
  if (active.value.has(idx)) {
    return 'bg-blue-800 text-white'
  }
  return 'bg-slate-100 text-slate-500'
}
</script>

<template>
  <div class="flex items-center gap-1" :aria-label="`Recorrência: ${formatRecurrence(days)}`" role="img">
    <span
      v-for="(initial, idx) in WEEKDAY_INITIAL"
      :key="idx"
      :title="WEEKDAY_LONG[idx]"
      class="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums"
      :class="getDayClass(idx)"
      aria-hidden="true"
    >
      {{ initial }}
    </span>
  </div>
</template>
