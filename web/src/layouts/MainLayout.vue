<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
      <div class="h-16 flex items-center px-6 border-b border-slate-200">
        <h1 class="text-xl font-bold text-blue-800">SITF</h1>
      </div>
      <nav class="flex-1 px-4 py-6 space-y-2">
        <RouterLink 
          to="/dashboard" 
          class="block px-4 py-2 rounded-lg font-medium transition-colors"
          :class="route.path === '/dashboard' ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'">
          Dashboard
        </RouterLink>
        <RouterLink 
          to="/patients" 
          class="block px-4 py-2 rounded-lg font-medium transition-colors"
          :class="route.path.startsWith('/patients') ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'">
          Pacientes
        </RouterLink>
        <RouterLink 
          to="/categories" 
          class="block px-4 py-2 rounded-lg font-medium transition-colors"
          :class="route.path.startsWith('/categories') ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'">
          Categorias
        </RouterLink>
        <RouterLink 
          to="/exercises" 
          class="block px-4 py-2 rounded-lg font-medium transition-colors"
          :class="route.path.startsWith('/exercises') ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'">
          Exercícios
        </RouterLink>
        <RouterLink 
          to="/prescriptions" 
          class="block px-4 py-2 rounded-lg font-medium transition-colors"
          :class="route.path.startsWith('/prescriptions') ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'">
          Sessões de Treino
        </RouterLink>
        <RouterLink
          to="/templates"
          class="flex min-h-12 items-center px-4 py-2 rounded-lg font-medium transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-800"
          :class="route.path.startsWith('/templates') ? 'bg-blue-50 text-blue-800' : 'text-slate-700'">
          Modelos Fixos
        </RouterLink>
        <RouterLink
          to="/session-reviews"
          class="block px-4 py-2 rounded-lg font-medium transition-colors"
          :class="route.path.startsWith('/session-reviews') ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'">
          Revisões de Sessão
        </RouterLink>
      </nav>
      <div class="p-4 border-t border-slate-200">
        <button @click="handleLogout" class="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">
          Sair do Sistema
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col h-screen overflow-hidden">
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
        <h2 class="text-lg font-medium text-slate-800">
          <slot name="title">Visão Geral</slot>
        </h2>
        <div class="flex items-center space-x-4">
          <span class="text-sm font-medium text-slate-600">Olá, {{ authStore.user?.name || 'Profissional' }}</span>
        </div>
      </header>
      <div class="flex-1 overflow-y-auto">
        <div class="min-h-full p-8">
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>
