import { MAX_REPORT_PHOTO_BYTES } from './reportPhoto'
import type { Incident, ResidentNotification } from '../data/records'
import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { fromLatLng, toLatLng } from './geo'
import type { NewReport } from '../store'
import type { Status } from '../data/meta'

export async function submitResidentReport(id: string, userId: string, report: NewReport, source: 'GPS' | 'MANUAL', uploads: Map<string, string>) {
  const { data: session, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || session.session?.user.id !== userId) {
    throw new Error('Your resident session has changed. Sign in again before submitting.')
  }
  const paths: string[] = []
  for (const preview of report.photos) {
    let path = uploads.get(preview)
    if (!path) {
      const blob = await (await fetch(preview)).blob()
      if (!blob.size || blob.size >= MAX_REPORT_PHOTO_BYTES) throw new Error('Choose a photo under 5 MB.')
      path = `${userId}/${id}/${crypto.randomUUID()}`
      const { error } = await supabase.storage.from('incident-evidence').upload(path, blob, { contentType: blob.type })
      if (error) throw new Error(`Photo upload failed: ${error.message}`)
      uploads.set(preview, path)
    }
    paths.push(path)
  }
  const [lat, lng] = toLatLng(report)
  const { photos, ...details } = report
  const { data, error } = await supabase.rpc('submit_resident_report', { d: { ...details, id, lat, lng, source, paths } })
  if (error) throw new Error(`Report submission failed (${error.code || 'connection'}): ${error.message}`)
  if (typeof data !== 'string' || !data.trim()) throw new Error('Supabase did not return a report reference. Retry this submission.')
  return { id, code: data }
}

export async function loadResidentReports(reporter: Incident['reporter']): Promise<Incident[]> {
  const { data, error } = await supabase.rpc('my_resident_reports')
  if (error) throw new Error(error.message)
  return mapReports(data, supabase, reporter)
}

export async function loadResidentNotifications(): Promise<ResidentNotification[]> {
  const { data, error } = await supabase.rpc('my_resident_notifications')
  if (error) throw new Error(error.message)
  return ((data ?? []) as {
    id: string
    kind: ResidentNotification['kind']
    title: string
    body: string
    incidentId: string | null
    status: string
    read: boolean
    createdAt: string
  }[]).map(row => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    incidentId: row.incidentId ?? undefined,
    status: row.status as Status,
    read: row.read,
    at: new Date(row.createdAt),
  }))
}

export async function markResidentNotificationsRead(notificationId?: string) {
  const { error } = await supabase.rpc('mark_my_resident_notifications_read', { p_notification_id: notificationId ?? null })
  if (error) throw new Error(error.message)
}

export async function loadOfficialReports(token: string) {
  const client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    accessToken: async () => token,
  })
  const { data, error } = await client.rpc('official_reports')
  if (error) throw new Error(error.message)
  return mapReports(data, client)
}

type ReportFeedRow = Omit<Incident, 'createdAt' | 'updatedAt' | 'assignedAt' | 'acceptedAt'> & {
  createdAt: string
  updatedAt: string
  assignedAt?: string | null
  acceptedAt?: string | null
  paths: string[]
}

function mapReports(data: ReportFeedRow[], client: typeof supabase, reporter?: Incident['reporter']): Promise<Incident[]> {
  return Promise.all((data ?? []).map(async (row) => {
    const createdAt = new Date(row.createdAt)
    const { data: links } = row.paths.length
      ? await client.storage.from('incident-evidence').createSignedUrls(row.paths, 3600)
      : { data: [] }
    const state = String(row.status).toLowerCase()
    const status = state === 'under_review' ? 'review' : state === 'in_progress' ? 'progress' : state
    const owner = reporter ?? row.reporter
    return { ...row, ...fromLatLng(row.lat, row.lng), reporter: owner, createdAt, updatedAt: new Date(row.updatedAt),
      acceptedAt: row.acceptedAt ? new Date(row.acceptedAt) : null,
      assignedAt: row.assignedAt ? new Date(row.assignedAt) : null,
      status: status as Incident['status'], address: `${row.lat.toFixed(5)}, ${row.lng.toFixed(5)}`, purok: '',
      confirmations: 0, photos: (links ?? []).flatMap(link => link.signedUrl ? [link.signedUrl] : []),
      timeline: [{ status: 'pending' as const, at: createdAt, note: 'Submitted for verification', by: owner.name }] }
  }))
}
