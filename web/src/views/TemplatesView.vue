<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import WeeklyPlanPicker from '../components/WeeklyPlanPicker.vue'
import MainLayout from '../layouts/MainLayout.vue'
import DataTable from '../components/DataTable.vue'
import AppButton from '../components/AppButton.vue'
import RecurrenceDays from '../components/RecurrenceDays.vue'
import SessionFormModal from '../components/SessionFormModal.vue'
import { useFeedback } from '../composables/useFeedback'
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

const templates = ref<Session[]>([])
const exercises = ref<Exercise[]>([])
const isModalOpen = ref(false)
const editingSession = ref<Session | null>(null)

const fetchData = async () => {
  try {
    const [tempRes, exRes] = await Promise.all([
      api.get('/sessions?isTemplate=true'),
      api.get('/exercises')
    ])
    templates.value = tempRes.data
    exercises.value = exRes.data
  } catch (error) {
    console.error('Erro ao buscar dados:')
    toast.error('Erro ao carregar modelos fixos.')
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

const deleteSession = async (id: string) => {
  const confirmed = await confirm({
    title: 'Excluir modelo fixo?',
    message: 'Este modelo não gerará mais atendimentos nas próximas semanas.',
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
    tone: 'danger'
  })
  if (!confirmed) return

  try {
    await api.delete(`/sessions/${id}`)
    toast.success('Modelo fixo excluído com sucesso.')
    await fetchData()
  } catch (error) {
    console.error('Erro ao deletar modelo:')
    toast.error('Não foi possível excluir o modelo fixo.')
  }
}

onMounted(fetchData)
</script>

<template>
  <MainLayout>
    <template #title>Modelos Fixos (Recorrentes)</template>
    
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <p class="text-slate-600 text-sm">Gerencie os modelos fixos de sessões para os pacientes.</p>
      
      <div class="flex flex-wrap gap-3 items-center w-full sm:w-auto">
        <WeeklyPlanPicker />
        <AppButton to="/prescriptions">
          <ArrowLeft class="h-4 w-4" aria-hidden="true" />
          <span>Voltar para Sessões</span>
        </AppButton>
        <AppButton 
          variant="primary"
          type="button"
          @click="openModal"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>Novo Modelo</span>
        </AppButton>
      </div>
    </div>

    <!-- Tabela de Templates usando DataTable -->
    <DataTable
      :items="templates"
      :columns="[
        { key: 'title', label: 'Título' },
        { key: 'patient', label: 'Paciente' },
        { key: 'recurrence', label: 'Dias da Semana' },
        { key: 'exercisesCount', label: 'Exercícios' },
        { key: 'actions', label: 'Ações', align: 'right' }
      ]"
      :search-fields="['title']"
      search-placeholder="Buscar modelos fixos..."
    >
      <template #cell(title)="{ item }">
        <span class="font-medium text-slate-900">{{ item.title }}</span>
      </template>
      
      <template #cell(patient)="{ item }">
        <span class="text-slate-700">{{ item.patient?.fullName || 'Não informado' }}</span>
      </template>

      <template #cell(recurrence)="{ item }">
        <RecurrenceDays :days="item.recurrenceDays" />
      </template>

      <template #cell(exercisesCount)="{ item }">
        <span class="text-slate-600 text-sm">{{ item.sessionExercises?.length || 0 }} exercício(s)</span>
      </template>

      <template #cell(actions)="{ item }">
        <div class="flex justify-end gap-2">
          <button type="button" @click="editSession(item)" class="action-button action-button-primary" aria-label="Editar modelo fixo" title="Editar modelo fixo">
            <Pencil class="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            @click="deleteSession(item.id)"
            class="action-button action-button-danger"
           
           aria-label="Excluir modelo fixo" title="Excluir modelo fixo">
            <Trash2 class="w-4 h-4" aria-hidden="true" /></button>
        </div>
      </template>
    </DataTable>

    <!-- Modal Compartilhado de Novo Modelo Fixo -->
    <SessionFormModal
      :open="isModalOpen"
      :session="editingSession"
     
      :exercises="exercises"
      mode="template"
      @close="closeModal"
      @saved="fetchData"
    />
  </MainLayout>
</template>
