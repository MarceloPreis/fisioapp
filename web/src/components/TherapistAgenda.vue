<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
    <!-- Barra Superior da Agenda -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div>
        <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2.5">
          <CalendarDays class="h-5 w-5 text-blue-800" />
          <span>Agenda de Atendimentos</span>
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          Selecione qualquer horário para agendar ou clique em um evento para visualizar e editar.
        </p>
      </div>

      <div class="flex items-center gap-3 w-full sm:w-auto">
        <AppButton
          variant="primary"
          type="button"
          @click="openNewAppointment"
        >
          <Plus class="h-4 w-4" />
          <span>Novo Agendamento</span>
        </AppButton>
      </div>
    </div>

    <!-- Container do Calendário -->
    <div class="calendar-container">
      <FullCalendar :options="calendarOptions" />
    </div>

    <!-- MODAL DE CADASTRO / EDIÇÃO DE AGENDAMENTO -->
    <div
      v-if="form"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="form = null"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agenda-modal-title"
        class="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        <!-- Topo Fixo do Modal -->
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
              <Calendar class="h-5 w-5" />
            </div>
            <div>
              <h3 id="agenda-modal-title" class="text-base font-bold text-slate-700">
                {{ form.id ? 'Editar Agendamento' : 'Novo Agendamento' }}
              </h3>
              <p class="text-xs text-slate-500">
                {{ form.id ? 'Atualize as informações do atendimento' : 'Defina os detalhes da sessão na agenda clínica' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar janela de agendamento"
            @click="form = null"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Formulário do Modal -->
        <form @submit.prevent="save" class="agenda-event-form p-6 space-y-4">
          <PatientSelect v-model="form.patientId" required :disabled="saving" />
          <p v-if="form.id && !form.patientId" class="text-sm text-amber-700">
            Este evento antigo não possui paciente vinculado. Selecione um paciente para salvar.
          </p>
          <div>
            <label for="agenda-event-title" class="block text-xs font-bold text-slate-700 mb-1.5">
              Título do evento <span class="text-red-500">*</span>
            </label>
            <input
              id="agenda-event-title"
              v-model="form.title"
              required
              maxlength="200"
              placeholder="Ex.: Avaliação inicial"
              class="block w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:border-blue-800 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
            />
          </div>

          <!-- Campos de Data/Hora: Início e Fim -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">
                Início <span class="text-red-500">*</span>
              </label>
              <AppDatePicker
                v-model="form.startTime"
                aria-label="Data e hora de início"
                date-time
                required
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">
                Fim <span class="text-red-500">*</span>
              </label>
              <AppDatePicker
                v-model="form.endTime"
                aria-label="Data e hora de fim"
                date-time
                required
              />
            </div>
          </div>

          <!-- Ajuste Rápido de Duração -->
          <div>
            <span class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Duração estimada:
            </span>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                @click="setDuration(30)"
                class="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
              >
                30 minutos
              </button>
              <button
                type="button"
                @click="setDuration(45)"
                class="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
              >
                45 minutos
              </button>
              <button
                type="button"
                @click="setDuration(60)"
                class="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
              >
                1 hora
              </button>
            </div>
          </div>

          <!-- Observações Clínicas -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">
              Observações (Opcional)
            </label>
            <textarea
              v-model="form.description"
              maxlength="4000"
              rows="3"
              placeholder="Ex.: Sessão de avaliação postural, reabilitação articular..."
              class="block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-800 focus:ring-2 focus:ring-blue-100 focus:outline-none transition resize-none"
            ></textarea>
          </div>

          <!-- Alerta de Erro -->
          <div
            v-if="error"
            role="alert"
            class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle class="h-4 w-4 flex-shrink-0" />
            <span>{{ error }}</span>
          </div>

          <!-- Rodapé de Ações do Modal -->
          <div class="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <div>
              <button
                v-if="form.id"
                type="button"
                :disabled="saving"
                @click="remove"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition cursor-pointer"
              >
                <Trash2 class="h-4 w-4" />
                <span>Excluir</span>
              </button>
            </div>

            <div class="flex items-center gap-2.5">
              <button
                type="button"
                :disabled="saving"
                @click="form = null"
                class="h-10 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="action-button action-button-primary px-5 text-sm shadow-xs disabled:opacity-50"
              >
                <Check class="h-4 w-4" />
                <span>{{ saving ? 'Salvando...' : 'Salvar Agendamento' }}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Check,
  Plus,
  Trash2,
  X,
} from 'lucide-vue-next'
import AppButton from './AppButton.vue'
import AppDatePicker from './AppDatePicker.vue'
import PatientSelect from './PatientSelect.vue'
import api from '../utils/axios'
import { useFeedback } from '../composables/useFeedback'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

const { toast, confirm } = useFeedback()

const form = ref<{
  id?: string;
  patientId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
} | null>(null)

const error = ref('')
const saving = ref(false)

const calendarOptions = ref<any>({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  locale: 'pt-br',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },
  buttonText: {
    today: 'Hoje',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
  },
  events: [],
  slotMinTime: '07:00:00',
  slotMaxTime: '20:00:00',
  allDaySlot: false,
  height: 'auto',
  expandRows: true,
  nowIndicator: true,
  dateClick: handleDateClick,
  eventClick: handleEventClick,
  dayHeaderContent: (arg: any) => {
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(arg.date).replace('.', '');
    
    if (arg.view.type === 'dayGridMonth') {
      return {
        html: `<div class="py-2 w-full"><span class="text-[11px] font-bold uppercase tracking-widest text-slate-500">${weekday}</span></div>`
      };
    }

    const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(arg.date);
      
    const weekdayClass = arg.isToday ? 'text-blue-700' : 'text-slate-500';
    const dayClass = arg.isToday ? 'text-blue-800' : 'text-slate-800';

    return {
      html: `
        <div class="flex flex-col items-center justify-center py-2.5 w-full">
          <span class="text-[10px] font-bold uppercase tracking-wider ${weekdayClass}">${weekday}</span>
          <span class="text-xl font-black leading-none ${dayClass} mt-1">${day}</span>
        </div>
      `
    };
  },
})

