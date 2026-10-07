<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Dumbbell,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-vue-next';
import MainLayout from '../layouts/MainLayout.vue';
import PlanDayColumn from '../components/PlanDayColumn.vue';
import AppButton from '../components/AppButton.vue';
import api from '../utils/axios';
import { useFeedback } from '../composables/useFeedback';

interface Exercise {
  id: string;
  title: string;
  description?: string;
  category?: { id: string; name: string };
}

interface PlanExercise {
  exerciseId: string;
  sets: number;
  reps: string;
}

interface Routine {
  key: string;
  id?: string;
  title: string;
  recurrenceDays: number[];
  exercises: PlanExercise[];
}

interface SavedRoutine {
  id: string;
  title: string;
  recurrenceDays: number[] | null;
  sessionExercises: PlanExercise[];
}

interface PlanResponse {
  patient: { id: string; fullName: string };
  routines: SavedRoutine[];
}

const route = useRoute();
const { toast, confirm } = useFeedback();

const days = [
  { id: 1, short: 'Seg', name: 'Segunda-feira', isWeekend: false },
  { id: 2, short: 'Ter', name: 'Terça-feira', isWeekend: false },
  { id: 3, short: 'Qua', name: 'Quarta-feira', isWeekend: false },
  { id: 4, short: 'Qui', name: 'Quinta-feira', isWeekend: false },
  { id: 5, short: 'Sex', name: 'Sexta-feira', isWeekend: false },
  { id: 6, short: 'Sáb', name: 'Sábado', isWeekend: true },
  { id: 0, short: 'Dom', name: 'Domingo', isWeekend: true },
];

const routines = ref<Routine[]>([]);
const exercises = ref<Exercise[]>([]);
const patient = ref<PlanResponse['patient'] | null>(null);
const loading = ref(true);
const saving = ref(false);
const loadError = ref('');
const baseline = ref('');
const previousCount = ref(0);
const draft = ref<Routine | null>(null);
const draftError = ref('');
const bindingDay = ref<number | null>(null);
const repeatingKey = ref<string | null>(null);
let sequence = 0;

const repSuggestions = ['10 a 12', '12 a 15', '15 a 20', '30 seg', '45 seg'];

const serialize = () =>
  routines.value.map(({ id, title, recurrenceDays, exercises: routineExercises }) => ({
    ...(id ? { id } : {}),
    title,
    recurrenceDays: [...recurrenceDays].sort((a, b) => a - b),
    exercises: routineExercises.map(({ exerciseId, sets, reps }) => ({
      exerciseId,
      sets,
      reps,
    })),
  }));

const dirty = computed(
  () => !!patient.value && JSON.stringify(serialize()) !== baseline.value,
);

const grid = computed(() =>
  days.map((day) => ({
    ...day,
    routines: routines.value.filter((routine) =>
      routine.recurrenceDays.includes(day.id),
    ),
  })),
);

const activeDaysCount = computed(
  () => grid.value.filter((day) => day.routines.length > 0).length,
);

const exerciseMap = computed(() => {
  const map = new Map<string, Exercise>();
  for (const ex of exercises.value) {
    map.set(ex.id, ex);
  }
  return map;
});

const getExerciseTitle = (exerciseId: string) => {
  return exerciseMap.value.get(exerciseId)?.title || 'Exercício selecionado';
};

const getRoutineCardTheme = (key: string) => {
  const index = routines.value.findIndex((r) => r.key === key);
  if (index % 3 === 0) {
    return {
      border: 'border-blue-200',
      badge: 'bg-blue-50 text-blue-800 border-blue-200',
      accent: 'bg-blue-700',
      tag: 'bg-blue-100 text-blue-800',
    };
  }
  if (index % 3 === 1) {
    return {
      border: 'border-teal-200',
      badge: 'bg-teal-50 text-teal-800 border-teal-200',
      accent: 'bg-teal-600',
      tag: 'bg-teal-100 text-teal-800',
    };
  }
  return {
    border: 'border-indigo-200',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    accent: 'bg-indigo-600',
    tag: 'bg-indigo-100 text-indigo-800',
  };
};

const setPlan = (data: PlanResponse) => {
  patient.value = data.patient;
  routines.value = data.routines.map((routine) => ({
    key: routine.id,
    id: routine.id,
    title: routine.title,
    recurrenceDays: [...(routine.recurrenceDays || [])],
    exercises: routine.sessionExercises.map(({ exerciseId, sets, reps }) => ({
      exerciseId,
      sets,
      reps,
    })),
  }));
  previousCount.value = routines.value.length;
  baseline.value = JSON.stringify(serialize());
};

