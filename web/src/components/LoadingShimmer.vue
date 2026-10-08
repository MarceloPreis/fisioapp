<template><div aria-hidden="true" class="shimmer h-4 rounded bg-slate-200" /></template>
<style scoped>
.shimmer { position: relative; overflow: hidden; }
.shimmer::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgb(255 255 255 / 75%), transparent); transform: translateX(-100%); animation: shimmer 1.5s infinite; }
@keyframes shimmer { to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) { .shimmer::after { animation: none; } }
</style>
