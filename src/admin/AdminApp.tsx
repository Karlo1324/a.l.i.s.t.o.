import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ChartColumn,
  ChevronsUpDown,
  ClipboardCheck,
  Command,
  House,
  Kanban,
  LayoutGrid,
  ListChecks,
  LogOut,
  Map as MapIcon,
  Menu as MenuIcon,
  Bell,
  Search,
  Send,
  Settings,
  Smartphone,
  UserCog,
  Users,
  WavesVertical,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, CategoryIcon, IconButton, LogoMark, RolePill, StatusPill, Toaster } from '../components/ui'
import { ROLES } from '../data/meta'
import { cx, timeAgo } from '../lib/format'
import { useStore } from '../store'
import { ThemeToggle } from '../App'
import { ACCESS, AdminCtx, Menu, Restricted, useAdmin, type AdminCtxValue, type AdminSettings, type Page } from './common'
import type { StaffSession } from '../lib/staffAuth'
import { StaffLogin } from './StaffLogin'
import { Overview } from './Overview'
import { Incidents } from './Incidents'
import { Verification } from './Verification'
import { Assignment } from './Assignment'
import { Tasks } from './Tasks'
import { Monitoring } from './Monitoring'
import { Analytics } from './Analytics'
import { ActivityPage } from './Activity'
import { UsersPage } from './Users'
import { SettingsPage } from './Settings'


const NAV: { page: Page; label: string; icon: LucideIcon; group: string; responderLabel?: string }[] = [
  { page: 'overview', label: 'Overview', icon: LayoutGrid, group: 'Operations', responderLabel: 'Today' },
  { page: 'incidents', label: 'Incidents', icon: ListChecks, group: 'Operations' },
  { page: 'verify', label: 'Verification', icon: ClipboardCheck, group: 'Operations' },
  { page: 'assign', label: 'Priority & Dispatch', icon: Send, group: 'Operations' },
  { page: 'tasks', label: 'Responder Tasks', icon: Kanban, group: 'Operations', responderLabel: 'My Tasks' },
  { page: 'monitor', label: 'Monitoring Map', icon: MapIcon, group: 'Insights', responderLabel: 'Task Map' },
  { page: 'analytics', label: 'Analytics', icon: ChartColumn, group: 'Insights' },
  { page: 'activity', label: 'Activity & Audit', icon: Activity, group: 'Insights' },
  { page: 'users', label: 'Users & Roles', icon: Users, group: 'Administration' },
  { page: 'settings', label: 'Settings', icon: Settings, group: 'Administration' },
]

export function AdminApp({ onExit, onResident }: { onExit: () => void; onResident: () => void }) {
  const [session, setSession] = useState<StaffSession | null>(null)
  const role = session?.role
  const [page, setPage] = useState<Page>('overview')
  const [param, setParam] = useState<string | undefined>()
  const [settings, setSettingsState] = useState<AdminSettings>({ aiEnabled: false, aiThreshold: 70, dupRadius: 150, autoEscalate: false })
  useEffect(() => {
    if (!session) return
    let active = true
    const lock = () => { if (active) setSession(null) }
    const verify = async () => {
      try {
        const { staffProfile } = await import('../lib/staffAuth')
        const profile = await staffProfile(session.token)
        if (profile.id !== session.id || profile.role !== session.role) lock()
      } catch { lock() }
    }
    const expiry = window.setTimeout(lock, Math.max(0, session.expiresAt - Date.now()))
    const interval = window.setInterval(verify, 60_000)
    window.addEventListener('focus', verify)
    return () => {
      active = false
      clearTimeout(expiry)
      clearInterval(interval)
      window.removeEventListener('focus', verify)
    }
  }, [session])

  const ctx = useMemo<AdminCtxValue | null>(
    () =>
      session && role ? {
        role,
        page,
        param,
        go: (p, prm) => {
          setPage(p)
          setParam(prm)
          document.getElementById('admin-main')?.scrollTo({ top: 0 })
        },
        user: { name: session.name, first: session.name.split(' ')[0], title: ROLES[role].label, email: session.email, responderId: role === 'responder' ? session.id : undefined },
        settings,
        setSettings: (s) => setSettingsState((x) => ({ ...x, ...s })),
      } : null,
    [session, role, page, param, settings],
  )

  if (!ctx || !session) {
    function handleStaffSignIn(verifiedSession: StaffSession) {
      setParam(undefined)
      setPage(verifiedSession.role === 'responder' ? 'tasks' : 'overview')
      setSession(verifiedSession)
    }

    return <StaffLogin onExit={onExit} onAuthenticated={handleStaffSignIn} />
  }

  return (
    <AdminCtx.Provider value={ctx}>
      <Shell onExit={onExit} onResident={onResident} onSignOut={() => {
        setSession(null)
        void import('../lib/staffAuth').then(auth => auth.signOutStaff(session.token)).catch(() => {})
      }} />
    </AdminCtx.Provider>
  )
}

