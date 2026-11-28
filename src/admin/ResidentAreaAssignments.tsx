import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { MapPin, Users } from 'lucide-react'
import { Button, EmptyState } from '../components/ui'
import { PsgcLocationPicker, type PsgcSelection } from '../components/PsgcLocationPicker'
import type { ResidentAccount, ResidentAreaRequest } from '../lib/staffAuth'
import { Panel, useAdmin } from './common'

const fieldClass = 'h-12 w-full rounded-[14px] bg-surface-2 px-3.5 text-[15px] text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-accent/60 disabled:opacity-60'

export function ResidentAreaAssignments({ showPicker = false }: { showPicker?: boolean }) {
  const { token } = useAdmin()
  const [residents, setResidents] = useState<ResidentAccount[]>([])
  const [requests, setRequests] = useState<ResidentAreaRequest[]>([])
  const [residentId, setResidentId] = useState('')
  const [selection, setSelection] = useState<PsgcSelection | null>(null)
  const [loadingResidents, setLoadingResidents] = useState(showPicker)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [busy, setBusy] = useState(false)
  const [workingId, setWorkingId] = useState('')
  const [workingAction, setWorkingAction] = useState<'approve' | 'reject' | null>(null)
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [requestError, setRequestError] = useState('')
  const [residentError, setResidentError] = useState('')
  const [revision, setRevision] = useState(0)
  const [pickerRevision, setPickerRevision] = useState(0)
  const handleSelectionChange = useCallback((value: PsgcSelection | null) => setSelection(value), [])

  useEffect(() => {
    let active = true
    setLoadingRequests(true)
    setRequestError('')
    import('../lib/staffAuth').then(({ listResidentAreaRequests }) => listResidentAreaRequests(token)).then(rows => {
      if (active) setRequests(rows)
    }).catch(error => {
      if (active) setRequestError(error instanceof Error ? error.message : 'Could not load resident area requests.')
    }).finally(() => {
      if (active) setLoadingRequests(false)
    })
    return () => { active = false }
  }, [token, revision])

  useEffect(() => {
    if (!showPicker) return
    let active = true
    setLoadingResidents(true)
    import('../lib/staffAuth').then(({ listResidentAccounts }) => listResidentAccounts(token)).then(rows => {
      if (active) setResidents(rows)
    }).catch(error => {
      if (active) setResidentError(error instanceof Error ? error.message : 'Could not load resident accounts.')
    }).finally(() => {
      if (active) setLoadingResidents(false)
    })
    return () => { active = false }
  }, [showPicker, token])

  async function submitRequest(event: FormEvent) {
    event.preventDefault()
    if (busy || !residentId || !selection) return
    setBusy(true)
    setFormError('')
    setFormMessage('')
    try {
      const { createResidentAreaRequest } = await import('../lib/staffAuth')
      await createResidentAreaRequest(token, {
        resident_account_id: residentId,
        selected_psgc_code: selection.barangay.code,
        selected_barangay_name: selection.barangay.name,
        selected_municipality: selection.city.name,
        selected_province: selection.province?.name ?? (selection.region.code === '130000000' ? 'Metro Manila' : selection.region.name),
        selected_region: selection.region.name,
      })
      setFormMessage('Assignment request submitted. The resident remains unassigned until an admin or official approves it.')
      setResidentId('')
      setPickerRevision(value => value + 1)
      setRevision(value => value + 1)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not submit the resident area request.')
    } finally {
      setBusy(false)
    }
  }

  async function reviewRequest(id: string, approved: boolean) {
    if (workingId) return
    setWorkingId(id)
    setWorkingAction(approved ? 'approve' : 'reject')
    setRequestError('')
    try {
      const { reviewResidentAreaRequest } = await import('../lib/staffAuth')
      await reviewResidentAreaRequest(token, id, approved)
      setRevision(value => value + 1)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Could not review the resident area request.')
    } finally {
      setWorkingId('')
      setWorkingAction(null)
    }
  }

  return (
    <>
      {showPicker && <>
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight">Resident reporting areas</h2>
          <p className="mt-1 text-sm text-ink-2">Select a barangay from PSGC Cloud v2. Assignments are sent for approval before they update Supabase profiles.</p>
        </div>
        <Panel title="Request a resident area assignment" icon={MapPin} subtitle="The resident will be able to submit reports to the selected barangay after approval.">
          <form onSubmit={submitRequest} className="space-y-4 pt-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink-2">Resident</span>
              <select className={fieldClass} required value={residentId} disabled={loadingResidents || busy} onChange={event => setResidentId(event.target.value)}>
                <option value="">{loadingResidents ? 'Loading residents…' : 'Choose an active resident'}</option>
                {residents.map(resident => (
                  <option key={resident.id} value={resident.id}>
                    {resident.name} — {resident.email}{resident.barangay_name ? ` (currently ${resident.barangay_name})` : ' (unassigned)'}
                  </option>
                ))}
              </select>
              {residentError && <span className="mt-1 block text-sm text-danger">{residentError}</span>}
            </label>
            <PsgcLocationPicker onChange={handleSelectionChange} resetKey={pickerRevision} />
            {formError && <p className="text-sm text-danger" role="alert">{formError}</p>}
            {formMessage && <p className="text-sm text-success" role="status">{formMessage}</p>}
            <Button type="submit" loading={busy} disabled={!residentId || !selection}>Submit pending assignment</Button>
          </form>
        </Panel>
      </>}

      <div className={showPicker ? 'mt-6' : ''}>
        <Panel
          title="Pending barangay approvals"
          icon={Users}
          subtitle="An active admin or official can review requests from residents and staff."
          action={<Button variant="secondary" disabled={loadingRequests} onClick={() => setRevision(value => value + 1)}>Refresh</Button>}
        >
          {requestError && <p className="mb-3 text-sm text-danger" role="alert">{requestError}</p>}
          {loadingRequests ? <p className="py-3 text-sm text-ink-2" role="status">Loading pending requests…</p>
            : requests.length === 0 ? <EmptyState icon={MapPin} title="No pending area requests" body="New requests from residents and staff will appear here." />
              : <div className="divide-y divide-line">
                {requests.map(request => (
                  <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <div className="font-semibold">{request.profile_name} <span className="text-xs font-medium uppercase text-ink-3">· {request.profile_role.toLowerCase()}</span></div>
                      <div className="text-sm text-ink-3">{request.profile_email}</div>
                      <div className="mt-1 text-sm text-ink-2">
                        {request.barangay_name}, {request.municipality}, {request.province} · PSGC {request.psgc_code}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="secondary" disabled={!!workingId} loading={workingId === request.id && workingAction === 'reject'} onClick={() => reviewRequest(request.id, false)}>Reject</Button>
                      <Button disabled={!!workingId} loading={workingId === request.id && workingAction === 'approve'} onClick={() => reviewRequest(request.id, true)}>Approve</Button>
                    </div>
                  </div>
                ))}
              </div>}
        </Panel>
      </div>
    </>
  )
}
