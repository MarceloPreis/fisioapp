<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PatientLayout from '../layouts/PatientLayout.vue'
import { useAuthStore } from '../stores/auth'
import api from '../utils/axios'

interface Exercise {
  id: string
  title: string
  description: string
  videoUrl: string
}

interface SessionExercise {
  id: string
  sets: number
  reps: string
  exercise: Exercise
  completedSets?: boolean[]
}

interface Session {
  id: string
  title: string
  status: string
  createdAt: string
  scheduledDate?: string
  sessionExercises: SessionExercise[]
}

const authStore = useAuthStore()

const sessions = ref<Session[]>([])
const isLoading = ref(true)

// Modal de Execução
const activeSession = ref<Session | null>(null)
const expandedExerciseId = ref<string | null>(null)
const executionNote = ref('')
const isSubmitting = ref(false)
const selectedVideo = ref<File | null>(null)
const uploadProgress = ref('')
const onVideoSelected = (event: Event) => { selectedVideo.value = (event.target as HTMLInputElement).files?.[0] || null }

// Tags rápidas de sensação para feedback clínico
const quickFeedbackChips = [
  'Sem dores 😊',
  'Dor leve no movimento ⚠️',
  'Cansaço muscular 💦',
  'Execução tranquila 👍',
  'Preciso ajustar a carga ⚖️'
]

// completedSetsMap: sessionExercise.id -> boolean[]
const completedSetsMap = ref<Record<string, boolean[]>>({})

const fetchSessions = async () => {
  isLoading.value = true
  try {
    const res = await api.get('/sessions')
    sessions.value = res.data || []
  } catch (error) {
    console.error('Erro ao carregar sessões:')
  } finally {
    isLoading.value = false
  }
}
import DateRangePicker from '../components/DateRangePicker.vue'

const startDate = ref('')
const endDate = ref('')

// Inicializa com a semana atual (para manter comportamento original)
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

const groupedSessions = computed(() => {
  const groups: Record<string, { dateKey: string, date: Date, label: string, sessions: Session[] }> = {}
  
  const formatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  
  filteredSessions.value.forEach(session => {
    // Fallback to createdAt if scheduledDate is not present (for older sessions)
    const d = session.scheduledDate ? new Date(session.scheduledDate) : new Date(session.createdAt)
    const dateKey = d.toISOString().split('T')[0]
    
    if (!groups[dateKey]) {
      let label = formatter.format(d)
      label = label.charAt(0).toUpperCase() + label.slice(1)
      
      groups[dateKey] = {
        dateKey,
        date: d,
        label,
        sessions: []
      }
    }
    
    groups[dateKey].sessions.push(session)
  })

  return Object.values(groups).sort((a, b) => a.date.getTime() - b.date.getTime())
})

const pendingSessionsCount = computed(() => {
  return filteredSessions.value.filter(s => s.status === 'PENDENTE').length
})

const completedSessionsCount = computed(() => {
  return filteredSessions.value.filter(s => s.status === 'CONCLUIDO' || s.status === 'PARCIAL').length
})

const setupExerciseSets = () => {
  if (!activeSession.value) return
  completedSetsMap.value = {}
  activeSession.value.sessionExercises.forEach(ex => {
    if (ex.completedSets && ex.completedSets.length > 0) {
      completedSetsMap.value[ex.id] = [...ex.completedSets]
    } else {
      completedSetsMap.value[ex.id] = new Array(ex.sets || 1).fill(false)
    }
  })
  
  if (activeSession.value.sessionExercises.length > 0) {
    expandedExerciseId.value = activeSession.value.sessionExercises[0].id
  }
}

const openSession = (session: Session) => {
  activeSession.value = session
  executionNote.value = ''
  selectedVideo.value = null
  uploadProgress.value = ''
  setupExerciseSets()
}

const closeSession = () => {
  activeSession.value = null
  expandedExerciseId.value = null
}

