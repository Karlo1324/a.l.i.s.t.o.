import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, House, Map as MapIcon, Plus, UserRound } from 'lucide-react'
import { Toaster } from '../components/ui'
import { cx } from '../lib/format'
import { useStore } from '../store'
import { Forgot, Login, Register } from './Auth'
import { NavCtx, type Nav, type Route, type Stage, type Tab } from './common'
import { GoBagSheet, Home, HotlinesSheet } from './Home'
import { MapScreen } from './MapScreen'
import { AnnouncementDetail, Notifications } from './Notifications'
import { Onboarding } from './Onboarding'
import { PhoneFrame } from './PhoneFrame'
import { NotifSettings, PersonalInfo, Profile } from './Profile'
import { ReportFlow } from './ReportFlow'
import { MyReports, ReportDetail } from './Reports'
import type { Category } from '../data/meta'

export type ResidentJump = 'onboarding' | 'login' | 'register' | 'forgot' | 'home' | 'report' | 'map' | 'reports' | 'reportDetail' | 'notifications' | 'profile'

export function ResidentApp({ framed, jump }: { framed: boolean; jump?: { to: ResidentJump; n: number } }) {
  const { resident, signedIn, incidents } = useStore()
  const [stage, setStage] = useState<Stage>('onboarding')
  const [tab, setTabState] = useState<Tab>('home')
  const [stack, setStack] = useState<Route[]>([])
  const [sheet, setSheet] = useState<'hotlines' | 'gobag' | null>(null)
  const [onbLight, setOnbLight] = useState(true)

  useEffect(() => {
    if (signedIn) setStage(current => current === 'onboarding' ? 'app' : current)
  }, [signedIn])

  const nav: Nav = useMemo(
    () => ({
      stage,
      setStage: (s) => {
        setStage(s)
        setStack([])
        if (s === 'app') setTabState('home')
        if (s === 'onboarding') setOnbLight(true)
      },
      tab,
      setTab: (t) => {
        setStack([])
        setTabState(t)
      },
      push: (r) => setStack((s) => [...s, r]),
      pop: () => setStack((s) => s.slice(0, -1)),
      replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
      openSheet: (s) => setSheet(s),
    }),
    [stage, tab],
  )

  useEffect(() => {
    if (!jump) return
    const t = jump.to
    setSheet(null)
    if (t === 'onboarding' || t === 'login' || t === 'register' || t === 'forgot') return nav.setStage(t)
    setStage('app')
    if (t === 'home' || t === 'map' || t === 'reports' || t === 'profile') {
      setStack([])
      setTabState(t)
    } else if (t === 'report') setStack([{ name: 'report' }])
    else if (t === 'notifications') setStack([{ name: 'notifications' }])
    else if (t === 'reportDetail') {
      setTabState('reports')
      const id = incidents.find((i) => i.reporter.id === resident.id && i.status === 'progress')?.id
      setStack(id ? [{ name: 'reportDetail', id }] : [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump?.n])

  const top = stack[stack.length - 1]
  const lightStatus = stage === 'onboarding' ? onbLight : stage === 'app' && top?.name === 'reportDetail'

  const renderRoute = (r: Route) => {
    switch (r.name) {
      case 'report':
        return <ReportFlow initialCategory={r.category as Category | undefined} />
      case 'reportDetail':
        return <ReportDetail id={r.id} />
      case 'notifications':
        return <Notifications />
      case 'announcement':
        return <AnnouncementDetail id={r.id} />
      case 'notifSettings':
        return <NotifSettings />
      case 'personal':
        return <PersonalInfo />
    }
  }

  return (
    <PhoneFrame framed={framed} lightStatus={lightStatus}>
      <NavCtx.Provider value={nav}>
        {stage === 'onboarding' && <Onboarding onLightStatus={setOnbLight} />}
        {stage === 'login' && <Login />}
        {stage === 'register' && <Register />}
        {stage === 'forgot' && <Forgot />}
        {stage === 'app' && (
          <>
            <div key={tab} className="absolute inset-0 animate-fade-in">
              {tab === 'home' && <Home />}
              {tab === 'map' && <MapScreen />}
              {tab === 'reports' && <MyReports />}
              {tab === 'profile' && <Profile />}
            </div>
            {stack.map((r, i) => (
              <div key={`${i}-${r.name}-${'id' in r ? r.id : ''}`} className={cx('absolute inset-0 bg-bg shadow-[-20px_0_40px_-20px_rgba(0,0,0,.25)]', r.name === 'report' ? 'animate-sheet' : 'animate-slide-in')} style={{ zIndex: 40 + i }}>
                {renderRoute(r)}
              </div>
            ))}
            <TabBar hidden={stack.length > 0} tab={tab} onTab={nav.setTab} onReport={() => nav.push({ name: 'report' })} />
          </>
        )}
        <HotlinesSheet open={sheet === 'hotlines'} onClose={() => setSheet(null)} />
        <GoBagSheet open={sheet === 'gobag'} onClose={() => setSheet(null)} />
        <Toaster scoped />
      </NavCtx.Provider>
    </PhoneFrame>
  )
}

function TabBar({ tab, onTab, onReport, hidden }: { tab: Tab; onTab: (t: Tab) => void; onReport: () => void; hidden: boolean }) {
  const items: { t: Tab; l: string; i: typeof House }[] = [
    { t: 'home', l: 'Home', i: House },
    { t: 'map', l: 'Map', i: MapIcon },
    { t: 'reports', l: 'Reports', i: ClipboardList },
    { t: 'profile', l: 'Profile', i: UserRound },
  ]
  return (
    <div className={cx('absolute inset-x-0 bottom-0 z-30 flex items-end gap-3 px-4 pb-[26px] transition-all duration-300', hidden ? 'pointer-events-none translate-y-8 opacity-0' : '')}>
      <nav className="glass-strong flex h-[64px] flex-1 items-center justify-between rounded-full p-1.5 shadow-float ring-1 ring-line" aria-label="Primary">
        {items.map((it) => {
          const on = tab === it.t
          return (
            <button key={it.t} onClick={() => onTab(it.t)} aria-current={on ? 'page' : undefined} className={cx('flex h-full flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-all duration-300', on ? 'bg-accent-soft text-accent' : 'text-ink-2 active:scale-95')}>
              <it.i size={22} strokeWidth={on ? 2.3 : 1.9} />
              <span className="text-[10px] font-semibold">{it.l}</span>
            </button>
          )
        })}
      </nav>
      <button onClick={onReport} aria-label="Report incident" className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-alert text-white shadow-[0_12px_28px_-8px_rgba(229,55,42,.75),inset_0_1px_0_rgba(255,255,255,.25)] ring-4 ring-[var(--glass-strong)] transition active:scale-90">
        <Plus size={30} strokeWidth={2.6} />
      </button>
    </div>
  )
}
