<script setup lang="ts">
import PatientSelect from './PatientSelect.vue';
import AppButton from './AppButton.vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { CalendarDays, X } from 'lucide-vue-next';
const router = useRouter();
const open = ref(false);
const patientId = ref('');
const navigate = async () => {
  if (patientId.value) {
    open.value = false;
    await router.push(`/patients/${patientId.value}/plan`);
  }
};
</script>
<template>
  <AppButton
    type="button"
    @click="
      open = true;
      patientId = '';
    "
  >
    <CalendarDays class="h-4 w-4" aria-hidden="true" />
    <span>Montar Plano Semanal por Paciente</span>
  </AppButton>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
  >
    <form
      @submit.prevent="navigate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-picker-title"
      class="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 id="plan-picker-title" class="text-xl font-semibold text-slate-900">
          Escolher paciente
        </h2>
        <button
          type="button"
          @click="open = false"
          aria-label="Fechar seleção"
          class="flex min-h-12 min-w-12 items-center justify-center"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
      <PatientSelect v-model="patientId" required />
      <div class="mt-5 flex justify-end gap-3">
        <button
          type="button"
          @click="open = false"
          class="min-h-12 px-3 text-base text-slate-700"
        >
          Cancelar</button
        ><button
          :disabled="!patientId"
          class="min-h-12 rounded-lg bg-blue-800 px-4 text-base text-white disabled:opacity-50"
        >
          Abrir plano
        </button>
      </div>
    </form>
  </div>
</template>