const toggleExercise = (id: string) => {
  if (expandedExerciseId.value === id) {
    expandedExerciseId.value = null
  } else {
    expandedExerciseId.value = id
  }
}

const isExerciseFullyCompleted = (exId: string) => {
  const sets = completedSetsMap.value[exId] || []
  return sets.length > 0 && sets.every(val => val === true)
}

const getExerciseCompletedSetsCount = (exId: string) => {
  const sets = completedSetsMap.value[exId] || []
  return sets.filter(Boolean).length
}

const saveProgress = async () => {
  if (!activeSession.value) return
  
  const exercisesCompletedSets = activeSession.value.sessionExercises.map(ex => ({
    sessionExerciseId: ex.id,
    completedSets: completedSetsMap.value[ex.id] || []
  }))

  try {
    await api.put(`/sessions/${activeSession.value.id}`, { 
      exercisesCompletedSets 
    })
  } catch (error) {
    console.error('Erro ao salvar progresso em tempo real:')
  }
}

const toggleAllSetsForExercise = async (exId: string) => {
  const sets = completedSetsMap.value[exId]
  if (!sets) return
  const allChecked = sets.every(Boolean)
  completedSetsMap.value[exId] = sets.map(() => !allChecked)
  await saveProgress()
}

const sessionProgressPercentage = computed(() => {
  if (!activeSession.value || !activeSession.value.sessionExercises.length) return 0
  let totalSets = 0
  let completedSets = 0

  for (const ex of activeSession.value.sessionExercises) {
    totalSets += ex.sets || 1
    const sets = completedSetsMap.value[ex.id] || []
    completedSets += sets.filter(Boolean).length
  }

  if (totalSets === 0) return 0
  return Math.round((completedSets / totalSets) * 100)
})

const completedExercisesCount = computed(() => {
  if (!activeSession.value) return 0
  return activeSession.value.sessionExercises.filter(ex => isExerciseFullyCompleted(ex.id)).length
})

const totalExercisesCount = computed(() => {
  return activeSession.value?.sessionExercises.length || 0
})

const isSessionFullyCompleted = computed(() => {
  if (!activeSession.value) return false
  return activeSession.value.sessionExercises.every(ex => isExerciseFullyCompleted(ex.id))
})

const remainingSetsCount = computed(() => {
  if (!activeSession.value) return 0
  let count = 0
  for (const ex of activeSession.value.sessionExercises) {
    const sets = completedSetsMap.value[ex.id] || []
    count += sets.filter(v => !v).length
  }
  return count
})

const toggleFeedbackChip = (chip: string) => {
  if (executionNote.value.includes(chip)) {
    executionNote.value = executionNote.value.replace(chip, '').replace(/\n\n+/g, '\n').trim()
  } else {
    executionNote.value = executionNote.value 
      ? `${executionNote.value}\n• ${chip}` 
      : `• ${chip}`
  }
}

