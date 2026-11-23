import { useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, CircleCheck, CircleExclamationPoint, Info, Search, Sparkles, X, type LucideIcon } from 'lucide-react'
import logoLight from '../assets/logo-light.png'
import logoDark from '../assets/logo-dark.png'
import { CATEGORIES, PRIORITIES, ROLES, STATUSES, type Category, type Priority, type Role, type Status } from '../data/meta'
import { cx } from '../lib/format'
import { useStore } from '../store'

/* ---------- Brand ---------- */

export function LogoMark({ size = 36, variant, className }: { size?: number; variant?: 'light' | 'dark'; className?: string }) {
  const { dark } = useStore()
  const v = variant ?? (dark ? 'dark' : 'light')
  return (
    <span
      className={cx('relative inline-block shrink-0 overflow-hidden', v === 'light' ? 'bg-white ring-1 ring-navy/10' : 'bg-[#0b1e45] ring-1 ring-white/10', className)}
      style={{ width: size, height: size, borderRadius: size * 0.26 }}
    >
      <img src={v === 'light' ? logoLight : logoDark} alt="A.L.I.S.T.O. logo" className="absolute inset-0 h-full w-full scale-[1.32] object-cover" draggable={false} />
    </span>
  )
}

export function Wordmark({ size = 36, sub = true, variant }: { size?: number; sub?: boolean; variant?: 'light' | 'dark' }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} variant={variant} />
      <div className="leading-none">
        <div className="text-[15px] font-bold tracking-[0.08em]">A.L.I.S.T.O.</div>
        {sub && <div className="mt-1 text-[11px] font-medium text-ink-3">Community operations</div>}
      </div>
    </div>
  )
}

/* ---------- Pills & badges ---------- */

const tint = (c: string, pct = 14) => `color-mix(in srgb, ${c} ${pct}%, transparent)`
const ink = (c: string) => `color-mix(in srgb, ${c} 78%, var(--ink))`

export function StatusPill({ status, size = 'md' }: { status: Status; size?: 'sm' | 'md' }) {
  const s = STATUSES[status]
  return (
    <span
      className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold', size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs')}
      style={{ background: tint(s.color), color: ink(s.color) }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

export function PriorityPill({ priority, size = 'md' }: { priority?: Priority; size?: 'sm' | 'md' }) {
  if (!priority) return <span className="text-xs text-ink-3">Unset</span>
  const p = PRIORITIES[priority]
  const bars = { critical: 4, high: 3, medium: 2, low: 1 }[priority]
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap font-semibold', size === 'sm' ? 'text-[11px]' : 'text-xs')} style={{ color: ink(p.color) }}>
      <span className="flex items-end gap-[2px]">
        {[1, 2, 3, 4].map((b) => (
          <span key={b} className="w-[3px] rounded-full" style={{ height: 4 + b * 2, background: b <= bars ? p.color : 'var(--line-2)' }} />
        ))}
      </span>
      {p.label}
    </span>
  )
}

export function RolePill({ role }: { role: Role }) {
  const r = ROLES[role]
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: tint(r.color, 12), color: ink(r.color) }}>
      {r.label}
    </span>
  )
}

export function CategoryIcon({ category, size = 40, rounded = 'xl', solid = false }: { category: Category; size?: number; rounded?: 'xl' | 'full'; solid?: boolean }) {
  const c = CATEGORIES[category]
  const Icon = c.icon
  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center', rounded === 'full' ? 'rounded-full' : '')}
      style={{ width: size, height: size, borderRadius: rounded === 'xl' ? size * 0.3 : undefined, background: solid ? c.color : tint(c.color, 15), color: solid ? '#fff' : c.color }}
    >
      <Icon size={size * 0.5} strokeWidth={2} />
    </span>
  )
}

export function CategoryTag({ category }: { category: Category }) {
  const c = CATEGORIES[category]
  const Icon = c.icon
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-ink-2">
      <Icon size={14} style={{ color: c.color }} />
      {c.label}
    </span>
  )
}

