<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router'
import { ArrowLeft, FileText, Plus, Save } from 'lucide-vue-next'
import MainLayout from '../layouts/MainLayout.vue'
import AppButton from '../components/AppButton.vue'
import MarkdownContent from '../components/MarkdownContent.vue'
import api from '../utils/axios'
import { useFeedback } from '../composables/useFeedback'

interface Report { id: string; title: string; content: string; createdAt: string; author?: { name: string } }
const route = useRoute()
const { toast, confirm } = useFeedback()
const patient = ref<{ id: string; fullName: string } | null>(null)
const reports = ref<Report[]>([])
const loading = ref(true)
const failed = ref(false)
const composing = ref(false)
const saving = ref(false)
const title = ref('')
const content = ref('')
const preview = ref(false)
const dirty = computed(() => !!(title.value.trim() || content.value.trim()))
const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.value || saving.value) { event.preventDefault(); event.returnValue = '' } }
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onUnmounted(() => { requestVersion++; window.removeEventListener('beforeunload', beforeUnload) })
let requestVersion = 0
const load = async () => {
  const version = ++requestVersion
  loading.value = true; failed.value = false; patient.value = null; reports.value = []
  composing.value = false; title.value = ''; content.value = ''
  try {
    const { data } = await api.get(`/patients/${route.params.id}/reports`)
    if (version !== requestVersion) return
    patient.value = data.patient; reports.value = data.reports
  } catch {
    if (version === requestVersion) failed.value = true
  } finally { if (version === requestVersion) loading.value = false }
}
const discard = async () => !dirty.value || await confirm({ title: 'Descartar relatório?', message: 'O texto ainda não foi salvo.', confirmLabel: 'Descartar', tone: 'danger' })
const cancel = async () => { if (await discard()) { composing.value = false; title.value = ''; content.value = '' } }
const canLeave = async () => !saving.value && await discard()
onBeforeRouteLeave(canLeave)
onBeforeRouteUpdate(canLeave)
watch(() => route.params.id, load, { immediate: true })
const save = async () => {
  if (saving.value || !patient.value || !title.value.trim() || !content.value.trim()) return
  saving.value = true
  try {
    const { data } = await api.post(`/patients/${patient.value.id}/reports`, { title: title.value.trim(), content: content.value.trim() })
    reports.value.unshift({ ...data, author: { name: 'Você' } })
    title.value = ''; content.value = ''; composing.value = false
    toast.success('Relatório adicionado à evolução do paciente.')
  } catch { toast.error('Não foi possível salvar o relatório. Seu texto foi mantido para tentar novamente.') }
  finally { saving.value = false }
}
const formatDate = (date: string) => new Date(date).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })
</script>

<template>
  <MainLayout>
    <template #title>Evolução do paciente</template>
    <AppButton to="/patients" class="mb-6 min-h-12"><ArrowLeft aria-hidden="true" /> Pacientes</AppButton>
    <p v-if="loading" role="status" class="text-slate-600">Carregando evolução...</p>
    <div v-else-if="failed" role="alert" class="rounded-xl border border-red-200 bg-white p-6">
      <p class="mb-4 text-red-700">Não foi possível carregar a evolução deste paciente.</p>
      <AppButton @click="load" class="min-h-12">Tentar novamente</AppButton>
    </div>
    <template v-else-if="patient">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h2 class="text-2xl font-bold text-slate-900">{{ patient.fullName }}</h2><p class="mt-2 text-base text-slate-600">Laudos e observações que acompanham a evolução do paciente.</p></div>
        <AppButton v-if="!composing" variant="primary" class="min-h-12" @click="composing = true; preview = false"><Plus aria-hidden="true" /> Novo relatório</AppButton>
      </header>
      <form v-if="composing" @submit.prevent="save" class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="mb-5 text-xl font-semibold text-slate-900">Novo relatório</h3>
        <label for="report-title" class="mb-2 block font-medium text-slate-700">Título</label>
        <input id="report-title" v-model="title" required maxlength="200" :disabled="saving" placeholder="Ex.: Avaliação inicial" class="mb-5 min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base focus:outline-blue-800" />
        <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
          <label for="report-content" class="font-medium text-slate-700">Laudo ou observação</label>
          <button type="button" :disabled="saving" :aria-pressed="preview" @click="preview = !preview" class="min-h-12 rounded-lg px-3 font-semibold text-blue-800 hover:bg-blue-50">{{ preview ? 'Editar Markdown' : 'Pré-visualizar' }}</button>
        </div>
        <textarea v-show="!preview" id="report-content" v-model="content" required maxlength="100000" rows="12" :disabled="saving" aria-describedby="markdown-help" placeholder="Descreva a avaliação, os achados e a evolução..." class="w-full rounded-lg border border-slate-300 p-3 font-mono text-base focus:outline-blue-800" />
        <div v-if="preview" class="min-h-48 rounded-lg border border-slate-200 p-4"><MarkdownContent v-if="content.trim()" :content="content" /><p v-else class="text-slate-500">Escreva o relatório para visualizar.</p></div>
        <p id="markdown-help" class="mt-3 text-base text-slate-600">Use # para títulos, **texto** para negrito e - para listas. O relatório salvo fica registrado no histórico; novas observações devem ser adicionadas em outro relatório.</p>
        <div class="mt-6 flex flex-wrap justify-end gap-3"><AppButton :disabled="saving" @click="cancel" class="min-h-12">Cancelar</AppButton><AppButton type="submit" variant="primary" :disabled="saving || !title.trim() || !content.trim()" class="min-h-12"><Save aria-hidden="true" /> {{ saving ? 'Salvando...' : 'Salvar relatório' }}</AppButton></div>
      </form>
      <section aria-label="Histórico de relatórios" class="space-y-5">
        <div v-if="!reports.length" class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><FileText class="mx-auto mb-4 h-10 w-10 text-teal-600" aria-hidden="true" /><h3 class="text-lg font-semibold text-slate-900">Nenhum relatório registrado</h3><p class="mt-2 text-base text-slate-600">Adicione o primeiro laudo ou observação para iniciar a evolução.</p></div>
        <article v-for="report in reports" :key="report.id" class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 class="text-xl font-semibold text-slate-900">{{ report.title }}</h3>
          <p class="mt-2 mb-5 text-base text-slate-600"><time :datetime="report.createdAt">{{ formatDate(report.createdAt) }}</time> · {{ report.author?.name || 'Fisioterapeuta' }}</p>
          <MarkdownContent :content="report.content" />
        </article>
      </section>
    </template>
  </MainLayout>
</template>
