import { toByteArray } from 'base64-js'
import type { SQLiteDatabase } from 'expo-sqlite'
import { categories, type Draft } from './drafts'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
type Login = { access_token: string; refresh_token: string; user: { id: string; email: string; user_metadata?: { full_name?: string } }; expires_in: number }
export type Session = { token: string; uid: string; expires: number; email: string; name: string; refresh: string }

async function request(path: string, body: string | Uint8Array, token?: string, photo = false, method = 'POST') {
  if (!url || !key) throw new Error('Supabase is missing from this build.')
  const response = await fetch(url + path, {
    method, headers: {
      apikey: key, ...(token ? { Authorization: 'Bearer ' + token } : {}),
      'Content-Type': photo ? 'image/jpeg' : 'application/json',
    }, body: method === 'GET' ? undefined : typeof body === 'string' ? body : new Uint8Array(body).buffer,
  })
  const raw = await response.text()
  const result = raw ? JSON.parse(raw) : null
  if (!response.ok && !(photo && result.error === 'Duplicate')) {
    throw new Error(result.message || result.msg || result.error_description || 'Request failed.')
  }
  return result
}

export async function login(email: string, password: string): Promise<Session> {
  const result: Login = await request('/auth/v1/token?grant_type=password', JSON.stringify({ email: email.trim(), password }))
  return sessionFrom(result)
}

function sessionFrom(result: Login): Session {
  return { token: result.access_token, uid: result.user.id, expires: Date.now() + result.expires_in * 1000,
    email: result.user.email, name: result.user.user_metadata?.full_name || result.user.email, refresh: result.refresh_token }
}

export async function refreshLogin(session: Session) {
  return sessionFrom(await request('/auth/v1/token?grant_type=refresh_token', JSON.stringify({refresh_token: session.refresh})))
}
export async function register(name: string, email: string, password: string, responder: boolean) {
  const result = await request('/auth/v1/signup', JSON.stringify({email: email.trim(), password,
    data: { full_name: name.trim(), requested_role: responder ? 'OFFICIAL' : 'RESIDENT' }}))
  return result.access_token ? sessionFrom(result) : null
}
export async function rpc<T>(session: Session, name: string, args = {}): Promise<T> {
  return request('/rest/v1/rpc/' + name, JSON.stringify(args), session.token)
}
export type Report = {id:string; code:string; title:string; description:string; category:string; status:string;
  landmark:string; lat:number; lng:number; affected:number; danger:boolean; createdAt:string; paths:string[]}
export type News = {id:string;title:string;body:string;published_at:string}
export type Notice = {createdAt:string;kind:string;id:string;title:string;body:string;read:boolean;incidentId?:string}
export function news(session: Session): Promise<News[]> {
  return request('/rest/v1/official_broadcasts?select=id,title,body,published_at&order=published_at.desc&limit=30','',session.token,false,'GET')
}
export async function evidence(session: Session, path: string) {
  const result = await request('/storage/v1/object/sign/incident-evidence/' + path.split('/').map(encodeURIComponent).join('/'),
    JSON.stringify({expiresIn: 600}), session.token)
  return url + '/storage/v1' + result.signedURL
}

export async function send(db: SQLiteDatabase, draft: Draft, session: Session, coordinates: string, gps: boolean, affected: number, danger: boolean, anonymous = false) {
  const parts = coordinates.split(',').map(value => value.trim())
  const [lat, lng] = parts.map(Number)
  if (parts.length !== 2 || parts.some(v => !v) || !Number.isFinite(lat) || !Number.isFinite(lng)
      || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error('Enter latitude and longitude or use device location.')
  await db.runAsync(`INSERT OR IGNORE INTO deliveries(draft, owner, uuid) VALUES (?, ?,
    lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-8'||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))))`, draft.id, session.uid)
  const row = await db.getFirstAsync<{uuid: string; owner: string; reference: string | null}>('SELECT * FROM deliveries WHERE draft=?', draft.id)
  if (!row || row.owner !== session.uid) throw new Error('Sign in with the account that started sending this report.')
  if (row.reference) return row.reference
  const paths: string[] = []
  for (const [index, photo] of (draft.photos ?? (draft.photo ? [draft.photo] : [])).entries()) {
    const path = session.uid + '/' + row.uuid + '/' + row.uuid + (index ? '-' + index : '')
    const bytes = toByteArray(photo.replace(/^data:image\/jpeg;base64,/, ''))
    if (!bytes.length || bytes.length >= 5000000) throw new Error('Photo must be under 5 MB.')
    await request('/storage/v1/object/incident-evidence/' + path, bytes, session.token, true)
    paths.push(path)
  }
  const category = ['flooding','road','building','tree','landslide','electrical','other'][categories.findIndex(c => c === draft.category)]
  const reference = await request('/rest/v1/rpc/submit_resident_report', JSON.stringify({ d: {
    id: row.uuid, title: draft.title, description: draft.description, category, lat, lng,
    source: gps ? 'GPS' : 'MANUAL', landmark: draft.place, affected, danger, anonymous, paths,
  } }), session.token)
  if (typeof reference !== 'string' || !reference.trim()) throw new Error('Missing report reference. Please retry.')
  await db.runAsync('UPDATE deliveries SET reference=? WHERE draft=?', reference, draft.id)
  return reference
}
