import { useRef, useState } from 'react'
import { ArrowUpRight, Inbox } from 'lucide-react'
import { MapView } from '../components/Map'
import { Button, EmptyState, StatusPill } from '../components/ui'
import { PRIORITIES, PRIORITY_KEYS, type Priority } from '../data/meta'
import { useStore } from '../store'
import { Panel, useAdmin } from './common'
import { BroadcastForm } from './BroadcastForm'
import { IncidentDrawer } from './IncidentDrawer'

function rank(priority?: Priority) {
  return priority ? PRIORITY_KEYS.indexOf(priority) : PRIORITY_KEYS.length
}

export function OfficialOverview() {
  const { incidents, audit } = useStore()
  const { go } = useAdmin()
  const [selectedId, select] = useState<string | null>(null)
  const [detailId, openDetail] = useState<string | null>(null)
  const headlineRef = useRef<HTMLInputElement>(null)
  const queue = incidents.filter(i => i.status !== 'resolved' && i.status !== 'rejected')
  queue.sort((a, b) => rank(a.priority) - rank(b.priority) || a.createdAt.getTime() - b.createdAt.getTime())
  const selected = queue.find(i => i.id === selectedId)
  const metrics = [
    ['Open incidents', queue.length],
    ['Awaiting verification', queue.filter(i => ['pending', 'review'].includes(i.status)).length],
    ['Assigned', queue.filter(i => i.assignee).length],
    ['Resolved', incidents.filter(i => i.status === 'resolved').length],
  ] as const
  return <div className="space-y-5">
    <header className="rounded-3xl bg-[#222521] p-6 text-[#f4f4ee] md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Incident overview</h1>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => headlineRef.current?.focus()} className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold hover:bg-white/10">New broadcast</button>
          <button onClick={() => go('monitor')} className="flex items-center gap-2 rounded-full bg-[#cede62] px-4 py-2 text-sm font-semibold text-[#202219]">Open map <ArrowUpRight size={15} /></button>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-5 border-t border-white/20 pt-5 sm:grid-cols-4">
        {metrics.map(([label, value]) => <div key={label}><dt className="text-sm text-[#c7cbc2]">{label}</dt><dd className="mt-1 text-4xl font-medium tabular-nums">{value}</dd></div>)}
      </dl>
    </header>
    <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_2fr]">
      <Panel title="Action queue" subtitle="Highest priority first">
        {queue.length === 0 && <EmptyState icon={Inbox} title="No open incidents" body="Open reports will appear here." />}
        <div className="max-h-96 space-y-1 overflow-y-auto">{queue.map(i =>
          <button key={i.id} aria-pressed={selectedId === i.id} onClick={() => select(i.id)} className="block w-full rounded-xl border border-transparent p-3 text-left hover:bg-surface-2 aria-pressed:border-[#a2ad54] aria-pressed:bg-[#cede62]/15">
            <span className="flex items-center justify-between gap-2 text-xs text-ink-2">{i.code}<StatusPill status={i.status} size="sm" /></span>
            <strong className="mt-1 block text-sm">{i.title}</strong>
            <span className={'text-xs ' + (i.priority === 'critical' ? 'font-bold text-danger' : 'text-ink-2')}>{i.priority ? PRIORITIES[i.priority].label : 'Priority pending'}</span>
          </button>)}</div>
      </Panel>
      <Panel title="Incident map" bodyClass="px-2 pb-2">
        <MapView className="h-80 rounded-2xl md:h-96" markers={queue} selectedId={selected?.id} onSelect={select} focus={selected && { x: selected.x, y: selected.y, key: selected.id }} />
        {selected && <div className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div><strong>{selected.title}</strong><p className="text-sm text-ink-2">{selected.address} · {selected.assigneeName || (selected.assignee ? 'Responder assigned' : 'Unassigned')}</p></div>
          <Button variant="secondary" onClick={() => openDetail(selected.id)}>View report</Button>
        </div>}
      </Panel>
    </div>
    <div className="grid gap-4 md:grid-cols-2"><BroadcastForm headlineRef={headlineRef} /><Panel title="Workspace activity"><p className="text-sm text-ink-2">{audit.length} recorded actions</p></Panel></div>
    <IncidentDrawer incident={incidents.find(i => i.id === detailId)} onClose={() => openDetail(null)} />
  </div>
}
