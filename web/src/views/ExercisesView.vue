<script setup lang="ts">
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'
import MainLayout from '../layouts/MainLayout.vue'
import DataTable from '../components/DataTable.vue'
import AppButton from '../components/AppButton.vue'
import api from '../utils/axios'
import { useFeedback } from '../composables/useFeedback'
const { toast, confirm } = useFeedback()

interface Category {
  id: string
  name: string
}

interface ExerciseRule {
  id?: string
  jointA: string
  jointB: string
  jointC: string
  conditionOperator: string
  targetAngle: number
  validationPlane: string
  feedbackMessage: string
}

interface ExerciseCountRule {
  id?: string
  jointA: string
  jointB: string
  jointC: string
  angleMin: number
  angleMax: number
  validationPlane: string
}

interface Exercise {
  id: string
  title: string
  description: string
  categoryId: string
  category?: Category
  videoUrl: string
  rules?: ExerciseRule[]
  countRules?: ExerciseCountRule[]
}

const exercises = ref<Exercise[]>([])
const categories = ref<Category[]>([])
const isModalOpen = ref(false)
const isLoading = ref(false)
const currentExercise = ref<Partial<Exercise>>({ 
  title: '', description: '', categoryId: '', videoUrl: '', rules: [], countRules: []
})

const availableJoints = [
  { id: 'LEFT_SHOULDER', name: 'Ombro Esq' },
  { id: 'RIGHT_SHOULDER', name: 'Ombro Dir' },
  { id: 'LEFT_ELBOW', name: 'Cotovelo Esq' },
  { id: 'RIGHT_ELBOW', name: 'Cotovelo Dir' },
  { id: 'LEFT_WRIST', name: 'Pulso Esq' },
  { id: 'RIGHT_WRIST', name: 'Pulso Dir' },
  { id: 'LEFT_HIP', name: 'Quadril Esq' },
  { id: 'RIGHT_HIP', name: 'Quadril Dir' },
  { id: 'LEFT_KNEE', name: 'Joelho Esq' },
  { id: 'RIGHT_KNEE', name: 'Joelho Dir' },
  { id: 'LEFT_ANKLE', name: 'Tornozelo Esq' },
  { id: 'RIGHT_ANKLE', name: 'Tornozelo Dir' },
]

const listLoading = ref(false)

const fetchData = async () => {
  if (listLoading.value) return
  listLoading.value = true
  try {
    const [exRes, catRes] = await Promise.all([
      api.get('/exercises'),
      api.get('/categories')
    ])
    exercises.value = exRes.data
    categories.value = catRes.data
  } catch (error) {
    toast.error('Não foi possível carregar exercícios. Tente recarregar.')
  } finally {
    listLoading.value = false
  }
}

