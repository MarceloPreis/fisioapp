<script setup lang="ts">
import { ref } from 'vue';
import {
  Link2,
  Maximize2,
  Moon,
  Pencil,
  Plus,
  Unlink,
  X,
} from 'lucide-vue-next';

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

interface DayItem {
  id: number;
  short: string;
  name: string;
  isWeekend: boolean;
  routines: Routine[];
}

interface DayOption {
  id: number;
  short: string;
  name: string;
  isWeekend: boolean;
}

const props = defineProps<{
  day: DayItem;
  days: DayOption[];
  routines: Routine[];
  saving: boolean;
  repeatingKey: string | null;
  bindingDay: number | null;
  getExerciseTitle: (id: string) => string;
  getRoutineCardTheme: (key: string) => {
    border: string;
    badge: string;
    accent: string;
    tag: string;
  };
}>();

const emit = defineEmits<{
  (e: 'edit', routine?: Routine, dayId?: number): void;
  (e: 'unlink', routine: Routine, dayId: number): void;
  (e: 'toggleRoutineDay', routine: Routine, dayId: number): void;
  (e: 'bind', routine: Routine, dayId: number): void;
  (e: 'update:repeatingKey', key: string | null): void;
  (e: 'update:bindingDay', dayId: number | null): void;
}>();

const toggleRepeating = (key: string) => {
  emit('update:repeatingKey', props.repeatingKey === key ? null : key);
};

const toggleBinding = (dayId: number) => {
  emit('update:bindingDay', props.bindingDay === dayId ? null : dayId);
};

const dayDialog = ref<HTMLDialogElement | null>(null);

const editFromDialog = (routine: Routine) => {
  dayDialog.value?.close();
  emit('edit', routine);
};
</script>

