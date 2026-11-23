import { useEffect, useState, type ReactNode } from 'react'
import { cx } from '../lib/format'

function StatusBar({ light }: { light?: boolean }) {
  const [t, setT] = useState(() => new Date())
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 30000)
    return () => clearInterval(i)
  }, [])
  const time = t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?[AP]M/, '')
  return (
    <div className={cx('pointer-events-none absolute inset-x-0 top-0 z-[80] flex h-[54px] items-center justify-between px-[34px] pt-1.5 text-[16px] font-semibold transition-colors', light ? 'text-white' : 'text-ink')}>
      <span className="w-14 text-center tabular">{time}</span>
      <span className="flex items-center gap-1.5">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden>
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden>
          <path d="M8 2.4c2.2 0 4.2.85 5.7 2.25l1.2-1.25A9.9 9.9 0 0 0 8 .6 9.9 9.9 0 0 0 1.1 3.4l1.2 1.25A8.1 8.1 0 0 1 8 2.4Zm0 3.6c1.2 0 2.3.45 3.15 1.2l1.2-1.25A6.3 6.3 0 0 0 8 4.2a6.3 6.3 0 0 0-4.35 1.75l1.2 1.25A4.5 4.5 0 0 1 8 6Zm0 3.4L9.9 7.45A2.7 2.7 0 0 0 8 6.7c-.75 0-1.4.3-1.9.75L8 9.4Z" />
        </svg>
        <span className="relative flex h-[13px] w-[27px] items-center rounded-[4px] border border-current/40 p-[1.5px]">
          <span className="h-full w-[78%] rounded-[2px] bg-current" />
          <span className="absolute -right-[3px] h-[5px] w-[1.5px] rounded-r bg-current/40" />
        </span>
      </span>
    </div>
  )
}

export function PhoneFrame({ children, lightStatus, framed }: { children: ReactNode; lightStatus?: boolean; framed: boolean }) {
  if (!framed)
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden bg-bg">
        <StatusBar light={lightStatus} />
        {children}
      </div>
    )
  return (
    <div className="relative rounded-[64px] bg-[#0b0f1a] p-[12px] shadow-[0_0_0_1.5px_#2a3142,0_0_0_4px_#0b0f1a,0_50px_100px_-30px_rgba(6,13,31,.55),0_30px_60px_-30px_rgba(6,13,31,.5)]">
      <span className="absolute top-[150px] -left-[5px] h-8 w-[4px] rounded-l bg-[#1a2030]" />
      <span className="absolute top-[205px] -left-[5px] h-14 w-[4px] rounded-l bg-[#1a2030]" />
      <span className="absolute top-[275px] -left-[5px] h-14 w-[4px] rounded-l bg-[#1a2030]" />
      <span className="absolute top-[230px] -right-[5px] h-20 w-[4px] rounded-r bg-[#1a2030]" />
      <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[52px] bg-bg [transform:translateZ(0)]">
        <StatusBar light={lightStatus} />
        <div className="pointer-events-none absolute top-[11px] left-1/2 z-[90] h-[37px] w-[124px] -translate-x-1/2 rounded-full bg-black" />
        {children}
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-[90] h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-ink/80" />
      </div>
    </div>
  )
}
