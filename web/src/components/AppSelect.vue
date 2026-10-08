<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'

export interface SelectOption {
  value: string | number
  label: string
}

const props = withDefaults(defineProps<{
  modelValue: string | number
  options: SelectOption[]
  label?: string
  hideLabel?: boolean
  placeholder?: string
  required?: boolean
  disabled?: boolean
}>(), {
  label: 'Selecione',
  placeholder: 'Selecione uma opção',
  required: false,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const id = useId()
const button = ref<HTMLButtonElement | null>(null)
const open = ref(false)
const active = ref(-1)

const activeId = computed(() => active.value >= 0 && props.options[active.value] ? `${id}-option-${active.value}` : undefined)

const selectedOption = computed(() => props.options.find(o => o.value === props.modelValue))

const toggle = () => {
  if (props.disabled) return
  if (open.value) {
    close()
  } else {
    open.value = true
    active.value = props.options.findIndex(o => o.value === props.modelValue)
  }
}

const choose = (option: SelectOption) => {
  emit('update:modelValue', option.value)
  close()
  button.value?.focus()
}

const close = () => {
  open.value = false
  active.value = -1
}

const keydown = (event: KeyboardEvent) => {
  if (props.disabled) return

  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    button.value?.focus()
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) {
      open.value = true
      active.value = props.options.findIndex(o => o.value === props.modelValue)
      if (active.value < 0) active.value = 0
      return
    }
    if (!props.options.length) return
    
    if (active.value < 0) {
      active.value = event.key === 'ArrowDown' ? 0 : props.options.length - 1
    } else {
      const step = event.key === 'ArrowDown' ? 1 : -1
      active.value = (active.value + step + props.options.length) % props.options.length
    }
    
    void nextTick(() => {
      document.getElementById(activeId.value || '')?.scrollIntoView({ block: 'nearest' })
    })
  } else if (event.key === 'Enter' || (event.key === ' ' && !open.value)) {
    event.preventDefault()
    if (!open.value) {
      toggle()
    } else {
      if (active.value >= 0 && props.options[active.value]) {
        choose(props.options[active.value])
      }
    }
  } else if (event.key === ' ' && open.value) {
    // Prevent scrolling on space when open
    event.preventDefault()
  } else if (event.key === 'Tab' && open.value) {
    close()
  }
}

// Validity for required prop
watch([() => props.modelValue, () => props.required], () => {
  // Normally you'd setCustomValidity on a hidden input if this was a form submission,
  // but since it's a custom component, we handle it if needed. 
  // We can inject a hidden input to make standard form validation work.
}, { immediate: true })

</script>

<template>
  <div class="relative min-w-0" @focusout="event => { if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) close() }">
    <label :id="`${id}-label`" :class="hideLabel ? 'sr-only' : 'mb-2 block text-base font-medium text-slate-900'">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>
    
    <!-- Hidden input for native form validation -->
    <input 
      type="text" 
      class="sr-only" 
      aria-hidden="true" 
      tabindex="-1"
      :required="required" 
      :value="modelValue"
    />

    <button
      :id="id"
      ref="button"
      type="button"
      :disabled="disabled"
      :aria-labelledby="`${id}-label`"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="open ? `${id}-list` : undefined"
      :aria-activedescendant="activeId"
      class="flex min-h-[48px] w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-left text-base text-slate-900 outline-none focus-visible:border-blue-800 focus-visible:ring-2 focus-visible:ring-blue-100"
      :class="[
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50',
        !selectedOption ? 'text-slate-500' : ''
      ]"
      @click="toggle"
      @keydown="keydown"
    >
      <span class="block truncate">
        {{ selectedOption ? selectedOption.label : placeholder }}
      </span>
      <ChevronDown class="ml-3 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
    </button>

    <div v-if="open" class="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
      <ul 
        :id="`${id}-list`" 
        role="listbox" 
        :aria-labelledby="`${id}-label`" 
        class="max-h-64 overflow-y-auto"
      >
        <li 
          v-for="(option, index) in options" 
          :id="`${id}-option-${index}`" 
          :key="String(option.value)" 
          role="option" 
          :aria-selected="option.value === modelValue" 
          class="flex min-h-[48px] cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-base text-slate-900 hover:bg-blue-50" 
          :class="active === index ? 'bg-blue-50' : ''" 
          @mousedown.prevent 
          @click="choose(option)"
        >
          <span class="block truncate font-medium" :class="option.value === modelValue ? 'text-blue-900' : ''">
            {{ option.label }}
          </span>
          <Check v-if="option.value === modelValue" class="h-5 w-5 shrink-0 text-blue-800" aria-hidden="true" />
        </li>
      </ul>
      <p v-if="!options.length" class="min-h-[48px] px-3 py-3 text-base text-slate-600">Nenhuma opção disponível.</p>
    </div>
  </div>
</template>
