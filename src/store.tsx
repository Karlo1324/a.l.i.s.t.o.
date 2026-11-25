import type { User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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

interface Store {
  resident: typeof LOCAL_RESIDENT
  applyResidentUser: (user: User | null) => void
  signedIn: boolean
  theme: ThemeMode
  dark: boolean
  setTheme: (m: ThemeMode) => void
  incidents: Incident[]
  getIncident: (id: string) => Incident | undefined
  submitReport: (d: NewReport, saved?: { id: string; code: string }) => Incident
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [resident, setResident] = useState(LOCAL_RESIDENT)
  const applyResidentUser = useCallback((user: User | null) => {
    if (!user) { setResident(LOCAL_RESIDENT); return }
    const fullName = user.user_metadata?.full_name
    const name = typeof fullName === 'string' && fullName.trim()
      ? fullName.trim() : user.email || user.phone || 'Resident'
    setResident({ ...LOCAL_RESIDENT, id: user.id, name, first: name.split(' ')[0],
      email: user.email ?? '', phone: user.phone || String(user.user_metadata?.phone ?? ''),
      memberSince: user.created_at })
  }, [])
  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined
    import('./lib/supabase').then(({ supabase }) => {
      if (!active) return
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user
        if (active) applyResidentUser(user ?? null)
      })
      unsubscribe = () => data.subscription.unsubscribe()
    }).catch(() => { /* Guest access is available without account configuration. */ })
    return () => { active = false; unsubscribe?.() }
  }, [applyResidentUser])
  const [theme, setThemeState] = useState<ThemeMode>(() => (localStorage.getItem('alisto-theme') as ThemeMode) || 'light')
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS)
  const [residentNotifs, setResidentNotifs] = useState(INITIAL_RESIDENT_NOTIFS)
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
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const setTheme = useCallback((m: ThemeMode) => {
    localStorage.setItem('alisto-theme', m)
    setThemeState(m)
  }, [])

  const toast = useCallback((message: string, tone: Toast['tone'] = 'default') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  useEffect(() => {
    if (resident.id === LOCAL_RESIDENT.id) return
    let active = true
    import('./lib/submitResidentReport').then(({ loadResidentReports }) =>
      loadResidentReports({ id: resident.id, name: resident.name, phone: resident.phone, verified: false })
    ).then(rows => {
      if (!active) return
      setIncidents(current => [...current, ...rows.filter(row => !current.some(item => item.id === row.id))])
    }).catch(() => { if (active) toast('Could not load your submitted reports.', 'danger') })
    return () => {
      active = false
      setIncidents(current => current.filter(item => item.reporter.id !== resident.id))
    }
  }, [resident, toast])

  const addAudit = useCallback((e: Omit<AuditEntry, 'id' | 'at' | 'ip'>) => {
    setAudit((a) => [{ ...e, id: crypto.randomUUID(), at: new Date(), ip: 'Unavailable' }, ...a])
  }, [])

  const submitReport = useCallback(
    (d: NewReport, saved?: { id: string; code: string }) => {
      const id = saved?.id ?? crypto.randomUUID()
      const now = new Date()
      const inc: Incident = {
        id,
        code: saved?.code ?? `ALS-${now.getFullYear()}-${id.slice(0, 8).toUpperCase()}`,
        category: d.category,
        title: d.title,
        description: d.description,
        status: 'pending',
        reporter: { id: resident.id, name: resident.name, phone: resident.phone, verified: false },
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
        timeline: [{ status: 'pending', at: now, note: saved ? 'Submitted for verification' : 'Report added to local workspace', by: d.anonymous ? 'Anonymous resident' : resident.name }],
        affected: d.affected,
        confirmations: 0,
        danger: d.danger,
      }
      setIncidents((list) => [inc, ...list])
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

  const value = useMemo<Store>(
    () => ({
      resident, applyResidentUser, signedIn: resident.id !== LOCAL_RESIDENT.id,
      theme,
      dark,
      setTheme,
      incidents,
      getIncident: (id) => incidents.find((i) => i.id === id),
      submitReport,
      updateIncident,
      residentNotifs: residentNotifs.filter(n => !n.incidentId || incidents.some(i => i.id === n.incidentId && i.reporter.id === resident.id)),
      markResidentRead: (id) => setResidentNotifs((s) => s.map((n) => (!id || n.id === id ? { ...n, read: true } : n))),
      staffNotifs,
      markStaffRead: (id) => setStaffNotifs((s) => s.map((n) => (!id || n.id === id ? { ...n, read: true } : n))),
      audit,
      addAudit,
      staff,
      setStaff: (fn) => setStaffState(fn),
      toasts,
      toast,
    }),
    [resident, applyResidentUser, theme, dark, setTheme, incidents, submitReport, updateIncident, residentNotifs, staffNotifs, audit, addAudit, staff, toasts, toast],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore outside provider')
  return v
}
