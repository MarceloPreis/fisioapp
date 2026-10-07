<script setup lang="ts">
import { nextTick, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-vue-next'
import { useFeedback } from '../composables/useFeedback'

const { confirmState, settleConfirm, toasts, dismissToast } = useFeedback()

const confirmButton = ref<HTMLButtonElement | null>(null)

// Foco no botão de confirmação ao abrir, para operação por teclado
watch(
  () => confirmState.open,
  async (open) => {
    if (open) {
      await nextTick()
      confirmButton.value?.focus()
    }
  },
)

const onKeydown = (e: KeyboardEvent) => {
  if (confirmState.open && e.key === 'Escape') {
    e.stopPropagation()
    settleConfirm(false)
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<template>
  <!-- Diálogo de confirmação -->
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    leave-active-class="transition duration-100 ease-in"
    leave-to-class="opacity-0"
  >
    <div
      v-if="confirmState.open"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="settleConfirm(false)"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        class="w-full max-w-md rounded-xl bg-white p-6 shadow-[0_20px_40px_-12px_rgba(15,23,42,0.35)]"
      >
        <div class="flex gap-4">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            :class="confirmState.tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-800'"
          >
            <AlertTriangle v-if="confirmState.tone === 'danger'" class="h-5 w-5" aria-hidden="true" />
            <Info v-else class="h-5 w-5" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <h2 id="confirm-title" class="text-base font-semibold text-slate-900">{{ confirmState.title }}</h2>
            <p v-if="confirmState.message" id="confirm-message" class="mt-1.5 text-sm leading-relaxed text-slate-600">
              {{ confirmState.message }}
            </p>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="min-h-11 rounded-lg px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
            @click="settleConfirm(false)"
          >
            {{ confirmState.cancelLabel }}
          </button>
          <button
            ref="confirmButton"
            type="button"
            class="min-h-11 rounded-lg px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
            :class="confirmState.tone === 'danger'
              ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600'
              : 'bg-blue-800 hover:bg-blue-900 focus-visible:outline-blue-800'"
            @click="settleConfirm(true)"
          >
            {{ confirmState.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Toasts -->
  <div
    class="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-full max-w-sm flex-col gap-2"
    aria-live="polite"
    role="status"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-3 rounded-lg border bg-white p-3.5 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.25)]"
        :class="{
          'border-green-200': t.kind === 'success',
          'border-red-200': t.kind === 'error',
          'border-slate-200': t.kind === 'info',
        }"
      >
        <CheckCircle2 v-if="t.kind === 'success'" class="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
        <XCircle v-else-if="t.kind === 'error'" class="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
        <Info v-else class="mt-0.5 h-5 w-5 shrink-0 text-blue-800" aria-hidden="true" />
        <p class="flex-1 text-sm text-slate-800">{{ t.message }}</p>
        <button
          type="button"
          class="-m-1 rounded p-1 text-slate-400 hover:text-slate-600"
          aria-label="Fechar notificação"
          @click="dismissToast(t.id)"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
