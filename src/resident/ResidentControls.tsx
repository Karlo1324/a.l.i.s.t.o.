import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '../lib/format'

export function Segmented<T extends string>({ options, value, onChange, size = 'md', className, full }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T, button: HTMLButtonElement) => void; size?: 'sm' | 'md'; className?: string; full?: boolean }) {
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
          onClick={event => onChange(o.value, event.currentTarget)}
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

