<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Pencil, Plus, Sparkles, Trash2, ChartColumn } from 'lucide-vue-next'
import PatientSelect from '../components/PatientSelect.vue'
import AppButton from '../components/AppButton.vue'
import WeeklyPlanPicker from '../components/WeeklyPlanPicker.vue'
import MainLayout from '../layouts/MainLayout.vue'
import DataTable from '../components/DataTable.vue'
import DateRangePicker from '../components/DateRangePicker.vue'
import SessionFormModal from '../components/SessionFormModal.vue'
import ExecutionResultsModal from '../components/ExecutionResultsModal.vue'
import { useFeedback } from '../composables/useFeedback'
import { sessionStatusLabel } from '../utils/sessionFormat'
import api from '../utils/axios'

interface Patient { id: string; fullName: string }
interface Exercise { id: string; title: string }
interface SessionExercise { id?: string; exerciseId: string; sets: number; reps: string; exercise?: Exercise }
interface Session {
  id: string
  title: string
  patientId: string
  patient?: Patient
  status: string
  sessionExercises: SessionExercise[]
  createdAt: string
  scheduledDate?: string
  isTemplate?: boolean
  recurrenceDays?: number[]
}

const { confirm, toast } = useFeedback()

const sessions = ref<Session[]>([])
const exercises = ref<Exercise[]>([])
const isLoading = ref(false)

const isModalOpen = ref(false)
const editingSession = ref<Session | null>(null)
const selectedSessionForResults = ref<Session | null>(null)
const isResultModalOpen = ref(false)

const startDate = ref('')
const endDate = ref('')
const selectedPatientFilter = ref('')

const initDates = () => {
  const today = new Date()
  const firstDay = new Date(today.setDate(today.getDate() - today.getDay()))
  const lastDay = new Date(firstDay)
  lastDay.setDate(lastDay.getDate() + 6)

  const format = (d: Date) => d.toISOString().split('T')[0]
  startDate.value = format(firstDay)
  endDate.value = format(lastDay)
}
initDates()

const filteredSessions = computed(() => {
  let result = sessions.value

  if (selectedPatientFilter.value) {
    result = result.filter(s => s.patientId === selectedPatientFilter.value)
  }

  if (startDate.value) {
    const start = new Date(startDate.value + 'T00:00:00')
    result = result.filter(s => {
      const d = s.scheduledDate ? new Date(s.scheduledDate) : new Date(s.createdAt)
      return d >= start
    })
  }

  if (endDate.value) {
    const end = new Date(endDate.value + 'T23:59:59.999')
    result = result.filter(s => {
      const d = s.scheduledDate ? new Date(s.scheduledDate) : new Date(s.createdAt)
      return d <= end
    })
  }

  return result
})

const listLoading = ref(false)

const fetchData = async () => {
  if (listLoading.value) return
  listLoading.value = true
  try {
    const [sessRes, exRes] = await Promise.all([
      api.get('/sessions'),
      api.get('/exercises')
    ])
    sessions.value = sessRes.data
    exercises.value = exRes.data
  } catch (error) {
    console.error('Erro ao buscar dados:')
    toast.error('Erro ao carregar dados das sessões.')
  } finally {
    listLoading.value = false
  }
}

const generateWeek = async () => {
  isLoading.value = true
  try {
    const res = await api.post('/sessions/generate-week')
    toast.success(`Semana gerada com sucesso! ${res.data.generated} nova(s) sessão(ões) criada(s).`)
    await fetchData()
  } catch (error) {
    console.error('Erro ao gerar semana:')
    toast.error('Erro ao gerar sessões da semana.')
  } finally {
    isLoading.value = false
  }
}

const openModal = () => {
  editingSession.value = null
  isModalOpen.value = true
}

