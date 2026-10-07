<script setup lang="ts">
import AppDatePicker from './AppDatePicker.vue'
import { computed, nextTick, ref, watch, onBeforeUnmount } from 'vue'
import { CalendarDays, Minus, Plus, Repeat, Trash2, X } from 'lucide-vue-next'
import PatientSelect from './PatientSelect.vue'
import api from '../utils/axios'
import { useFeedback } from '../composables/useFeedback'
import { WEEKDAY_LONG, WEEKDAY_SHORT, formatRecurrence, localDateToISO, toLocalISODate } from '../utils/sessionFormat'

interface Exercise { id: string; title: string }
interface ExerciseRow { key: number; exerciseId: string; sets: number; reps: string }
interface EditableSession {
  id: string; title: string; patientId: string; status: string
  isTemplate?: boolean; scheduledDate?: string | null; recurrenceDays?: number[] | null
  sessionExercises: { exerciseId: string; sets: number; reps: string }[]
}

const props = defineProps<{
  open: boolean
  exercises: Exercise[]
  /** 'template' trava o formulário em modelo fixo (tela de Modelos Fixos). */
  mode?: 'any' | 'template'
  session?: EditableSession | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const { confirm, toast } = useFeedback()

const lockedToTemplate = computed(() => props.mode === 'template')
const isEditing = computed(() => Boolean(props.session))
const exercisesLocked = computed(() => isEditing.value && props.session?.status !== 'PENDENTE')
const initialState = ref('')
const formState = () => JSON.stringify({ title: title.value, patientId: patientId.value, kind: kind.value, scheduledDate: scheduledDate.value, recurrenceDays: recurrenceDays.value, rows: rows.value.map(({ exerciseId, sets, reps }) => ({ exerciseId, sets, reps })) })

let rowSeq = 0
const title = ref('')
const patientId = ref('')
const kind = ref<'single' | 'template'>('single')
const scheduledDate = ref(toLocalISODate(new Date()))
const recurrenceDays = ref<number[]>([])
const rows = ref<ExerciseRow[]>([])
const isSaving = ref(false)
const formError = ref('')
const rowSelects = ref<HTMLSelectElement[]>([])

const reset = () => {
  title.value = ''
  patientId.value = ''
  kind.value = lockedToTemplate.value ? 'template' : 'single'
  scheduledDate.value = toLocalISODate(new Date())
  recurrenceDays.value = []
  rows.value = [{ key: ++rowSeq, exerciseId: '', sets: 3, reps: '10' }]
  formError.value = ''
  if (props.session) {
    title.value = props.session.title
    patientId.value = props.session.patientId
    kind.value = props.session.isTemplate ? 'template' : 'single'
    scheduledDate.value = props.session.scheduledDate?.slice(0, 10) || ''
    recurrenceDays.value = [...(props.session.recurrenceDays || [])]
    rows.value = props.session.sessionExercises.map(ex => ({ key: ++rowSeq, exerciseId: ex.exerciseId, sets: ex.sets, reps: ex.reps }))
  }
  initialState.value = formState()
}

watch(() => props.open, (open) => { if (open) reset() }, { immediate: true })

const isDirty = computed(() => formState() !== initialState.value)

const totalSets = computed(() => rows.value.reduce((sum, r) => sum + (Number(r.sets) || 0), 0))

const summary = computed(() => {
  const n = rows.value.length
  const ex = `${n} ${n === 1 ? 'exercício' : 'exercícios'}`
  const sets = `${totalSets.value} ${totalSets.value === 1 ? 'série' : 'séries'}`
  return `${ex} · ${sets} no total`
})

const toggleDay = (idx: number) => {
  const set = new Set(recurrenceDays.value)
  set.has(idx) ? set.delete(idx) : set.add(idx)
  recurrenceDays.value = [...set].sort((a, b) => a - b)
}

const addRow = async () => {
  rows.value.push({ key: ++rowSeq, exerciseId: '', sets: 3, reps: '10' })
  await nextTick()
  rowSelects.value[rows.value.length - 1]?.focus()
}

const removeRow = (index: number) => {
  rows.value.splice(index, 1)
}

const stepSets = (row: ExerciseRow, delta: number) => {
  row.sets = Math.min(20, Math.max(1, (Number(row.sets) || 0) + delta))
}

const requestClose = async () => {
  if (isSaving.value) return
  if (isDirty.value) {
    const discard = await confirm({
      title: 'Descartar alterações?',
      message: 'Os dados preenchidos neste formulário serão perdidos.',
      confirmLabel: 'Descartar',
      cancelLabel: 'Continuar editando',
      tone: 'danger',
    })
    if (!discard) return
  }
  emit('close')
}

const validate = (): string => {
  if (!patientId.value) return 'Selecione um paciente nos resultados da pesquisa.'
  if (!title.value.trim()) return 'Informe o nome do treino.'
  if (rows.value.length === 0) return 'Adicione pelo menos um exercício.'
  if (rows.value.some(r => !r.exerciseId)) return 'Selecione o exercício em todas as linhas ou remova as linhas vazias.'
  if (rows.value.some(r => !String(r.reps).trim())) return 'Informe as repetições de cada exercício.'
  if (kind.value === 'template' && recurrenceDays.value.length === 0) return 'Escolha ao menos um dia da semana para o modelo fixo.'
  if (kind.value === 'single' && !scheduledDate.value) return 'Informe a data da sessão.'
  return ''
}

const save = async () => {
  formError.value = validate()
  if (formError.value) return

  const isTemplate = kind.value === 'template'
  isSaving.value = true
  try {
    const payload = {
      title: title.value.trim(),
      recurrenceDays: isTemplate ? recurrenceDays.value : [],
      scheduledDate: isTemplate ? undefined : localDateToISO(scheduledDate.value),
      exercises: rows.value.map(({ exerciseId, sets, reps }) => ({ exerciseId, sets: Number(sets), reps: String(reps).trim() })),
    }
    if (props.session) await api.put(`/sessions/${props.session.id}`, payload)
    else await api.post('/sessions', { ...payload, patientId: patientId.value, isTemplate })
    toast.success(isEditing.value ? (isTemplate ? 'Modelo fixo atualizado.' : 'Sessão atualizada.') : (isTemplate ? 'Modelo fixo criado.' : 'Sessão agendada.'))
    emit('saved')
    emit('close')
  } catch (error: any) {
    console.error('Erro ao salvar sessão:')
    const message = error.response?.data?.message
    formError.value = Array.isArray(message) ? message.join(' ') : message || 'Não foi possível salvar. Verifique sua conexão e tente novamente — seus dados foram mantidos.'
  } finally {
    isSaving.value = false
  }
}

const onKeydown = (e: KeyboardEvent) => {
  if (props.open && e.key === 'Escape') requestClose()
}
watch(() => props.open, (open) => {
  open ? window.addEventListener('keydown', onKeydown) : window.removeEventListener('keydown', onKeydown)
}, { immediate: true })
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const fieldClass = 'w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-shadow focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20'
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
    @click.self="requestClose"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-form-title"
      class="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_24px_48px_-16px_rgba(15,23,42,0.4)] sm:rounded-2xl"
    >
      <!-- Cabeçalho -->
      <header class="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 id="session-form-title" class="text-lg font-semibold text-slate-900">
          {{ isEditing ? (kind === 'template' ? 'Editar modelo fixo' : 'Editar sessão') : lockedToTemplate ? 'Novo modelo fixo' : 'Nova sessão' }}
        </h2>
        <button
          type="button"
          class="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Fechar"
          @click="requestClose"
        >
          <X class="h-5 w-5" />
        </button>
      </header>

      <form id="session-form" class="flex-1 overflow-y-auto" novalidate @submit.prevent="save">
        <!-- 1. Paciente e treino -->
        <section class="space-y-4 px-6 pt-6 pb-8">
          <div class="grid gap-4 sm:grid-cols-2">
            <PatientSelect v-model="patientId" required :disabled="isEditing" />
            <div>
              <label for="sf-title" class="mb-1.5 block text-sm font-medium text-slate-700">Nome do treino</label>
              <input id="sf-title" v-model="title" type="text" required :class="fieldClass" placeholder="Ex.: Ombro — fase 1" />
            </div>
          </div>
        </section>

        <!-- 2. Quando -->
        <section class="border-t border-slate-100 px-6 pt-6 pb-8">
          <h3 class="mb-3 text-sm font-semibold text-slate-900">Quando acontece</h3>

          <div v-if="!lockedToTemplate && !isEditing" role="radiogroup" aria-label="Tipo de agendamento" class="mb-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              role="radio"
              :aria-checked="kind === 'single'"
              class="flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors"
              :class="kind === 'single' ? 'border-blue-800 bg-blue-50/60 ring-1 ring-blue-800' : 'border-slate-200 hover:border-slate-300'"
              @click="kind = 'single'"
            >
              <CalendarDays class="mt-0.5 h-5 w-5 shrink-0" :class="kind === 'single' ? 'text-blue-800' : 'text-slate-400'" aria-hidden="true" />
              <span>
                <span class="block text-sm font-semibold text-slate-900">Sessão única</span>
                <span class="block text-xs text-slate-500">Acontece uma vez, na data escolhida.</span>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              :aria-checked="kind === 'template'"
              class="flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors"
              :class="kind === 'template' ? 'border-blue-800 bg-blue-50/60 ring-1 ring-blue-800' : 'border-slate-200 hover:border-slate-300'"
              @click="kind = 'template'"
            >
              <Repeat class="mt-0.5 h-5 w-5 shrink-0" :class="kind === 'template' ? 'text-blue-800' : 'text-slate-400'" aria-hidden="true" />
              <span>
                <span class="block text-sm font-semibold text-slate-900">Modelo fixo</span>
                <span class="block text-xs text-slate-500">Repete toda semana nos dias escolhidos.</span>
              </span>
            </button>
          </div>

          <div v-if="kind === 'single'" class="max-w-xs">
            <label for="sf-date" class="mb-1.5 block text-sm font-medium text-slate-700">Data da sessão</label>
            <AppDatePicker id="sf-date" v-model="scheduledDate" aria-label="Data da sessão" required />
          </div>

          <div v-else>
            <p id="sf-days-label" class="mb-2 text-sm font-medium text-slate-700">Dias da semana</p>
            <div class="flex flex-wrap gap-2" role="group" aria-labelledby="sf-days-label">
              <button
                v-for="(day, idx) in WEEKDAY_SHORT"
                :key="idx"
                type="button"
                :aria-pressed="recurrenceDays.includes(idx)"
                :aria-label="WEEKDAY_LONG[idx]"
                class="min-h-11 min-w-12 rounded-lg border px-3 text-sm font-semibold transition-colors"
                :class="recurrenceDays.includes(idx)
                  ? 'border-blue-800 bg-blue-800 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-blue-800 hover:text-blue-800'"
                @click="toggleDay(idx)"
              >
                {{ day }}
              </button>
            </div>
            <p class="mt-3 text-sm leading-relaxed text-slate-600">
              <template v-if="recurrenceDays.length">
                Repete <strong class="font-semibold text-slate-900">{{ formatRecurrence(recurrenceDays) }}</strong>.
              </template>
              As sessões da semana são criadas quando você usa <strong class="font-semibold text-slate-900">Gerar sessões da semana</strong> na tela de Sessões.
            </p>
          </div>
        </section>

        <!-- 3. Exercícios -->
        <fieldset :disabled="exercisesLocked" class="border-t border-slate-100 px-6 pt-6 pb-6">
          <h3 class="mb-3 text-sm font-semibold text-slate-900">Exercícios</h3>
          <p v-if="exercisesLocked" class="mb-3 text-sm text-slate-500">Os exercícios desta sessão são preservados para manter o histórico de execução.</p>

          <!-- Cabeçalho de colunas (desktop) -->
          <div v-if="rows.length" class="mb-1.5 hidden grid-cols-[2rem_1fr_8.5rem_7.5rem_2.75rem] gap-3 px-1 text-xs font-medium text-slate-500 sm:grid">
            <span></span>
            <span>Exercício</span>
            <span>Séries</span>
            <span>Repetições</span>
            <span></span>
          </div>

          <ol class="space-y-2">
            <li
              v-for="(row, index) in rows"
              :key="row.key"
              class="grid grid-cols-[2rem_1fr_2.75rem] items-center gap-x-3 gap-y-2 rounded-xl bg-slate-50 p-2 sm:grid-cols-[2rem_1fr_8.5rem_7.5rem_2.75rem]"
            >
              <span class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold tabular-nums text-slate-500 ring-1 ring-slate-200" aria-hidden="true">
                {{ index + 1 }}
              </span>

              <div class="min-w-0">
                <label :for="`sf-ex-${row.key}`" class="sr-only">Exercício {{ index + 1 }}</label>
                <select
                  :id="`sf-ex-${row.key}`"
                  :ref="el => { if (el) rowSelects[index] = el as HTMLSelectElement }"
                  v-model="row.exerciseId"
                  required
                  :class="[fieldClass, !row.exerciseId && formError ? 'border-red-400' : '']"
                >
                  <option value="" disabled>Selecione o exercício</option>
                  <option v-for="ex in exercises" :key="ex.id" :value="ex.id">{{ ex.title }}</option>
                </select>
              </div>

              <button
                type="button"
                class="col-start-3 row-start-1 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-red-700 disabled:pointer-events-none disabled:opacity-30 sm:col-start-5"
                :aria-label="`Remover exercício ${index + 1}`"
                :disabled="rows.length === 1"
                @click="removeRow(index)"
              >
                <Trash2 class="h-4.5 w-4.5" />
              </button>

              <!-- Séries + repetições: segunda linha no mobile, colunas no desktop -->
              <div class="col-span-2 col-start-2 grid grid-cols-2 gap-3 sm:col-span-2 sm:col-start-3 sm:row-start-1 sm:grid-cols-[8.5rem_7.5rem]">
                <div>
                  <span class="mb-1 block text-xs font-medium text-slate-500 sm:sr-only" :id="`sf-sets-label-${row.key}`">Séries</span>
                  <div class="flex h-11 items-center rounded-lg border border-slate-300 bg-white focus-within:border-blue-800 focus-within:ring-2 focus-within:ring-blue-800/20" role="group" :aria-labelledby="`sf-sets-label-${row.key}`">
                    <button type="button" class="flex h-full w-9 items-center justify-center text-slate-500 hover:text-blue-800 disabled:opacity-30" aria-label="Diminuir séries" :disabled="row.sets <= 1" @click="stepSets(row, -1)">
                      <Minus class="h-4 w-4" />
                    </button>
                    <input
                      v-model.number="row.sets"
                      type="number"
                      min="1"
                      max="20"
                      inputmode="numeric"
                      class="w-full min-w-0 bg-transparent text-center text-sm font-semibold tabular-nums text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      :aria-label="`Séries do exercício ${index + 1}`"
                    />
                    <button type="button" class="flex h-full w-9 items-center justify-center text-slate-500 hover:text-blue-800 disabled:opacity-30" aria-label="Aumentar séries" :disabled="row.sets >= 20" @click="stepSets(row, 1)">
                      <Plus class="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label :for="`sf-reps-${row.key}`" class="mb-1 block text-xs font-medium text-slate-500 sm:sr-only">Repetições</label>
                  <input
                    :id="`sf-reps-${row.key}`"
                    v-model="row.reps"
                    type="text"
                    required
                    placeholder="12 ou 30s"
                    :class="[fieldClass, 'text-center tabular-nums']"
                  />
                </div>
              </div>
            </li>
          </ol>

          <button
            type="button"
            class="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-blue-800 transition-colors hover:border-blue-800 hover:bg-blue-50/50"
            @click="addRow"
          >
            <Plus class="h-4 w-4" aria-hidden="true" />
            Adicionar exercício
          </button>
        </fieldset>
      </form>

      <!-- Rodapé fixo -->
      <footer class="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
        <p v-if="formError" role="alert" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ formError }}</p>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm tabular-nums text-slate-500">{{ summary }}</p>
          <div class="flex gap-2">
            <button type="button" class="min-h-11 flex-1 rounded-lg px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:flex-none" @click="requestClose">
              Cancelar
            </button>
            <button
              type="submit"
              form="session-form"
              :disabled="isSaving"
              class="min-h-11 flex-1 rounded-lg bg-blue-800 px-5 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-70 sm:flex-none"
            >
              {{ isSaving ? 'Salvando…' : isEditing ? 'Salvar alterações' : kind === 'template' ? 'Criar modelo fixo' : 'Agendar sessão' }}
            </button>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>