function openNewAppointment() {
  error.value = ''
  const now = new Date()
  // Arredonda para a próxima hora cheia
  now.setMinutes(0, 0, 0)
  now.setHours(now.getHours() + 1)
  const later = new Date(now.getTime() + 60 * 60 * 1000)
  const local = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  form.value = {
    patientId: '',
    title: '',
    description: '',
    startTime: local(now),
    endTime: local(later),
  }
}

function setDuration(minutes: number) {
  if (!form.value?.startTime) return
  const start = new Date(form.value.startTime)
  const end = new Date(start.getTime() + minutes * 60 * 1000)
  const local = new Date(end.getTime() - end.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
  form.value.endTime = local
}

function handleDateClick(arg: any) {
  error.value = ''
  const start = arg.dateStr.slice(0, 16)
  const end = new Date(arg.date.getTime() + 60 * 60 * 1000)
  const local = new Date(end.getTime() - end.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
  form.value = {
    patientId: '',
    title: '',
    description: '',
    startTime: start.length === 10 ? `${start}T09:00` : start,
    endTime: start.length === 10 ? `${start}T10:00` : local,
  }
}

function handleEventClick(arg: any) {
  error.value = ''
  const local = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  form.value = {
    id: arg.event.id,
    patientId: arg.event.extendedProps.patientId || '',
    title: arg.event.extendedProps.eventTitle || 'Atendimento',
    description: arg.event.extendedProps.description || '',
    startTime: local(arg.event.start),
    endTime: local(arg.event.end),
  }
}

async function refresh() {
  const { data } = await api.get('/appointments')
  calendarOptions.value.events = data.map((item: any) => ({
    id: item.id,
    title: `${item.title || 'Atendimento'} — ${item.patientName}`,
    eventTitle: item.title || 'Atendimento',
    patientId: item.patientId,
    start: item.startTime,
    end: item.endTime,
    description: item.description,
  }))
}

async function save() {
  if (!form.value) return
  if (!form.value.patientId || !form.value.title.trim()) {
    error.value = 'Selecione um paciente e informe o título do evento.'
    return
  }
  if (!form.value.startTime || !form.value.endTime) {
    error.value = 'Selecione as datas e horários de início e fim.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const { id, patientId, title, description, startTime, endTime } = form.value
    const payload = {
      patientId,
      title: title.trim(),
      description,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    }
    if (id) await api.put(`/appointments/${id}`, payload)
    else await api.post('/appointments', payload)
    form.value = null
    await refresh()
    toast.success('Agendamento salvo com sucesso.')
  } catch {
    error.value = 'Confira os dados e sua permissão para editar este agendamento.'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (
    !form.value?.id ||
    !(await confirm({
      title: 'Excluir agendamento?',
      message: 'O agendamento será removido da agenda clínica.',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    }))
  )
    return
  saving.value = true
  try {
    await api.delete(`/appointments/${form.value.id}`)
    form.value = null
    await refresh()
    toast.success('Agendamento removido.')
  } catch {
    error.value = 'Não foi possível excluir o agendamento.'
  } finally {
    saving.value = false
  }
}

onMounted(() => refresh().catch(() => toast.error('Falha ao carregar agenda.')))
</script>

<style scoped>
.agenda-event-form :deep(input),
.agenda-event-form :deep(textarea),
.agenda-event-form :deep([role="option"]),
.agenda-event-form :deep(label) {
  color: #475569;
}

.agenda-event-form :deep(input::placeholder),
.agenda-event-form :deep(textarea::placeholder) {
  color: #64748b;
}

.agenda-event-form :deep(.app-date-picker) {
  --dp-text-color: #475569;
}

.calendar-container {
  /* Medical Healthcare Theme for FullCalendar */
  --fc-border-color: #e2e8f0;
  --fc-button-text-color: #1e40af;
  --fc-button-bg-color: #ffffff;
  --fc-button-border-color: #bfdbfe;
  --fc-button-hover-bg-color: #eff6ff;
  --fc-button-hover-border-color: #93c5fd;
  --fc-button-active-bg-color: #1e40af;
  --fc-button-active-border-color: #1e40af;
  --fc-event-bg-color: #eff6ff;
  --fc-event-border-color: #bfdbfe;
  --fc-event-text-color: #1e40af;
  --fc-today-bg-color: #f8fafc;
  --fc-now-indicator-color: #dc2626;
}

:deep(.fc .fc-toolbar) {
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

:deep(.fc .fc-toolbar-title) {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
}

:deep(.fc .fc-button) {
  text-transform: capitalize;
  font-weight: 600;
  font-size: 0.8125rem;
  border-radius: 0.5rem;
  padding: 0.4rem 0.85rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
  transition: all 0.15s ease-in-out;
}

:deep(.fc .fc-button-primary:not(:disabled).fc-button-active) {
  background-color: #1e40af !important;
  border-color: #1e40af !important;
  color: #ffffff !important;
}

:deep(.fc .fc-event) {
  border-radius: 0.375rem;
  padding: 2px 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

:deep(.fc .fc-event:hover) {
  background-color: #dbeafe;
  border-color: #60a5fa;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

:deep(.fc-timegrid-slot) {
  height: 2.25rem;
}

/* Remove espacos invisiveis forzando o topo para scroll sticky */
:deep(.fc-scrollgrid-section-sticky > th),
:deep(.fc-scrollgrid-section-sticky > td) {
  top: 0 !important;
  margin: 0 !important;
}

:deep(.fc .fc-col-header-cell),
:deep(.fc .fc-timegrid-axis-header) {
  padding: 0 !important;
  background-color: #f1f5f9 !important;
  vertical-align: middle;
}

:deep(.fc .fc-col-header-cell-cushion) {
  display: block !important;
  width: 100%;
  padding: 0 !important;
  text-decoration: none !important;
}
</style>
