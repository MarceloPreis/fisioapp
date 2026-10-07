<script setup lang="ts">
import { computed, useId } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { ptBR } from 'date-fns/locale'

const props = withDefaults(defineProps<{
  modelValue: string; id?: string; ariaLabel?: string; required?: boolean;
  disabled?: boolean; dateTime?: boolean; placeholder?: string;
}>(), { ariaLabel: 'Selecionar data', required: false, disabled: false, dateTime: false })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const generatedId = useId()
const modelFormat = computed(() => props.dateTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd')
const value = computed({ get: () => props.modelValue || null, set: (value: unknown) => emit('update:modelValue', typeof value === 'string' ? value : '') })
</script>

<template>
  <VueDatePicker v-model="value" class="app-date-picker" :locale="ptBR" :teleport="true"
    :model-type="modelFormat"
    :formats="{ input: dateTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy' }"
    :time-config="{ enableTimePicker: dateTime, is24: true }" :auto-apply="!dateTime"
    :disabled="disabled" :input-attrs="{ id: id || generatedId, required, clearable: !required, autocomplete: 'off' }"
    :placeholder="placeholder || (dateTime ? 'Selecione data e hora' : 'Selecione uma data')"
    :action-row="{ selectBtnLabel: 'Selecionar', cancelBtnLabel: 'Cancelar', nowBtnLabel: 'Agora' }"
    :aria-labels="{ input: ariaLabel, menu: 'Calendário', timePicker: 'Selecionar horário', calendarIcon: 'Abrir calendário', clearInput: 'Limpar data', openTimePicker: 'Selecionar horário', closeTimePicker: 'Voltar ao calendário', nextMonth: 'Próximo mês', prevMonth: 'Mês anterior', openMonthsOverlay: 'Selecionar mês', openYearsOverlay: 'Selecionar ano', incrementValue: (type: string) => type === 'hours' ? 'Aumentar horas' : 'Aumentar minutos', decrementValue: (type: string) => type === 'hours' ? 'Diminuir horas' : 'Diminuir minutos' }" />
</template>
