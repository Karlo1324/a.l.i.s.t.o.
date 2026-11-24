import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Lock, X, type LucideIcon } from 'lucide-react'
import { Sparkline } from '../components/Charts'
import { Button, IconButton } from '../components/ui'
import type { Role } from '../data/meta'
import { cx } from '../lib/format'

export type Page = 'overview' | 'incidents' | 'verify' | 'assign' | 'tasks' | 'monitor' | 'analytics' | 'activity' | 'users' | 'settings'

export interface AdminSettings {
  aiEnabled: boolean
  aiThreshold: number
  dupRadius: number
  autoEscalate: boolean
}

export interface AdminCtxValue {
  role: Exclude<Role, 'resident'>
  page: Page
  param?: string
  go: (p: Page, param?: string) => void
  user: { name: string; first: string; title: string; email: string; responderId?: string }
  settings: AdminSettings
  setSettings: (s: Partial<AdminSettings>) => void
}

export const AdminCtx = createContext<AdminCtxValue | null>(null)
export const useAdmin = () => useContext(AdminCtx)!

export const WORKSPACE_USERS: Record<Exclude<Role, 'resident'>, AdminCtxValue['user']> = {
  official: { name: 'Local workspace', first: '', title: 'Official view', email: '' },
  responder: { name: 'Local workspace', first: '', title: 'Responder view', email: '' },
  admin: { name: 'Local workspace', first: '', title: 'Administrator view', email: '' },
}

export const ACCESS: Record<Exclude<Role, 'resident'>, Page[]> = {
  official: ['overview', 'incidents', 'verify', 'assign', 'tasks', 'monitor', 'analytics', 'activity', 'settings'],
  responder: ['overview', 'tasks', 'monitor', 'activity', 'settings'],
  admin: ['overview', 'incidents', 'monitor', 'analytics', 'activity', 'users', 'settings'],
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[13px] font-semibold text-ink-3">{eyebrow}</div>}
        <h1 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ title, subtitle, action, children, className, bodyClass, icon: Icon }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string; icon?: LucideIcon }) {
  return (
    <section className={cx('flex flex-col rounded-[22px] bg-surface shadow-card ring-1 ring-line', className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && <Icon size={18} className="shrink-0 text-ink-3" />}
            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-semibold tracking-tight">{title}</h2>
              {subtitle && <div className="truncate text-[13px] text-ink-3">{subtitle}</div>}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className={cx('min-h-0 flex-1', bodyClass ?? 'px-5 pb-5')}>{children}</div>
    </section>
  )
}

export function Kpi({ label, value, delta, good, icon: Icon, color, spark, onClick, suffix }: { label: string; value: ReactNode; delta?: string; good?: boolean; icon: LucideIcon; color: string; spark?: number[]; onClick?: () => void; suffix?: string }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={cx('group relative overflow-hidden rounded-[22px] bg-surface p-5 text-left shadow-card ring-1 ring-line', onClick && 'transition hover:-translate-y-0.5 hover:shadow-float')}>
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
          <Icon size={18} />
        </span>
        {delta && (
          <span className={cx('rounded-full px-2 py-0.5 text-[12px] font-semibold', good ? 'bg-[#22a06b]/12 text-[#1d8a5c] dark:text-[#4ad396]' : 'bg-danger-soft text-danger')}>{delta}</span>
        )}
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-[30px] leading-none font-bold tracking-tight tabular">{value}</span>
        {suffix && <span className="text-[15px] font-semibold text-ink-3">{suffix}</span>}
      </div>
      <div className="mt-1.5 text-[13px] font-medium text-ink-2">{label}</div>
      {spark && (
        <div className="mt-3 -mb-1">
          <Sparkline data={spark} color={color} height={32} />
        </div>
      )}
    </Tag>
  )
}

