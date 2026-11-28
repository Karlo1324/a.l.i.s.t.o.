import { useState } from 'react'
import { BellOff, Megaphone, Share2, Tent, TriangleExclamationPoint, Users } from 'lucide-react'
import { Button, EmptyState } from '../components/ui'
import { Segmented } from './ResidentControls'
import { ANNOUNCEMENTS } from '../data/records'
import { STATUSES } from '../data/meta'
import { cx, fmtDateTime, timeAgo } from '../lib/format'
import { useStore } from '../store'
import { Screen, useNav } from './common'
import { LEVEL } from './Home'

export function Notifications() {
  const nav = useNav()
  const { residentNotifs, markResidentRead } = useStore()
  const [seg, setSeg] = useState<'all' | 'reports' | 'advisories'>('all')
  const list = residentNotifs.filter((n) => (seg === 'all' ? true : seg === 'reports' ? n.kind === 'status' : n.kind !== 'status'))
  const today = list.filter((n) => Date.now() - n.at.getTime() < 12 * 3600e3)
  const earlier = list.filter((n) => Date.now() - n.at.getTime() >= 12 * 3600e3)

  const Item = ({ n }: { n: (typeof list)[number] }) => {
    const color = n.kind === 'status' && n.status ? STATUSES[n.status].color : n.kind === 'alert' ? '#e5372a' : n.kind === 'community' ? '#22a06b' : '#3b6ef0'
    const Icon = n.kind === 'alert' ? TriangleExclamationPoint : n.kind === 'community' ? Users : n.kind === 'announcement' ? Tent : Megaphone
    return (
      <button
        onClick={() => {
          markResidentRead(n.id)
          if (n.incidentId) nav.push({ name: 'reportDetail', id: n.incidentId })
          else if (n.announcementId) nav.push({ name: 'announcement', id: n.announcementId })
        }}
        className="group flex w-full items-start gap-3 pl-4 text-left active:bg-surface-2"
      >
        <span className="mt-3.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
          {n.kind === 'status' ? <span className="h-3 w-3 rounded-full" style={{ background: color }} /> : <Icon size={18} />}
        </span>
        <div className="flex-1 border-b border-line py-3.5 pr-4 group-last:border-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cx('text-[15px]', n.read ? 'font-medium' : 'font-semibold')}>{n.title}</span>
            <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-ink-3">
              {timeAgo(n.at)}
              {!n.read && <span className="h-2 w-2 rounded-full bg-accent" />}
            </span>
          </div>
          <div className="mt-0.5 text-[14px] leading-snug text-ink-2">{n.body}</div>
        </div>
      </button>
    )
  }

  return (
    <Screen
      title="Notifications"
      onBack={nav.pop}
      back="Home"
      right={
        <button onClick={() => markResidentRead()} className="text-[16px] text-accent">
          Read all
        </button>
      }
    >
      <div className="px-4">
        <Segmented full value={seg} onChange={setSeg} options={[{ value: 'all', label: 'All' }, { value: 'reports', label: 'My Reports' }, { value: 'advisories', label: 'Advisories' }]} />
      </div>
      {list.length === 0 && <EmptyState icon={BellOff} title="You're all caught up" />}
      {[
        { h: 'Today', l: today },
        { h: 'Earlier', l: earlier },
      ].map(
        (g) =>
          g.l.length > 0 && (
            <div key={g.h} className="mt-5 px-4">
              <div className="px-1 pb-2 text-[13px] font-semibold tracking-wide text-ink-3 uppercase">{g.h}</div>
              <div className="overflow-hidden rounded-[20px] bg-surface shadow-card ring-1 ring-line">
                {g.l.map((n) => (
                  <Item key={n.id} n={n} />
                ))}
              </div>
            </div>
          ),
      )}
    </Screen>
  )
}

export function AnnouncementDetail({ id }: { id: string }) {
  const nav = useNav()
  const { toast } = useStore()
  const a = ANNOUNCEMENTS.find((x) => x.id === id)
  if (!a) return <Screen title="Advisory" onBack={nav.pop}><EmptyState icon={Megaphone} title="No advisory available" /></Screen>
  const lv = LEVEL[a.level]
  return (
    <Screen title="Advisory" large={false} onBack={nav.pop} right={<button aria-label="Share" onClick={() => toast('Advisory sharing is unavailable without a server')} className="p-2 text-accent"><Share2 size={20} /></button>}>
      <div className="px-5">
        {a.image && <img src={a.image} alt="" className="mb-5 h-52 w-full rounded-[24px] object-cover shadow-card" />}
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold tracking-wide uppercase" style={{ background: `color-mix(in srgb, ${lv.color} 14%, transparent)`, color: lv.color }}>
          <TriangleExclamationPoint size={13} /> {lv.label}
        </span>
        <h1 className="mt-3 text-[28px] leading-tight font-bold tracking-[-0.02em]">{a.title}</h1>
        <div className="mt-2 text-[13px] text-ink-3">
          {a.source} · {fmtDateTime(a.at)}
        </div>
        <p className="mt-5 text-[17px] leading-[1.6] text-ink">{a.body}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="tinted" size="lg" onClick={() => nav.openSheet('gobag')}>
            Go Bag
          </Button>
          <Button variant="secondary" size="lg" onClick={() => nav.setTab('map')}>
            Evacuation map
          </Button>
        </div>
      </div>
    </Screen>
  )
}