const openModal = (exercise?: Exercise) => {
  if (exercise) {
    // Copia profunda para não alterar a tabela antes de salvar
    currentExercise.value = JSON.parse(JSON.stringify(exercise))
    if (!currentExercise.value.rules) currentExercise.value.rules = []
    if (!currentExercise.value.countRules) currentExercise.value.countRules = []
  } else {
    currentExercise.value = { 
      title: '', description: '', categoryId: '', videoUrl: '', rules: [], countRules: []
    }
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  currentExercise.value = {}
}

const addRule = () => {
  if (!currentExercise.value.rules) currentExercise.value.rules = []
  currentExercise.value.rules.push({
    jointA: 'LEFT_SHOULDER',
    jointB: 'LEFT_ELBOW',
    jointC: 'LEFT_WRIST',
    conditionOperator: 'GREATER_THAN',
    targetAngle: 90,
    validationPlane: 'ABSOLUTE',
    feedbackMessage: ''
  })
}

const removeRule = (index: number) => {
  currentExercise.value.rules?.splice(index, 1)
}

const mirrorRule = (index: number) => {
  if (!currentExercise.value.rules) return
  
  const original = currentExercise.value.rules[index]
  
  const swapSide = (joint: string) => {
    if (joint.startsWith('LEFT_')) return joint.replace('LEFT_', 'RIGHT_')
    if (joint.startsWith('RIGHT_')) return joint.replace('RIGHT_', 'LEFT_')
    return joint
  }

  const mirroredRule = {
    ...original,
    id: undefined, // Impede que o clone tenha o mesmo ID da regra original
    jointA: swapSide(original.jointA),
    jointB: swapSide(original.jointB),
    jointC: swapSide(original.jointC),
  }

  currentExercise.value.rules.push(mirroredRule)
}

const addCountRule = () => {
  if (!currentExercise.value.countRules) currentExercise.value.countRules = []
  currentExercise.value.countRules.push({
    jointA: 'LEFT_HIP',
    jointB: 'LEFT_KNEE',
    jointC: 'LEFT_ANKLE',
    angleMin: 90,
    angleMax: 170,
    validationPlane: 'ABSOLUTE'
  })
}

const removeCountRule = (index: number) => {
  currentExercise.value.countRules?.splice(index, 1)
}

const mirrorCountRule = (index: number) => {
  if (!currentExercise.value.countRules) return
  
  const original = currentExercise.value.countRules[index]
  
  const swapSide = (joint: string) => {
    if (joint.startsWith('LEFT_')) return joint.replace('LEFT_', 'RIGHT_')
    if (joint.startsWith('RIGHT_')) return joint.replace('RIGHT_', 'LEFT_')
    return joint
  }

  const mirroredRule = {
    ...original,
    id: undefined,
    jointA: swapSide(original.jointA),
    jointB: swapSide(original.jointB),
    jointC: swapSide(original.jointC),
  }

  currentExercise.value.countRules.push(mirroredRule)
}

const saveExercise = async () => {
  isLoading.value = true
  try {
    const { title, description, videoUrl, categoryId, rules, countRules } = currentExercise.value
    const payload = { title, description, videoUrl, categoryId, rules: rules?.map(({ jointA, jointB, jointC, conditionOperator, targetAngle, validationPlane, feedbackMessage }) => ({ jointA, jointB, jointC, conditionOperator, targetAngle, validationPlane, feedbackMessage })), countRules: countRules?.map(({ jointA, jointB, jointC, angleMin, angleMax, validationPlane }) => ({ jointA, jointB, jointC, angleMin, angleMax, validationPlane })) }
    if (!payload.categoryId) payload.categoryId = undefined

    if (currentExercise.value.id) {
      await api.put(`/exercises/${currentExercise.value.id}`, payload)
    } else {
      await api.post('/exercises', payload)
    }
    await fetchData()
    closeModal()
  } catch (error) {
    console.error('Erro ao salvar exercício:')
    toast.error('Erro ao salvar o exercício.')
  } finally {
    isLoading.value = false
  }
}

const deleteExercise = async (id: string) => {
  if (!(await confirm({ title: 'Excluir exercício?', message: 'Deseja realmente excluir este exercício?', confirmLabel: 'Excluir', tone: 'danger' }))) return
  try {
    await api.delete(`/exercises/${id}`)
    await fetchData()
  } catch (error) {
    console.error('Erro ao deletar exercício:')
    toast.error('Não foi possível excluir o exercício. Tente novamente.')
  }
}

onMounted(() => {
  console.log('ExercisesView montado - Versão com Múltiplas Regras de Contagem ativa!');
  fetchData();
})
</script>

<template>
  <MainLayout>
    <template #title>Biblioteca de Exercícios</template>
    
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <p class="text-slate-500 text-sm">Gerencie a base de exercícios e suas regras de inteligência artificial.</p>
      <div class="flex flex-wrap gap-3 items-center w-full sm:w-auto">
        <AppButton to="/categories">
          <span>Categorias de Exercícios</span>
        </AppButton>
        <AppButton 
          variant="primary"
          type="button"
          @click="openModal()"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>Novo Exercício</span>
        </AppButton>
      </div>
    </div>

    <!-- Tabela de Exercícios usando DataTable -->
    <DataTable
      :loading="listLoading"
      @reload="fetchData"
      :items="exercises"
      :columns="[
        { key: 'title', label: 'Título' },
        { key: 'category', label: 'Categoria' },
        { key: 'rules', label: 'Regras IA', align: 'center' },
        { key: 'actions', label: 'Ações', align: 'right' }
      ]"
      :search-fields="['title']"
      search-placeholder="Buscar exercícios..."
    >
      <template #cell(category)="{ item }">
        <span class="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium border border-slate-200">
          {{ item.category?.name || 'Geral' }}
        </span>
      </template>

      <template #cell(rules)="{ item }">
        <span class="bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded text-xs">
          {{ item.rules?.length || 0 }}
        </span>
      </template>

      <template #cell(actions)="{ item }">
        <div class="flex flex-wrap justify-end gap-2">
          <button @click="openModal(item)" class="action-button action-button-primary" aria-label="Editar" title="Editar"><Pencil class="h-4 w-4" aria-hidden="true" /></button>
          <button @click="deleteExercise(item.id)" class="action-button action-button-danger" aria-label="Excluir" title="Excluir"><Trash2 class="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </template>
    </DataTable>

    <!-- Modal de Cadastro/Edição -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-lg w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 class="text-lg font-semibold text-slate-800">{{ currentExercise.id ? 'Editar Exercício' : 'Novo Exercício' }}</h3>
          <button @click="closeModal" class="text-slate-400 hover:text-slate-600">&times;</button>
        </div>
        
        <form @submit.prevent="saveExercise" class="p-6 space-y-4 overflow-y-auto">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Título do Exercício</label>
            <input v-model="currentExercise.title" type="text" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 outline-none" placeholder="Ex: Elevação Lateral">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
            <select v-model="currentExercise.categoryId" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 outline-none bg-white">
              <option value="">Geral / Nenhuma</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Descrição / Instruções</label>
            <textarea v-model="currentExercise.description" rows="2" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 outline-none" placeholder="Descreva como executar..."></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Link do Vídeo (YouTube)</label>
            <input v-model="currentExercise.videoUrl" type="url" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 outline-none" placeholder="Ex: https://www.youtube.com/watch?v=...">
          </div>
          
          <!-- Regras Biomecânicas -->
          <div class="border-t border-slate-200 pt-4 mt-4">
            <div class="flex justify-between items-center mb-3">
              <div>
                <label class="block text-sm font-semibold text-slate-800">Regras de Visão Computacional (IA)</label>
                <p class="text-xs text-slate-500">Mapeamento de ângulos para correção em tempo real.</p>
              </div>
              <button type="button" @click="addRule" class="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded font-bold hover:bg-indigo-100 transition">
                + Adicionar Regra
              </button>
            </div>

            <div v-if="!currentExercise.rules?.length" class="text-xs text-slate-500 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              Nenhuma regra definida. A IA apenas gravará o vídeo.
            </div>

            <div v-for="(rule, index) in currentExercise.rules" :key="index" class="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 mb-3 relative group">
              <div class="absolute top-2 right-2 flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" @click="mirrorRule(index)" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold" title="Espelhar Regra (Inverter Lados)">🔄 Espelhar</button>
                <button type="button" @click="removeRule(index)" class="text-xs text-red-500 hover:text-red-700 font-bold" title="Remover Regra">Excluir &times;</button>
              </div>
              
              <div class="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ponto A</label>
                  <select v-model="rule.jointA" required class="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
                    <option v-for="j in availableJoints" :key="j.id" :value="j.id">{{ j.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Vértice (B)</label>
                  <select v-model="rule.jointB" required class="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
                    <option v-for="j in availableJoints" :key="j.id" :value="j.id">{{ j.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ponto C</label>
                  <select v-model="rule.jointC" required class="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
                    <option v-for="j in availableJoints" :key="j.id" :value="j.id">{{ j.name }}</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Condição de Erro</label>
                  <select v-model="rule.conditionOperator" required class="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
                    <option value="GREATER_THAN">For Maior que (>)</option>
                    <option value="LESS_THAN">For Menor que (<)</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ângulo (Graus)</label>
                  <input v-model.number="rule.targetAngle" type="number" step="0.1" required class="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Ex: 90">
                </div>
              </div>

              <div class="mb-3">
                <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Eixo/Plano de Validação</label>
                <select v-model="rule.validationPlane" required class="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
                  <option value="ABSOLUTE">Espaço 3D Absoluto (Qualquer Direção)</option>
                  <option value="FRONTAL">Plano Frontal (X-Y / Câmera de Frente)</option>
                  <option value="SAGITTAL">Plano Sagital (Y-Z / Câmera Lateral)</option>
                  <option value="TRANSVERSE">Plano Transversal (X-Z / Visto de Cima)</option>
                </select>
              </div>

              <div>
                <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Mensagem de Correção (Feedback)</label>
                <input v-model="rule.feedbackMessage" type="text" required placeholder="Ex: Não passe o cotovelo da linha do ombro" class="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none">
              </div>
            </div>
          </div>
          
          <!-- Configuração de Contagem de Repetições -->
          <div class="border-t border-slate-200 pt-4 mt-4">
            <div class="flex justify-between items-center mb-3">
              <div>
                <label class="block text-sm font-semibold text-slate-800">Métrica de Contagem (Repetições)</label>
                <p class="text-xs text-slate-500">Defina os gatilhos para que o aplicativo conte as repetições automaticamente.</p>
              </div>
              <button type="button" @click="addCountRule" class="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded font-bold hover:bg-emerald-100 transition">
                + Adicionar Métrica
              </button>
            </div>
            
            <div v-if="!currentExercise.countRules?.length" class="text-xs text-slate-500 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              Nenhuma métrica de contagem configurada. O exercício será cronometrado por tempo.
            </div>

            <div v-for="(countRule, index) in currentExercise.countRules" :key="index" class="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 mb-3 relative group">
              <div class="absolute top-2 right-2 flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" @click="mirrorCountRule(index)" class="text-xs text-emerald-600 hover:text-emerald-800 font-bold" title="Espelhar Métrica">🔄 Espelhar</button>
                <button type="button" @click="removeCountRule(index)" class="text-xs text-red-500 hover:text-red-700 font-bold" title="Remover Métrica">Excluir &times;</button>
              </div>
              
              <div class="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ponto A</label>
                  <select v-model="countRule.jointA" required class="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none bg-white">
                    <option v-for="j in availableJoints" :key="j.id" :value="j.id">{{ j.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Vértice (B)</label>
                  <select v-model="countRule.jointB" required class="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none bg-white">
                    <option v-for="j in availableJoints" :key="j.id" :value="j.id">{{ j.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ponto C</label>
                  <select v-model="countRule.jointC" required class="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none bg-white">
                    <option v-for="j in availableJoints" :key="j.id" :value="j.id">{{ j.name }}</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ângulo Mínimo (Graus)</label>
                  <input v-model.number="countRule.angleMin" type="number" step="0.1" required class="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Ex: 45">
                </div>
                <div>
                  <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ângulo Máximo (Graus)</label>
                  <input v-model.number="countRule.angleMax" type="number" step="0.1" required class="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Ex: 170">
                </div>
              </div>

              <div>
                <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Eixo/Plano de Validação</label>
                <select v-model="countRule.validationPlane" required class="w-full text-sm px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none bg-white">
                  <option value="ABSOLUTE">Espaço 3D Absoluto (Qualquer Direção)</option>
                  <option value="FRONTAL">Plano Frontal (X-Y / Câmera de Frente)</option>
                  <option value="SAGITTAL">Plano Sagital (Y-Z / Câmera Lateral)</option>
                  <option value="TRANSVERSE">Plano Transversal (X-Z / Visto de Cima)</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="pt-4 flex justify-end space-x-3 shrink-0 border-t border-slate-200">
            <button type="button" @click="closeModal" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition">Cancelar</button>
            <button type="submit" :disabled="isLoading" class="px-4 py-2 bg-blue-800 text-white rounded-lg font-medium hover:bg-blue-900 disabled:opacity-70 transition shadow-sm">
              {{ isLoading ? 'Salvando...' : 'Salvar Exercício' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </MainLayout>
</template>