export function AIBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#7c5cff]/14 to-[#3b6ef0]/14 px-2 py-0.5 text-[11px] font-semibold text-[#6a4cf0] dark:text-[#b4a4ff]">
      <Sparkles size={12} />
      {compact ? 'AI suggestion' : 'AI suggestion · needs human verification'}
    </span>
  )
}

export function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && <span className="absolute inset-0 animate-pulse-ring rounded-full" style={{ background: color }} />}
      <span className="relative h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  )
}

/* ---------- Buttons ---------- */

type BtnVariant = 'primary' | 'secondary' | 'tinted' | 'ghost' | 'danger' | 'danger-tinted' | 'plain'
export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; icon?: LucideIcon; iconRight?: LucideIcon; loading?: boolean }) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-accent text-accent-ink hover:brightness-110 shadow-[0_1px_2px_rgba(11,30,69,.15),inset_0_1px_0_rgba(255,255,255,.18)]',
    secondary: 'bg-surface text-ink ring-1 ring-line-2 hover:bg-surface-2',
    tinted: 'bg-accent-soft text-accent hover:brightness-[.97] dark:hover:brightness-125',
    ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
    danger: 'bg-danger text-white hover:brightness-110',
    'danger-tinted': 'bg-danger-soft text-danger hover:brightness-[.97] dark:hover:brightness-125',
    plain: 'text-accent hover:opacity-80',
  }
  const s = { sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[10px]', md: 'h-10 px-4 text-sm gap-2 rounded-xl', lg: 'h-[52px] px-5 text-[17px] gap-2 rounded-2xl' }[size]
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx('inline-flex select-none items-center justify-center font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-45 disabled:active:scale-100', v[variant], s, className)}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : Icon && <Icon size={size === 'lg' ? 20 : size === 'sm' ? 15 : 17} strokeWidth={2.2} />}
      {children}
      {IconRight && <IconRight size={size === 'lg' ? 20 : 16} strokeWidth={2.2} />}
    </button>
  )
}

export function IconButton({ icon: Icon, label, badge, className, size = 40, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; badge?: number | boolean; size?: number }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cx('relative inline-flex shrink-0 items-center justify-center rounded-full text-ink-2 transition hover:bg-surface-2 hover:text-ink active:scale-95', className)}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.48)} strokeWidth={2} />
      {badge ? (
        <span className="absolute right-1 top-1 flex min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-[var(--surface)]">
          {typeof badge === 'number' ? badge : ''}
        </span>
      ) : null}
    </button>
  )
}

/* ---------- Surfaces ---------- */

export function Card({ className, children, onClick, padded = true }: { className?: string; children: ReactNode; onClick?: () => void; padded?: boolean }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={cx('block rounded-[22px] bg-surface text-left shadow-card ring-1 ring-line', padded && 'p-5', onClick && 'transition hover:-translate-y-px hover:shadow-float active:scale-[0.99]', className)}>
      {children}
    </Tag>
  )
}

export function SectionTitle({ title, action, onAction, className }: { title: string; action?: string; onAction?: () => void; className?: string }) {
  return (
    <div className={cx('mb-3 flex items-end justify-between', className)}>
      <h3 className="text-[19px] font-bold tracking-tight">{title}</h3>
      {action && (
        <button onClick={onAction} className="text-[15px] font-medium text-accent hover:opacity-75">
          {action}
        </button>
      )}
    </div>
  )
}

/* ---------- Controls ---------- */