function Shell({ onExit, onResident, onSignOut }: { onExit: () => void; onResident: () => void; onSignOut: () => void }) {
  const ctx = useAdmin()
  const { incidents, staffNotifs } = useStore()
  const [palette, setPalette] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const allowed = ACCESS[ctx.role]

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((p) => !p)
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  const counts: Partial<Record<Page, number>> = {
    incidents: incidents.filter((i) => !['resolved', 'rejected'].includes(i.status)).length,
    verify: incidents.filter((i) => i.status === 'pending' || i.status === 'review').length,
    assign: incidents.filter((i) => i.status === 'verified').length,
    tasks: incidents.filter((i) => (i.status === 'assigned' || i.status === 'progress') && (ctx.role !== 'responder' || i.assignee === ctx.user.responderId)).length,
  }

  const navItems = NAV.filter((n) => allowed.includes(n.page))
  const groups = [...new Set(navItems.map((n) => n.group))]
  const current = NAV.find((n) => n.page === ctx.page)

  const sidebar = (collapsedCapable: boolean) => (
    <div className="flex h-full flex-col">
      <div className={cx('flex items-center gap-2.5 px-4 pt-5 pb-4', collapsedCapable && 'max-xl:justify-center max-xl:px-0')}>
        <LogoMark size={36} />
        <div className={cx('min-w-0 leading-tight', collapsedCapable && 'max-xl:hidden')}>
          <div className="text-[14px] font-bold tracking-[0.1em]">A.L.I.S.T.O.</div>
          <div className="truncate text-[11px] text-ink-3">Community operations</div>
        </div>
      </div>
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3">
        {groups.map((g) => (
          <div key={g} className="mb-4">
            <div className={cx('mb-1 px-2.5 text-[11px] font-semibold tracking-wider text-ink-3 uppercase', collapsedCapable && 'max-xl:hidden')}>{ctx.role === 'responder' && g === 'Administration' ? 'Account' : g}</div>
            {navItems
              .filter((n) => n.group === g)
              .map((n) => {
                const on = ctx.page === n.page
                const label = ctx.role === 'responder' && n.responderLabel ? n.responderLabel : n.label
                return (
                  <button
                    key={n.page}
                    title={label}
                    onClick={() => {
                      ctx.go(n.page)
                      setMobileNav(false)
                    }}
                    className={cx('group relative mb-0.5 flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-[14px] font-medium transition', on ? 'bg-accent text-accent-ink shadow-[0_1px_2px_rgba(11,30,69,.2)]' : 'text-ink-2 hover:bg-surface-2 hover:text-ink', collapsedCapable && 'max-xl:justify-center max-xl:px-0')}
                  >
                    <n.icon size={18} strokeWidth={on ? 2.2 : 1.9} />
                    <span className={cx('flex-1 truncate text-left', collapsedCapable && 'max-xl:hidden')}>{label}</span>
                    {counts[n.page] ? (
                      <span className={cx('rounded-full px-1.5 text-[11px] font-semibold tabular', on ? 'bg-white/25' : 'bg-surface-3 text-ink-2', collapsedCapable && 'max-xl:absolute max-xl:top-0 max-xl:right-0.5 max-xl:bg-danger max-xl:text-white')}>{counts[n.page]}</span>
                    ) : null}
                  </button>
                )
              })}
          </div>
        ))}
      </nav>
      <div className="px-4 pb-3 text-xs text-ink-3">Local report workspace</div>
      <div className={cx('border-t border-line p-3', collapsedCapable && 'max-xl:px-2')}>
        <Menu
          align="left"
          trigger={(open) => (
            <button onClick={open} className={cx('flex w-full items-center gap-2.5 rounded-[12px] p-1.5 text-left transition hover:bg-surface-2', collapsedCapable && 'max-xl:justify-center')}>
              <Avatar name={ctx.user.name} size={34} />
              <div className={cx('min-w-0 flex-1', collapsedCapable && 'max-xl:hidden')}>
                <div className="truncate text-[13px] font-semibold">{ctx.user.name}</div>
                <div className="truncate text-[11px] text-ink-3">{ROLES[ctx.role].label}</div>
              </div>
              <ChevronsUpDown size={15} className={cx('text-ink-3', collapsedCapable && 'max-xl:hidden')} />
            </button>
          )}
          items={[
            { label: 'Profile & settings', icon: UserCog, onClick: () => ctx.go('settings') },
            { label: 'Open Resident App', icon: Smartphone, onClick: onResident },
            { label: 'Prototype home', icon: House, onClick: onExit },
            'sep',
            { label: 'Sign out', icon: LogOut, onClick: onSignOut, danger: true },
          ]}
        />
      </div>
    </div>
  )

  const unread = staffNotifs.filter((n) => !n.read).length
  const isMap = ctx.page === 'monitor'

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="glass hidden w-[248px] shrink-0 border-r border-line md:block max-xl:w-[72px]">{sidebar(true)}</aside>
      {mobileNav && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileNav(false)} />
          <aside className="glass-strong absolute top-0 bottom-0 left-0 w-[270px] animate-slide-in shadow-pop">{sidebar(false)}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass relative z-30 flex h-[60px] shrink-0 items-center gap-3 border-b border-line px-4 md:px-6">
          <IconButton icon={MenuIcon} label="Open navigation" className="md:hidden" onClick={() => setMobileNav(true)} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] text-ink-3">
              {current?.group} <span className="mx-1 text-ink-3/60">/</span> <span className="font-semibold text-ink">{ctx.role === 'responder' && current?.responderLabel ? current.responderLabel : current?.label}</span>
            </div>
          </div>
          <button onClick={() => setPalette(true)} className="hidden h-9 w-[280px] items-center gap-2 rounded-[11px] bg-surface-3/70 px-3 text-[13px] text-ink-3 transition hover:bg-surface-3 lg:flex">
            <Search size={15} /> Search incidents, pages…
            <kbd className="ml-auto flex items-center gap-0.5 rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-line">
              <Command size={11} />K
            </kbd>
          </button>
          <IconButton icon={Search} label="Search" className="lg:hidden" onClick={() => setPalette(true)} />
          <RolePill role={ctx.role} />
          <ThemeToggle className="h-9 w-9 shadow-none" />
          <NotificationsPopover unread={unread} />
        </header>
        <main id="admin-main" className={cx('min-h-0 flex-1', isMap ? 'relative overflow-hidden' : 'overflow-y-auto')}>
          <div key={ctx.page + (ctx.param ?? '') + ctx.role} className={cx('animate-fade-in', isMap ? 'h-full' : 'mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-8')}>
            {!allowed.includes(ctx.page) ? <Restricted onBack={() => ctx.go('overview')} /> : <PageView page={ctx.page} />}
          </div>
        </main>
      </div>
      {palette && <Palette onClose={() => setPalette(false)} navItems={navItems} />}
      <Toaster />
    </div>
  )
}

