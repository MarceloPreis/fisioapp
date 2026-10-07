<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { ptBR } from 'date-fns/locale'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

const props = withDefaults(defineProps<{ start: string; end: string; disabled?: boolean; ariaLabel?: string }>(), { disabled: false, ariaLabel: 'Período das sessões' })
const emit = defineEmits<{ 'update:start': [value: string]; 'update:end': [value: string] }>()
const id = useId()
const picker = ref<InstanceType<typeof VueDatePicker> | null>(null)
const period = computed({
  get: () => props.start && props.end ? [props.start, props.end] : null,
  set: (value: unknown) => {
    if (value === null) { emit('update:start', ''); emit('update:end', ''); return }
    if (Array.isArray(value) && value.length === 2 && value.every(item => typeof item === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item))) {
      emit('update:start', value[0]); emit('update:end', value[1])
    }
  },
})
const shortcuts = [
  { label: 'Esta semana', value: () => [startOfWeek(new Date(), { weekStartsOn: 0 }), endOfWeek(new Date(), { weekStartsOn: 0 })] },
  { label: 'Hoje', value: () => [new Date(), new Date()] },
  { label: 'Este mês', value: () => [startOfMonth(new Date()), endOfMonth(new Date())] },
]
function applyShortcut(shortcut: typeof shortcuts[number]) {
  period.value = shortcut.value().map(date => format(date, 'yyyy-MM-dd'))
  picker.value?.closeMenu()
}
</script>

<template>
  <VueDatePicker ref="picker" v-model="period" class="app-date-picker w-full sm:w-80" :locale="ptBR" :week-start="0"
    :range="{ partialRange: false }" model-type="yyyy-MM-dd" :formats="{ input: 'dd/MM/yyyy' }"
    :time-config="{ enableTimePicker: false }" auto-apply :teleport="true" :disabled="disabled"
    :input-attrs="{ id, clearable: true, autocomplete: 'off' }" placeholder="Selecione o período"
    :config="{ keepActionRow: true }"
    :aria-labels="{ input: ariaLabel, menu: 'Selecionar período', calendarIcon: 'Abrir calendário', clearInput: 'Remover filtro de período', nextMonth: 'Próximo mês', prevMonth: 'Mês anterior', openMonthsOverlay: 'Selecionar mês', openYearsOverlay: 'Selecionar ano' }">
    <template #action-row>
      <div role="group" aria-label="Atalhos de período" class="flex w-full items-center gap-1.5">
        <button v-for="shortcut in shortcuts" :key="shortcut.label" type="button"
          class="range-shortcut rounded-md border border-blue-200 bg-white font-medium text-blue-800 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
          @click="applyShortcut(shortcut)">{{ shortcut.label }}</button>
      </div>
    </template>
  </VueDatePicker>
</template>

<style scoped>
.range-shortcut {
  height: 32px;
  padding: 4px 8px;
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}
</style>
