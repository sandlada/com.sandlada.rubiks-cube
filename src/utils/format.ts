/** Shared time / date formatting (pure). */

export function formatTime(ms: number): string {
  const tenthsTotal = Math.max(0, Math.round(ms / 100))
  const tenths = tenthsTotal % 10
  const seconds = Math.floor(tenthsTotal / 10) % 60
  const minutes = Math.floor(tenthsTotal / 600)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`
}

export function formatDate(ts: number, locale: string): string {
  return new Date(ts).toLocaleString(locale)
}
