/**
 * Helpers de apresentação para sessões e modelos fixos.
 * Centraliza rótulos em português para evitar jargão técnico na UI.
 */

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const
export const WEEKDAY_INITIAL = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const
export const WEEKDAY_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const

/** "Seg, Qua e Sex" — ordenado de domingo a sábado. */
export const formatRecurrence = (days?: number[] | null): string => {
  if (!days || days.length === 0) return 'Nenhum dia definido'
  if (days.length === 7) return 'Todos os dias'
  const names = [...days].sort((a, b) => a - b).map((d) => WEEKDAY_SHORT[d])
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  CONCLUIDO: 'Concluída',
}

export const sessionStatusLabel = (status: string): string => STATUS_LABELS[status] ?? status

/** Data efetiva da sessão: agendada, com fallback para a criação (sessões antigas). */
export const sessionDate = (s: { scheduledDate?: string | null; createdAt: string }): Date =>
  new Date(s.scheduledDate || s.createdAt)

const shortDateFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })

/** "qua., 08/10" */
export const formatShortDate = (d: Date): string => shortDateFmt.format(d)

/** YYYY-MM-DD no fuso local (evita o deslocamento de dia do toISOString). */
export const toLocalISODate = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Converte YYYY-MM-DD local para ISO ao meio-dia, protegendo contra troca de dia por fuso. */
export const localDateToISO = (date: string): string => new Date(`${date}T12:00:00`).toISOString()

export const formatTimestamp = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
