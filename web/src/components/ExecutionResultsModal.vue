<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { AlertTriangle, CheckCircle2, Loader2, MessageSquareText, PlayCircle, VideoOff, X, Send, History } from 'lucide-vue-next'
import api from '../utils/axios'
import { formatTimestamp } from '../utils/sessionFormat'
import { useAuthStore } from '../stores/auth'
import AppSelect from './AppSelect.vue'
import AppTextarea from './AppTextarea.vue'

interface ExecutionNote { id: string; timestampSeconds: number; description: string }
interface Execution { id: string; createdAt: string; videoObjectName?: string | null; notes?: ExecutionNote[] }
interface SessionExercise { id: string; exercise: { title: string }; sets: number; reps: string; completedSets: boolean[] }
interface Session { id: string; sessionExercises: SessionExercise[] }
interface Review { id: string; disposition: string; note?: string; createdAt: string; reviewer: { id: string; name: string } }

const props = defineProps<{
  open: boolean
  sessionId: string | null
  sessionTitle?: string
  patientName?: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const session = ref<Session | null>(null)
const executions = ref<Execution[]>([])
const active = ref<Execution | null>(null)
const videoUrl = ref('')
const isLoadingList = ref(false)
const isLoadingVideo = ref(false)
const listError = ref('')
const videoError = ref('')
const videoEl = ref<HTMLVideoElement | null>(null)

const authStore = useAuthStore()
const isPatient = computed(() => authStore.user?.role === 'PATIENT')

const reviews = ref<Review[]>([])
const newReview = ref({ disposition: 'REVIEWED', note: '' })
const isSubmittingReview = ref(false)

const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso))

const activeNotes = computed(() =>
  [...(active.value?.notes ?? [])].sort((a, b) => a.timestampSeconds - b.timestampSeconds),
)

const getAttemptClass = (id: string) => {
  if (active.value?.id === id) {
    return 'bg-blue-50 text-blue-900 border-blue-200'
  }
  return 'text-slate-700 hover:bg-slate-50 border-transparent'
}

const selectExecution = async (exec: Execution) => {
  active.value = exec
  videoUrl.value = ''
  videoError.value = ''
  if (!exec.videoObjectName) return

  isLoadingVideo.value = true
  try {
    const res = await api.get(`/executions/${exec.id}/video-url`)
    if (active.value?.id === exec.id) {
      if (res.data.url) {
        videoUrl.value = res.data.url
      } else {
        videoError.value = 'Não há vídeo disponível.'
      }
    }
  } catch (error) {
    console.error('Erro ao carregar vídeo:')
    videoError.value = 'Não foi possível carregar o vídeo desta tentativa.'
  } finally {
    isLoadingVideo.value = false
  }
}

const onVideoError = () => {
  videoUrl.value = ''
  videoError.value = 'Erro de vídeo indisponível.'
}

