<script setup lang="ts">
import AppDatePicker from '../components/AppDatePicker.vue'
import { CalendarDays, FileText, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'
import MainLayout from '../layouts/MainLayout.vue'
import DataTable from '../components/DataTable.vue'
import AppButton from '../components/AppButton.vue'
import WeeklyPlanPicker from '../components/WeeklyPlanPicker.vue'
import api from '../utils/axios'
import { useFeedback } from '../composables/useFeedback'
const { toast } = useFeedback()

interface User {
  id: string
  email: string
}

interface Patient {
  id: string
  fullName: string
  medicalRecordNumber: string
  birthDate: string
  user?: User
}

const patients = ref<Patient[]>([])
const isModalOpen = ref(false)
const isLoading = ref(false)

const currentPatient = ref<{
  id?: string
  fullName: string
  medicalRecordNumber: string
  birthDate: string
  mobileAccess: boolean
  email?: string
  password?: string
  hasExistingUser: boolean
}>({ fullName: '', medicalRecordNumber: '', birthDate: '', mobileAccess: false, email: '', password: '', hasExistingUser: false })

const listLoading = ref(false)

const fetchPatients = async () => {
  if (listLoading.value) return
  listLoading.value = true
  try {
    const response = await api.get('/patients')
    patients.value = response.data
  } catch (error) {
    toast.error('Não foi possível carregar pacientes. Tente recarregar.')
  } finally {
    listLoading.value = false
  }
}

const openModal = (patient?: Patient) => {
  if (patient) {
    currentPatient.value = {
      id: patient.id,
      fullName: patient.fullName,
      medicalRecordNumber: patient.medicalRecordNumber,
      birthDate: patient.birthDate,
      mobileAccess: !!patient.user,
      email: patient.user?.email || '',
      password: '',
      hasExistingUser: !!patient.user
    }
  } else {
    currentPatient.value = { fullName: '', medicalRecordNumber: '', birthDate: '', mobileAccess: false, email: '', password: '', hasExistingUser: false }
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const savePatient = async () => {
  if (!currentPatient.value.birthDate) {
    toast.error('Selecione a data de nascimento.');
    return;
  }
  isLoading.value = true
  try {
    const payload: any = {
      fullName: currentPatient.value.fullName,
      medicalRecordNumber: currentPatient.value.medicalRecordNumber,
      birthDate: currentPatient.value.birthDate,
    }

    if (currentPatient.value.mobileAccess && !currentPatient.value.hasExistingUser) {
      payload.mobileAccess = true
      payload.email = currentPatient.value.email
      payload.password = currentPatient.value.password
    }

    if (currentPatient.value.id) {
      await api.put(`/patients/${currentPatient.value.id}`, payload)
    } else {
      await api.post('/patients', payload)
    }
    await fetchPatients()
    closeModal()
  } catch (error: any) {
    console.error('Erro ao salvar paciente:')
    if (error.response?.data?.message) {
      alert(`Erro: ${error.response.data.message}`)
    } else {
      alert('Erro ao salvar o paciente. Verifique os dados e tente novamente.')
    }
  } finally {
    isLoading.value = false
  }
}

const deletePatient = async (id: string) => {
  if (!confirm('Deseja realmente excluir este paciente?')) return
  try {
    await api.delete(`/patients/${id}`)
    await fetchPatients()
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Não foi possível excluir o paciente.')
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR')
}

onMounted(fetchPatients)
</script>

<template>
  <MainLayout>
    <template #title>Gestão de Pacientes</template>
    
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <p class="text-slate-500 text-sm">Gerencie os prontuários e acessos dos seus pacientes.</p>
      <div class="flex flex-wrap gap-3 items-center w-full sm:w-auto">
        <WeeklyPlanPicker />
        <AppButton 
          variant="primary"
          type="button"
          @click="openModal()"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>Novo Paciente</span>
        </AppButton>
      </div>
    </div>

    <!-- Tabela de Pacientes usando DataTable -->
    <DataTable
      :loading="listLoading"
      @reload="fetchPatients"
      :items="patients"
      :columns="[
        { key: 'fullName', label: 'Nome Completo' },
        { key: 'medicalRecordNumber', label: 'Prontuário' },
        { key: 'birthDate', label: 'Nascimento' },
        { key: 'app', label: 'App', align: 'center' },
        { key: 'actions', label: 'Ações', align: 'right' }
      ]"
      :search-fields="['fullName', 'medicalRecordNumber']"
      search-placeholder="Buscar pacientes por nome ou prontuário..."
    >
      <template #cell(birthDate)="{ item }">
        {{ formatDate(item.birthDate) }}
      </template>

      <template #cell(app)="{ item }">
        <span v-if="item.user" class="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">Ativo</span>
        <span v-else class="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded">Sem Acesso</span>
      </template>

      <template #cell(actions)="{ item }">
        <div class="flex flex-wrap justify-end gap-3">
          <RouterLink :to="`/patients/${item.id}/progress`" class="action-button action-button-primary min-h-12" :aria-label="`Ver progresso de ${item.fullName}`" title="Ver progresso"><FileText class="h-4 w-4" aria-hidden="true" /></RouterLink>
          <RouterLink :to="`/patients/${item.id}/plan`" class="action-button action-button-primary" aria-label="Plano Semanal" title="Plano Semanal"><CalendarDays class="h-4 w-4" aria-hidden="true" /></RouterLink>
          <button @click="openModal(item)" class="action-button action-button-primary" aria-label="Editar" title="Editar"><Pencil class="h-4 w-4" aria-hidden="true" /></button>
          <button @click="deletePatient(item.id)" class="action-button action-button-danger" aria-label="Excluir" title="Excluir"><Trash2 class="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </template>
    </DataTable>

    <!-- Modal de Cadastro/Edição -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 class="text-lg font-semibold text-slate-800">{{ currentPatient.id ? 'Editar Paciente' : 'Novo Paciente' }}</h3>
          <button @click="closeModal" class="text-slate-400 hover:text-slate-600">&times;</button>
        </div>
        
        <form @submit.prevent="savePatient" class="p-6 space-y-4 overflow-y-auto">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
            <input v-model="currentPatient.fullName" type="text" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 outline-none">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Número do Prontuário</label>
            <input v-model="currentPatient.medicalRecordNumber" type="text" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 outline-none">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
            <AppDatePicker v-model="currentPatient.birthDate" aria-label="Data de nascimento" required />
          </div>

          <!-- Seção de Acesso Mobile -->
          <div class="border-t border-slate-200 pt-4 mt-2">
            <label class="flex items-center space-x-2 text-slate-700 font-medium mb-3 cursor-pointer">
              <input type="checkbox" v-model="currentPatient.mobileAccess" :disabled="currentPatient.hasExistingUser" class="rounded border-slate-300 text-blue-800 focus:ring-blue-800">
              <span>Liberar Acesso Mobile (Aplicativo)</span>
            </label>
            
            <div v-if="currentPatient.mobileAccess && !currentPatient.hasExistingUser" class="grid grid-cols-1 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <p class="text-xs text-slate-500 mb-2">Configure os dados de acesso inicial do paciente.</p>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">E-mail de Acesso</label>
                <input v-model="currentPatient.email" type="email" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 outline-none" placeholder="paciente@email.com">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Senha Provisória</label>
                <input v-model="currentPatient.password" type="password" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 outline-none" placeholder="Senha123">
              </div>
            </div>

            <div v-if="currentPatient.hasExistingUser" class="bg-green-50 p-3 rounded-lg border border-green-200 text-sm text-green-700 flex items-center">
              <span class="mr-2">✓</span> Acesso ao aplicativo já configurado para: <strong>{{ currentPatient.email }}</strong>
            </div>
          </div>

          <div class="pt-4 flex flex-wrap justify-end gap-2 shrink-0 border-t border-slate-200">
            <button type="button" @click="closeModal" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
            <button type="submit" :disabled="isLoading" class="px-4 py-2 bg-blue-800 text-white rounded-lg font-medium hover:bg-blue-900 disabled:opacity-70">
              {{ isLoading ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </MainLayout>
</template>
