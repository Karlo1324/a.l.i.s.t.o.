import { useEffect, useState, type FormEvent } from 'react'
import { Users } from 'lucide-react'
import { Button, EmptyState, RolePill, TextInput } from '../components/ui'
import { ROLES, type Role } from '../data/meta'
import type { ResponderAccessRequest } from '../lib/staffAuth'
import { ACCESS, PageHeader, Panel, useAdmin } from './common'
import { ResidentAreaAssignments } from './ResidentAreaAssignments'

export function UsersPage() {
  const { token } = useAdmin()
  const [staff, setStaff] = useState<{id: string; name: string; email: string; role: Role}[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('OFFICIAL')
  const [busy, setBusy] = useState(false)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [requestError, setRequestError] = useState('')
  const [responderRequests, setResponderRequests] = useState<ResponderAccessRequest[]>([])
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    import('../lib/staffAuth').then(async ({ listResponderAccessRequests, manageAccounts }) => {
      const accountsResult = await manageAccounts(token)
      if (active) setStaff(accountsResult)
      try {
        const requests = await listResponderAccessRequests(token)
        if (active) {
          setResponderRequests(requests)
          setRequestError('')
        }
      } catch (err) {
        if (active) {
          setResponderRequests([])
          setRequestError(err instanceof Error ? err.message : 'Could not load responder access requests.')
        }
      }
    })
      .catch(err => { if (active) setMessage(err.message) })
    return () => { active = false }
  }, [token, revision])

  async function assign(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      const { manageAccounts } = await import('../lib/staffAuth')
      await manageAccounts(token, { account_email: email.trim(), staff_role: role })
      setMessage(`${email.trim()} now has the ${role === 'ADMIN' ? 'Administrator' : 'Responder (Official)'} role.`)
      setEmail('')
      setRevision(value => value + 1)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Role assignment failed.')
    } finally {
      setBusy(false)
    }
  }

  async function reviewRequest(requestId: string, approved: boolean) {
    if (reviewing) return
    setReviewing(requestId)
    setRequestMessage('')
    try {
      const { reviewResponderAccessRequest } = await import('../lib/staffAuth')
      await reviewResponderAccessRequest(token, requestId, approved)
      setRequestMessage(approved ? 'Responder access approved. The account may need to request or receive a barangay assignment before dispatch.' : 'Responder access request rejected.')
      setRevision(value => value + 1)
    } catch (err) {
      setRequestMessage(err instanceof Error ? err.message : 'Could not review the responder request.')
    } finally {
      setReviewing(null)
    }
  }

  return <>
    <PageHeader title="Users & Roles" subtitle="Manage access for registered accounts." />
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(Object.keys(ROLES) as Role[]).map((role) => <div key={role} className="rounded-2xl bg-surface p-5 ring-1 ring-line"><RolePill role={role} /><div className="mt-3 text-3xl font-bold">{staff.filter((u) => u.role===role).length}</div></div>)}</div>
    <Panel title="Add staff access">
      <form onSubmit={assign} className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.65fr)_auto] md:items-end">
        <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink-2">
          Registered email
          <TextInput required type="email" autoComplete="email" disabled={busy} value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink-2">
          Role
          <select className="h-12 w-full rounded-[14px] bg-surface-2 px-3 text-base font-normal text-ink" value={role} disabled={busy} onChange={e => setRole(e.target.value)}>
            <option value="OFFICIAL">Responder (Official)</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </label>
        <Button type="submit" className="h-12" disabled={!email.trim() || busy} loading={busy}>Assign role</Button>
      </form>
      <p role="status">{message}</p>
    </Panel>
    <Panel title="Responder access requests" subtitle="Approval is required before an account receives staff access.">
      {requestError ? <p role="alert" className="py-3 text-sm text-red-500">{requestError}</p> :
        !responderRequests.length ? <EmptyState icon={Users} title="No pending requests" body="Responder requests from resident registrations will appear here after the account email is confirmed." /> :
        <div className="divide-y divide-line">
          {responderRequests.map(request => (
            <div key={request.request_id} className="flex flex-wrap items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{request.profile_name}</div>
                <div className="truncate text-sm text-ink-3">{request.profile_email} · requested {new Date(request.requested_at).toLocaleDateString()}</div>
              </div>
              <Button size="sm" variant="danger-tinted" disabled={reviewing !== null} onClick={() => void reviewRequest(request.request_id, false)}>Reject</Button>
              <Button size="sm" disabled={reviewing !== null} loading={reviewing === request.request_id} onClick={() => void reviewRequest(request.request_id, true)}>Approve responder</Button>
            </div>
          ))}
        </div>}
      {requestMessage && <p role="status" className="mt-2 text-sm text-ink-2">{requestMessage}</p>}
    </Panel>
    <Panel title="Accounts">{!staff.length ? <EmptyState icon={Users} title="No accounts" body="Registered profiles appear here." /> : <div className="divide-y divide-line">{staff.map((u) => <div key={u.id} className="flex items-center justify-between gap-4 py-4"><div><div className="font-semibold">{u.name}</div><div className="text-sm text-ink-3">{u.email}</div></div><RolePill role={u.role} /></div>)}</div>}</Panel>
    <div className="mt-6"><ResidentAreaAssignments showPicker /></div>
    <div className="mt-6"><Panel title="Workspace views" subtitle="Screen access definitions; these do not authenticate users"><div className="space-y-4 pt-3">{(['official','admin'] as const).map((role) => <div key={role}><RolePill role={role} /><p className="mt-2 text-sm text-ink-2">{ACCESS[role].join(', ')}</p></div>)}</div></Panel></div>
  </>
}
