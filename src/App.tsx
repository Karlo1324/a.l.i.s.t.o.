import { useEffect, useState } from 'react'
import { ArrowUpRight, Building, ChevronRight, LayoutDashboard, Moon, Smartphone, Sun } from 'lucide-react'
import { LogoMark, Segmented } from './components/ui'
import { ResidentApp, type ResidentJump } from './resident/ResidentApp'
import { AdminApp } from './admin/AdminApp'
import { StoreProvider, useStore } from './store'
import { ROLES, type Role } from './data/meta'
import { cx } from './lib/format'

type View = 'home' | 'resident' | 'admin'

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}

function useHashView(): [View, (v: View) => void] {
  const read = (): View => (location.hash === '#resident' ? 'resident' : location.hash === '#admin' ? 'admin' : 'home')
  const [v, setV] = useState<View>(read)
  useEffect(() => {
    const fn = () => setV(read())
    window.addEventListener('hashchange', fn)
    return () => window.removeEventListener('hashchange', fn)
  }, [])
  return [v, (nv) => (location.hash = nv === 'home' ? '' : nv)]
}

function Shell() {
  const [view, setView] = useHashView()
  if (view === 'resident') return <ResidentShowcase onHome={() => setView('home')} onAdmin={() => setView('admin')} />
  if (view === 'admin') return <AdminApp onExit={() => setView('home')} onResident={() => setView('resident')} />
  return <Launcher onPick={setView} />
}