<template>
  <section
    class="relative flex h-[320px] min-w-0 flex-col rounded-2xl border bg-white"
    :class="day.isWeekend ? 'border-slate-200 bg-slate-50/40' : 'border-slate-200'"
    :aria-label="day.name"
  >
    <!-- Cabeçalho do Dia -->
    <div class="shrink-0 border-b border-slate-100 px-3.5 py-2 bg-white rounded-t-2xl">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-slate-800">
            {{ day.name }}
          </span>
        </div>
        <div class="flex items-center gap-1">
        <span
          class="text-xs font-semibold px-2 py-0.5 rounded-full"
          :class="
            day.routines.length
              ? 'bg-blue-50 text-blue-700 font-bold'
              : 'bg-slate-100 text-slate-500'
          "
        >
          {{ day.routines.length ? `${day.routines.length} treino${day.routines.length === 1 ? '' : 's'}` : 'Descanso' }}
        </span>
        <button
          type="button"
          :aria-label="`Expandir detalhes de ${day.name}`"
          :title="`Expandir ${day.name}`"
          aria-haspopup="dialog"
          @click="dayDialog?.showModal()"
          class="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-800"
        >
          <Maximize2 class="h-4 w-4" aria-hidden="true" />
        </button>
        </div>
      </div>
    </div>

    <!-- Corpo do Dia (Lista de Rotinas / Descanso) -->
    <div
      tabindex="0"
      :aria-label="`Treinos de ${day.name}`"
      class="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3.5 focus-visible:outline-2 focus-visible:outline-blue-800"
    >
      <!-- Estado de Descanso -->
      <div
        v-if="!day.routines.length"
        class="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center"
      >
        <Moon class="h-5 w-5 text-slate-400" aria-hidden="true" />
        <p class="mt-2 text-base text-slate-500">Descanso</p>
      </div>

      <!-- Cards de Rotina Agendada -->
      <article
        v-for="routine in day.routines"
        :key="routine.key"
        class="group relative rounded-xl border p-3.5 shadow-xs transition-all bg-white"
        :class="getRoutineCardTheme(routine.key).border"
      >
        <details>
          <summary class="min-h-12 cursor-pointer rounded-lg text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-800">
            <span class="font-semibold break-words">{{ routine.title }}</span>
            <span class="mt-1 block text-sm text-slate-500">
              {{ routine.exercises.length }} exercício{{ routine.exercises.length === 1 ? '' : 's' }} · Ver detalhes
            </span>
          </summary>
          <ul class="mt-3 space-y-3 border-t border-slate-100 pt-3">
            <li v-for="(item, index) in routine.exercises" :key="index" class="text-base text-slate-700">
              <p>{{ getExerciseTitle(item.exerciseId) }}</p>
              <p class="text-sm text-slate-500">{{ item.sets }} séries · {{ item.reps }}</p>
            </li>
          </ul>
          <!-- Barra de Ações Rápidas -->
          <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
            <button
              type="button"
              :disabled="saving"
              @click="emit('edit', routine)"
              class="inline-flex items-center gap-1 rounded-md min-h-12 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-800 transition cursor-pointer"
              title="Editar exercícios e título deste modelo"
            >
              <Pencil class="h-3.5 w-3.5" />
              <span>Editar</span>
            </button>

            <button
              type="button"
              :disabled="saving"
              @click="toggleRepeating(`${day.id}-${routine.key}`)"
              class="inline-flex items-center gap-1 rounded-md min-h-12 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-800 transition cursor-pointer"
              :class="repeatingKey === `${day.id}-${routine.key}` ? 'bg-blue-50 text-blue-800' : ''"
              title="Adicionar ou remover dias deste treino"
            >
              <Link2 class="h-3.5 w-3.5" />
              <span>Repetir</span>
            </button>

            <button
              type="button"
              :disabled="saving"
              @click="emit('unlink', routine, day.id)"
              class="inline-flex items-center justify-center rounded-md min-h-12 min-w-12 p-1 text-slate-400 hover:bg-slate-100 hover:text-red-700 transition cursor-pointer"
              :aria-label="`Remover ${routine.title} de ${day.name}`" :title="`Remover deste dia (${day.short})`"
            >
              <Unlink class="h-3.5 w-3.5" />
            </button>
          </div>

          <!-- Gaveta Rápida de Dias (quando clicado em Repetir) -->
          <div
            v-if="repeatingKey === `${day.id}-${routine.key}`"
            class="mt-2.5 rounded-lg border border-blue-200 bg-blue-50/60 p-2 text-xs"
          >
            <div class="flex items-center justify-between mb-1.5">
              <span class="font-bold text-blue-900 text-[11px]">Vincular a outros dias:</span>
              <button
                type="button"
                @click="emit('update:repeatingKey', null)"
                aria-label="Fechar seleção de dias" class="min-h-12 min-w-12 flex items-center justify-center text-blue-700 hover:text-blue-900"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="option in days"
                :key="option.id"
                type="button"
                :disabled="saving"
                @click="emit('toggleRoutineDay', routine, option.id)"
                class="min-h-12 min-w-12 rounded-md text-[11px] font-bold transition flex items-center justify-center cursor-pointer"
                :class="
                  routine.recurrenceDays.includes(option.id)
                    ? 'bg-blue-800 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-400'
                "
                :title="`${option.name} (${routine.recurrenceDays.includes(option.id) ? 'Vinculado' : 'Não vinculado'})`"
              >
                {{ option.short }}
              </button>
            </div>
          </div>
        </details>
      </article>
    </div>

    <!-- Rodapé do Dia: Botão de Prescrever Treino -->
    <div class="relative shrink-0 p-3 border-t border-slate-100 bg-white rounded-b-2xl">
      <button
        type="button"
        :disabled="saving"
        @click="toggleBinding(day.id)"
        :aria-expanded="bindingDay === day.id"
        class="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 min-h-12 py-2.5 px-3 text-xs font-bold text-blue-800 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
      >
        <Plus class="h-3.5 w-3.5" />
        <span>Prescrever treino</span>
      </button>

      <!-- Dropdown Elegante de Prescrição -->
      <div
        v-if="bindingDay === day.id"
        class="absolute bottom-full left-3 right-3 z-10 mb-2 max-h-[220px] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-2 shadow-lg space-y-1 text-xs"
      >
        <button
          type="button"
          @click="emit('edit', undefined, day.id)"
          class="w-full flex items-center gap-2 rounded-lg p-2 text-left font-semibold text-blue-800 hover:bg-blue-50 transition cursor-pointer"
        >
          <Plus class="h-4 w-4" />
          <div>
            <p class="font-bold">Criar novo treino</p>
            <p class="text-[11px] font-normal text-slate-500">Montar do zero para {{ day.name }}</p>
          </div>
        </button>

        <!-- Treinos já existentes para reutilizar -->
        <template
          v-if="
            routines.filter((value) => !value.recurrenceDays.includes(day.id)).length
          "
        >
          <div class="my-1 border-t border-slate-100 px-2 pt-1.5">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Ou vincular treino existente:
            </span>
          </div>

          <button
            v-for="routine in routines.filter((v) => !v.recurrenceDays.includes(day.id))"
            :key="routine.key"
            type="button"
            @click="emit('bind', routine, day.id)"
            class="w-full flex items-center justify-between rounded-lg p-2 text-left text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <span class="font-medium truncate max-w-[150px]">{{ routine.title }}</span>
            <span class="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
              + Vincular
            </span>
          </button>
        </template>
      </div>
    </div>
  </section>

  <Teleport to="body">
    <dialog
      ref="dayDialog"
      :aria-labelledby="`day-dialog-title-${day.id}`"
      class="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
      @click="(event) => { if (event.target === dayDialog) dayDialog?.close(); }"
    >
      <div class="flex max-h-[85dvh] flex-col" @click.stop>
        <header class="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 :id="`day-dialog-title-${day.id}`" class="text-xl font-semibold">{{ day.name }}</h2>
            <p class="mt-1 text-base text-slate-500">
              {{ day.routines.length ? `${day.routines.length} treino${day.routines.length === 1 ? '' : 's'} no plano semanal` : 'Dia de descanso' }}
            </p>
          </div>
          <button type="button" aria-label="Fechar detalhes do dia" @click="dayDialog?.close()" class="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-800">
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div class="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-6">
          <div v-if="!day.routines.length" class="rounded-xl bg-slate-50 p-8 text-center">
            <Moon class="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <p class="mt-3 text-base text-slate-600">Nenhum treino prescrito para este dia.</p>
          </div>
          <article v-for="routine in day.routines" :key="routine.key" class="rounded-xl border border-slate-200 p-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="min-w-0 break-words text-lg font-semibold">{{ routine.title }}</h3>
              <button type="button" :disabled="saving" @click="editFromDialog(routine)" class="inline-flex min-h-12 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50">
                <Pencil class="h-4 w-4" aria-hidden="true" /> Editar treino
              </button>
            </div>
            <p class="mt-1 text-base text-slate-500">Dias: {{ days.filter((option) => routine.recurrenceDays.includes(option.id)).map((option) => option.short).join(', ') }}</p>
            <ul class="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              <li v-for="(exercise, index) in routine.exercises" :key="index" class="py-4">
                <p class="break-words text-base font-medium">{{ getExerciseTitle(exercise.exerciseId) }}</p>
                <p class="mt-1 break-words text-base text-slate-600">{{ exercise.sets }} séries · {{ exercise.reps }}</p>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>
