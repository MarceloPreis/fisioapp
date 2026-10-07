<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
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
  </div>
</template>