const finishSession = async (isPartial = false) => {
  if (!activeSession.value) return
  isSubmitting.value = true
  
  try {
    const finalNotes = []
    if (executionNote.value) {
      finalNotes.push({
        timestampSeconds: 0,
        description: executionNote.value
      })
    }

    if (isPartial) {
      const uncompletedExercises = activeSession.value.sessionExercises
        .filter(ex => !isExerciseFullyCompleted(ex.id))
        .map(ex => ex.exercise.title)
        .join(', ')

      finalNotes.push({
        timestampSeconds: 0,
        description: `Sessão finalizada parcialmente. Exercícios pendentes/incompletos: ${uncompletedExercises}`
      })
    }

    let videoObjectName: string | null = null
    if (selectedVideo.value) {
      const file = selectedVideo.value
      if (file.size > 512 * 1024 * 1024) throw new Error('O vídeo deve ter até 512 MB.')
      const chunkSize = 4 * 1024 * 1024
      const totalChunks = Math.ceil(file.size / chunkSize)
      const { data: upload } = await api.post('/videos/upload/init', { totalChunks })
      for (let index = 0; index < totalChunks; index++) {
        const form = new FormData()
        form.append('uploadId', upload.uploadId)
        form.append('chunkIndex', String(index))
        form.append('chunk', file.slice(index * chunkSize, (index + 1) * chunkSize))
        await api.post('/videos/upload/chunk', form)
        uploadProgress.value = `Enviando vídeo: ${Math.round((index + 1) / totalChunks * 100)}%`
      }
      await api.post('/videos/upload/complete', { uploadId: upload.uploadId, fileName: file.name })
      uploadProgress.value = 'Processando vídeo?'
      const deadline = Date.now() + 10 * 60 * 1000
      while (Date.now() < deadline) {
        const { data } = await api.get(`/videos/upload/${upload.uploadId}`)
        if (data.state === 'failed') throw new Error('Falha ao processar vídeo MP4.')
        if (data.state === 'complete') { videoObjectName = data.videoObjectName; break }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      if (!videoObjectName) throw new Error('Processamento excedeu o tempo limite.')
    }
    await api.post('/executions', {
      sessionId: activeSession.value.id,
      videoObjectName,
      notes: finalNotes
    })
    
    const finalStatus = isPartial ? 'PARCIAL' : 'CONCLUIDO'
    
    const exercisesCompletedSets = activeSession.value.sessionExercises.map(ex => ({
      sessionExerciseId: ex.id,
      completedSets: completedSetsMap.value[ex.id] || []
    }))

    await api.put(`/sessions/${activeSession.value.id}`, { 
      status: finalStatus,
      exercisesCompletedSets 
    })
    
    closeSession()
    await fetchSessions()
  } catch (error) {
    console.error('Erro ao finalizar sessão:')
    alert('Erro ao registrar conclusão da sessão. Tente novamente.')
  } finally {
    isSubmitting.value = false
  }
}

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return ''
  if (url.includes('youtube.com/embed/')) return url
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  const match = url.match(regExp)
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`
  }
  const fallback = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const fbMatch = url.match(fallback)
  return (fbMatch && fbMatch[2] && fbMatch[2].length === 11)
    ? `https://www.youtube.com/embed/${fbMatch[2]}`
    : ''
}

onMounted(() => {
  fetchSessions()
})
</script>

