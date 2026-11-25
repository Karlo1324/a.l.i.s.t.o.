export type StaffRole = 'admin' | 'official' | 'responder'
export interface StaffSession {
  token: string
  expiresAt: number
  role: StaffRole
  id: string
  name: string
  email: string
}

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function staffProfile(token: string, accountId?: string) {
  const response = await fetch(new URL('/rest/v1/rpc/current_staff_profile', url), {
    method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + token }, cache: 'no-store',
  })
  if (!response.ok) throw new Error('Staff access could not be verified.')
  const rows = await response.json()
  const profile = Array.isArray(rows) && rows.length === 1 ? rows[0] : null
  const role = profile?.role?.toLowerCase()
  if (!profile?.id || !['admin', 'official', 'responder'].includes(role)) {
    const accountHint = accountId ? ` Your signed-in account ID ends in ${accountId.slice(-6)}.` : ''
    throw new Error('An active staff account is required.' + accountHint)
  }
  return { id: String(profile.id), name: String(profile.full_name), role: role as StaffRole }
}

export async function signInStaff(identity: { email: string } | { phone: string }, password: string): Promise<StaffSession> {
  if (!url || !key) throw new Error('Staff access is unavailable until Supabase is configured.')
  const response = await fetch(new URL('/auth/v1/token?grant_type=password', url), {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...identity, password }),
  })
  if (!response.ok) throw new Error('Unable to sign in with those credentials.')
  const auth = await response.json()
  if (!auth.access_token || !(auth.expires_in > 0)) throw new Error('Invalid sign-in response.')
  const profile = await staffProfile(auth.access_token, auth.user?.id)
  if (profile.id !== auth.user?.id) throw new Error('Staff profile does not match the signed-in account.')
  return { ...profile, token: auth.access_token, expiresAt: Date.now() + auth.expires_in * 1000, email: auth.user?.email ?? '' }
}

export async function signOutStaff(token: string) {
  await fetch(new URL('/auth/v1/logout?scope=local', url), {
    method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + token },
  })
}
