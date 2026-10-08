<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import LoadingShimmer from './LoadingShimmer.vue'
import ReloadButton from './ReloadButton.vue'

interface Column {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
}

const props = defineProps<{
  loading?: boolean
  items: any[]
  columns: Column[]
  searchPlaceholder?: string
  searchFields?: string[] // Campos onde a busca será feita (ex: ['title', 'fullName'])
  itemsPerPage?: number
}>()

defineEmits<{ reload: [] }>()

const perPage = props.itemsPerPage || 10
const currentPage = ref(1)
const searchQuery = ref('')

const filteredItems = computed(() => {
  if (!searchQuery.value) return props.items
  
  const query = searchQuery.value.toLowerCase()
  return props.items.filter(item => {
    // Se não informou fields, busca em todos os valores (strings)
    if (!props.searchFields) {
      return Object.values(item).some(val => 
        String(val).toLowerCase().includes(query)
      )
    }
    // Busca nos fields especificados
    return props.searchFields.some(field => {
      const val = item[field]
      return val && String(val).toLowerCase().includes(query)
    })
  })
})

const totalPages = computed(() => Math.ceil(filteredItems.value.length / perPage) || 1)

watch(totalPages, pages => { currentPage.value = Math.min(currentPage.value, pages) })

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filteredItems.value.slice(start, start + perPage)
})

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

// Reseta a paginação se a busca mudar
const handleSearch = () => {
  currentPage.value = 1
}
</script>

<template>
  <div class="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col">
    <p role="status" class="sr-only">{{ loading ? 'Carregando registros...' : 'Carregamento concluído.' }}</p>
    <!-- Header: Search -->
    <div class="p-4 border-b border-slate-200 flex flex-wrap justify-start items-center gap-3 rounded-t-lg bg-slate-50">
      <div class="relative w-full min-w-0 xl:w-96">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </span>
        <input 
          v-model="searchQuery" 
          @input="handleSearch"
          type="text" 
          :placeholder="searchPlaceholder || 'Buscar...'"
          aria-label="Buscar registros" class="min-h-12 w-full bg-white pl-10 pr-4 border border-slate-300 rounded-lg outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-100 text-base text-slate-900"
        />
      </div>
      
      <ReloadButton :loading="loading" @reload="$emit('reload')" />
      <!-- Ações globais (slots) -->
      <div v-if="$slots['header-actions']" class="flex w-full flex-wrap items-center gap-3 xl:w-auto">
        <slot name="header-actions"></slot>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table :aria-busy="loading" class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
            <th 
              v-for="col in columns" 
              :key="col.key" 
              class="p-4 font-medium"
              :class="{'text-center': col.align === 'center', 'text-right': col.align === 'right'}"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody v-if="loading" aria-hidden="true">
          <tr v-for="row in 5" :key="row" class="border-b border-slate-100">
            <td v-for="col in columns" :key="col.key" class="p-4"><LoadingShimmer class="my-2" :class="col.key === 'actions' ? 'w-20 ml-auto' : 'w-3/4'" /></td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-if="paginatedItems.length === 0">
            <td :colspan="columns.length" class="p-8 text-center text-slate-500">
              Nenhum registro encontrado.
            </td>
          </tr>
          <tr 
            v-for="item in paginatedItems" 
            :key="item.id || Math.random()" 
            class="border-b border-slate-100 hover:bg-slate-50"
          >
            <td 
              v-for="col in columns" 
              :key="col.key" 
              class="p-4"
              :class="{'text-center': col.align === 'center', 'text-right': col.align === 'right'}"
            >
              <slot :name="`cell(${col.key})`" :item="item" :value="item[col.key]">
                <!-- Fallback se não houver slot -->
                <span class="text-slate-600 text-sm">{{ item[col.key] }}</span>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer: Pagination -->
    <div v-if="!loading" class="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-600">
      <div>
        Mostrando {{ paginatedItems.length === 0 ? 0 : (currentPage - 1) * perPage + 1 }} a {{ Math.min(currentPage * perPage, filteredItems.length) }} de {{ filteredItems.length }} registros
      </div>
      <div class="flex space-x-1">
        <button 
          @click="prevPage" 
          :disabled="currentPage === 1"
          class="px-3 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        <button 
          @click="nextPage" 
          :disabled="currentPage === totalPages"
          class="px-3 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Próxima
        </button>
      </div>
    </div>
  </div>
</template>
