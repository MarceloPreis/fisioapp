<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { AlertTriangle, CheckCircle2, Loader2, MessageSquareText, PlayCircle, VideoOff, X } from 'lucide-vue-next'
import api from '../utils/axios'
import { formatTimestamp } from '../utils/sessionFormat'

interface ExecutionNote { id: string; timestampSeconds: number; description: string }
interface Execution { id: string; createdAt: string; videoObjectName?: string | null; notes?: ExecutionNote[] }

const props = defineProps<{
  open: boolean
  sessionId: string | null
  sessionTitle?: string
  patientName?: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const executions = ref<Execution[]>([])
const active = ref<Execution | null>(null)
const videoUrl = ref('')
const isLoadingList = ref(false)
const isLoadingVideo = ref(false)
const listError = ref('')
const videoError = ref('')
const videoEl = ref<HTMLVideoElement | null>(null)

const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso))

const activeNotes = computed(() =>
  [...(active.value?.notes ?? [])].sort((a, b) => a.timestampSeconds - b.timestampSeconds),
)

const getAttemptClass = (id: string) => {
  if (active.value?.id === id) {
    return 'bg-blue-50 text-blue-900'
  }
  return 'text-slate-700 hover:bg-slate-50'
}

const selectExecution = async (exec: Execution) => {
  active.value = exec
  videoUrl.value = ''
  videoError.value = ''
  if (!exec.videoObjectName) return

  isLoadingVideo.value = true
  try {
    const res = await api.get(`/executions/${exec.id}/video-url`)
    // Ignora respostas de uma tentativa que já não está selecionada
    if (active.value?.id === exec.id) videoUrl.value = res.data.url
  } catch (error) {
    console.error('Erro ao carregar vídeo:')
    videoError.value = 'Não foi possível carregar o vídeo desta tentativa.'
  } finally {
    isLoadingVideo.value = false
  }
}

const load = async () => {
  if (!props.sessionId) return
  isLoadingList.value = true
  listError.value = ''
  executions.value = []
  active.value = null
  videoUrl.value = ''
  try {
    const res = await api.get(`/executions/session/${props.sessionId}`)
    executions.value = res.data ?? []
    if (executions.value.length) await selectExecution(executions.value[0])
  } catch (error) {
    console.error('Erro ao buscar resultados:')
    listError.value = 'Não foi possível carregar os resultados desta sessão.'
  } finally {
    isLoadingList.value = false
  }
}

const seekTo = (seconds: number) => {
  if (!videoEl.value) return
  videoEl.value.currentTime = seconds
  videoEl.value.play().catch(() => { /* autoplay bloqueado: o usuário aperta play */ })
}

const onKeydown = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close') }

