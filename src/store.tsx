import { flushSync } from 'react-dom'
import type { User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  LOCAL_RESIDENT,
  INITIAL_AUDIT,
  INITIAL_INCIDENTS,
  INITIAL_RESIDENT_NOTIFS,
  INITIAL_STAFF_NOTIFS,
  RESPONDERS,
  STAFF,
  type AuditEntry,
  type Incident,
  type ResidentNotification,
  type StaffNotification,
  type StaffUser,
} from './data/records'
import { STATUSES, type Category, type Role, type Status } from './data/meta'
import { supabase } from './lib/supabase'

export type ThemeMode = 'light' | 'dark' | 'system'
export interface Toast {
  id: number
  message: string
  tone: 'default' | 'success' | 'danger'
}

interface UpdateMeta {
  note?: string
  by?: string
  role?: Role
}

type FeedState = 'loading' | 'ready' | 'error'

interface Store {
  officialFeedState: FeedState
  refreshOfficialFeed: () => void
  resident: typeof LOCAL_RESIDENT
  applyResidentUser: (user: User | null) => void
  refreshResidentSession: () => Promise<typeof LOCAL_RESIDENT | null | undefined>
  sessionCheck: 'checking' | 'ready' | 'failed'
  retrySessionCheck: () => void
  signedIn: boolean
  theme: ThemeMode
  dark: boolean
  setTheme: (m: ThemeMode, button: HTMLButtonElement) => void
  incidents: Incident[]
  getIncident: (id: string) => Incident | undefined
  submitReport: (d: NewReport, saved?: { id: string; code: string }, reporter?: Incident['reporter']) => Incident
  updateIncident: (id: string, patch: Partial<Incident>, meta?: UpdateMeta) => void
  residentNotifs: ResidentNotification[]
  markResidentRead: (id?: string) => void
  staffNotifs: StaffNotification[]
  markStaffRead: (id?: string) => void
  audit: AuditEntry[]
  addAudit: (e: Omit<AuditEntry, 'id' | 'at' | 'ip'>) => void
  staff: StaffUser[]
  setStaff: (fn: (s: StaffUser[]) => StaffUser[]) => void
  toasts: Toast[]
  toast: (message: string, tone?: Toast['tone']) => void
}

