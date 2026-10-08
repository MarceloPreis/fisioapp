<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CheckCircle, Clock, Filter, AlertCircle, FileText, Search } from 'lucide-vue-next'
import api from '../utils/axios'
import MainLayout from '../layouts/MainLayout.vue'
import ExecutionResultsModal from '../components/ExecutionResultsModal.vue'
import PatientSelect from '../components/PatientSelect.vue'
import AppButton from '../components/AppButton.vue'
import AppSelect from '../components/AppSelect.vue'
import DateRangePicker from '../components/DateRangePicker.vue'
import { sessionStatusLabel } from '../utils/sessionFormat'

interface Review {
  id: string
  disposition: string
  note?: string
  createdAt: string
  reviewer?: { id: string; name: string }
}

interface SessionQueueItem {
  id: string
  title: string
  status: string
  scheduledDate: string
  createdAt: string
  patient: { id: string; fullName: string }
  sessionExercises: {
    id: string
    sets: number
    reps: string
    completedSets: boolean[]
    exercise: { id: string; title: string }
  }[]
  latestReview: Review | null
}

const items = ref<SessionQueueItem[]>([])
const loading = ref(false)
const error = ref('')

const filters = ref({
  patientId: '',
  from: '',
  to: '',
  reviewStatus: 'PENDING'
})

const selectedSessionId = ref<string | null>(null)
const selectedSessionTitle = ref('')
const selectedPatientName = ref('')
const showModal = ref(false)

const openModal = (item: SessionQueueItem) => {
  selectedSessionId.value = item.id
  selectedSessionTitle.value = item.title || 'Sessão'
  selectedPatientName.value = item.patient?.fullName || ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedSessionId.value = null
  fetchQueue() // refresh on close to see updated review status
}