<template>
  <PatientLayout>
    <template #title>
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
        <div>
          <h1 style="font-size: 26px; font-weight: 800; color: #1e293b; margin: 0; line-height: 1.2;">
            Olá, {{ authStore.user?.name || 'Paciente' }}! 👋
          </h1>
          <p style="font-size: 15px; color: #64748b; margin-top: 6px; margin-bottom: 0;">
            Acompanhe e realize seus exercícios prescritos para hoje.
          </p>
        </div>

        <!-- Badges de Métricas Rápidas -->
        <div style="display: flex; align-items: center; gap: 12px;">
          <div 
            style="display: flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;"
          >
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #d97706; display: inline-block;"></span>
            {{ pendingSessionsCount }} Pendente{{ pendingSessionsCount === 1 ? '' : 's' }}
          </div>

          <div 
            style="display: flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0;"
          >
            <svg style="width: 14px; height: 14px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
            {{ completedSessionsCount }} Concluída{{ completedSessionsCount === 1 ? '' : 's' }}
          </div>
        </div>
      </div>
    </template>

    <!-- Estado de Carregamento -->
    <div v-if="isLoading" style="text-align: center; padding: 60px 0; color: #64748b; font-size: 15px;">
      Carregando sessões...
    </div>

    <template v-else>
      <!-- Filtro de Data -->
      <div class="mb-6 flex justify-end">
        <DateRangePicker v-model:start="startDate" v-model:end="endDate" />
      </div>

      <!-- Estado Vazio -->
      <div 
        v-if="filteredSessions.length === 0" 
        style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 40px; text-align: center; max-width: 480px; margin: 32px auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05);"
      >
        <div 
          style="width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; background-color: #eff6ff; color: #1d4ed8;"
        >
          <svg style="width: 28px; height: 28px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h3 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0;">Nenhuma sessão encontrada!</h3>
        <p style="font-size: 14px; color: #64748b; margin: 0;">
          Não há sessões registradas para o período selecionado.
        </p>
      </div>

      <!-- Lista de Sessões Agrupadas por Dia -->
      <div v-else style="display: flex; flex-direction: column; gap: 32px;">
        <div v-for="group in groupedSessions" :key="group.dateKey">
          <h3 style="font-size: 16px; font-weight: 700; color: #475569; margin: 0 0 16px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            {{ group.label }}
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
            <div 
              v-for="session in group.sessions" 
              :key="session.id" 
              style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: box-shadow 0.2s;"
            >
              <div>
          <!-- Header do Card -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 16px;">
            <span 
              v-if="session.status === 'CONCLUIDO'"
              style="font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px; background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0;"
            >
              <svg style="width: 12px; height: 12px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
              Concluída
            </span>
            <span 
              v-else-if="session.status === 'PARCIAL'"
              style="font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;"
            >
              <svg style="width: 12px; height: 12px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Parcial
            </span>
            <span 
              v-else
              style="font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px; background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;"
            >
              <span style="width: 6px; height: 6px; border-radius: 50%; background-color: #d97706; display: inline-block;"></span>
              Pendente
            </span>

            <span style="font-size: 13px; color: #94a3b8; font-weight: 500;">
              {{ session.sessionExercises?.length || 0 }} exercício(s)
            </span>
          </div>

          <!-- Título da Sessão -->
          <h3 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0; line-height: 1.3;">
            {{ session.title }}
          </h3>

          <!-- Lista dos exercícios da sessão -->
          <div style="border-top: 1px solid #f1f5f9; padding-top: 14px;">
            <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px 0;">Exercícios previstos:</p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div 
                v-for="item in (session.sessionExercises || []).slice(0, 3)" 
                :key="item.id"
                style="display: flex; align-items: center; font-size: 13px; color: #475569; gap: 8px;"
              >
                <span style="width: 6px; height: 6px; border-radius: 50%; background-color: #1e40af; flex-shrink: 0;"></span>
                <span style="font-weight: 600; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.exercise.title }}</span>
                <span style="color: #94a3b8; flex-shrink: 0;">({{ item.sets }}x {{ item.reps }})</span>
              </div>
              <p v-if="(session.sessionExercises || []).length > 3" style="font-size: 12px; color: #94a3b8; font-style: italic; margin: 4px 0 0 0;">
                + mais {{ (session.sessionExercises || []).length - 3 }} exercício(s)...
              </p>
            </div>
          </div>
        </div>

        <!-- Botão de Ação -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
          <button 
            v-if="session.status === 'PENDENTE'"
            @click="openSession(session)" 
            style="width: 100%; padding: 12px 16px; background-color: #1e40af; color: #ffffff; border: none; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background-color 0.2s;"
          >
            <span>Iniciar Sessão</span>
            <svg style="width: 16px; height: 16px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
          
          <button 
            v-else
            @click="openSession(session)"
            style="width: 100%; padding: 12px 16px; background-color: #f8fafc; color: #475569; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background-color 0.2s;"
          >
            <svg style="width: 16px; height: 16px; flex-shrink: 0; color: #16a34a;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            <span>Ver Exercícios</span>
          </button>
        </div>
        </div>
      </div>
    </div>
    </div>
    </template>

    <!-- MODAL DE EXECUÇÃO DE SESSÃO -->
    <div 
      v-if="activeSession" 
      style="position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 24px; background-color: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px);"
    >
      <div 
        style="background-color: #ffffff; border-radius: 18px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35); width: 100%; max-width: 780px; overflow: hidden; display: flex; flex-direction: column; max-height: calc(100vh - 64px); border: 1px solid #e2e8f0;"
      >
        <!-- Cabeçalho do Modal -->
        <div style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0; background-color: #ffffff; flex-shrink: 0;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
            <div>
              <span 
                style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 6px; background-color: #eff6ff; color: #1e40af;"
              >
                Rotina de Exercícios
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #1e293b; margin: 6px 0 0 0; line-height: 1.2;">
                {{ activeSession.title }}
              </h2>
            </div>
            
            <button 
              @click="closeSession" 
              style="width: 36px; height: 36px; border-radius: 50%; background-color: #f1f5f9; border: none; color: #64748b; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color 0.2s;"
              title="Fechar"
            >
              <svg style="width: 20px; height: 20px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <!-- Barra de Progresso das Séries -->
          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #64748b; margin-bottom: 6px;">
              <span>Progresso: <strong style="color: #1e293b;">{{ completedExercisesCount }} de {{ totalExercisesCount }}</strong> exercícios concluídos</span>
              <span style="font-weight: 800; color: #1e40af;">{{ sessionProgressPercentage }}%</span>
            </div>
            <div style="width: 100%; background-color: #f1f5f9; border-radius: 9999px; height: 8px; overflow: hidden;">
              <div 
                style="height: 100%; border-radius: 9999px; transition: all 0.3s;"
                :style="{ 
                  width: `${sessionProgressPercentage}%`,
                  backgroundColor: sessionProgressPercentage === 100 ? '#16a34a' : '#1e40af'
                }"
              ></div>
            </div>
          </div>
        </div>
        
        <!-- Conteúdo do Modal (Scrollável) -->
        <div style="padding: 24px; overflow-y: auto; flex: 1; min-height: 0; background-color: #f8fafc; display: flex; flex-direction: column; gap: 18px;">
          <!-- Accordion de Exercícios -->
          <div 
            v-for="(ex, index) in activeSession.sessionExercises" 
            :key="ex.id" 
            style="background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: border-color 0.2s; flex-shrink: 0;"
            :style="{
              border: isExerciseFullyCompleted(ex.id) ? '1.5px solid #86efac' : '1px solid #e2e8f0'
            }"
          >
            <!-- Topo do Card de Exercício -->
            <div 
              @click="toggleExercise(ex.id)" 
              style="padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none; transition: background-color 0.2s;"
            >
              <div style="display: flex; align-items: center; gap: 16px; min-width: 0;">
                <!-- Número do exercício ou Check de Concluído -->
                <div 
                  style="width: 38px; height: 38px; min-width: 38px; min-height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; flex-shrink: 0;"
                  :style="isExerciseFullyCompleted(ex.id) 
                    ? 'background-color: #16a34a; color: #ffffff;' 
                    : 'background-color: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe;'"
                >
                  <svg 
                    v-if="isExerciseFullyCompleted(ex.id)" 
                    style="width: 20px; height: 20px; flex-shrink: 0;" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span v-else>{{ index + 1 }}</span>
                </div>

                <!-- Título e Subtítulo -->
                <div style="min-width: 0;">
                  <h3 
                    style="font-size: 16px; font-weight: 700; color: #1e293b; margin: 0; line-height: 1.3;"
                    :style="isExerciseFullyCompleted(ex.id) ? 'text-decoration: line-through; color: #94a3b8;' : ''"
                  >
                    {{ ex.exercise.title }}
                  </h3>
                  <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                    <span style="font-size: 13px; color: #64748b;">
                      {{ ex.sets }} séries • {{ ex.reps }} repetições
                    </span>
                    <span 
                      v-if="getExerciseCompletedSetsCount(ex.id) > 0"
                      style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;"
                      :style="isExerciseFullyCompleted(ex.id) 
                        ? 'background-color: #dcfce7; color: #166534;' 
                        : 'background-color: #eff6ff; color: #1e40af;'"
                    >
                      {{ getExerciseCompletedSetsCount(ex.id) }}/{{ ex.sets }} feitas
                    </span>
                  </div>
                </div>
              </div>

              <!-- Chevron de Expandir -->
              <div style="width: 30px; height: 30px; border-radius: 50%; background-color: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #64748b; flex-shrink: 0; margin-left: 12px;">
                <svg 
                  style="width: 18px; height: 18px; flex-shrink: 0; transition: transform 0.2s;" 
                  :style="{ transform: expandedExerciseId === ex.id ? 'rotate(180deg)' : 'rotate(0deg)' }" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
            
            <!-- Conteúdo Expandido do Exercício (Scrollável e Lado a Lado) -->
            <div 
              v-show="expandedExerciseId === ex.id" 
              style="padding: 20px; border-top: 1px solid #f1f5f9; background-color: #ffffff;"
            >
              <!-- 1. Descrição -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;">
                <h4 style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin: 0 0 4px 0; display: flex; align-items: center; gap: 8px;">
                  <svg style="width: 15px; height: 15px; flex-shrink: 0; color: #1e40af;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Instruções de Execução
                </h4>
                <p style="font-size: 14px; color: #334155; margin: 0; line-height: 1.4; white-space: pre-wrap;">
                  {{ ex.exercise.description || 'Realize as repetições com calma e respeite seus limites.' }}
                </p>
              </div>

              <!-- 2. Checklist de Séries e Vídeo Demonstrativo -->
              <div style="display: flex; flex-direction: column; gap: 16px;">
                <!-- Coluna do Checklist de Séries -->
                <div style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; margin: 0; display: flex; align-items: center; gap: 6px;">
                      <svg style="width: 16px; height: 16px; flex-shrink: 0; color: #16a34a;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Séries Concluídas:
                    </h4>
                    <button 
                      v-if="activeSession.status === 'PENDENTE'"
                      type="button" 
                      @click="toggleAllSetsForExercise(ex.id)"
                      style="font-size: 12px; color: #1e40af; font-weight: 700; background: none; border: none; cursor: pointer; text-decoration: underline;"
                    >
                      {{ isExerciseFullyCompleted(ex.id) ? 'Desmarcar todas' : 'Marcar todas' }}
                    </button>
                  </div>
                  
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    <label 
                      v-for="(_, idx) in completedSetsMap[ex.id]" 
                      :key="idx"
                      style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px; cursor: pointer; user-select: none; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);"
                      :style="completedSetsMap[ex.id][idx]
                        ? 'background-color: #f0fdf4; border: 1.5px solid #86efac; color: #166534;'
                        : 'background-color: #ffffff; border: 1.5px solid #cbd5e1; color: #1e293b;'"
                    >
                      <input 
                        type="checkbox" 
                        v-model="completedSetsMap[ex.id][idx]"
                        @change="saveProgress"
                        :disabled="activeSession.status !== 'PENDENTE'" 
                        style="width: 18px; height: 18px; accent-color: #16a34a; cursor: pointer; flex-shrink: 0;"
                      >
                      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <span style="font-weight: 700; font-size: 14px;">
                          Série {{ idx + 1 }}
                        </span>
                        <span style="font-size: 12px; color: #64748b; font-weight: 600;">
                          {{ ex.reps }} reps
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Coluna do Vídeo -->
                <div v-if="ex.exercise.videoUrl" style="display: flex; flex-direction: column; gap: 8px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #64748b;">
                    <span style="font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                      <svg style="width: 18px; height: 18px; flex-shrink: 0; color: #dc2626;" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                      Vídeo Demonstrativo
                    </span>
                  </div>
                  
                  <div 
                    style="width: 100%; height: 210px; min-height: 210px; border-radius: 12px; overflow: hidden; background-color: #000000; border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.1); flex-shrink: 0;"
                  >
                    <iframe 
                      v-if="getYouTubeEmbedUrl(ex.exercise.videoUrl)"
                      style="width: 100%; height: 210px; min-height: 210px; border: 0; display: block;" 
                      :src="getYouTubeEmbedUrl(ex.exercise.videoUrl)" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowfullscreen
                    ></iframe>
                    <div v-else style="width: 100%; height: 210px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 13px;">
                      Link de vídeo não suportado
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Seção de Observações -->
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 12px; flex-shrink: 0;">
            <label style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">
              Como você se sentiu hoje? (Opcional)
            </label>

            <!-- Chips de toque rápido -->
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              <button 
                v-for="chip in quickFeedbackChips" 
                :key="chip"
                type="button"
                @click="activeSession.status === 'PENDENTE' ? toggleFeedbackChip(chip) : null"
                :disabled="activeSession.status !== 'PENDENTE'"
                style="font-size: 12px; padding: 6px 14px; border-radius: 9999px; transition: all 0.15s;"
                :style="[
                  executionNote.includes(chip)
                    ? 'background-color: #dbeafe; border: 1px solid #93c5fd; color: #1e40af; font-weight: 700;'
                    : 'background-color: #f8fafc; border: 1px solid #e2e8f0; color: #475569; font-weight: 500;',
                  activeSession.status === 'PENDENTE' ? 'cursor: pointer;' : 'cursor: default; opacity: 0.7;'
                ]"
              >
                {{ chip }}
              </button>
            </div>

            <label class="block text-base text-slate-900 mb-3">
              Vídeo da execução (MP4, até 512 MB)
              <input type="file" accept="video/mp4,.mp4" :disabled="isSubmitting" @change="onVideoSelected" class="block w-full min-h-12 mt-2" />
              <span role="status" aria-live="polite" class="text-slate-500">{{ uploadProgress }}</span>
            </label>
            <textarea 
              v-model="executionNote" 
              rows="3" 
              :disabled="activeSession.status !== 'PENDENTE'"
              style="width: 100%; box-sizing: border-box; padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; color: #1e293b; outline: none; font-family: inherit; resize: vertical;"
              placeholder="Ex: Senti dor no ombro direito durante a elevação..."
            ></textarea>
          </div>
        </div>
        
        <!-- Rodapé do Modal -->
        <div style="padding: 18px 24px; border-top: 1px solid #e2e8f0; background-color: #ffffff; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-shrink: 0;">
          <button 
            @click="closeSession" 
            style="padding: 10px 18px; color: #64748b; background: none; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background-color 0.2s;"
          >
            Voltar
          </button>
          
          <div v-if="activeSession.status === 'PENDENTE'" style="display: flex; align-items: center; gap: 12px;">
            <span v-if="!isSessionFullyCompleted" style="font-size: 13px; color: #94a3b8;">
              Falta{{ remainingSetsCount === 1 ? '' : 'm' }} {{ remainingSetsCount }} série(s)
            </span>

            <button 
              v-if="!isSessionFullyCompleted"
              @click="finishSession(true)" 
              :disabled="isSubmitting"
              style="padding: 12px 22px; border-radius: 12px; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; background-color: #f8fafc; color: #475569; cursor: pointer; transition: all 0.2s;"
            >
              <span v-if="isSubmitting">Salvando...</span>
              <template v-else>
                <span>Finalizar Parcialmente</span>
              </template>
            </button>

            <button 
              v-if="isSessionFullyCompleted"
              @click="finishSession(false)" 
              :disabled="isSubmitting"
              style="padding: 12px 22px; border-radius: 12px; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px; border: none; transition: all 0.2s; background-color: #16a34a; color: #ffffff; cursor: pointer; box-shadow: 0 2px 6px rgba(22, 163, 74, 0.3);"
            >
              <span v-if="isSubmitting">Salvando...</span>
              <template v-else>
                <span>Finalizar Sessão de Hoje</span>
                <svg style="width: 18px; height: 18px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
              </template>
            </button>
          </div>
        </div>
      </div>
    </div>
  </PatientLayout>
</template>
