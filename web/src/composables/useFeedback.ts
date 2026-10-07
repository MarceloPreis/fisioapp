import { reactive } from 'vue'

/**
 * Feedback global da aplicação: diálogos de confirmação e toasts.
 * Substitui os `alert()`/`confirm()` nativos do navegador por componentes
 * consistentes com a identidade visual clínica do SITF.
 */

export type ConfirmTone = 'danger' | 'primary'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

interface ConfirmState extends Required<Omit<ConfirmOptions, 'message'>> {
  open: boolean
  message: string
  resolve: ((value: boolean) => void) | null
}

export type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

const confirmState = reactive<ConfirmState>({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  tone: 'primary',
  resolve: null,
})

const toasts = reactive<Toast[]>([])
let toastSeq = 0

const confirm = (options: ConfirmOptions): Promise<boolean> => {
  // Fecha qualquer diálogo pendente como "cancelado" antes de abrir outro
  confirmState.resolve?.(false)

  return new Promise((resolve) => {
    Object.assign(confirmState, {
      open: true,
      title: options.title,
      message: options.message ?? '',
      confirmLabel: options.confirmLabel ?? 'Confirmar',
      cancelLabel: options.cancelLabel ?? 'Cancelar',
      tone: options.tone ?? 'primary',
      resolve,
    })
  })
}

const settleConfirm = (value: boolean) => {
  confirmState.resolve?.(value)
  confirmState.resolve = null
  confirmState.open = false
}

const dismissToast = (id: number) => {
  const idx = toasts.findIndex((t) => t.id === id)
  if (idx !== -1) toasts.splice(idx, 1)
}

const pushToast = (kind: ToastKind, message: string, durationMs = 4000) => {
  const id = ++toastSeq
  toasts.push({ id, kind, message })
  window.setTimeout(() => dismissToast(id), durationMs)
}

const toast = {
  success: (message: string) => pushToast('success', message),
  error: (message: string) => pushToast('error', message, 6000),
  info: (message: string) => pushToast('info', message),
}

export const useFeedback = () => ({
  confirm,
  toast,
  // Estado interno consumido pelo FeedbackHost
  confirmState,
  settleConfirm,
  toasts,
  dismissToast,
})
