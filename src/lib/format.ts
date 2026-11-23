export function timeAgo(d: Date | string) {
  const t = typeof d === 'string' ? new Date(d) : d
  const s = Math.max(0, (Date.now() - t.getTime()) / 1000)
  if (s < 45) return 'Just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.round(h / 24)
  if (days < 7) return `${days}d ago`
  return t.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export function fmtTime(d: Date | string) {
  const t = typeof d === 'string' ? new Date(d) : d
  return t.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
}

export function fmtDateTime(d: Date | string) {
  const t = typeof d === 'string' ? new Date(d) : d
  return t.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function fmtDate(d: Date | string) {
  const t = typeof d === 'string' ? new Date(d) : d
  return t.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
}

export const minsAgo = (m: number) => new Date(Date.now() - m * 60000)

export function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Magandang umaga'
  if (h < 18) return 'Magandang hapon'
  return 'Magandang gabi'
}

export function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(' ')
}

export function distanceLabel(ax: number, ay: number, bx: number, by: number) {
  // Map is roughly 1.6 km wide, so 1 unit ~ 16 m.
  const d = Math.hypot(ax - bx, (ay - by) * 0.7) * 16
  return d < 1000 ? `${Math.round(d / 10) * 10} m` : `${(d / 1000).toFixed(1)} km`
}
