export type StaffRole = 'admin' | 'official'
export interface StaffSession {
  token: string
  expiresAt: number
  role: StaffRole
  id: string
  name: string
  email: string
}

export interface ResidentAccount {
  id: string
  name: string
  email: string
  barangay_name: string | null
}

export interface ResidentAreaRequest {
  id: string
  profile_id: string
  profile_name: string
  profile_email: string
  profile_role: string
  psgc_code: string
  barangay_name: string
  municipality: string
  province: string
  region: string
  created_at: string
}

export interface MyProfileArea {
  role: string
  barangay_id: string | null
  barangay_name: string | null
  pending: {
    id: string
    psgc_code: string
    barangay_name: string
    municipality: string
    province: string
    region: string
  } | null
}

export interface StaffResponder {
  id: string
  full_name: string
  phone: string
  active_tasks: number
}

export interface ResponderAccessRequest {
  request_id: string
  profile_id: string
  profile_name: string
  profile_email: string
  requested_at: string
}

export type StaffReportAction =
  | 'start_review'
  | 'verify'
  | 'reject'
  | 'assign'
  | 'accept'
  | 'decline'
  | 'start_work'
  | 'resolve'
  | 'update_checklist'
  | 'reopen'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

async function staffRpc<T>(token: string, operation: string, body: Record<string, unknown> = {}) {
  const response = await fetch(new URL('/rest/v1/rpc/' + operation, url), {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || `Could not complete ${operation.replace(/_/g, ' ')}.`)
  }
  const responseBody = await response.text()
  return (responseBody.trim() ? JSON.parse(responseBody) : null) as T
}

export async function staffProfile(token: string, accountId?: string, accountEmail?: string) {
  const response = await fetch(new URL('/rest/v1/rpc/current_staff_profile', url), {
    method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + token }, cache: 'no-store',
  })
  if (!response.ok) throw new Error('Staff access could not be verified.')
  const rows = await response.json()
  const profile = Array.isArray(rows) && rows.length === 1 ? rows[0] : null
  const rawRole = profile?.role?.toLowerCase()
  const role = rawRole === 'responder' ? 'official' : rawRole
  if (!profile?.id || !['admin', 'official'].includes(role)) {
    const accountHint = accountId ? ` Your signed-in account ID ends in ${accountId.slice(-6)}.` : ''
    const emailHint = accountEmail ? ` The signed-in email is ${accountEmail}.` : ''
    throw new Error('This account has no active administrator or responder role.' + accountHint + emailHint)
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
  const profile = await staffProfile(auth.access_token, auth.user?.id, auth.user?.email)
  if (profile.id !== auth.user?.id) throw new Error('Staff profile does not match the signed-in account.')
  return { ...profile, token: auth.access_token, expiresAt: Date.now() + auth.expires_in * 1000, email: auth.user?.email ?? '' }
}

export async function signOutStaff(token: string) {
  await fetch(new URL('/auth/v1/logout?scope=local', url), {
    method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + token },
  })
}

export async function manageAccounts(token: string, assignment?: { account_email: string; staff_role: string }) {
  const operation = assignment ? 'admin_add_staff' : 'admin_accounts'
  const response = await fetch(new URL('/rest/v1/rpc/' + operation, url), {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(assignment ?? {}),
    cache: 'no-store',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || 'Could not reach account management.')
  }
  if (assignment) return []
  return await response.json() as { id: string; name: string; email: string; role: import('../data/meta').Role }[]
}

export function listResidentAccounts(token: string) {
  return staffRpc<ResidentAccount[]>(token, 'admin_resident_accounts')
}

export function createResidentAreaRequest(
  token: string,
  request: { resident_account_id: string; selected_psgc_code: string; selected_barangay_name: string; selected_municipality: string; selected_province: string; selected_region: string },
) {
  return staffRpc<string>(token, 'admin_create_resident_area_request', request)
}

export function listResidentAreaRequests(token: string) {
  return staffRpc<ResidentAreaRequest[]>(token, 'staff_profile_area_requests')
}

export function reviewResidentAreaRequest(token: string, requestId: string, approved: boolean) {
  return staffRpc<null>(token, 'staff_review_resident_area_request', { request_id: requestId, approved })
}

export function getMyProfileArea(token: string) {
  return staffRpc<MyProfileArea>(token, 'my_profile_area')
}

export function requestMyProfileArea(
  token: string,
  request: { selected_psgc_code: string; selected_barangay_name: string; selected_municipality: string; selected_province: string; selected_region: string },
) {
  return staffRpc<string>(token, 'request_my_profile_area', request)
}

export function listStaffResponders(token: string) {
  return staffRpc<StaffResponder[]>(token, 'staff_responder_list')
}

export function listResponderAccessRequests(token: string) {
  return staffRpc<ResponderAccessRequest[]>(token, 'admin_responder_access_requests')
}

export function reviewResponderAccessRequest(token: string, requestId: string, approved: boolean) {
  return staffRpc<null>(token, 'admin_review_responder_access_request', { request_id: requestId, approved })
}

export function updateStaffReport(
  token: string,
  request: {
    reportId: string
    action: StaffReportAction
    rejectionReason?: string
    assigneeId?: string
    priority?: string
    dispatchNotes?: string
    checklist?: { label: string; done: boolean }[]
  },
) {
  return staffRpc<null>(token, 'staff_update_report', {
    p_report_id: request.reportId,
    p_action: request.action,
    p_rejection_reason: request.rejectionReason ?? null,
    p_assignee_id: request.assigneeId ?? null,
    p_priority: request.priority ?? null,
    p_dispatch_notes: request.dispatchNotes ?? null,
    p_checklist: request.checklist ?? null,
  })
}

export async function publishBroadcast(token: string, headline: string, message: string) {
  const response = await fetch(new URL('/rest/v1/rpc/publish_official_broadcast', url), {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ headline, message }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || 'Could not publish the broadcast.')
  }
}