const load = async () => {
  if (!props.sessionId) return
  isLoadingList.value = true
  listError.value = ''
  executions.value = []
  session.value = null
  active.value = null
  videoUrl.value = ''
  try {
    const requests: Promise<any>[] = [
      api.get(`/executions/session/${props.sessionId}`),
      api.get(`/sessions/${props.sessionId}`)
    ]
    if (!isPatient.value) {
      requests.push(api.get(`/sessions/${props.sessionId}/reviews`))
    }
    
    const results = await Promise.all(requests)
    executions.value = results[0].data ?? []
    session.value = results[1].data ?? null
    if (results[2]) {
      reviews.value = results[2].data.items ?? []
    }
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

const submitReviewError = ref('')

const submitReview = async () => {
  if (!props.sessionId || isSubmittingReview.value) return
  isSubmittingReview.value = true
  submitReviewError.value = ''
  try {
    const payload = {
      disposition: newReview.value.disposition,
      note: newReview.value.note || undefined
    }
    const res = await api.post(`/sessions/${props.sessionId}/reviews`, payload)
    reviews.value.unshift(res.data)
    newReview.value = { disposition: 'REVIEWED', note: '' }
  } catch (error) {
    submitReviewError.value = 'Erro ao salvar revisão. Tente novamente.'
  } finally {
    isSubmittingReview.value = false
  }
}

const dispositionLabels: Record<string, string> = {
  REVIEWED: 'Revisada',
  FOLLOW_UP: 'Precisa de retorno',
  NEXT_VISIT: 'Discutir na próxima consulta'
}

const dispositionOptions = [
  { label: 'Marcar revisada', value: 'REVIEWED' },
  { label: 'Precisa de retorno', value: 'FOLLOW_UP' },
  { label: 'Discutir na próxima consulta', value: 'NEXT_VISIT' }
]

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
      class="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-[0_24px_48px_-16px_rgba(15,23,42,0.5)] sm:h-[90vh] sm:rounded-2xl"
    >
      <header class="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-3">
            <h2 id="results-title" class="truncate text-lg font-semibold text-slate-900">{{ sessionTitle || 'Resultados da sessão' }}</h2>
            <div v-if="!isPatient && !isLoadingList">
              <span v-if="reviews.length === 0" class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                <AlertTriangle class="h-3 w-3" /> Revisão Pendente
              </span>
              <span v-else class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                <CheckCircle2 class="h-3 w-3" /> {{ dispositionLabels[reviews[0].disposition] || 'Revisada' }}
              </span>
            </div>
          </div>
          <p v-if="patientName" class="truncate text-sm text-slate-500 mt-0.5">{{ patientName }}</p>
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

      <div v-else class="flex flex-col flex-1 overflow-y-auto p-4 sm:p-6 gap-8 bg-slate-50/50">
        <!-- Tentativas -->
        <section v-if="executions.length > 1">
          <h3 class="mb-3 text-sm font-semibold text-slate-900">Histórico de Tentativas</h3>
          <ul class="flex flex-wrap gap-2">
            <li v-for="(exec, i) in executions" :key="exec.id">
              <button
                type="button"
                class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
                :class="getAttemptClass(exec.id)"
                :aria-current="active?.id === exec.id ? 'true' : undefined"
                @click="selectExecution(exec)"
              >
                <span class="font-medium">Tentativa {{ executions.length - i }}</span>
                <span class="text-xs opacity-70">{{ formatDateTime(exec.createdAt) }}</span>
              </button>
            </li>
          </ul>
        </section>

        <!-- Player compacto -->
        <section class="mx-auto w-full max-w-md overflow-hidden rounded-xl bg-slate-950 shadow-md ring-1 ring-slate-900/10 aspect-video flex items-center justify-center relative">
          <div v-if="isLoadingVideo" class="flex items-center gap-2 text-sm text-slate-300">
            <Loader2 class="h-5 w-5 animate-spin" aria-hidden="true" /> Carregando vídeo seguro…
          </div>
          <video
            v-else-if="videoUrl"
            ref="videoEl"
            :key="videoUrl"
            :src="videoUrl"
            controls
            @error="onVideoError"
            class="h-full w-full object-contain"
          ></video>
          <div v-else-if="videoError" class="flex flex-col items-center gap-3 px-6 text-center">
            <p class="text-sm text-slate-300">{{ videoError }}</p>
            <button v-if="active" type="button" class="min-h-9 rounded-lg bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/20" @click="selectExecution(active)">Tentar novamente</button>
          </div>
          <div v-else class="flex flex-col items-center gap-2 px-6 text-center text-slate-400">
            <VideoOff class="h-8 w-8" aria-hidden="true" />
            <p class="text-sm">Sem gravação de vídeo.</p>
          </div>
        </section>

        <!-- Observações -->
        <section v-if="active">
          <div class="mb-3 flex items-baseline justify-between gap-2">
            <h3 class="text-sm font-semibold text-slate-900">Observações da Tentativa</h3>
            <span class="tabular-nums text-xs text-slate-500">{{ formatDateTime(active.createdAt) }}</span>
          </div>

          <div v-if="activeNotes.length === 0" class="flex items-start gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Nenhum alerta registrado nesta tentativa.
          </div>

          <ol v-else class="space-y-3">
            <li v-for="note in activeNotes" :key="note.id" class="rounded-lg border border-amber-100 bg-amber-50 p-4 shadow-sm">
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
                    class="mb-2 inline-flex items-center gap-1 rounded text-xs font-semibold tabular-nums text-amber-800 underline-offset-2 hover:underline focus:ring-2 focus:ring-amber-500 focus:outline-none"
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

        <!-- Revisão (Apenas Fisioterapeutas) -->
        <section v-if="!isPatient" class="rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-6 mb-4">
          <h3 class="mb-4 text-sm font-semibold text-blue-900 flex items-center gap-2">
            <Send class="h-4 w-4" />
            Adicionar Revisão
          </h3>
          <form @submit.prevent="submitReview" class="space-y-4">
            <div v-if="submitReviewError" role="alert" class="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              {{ submitReviewError }}
            </div>
            <div>
              <AppSelect
                v-model="newReview.disposition"
                :options="dispositionOptions"
                label="Decisão"
                required
              />
            </div>
            <div>
              <AppTextarea
                v-model="newReview.note"
                label="Nota (Opcional)"
                :rows="2"
                placeholder="Ex: O paciente executou os movimentos com boa amplitude..."
              />
            </div>
            <div class="flex justify-end">
              <button type="submit" :disabled="isSubmittingReview" class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50">
                <Loader2 v-if="isSubmittingReview" class="h-4 w-4 animate-spin" />
                Salvar Revisão
              </button>
            </div>
          </form>

          <!-- Histórico de Revisões -->
          <div v-if="reviews.length > 0" class="mt-8">
            <h4 class="mb-4 text-sm font-semibold text-slate-800 flex items-center gap-2">
              <History class="h-4 w-4 text-slate-500" />
              Histórico de Revisões
            </h4>
            <div class="space-y-3">
              <div v-for="review in reviews" :key="review.id" class="rounded-lg bg-white p-3 border border-slate-200 shadow-sm">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-semibold text-slate-700">{{ review.reviewer?.name || 'Sistema' }}</span>
                  <span class="text-[10px] text-slate-500">{{ formatDateTime(review.createdAt) }}</span>
                </div>
                <div class="mb-2">
                  <span class="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 border border-slate-200">
                    {{ dispositionLabels[review.disposition] || review.disposition }}
                  </span>
                </div>
                <p v-if="review.note" class="text-sm text-slate-600 whitespace-pre-wrap">{{ review.note }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Relatório de Exercícios -->
        <section v-if="session && session.sessionExercises?.length">
          <h3 class="mb-3 text-sm font-semibold text-slate-900">Relatório de Exercícios</h3>
          <div class="space-y-4">
            <div v-for="(ex, index) in session.sessionExercises" :key="ex.id" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <h4 class="font-semibold text-slate-800">{{ index + 1 }}. {{ ex.exercise?.title || 'Exercício' }}</h4>
                <span class="text-xs font-medium text-slate-500">{{ ex.sets }} séries de {{ ex.reps }} reps</span>
              </div>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                <div v-for="setIdx in (ex.sets || 1)" :key="setIdx" class="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <div class="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      disabled 
                      :checked="ex.completedSets && ex.completedSets[setIdx - 1]"
                      :aria-label="`${ex.exercise?.title || 'Exercício'}, Série ${setIdx}, ${ex.completedSets && ex.completedSets[setIdx - 1] ? 'Feito' : 'Pendente'}`"
                      class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                    <span class="text-xs font-medium text-slate-700">Série {{ setIdx }}</span>
                  </div>
                  <span v-if="ex.completedSets && ex.completedSets[setIdx - 1]" class="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Feito
                  </span>
                  <span v-else class="inline-flex rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Pendente
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
