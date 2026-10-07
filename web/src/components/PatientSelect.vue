<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { Check, ChevronDown, LoaderCircle, Search, X } from 'lucide-vue-next'
import api from '../utils/axios'

interface PatientOption { id: string; fullName: string }
const props = withDefaults(defineProps<{ modelValue: string; label?: string; hideLabel?: boolean; placeholder?: string; required?: boolean; disabled?: boolean }>(), { label: 'Paciente', placeholder: 'Pesquise pelo nome', required: false, disabled: false })
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
const id = useId()
const input = ref<HTMLInputElement | null>(null)
const query = ref('')
const selected = ref<PatientOption | null>(null)
const options = ref<PatientOption[]>([])
const open = ref(false)
const loading = ref(false)
const error = ref('')
const active = ref(-1)
const activeId = computed(() => active.value >= 0 && options.value[active.value] ? `${id}-option-${active.value}` : undefined)
let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined
let version = 0
let hydrateVersion = 0

const invalidate = () => { version++; controller?.abort(); clearTimeout(timer) }
const search = async () => {
  invalidate()
  const request = version
  controller = new AbortController()
  loading.value = true
  error.value = ''
  options.value = []
  active.value = -1
  try {
    const { data } = await api.get<PatientOption[]>('/patients/search', { params: { name: selected.value ? '' : query.value.trim() }, signal: controller.signal })
    if (request === version) options.value = data
  } catch {
    if (request === version && !controller.signal.aborted) error.value = 'Não foi possível buscar pacientes.'
  } finally { if (request === version) loading.value = false }
}
const focus = () => { if (!props.disabled) { open.value = true; void search() } }
const choose = (patient: PatientOption) => {
  invalidate()
  selected.value = patient
  query.value = patient.fullName
  open.value = false
  loading.value = false
  emit('update:modelValue', patient.id)
}
const type = (event: Event) => {
  invalidate()
  hydrateVersion++
  selected.value = null
  query.value = (event.target as HTMLInputElement).value
  emit('update:modelValue', '')
  options.value = []
  active.value = -1
  open.value = true
  loading.value = true
  error.value = ''
  timer = setTimeout(() => void search(), 300)
}
const clear = () => {
  invalidate()
  hydrateVersion++
  selected.value = null
  query.value = ''
  emit('update:modelValue', '')
  input.value?.focus()
  focus()
}
const close = () => { invalidate(); open.value = false; loading.value = false; query.value = selected.value?.fullName || '' }
const keydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') { event.preventDefault(); close() }
  else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) { focus(); return }
    if (!options.value.length) return
    active.value = active.value < 0 ? (event.key === 'ArrowDown' ? 0 : options.value.length - 1) : (active.value + (event.key === 'ArrowDown' ? 1 : -1) + options.value.length) % options.value.length
    void nextTick(() => document.getElementById(activeId.value || '')?.scrollIntoView({ block: 'nearest' }))
  } else if (event.key === 'Enter' && open.value) {
    event.preventDefault()
    const patient = options.value[active.value]
    if (patient) choose(patient)
  }
}
watch(() => props.modelValue, async value => {
  const request = ++hydrateVersion
  if (!value) { if (selected.value) query.value = ''; selected.value = null; return }
  if (selected.value?.id === value) return
  try {
    const { data } = await api.get<PatientOption>(`/patients/${value}`)
    if (request === hydrateVersion) { selected.value = data; query.value = data.fullName }
  } catch { if (request === hydrateVersion) { query.value = ''; error.value = 'Paciente selecionado indisponível.' } }
}, { immediate: true })
watch([() => props.modelValue, () => props.required, query, input], () => {
  input.value?.setCustomValidity(props.required && !props.modelValue ? 'Selecione um paciente nos resultados da pesquisa.' : '')
}, { flush: 'post' })
watch(() => props.disabled, value => { if (value) close() })
onBeforeUnmount(() => { invalidate(); hydrateVersion++ })
</script>

<template>
  <div class="relative min-w-0" @focusout="event => { if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) close() }">
    <label :for="id" :class="hideLabel ? 'sr-only' : 'mb-2 block text-base font-medium text-slate-900'">{{ label }}<span v-if="required" aria-hidden="true"> *</span></label>
    <div class="flex min-h-12 items-center rounded-lg border border-slate-300 bg-white focus-within:border-blue-800 focus-within:ring-2 focus-within:ring-blue-100" :class="disabled ? 'opacity-50' : ''">
      <Search class="ml-3 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
      <input :id="id" ref="input" :value="query" :disabled="disabled" :required="required" :placeholder="placeholder" maxlength="100" autocomplete="off" role="combobox" aria-autocomplete="list" :aria-expanded="open" :aria-controls="`${id}-list`" :aria-activedescendant="activeId" :aria-describedby="`${id}-status`" class="min-h-12 w-full min-w-0 bg-transparent px-3 text-base text-slate-900 outline-none" @input="type" @focus="focus" @keydown="keydown" />
      <button v-if="modelValue || query" type="button" :disabled="disabled" aria-label="Limpar paciente" title="Limpar paciente" class="flex min-h-12 min-w-12 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" @click="clear"><X class="h-5 w-5" aria-hidden="true" /></button>
      <ChevronDown v-else class="mr-3 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
    </div>
    <div v-if="open" class="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
      <p v-if="loading" class="flex min-h-12 items-center gap-2 px-3 text-base text-slate-600"><LoaderCircle class="h-4 w-4 animate-spin" aria-hidden="true" />Buscando pacientes...</p>
      <div v-else-if="error" class="p-3 text-base text-red-700">{{ error }}<button type="button" class="mt-2 min-h-12 rounded-lg border border-red-200 px-3 hover:bg-red-50" @mousedown.prevent @click="search">Tentar novamente</button></div>
      <p v-else-if="!options.length" class="min-h-12 px-3 py-3 text-base text-slate-600">Nenhum paciente encontrado.</p>
      <ul :id="`${id}-list`" role="listbox" :aria-label="label" class="max-h-64 overflow-y-auto">
        <li v-for="(patient, index) in options" :id="`${id}-option-${index}`" :key="patient.id" role="option" :aria-selected="patient.id === modelValue" class="flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-base text-slate-900 hover:bg-blue-50" :class="active === index ? 'bg-blue-50' : ''" @mousedown.prevent @click="choose(patient)">
          <span>{{ patient.fullName }}</span><Check v-if="patient.id === modelValue" class="h-5 w-5 shrink-0 text-blue-800" aria-hidden="true" />
        </li>
      </ul>
      <p v-if="!loading && !error && options.length === 20" class="px-3 py-2 text-sm text-slate-500">Digite mais para refinar os resultados.</p>
    </div>
    <span :id="`${id}-status`" role="status" class="sr-only">{{ loading ? 'Buscando pacientes' : error || (open ? `${options.length} pacientes encontrados` : '') }}</span>
  </div>
</template>
