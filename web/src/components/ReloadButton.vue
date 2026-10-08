<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import AppButton from './AppButton.vue'
defineProps<{ loading?: boolean; disabled?: boolean }>()
defineEmits<{ reload: [] }>()
</script>
<template>
  <AppButton class="min-h-12" :disabled="loading || disabled" :aria-busy="loading" @click="$emit('reload')">
    <RefreshCw aria-hidden="true" :class="{ 'animate-spin motion-reduce:animate-none': loading }" />
    {{ loading ? 'Carregando...' : 'Recarregar' }}
  </AppButton>
</template>
