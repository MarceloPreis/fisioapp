<script setup lang="ts">
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'
import MainLayout from '../layouts/MainLayout.vue'
import DataTable from '../components/DataTable.vue'
import AppButton from '../components/AppButton.vue'
import api from '../utils/axios'
import { useFeedback } from '../composables/useFeedback'
const { toast } = useFeedback()

interface Category {
  id: string
  name: string
}

const categories = ref<Category[]>([])
const isModalOpen = ref(false)
const isLoading = ref(false)
const currentCategory = ref<Partial<Category>>({ name: '' })

const listLoading = ref(false)

const fetchCategories = async () => {
  if (listLoading.value) return
  listLoading.value = true
  try {
    const response = await api.get('/categories')
    categories.value = response.data
  } catch (error) {
    toast.error('Não foi possível carregar categorias. Tente recarregar.')
  } finally {
    listLoading.value = false
  }
}

const openModal = (category?: Category) => {
  if (category) {
    currentCategory.value = { ...category }
  } else {
    currentCategory.value = { name: '' }
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  currentCategory.value = {}
}

const saveCategory = async () => {
  isLoading.value = true
  try {
    if (currentCategory.value.id) {
      await api.put(`/categories/${currentCategory.value.id}`, { name: currentCategory.value.name })
    } else {
      await api.post('/categories', { name: currentCategory.value.name })
    }
    await fetchCategories()
    closeModal()
  } catch (error) {
    console.error('Erro ao salvar categoria:')
    alert('Erro ao salvar a categoria. O nome pode já existir.')
  } finally {
    isLoading.value = false
  }
}

const deleteCategory = async (id: string) => {
  if (!confirm('Deseja realmente excluir esta categoria?')) return
  try {
    await api.delete(`/categories/${id}`)
    await fetchCategories()
  } catch (error) {
    console.error('Erro ao deletar categoria:')
  }
}

onMounted(fetchCategories)
</script>

<template>
  <MainLayout>
    <template #title>Categorias de Exercícios</template>
    
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <p class="text-slate-500 text-sm">Gerencie os grupos e classificações para os exercícios.</p>
      <div class="flex flex-wrap gap-3 items-center w-full sm:w-auto">
        <AppButton to="/exercises">
          <ArrowLeft class="h-4 w-4" aria-hidden="true" />
          <span>Biblioteca de Exercícios</span>
        </AppButton>
        <AppButton 
          variant="primary"
          type="button"
          @click="openModal()"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>Nova Categoria</span>
        </AppButton>
      </div>
    </div>

    <!-- Tabela de Categorias usando DataTable -->
    <DataTable
      :loading="listLoading"
      @reload="fetchCategories"
      :items="categories"
      :columns="[
        { key: 'name', label: 'Nome da Categoria' },
        { key: 'actions', label: 'Ações', align: 'right' }
      ]"
      :search-fields="['name']"
      search-placeholder="Buscar categorias..."
    >
      <template #cell(actions)="{ item }">
        <div class="flex flex-wrap justify-end gap-2">
          <button @click="openModal(item)" class="action-button action-button-primary" aria-label="Editar" title="Editar"><Pencil class="h-4 w-4" aria-hidden="true" /></button>
          <button @click="deleteCategory(item.id)" class="action-button action-button-danger" aria-label="Excluir" title="Excluir"><Trash2 class="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </template>
    </DataTable>

    <!-- Modal de Cadastro/Edição -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-slate-800">{{ currentCategory.id ? 'Editar Categoria' : 'Nova Categoria' }}</h3>
          <button @click="closeModal" class="text-slate-400 hover:text-slate-600">&times;</button>
        </div>
        <form @submit.prevent="saveCategory" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Nome da Categoria</label>
            <input v-model="currentCategory.name" type="text" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 outline-none" placeholder="Ex: Alongamento, Fortalecimento">
          </div>
          <div class="pt-4 flex justify-end space-x-3">
            <button type="button" @click="closeModal" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
            <button type="submit" :disabled="isLoading" class="px-4 py-2 bg-blue-800 text-white rounded-lg font-medium hover:bg-blue-900 disabled:opacity-70">
              {{ isLoading ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </MainLayout>
</template>
