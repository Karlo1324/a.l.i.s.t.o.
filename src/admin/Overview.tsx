import { useState } from 'react'
import { CircleCheck, Inbox, ListChecks, Users } from 'lucide-react'
import { MapView } from '../components/Map'
import { Button, EmptyState, StatusPill } from '../components/ui'
import { useStore } from '../store'
import { Kpi, PageHeader, Panel, useAdmin } from './common'
import { IncidentDrawer } from './IncidentDrawer'

import { BroadcastForm } from './BroadcastForm'

import { OfficialOverview } from './OfficialOverview'

export function Overview() {
  return useAdmin().role === 'official' ? <OfficialOverview /> : <StandardOverview />
}

function StandardOverview() {
  const ctx = useAdmin()
  const { incidents, staff, audit } = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const list = incidents
  const open = list.filter((i) => !['resolved', 'rejected'].includes(i.status))
  const waiting = list.filter((i) => ['pending', 'review'].includes(i.status))
  return <>
    <PageHeader title="Overview" subtitle="Records entered in this workspace" actions={<Button variant="secondary" onClick={() => ctx.go('monitor')}>Open map</Button>} />
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="Open incidents" value={open.length} icon={Inbox} color="#3b6ef0" />
      <Kpi label="Awaiting verification" value={waiting.length} icon={ListChecks} color="#8b5cf6" />
      <Kpi label="Resolved incidents" value={list.filter((i) => i.status === 'resolved').length} icon={CircleCheck} color="#22a06b" />
      <Kpi label={ctx.role === 'admin' ? 'Staff accounts' : 'Assigned incidents'} value={ctx.role === 'admin' ? staff.filter((u) => u.role !== 'resident').length : list.filter((i) => !!i.assignee && !['resolved', 'rejected'].includes(i.status)).length} icon={Users} color="#0ea5b7" />
    </div>
    <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
      <Panel title="Incident map" subtitle={`${open.length} open incidents`} bodyClass="px-2 pb-2">
        <MapView className="h-[420px] rounded-2xl" markers={open.map((i) => ({id:i.id,x:i.x,y:i.y,category:i.category,status:i.status}))} onSelect={setSelected} selectedId={selected} clusters />
      </Panel>
      <Panel title="Recent reports">
        {!list.length ? <EmptyState icon={Inbox} title="No reports yet" body="Reports you add will appear here." /> : [...list].sort((a,b) => b.createdAt.getTime()-a.createdAt.getTime()).slice(0,8).map((i) => <button key={i.id} onClick={() => setSelected(i.id)} className="flex w-full items-center justify-between gap-3 border-b border-line py-3 text-left"><span className="min-w-0 truncate text-sm">{i.title}</span><StatusPill status={i.status} size="sm" /></button>)}
      </Panel>
    </div>
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      {ctx.role === 'official' && <BroadcastForm />}
      <Panel title="Workspace activity"><p className="pt-2 text-sm text-ink-2">{audit.length} recorded actions. Server health and account statistics are unavailable until a service is connected.</p></Panel>
    </div>
    <IncidentDrawer incident={list.find((i) => i.id === selected)} onClose={() => setSelected(null)} />
  </>
}