const load = async () => {
  loading.value = true;
  loadError.value = '';
  patient.value = null;
  draft.value = null;
  bindingDay.value = null;
  repeatingKey.value = null;
  try {
    const [plan, catalog] = await Promise.all([
      api.get<PlanResponse>(`/patients/${route.params.id}/weekly-plan`),
      api.get<Exercise[]>('/exercises'),
    ]);
    setPlan(plan.data);
    exercises.value = catalog.data;
  } catch {
    loadError.value =
      'Não foi possível carregar o plano semanal. Tente novamente.';
  } finally {
    loading.value = false;
  }
};

watch(() => route.params.id, load, { immediate: true });

const leave = async () => {
  if (saving.value) return false;
  if (!dirty.value && !draft.value) return true;
  return confirm({
    title: 'Descartar alterações?',
    message: 'As alterações do plano ainda não foram salvas.',
    confirmLabel: 'Descartar',
    cancelLabel: 'Continuar editando',
    tone: 'danger',
  });
};

onBeforeRouteLeave(leave);
onBeforeRouteUpdate(leave);

const revertChanges = async () => {
  if (!dirty.value) return;
  const confirmed = await confirm({
    title: 'Reverter alterações?',
    message: 'Deseja descartar as alterações não salvas e restaurar o plano original?',
    confirmLabel: 'Sim, reverter',
    cancelLabel: 'Cancelar',
    tone: 'danger',
  });
  if (confirmed && baseline.value) {
    const parsed = JSON.parse(baseline.value);
    routines.value = parsed.map((item: any) => ({
      ...item,
      key: item.id || `reverted-${++sequence}`,
    }));
    toast.info('Alterações revertidas ao estado salvo.');
  }
};

const edit = (routine?: Routine, day = 1) => {
  draftError.value = '';
  repeatingKey.value = null;
  bindingDay.value = null;
  draft.value = routine
    ? {
        ...routine,
        recurrenceDays: [...routine.recurrenceDays],
        exercises: routine.exercises.map((exercise) => ({ ...exercise })),
      }
    : {
        key: `new-${++sequence}`,
        title: '',
        recurrenceDays: [day],
        exercises: [{ exerciseId: '', sets: 3, reps: '10 a 12' }],
      };
};

const toggleDraftDay = (day: number) => {
  if (!draft.value) return;
  draft.value.recurrenceDays = draft.value.recurrenceDays.includes(day)
    ? draft.value.recurrenceDays.filter((value) => value !== day)
    : [...draft.value.recurrenceDays, day];
};

const applyPresetDays = (preset: 'allWeek' | 'monWedFri' | 'tueThu' | 'weekdays') => {
  if (!draft.value) return;
  if (preset === 'monWedFri') draft.value.recurrenceDays = [1, 3, 5];
  else if (preset === 'tueThu') draft.value.recurrenceDays = [2, 4];
  else if (preset === 'weekdays') draft.value.recurrenceDays = [1, 2, 3, 4, 5];
  else if (preset === 'allWeek') draft.value.recurrenceDays = [1, 2, 3, 4, 5, 6, 0];
};

const applyDraft = () => {
  if (!draft.value) return;
  const value = draft.value;
  if (!value.title.trim()) {
    draftError.value = 'Informe o título do treino.';
    return;
  }
  if (!value.recurrenceDays.length) {
    draftError.value = 'Selecione pelo menos um dia da semana para o treino.';
    return;
  }
  if (
    !value.exercises.length ||
    value.exercises.some(
      (exercise) =>
        !exercise.exerciseId ||
        !exercise.reps.trim() ||
        !Number.isInteger(exercise.sets) ||
        exercise.sets < 1 ||
        exercise.sets > 200,
    )
  ) {
    draftError.value =
      'Selecione o exercício e informe séries (1 a 200) e repetições para todas as linhas.';
    return;
  }
  if (
    routines.value.some(
      (routine) =>
        routine.key !== value.key &&
        routine.title.trim().toLocaleLowerCase('pt-BR') ===
          value.title.trim().toLocaleLowerCase('pt-BR'),
    )
  ) {
    draftError.value = 'Já existe outro treino com este título no plano.';
    return;
  }
  value.title = value.title.trim();
  value.exercises = value.exercises.map((exercise) => ({
    ...exercise,
    reps: exercise.reps.trim(),
  }));
  const index = routines.value.findIndex(
    (routine) => routine.key === value.key,
  );
  if (index < 0) routines.value.push(value);
  else routines.value[index] = value;
  draft.value = null;
};