export function ThemeToggle({ className }: { className?: string }) {
  const { dark, setTheme } = useStore()
  return (
    <button onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className={cx('flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink-2 shadow-card ring-1 ring-line transition hover:text-ink', className)}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

function Launcher({ onPick }: { onPick: (v: View) => void }) {
  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-royal/12 blur-[120px] dark:bg-royal/25" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <LogoMark size={34} />
          <span className="text-[14px] font-bold tracking-[0.1em]">A.L.I.S.T.O.</span>
        </div>
        <ThemeToggle />
      </header>
      <main className="relative mx-auto max-w-6xl px-6 pt-10 pb-20">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={104} className="animate-pop shadow-float" />
          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-[12px] font-semibold text-ink-2 shadow-card ring-1 ring-line">
            <span className="h-1.5 w-1.5 rounded-full bg-alert" /> Community incident workspace
          </div>
          <h1 className="mt-5 max-w-3xl text-[44px] leading-[1.05] font-bold tracking-[-0.035em] sm:text-[60px]">
            Automated Local Incident <span className="text-ink-3">&</span> Spatial Tracking Operations
          </h1>
          <p className="mt-5 max-w-xl text-[18px] leading-relaxed text-ink-2">A community safety platform connecting residents, barangay officials, and responders — from the first report to resolution.</p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-2">
          {[
            { v: 'resident' as const, icon: Smartphone, t: 'Resident App', s: 'Mobile PWA · 390 × 844', d: 'Add incidents with your photos and device location, then track their status in this workspace.', c: '#e5372a' },
            { v: 'admin' as const, icon: LayoutDashboard, t: 'Official Dashboard', s: 'Desktop · 1440 × 900', d: 'Review reports, manage incident status, and inspect locations on the map.', c: '#1f4fd1' },
          ].map((c) => (
            <button key={c.v} onClick={() => onPick(c.v)} className="group relative overflow-hidden rounded-[30px] bg-surface p-7 text-left shadow-card ring-1 ring-line transition duration-300 hover:-translate-y-1 hover:shadow-float">
              <div className="flex items-start justify-between">
                <span className="flex h-14 w-14 items-center justify-center rounded-[18px] text-white" style={{ background: c.c }}>
                  <c.icon size={26} />
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-2 transition group-hover:bg-accent group-hover:text-accent-ink">
                  <ArrowUpRight size={18} />
                </span>
              </div>
              <div className="mt-8 text-[13px] font-semibold text-ink-3">{c.s}</div>
              <div className="mt-1 text-[26px] font-bold tracking-tight">{c.t}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{c.d}</p>
              <div className="mt-6 flex items-center gap-1 text-[15px] font-semibold text-accent">
                Open workspace <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>

        <div className="mx-auto mt-14 max-w-4xl">
          <div className="mb-4 text-center text-[13px] font-semibold tracking-wide text-ink-3 uppercase">Four roles, one workflow</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(ROLES) as Role[]).map((r) => (
              <div key={r} className="rounded-[22px] bg-surface p-4 ring-1 ring-line">
                <span className="mb-3 block h-1.5 w-8 rounded-full" style={{ background: ROLES[r].color }} />
                <div className="text-[15px] font-semibold">{ROLES[r].label}</div>
                <div className="mt-1 text-[13px] leading-snug text-ink-3">{ROLES[r].desc}</div>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-[12px] text-ink-3">Local workspace · starts empty · records clear on refresh · no server connected.</p>
        </div>
      </main>
    </div>
  )
}

const JUMPS: { group: string; items: { to: ResidentJump; label: string }[] }[] = [
  {
    group: 'Get started',
    items: [
      { to: 'onboarding', label: 'Welcome & onboarding' },
      { to: 'login', label: 'Sign in' },
      { to: 'register', label: 'Create account' },
      { to: 'forgot', label: 'Forgot password' },
    ],
  },
  {
    group: 'App',
    items: [
      { to: 'home', label: 'Home dashboard' },
      { to: 'report', label: 'Report an incident' },
      { to: 'map', label: 'Incident map' },
      { to: 'reports', label: 'My reports' },
      { to: 'reportDetail', label: 'Status tracking' },
      { to: 'notifications', label: 'Notifications' },
      { to: 'profile', label: 'Profile & settings' },
    ],
  },
]

function ResidentShowcase({ onHome, onAdmin }: { onHome: () => void; onAdmin: () => void }) {
  const { theme, setTheme } = useStore()
  const [wide, setWide] = useState(() => window.innerWidth >= 900 && window.innerHeight >= 640)
  const [scale, setScale] = useState(1)
  const [jump, setJump] = useState<{ to: ResidentJump; n: number } | undefined>()
  const [active, setActive] = useState<ResidentJump>('onboarding')
  useEffect(() => {
    const fn = () => {
      setWide(window.innerWidth >= 900 && window.innerHeight >= 640)
      setScale(Math.min(1, (window.innerHeight - 48) / 868, (window.innerWidth - 420) / 414))
    }
    fn()
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  if (!wide) return <ResidentApp framed={false} jump={jump} />

  return (
    <div className="relative flex h-full overflow-hidden">
      <div className="pointer-events-none absolute top-1/2 left-[62%] h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-royal/10 blur-[120px] dark:bg-royal/20" />
      <aside className="relative z-10 flex w-[340px] shrink-0 flex-col border-r border-line bg-surface/50 px-6 py-6 backdrop-blur-xl">
        <button onClick={onHome} className="flex items-center gap-2.5 text-left">
          <LogoMark size={34} />
          <div>
            <div className="text-[14px] font-bold tracking-[0.1em]">A.L.I.S.T.O.</div>
            <div className="text-[12px] text-ink-3">Resident PWA</div>
          </div>
        </button>
        <h2 className="mt-8 text-[26px] leading-tight font-bold tracking-tight">Resident experience</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">Local mobile workspace. Jump to any screen, or tap through the flows inside the device.</p>
        <nav className="no-scrollbar mt-6 flex-1 space-y-5 overflow-y-auto">
          {JUMPS.map((g) => (
            <div key={g.group}>
              <div className="mb-1.5 px-2 text-[11px] font-bold tracking-wider text-ink-3 uppercase">{g.group}</div>
              {g.items.map((it) => (
                <button
                  key={it.to}
                  onClick={() => {
                    setActive(it.to)
                    setJump({ to: it.to, n: Date.now() })
                  }}
                  className={cx('flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[14px] font-medium transition', active === it.to ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}
                >
                  {it.label}
                  <ChevronRight size={15} className="opacity-50" />
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink-2">Appearance</span>
            <Segmented size="sm" value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'Auto' }]} />
          </div>
          <button onClick={onAdmin} className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left shadow-card ring-1 ring-line transition hover:shadow-float">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-royal text-white">
              <Building size={18} />
            </span>
            <div className="flex-1">
              <div className="text-[14px] font-semibold">Official Dashboard</div>
              <div className="text-[12px] text-ink-3">Reports you submit appear here</div>
            </div>
            <ArrowUpRight size={16} className="text-ink-3" />
          </button>
        </div>
      </aside>
      <main className="relative flex flex-1 items-center justify-center">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
          <ResidentApp framed jump={jump} />
        </div>
      </main>
    </div>
  )
}