export function Segmented<T extends string>({ options, value, onChange, size = 'md', className, full }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md'; className?: string; full?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState({ left: 0, width: 0 })
  useLayoutEffect(() => {
    const el = ref.current?.querySelector<HTMLButtonElement>(`[data-val="${CSS.escape(value)}"]`)
    if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth })
  }, [value, options.length])
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const el = ref.current?.querySelector<HTMLButtonElement>(`[data-val="${CSS.escape(value)}"]`)
      if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth })
    })
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [value])
  return (
    <div ref={ref} role="tablist" className={cx('relative inline-flex rounded-[11px] bg-surface-3/80 p-[3px]', full && 'flex w-full', className)}>
      <span className="absolute top-[3px] bottom-[3px] rounded-[9px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,.12),0_0_0_.5px_rgba(0,0,0,.04)] transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] dark:bg-[#2a3c63]" style={{ left: thumb.left, width: thumb.width }} />
      {options.map((o) => (
        <button
          key={o.value}
          data-val={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('relative z-[1] flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold transition-colors', size === 'sm' ? 'h-7 px-3 text-[12px]' : 'h-8 px-4 text-[13px]', full && 'flex-1', value === o.value ? 'text-ink' : 'text-ink-2 hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50', checked ? 'bg-[#34c759]' : 'bg-surface-3 dark:bg-[#2a3a5c]')}
    >
      <span className={cx('absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,.15),0_1px_1px_rgba(0,0,0,.16)] transition-all duration-200 ease-[cubic-bezier(.3,1.4,.6,1)]', checked ? 'left-[22px]' : 'left-[2px]')} />
    </button>
  )
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={cx('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] transition', checked ? 'bg-accent text-accent-ink' : 'ring-1 ring-line-2 ring-inset hover:ring-ink-3')}
    >
      {checked && <Check size={13} strokeWidth={3} />}
    </button>
  )
}

export function Chip({ active, onClick, children, color, icon: Icon, className }: { active?: boolean; onClick?: () => void; children: ReactNode; color?: string; icon?: LucideIcon; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold transition active:scale-95',
        active ? 'bg-ink text-[var(--bg)]' : 'bg-surface text-ink-2 ring-1 ring-line-2 hover:text-ink',
        className,
      )}
    >
      {Icon && <Icon size={14} style={{ color: active ? undefined : color }} />}
      {!Icon && color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  )
}

export function Avatar({ name, size = 36, src, className }: { name: string; size?: number; src?: string; className?: string }) {
  const initials = name
    .replace(/^(Kgd\.|Hon\.|Engr\.|Teacher)\s/, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
  const hues = ['#1f4fd1', '#0ea5b7', '#8b5cf6', '#ef8a2b', '#22a06b', '#e5372a', '#5b8def', '#b0683f']
  const h = hues[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length]
  return src ? (
    <img src={src} alt={name} className={cx('shrink-0 rounded-full object-cover', className)} style={{ width: size, height: size }} />
  ) : (
    <span className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', className)} style={{ width: size, height: size, fontSize: size * 0.38, background: tint(h, 16), color: ink(h) }}>
      {initials}
    </span>
  )
}

/* ---------- Inputs ---------- */

export function Field({ label, hint, children, error }: { label?: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">{label}</span>}
      {children}
      {error ? <span className="mt-1.5 block text-xs font-medium text-danger">{error}</span> : hint && <span className="mt-1.5 block text-xs text-ink-3">{hint}</span>}
    </label>
  )
}

export function TextInput({ icon: Icon, className, right, ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon?: LucideIcon; right?: ReactNode }) {
  return (
    <div className={cx('flex h-12 items-center gap-2.5 rounded-[14px] bg-surface-2 px-3.5 ring-1 ring-transparent transition focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/60', className)}>
      {Icon && <Icon size={18} className="shrink-0 text-ink-3" />}
      <input {...rest} className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none" />
      {right}
    </div>
  )
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx('w-full resize-none rounded-[14px] bg-surface-2 px-3.5 py-3 text-[16px] leading-relaxed text-ink outline-none ring-1 ring-transparent transition placeholder:text-ink-3 focus:bg-surface focus:ring-2 focus:ring-accent/60 focus-visible:outline-none', props.className)}
    />
  )
}

export function SearchField({ value, onChange, placeholder = 'Search', className, kbd }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; kbd?: string }) {
  return (
    <div className={cx('flex h-9 items-center gap-2 rounded-[11px] bg-surface-3/70 px-3 ring-1 ring-transparent transition focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/50', className)}>
      <Search size={16} className="shrink-0 text-ink-3" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3 focus-visible:outline-none" />
      {value ? (
        <button onClick={() => onChange('')} className="rounded-full bg-ink-3/40 p-0.5 text-surface" aria-label="Clear search">
          <X size={11} strokeWidth={3} />
        </button>
      ) : (
        kbd && <kbd className="rounded-md bg-surface px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink-3 ring-1 ring-line">{kbd}</kbd>
      )}
    </div>
  )
}