export interface NewReport {
  category: Category
  title: string
  description: string
  photos: string[]
  x: number
  y: number
  address: string
  purok: string
  landmark?: string
  danger: boolean
  affected: number
  anonymous: boolean
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children, officialToken }: { children: ReactNode; officialToken?: string }) {
  const [officialFeedState, setOfficialFeedState] = useState<FeedState>(officialToken ? 'loading' : 'ready')
  const refreshFeedRef = useRef<() => void>(() => {})
  const refreshOfficialFeed = useCallback(() => refreshFeedRef.current(), [])
  const [resident, setResident] = useState(LOCAL_RESIDENT)
  const [sessionCheck, setSessionCheck] = useState<Store['sessionCheck']>('checking')
  const [sessionAttempt, setSessionAttempt] = useState(0)
  const retrySessionCheck = useCallback(() => {
    setSessionCheck('checking')
    setSessionAttempt(attempt => attempt + 1)
  }, [])
  const authRevision = useRef(0)

  const residentFromUser = useCallback((user: User) => {
    const fullName = user.user_metadata?.full_name
    const name = typeof fullName === 'string' && fullName.trim()
      ? fullName.trim() : user.email || user.phone || 'Resident'
    return { ...LOCAL_RESIDENT, id: user.id, name, first: name.split(' ')[0],
      email: user.email ?? '', phone: user.phone || String(user.user_metadata?.phone ?? ''),
      memberSince: user.created_at }
  }, [])

  // Keeps the SAME resident object when nothing changed, so effects that
  // depend on `resident` do not re-run (and wipe/reload incidents) on every
  // TOKEN_REFRESHED / SIGNED_IN event.
  const applyResidentUser = useCallback((user: User | null) => {
    authRevision.current++
    setSessionCheck('ready')
    setResident(prev => {
      const next = user ? residentFromUser(user) : LOCAL_RESIDENT
      return prev.id === next.id && prev.name === next.name &&
             prev.email === next.email && prev.phone === next.phone ? prev : next
    })
  }, [residentFromUser])

  // Only returns `undefined` on a REAL failure (getSession error or throw).
  // A newer auth event arriving mid-flight is no longer treated as a failure.
  const refreshResidentSession = useCallback(async () => {
    const revision = authRevision.current
    setSessionCheck('checking')
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('[refreshResidentSession] getSession error', error)
        if (authRevision.current === revision) setSessionCheck('failed')
        return undefined
      }
      const user = data.session?.user ?? null
      if (authRevision.current === revision) {
        if (user) applyResidentUser(user)
        else setSessionCheck('ready')
      } else {
        // A newer auth event already updated the resident.
        setSessionCheck('ready')
      }
      return user ? residentFromUser(user) : null
    } catch (err) {
      console.error('[refreshResidentSession] threw', err)
      if (authRevision.current === revision) setSessionCheck('failed')
      return undefined
    }
  }, [applyResidentUser, residentFromUser])

  const authRevisionAtMount = useRef(authRevision.current)
  const initialAuthEventPending = useRef(true)
  useEffect(() => {
    if (officialToken) return
    let active = true
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'INITIAL_SESSION') {
        const isInitialEvent = initialAuthEventPending.current
        initialAuthEventPending.current = false
        if (isInitialEvent && authRevision.current !== authRevisionAtMount.current) return
      }
      if (session?.user) {
        applyResidentUser(session.user)
      } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        // Reconcile empty notifications with this tab's current session.
        // Run after the auth callback releases the Supabase client lock.
        const revision = authRevision.current
        window.setTimeout(async () => {
          if (!active || authRevision.current !== revision) return
          try {
            const result = await supabase.auth.getSession()
            if (!active || authRevision.current !== revision) return
            if (result.error) setSessionCheck('failed')
            else applyResidentUser(result.data.session?.user ?? null)
          } catch {
            if (active && authRevision.current === revision) setSessionCheck('failed')
          }
        }, 0)
      }
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [applyResidentUser, officialToken, sessionAttempt])

  const [theme, setThemeState] = useState<ThemeMode>(() => (localStorage.getItem('alisto-theme') as ThemeMode) || 'light')
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS)
  const [residentNotifs, setResidentNotifs] = useState(INITIAL_RESIDENT_NOTIFS)
  const [serverResidentNotifs, setServerResidentNotifs] = useState<ResidentNotification[]>([])
  const [staffNotifs, setStaffNotifs] = useState(INITIAL_STAFF_NOTIFS)
  const [audit, setAudit] = useState(INITIAL_AUDIT)
  const [staff, setStaffState] = useState(STAFF)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  const dark = theme === 'dark' || (theme === 'system' && systemDark)
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const setTheme = useCallback((m: ThemeMode, button: HTMLButtonElement) => {
    localStorage.setItem('alisto-theme', m)
    const nextDark = m === 'dark' || (m === 'system' && systemDark)
    if (nextDark === dark || !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setThemeState(m)
      return
    }
    const rect = button.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const radius = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)))
    const style = document.documentElement.style
    style.setProperty('--theme-origin', `${x}px ${y}px`)
    style.setProperty('--theme-radius', `${radius}px`)
    document.startViewTransition(() => flushSync(() => setThemeState(m)))
  }, [dark, systemDark])

  const toast = useCallback((message: string, tone: Toast['tone'] = 'default') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  useEffect(() => {
    if (resident.id === LOCAL_RESIDENT.id) return
    let active = true
    let busy = false
    let hasError = false
    const refresh = async () => {
      if (busy) return
      busy = true
      try {
        const { loadResidentReports } = await import('./lib/submitResidentReport')
        const rows = await loadResidentReports({ id: resident.id, name: resident.name, phone: resident.phone, verified: false })
        if (active) {
          setIncidents(current => [...current.filter(item => item.reporter.id !== resident.id), ...rows])
          hasError = false
        }
      } catch (error) {
        if (active && !hasError) {
          toast(error instanceof Error ? `Could not load your submitted reports: ${error.message}` : 'Could not load your submitted reports.', 'danger')
        }
        hasError = true
      } finally {
        busy = false
      }
    }
    void refresh()
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      setIncidents(current => current.filter(item => item.reporter.id !== resident.id))
    }
  }, [resident, toast])

  useEffect(() => {
    if (resident.id === LOCAL_RESIDENT.id) {
      setServerResidentNotifs([])
      return
    }
    let active = true
    let busy = false
    let hasError = false
    const refresh = async () => {
      if (busy) return
      busy = true
      try {
        const { loadResidentNotifications } = await import('./lib/submitResidentReport')
        const rows = await loadResidentNotifications()
        if (active) setServerResidentNotifs(rows)
        hasError = false
      } catch (error) {
        if (active && !hasError) {
          toast(error instanceof Error ? `Could not load report notifications: ${error.message}` : 'Could not load report notifications.', 'danger')
        }
        hasError = true
      } finally {
        busy = false
      }
    }
    void refresh()
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [resident.id, toast])

  useEffect(() => {
    if (!officialToken) return
    let active = true
    let busy = false
    async function refresh() {
      if (busy || !officialToken) return
      busy = true
      try {
        const { loadOfficialReports } = await import('./lib/submitResidentReport')
        const rows = await loadOfficialReports(officialToken)
        if (!active) return
        setOfficialFeedState('ready')
        setIncidents(current => rows.map(row => {
          const previous = current.find(item => item.id === row.id)
          return previous && previous.updatedAt > row.updatedAt ? { ...previous, photos: row.photos } : row
        }))
      } catch {
        if (active) setOfficialFeedState('error')
      } finally {
        busy = false
      }
    }
    refreshFeedRef.current = () => {
      setOfficialFeedState('loading')
      void refresh()
    }
    void refresh()
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => { active = false; refreshFeedRef.current = () => {}; window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [officialToken])

  const addAudit = useCallback((e: Omit<AuditEntry, 'id' | 'at' | 'ip'>) => {
    setAudit((a) => [{ ...e, id: crypto.randomUUID(), at: new Date(), ip: 'Unavailable' }, ...a])
  }, [])

  const submitReport = useCallback(
    (d: NewReport, saved?: { id: string; code: string }, reporter?: Incident['reporter']) => {
      const id = saved?.id ?? crypto.randomUUID()
      const now = new Date()
      const reportOwner = reporter ?? resident
      const inc: Incident = {
        id,
        code: saved?.code ?? `ALS-${now.getFullYear()}-${id.slice(0, 8).toUpperCase()}`,
        category: d.category,
        title: d.title,
        description: d.description,
        status: 'pending',
        reporter: { id: reportOwner.id, name: reportOwner.name, phone: reportOwner.phone, verified: false },
        anonymous: d.anonymous,
        address: d.address,
        purok: d.purok,
        landmark: d.landmark,
        x: d.x,
        y: d.y,
        lat: +(14.6507 + (50 - d.y) * 0.00011).toFixed(5),
        lng: +(121.1029 + (d.x - 50) * 0.00016).toFixed(5),
        photos: d.photos,
        createdAt: now,
        updatedAt: now,
        timeline: [{ status: 'pending', at: now, note: saved ? 'Submitted for verification' : 'Report added to local workspace', by: d.anonymous ? 'Anonymous resident' : reportOwner.name }],
        affected: d.affected,
        confirmations: 0,
        danger: d.danger,
      }
      setIncidents((list) => [inc, ...list.filter(item => item.id !== inc.id)])
      setStaffNotifs((s) => [
        { id: crypto.randomUUID(), tone: d.danger ? 'critical' : 'info', title: 'New resident report', body: `${inc.title} · ${d.purok}`, at: now, read: false, incidentId: inc.id },
        ...s,
      ])
      setResidentNotifs((s) => [
        { id: crypto.randomUUID(), kind: 'status', title: saved ? 'Report submitted' : 'Report added locally', body: saved ? `${inc.code} is pending verification.` : `${inc.code} is available in this workspace. It has not been sent to a server.`, at: now, read: false, incidentId: inc.id, status: 'pending' },
        ...s,
      ])
      return inc
    },
    [resident],
  )

  const incidentsRef = useRef(incidents)
  incidentsRef.current = incidents

  const updateIncident = useCallback((id: string, patch: Partial<Incident>, meta: UpdateMeta = {}) => {
    const prev = incidentsRef.current.find((i) => i.id === id)
    if (!prev) return
    const next: Incident = { ...prev, ...patch, updatedAt: new Date() }
    const status = patch.status && patch.status !== prev.status ? patch.status : undefined
    if (status) {
      next.timeline = [...prev.timeline, { status, at: new Date(), note: meta.note ?? STATUSES[status].desc, by: meta.by ?? 'Local workspace' }]
    }
    incidentsRef.current = incidentsRef.current.map((i) => (i.id === id ? next : i))
    setIncidents((list) => list.map((i) => (i.id === id ? next : i)))
    if (!status) return
    if (next.reporter.id === resident.id) {
      const responder = RESPONDERS.find((r) => r.id === next.assignee)
      const body =
        status === 'assigned' && responder
          ? `${responder.name} (${responder.team}) was assigned to ${next.code}.`
          : `${next.code} is now "${STATUSES[status].label}". ${STATUSES[status].desc}.`
      setResidentNotifs((s) => [{ id: crypto.randomUUID(), kind: 'status', title: `Report ${STATUSES[status].label.toLowerCase()}`, body, at: new Date(), read: false, incidentId: next.id, status }, ...s])
    }
    setAudit((a) => [
      {
        id: crypto.randomUUID(),
        actor: meta.by ?? 'Local workspace',
        role: meta.role ?? 'official',
        action: `Status → ${STATUSES[status].label}${meta.note ? ` · ${meta.note}` : ''}`,
        type: status === 'assigned' || status === 'progress' ? 'assignment' : 'incident',
        target: next.code,
        ip: 'Unavailable',
        at: new Date(),
      },
      ...a,
    ])
  }, [resident])

  const markResidentRead = useCallback((id?: string) => {
    setResidentNotifs((s) => s.map((n) => (!id || n.id === id ? { ...n, read: true } : n)))
    setServerResidentNotifs((s) => s.map((n) => (!id || n.id === id ? { ...n, read: true } : n)))
    const isRemoteNotification = !id || serverResidentNotifs.some(n => n.id === id)
    if (resident.id === LOCAL_RESIDENT.id || !isRemoteNotification) return
    void import('./lib/submitResidentReport').then(({ markResidentNotificationsRead }) => markResidentNotificationsRead(id)).catch(error => {
      toast(error instanceof Error ? `Could not save notification status: ${error.message}` : 'Could not save notification status.', 'danger')
    })
  }, [resident.id, serverResidentNotifs, toast])

  const residentNotificationFeed = [...serverResidentNotifs, ...residentNotifs]
    .filter(n => !n.incidentId || incidents.some(i => i.id === n.incidentId && i.reporter.id === resident.id))
    .sort((a, b) => b.at.getTime() - a.at.getTime())

  const value = useMemo<Store>(
    () => ({
      officialFeedState, refreshOfficialFeed, sessionCheck, retrySessionCheck, resident, applyResidentUser, refreshResidentSession, signedIn: resident.id !== LOCAL_RESIDENT.id,
      theme,
      dark,
      setTheme,
      incidents,
      getIncident: (id) => incidents.find((i) => i.id === id),
      submitReport,
      updateIncident,
      residentNotifs: residentNotificationFeed,
      markResidentRead,
      staffNotifs,
      markStaffRead: (id) => setStaffNotifs((s) => s.map((n) => (!id || n.id === id ? { ...n, read: true } : n))),
      audit,
      addAudit,
      staff,
      setStaff: (fn) => setStaffState(fn),
      toasts,
      toast,
    }),
    [officialFeedState, refreshOfficialFeed, sessionCheck, retrySessionCheck, resident, applyResidentUser, refreshResidentSession, theme, dark, setTheme, incidents, submitReport, updateIncident, residentNotificationFeed, markResidentRead, staffNotifs, audit, addAudit, staff, toasts, toast],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore outside provider')
  return v
}