import { useEffect, useState, type ReactNode } from 'react'
import { BatteryFull, Signal, Wifi } from 'lucide-react'

function AndroidStatusBar() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])
  return <div aria-hidden="true" className="relative flex h-8 items-center justify-between bg-bg px-5 text-xs font-semibold text-ink">
    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    <span className="absolute left-1/2 size-3 -translate-x-1/2 rounded-full bg-black ring-1 ring-slate-700" />
    <span className="flex items-center gap-1"><Wifi size={13} /><Signal size={14} /><BatteryFull size={17} /></span>
  </div>
}

export function PhoneFrame({ children, framed }: { children: ReactNode; framed: boolean }) {
  if (!framed) return <div className="relative h-[100dvh] w-full overflow-hidden bg-bg">{children}</div>
  return <div className="rounded-[34px] border border-slate-600 bg-zinc-950 p-2 shadow-pop" aria-label="Android phone preview">
    <div className="flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[26px] bg-bg">
      <AndroidStatusBar />
      <div className="relative min-h-0 flex-1 overflow-hidden [transform:translateZ(0)]">{children}</div>
      <div aria-hidden="true" className="grid h-4 place-items-center"><span className="h-1 w-20 rounded-full bg-ink/60" /></div>
    </div>
  </div>
}
