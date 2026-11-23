import { useId, useState } from 'react'
import { cx } from '../lib/format'

function smooth(pts: [number, number][]) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1] ?? pts[i]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const [x3, y3] = pts[i + 2] ?? pts[i + 1]
    const t = 0.18
    d += ` C ${x1 + (x2 - x0) * t} ${y1 + (y2 - y0) * t}, ${x2 - (x3 - x1) * t} ${y2 - (y3 - y1) * t}, ${x2} ${y2}`
  }
  return d
}

export function Sparkline({ data, color = 'var(--accent)', height = 36, className }: { data: number[]; color?: string; height?: number; className?: string }) {
  const id = useId()
  const w = 120
  const max = Math.max(...data)
  const min = Math.min(...data)
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, height - 3 - ((v - min) / (max - min || 1)) * (height - 6)] as [number, number])
  const line = smooth(pts)
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cx('w-full', className)} style={{ height }}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L ${w} ${height} L 0 ${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function AreaChart({ series, labels, height = 260, stacked = false, unit = '' }: { series: { name: string; color: string; data: number[] }[]; labels: string[]; height?: number; stacked?: boolean; unit?: string }) {
  const uid = useId()
  const [hover, setHover] = useState<number | null>(null)
  const W = 720
  const H = height
  const pad = { l: 34, r: 12, t: 12, b: 28 }
  const n = labels.length
  const stacks = series.map((_, si) => labels.map((_, i) => (stacked ? series.slice(0, si + 1).reduce((a, s) => a + s.data[i], 0) : series[si].data[i])))
  const max = Math.ceil(Math.max(...stacks.flat()) / 10) * 10 || 10
  const x = (i: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t))
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`${uid}-${i}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={stacked ? 0.55 : 0.22} />
              <stop offset="100%" stopColor={s.color} stopOpacity={stacked ? 0.25 : 0} />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--ink-3)">{t}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % 2 === 0 || n < 8 ? <text key={l} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ink-3)">{l}</text> : null))}
        {[...series].map((s, si) => {
          const top = stacks[si].map((v, i) => [x(i), y(v)] as [number, number])
          const bottom = stacked && si > 0 ? stacks[si - 1].map((v, i) => [x(i), y(v)] as [number, number]).reverse() : null
          const line = smooth(top)
          const area = bottom ? `${line} L ${bottom[0][0]} ${bottom[0][1]} ${smooth(bottom).slice(1)} Z` : `${line} L ${x(n - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`
          return (
            <g key={s.name}>
              <path d={area} fill={`url(#${uid}-${si})`} />
              <path d={line} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" />
            </g>
          )
        })}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--ink-3)" strokeDasharray="3 3" />
            {series.map((s, si) => (
              <circle key={s.name} cx={x(hover)} cy={y(stacks[si][hover])} r="4.5" fill="var(--surface)" stroke={s.color} strokeWidth="2.5" />
            ))}
          </g>
        )}
        {labels.map((_, i) => (
          <rect key={i} x={x(i) - (W - pad.l - pad.r) / (n - 1) / 2} y={0} width={(W - pad.l - pad.r) / (n - 1)} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {hover !== null && (
        <div className="glass-strong pointer-events-none absolute top-2 z-10 min-w-[150px] rounded-xl p-3 text-xs shadow-float ring-1 ring-line" style={{ left: `clamp(0px, calc(${(x(hover) / W) * 100}% - 75px), calc(100% - 160px))` }}>
          <div className="mb-1.5 font-semibold">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 text-ink-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
              <span className="font-semibold tabular">
                {s.data[hover]}
                {unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function BarChart({ data, labels, color = 'var(--accent)', height = 220, target, unit = '', highlightLast = true }: { data: number[]; labels: string[]; color?: string; height?: number; target?: number; unit?: string; highlightLast?: boolean }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 720
  const H = height
  const pad = { l: 34, r: 8, t: 14, b: 26 }
  const max = Math.ceil(Math.max(...data, target ?? 0) / 10) * 10 + 10
  const bw = (W - pad.l - pad.r) / data.length
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(max * t)} y2={y(max * t)} stroke="var(--line)" />
          <text x={pad.l - 8} y={y(max * t) + 4} textAnchor="end" fontSize="10" fill="var(--ink-3)">{Math.round(max * t)}</text>
        </g>
      ))}
      {data.map((v, i) => {
        const x = pad.l + i * bw + bw * 0.2
        const active = hover === i || (hover === null && highlightLast && i === data.length - 1)
        return (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <rect x={pad.l + i * bw} y={0} width={bw} height={H} fill="transparent" />
            <rect x={x} y={y(v)} width={bw * 0.6} height={Math.max(0, y(0) - y(v))} rx={Math.min(7, bw * 0.2)} fill={color} opacity={active ? 1 : 0.35} className="transition-opacity" />
            {active && (
              <text x={x + bw * 0.3} y={y(v) - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink)">
                {v}
                {unit}
              </text>
            )}
            {(i % 2 === 0 || data.length < 8) && <text x={x + bw * 0.3} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ink-3)">{labels[i]}</text>}
          </g>
        )
      })}
      {target !== undefined && (
        <g>
          <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} stroke="var(--danger)" strokeDasharray="5 4" strokeWidth="1.5" />
          <text x={W - pad.r} y={y(target) - 5} textAnchor="end" fontSize="10" fontWeight="600" fill="var(--danger)">Target {target}{unit}</text>
        </g>
      )}
    </svg>
  )
}

export function Donut({ data, size = 180, thickness = 22, center }: { data: { label: string; value: number; color: string }[]; size?: number; thickness?: number; center?: { value: string; label: string } }) {
  const [hover, setHover] = useState<number | null>(null)
  const total = data.reduce((a, d) => a + d.value, 0) || 1
  const r = (size - thickness) / 2
  const C = 2 * Math.PI * r
  let acc = 0
  const gap = 3
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" onMouseLeave={() => setHover(null)}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const len = (d.value / total) * C
          const el = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={hover === i ? thickness + 6 : thickness}
              strokeDasharray={`${Math.max(0, len - gap)} ${C}`}
              strokeDashoffset={-acc}
              strokeLinecap="butt"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHover(i)}
            />
          )
          acc += len
          return el
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-[26px] font-bold tracking-tight tabular">{hover !== null ? data[hover].value : center?.value}</div>
        <div className="max-w-[90px] text-[11px] font-medium leading-tight text-ink-3">{hover !== null ? data[hover].label : center?.label}</div>
      </div>
    </div>
  )
}

export function HeatGrid({ grid }: { grid: number[][] }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {grid.map((row, d) => (
          <div key={d} className="mb-1 flex items-center gap-1">
            <span className="w-9 text-[11px] font-medium text-ink-3">{days[d]}</span>
            {row.map((v, h) => (
              <span key={h} title={`${days[d]} ${h}:00 · ${Math.round(v * 12)} reports`} className="h-5 flex-1 rounded-[5px]" style={{ background: `color-mix(in srgb, var(--accent) ${Math.round(8 + v * 88)}%, var(--surface-2))` }} />
            ))}
          </div>
        ))}
        <div className="mt-1 flex gap-1 pl-10 text-[10px] text-ink-3">
          {Array.from({ length: 24 }).map((_, h) => (
            <span key={h} className="flex-1 text-center">{h % 3 === 0 ? (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`) : ''}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
