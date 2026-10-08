<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
import TherapistAgenda from '../components/TherapistAgenda.vue'
import { onMounted, ref } from 'vue'
import api from '../utils/axios'

interface DashboardStats {
  registeredPatients: number
  pendingSessions: number
  completedSessions: number
  periodStart: string
  periodEnd: string
}

const stats = ref<DashboardStats | null>(null)
const loading = ref(false)
const error = ref(false)

async function fetchStats() {
  loading.value = true
  error.value = false
  stats.value = null
  try {
    const response = await api.get<DashboardStats>('/dashboard/stats')
    stats.value = response.data
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchStats)
</script>

<template>
  <MainLayout>
    <template #title>Painel</template>
    <div class="mb-4 text-slate-500">
      <p class="font-medium">Indicadores dos últimos 7 dias</p>
    </div>
    
    <div v-if="error" role="alert" class="mb-4 flex items-center gap-4 text-red-600">
      <p>Não foi possível carregar os indicadores.</p>
      <button type="button" class="min-h-12 px-4 underline" @click="fetchStats">Tentar novamente</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" :aria-busy="loading" aria-live="polite">
      <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
        <h3 class="text-slate-500 text-sm font-medium mb-2">Pacientes Cadastrados</h3>
        <p class="text-3xl font-semibold text-slate-900">{{ loading ? 'Carregando…' : stats?.registeredPatients ?? '—' }}</p>
      </div>
      <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
        <h3 class="text-slate-500 text-sm font-medium mb-2">Sessões Pendentes</h3>
        <p class="text-3xl font-semibold text-amber-600">{{ loading ? 'Carregando…' : stats?.pendingSessions ?? '—' }}</p>
      </div>
      <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
        <h3 class="text-slate-500 text-sm font-medium mb-2">Sessões Concluídas</h3>
        <p class="text-3xl font-semibold text-teal-600">{{ loading ? 'Carregando…' : stats?.completedSessions ?? '—' }}</p>
      </div>
    </div>

    <!-- Calendar Agenda -->
    <div class="w-full">
      <TherapistAgenda />
    </div>
  </MainLayout>
</template>
