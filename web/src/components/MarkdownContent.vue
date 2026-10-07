<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
const props = defineProps<{ content: string }>()
// Text-only clinical reports: never load embedded media or tracking resources.
const html = computed(() => DOMPurify.sanitize(marked.parse(props.content, { async: false }), {
  ALLOWED_TAGS: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'del', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
  ALLOWED_ATTR: [],
}))
</script>
<template><div class="markdown-content break-words text-base text-slate-800" v-html="html" /></template>
<style scoped>
.markdown-content :deep(p), .markdown-content :deep(ul), .markdown-content :deep(ol), .markdown-content :deep(blockquote), .markdown-content :deep(pre) { margin: .75rem 0; }
.markdown-content :deep(h1), .markdown-content :deep(h2), .markdown-content :deep(h3), .markdown-content :deep(h4), .markdown-content :deep(h5), .markdown-content :deep(h6) { margin: 1rem 0 .5rem; font-weight: 700; line-height: 1.4; }
.markdown-content :deep(h1) { font-size: 1.5rem; }
.markdown-content :deep(h2) { font-size: 1.25rem; }
.markdown-content :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.markdown-content :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.markdown-content :deep(blockquote) { border-left: 3px solid #0d9488; padding-left: 1rem; color: #475569; }
.markdown-content :deep(pre) { overflow-x: auto; padding: 1rem; background: #f1f5f9; border-radius: .5rem; white-space: pre-wrap; }
.markdown-content :deep(code) { background: #f1f5f9; padding: .1rem .25rem; }
.markdown-content :deep(table) { display: block; overflow-x: auto; border-collapse: collapse; }
.markdown-content :deep(td), .markdown-content :deep(th) { border: 1px solid #cbd5e1; padding: .5rem; }
</style>