const unlink = async (routine: Routine, day: number) => {
  if (
    routine.recurrenceDays.length === 1 &&
    !(await confirm({
      title: 'Remover treino do plano?',
      message:
        'Este é o último dia vinculado. O modelo será removido quando você salvar o plano; sessões já agendadas serão preservadas.',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    }))
  )
    return;
  routine.recurrenceDays = routine.recurrenceDays.filter(
    (value) => value !== day,
  );
  if (!routine.recurrenceDays.length)
    routines.value = routines.value.filter(
      (value) => value.key !== routine.key,
    );
};

const toggleRoutineDay = async (routine: Routine, day: number) => {
  if (routine.recurrenceDays.includes(day)) await unlink(routine, day);
  else routine.recurrenceDays.push(day);
};

const bind = (routine: Routine, day: number) => {
  if (!routine.recurrenceDays.includes(day)) routine.recurrenceDays.push(day);
  bindingDay.value = null;
};

const save = async () => {
  if (!patient.value || draft.value || saving.value) return;
  if (
    !routines.value.length &&
    previousCount.value &&
    !(await confirm({
      title: 'Salvar semana em descanso?',
      message:
        'Todos os modelos deste paciente serão removidos. Sessões agendadas e histórico serão preservados.',
      confirmLabel: 'Salvar descanso',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    }))
  )
    return;
  saving.value = true;
  try {
    const { data } = await api.put<PlanResponse>(
      `/patients/${patient.value.id}/weekly-plan`,
      { routines: serialize() },
    );
    setPlan(data);
    toast.success('Plano semanal salvo com sucesso.');
  } catch (error: any) {
    const message = error.response?.data?.message;
    toast.error(
      Array.isArray(message)
        ? message.join(' ')
        : message || 'Não foi possível salvar o plano semanal.',
    );
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <MainLayout>
    <template #title>Plano Terapêutico Semanal</template>

    <!-- Cabeçalho e Navegação Contextual -->
    <div class="mb-6 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <RouterLink
            to="/patients"
            class="group inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Voltar para lista de pacientes
          </RouterLink>
          <div class="mt-2 flex flex-wrap items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-base font-bold text-blue-800 shadow-sm border border-blue-200">
              {{ patient?.fullName?.charAt(0) || 'P' }}
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-2xl font-bold tracking-tight text-slate-900">
                  {{ patient?.fullName || 'Plano Semanal do Paciente' }}
                </h1>
                <!-- Badge de Sincronização / Status -->
                <span
                  v-if="dirty"
                  class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200 shadow-xs"
                >
                  <span class="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Alterações não salvas
                </span>
              </div>
              <p class="text-sm text-slate-500">
                Organize os treinos da semana.
              </p>
            </div>
          </div>
        </div>

        <!-- Ações do Cabeçalho -->
        <div class="flex items-center gap-3">
          <AppButton
            v-if="dirty"
            type="button"
            :disabled="saving"
            @click="revertChanges"
            title="Descartar alterações não salvas"
          >
            <RotateCcw class="h-4 w-4" />
            <span>Descartar</span>
          </AppButton>

          <AppButton
            variant="primary"
            type="button"
            :disabled="loading || !!loadError || saving || !dirty || !!draft"
            @click="save"
          >
            <Save class="h-4 w-4" aria-hidden="true" />
            <span>{{ saving ? 'Salvando plano...' : 'Salvar plano' }}</span>
          </AppButton>
        </div>
      </div>

      <p v-if="!loading && !loadError" class="text-base text-slate-600">
        {{ routines.length }} treino{{ routines.length === 1 ? '' : 's' }}
        <span class="mx-2 text-slate-300" aria-hidden="true">·</span>
        {{ activeDaysCount }} dia{{ activeDaysCount === 1 ? '' : 's' }} com treino
      </p>
    </div>

    <div v-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Carregando plano semanal" aria-busy="true">
      <div v-for="day in days" :key="day.id" class="h-[320px] animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
        <div class="h-5 w-28 rounded bg-slate-200"></div>
        <div class="mt-5 h-20 rounded-xl bg-slate-100"></div>
      </div>
    </div>

    <!-- Estado de Erro -->
    <div
      v-else-if="loadError"
      role="alert"
      class="rounded-2xl border border-red-200 bg-red-50/70 p-6 text-red-950 shadow-sm"
    >
      <div class="flex items-start gap-4">
        <div class="p-2 rounded-xl bg-red-100 text-red-600">
          <AlertCircle class="h-6 w-6" />
        </div>
        <div>
          <h3 class="text-base font-bold text-red-900">Falha ao carregar o plano</h3>
          <p class="mt-1 text-sm text-red-700">{{ loadError }}</p>
          <button
            @click="load"
            class="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>

    <!-- Grade Semanal Dividida (5 Dias Úteis + Fim de Semana) -->
    <template v-else>
      <!-- Aviso de biblioteca vazia -->
      <div
        v-if="!exercises.length"
        class="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
      >
        <div class="flex items-center gap-2">
          <AlertCircle class="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span>Nenhum exercício cadastrado na biblioteca. Cadastre exercícios antes de criar treinos.</span>
        </div>
        <RouterLink
          to="/exercises"
          class="font-semibold text-amber-900 underline hover:text-amber-950"
        >
          Gerenciar exercícios →
        </RouterLink>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 items-start">
            <PlanDayColumn
              v-for="day in grid"
              :key="day.id"
              :day="day"
              :days="days"
              :routines="routines"
              :saving="saving"
              :repeating-key="repeatingKey"
              :binding-day="bindingDay"
              :get-exercise-title="getExerciseTitle"
              :get-routine-card-theme="getRoutineCardTheme"
              @edit="edit"
              @unlink="unlink"
              @toggle-routine-day="toggleRoutineDay"
              @bind="bind"
              @update:repeating-key="repeatingKey = $event"
              @update:binding-day="bindingDay = $event"
            />
      </div>
    </template>

    <!-- MODAL DE CRIAÇÃO / EDIÇÃO DE TREINO (DRAFT) -->
    <div
      v-if="draft"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="draft = null"
    >
      <form
        @submit.prevent="applyDraft"
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-title"
        class="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        <!-- Topo Fixo do Modal -->
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
              <Dumbbell class="h-5 w-5" />
            </div>
            <div>
              <h2 id="routine-title" class="text-lg font-bold text-slate-900">
                {{
                  routines.some((value) => value.key === draft?.key)
                    ? 'Editar Treino'
                    : 'Novo Modelo de Treino'
                }}
              </h2>
              <p class="text-xs text-slate-500">
                Configure os dias da semana e a grade de exercícios deste modelo.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cancelar edição"
            @click="draft = null"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Conteúdo do Modal (Scrollável) -->
        <div class="p-6 space-y-6 max-h-[calc(85vh-140px)] overflow-y-auto">
          <!-- Campo: Título -->
          <div>
            <label class="block text-sm font-bold text-slate-900">
              Título do Treino <span class="text-red-500">*</span>
            </label>
            <input
              v-model="draft.title"
              autofocus
              required
              maxlength="200"
              placeholder="Ex.: Treino A - Fortalecimento Muscular e Mobilidade"
              class="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm font-medium text-slate-900 focus:border-blue-800 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
            />
          </div>

          <!-- Campo: Dias de Recorrência -->
          <div>
            <div class="flex items-center justify-between">
              <label class="block text-sm font-bold text-slate-900">
                Dias em que o treino se repete <span class="text-red-500">*</span>
              </label>
              <!-- Presets Rápidos -->
              <div class="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  @click="applyPresetDays('monWedFri')"
                  class="rounded px-2 py-0.5 text-blue-800 hover:bg-blue-50 font-semibold cursor-pointer"
                >
                  Seg/Qua/Sex
                </button>
                <span class="text-slate-300">•</span>
                <button
                  type="button"
                  @click="applyPresetDays('tueThu')"
                  class="rounded px-2 py-0.5 text-blue-800 hover:bg-blue-50 font-semibold cursor-pointer"
                >
                  Ter/Qui
                </button>
                <span class="text-slate-300">•</span>
                <button
                  type="button"
                  @click="applyPresetDays('weekdays')"
                  class="rounded px-2 py-0.5 text-blue-800 hover:bg-blue-50 font-semibold cursor-pointer"
                >
                  Seg-Sex
                </button>
              </div>
            </div>

            <div class="mt-2.5 flex flex-wrap gap-2">
              <button
                v-for="day in days"
                :key="day.id"
                type="button"
                :aria-pressed="draft.recurrenceDays.includes(day.id)"
                @click="toggleDraftDay(day.id)"
                class="min-h-11 flex-1 min-w-[70px] rounded-xl border px-3 text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                :class="
                  draft.recurrenceDays.includes(day.id)
                    ? 'border-blue-800 bg-blue-800 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                "
              >
                <span>{{ day.short }}</span>
                <Check v-if="draft.recurrenceDays.includes(day.id)" class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <!-- Campo: Lista de Exercícios -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 class="text-sm font-bold text-slate-900">
                  Exercícios Prescritos
                </h3>
                <p class="text-xs text-slate-500">
                  {{ draft.exercises.length }} exercício(s) adicionados
                </p>
              </div>
              <button
                type="button"
                :disabled="draft.exercises.length >= 200"
                @click="draft.exercises.push({ exerciseId: '', sets: 3, reps: '10 a 12' })"
                class="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-100 transition cursor-pointer"
              >
                <Plus class="h-4 w-4" />
                Adicionar exercício
              </button>
            </div>

            <div class="space-y-3">
              <div
                v-for="(exercise, index) in draft.exercises"
                :key="index"
                class="rounded-xl border border-slate-200 bg-slate-50/40 p-4 transition-all focus-within:border-blue-300 focus-within:bg-white"
              >
                <div class="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Exercício {{ index + 1 }}
                  </span>
                  <button
                    v-if="draft.exercises.length > 1"
                    type="button"
                    @click="draft.exercises.splice(index, 1)"
                    class="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 transition cursor-pointer"
                    title="Remover exercício da rotina"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                    Remover
                  </button>
                </div>

                <div class="grid gap-3 sm:grid-cols-12 items-start">
                  <!-- Seletor de Exercício -->
                  <div class="sm:col-span-6">
                    <label class="block text-xs font-bold text-slate-700">
                      Nome do Exercício <span class="text-red-500">*</span>
                    </label>
                    <select
                      v-model="exercise.exerciseId"
                      required
                      class="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-800 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                    >
                      <option value="">Selecione na biblioteca...</option>
                      <option
                        v-for="option in exercises"
                        :key="option.id"
                        :value="option.id"
                      >
                        {{ option.title }}
                      </option>
                    </select>
                  </div>

                  <!-- Séries (Stepper) -->
                  <div class="sm:col-span-3">
                    <label :for="`sets-${index}`" class="block text-xs font-bold text-slate-700">
                      Séries <span class="text-red-500">*</span>
                    </label>
                    <div class="mt-1 flex items-center">
                      <button
                        type="button"
                        :disabled="exercise.sets <= 1"
                        :aria-label="`Diminuir séries do exercício ${index + 1}`"
                        @click="exercise.sets--"
                        class="flex min-h-11 min-w-10 items-center justify-center rounded-l-xl border border-r-0 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        <Minus class="h-4 w-4" />
                      </button>
                      <input
                        :id="`sets-${index}`"
                        v-model.number="exercise.sets"
                        type="number"
                        required
                        min="1"
                        max="200"
                        class="min-h-11 w-14 border border-slate-300 bg-white text-center text-sm font-bold text-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        :disabled="exercise.sets >= 200"
                        :aria-label="`Aumentar séries do exercício ${index + 1}`"
                        @click="exercise.sets++"
                        class="flex min-h-11 min-w-10 items-center justify-center rounded-r-xl border border-l-0 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        <Plus class="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <!-- Repetições -->
                  <div class="sm:col-span-3">
                    <label class="block text-xs font-bold text-slate-700">
                      Repetições <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="exercise.reps"
                      required
                      maxlength="200"
                      placeholder="Ex: 10 a 12"
                      class="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-800 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                    />
                    <!-- Sugestões de repetições -->
                    <div class="mt-1.5 flex flex-wrap gap-1">
                      <button
                        v-for="sug in repSuggestions"
                        :key="sug"
                        type="button"
                        @click="exercise.reps = sug"
                        class="text-[10px] rounded bg-white px-1.5 py-0.5 border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-800 transition cursor-pointer"
                      >
                        {{ sug }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Botão Adicionar Exercício -->
            <button
              type="button"
              :disabled="draft.exercises.length >= 200"
              @click="draft.exercises.push({ exerciseId: '', sets: 3, reps: '10 a 12' })"
              class="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-3 text-sm font-bold text-blue-800 hover:border-blue-300 hover:bg-blue-50/50 transition cursor-pointer"
            >
              <Plus class="h-4 w-4" />
              Adicionar outro exercício a este treino
            </button>
          </div>

          <!-- Mensagem de Erro de Validação -->
          <div
            v-if="draftError"
            role="alert"
            class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
          >
            <AlertCircle class="h-4 w-4 flex-shrink-0" />
            <span>{{ draftError }}</span>
          </div>
        </div>

        <!-- Rodapé Fixo do Modal -->
        <div class="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 bg-slate-50/50">
          <button
            type="button"
            @click="draft = null"
            class="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="min-h-11 inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 text-sm font-bold text-white hover:bg-blue-900 shadow-sm transition cursor-pointer"
          >
            <Check class="h-4 w-4" />
            Aplicar treino ao plano
          </button>
        </div>
      </form>
    </div>
  </MainLayout>
</template>