const fetchQueue = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams()
    if (filters.value.patientId) params.append('patientId', filters.value.patientId)
    if (filters.value.from) params.append('from', filters.value.from)
    if (filters.value.to) params.append('to', filters.value.to)
    if (filters.value.reviewStatus) params.append('reviewStatus', filters.value.reviewStatus)
    
    const res = await api.get(`/sessions/review-queue?${params.toString()}`)
    items.value = res.data.items || []
  } catch (err) {
    error.value = 'Erro ao carregar a fila de revisão.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const formatDate = (iso: string) => {
  if (!iso) return ''
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

const countCompleted = (exercises: SessionQueueItem['sessionExercises']) => {
  if (!exercises) return { done: 0, pending: 0, total: 0 }
  let done = 0
  let total = 0
  for (const ex of exercises) {
    total += ex.sets
    done += (ex.completedSets || []).filter(Boolean).length
  }
  return { done, pending: total - done, total }
}

const dispositionLabels: Record<string, string> = {
  REVIEWED: 'Revisada',
  FOLLOW_UP: 'Precisa de retorno',
  NEXT_VISIT: 'Discutir na consulta'
}

const reviewStatusOptions = [
  { label: 'Status: Todos', value: 'ALL' },
  { label: 'Status: Pendente', value: 'PENDING' },
  { label: 'Status: Revisada', value: 'REVIEWED' },
  { label: 'Status: Precisa de retorno', value: 'FOLLOW_UP' },
  { label: 'Status: Discutir na consulta', value: 'NEXT_VISIT' }
]

onMounted(() => {
  fetchQueue()
})
</script>

<template>
  <MainLayout>
    <template #title>Fila de revisão</template>
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Fila de Revisão de Sessões</h1>
        <p class="mt-1 text-sm text-slate-500">Avalie os resultados das sessões concluídas ou parciais dos pacientes.</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div class="flex items-center gap-2 mb-4 text-sm font-semibold text-slate-700">
        <Filter class="h-4 w-4" />
        Filtros
      </div>
      <form @submit.prevent="fetchQueue" class="flex flex-wrap items-center gap-3">
        <PatientSelect v-model="filters.patientId" label="Filtrar por paciente" hide-label placeholder="Todos os pacientes" class="w-full sm:w-64" />
        
        <DateRangePicker v-model:start="filters.from" v-model:end="filters.to" />
        
        <AppSelect
          v-model="filters.reviewStatus"
          :options="reviewStatusOptions"
          hide-label
          label="Status de Revisão"
          class="w-full sm:w-56"
        />

        <AppButton type="submit" :disabled="loading" variant="primary">
          <Search class="h-4 w-4" aria-hidden="true" />
          <span>{{ loading ? 'Buscando...' : 'Buscar' }}</span>
        </AppButton>
      </form>
    </div>

    <!-- Loading & Error -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="flex items-center gap-2 text-slate-500">
        <Clock class="h-5 w-5 animate-spin" /> Carregando fila...
      </div>
    </div>
    <div v-else-if="error" class="rounded-lg bg-red-50 p-4 text-sm text-red-800">
      {{ error }}
    </div>
    <div v-else-if="items.length === 0" class="flex flex-col items-center justify-center py-16 text-slate-500">
      <CheckCircle class="mb-4 h-12 w-12 text-emerald-200" />
      <p class="text-lg font-medium text-slate-900">Fila vazia</p>
      <p>Não há sessões com os filtros selecionados.</p>
    </div>
    
    <!-- List -->
    <div v-else class="space-y-4">
      <div v-for="item in items" :key="item.id" 
        class="flex flex-col md:flex-row gap-4 overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md"
        :class="!item.latestReview ? 'border-amber-300 ring-1 ring-amber-300/50' : 'border-slate-200'">
        
        <div class="flex flex-1 flex-col p-5">
          <div class="flex items-center justify-between mb-3">
            <span v-if="!item.latestReview" class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              <AlertCircle class="h-3 w-3" /> Revisão Pendente
            </span>
            <span v-else class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
              <CheckCircle class="h-3 w-3 text-emerald-600" /> {{ dispositionLabels[item.latestReview.disposition] || 'Revisada' }}
            </span>
            <span class="text-xs text-slate-500">{{ formatDate(item.scheduledDate || item.createdAt) }}</span>
          </div>
          
          <h3 class="text-lg font-semibold text-slate-900">{{ item.patient.fullName }}</h3>
          <p class="text-sm text-slate-600 mb-4">{{ item.title || 'Sessão' }}</p>
          
          <div class="grid grid-cols-3 gap-2 mt-auto">
            <div class="rounded-md bg-slate-50 p-2 text-center border border-slate-100">
              <span class="block text-xs font-medium text-slate-500">Séries Feitas</span>
              <span class="block text-lg font-semibold text-emerald-700">{{ countCompleted(item.sessionExercises).done }}</span>
            </div>
            <div class="rounded-md bg-slate-50 p-2 text-center border border-slate-100">
              <span class="block text-xs font-medium text-slate-500">Pendentes</span>
              <span class="block text-lg font-semibold text-slate-700">{{ countCompleted(item.sessionExercises).pending }}</span>
            </div>
            <div class="rounded-md bg-slate-50 p-2 text-center border border-slate-100">
              <span class="block text-xs font-medium text-slate-500">Status</span>
              <span class="block text-sm font-semibold mt-1" :class="item.status === 'CONCLUIDO' ? 'text-emerald-700' : 'text-blue-700'">
                {{ sessionStatusLabel(item.status) }}
              </span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center justify-center border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50 p-5">
          <button @click="openModal(item)" class="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <FileText class="h-4 w-4" />
            Ver Resultados e Revisar
          </button>
        </div>
      </div>
    </div>
    </div>
  </MainLayout>

  <ExecutionResultsModal
    :open="showModal"
    :session-id="selectedSessionId"
    :session-title="selectedSessionTitle"
    :patient-name="selectedPatientName"
    @close="closeModal"
  />
</template>