/** Lightweight dropdown select with popover. */
export function Select<T extends string>({ value, onChange, options, label, icon: Icon, className, align = 'left' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; color?: string }[]; label?: string; icon?: LucideIcon; className?: string; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])
  const cur = options.find((o) => o.value === value)
  return (
    <div ref={ref} className={cx('relative', className)}>
      <button onClick={() => setOpen(!open)} className={cx('flex h-9 w-full items-center gap-2 rounded-[11px] bg-surface px-3 text-[13px] font-medium ring-1 ring-line-2 transition hover:bg-surface-2', open && 'ring-2 ring-accent/50')}>
        {Icon && <Icon size={15} className="text-ink-3" />}
        {label && <span className="text-ink-3">{label}</span>}
        <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left font-semibold">
          {cur?.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cur.color }} />}
          {cur?.label}
        </span>
        <ChevronDown size={14} className={cx('text-ink-3 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className={cx('glass-strong absolute top-[calc(100%+6px)] z-50 max-h-72 min-w-full animate-pop overflow-y-auto rounded-[14px] p-1.5 shadow-pop', align === 'right' ? 'right-0' : 'left-0')}>
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className={cx('flex w-full items-center gap-2 rounded-[9px] px-2.5 py-2 text-left text-[13px] font-medium whitespace-nowrap transition', o.value === value ? 'bg-accent text-accent-ink' : 'hover:bg-surface-2')}
            >
              {o.color && <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />}
              <span className="flex-1">{o.label}</span>
              {o.value === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Menu({ trigger, items, align = 'right' }: { trigger: (open: () => void) => ReactNode; items: ({ label: string; icon?: LucideIcon; onClick: () => void; danger?: boolean } | 'sep')[]; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      {trigger(() => setOpen((o) => !o))}
      {open && (
        <div className={cx('glass-strong absolute top-[calc(100%+6px)] z-50 min-w-[200px] animate-pop rounded-[14px] p-1.5 shadow-pop', align === 'right' ? 'right-0' : 'left-0')}>
          {items.map((it, i) =>
            it === 'sep' ? (
              <div key={i} className="my-1 h-px bg-line-2" />
            ) : (
              <button
                key={it.label}
                onClick={() => {
                  it.onClick()
                  setOpen(false)
                }}
                className={cx('flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13px] font-medium transition hover:bg-surface-2', it.danger && 'text-danger')}
              >
                {it.icon && <it.icon size={15} className={it.danger ? '' : 'text-ink-3'} />}
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

export function Drawer({ open, onClose, children, width = 480, title }: { open: boolean; onClose: () => void; children: ReactNode; width?: number; title?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 animate-fade-in bg-[#060d1f]/25 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="absolute top-2 right-2 bottom-2 flex animate-slide-in flex-col overflow-hidden rounded-[26px] bg-surface shadow-pop" style={{ width: `min(${width}px, calc(100vw - 16px))` }}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</div>
          <IconButton icon={X} label="Close" size={32} onClick={onClose} className="bg-surface-2" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}

export function Restricted({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 text-ink-3">
        <Lock size={28} />
      </span>
      <h2 className="mt-5 text-[22px] font-bold">Restricted for your role</h2>
      <p className="mt-1 max-w-sm text-[15px] text-ink-2">Your current role doesn't have permission to view this page. Contact an administrator if you need access.</p>
      <Button className="mt-6" onClick={onBack}>
        Back to overview
      </Button>
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)} className={cx('relative -mb-px flex items-center gap-2 px-3 py-2.5 text-[14px] font-semibold transition', value === t.value ? 'text-ink' : 'text-ink-3 hover:text-ink-2')}>
          {t.label}
          {t.count !== undefined && <span className={cx('rounded-full px-1.5 py-px text-[11px] tabular', value === t.value ? 'bg-accent text-accent-ink' : 'bg-surface-3 text-ink-2')}>{t.count}</span>}
          {value === t.value && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-accent" />}
        </button>
      ))}
    </div>
  )
}

export function downloadCSV(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
