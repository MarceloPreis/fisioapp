<script setup lang="ts">
import { useId } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string | null | undefined
  label?: string
  hideLabel?: boolean
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  rows?: number
}>(), {
  required: false,
  disabled: false,
  rows: 3
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const id = useId()
</script>

<template>
  <div class="relative min-w-0">
    <label v-if="label" :for="id" :class="hideLabel ? 'sr-only' : 'mb-2 block text-base font-medium text-slate-900'">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>
    <div class="relative">
      <textarea
        :id="id"
        :value="modelValue"
        :rows="rows"
        :disabled="disabled"
        :required="required"
        :placeholder="placeholder"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${id}-error` : undefined"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        class="flex w-full items-center rounded-lg border bg-white p-3 text-base text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        :class="error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-300'"
      ></textarea>
    </div>
    <p v-if="error" :id="`${id}-error`" class="mt-1 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
