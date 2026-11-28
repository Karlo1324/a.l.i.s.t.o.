import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button } from './ui'
import { PsgcLocationPicker, type PsgcSelection } from './PsgcLocationPicker'
import type { MyProfileArea } from '../lib/staffAuth'

export function ProfileBarangaySettings({ token }: { token: string }) {
  const [profileArea, setProfileArea] = useState<MyProfileArea | null>(null)
  const [selection, setSelection] = useState<PsgcSelection | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [revision, setRevision] = useState(0)
  const [pickerRevision, setPickerRevision] = useState(0)
  const onSelectionChange = useCallback((value: PsgcSelection | null) => setSelection(value), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    import('../lib/staffAuth').then(({ getMyProfileArea }) => getMyProfileArea(token)).then(result => {
      if (active) setProfileArea(result)
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not load your reporting area.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [token, revision])

  async function submitRequest(event: FormEvent) {
    event.preventDefault()
    if (busy || !selection) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { requestMyProfileArea } = await import('../lib/staffAuth')
      await requestMyProfileArea(token, {
        selected_psgc_code: selection.barangay.code,
        selected_barangay_name: selection.barangay.name,
        selected_municipality: selection.city.name,
        selected_province: selection.province?.name ?? (selection.region.code === '130000000' ? 'Metro Manila' : selection.region.name),
        selected_region: selection.region.name,
      })
      setMessage('Request sent. Your reporting area will update after an admin or official approves it.')
      setSelection(null)
      setPickerRevision(value => value + 1)
      setRevision(value => value + 1)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit your reporting area request.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Reporting barangay</h3>
          <p className="mt-1 text-sm text-ink-2">Your reports are routed to your assigned barangay.</p>
        </div>
        <Button size="sm" variant="secondary" disabled={loading} onClick={() => setRevision(value => value + 1)}>Refresh</Button>
      </div>
      {loading ? <p className="mt-3 text-sm text-ink-2" role="status">Loading your reporting area…</p>
        : error && !profileArea ? <p className="mt-3 text-sm text-danger" role="alert">{error}</p>
          : profileArea?.barangay_id ? <p className="mt-3 text-sm" role="status">Assigned to <strong>{profileArea.barangay_name ?? 'a reporting barangay'}</strong>.</p>
            : <>
              {profileArea?.pending && <p className="mt-3 text-sm text-ink-2" role="status">
                Pending approval: <strong>{profileArea.pending.barangay_name}, {profileArea.pending.municipality}, {profileArea.pending.province}</strong>.
                You can submit a different selection below while it is pending.
              </p>}
              <form onSubmit={submitRequest} className="mt-4 space-y-4">
                <PsgcLocationPicker onChange={onSelectionChange} resetKey={pickerRevision} />
                {error && <p className="text-sm text-danger" role="alert">{error}</p>}
                {message && <p className="text-sm text-success" role="status">{message}</p>}
                <Button type="submit" loading={busy} disabled={!selection}>
                  {profileArea?.pending ? 'Update pending request' : 'Request barangay assignment'}
                </Button>
              </form>
            </>}
    </section>
  )
}