function PageView({ page }: { page: Page }) {
  switch (page) {
    case 'overview':
      return <Overview />
    case 'incidents':
      return <Incidents />
    case 'verify':
      return <Verification />
    case 'assign':
      return <Assignment />
    case 'tasks':
      return <Tasks />
    case 'monitor':
      return <Monitoring />
    case 'analytics':
      return <Analytics />
    case 'activity':
      return <ActivityPage />
    case 'users':
      return <UsersPage />
    case 'settings':
      return <SettingsPage />
  }
}

function NotificationsPopover({ unread }: { unread: number }) {
  const { staffNotifs, markStaffRead, getIncident } = useStore()
  const ctx = useAdmin()
  const [open, setOpen] = useState(false)
  const tone = { critical: '#e5372a', warning: '#ef8a2b', info: '#3b6ef0', success: '#22a06b' }
  return (
    <div className="relative">
      <IconButton icon={Bell} label="Notifications" badge={unread} onClick={() => setOpen(!open)} size={36} />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="glass-strong absolute top-[calc(100%+8px)] right-0 z-50 w-[380px] max-w-[calc(100vw-24px)] animate-pop overflow-hidden rounded-[20px] shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-[15px] font-semibold">Notifications</span>
              <button onClick={() => markStaffRead()} className="text-[13px] font-semibold text-accent">
                Mark all read
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-1.5">
              {staffNotifs.slice(0, 8).map((n) => {
                const inc = n.incidentId ? getIncident(n.incidentId) : undefined
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      markStaffRead(n.id)
                      setOpen(false)
                      if (inc) ctx.go(ctx.role === 'responder' ? 'tasks' : inc.status === 'pending' || inc.status === 'review' ? 'verify' : 'incidents', inc.id)
                    }}
                    className="flex w-full gap-3 rounded-[12px] p-2.5 text-left transition hover:bg-surface-2"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: n.read ? 'transparent' : tone[n.tone] }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-semibold" style={{ color: n.tone === 'critical' ? tone.critical : undefined }}>
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-3">{timeAgo(n.at)}</span>
                      </div>
                      <div className="mt-0.5 text-[12px] leading-snug text-ink-2">{n.body}</div>
                    </div>
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => {
                setOpen(false)
                ctx.go('activity')
              }}
              className="w-full border-t border-line py-2.5 text-[13px] font-semibold text-accent hover:bg-surface-2"
            >
              View all activity
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Palette({ onClose, navItems }: { onClose: () => void; navItems: typeof NAV }) {
  const { incidents } = useStore()
  const ctx = useAdmin()
  const [q, setQ] = useState('')
  const pages = navItems.filter((n) => n.label.toLowerCase().includes(q.toLowerCase()))
  const incs = incidents.filter((i) => `${i.code} ${i.title} ${i.address} ${i.purok}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
  const openInc = (id: string, status: string) => {
    onClose()
    if (ctx.role === 'responder') ctx.go('tasks', id)
    else if (ctx.role === 'admin') ctx.go('incidents', id)
    else ctx.go(status === 'pending' || status === 'review' ? 'verify' : status === 'verified' ? 'assign' : 'incidents', id)
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-[#060d1f]/30 backdrop-blur-[4px]" onClick={onClose} />
      <div className="glass-strong relative w-full max-w-[600px] animate-pop overflow-hidden rounded-[22px] shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={18} className="text-ink-3" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'Enter') {
                if (incs[0] && q) openInc(incs[0].id, incs[0].status)
                else if (pages[0]) (ctx.go(pages[0].page), onClose())
              }
            }}
            placeholder="Search incidents by code, street, or jump to a page…"
            className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3 focus-visible:outline-none"
          />
          <IconButton icon={X} label="Close" size={30} onClick={onClose} />
        </div>
        <div className="max-h-[420px] overflow-y-auto p-2">
          {pages.length > 0 && <div className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">Pages</div>}
          {pages.map((p) => (
            <button key={p.page} onClick={() => (ctx.go(p.page), onClose())} className="flex w-full items-center gap-3 rounded-[11px] px-2.5 py-2 text-left text-[14px] font-medium hover:bg-surface-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-2 text-ink-2">
                <p.icon size={15} />
              </span>
              {p.label}
            </button>
          ))}
          {incs.length > 0 && <div className="px-2.5 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">Incidents</div>}
          {incs.map((i) => (
            <button key={i.id} onClick={() => openInc(i.id, i.status)} className="flex w-full items-center gap-3 rounded-[11px] px-2.5 py-2 text-left hover:bg-surface-2">
              <CategoryIcon category={i.category} size={28} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium">{i.title}</div>
                <div className="text-[12px] text-ink-3">
                  {i.code} · {i.purok}
                </div>
              </div>
              <StatusPill status={i.status} size="sm" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-ink-3">
          <span>
            <kbd className="rounded bg-surface-2 px-1">↵</kbd> open
          </span>
          <span>
            <kbd className="rounded bg-surface-2 px-1">esc</kbd> close
          </span>
          <span className="ml-auto">
            Workspace view: <RolePill role={ctx.role} />
          </span>
        </div>
      </div>
    </div>
  )
}
