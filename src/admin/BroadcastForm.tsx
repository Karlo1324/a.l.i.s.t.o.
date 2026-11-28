import { useState, type Ref, type FormEvent } from 'react'
import { Button, Field, TextArea, TextInput } from '../components/ui'
import { Panel, useAdmin } from './common'

export function BroadcastForm({ headlineRef }: { headlineRef?: Ref<HTMLInputElement> }) {
  const { token } = useAdmin()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  async function publish(event: FormEvent) {
    event.preventDefault()
    if (busy || !title.trim() || !body.trim()) return
    setBusy(true)
    setStatus('')
    try {
      const { publishBroadcast } = await import('../lib/staffAuth')
      await publishBroadcast(token, title.trim(), body.trim())
      setTitle('')
      setBody('')
      setStatus('Broadcast published to resident Home screens.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not publish the broadcast.')
    } finally {
      setBusy(false)
    }
  }

  return <Panel title="Resident broadcast" subtitle="Visible to all signed-in residents.">
    <form onSubmit={publish} className="space-y-3">
      {!title && !body && <button type="button" disabled={busy} className="text-sm font-semibold text-accent hover:underline" onClick={() => {
        setTitle('Heavy rain advisory')
        setBody('Heavy rain has been reported in our area. Please avoid flooded roads and watch for further updates.')
        setStatus('')
      }}>Use heavy rain template</button>}
      <Field label="Headline"><TextInput ref={headlineRef} required disabled={busy} value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></Field>
      <Field label="Message"><TextArea required disabled={busy} rows={4} value={body} maxLength={3000} onChange={e => setBody(e.target.value)} /></Field>
      <Button type="submit" loading={busy} disabled={!title.trim() || !body.trim()}>Publish broadcast</Button>
      <p role="status">{status}</p>
    </form>
  </Panel>
}