watch(() => props.open, (open) => {
  if (open) {
    load()
    window.addEventListener('keydown', onKeydown)
  } else {
    window.removeEventListener('keydown', onKeydown)
  }
}, { immediate: true })
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-0 sm:p-4" @click.self="emit('close')">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="results-title"
      class="flex h-full w-full max-w-6xl flex-col overflow-hidden bg-white shadow-[0_24px_48px_-16px_rgba(15,23,42,0.5)] sm:h-[90vh] sm:rounded-2xl"
    >
      <header class="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div class="min-w-0">
          <h2 id="results-title" class="truncate text-lg font-semibold text-slate-900">{{ sessionTitle || 'Resultados da sessão' }}</h2>
          <p v-if="patientName" class="truncate text-sm text-slate-500">{{ patientName }}</p>
        </div>
        <button type="button" class="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Fechar resultados" @click="emit('close')">
          <X class="h-5 w-5" />
        </button>
      </header>

      <div v-if="isLoadingList" class="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 class="h-5 w-5 animate-spin" aria-hidden="true" /> Carregando resultados…
      </div>

      <div v-else-if="listError" class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p class="text-sm text-slate-700">{{ listError }}</p>
        <button type="button" class="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="load">Tentar novamente</button>
      </div>

      <div v-else-if="executions.length === 0" class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <VideoOff class="h-8 w-8 text-slate-300" aria-hidden="true" />
        <p class="font-medium text-slate-800">Nenhuma execução registrada</p>
        <p class="max-w-sm text-sm text-slate-500">Quando o paciente concluir a sessão, as tentativas e observações aparecem aqui.</p>
      </div>

      <div v-else class="grid min-h-0 flex-1 grid-rows-[auto_1fr] lg:grid-cols-[1fr_22rem] lg:grid-rows-1">
        <!-- Player: foco principal -->
        <div class="relative flex min-h-[40vh] items-center justify-center bg-slate-950 lg:min-h-0">
          <div v-if="isLoadingVideo" class="flex items-center gap-2 text-sm text-slate-300">
            <Loader2 class="h-5 w-5 animate-spin" aria-hidden="true" /> Carregando vídeo seguro…
          </div>
          <video
            v-else-if="videoUrl"
            ref="videoEl"
            :key="videoUrl"
            :src="videoUrl"
            controls
            class="h-full w-full object-contain"
          ></video>
          <div v-else-if="videoError" class="flex flex-col items-center gap-3 px-6 text-center">
            <p class="text-sm text-slate-300">{{ videoError }}</p>
            <button v-if="active" type="button" class="min-h-11 rounded-lg bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/20" @click="selectExecution(active)">Tentar novamente</button>
          </div>
          <div v-else class="flex flex-col items-center gap-2 px-6 text-center text-slate-400">
            <VideoOff class="h-8 w-8" aria-hidden="true" />
            <p class="text-sm">Esta tentativa foi registrada sem gravação de vídeo.</p>
          </div>
        </div>

        <!-- Painel lateral -->
        <aside class="flex min-h-0 flex-col overflow-y-auto border-t border-slate-200 lg:border-t-0 lg:border-l">
          <section v-if="executions.length > 1" class="border-b border-slate-100 p-4">
            <h3 class="mb-2 text-sm font-semibold text-slate-900">Tentativas</h3>
            <ul class="space-y-1">
              <li v-for="(exec, i) in executions" :key="exec.id">
                <button
                  type="button"
                  class="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm transition-colors"
                  :class="getAttemptClass(exec.id)"
                  :aria-current="active?.id === exec.id ? 'true' : undefined"
                  @click="selectExecution(exec)"
                >
                  <span class="font-medium">Tentativa {{ executions.length - i }}</span>
                  <span class="tabular-nums text-xs" :class="active?.id === exec.id ? 'text-blue-700' : 'text-slate-500'">{{ formatDateTime(exec.createdAt) }}</span>
                </button>
              </li>
            </ul>
          </section>

          <section v-if="active" class="flex-1 p-4">
            <div class="mb-3 flex items-baseline justify-between gap-2">
              <h3 class="text-sm font-semibold text-slate-900">Observações</h3>
              <span class="tabular-nums text-xs text-slate-500">{{ formatDateTime(active.createdAt) }}</span>
            </div>

            <div v-if="activeNotes.length === 0" class="flex items-start gap-2.5 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Nenhum alerta registrado nesta tentativa.
            </div>

            <ol v-else class="space-y-2">
              <li v-for="note in activeNotes" :key="note.id" class="rounded-lg bg-amber-50 p-3">
                <div class="flex items-start gap-2.5">
                  <component
                    :is="note.timestampSeconds > 0 ? AlertTriangle : MessageSquareText"
                    class="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                    aria-hidden="true"
                  />
                  <div class="min-w-0 flex-1">
                    <button
                      v-if="note.timestampSeconds > 0 && videoUrl"
                      type="button"
                      class="mb-1 inline-flex items-center gap-1 rounded text-xs font-semibold tabular-nums text-amber-800 underline-offset-2 hover:underline"
                      :aria-label="`Ir para ${formatTimestamp(note.timestampSeconds)} no vídeo`"
                      @click="seekTo(note.timestampSeconds)"
                    >
                      <PlayCircle class="h-3.5 w-3.5" aria-hidden="true" />
                      {{ formatTimestamp(note.timestampSeconds) }}
                    </button>
                    <p class="whitespace-pre-line text-sm leading-relaxed text-amber-950">{{ note.description }}</p>
                  </div>
                </div>
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  </div>
</template>
