<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('') // Pré-prenchido para o MVP
const password = ref('')

const handleLogin = async () => {
  try {
    await authStore.login(email.value, password.value)
    router.push('/dashboard')
  } catch (error) {
    // O erro já é tratado e exibido via authStore.error
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-xl shadow-sm p-8 border border-slate-100">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-semibold text-blue-800">SITF</h1>
        <p class="text-slate-500 mt-2">Acesso Restrito para Profissionais</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">E-mail Profissional</label>
          <input 
            v-model="email" 
            type="text" 
            required 
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 outline-none transition-colors"
            placeholder="fisioterapeuta@clinica.com"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Senha</label>
          <input 
            v-model="password" 
            type="password" 
            required 
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 outline-none transition-colors"
          >
        </div>

        <div v-if="authStore.error" class="text-red-600 text-sm p-3 bg-red-50 rounded-lg">
          {{ authStore.error }}
        </div>

        <button 
          type="submit" 
          :disabled="authStore.isLoading"
          class="w-full bg-blue-800 text-white font-medium py-3 rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-70"
        >
          {{ authStore.isLoading ? 'Autenticando...' : 'Entrar no Sistema' }}
        </button>
      </form>
    </div>
  </div>
</template>
