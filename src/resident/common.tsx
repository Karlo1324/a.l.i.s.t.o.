import { createContext, useContext, useState, type ReactNode, type UIEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cx } from '../lib/format'
import { STATUS_FLOW, STATUSES, type Status } from '../data/meta'
import { toLatLng } from '../lib/geo'

export type Stage = 'onboarding' | 'login' | 'register' | 'forgot' | 'app'
export type Tab = 'home' | 'map' | 'reports' | 'profile'
export type Route =
  | { name: 'report'; category?: string; draftId?: string }
  | { name: 'reportDetail'; id: string }
  | { name: 'notifications' }
  | { name: 'announcement'; id: string }
  | { name: 'notifSettings' }
  | { name: 'personal' }

export interface Nav {
  stage: Stage
  setStage: (s: Stage) => void
  tab: Tab
  setTab: (t: Tab) => void
  push: (r: Route) => void
  pop: () => void
  replace: (r: Route) => void
  openSheet: (s: 'hotlines' | 'gobag') => void
}

export const NavCtx = createContext<Nav | null>(null)
export const useNav = () => useContext(NavCtx)!

/** iOS-style screen with large title that collapses into a translucent nav bar on scroll. */
export function Screen({
  title,
  large = true,
  back,
  onBack,
  right,
  children,
  className,
  bottomPad = true,
  eyebrow,
  headerless,
}: {
  title?: string
  large?: boolean
  back?: string
  onBack?: () => void
  right?: ReactNode
  children: ReactNode
  className?: string
  bottomPad?: boolean
  eyebrow?: ReactNode
  headerless?: boolean
}) {
  const [scrolled, setScrolled] = useState(false)
  const onScroll = (e: UIEvent<HTMLDivElement>) => setScrolled(e.currentTarget.scrollTop > (large ? 44 : 4))
  return (
    <div className="absolute inset-0 flex flex-col">
      {!headerless && (
        <div className={cx('absolute inset-x-0 top-0 z-30 transition-[background,box-shadow] duration-300', scrolled ? 'glass-strong shadow-[0_0.5px_0_var(--line-2)]' : '')}>

          <div className="relative flex h-11 items-center justify-between px-2">
            <div className="flex min-w-[80px] items-center">
              {onBack && (
                <button onClick={onBack} className="flex items-center gap-0.5 rounded-full py-1 pr-2 text-[17px] text-accent active:opacity-60">
                  <ChevronLeft size={28} strokeWidth={2.2} className="-mr-0.5" />
                  {back ?? 'Back'}
                </button>
              )}
            </div>
            <div className={cx('pointer-events-none absolute inset-x-24 truncate text-center text-[17px] font-semibold transition-opacity duration-200', !large || scrolled ? 'opacity-100' : 'opacity-0')}>{title}</div>
            <div className="flex min-w-[80px] items-center justify-end gap-1 pr-2">{right}</div>
          </div>
        </div>
      )}
      <div onScroll={onScroll} className={cx('no-scrollbar flex-1 overflow-y-auto overscroll-contain', !headerless && 'pt-11', bottomPad && 'pb-32', className)}>
        {large && title && (
          <div className="px-5 pt-1 pb-4">
            {eyebrow && <div className="mb-0.5 text-[13px] font-semibold tracking-wide text-ink-3 uppercase">{eyebrow}</div>}
            <h1 className="text-[34px] leading-[1.1] font-bold tracking-[-0.022em]">{title}</h1>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function Group({ children, header, footer, className }: { children: ReactNode; header?: string; footer?: ReactNode; className?: string }) {
  return (
    <div className={cx('px-4', className)}>
      {header && <div className="px-4 pb-1.5 text-[13px] font-medium tracking-wide text-ink-3 uppercase">{header}</div>}
      <div className="overflow-hidden rounded-[18px] bg-surface ring-1 ring-line">{children}</div>
      {footer && <div className="px-4 pt-1.5 text-[13px] leading-snug text-ink-3">{footer}</div>}
    </div>
  )
}

export function Row({ icon, iconBg, label, detail, right, onClick, danger, chevron = !!onClick, sub }: { icon?: ReactNode; iconBg?: string; label: ReactNode; detail?: ReactNode; right?: ReactNode; onClick?: () => void; danger?: boolean; chevron?: boolean; sub?: ReactNode }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={cx('group flex w-full items-center gap-3 pl-4 text-left', onClick && 'active:bg-surface-2')}>
      {icon && (
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] text-white" style={{ background: iconBg ?? 'var(--accent)' }}>
          {icon}
        </span>
      )}
      <div className="flex min-h-[50px] flex-1 items-center gap-2 border-b border-line py-2.5 pr-4 group-last:border-b-0">
        <div className="min-w-0 flex-1">
          <div className={cx('text-[16px]', danger ? 'text-danger' : 'text-ink')}>{label}</div>
          {sub && <div className="text-[13px] text-ink-3">{sub}</div>}
        </div>
        {detail && <span className="text-[15px] text-ink-3">{detail}</span>}
        {right}
        {chevron && <ChevronLeft size={18} className="rotate-180 text-ink-3/70" />}
      </div>
    </Tag>
  )
}

export function StatusTrack({ status, compact }: { status: Status; compact?: boolean }) {
  const idx = status === 'rejected' ? 1 : STATUS_FLOW.indexOf(status)
  const color = STATUSES[status].color
  return (
    <div className="flex items-center gap-1">
      {STATUS_FLOW.map((s, i) => (
        <span
          key={s}
          className={cx('h-1 flex-1 rounded-full transition-colors', compact ? '' : 'h-1.5')}
          style={{ background: i <= idx ? color : 'var(--surface-3)' }}
        />
      ))}
    </div>
  )
}

export function addressFor(x: number, y: number) {
  const [lat, lng] = toLatLng({ x, y })
  return { purok: 'Area not verified', address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }
}