const editSession = (session: Session) => {
  editingSession.value = session
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const openResults = (session: Session) => {
  selectedSessionForResults.value = session
  isResultModalOpen.value = true
}

const closeResults = () => {
  isResultModalOpen.value = false
  selectedSessionForResults.value = null
}

const deleteSession = async (id: string, isTemplate = false) => {
  const confirmed = await confirm({
    title: isTemplate ? 'Excluir modelo fixo?' : 'Excluir sessão agendada?',
    message: isTemplate
      ? 'Este modelo fixo deixará de gerar novos atendimentos nas próximas semanas.'
      : 'Esta sessão agendada será removida permanentemente do histórico do paciente.',
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
    tone: 'danger'
  })
  if (!confirmed) return

  try {
    await api.delete(`/sessions/${id}`)
    toast.success(isTemplate ? 'Modelo fixo excluído.' : 'Sessão excluída com sucesso.')
    await fetchData()
  } catch (error) {
    console.error('Erro ao deletar sessão:')
    toast.error('Não foi possível excluir o registro.')
  }
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR')
}

onMounted(fetchData)
</script>

<template>
  <MainLayout>
    <template #title>Sessões de Treino</template>

    <!-- Cabeçalho da página -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
      <div>
        <p class="text-slate-600 text-sm">Monte sessões e acompanhe as execuções dos pacientes.</p>
      </div>

      <div class="flex flex-wrap gap-3 items-center w-full sm:w-auto">
        <WeeklyPlanPicker />
        <AppButton
          type="button"
          @click="generateWeek"
          :disabled="isLoading"
        >
          <Sparkles aria-hidden="true" />
          <span>{{ isLoading ? 'Gerando...' : 'Gerar sessões da semana' }}</span>
        </AppButton>

        <AppButton variant="primary"
          type="button"
          @click="openModal"
        >
          <Plus aria-hidden="true" />
          <span>Nova Sessão</span>
        </AppButton>
      </div>
    </div>

    <!-- Seção: Sessões Agendadas -->
    <div class="space-y-4">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 class="text-base font-semibold text-slate-900">Sessões Agendadas</h3>
          <p class="text-xs text-slate-500">Atendimentos individuais agendados ou concluídos.</p>
        </div>


      </div>

      <!-- Tabela de Sessões com DataTable -->
      <DataTable
      :loading="listLoading"
      @reload="fetchData"
        :items="filteredSessions"
        :columns="[
          { key: 'title', label: 'Título' },
          { key: 'patient', label: 'Paciente' },
          { key: 'scheduledDate', label: 'Data Agendada' },
          { key: 'status', label: 'Status' },
          { key: 'exercisesCount', label: 'Exercícios' },
          { key: 'actions', label: 'Ações', align: 'right' }
        ]"
        :search-fields="['title']"
        search-placeholder="Buscar sessões por título..."
      >
        <template #header-actions>
          <PatientSelect v-model="selectedPatientFilter" label="Filtrar por paciente" hide-label placeholder="Todos os pacientes" class="w-full sm:w-64" />
          <DateRangePicker v-model:start="startDate" v-model:end="endDate" />
        </template>
        <template #cell(patient)="{ item }">
          <span class="text-slate-800 font-medium">{{ item.patient?.fullName || 'Não informado' }}</span>
        </template>

        <template #cell(scheduledDate)="{ item }">
          <span class="text-slate-600 tabular-nums">
            {{ item.scheduledDate ? formatDate(item.scheduledDate) : formatDate(item.createdAt) }}
          </span>
        </template>

        <template #cell(status)="{ item }">
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border"
            :class="item.status === 'CONCLUIDO'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'"
          >
            {{ sessionStatusLabel(item.status) }}
          </span>
        </template>

        <template #cell(exercisesCount)="{ item }">
          <span class="text-slate-600 text-sm">
            {{ item.sessionExercises?.length || 0 }} exercício(s)
          </span>
        </template>

        <template #cell(actions)="{ item }">
          <div class="flex flex-wrap justify-end items-center gap-2">
            <button type="button" @click="editSession(item)" class="action-button action-button-primary" aria-label="Editar sessão" title="Editar sessão">
              <Pencil class="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              v-if="item.status === 'CONCLUIDO' || item.status === 'PARCIAL'"
              type="button"
              @click="openResults(item)"
              class="action-button action-button-secondary"
             aria-label="Ver Resultados" title="Ver Resultados">
              <ChartColumn class="h-4 w-4" aria-hidden="true" /></button>
            <button
              type="button"
              @click="deleteSession(item.id, false)"
              class="action-button action-button-danger"
             
             aria-label="Excluir sessão" title="Excluir sessão">
              <Trash2 class="w-4 h-4" aria-hidden="true" /></button>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Modal Unificado de Criação de Sessão / Modelo -->
    <SessionFormModal
      :open="isModalOpen"
      :session="editingSession"
     
      :exercises="exercises"
      @close="closeModal"
      @saved="fetchData"
    />

    <!-- Modal Moderno de Resultados e Vídeo -->
    <ExecutionResultsModal
      :open="isResultModalOpen"
      :session-id="selectedSessionForResults?.id || null"
      :session-title="selectedSessionForResults?.title"
      :patient-name="selectedSessionForResults?.patient?.fullName"
      @close="closeResults"
    />
  </MainLayout>
</template>
