import { useState } from 'react'
import { BadgeCheck, Camera, CircleCheck, Paperclip, Clock, MapPin, Navigation, Phone, Play, Siren, Truck } from 'lucide-react'
import { MapView } from '../components/Map'
import { Avatar, Button, CategoryIcon, Checkbox, PriorityPill, ProgressBar, StatusPill, TextArea } from '../components/ui'
import { CATEGORIES, PRIORITIES, STATUSES, type Status } from '../data/meta'
import { type Incident } from '../data/records'
import { cx, fmtTime, timeAgo } from '../lib/format'
import { useStore } from '../store'
import { Drawer, PageHeader, Select, useAdmin } from './common'

const SLA_MIN = { critical: 30, high: 120, medium: 480, low: 2880 }

function sla(i: Incident) {
  if (!i.priority || i.status === 'resolved') return null
  const assignedAt = i.assignedAt ?? [...i.timeline].reverse().find((t) => t.status === 'assigned')?.at ?? i.updatedAt
  const left = SLA_MIN[i.priority] - (Date.now() - assignedAt.getTime()) / 60000
  const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`)
  return left >= 0 ? { label: `Due in ${fmt(left)}`, over: false, soon: left < 30 } : { label: `Overdue ${fmt(-left)}`, over: true, soon: false }
}

export function Tasks() {
  const ctx = useAdmin()
  const { incidents, toast, refreshOfficialFeed } = useStore()
  const isResp = ctx.role === 'official'
  const [who, setWho] = useState<string>(isResp ? ctx.user.responderId ?? '' : 'all')
  const [open, setOpen] = useState<string | null>(ctx.param ?? null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<Status | null>(null)

  const tasks = incidents.filter((i) => i.assignee && ['assigned', 'progress', 'resolved'].includes(i.status) && (!isResp || i.assignee === ctx.user.responderId) && (who === 'all' || i.assignee === who))
  const responders = [...new Map(incidents.filter(i => i.assignee).map(i => [i.assignee!, { id: i.assignee!, name: i.assigneeName ?? i.assignee! }])).values()]
  const cols: { s: Status; hint: string }[] = [
    { s: 'assigned', hint: 'Dispatched, not yet on site' },
    { s: 'progress', hint: 'Team working on site' },
    { s: 'resolved', hint: 'Completed tasks' },
  ]
  const move = async (i: Incident, s: Status) => {
    if (!isResp || !i.assignee || i.assignee !== ctx.user.responderId) return
    if (i.status === s) return
    const order = ['assigned', 'progress', 'resolved']
    if (order.indexOf(s) < order.indexOf(i.status)) return toast('Tasks can only move forward', 'danger')
    if (i.acceptanceStatus !== 'accepted') return toast('Accept this dispatch before updating task progress.', 'danger')
    try {
      const { updateStaffReport } = await import('../lib/staffAuth')
      await updateStaffReport(ctx.token, { reportId: i.id, action: s === 'progress' ? 'start_work' : 'resolve' })
      refreshOfficialFeed()
      toast(`${i.code} → ${STATUSES[s].label}`, 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update this task.', 'danger')
    }
  }

  const sel = tasks.find((i) => i.id === open)

  return (
    <>
      <PageHeader
        title={isResp ? 'My Tasks' : 'Responder Tasks'}
        subtitle={isResp ? 'Accept or decline new dispatches, then update your task progress.' : 'Review assignments and see which responders accepted each task.'}
        actions={
          !isResp && (
            <Select
              value={who}
              onChange={setWho}
              icon={Truck}
              align="right"
              className="w-[260px]"
              options={[{ value: 'all', label: 'All responders' }, ...responders.map((r) => ({ value: r.id, label: `${r.name} · ${incidents.filter((i) => i.assignee === r.id && i.status !== 'resolved').length} active` }))]}
            />
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {cols.map((c) => {
          const list = tasks.filter((t) => t.status === c.s).sort((a, b) => (a.priority ? Object.keys(SLA_MIN).indexOf(a.priority) : 9) - (b.priority ? Object.keys(SLA_MIN).indexOf(b.priority) : 9))
          return (
            <div
              key={c.s}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(c.s)
              }}
              onDragLeave={() => setOver(null)}
              onDrop={() => {
                const i = incidents.find((x) => x.id === dragId)
                if (i && (i.acceptanceStatus === 'accepted' || i.status !== 'assigned')) void move(i, c.s)
                setDragId(null)
                setOver(null)
              }}
              className={cx('flex min-h-[420px] flex-col rounded-[24px] bg-surface-2/70 p-3 ring-1 ring-line transition', over === c.s && 'bg-accent-soft ring-2 ring-accent/50')}
            >
              <div className="mb-3 flex items-center justify-between px-2 pt-1">
                <div>
                  <div className="flex items-center gap-2 text-[15px] font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUSES[c.s].color }} />
                    {STATUSES[c.s].label}
                    <span className="rounded-full bg-surface px-2 text-[12px] text-ink-2 tabular ring-1 ring-line">{list.length}</span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-ink-3">{c.hint}</div>
                </div>
              </div>
              <div className="space-y-2.5">
                {list.map((t) => {
                  const canMove = isResp && t.assignee === ctx.user.responderId && t.acceptanceStatus === 'accepted'
                  const s = sla(t)
                  return (
                    <div
                      key={t.id}
                      draggable={canMove && t.status !== 'resolved'}
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setOpen(t.id)}
                      className={cx('cursor-pointer rounded-[18px] bg-surface p-3.5 shadow-card ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-float', dragId === t.id && 'opacity-50', canMove && t.status !== 'resolved' && 'active:cursor-grabbing')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <CategoryIcon category={t.category} size={34} />
                          <div className="min-w-0">
                            <div className="truncate text-[14px] font-semibold">{t.title}</div>
                            <div className="font-mono text-[11px] text-ink-3">{t.code}</div>
                          </div>
                        </div>
                        <PriorityPill priority={t.priority} size="sm" />
                      </div>
                      <div className="mt-2.5 flex items-center gap-1 text-[12px] text-ink-3">
                        <MapPin size={12} /> {t.address} · {t.purok.split(' · ')[0]}
                      </div>
                      {(t.status === 'assigned' || t.acceptanceStatus === 'accepted' || t.acceptanceStatus === 'declined') && <div className={cx('mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold', t.acceptanceStatus === 'accepted' ? 'bg-[#22a06b]/12 text-[#1d8a5c] dark:text-[#4ad396]' : t.acceptanceStatus === 'declined' ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-ink-2')}>
                        {t.acceptanceStatus === 'accepted' ? <><BadgeCheck size={12} /> Accepted by {t.assigneeName ?? 'responder'}</> : t.acceptanceStatus === 'declined' ? 'Declined — reassign needed' : 'Awaiting response'}
                      </div>}
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-[11px]">
                          <span className="text-ink-3">{t.checklist ? `${t.checklist.filter((c) => c.done).length}/${t.checklist.length} steps` : 'Progress'}</span>
                          <span className="font-semibold tabular">{t.progress ?? 0}%</span>
                        </div>
                        <ProgressBar value={t.progress ?? 0} color={STATUSES[t.status].color} />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        {t.assigneeName && (
                          <span className="flex items-center gap-1.5 text-[12px] text-ink-2">
                            <Avatar name={t.assigneeName} size={22} /> {t.assigneeName}
                          </span>
                        )}
                        {s ? (
                          <span className={cx('flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', s.over ? 'bg-danger-soft text-danger' : s.soon ? 'bg-[#ef8a2b]/12 text-[#c56a12] dark:text-[#f5a352]' : 'bg-surface-2 text-ink-2')}>
                            <Clock size={11} /> {s.label}
                          </span>
                        ) : (
                          <span className="text-[11px] text-ink-3">Closed {timeAgo(t.updatedAt)}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {list.length === 0 && <div className="rounded-[18px] border-[1.5px] border-dashed border-line-2 p-6 text-center text-[13px] text-ink-3">Drop tasks here</div>}
              </div>
            </div>
          )
        })}
      </div>
      <TaskDrawer inc={sel} onClose={() => setOpen(null)} onMove={move} isResponder={isResp} />
    </>
  )
}

function TaskDrawer({ inc, onClose, onMove, isResponder }: { inc?: Incident; onClose: () => void; onMove: (i: Incident, s: Status) => void; isResponder: boolean }) {
  const ctx = useAdmin()
  const { toast, refreshOfficialFeed } = useStore()
  const [note, setNote] = useState('')
  const [attach, setAttach] = useState(false)
  const [updates, setUpdates] = useState<Record<string, { note: string; at: Date; photo?: string; by: string }[]>>({})
  const [saving, setSaving] = useState(false)
  if (!inc) return <Drawer open={false} onClose={onClose}>{null}</Drawer>
  const s = sla(inc)
  const toggle = (idx: number, v: boolean) => {
    const cl = inc.checklist!.map((c, i) => (i === idx ? { ...c, done: v } : c))
    setSaving(true)
    void import('../lib/staffAuth').then(({ updateStaffReport }) => updateStaffReport(ctx.token, { reportId: inc.id, action: 'update_checklist', checklist: cl })).then(() => {
      refreshOfficialFeed()
    }).catch(error => {
      toast(error instanceof Error ? error.message : 'Could not save this checklist.', 'danger')
    }).finally(() => setSaving(false))
  }
  const answerDispatch = async (action: 'accept' | 'decline') => {
    setSaving(true)
    try {
      const { updateStaffReport } = await import('../lib/staffAuth')
      await updateStaffReport(ctx.token, { reportId: inc.id, action })
      refreshOfficialFeed()
      toast(action === 'accept' ? 'Dispatch accepted' : 'Dispatch declined', action === 'accept' ? 'success' : 'default')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update this dispatch.', 'danger')
    } finally {
      setSaving(false)
    }
  }
  const r = inc.assigneeName
  const feedWithProgress = [...(updates[inc.id] ?? []), ...(inc.status === 'progress' && inc.progress ? [{ note: `Progress at ${inc.progress}% — work ongoing`, at: inc.updatedAt, by: r ?? '' }] : [])]
  return (
    <Drawer open onClose={onClose} width={560} title={<span className="flex items-center gap-2"><span className="font-mono text-[13px] text-ink-3">{inc.code}</span><StatusPill status={inc.status} size="sm" /></span>}>
      <div className="px-5 pt-4 pb-6">
        <div className="flex items-start gap-3">
          <CategoryIcon category={inc.category} size={46} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[20px] leading-tight font-bold">{inc.title}</h2>
            <div className="mt-1 text-[13px] text-ink-3">
              {inc.address} · {inc.purok}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
          <div className="rounded-[14px] bg-surface-2 p-2.5">
            <div className="text-ink-3">Priority</div>
            <PriorityPill priority={inc.priority} size="sm" />
          </div>
          <div className="rounded-[14px] bg-surface-2 p-2.5">
            <div className="text-ink-3">SLA {inc.priority ? PRIORITIES[inc.priority].sla : ''}</div>
            <div className={cx('font-semibold', s?.over && 'text-danger')}>{s?.label ?? 'Met'}</div>
          </div>
          <div className="rounded-[14px] bg-surface-2 p-2.5">
            <div className="text-ink-3">Responder</div>
            <div className="truncate font-semibold">{r ?? '—'}</div>
          </div>
        </div>
        {inc.assignee && (inc.status === 'assigned' || inc.acceptanceStatus === 'accepted' || inc.acceptanceStatus === 'declined') && (
          <div className={cx('mt-3 rounded-[14px] p-3 text-[13px]', inc.acceptanceStatus === 'accepted' ? 'bg-[#22a06b]/10 text-[#1d8a5c] dark:text-[#4ad396]' : inc.acceptanceStatus === 'declined' ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-ink-2')}>
            <div className="font-semibold">
              {inc.acceptanceStatus === 'accepted' ? `Accepted by ${r ?? 'responder'}` : inc.acceptanceStatus === 'declined' ? `${r ?? 'Responder'} declined this dispatch` : `Awaiting ${r ?? 'responder'}’s response`}
            </div>
            {inc.acceptanceStatus === 'accepted' && inc.acceptedAt && <div className="mt-0.5 text-[11px] opacity-80">{fmtTime(inc.acceptedAt)}</div>}
            {isResponder && inc.assignee === ctx.user.responderId && inc.acceptanceStatus === 'pending' && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={saving} onClick={() => void answerDispatch('accept')}>Accept task</Button>
                <Button size="sm" variant="danger-tinted" disabled={saving} onClick={() => void answerDispatch('decline')}>Decline</Button>
              </div>
            )}
          </div>
        )}
        {inc.dispatchNotes && <div className="mt-3 rounded-[14px] bg-surface-2 p-3 text-[13px]"><div className="font-semibold">Dispatch instructions</div><p className="mt-1 whitespace-pre-wrap text-ink-2">{inc.dispatchNotes}</p></div>}

        <div className="relative mt-4 h-44 overflow-hidden rounded-[16px] ring-1 ring-line">
          <MapView className="absolute inset-0" interactive={false} controls={false} markers={[{ id: inc.id, x: inc.x, y: inc.y, category: inc.category }]} focus={{ x: inc.x, y: inc.y, zoom: 1.7 }} initialZoom={1.7} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" icon={Navigation} onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${inc.lat},${inc.lng}`, '_blank', 'noopener,noreferrer')}>
            Navigate
          </Button>
          <Button size="sm" variant="secondary" icon={Phone} onClick={() => (inc.reporter.phone ? window.location.assign('tel:' + inc.reporter.phone.replace(/[^+\d]/g, '')) : toast('No contact number is available'))}>
            Call reporter
          </Button>
          <Button size="sm" variant="danger-tinted" icon={Siren} onClick={() => toast('Backup requests are not connected')}>
            Request backup
          </Button>
        </div>

        {inc.checklist && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">Task checklist</h3>
              <span className="text-[12px] font-semibold tabular text-ink-3">{inc.progress ?? 0}%</span>
            </div>
            <ProgressBar value={inc.progress ?? 0} color={CATEGORIES[inc.category].color} />
            <div className="mt-3 space-y-2">
              {inc.checklist.map((c, i) => (
                <label key={c.label} className={cx('flex cursor-pointer items-center gap-3 rounded-[12px] bg-surface-2 px-3 py-2.5 text-[13px]', inc.status === 'resolved' && 'pointer-events-none')}>
                  <Checkbox checked={c.done} disabled={saving || inc.status === 'resolved' || (isResponder && inc.acceptanceStatus !== 'accepted')} onChange={(v) => toggle(i, v)} label={c.label} />
                  <span className={cx(c.done && 'text-ink-3 line-through')}>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {isResponder && inc.status !== 'resolved' && (
          <div className="mt-6 rounded-[18px] p-4 ring-1 ring-line">
            <h3 className="text-[15px] font-semibold">Post field update</h3>
            <TextArea rows={3} className="mt-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's the situation on the ground?" />
            <div className="mt-3 flex items-center justify-between">
              <Button size="sm" variant="ghost" icon={Camera} disabled>
                {attach ? 'Remove photo' : 'Attach photo'}
              </Button>
              <Button
                size="sm"
                disabled={note.trim().length < 3}
                onClick={() => {
                  setUpdates({ ...updates, [inc.id]: [{ note, at: new Date(), by: ctx.user.responderId ? ctx.user.name : r ?? ctx.user.name, photo: undefined }, ...(updates[inc.id] ?? [])] })
                  setNote('')
                  setAttach(false)
                  toast('Update saved in this panel only', 'success')
                }}
              >
                Post update
              </Button>
            </div>
          </div>
        )}

        <h3 className="mt-6 mb-3 text-[15px] font-semibold">Updates</h3>
        <div className="space-y-3">
          {feedWithProgress.map((u, i) => (
            <div key={i} className="flex gap-3">
              <Avatar name={u.by || 'Field'} size={28} />
              <div className="flex-1 rounded-[14px] bg-surface-2 px-3 py-2 text-[13px]">
                <div className="flex justify-between text-[11px] text-ink-3">
                  <span className="font-semibold text-ink-2">{u.by}</span>
                  {fmtTime(u.at)}
                </div>
                <div className="mt-0.5">{u.note}</div>
                {u.photo && <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-accent"><Paperclip size={11} /> 1 photo attached</div>}
              </div>
            </div>
          ))}
          {[...inc.timeline].reverse().map((t, i) => (
            <div key={`t${i}`} className="flex gap-3 text-[13px]">
              <span className="mt-1.5 ml-2.5 h-2 w-2 shrink-0 rounded-full" style={{ background: STATUSES[t.status].color }} />
              <div className="flex-1 pl-2">
                <span className="font-semibold">{STATUSES[t.status].label}</span> <span className="text-ink-2">· {t.note}</span>
                <div className="text-[11px] text-ink-3">
                  {t.by} · {fmtTime(t.at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {isResponder && inc.status !== 'resolved' && (
        <div className="sticky bottom-0 flex gap-2 border-t border-line bg-surface/95 px-5 py-3.5 backdrop-blur">
          {inc.status === 'assigned' && inc.acceptanceStatus === 'accepted' && (
            <Button className="flex-1" icon={Play} disabled={saving} onClick={() => void onMove(inc, 'progress')}>
              Start work on site
            </Button>
          )}
          {inc.status === 'progress' && (
            <Button className="flex-1 bg-[#22a06b] text-white" icon={CircleCheck} disabled={saving} onClick={() => { void onMove(inc, 'resolved'); onClose() }}>
              Mark resolved
            </Button>
          )}
        </div>
      )}
    </Drawer>
  )
}