export function OtpInput({ length = 6, value, onChange, autoFocus }: { length?: number; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const id = useId()
  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])
  return (
    <div className="flex justify-between gap-2" id={id}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          inputMode="numeric"
          aria-label={`Digit ${i + 1}`}
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(-1)
            const arr = value.padEnd(length, ' ').split('')
            arr[i] = d || ' '
            onChange(arr.join('').trimEnd())
            if (d && i < length - 1) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus()
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
            if (t) {
              e.preventDefault()
              onChange(t)
              refs.current[Math.min(t.length, length - 1)]?.focus()
            }
          }}
          className={cx('h-14 w-full min-w-0 rounded-[14px] bg-surface-2 text-center text-2xl font-semibold tabular outline-none ring-1 transition focus:bg-surface focus:ring-2 focus:ring-accent', value[i] && value[i] !== ' ' ? 'ring-accent/40' : 'ring-transparent')}
        />
      ))}
    </div>
  )
}

/* ---------- Overlays ---------- */

export function Modal({ open, onClose, title, subtitle, children, footer, width = 520, icon }: { open: boolean; onClose: () => void; title?: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; width?: number; icon?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-[#060d1f]/35 backdrop-blur-[6px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative flex max-h-[90vh] w-full animate-pop flex-col overflow-hidden rounded-[26px] bg-surface shadow-pop" style={{ maxWidth: width }}>
        {title && (
          <div className="flex items-start gap-3 px-6 pt-6 pb-2">
            {icon}
            <div className="min-w-0 flex-1">
              <h2 className="text-[19px] font-bold tracking-tight">{title}</h2>
              {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
            </div>
            <IconButton icon={X} label="Close" size={32} onClick={onClose} className="-mt-1 -mr-2 bg-surface-2" />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2/50 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/** Bottom sheet scoped to the nearest positioned ancestor (used inside the phone frame). */
export function Sheet({ open, onClose, children, title, height }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode; height?: string }) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 animate-fade-in bg-black/30" onClick={onClose} />
      <div className="relative flex animate-sheet flex-col rounded-t-[30px] bg-surface pb-8 shadow-pop" style={{ maxHeight: height ?? '88%' }}>
        <div className="flex justify-center pt-2 pb-1">
          <span className="h-[5px] w-9 rounded-full bg-ink-3/40" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 pt-1 pb-3">
            <h3 className="text-[19px] font-bold tracking-tight">{title}</h3>
            <IconButton icon={X} label="Close" size={30} onClick={onClose} className="bg-surface-2" />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5">{children}</div>
      </div>
    </div>
  )
}

export function Toaster({ scoped }: { scoped?: boolean }) {
  const { toasts } = useStore()
  return (
    <div className={cx('pointer-events-none z-[200] flex flex-col items-center gap-2', scoped ? 'absolute inset-x-0 top-14' : 'fixed inset-x-0 bottom-6')}>
      {toasts.map((t) => {
        const Icon = t.tone === 'success' ? CircleCheck : t.tone === 'danger' ? CircleExclamationPoint : Info
        return (
          <div key={t.id} className="glass-strong pointer-events-auto flex max-w-[92%] animate-slide-up items-center gap-2.5 rounded-full py-2.5 pr-5 pl-3.5 text-sm font-semibold shadow-float ring-1 ring-line">
            <Icon size={18} className={t.tone === 'success' ? 'text-success' : t.tone === 'danger' ? 'text-danger' : 'text-accent'} />
            {t.message}
          </div>
        )
      })}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-ink-3">
        <Icon size={26} />
      </span>
      <div className="text-[17px] font-semibold">{title}</div>
      {body && <p className="mt-1 max-w-xs text-sm text-ink-2">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ProgressBar({ value, color = 'var(--accent)', className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cx('h-1.5 overflow-hidden rounded-full bg-surface-3', className)}>
      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  )
}

export function Stat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs font-medium text-ink-3">{label}</div>
      <div className="mt-0.5 text-[15px] font-semibold">{value}</div>
      {sub && <div className="text-xs text-ink-3">{sub}</div>}
    </div>
  )
}

export { tint, ink }
