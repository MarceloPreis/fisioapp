<script setup lang="ts">
import { useId } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean | any[]
  value?: any
  label: string
  description?: string
  required?: boolean
  disabled?: boolean
  error?: string
}>(), {
  required: false,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean | any[]]
}>()

const id = useId()

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (Array.isArray(props.modelValue)) {
    const newValue = [...props.modelValue]
    if (target.checked) {
      newValue.push(props.value)
    } else {
      const idx = newValue.indexOf(props.value)
      if (idx > -1) newValue.splice(idx, 1)
    }
    emit('update:modelValue', newValue)
  } else {
    emit('update:modelValue', target.checked)
  }
}
</script>

<template>
  <div class="relative flex items-start">
    <div class="flex h-[24px] items-center">
      <input
        :id="id"
        type="checkbox"
        :disabled="disabled"
        :required="required"
        :checked="Array.isArray(modelValue) ? modelValue.includes(value) : modelValue"
        :aria-invalid="!!error"
        :aria-describedby="[description ? `${id}-desc` : undefined, error ? `${id}-error` : undefined].filter(Boolean).join(' ') || undefined"
        @change="handleChange"
        class="h-5 w-5 cursor-pointer rounded border-slate-300 text-blue-800 transition-colors focus:ring-2 focus:ring-blue-800 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :class="error ? 'border-red-500 text-red-600 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-800'"
      />
    </div>
    <div class="ml-3 text-base">
      <label :for="id" class="font-medium" :class="disabled ? 'text-slate-500 cursor-not-allowed' : 'text-slate-900 cursor-pointer'">
        {{ label }}<span v-if="required" aria-hidden="true"> *</span>
      </label>
      <p v-if="description" :id="`${id}-desc`" class="text-slate-500" :class="disabled ? 'opacity-50' : ''">{{ description }}</p>
      <p v-if="error" :id="`${id}-error`" class="mt-1 text-sm text-red-600">{{ error }}</p>
    </div>
  </div>
</template>
