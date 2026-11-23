import { useState } from 'react'
import { ChevronLeft, CircleCheck, ClipboardList, MapPin, MessageCircle, MessageSquarePlus, Phone, Share, Sparkles, Star, Truck, Undo2, XCircle } from 'lucide-react'
import { Avatar, Button, CategoryIcon, CategoryTag, EmptyState, Segmented, Sheet, StatusPill, TextArea } from '../components/ui'
import { MapView } from '../components/Map'
import { CATEGORIES, STATUS_FLOW, STATUSES } from '../data/meta'
import { LOCAL_RESIDENT, RESPONDERS } from '../data/records'
import { cx, fmtDateTime, fmtTime, timeAgo } from '../lib/format'
import { useStore } from '../store'
import { Screen, StatusTrack, useNav } from './common'

export function MyReports() {
  const nav = useNav()
  const { incidents } = useStore()
  const [seg, setSeg] = useState<'active' | 'closed' | 'all'>('active')
  const mine = incidents.filter((i) => i.reporter.id === LOCAL_RESIDENT.id)
  const shown = mine.filter((i) => (seg === 'all' ? true : seg === 'active' ? !['resolved', 'rejected'].includes(i.status) : ['resolved', 'rejected'].includes(i.status)))
  const resolved = mine.filter((i) => i.status === 'resolved').length

  return (
    <Screen title="My Reports">
      <div className="px-4">
        <div className="mb-4 grid grid-cols-3 gap-2.5">
          {[
            { l: 'Submitted', v: mine.length, c: 'var(--ink)' },
            { l: 'In progress', v: mine.length - resolved - mine.filter((i) => i.status === 'rejected').length, c: '#ef8a2b' },
            { l: 'Resolved', v: resolved, c: '#22a06b' },
          ].map((s) => (
            <div key={s.l} className="rounded-[18px] bg-surface p-3 shadow-card ring-1 ring-line">
              <div className="text-[24px] font-bold tabular" style={{ color: s.c }}>
                {s.v}
              </div>
              <div className="text-[12px] font-medium text-ink-3">{s.l}</div>
            </div>
          ))}
        </div>
        <Segmented full value={seg} onChange={setSeg} options={[{ value: 'active', label: 'Active' }, { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }]} />
        <div className="mt-4 space-y-3">
          {shown.length === 0 && <EmptyState icon={ClipboardList} title="Nothing here yet" body="Reports you submit will appear here with live status updates." action={<Button onClick={() => nav.push({ name: 'report' })}>Report an incident</Button>} />}
          {shown.map((i) => (
            <button key={i.id} onClick={() => nav.push({ name: 'reportDetail', id: i.id })} className="block w-full animate-slide-up overflow-hidden rounded-[22px] bg-surface text-left shadow-card ring-1 ring-line active:scale-[0.99]">
              <div className="flex gap-3 p-3.5">
                {i.photos[0] ? <img src={i.photos[0]} alt="" className="h-[72px] w-[72px] shrink-0 rounded-[16px] object-cover" /> : <CategoryIcon category={i.category} size={72} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold" style={{ color: CATEGORIES[i.category].color }}>
                      {CATEGORIES[i.category].label}
                    </span>
                    <span className="text-[12px] text-ink-3">{timeAgo(i.updatedAt)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[16px] font-semibold">{i.title}</div>
                  <div className="truncate text-[13px] text-ink-3">
                    {i.code} · {i.address}
                  </div>
                </div>
              </div>
              <div className="border-t border-line px-3.5 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <StatusPill status={i.status} size="sm" />
                  <span className="text-[12px] text-ink-3">{STATUSES[i.status].desc}</span>
                </div>
                <StatusTrack status={i.status} compact />
              </div>
            </button>
          ))}
        </div>
      </div>
    </Screen>
  )
}

export function ReportDetail({ id }: { id: string }) {
  const nav = useNav()
  const { getIncident, toast, updateIncident } = useStore()
  const inc = getIncident(id)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [addInfo, setAddInfo] = useState(false)
  const [info, setInfo] = useState('')
  const [withdraw, setWithdraw] = useState(false)
  const [rating, setRating] = useState(0)
  if (!inc) return null
  const mine = inc.reporter.id === LOCAL_RESIDENT.id
  const responder = RESPONDERS.find((r) => r.id === inc.assignee)
  const idx = STATUS_FLOW.indexOf(inc.status)

  return (
    <Screen headerless bottomPad={false} className="pb-12">
      {/* hero */}
      <div className="relative h-[340px] bg-surface-3">
        {inc.photos.length ? (
          <div
            className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
            onScroll={(e) => setPhotoIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          >
            {inc.photos.map((p, i) => (
              <img key={i} src={p} alt={`${inc.title} photo ${i + 1}`} className="h-full w-full shrink-0 snap-center object-cover" />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <CategoryIcon category={inc.category} size={88} />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="absolute inset-x-0 top-[54px] flex items-center justify-between px-4">
          <button onClick={nav.pop} aria-label="Back" className="glass-strong flex h-10 w-10 items-center justify-center rounded-full shadow-float">
            <ChevronLeft size={24} />
          </button>
          <button onClick={() => toast('Report sharing is unavailable without a server')} aria-label="Share" className="glass-strong flex h-10 w-10 items-center justify-center rounded-full shadow-float">
            <Share size={18} />
          </button>
        </div>
        {inc.photos.length > 1 && (
          <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/30 px-2 py-1.5 backdrop-blur">
            {inc.photos.map((_, i) => (
              <span key={i} className={cx('h-1.5 rounded-full bg-white transition-all', i === photoIdx ? 'w-4' : 'w-1.5 opacity-50')} />
            ))}
          </div>
        )}
      </div>

      <div className="relative -mt-6 rounded-t-[28px] bg-bg px-4 pt-5">
        <div className="px-1">
          <div className="flex items-center justify-between">
            <CategoryTag category={inc.category} />
            <span className="font-mono text-[12px] text-ink-3">{inc.code}</span>
          </div>
          <h1 className="mt-2 text-[26px] leading-tight font-bold tracking-[-0.02em]">{inc.title}</h1>
          <div className="mt-2 flex items-center gap-2 text-[13px] text-ink-3">
            <MapPin size={14} /> {inc.address} · {inc.purok.split(' · ')[0]}
          </div>
        </div>

        {/* status card */}
        <div className="mt-5 rounded-[22px] bg-surface p-4 shadow-card ring-1 ring-line">
          <div className="flex items-center justify-between">
            <StatusPill status={inc.status} />
            <span className="text-[12px] text-ink-3">Updated {timeAgo(inc.updatedAt)}</span>
          </div>
          {inc.status !== 'rejected' && (
            <div className="mt-4 flex items-start">
              {STATUS_FLOW.map((s, i) => (
                <div key={s} className="relative flex flex-1 flex-col items-center">
                  {i > 0 && <span className="absolute top-[9px] right-1/2 left-[-50%] h-[2px]" style={{ background: i <= idx ? STATUSES[inc.status].color : 'var(--surface-3)' }} />}
                  <span className={cx('relative z-[1] flex h-5 w-5 items-center justify-center rounded-full text-white transition', i === idx && 'ring-4')} style={{ background: i <= idx ? STATUSES[inc.status].color : 'var(--surface-3)', ['--tw-ring-color' as string]: `color-mix(in srgb, ${STATUSES[inc.status].color} 25%, transparent)` }}>
                    {i < idx && <CircleCheck size={12} strokeWidth={3} />}
                  </span>
                  <span className={cx('mt-1.5 text-center text-[10px] leading-tight font-medium', i <= idx ? 'text-ink' : 'text-ink-3')}>{STATUSES[s].label}</span>
                </div>
              ))}
            </div>
          )}
          {inc.status === 'rejected' && (
            <div className="mt-3 flex gap-2.5 rounded-[14px] bg-danger-soft p-3 text-[13px] leading-relaxed">
              <XCircle size={18} className="shrink-0 text-danger" />
              <span>{inc.rejectReason ?? 'This report could not be validated by the barangay.'}</span>
            </div>
          )}
        </div>

        {/* responder */}
        {responder && ['assigned', 'progress', 'resolved'].includes(inc.status) && (
          <div className="mt-3 rounded-[22px] bg-surface p-4 shadow-card ring-1 ring-line">
            <div className="mb-3 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">Assigned responder</div>
            <div className="flex items-center gap-3">
              <Avatar name={responder.name} size={46} />
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-semibold">{responder.name}</div>
                <div className="text-[13px] text-ink-3">{responder.team}</div>
              </div>
              <button onClick={() => toast('Messaging is not connected')} aria-label="Message" className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                <MessageCircle size={18} />
              </button>
              <button onClick={() => (responder.phone ? window.location.assign('tel:' + responder.phone.replace(/[^+\d]/g, '')) : toast('No contact number is available'))} aria-label="Call" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22a06b]/14 text-[#22a06b]">
                <Phone size={18} />
              </button>
            </div>
            {inc.status !== 'resolved' && (
              <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-surface-2 px-3 py-2.5 text-[13px]">
                <Truck size={16} className="text-accent" />
                <span className="flex-1">{responder.vehicle}</span>
                <span className="font-semibold">{inc.status === 'progress' ? `On site · ${inc.progress ?? 0}%` : 'Arrival time unavailable'}</span>
              </div>
            )}
          </div>
        )}

        {/* timeline */}
        <div className="mt-6 px-1">
          <h3 className="mb-3 text-[19px] font-bold tracking-tight">Activity</h3>
          <div className="relative">
            {[...inc.timeline].reverse().map((t, i, arr) => (
              <div key={i} className="relative flex gap-3 pb-5 last:pb-0">
                {i < arr.length - 1 && <span className="absolute top-6 bottom-0 left-[11px] w-[2px] bg-line-2" />}
                <span className="relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${STATUSES[t.status].color} 18%, var(--bg))` }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUSES[t.status].color }} />
                </span>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-semibold">{STATUSES[t.status].label}</span>
                    <span className="text-[12px] text-ink-3 tabular">{i === 0 ? timeAgo(t.at) : fmtTime(t.at)}</span>
                  </div>
                  <div className="text-[14px] text-ink-2">{t.note}</div>
                  <div className="text-[12px] text-ink-3">{t.by}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* description */}
        <div className="mt-6 rounded-[22px] bg-surface p-4 shadow-card ring-1 ring-line">
          <div className="mb-1.5 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">Description</div>
          <p className="text-[15px] leading-relaxed">{inc.description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
            {inc.danger && <span className="rounded-full bg-danger-soft px-2.5 py-1 font-semibold text-danger">People in danger</span>}
            <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium text-ink-2">~{inc.affected} affected</span>
            <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium text-ink-2">Reported {fmtDateTime(inc.createdAt)}</span>
          </div>
        </div>

        {/* location */}
        <div className="mt-3 overflow-hidden rounded-[22px] bg-surface shadow-card ring-1 ring-line">
          <div className="relative h-40">
            <MapView interactive={false} controls={false} markers={[{ id: inc.id, x: inc.x, y: inc.y, category: inc.category }]} focus={{ x: inc.x, y: inc.y, zoom: 2.4 }} initialZoom={2.4} className="absolute inset-0" landmarks />
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <div className="text-[15px] font-semibold">{inc.address}</div>
              <div className="font-mono text-[12px] text-ink-3">
                {inc.lat.toFixed(5)}° N, {inc.lng.toFixed(5)}° E
              </div>
            </div>
            <Button size="sm" variant="tinted" onClick={() => nav.setTab('map')}>
              Open map
            </Button>
          </div>
        </div>

        {mine && !['resolved', 'rejected'].includes(inc.status) && (
          <div className="mt-5 space-y-2">
            <Button size="lg" variant="secondary" className="w-full" icon={MessageSquarePlus} onClick={() => setAddInfo(true)}>
              Add more information
            </Button>
            {inc.status === 'pending' && (
              <Button size="lg" variant="ghost" className="w-full text-danger" icon={Undo2} onClick={() => setWithdraw(true)}>
                Withdraw report
              </Button>
            )}
          </div>
        )}
        {!mine && (
          <div className="mt-5 flex items-center gap-2 rounded-[18px] bg-accent-soft p-3.5 text-[13px] text-ink-2">
            <Sparkles size={16} className="shrink-0 text-accent" />
            Reported by {inc.anonymous ? 'an anonymous reporter' : inc.reporter.verified ? 'a verified resident' : 'an unverified reporter'} · {inc.confirmations} workspace confirmations.
          </div>
        )}
      </div>

      <Sheet open={addInfo} onClose={() => setAddInfo(false)} title="Add information">
        <TextArea rows={4} value={info} onChange={(e) => setInfo(e.target.value)} placeholder="e.g. Water has risen another 10 cm in the last hour" autoFocus />
        <Button
          size="lg"
          className="mt-4 w-full"
          disabled={info.trim().length < 3}
          onClick={() => {
            setAddInfo(false)
            setInfo('')
            updateIncident(inc.id, { timeline: [...inc.timeline, { status: inc.status, at: new Date(), by: inc.anonymous ? 'Anonymous reporter' : LOCAL_RESIDENT.name, note: info.trim() }] })
            toast('Information added to the local report', 'success')
          }}
        >
          Send update
        </Button>
      </Sheet>
      <Sheet open={withdraw} onClose={() => setWithdraw(false)}>
        <div className="pt-2 text-center">
          <div className="text-[19px] font-bold">Withdraw this report?</div>
          <p className="mt-1 text-[15px] text-ink-2">Officials will no longer review it. You can submit a new one anytime.</p>
          <Button
            size="lg"
            variant="danger"
            className="mt-5 w-full"
            onClick={() => {
              updateIncident(inc.id, { status: 'rejected', rejectReason: 'Withdrawn by the resident.' }, { note: 'Withdrawn by resident', by: LOCAL_RESIDENT.name, role: 'resident' })
              setWithdraw(false)
              toast('Report withdrawn')
            }}
          >
            Withdraw
          </Button>
          <Button size="lg" variant="ghost" className="mt-2 w-full" onClick={() => setWithdraw(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </Screen>
  )
}
