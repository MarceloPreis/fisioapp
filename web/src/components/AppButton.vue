<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    to?: string;
  }>(),
  {
    variant: 'secondary',
    type: 'button',
    disabled: false,
  },
);
</script>

<template>
  <RouterLink
    v-if="to"
    :to="to"
    class="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 shadow-xs cursor-pointer"
    :class="
      variant === 'primary'
        ? 'border-blue-800 bg-blue-800 text-white hover:border-blue-900 hover:bg-blue-900'
        : 'border-blue-200 bg-white text-blue-800 hover:border-blue-300 hover:bg-blue-50'
    "
  >
    <slot />
  </RouterLink>
  <button
    v-else
    :type="type"
    :disabled="disabled"
    class="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 shadow-xs cursor-pointer"
    :class="
      variant === 'primary'
        ? 'border-blue-800 bg-blue-800 text-white enabled:hover:border-blue-900 enabled:hover:bg-blue-900'
        : 'border-blue-200 bg-white text-blue-800 enabled:hover:border-blue-300 enabled:hover:bg-blue-50'
    "
  >
    <slot />
  </button>
</template>
