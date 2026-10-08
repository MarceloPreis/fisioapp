<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import api from '../utils/axios'
import { useFeedback } from '../composables/useFeedback'

const authStore = useAuthStore()
const router = useRouter()
const { toast } = useFeedback()

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

const isChangePasswordModalOpen = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const isSubmitting = ref(false)
const changePasswordBtnRef = ref<HTMLButtonElement | null>(null)
const currentPasswordInputRef = ref<HTMLInputElement | null>(null)

const openChangePasswordModal = async () => {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  passwordError.value = ''
  isChangePasswordModalOpen.value = true
  
  await nextTick()
  currentPasswordInputRef.value?.focus()
}

const closeChangePasswordModal = () => {
  isChangePasswordModalOpen.value = false
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  passwordError.value = ''
  
  nextTick(() => {
    changePasswordBtnRef.value?.focus()
  })
}

const handleKeydown = (e: KeyboardEvent) => {
  if (isChangePasswordModalOpen.value && e.key === 'Escape') {
    closeChangePasswordModal()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

const handleChangePassword = async () => {
  passwordError.value = ''

  if (newPassword.value.length < 12 || newPassword.value.length > 128) {
    passwordError.value = 'A nova senha deve ter entre 12 e 128 caracteres.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'A confirmação de senha não corresponde à nova senha.'
    return
  }

  isSubmitting.value = true
  try {
    await api.post('/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    })
    toast.success('Senha alterada com sucesso.')
    closeChangePasswordModal()
  } catch (err: any) {
    const errorMsg = err.response?.data?.message
    passwordError.value = Array.isArray(errorMsg) ? errorMsg.join(', ') : (errorMsg || 'Erro ao alterar a senha. Verifique sua senha atual.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
    <!-- Header -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div class="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center shadow-sm">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <span class="font-bold text-xl tracking-tight text-slate-800">Fisio<span class="text-blue-800">App</span></span>
        </div>
        
        <div class="flex items-center space-x-4">
          <div class="hidden sm:block text-sm">
            <p class="font-medium text-slate-700">{{ authStore.user?.name }}</p>
            <p class="text-xs text-slate-500 text-right">Paciente</p>
          </div>
          <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold border border-blue-200">
            {{ authStore.user?.name?.charAt(0) || 'P' }}
          </div>
          <button ref="changePasswordBtnRef" aria-label="Alterar Senha" @click="openChangePasswordModal" class="text-slate-500 hover:text-blue-600 transition p-2 rounded-lg hover:bg-slate-100 cursor-pointer" title="Alterar Senha">
            <svg style="width: 20px; height: 20px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4v-3.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
          </button>
          <button @click="handleLogout" class="text-slate-500 hover:text-red-600 transition p-2 rounded-lg hover:bg-slate-100 cursor-pointer" title="Sair da conta">
            <svg style="width: 20px; height: 20px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <div class="mb-8">
        <slot name="title">
          <h1 class="text-2xl font-bold text-slate-800">Portal do Paciente</h1>
        </slot>
      </div>
      <slot />
    </main>

    <!-- Modal Alterar Senha -->
    <div v-if="isChangePasswordModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="change-pwd-title">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200">
        <div class="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 id="change-pwd-title" class="text-lg font-bold text-slate-800">Alterar Senha</h2>
          <button @click="closeChangePasswordModal" class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" aria-label="Fechar modal">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <form @submit.prevent="handleChangePassword" class="p-6 flex flex-col gap-4">
          <div>
            <label for="currentPassword" class="block text-sm font-semibold text-slate-700 mb-1">Senha Atual</label>
            <input 
              id="currentPassword"
              ref="currentPasswordInputRef"
              v-model="currentPassword"
              type="password"
              required
              :aria-invalid="!!passwordError"
              :aria-describedby="passwordError ? 'global-password-error' : undefined"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 outline-none transition-colors"
            >
          </div>
          <div>
            <label for="newPassword" class="block text-sm font-semibold text-slate-700 mb-1">Nova Senha</label>
            <input 
              id="newPassword"
              v-model="newPassword"
              type="password"
              required
              minlength="12"
              maxlength="128"
              :aria-invalid="!!passwordError"
              :aria-describedby="passwordError ? 'global-password-error new-pwd-hint' : 'new-pwd-hint'"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 outline-none transition-colors"
            >
            <p id="new-pwd-hint" class="text-xs text-slate-500 mt-1">A senha deve ter no mínimo 12 caracteres.</p>
          </div>
          <div>
            <label for="confirmPassword" class="block text-sm font-semibold text-slate-700 mb-1">Confirmar Nova Senha</label>
            <input 
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              required
              minlength="12"
              maxlength="128"
              :aria-invalid="!!passwordError"
              :aria-describedby="passwordError ? 'global-password-error' : undefined"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 outline-none transition-colors"
            >
          </div>
          
          <div v-if="passwordError" id="global-password-error" role="alert" aria-live="polite" class="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
            {{ passwordError }}
          </div>

          <div class="mt-2 flex justify-end gap-3">
            <button 
              type="button" 
              @click="closeChangePasswordModal"
              class="px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="px-4 py-2 rounded-lg font-medium text-white bg-blue-800 hover:bg-blue-900 transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              <svg v-if="isSubmitting" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ isSubmitting ? 'Salvando...' : 'Salvar Alteração' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
