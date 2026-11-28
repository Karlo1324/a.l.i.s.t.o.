import { BroadcastFeed } from './BroadcastFeed'
import { useState } from 'react'
import { Bell, Inbox, Plus } from 'lucide-react'
import { Button, EmptyState, IconButton, Sheet, StatusPill } from '../components/ui'
import { Switch } from './ResidentControls'
import { MapView } from '../components/Map'
import type { Announcement } from '../data/records'
import { useStore } from '../store'
import { Screen, useNav } from './common'

export const LEVEL: Record<Announcement['level'], { color: string; label: string }> = {
  critical: { color: '#e5372a', label: 'Critical' }, warning: { color: '#ef8a2b', label: 'Warning' },
  info: { color: '#3b6ef0', label: 'Advisory' }, community: { color: '#22a06b', label: 'Community' },
}

export function Home() {
  const nav = useNav()
  const { resident, signedIn, incidents, residentNotifs } = useStore()
  const mine = incidents.filter((i) => i.reporter.id === resident.id && !['resolved','rejected'].includes(i.status))
  return <Screen title="Home" right={<IconButton icon={Bell} label="Notifications" badge={residentNotifs.filter((n) => !n.read).length} onClick={() => nav.push({name:'notifications'})} />}>
    <div className="space-y-6 px-4">
      <div className="rounded-2xl bg-surface p-4 text-sm text-ink-2 ring-1 ring-line">{signedIn ? resident.name : 'Guest workspace'} · records clear on refresh.</div>
      <Button size="lg" className="w-full" icon={Plus} onClick={() => nav.push({name:'report'})}>Add an incident</Button>
      {signedIn && <BroadcastFeed key={resident.id} />}
      <section><h2 className="mb-3 text-lg font-bold">Your active reports</h2>{!mine.length ? <EmptyState icon={Inbox} title="No reports yet" /> : mine.map((i) => <button key={i.id} onClick={() => nav.push({name:'reportDetail',id:i.id})} className="mb-2 flex w-full items-center justify-between gap-3 rounded-2xl bg-surface p-4 text-left"><span>{i.title}</span><StatusPill status={i.status} size="sm" /></button>)}</section>
      <section className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line"><MapView className="h-52" interactive={false} controls={false} autoLocate followLocation markers={incidents.filter((i) => !['resolved','rejected'].includes(i.status)).map((i) => ({id:i.id,x:i.x,y:i.y,category:i.category}))} /><Button variant="ghost" className="w-full" onClick={() => nav.setTab('map')}>Open incident map</Button></section>

    </div>
  </Screen>
}

export function HotlinesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <Sheet open={open} onClose={onClose} title="Emergency contacts"><p className="py-4 text-ink-2">No verified emergency contacts have been configured for this community.</p></Sheet>
}

export function GoBagSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState(['Drinking water','Ready-to-eat food','Flashlight & batteries','First aid kit & medicines','Important documents','Power bank','Whistle & raincoat'].map((label) => ({label,done:false})))
  return <Sheet open={open} onClose={onClose} title="Go Bag checklist"><div className="space-y-3">{items.map((item,i) => <div key={item.label} className="flex items-center justify-between gap-3 py-2"><span>{item.label}</span><Switch checked={item.done} label={item.label} onChange={(done) => setItems((list) => list.map((x,j) => i===j?{...x,done}:x))} /></div>)}</div></Sheet>
}
