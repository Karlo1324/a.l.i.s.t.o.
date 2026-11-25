import type { Incident } from '../data/records'
import { supabase } from './supabase'
import { fromLatLng, toLatLng } from './geo'
import type { NewReport } from '../store'

export async function submitResidentReport(id: string, userId: string, report: NewReport, source: 'GPS' | 'MANUAL', uploads: Map<string, string>) {
  const paths: string[] = []
  for (const preview of report.photos) {
    let path = uploads.get(preview)
    if (!path) {
      const blob = await (await fetch(preview)).blob()
      path = `${userId}/${id}/${crypto.randomUUID()}`
      const { error } = await supabase.storage.from('incident-evidence').upload(path, blob, { contentType: blob.type })
      if (error) throw new Error(error.message)
      uploads.set(preview, path)
    }
    paths.push(path)
  }
  const [lat, lng] = toLatLng(report)
  const { photos, ...details } = report
  const { data, error } = await supabase.rpc('submit_resident_report', { d: { ...details, id, lat, lng, source, paths } })
  if (error || typeof data !== 'string') throw new Error(error?.message || 'Could not confirm report submission.')
  return { id, code: data }
}

export async function loadResidentReports(reporter: Incident['reporter']): Promise<Incident[]> {
  const { data, error } = await supabase.rpc('my_resident_reports')
  if (error) throw new Error(error.message)
  return Promise.all((data ?? []).map(async (row: Incident & { paths: string[] }) => {
    const createdAt = new Date(row.createdAt)
    const { data: links } = row.paths.length
      ? await supabase.storage.from('incident-evidence').createSignedUrls(row.paths, 3600)
      : { data: [] }
    const state = String(row.status).toLowerCase()
    const status = state === 'under_review' ? 'review' : state === 'in_progress' ? 'progress' : state
    return { ...row, ...fromLatLng(row.lat, row.lng), reporter, createdAt, updatedAt: new Date(row.updatedAt),
      status: status as Incident['status'], address: `${row.lat.toFixed(5)}, ${row.lng.toFixed(5)}`, purok: '',
      confirmations: 0, photos: (links ?? []).flatMap(link => link.signedUrl ? [link.signedUrl] : []),
      timeline: [{ status: 'pending' as const, at: createdAt, note: 'Submitted for verification', by: reporter.name }] }
  }))
}
