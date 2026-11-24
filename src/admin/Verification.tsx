import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Clock,
  GitMerge,
  Info,
  Maximize2,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldCheck,
  Sparkles,
  TriangleExclamationPoint,
  Users,
  XCircle,
} from 'lucide-react'
import { MapView } from '../components/Map'
import { AIBadge, Avatar, Button, CategoryIcon, CategoryTag, Checkbox, EmptyState, Field, Modal, SearchField, StatusPill, TextArea } from '../components/ui'
import { CATEGORIES, type Category } from '../data/meta'
import type { Incident } from '../data/records'
import { cx, fmtDateTime, fmtTime, timeAgo } from '../lib/format'
import { useStore } from '../store'
import { PageHeader, Panel, Select, useAdmin } from './common'

const REJECT_REASONS = ['Duplicate of an existing report', 'Insufficient evidence / unclear photos', 'Location outside barangay jurisdiction', 'Not an incident / out of scope', 'Already resolved on inspection', 'Other']

export function distM(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.round(Math.hypot(a.x - b.x, (a.y - b.y) * 0.7) * 16)
}

export function Verification() {
  const ctx = useAdmin()
  const { incidents, updateIncident, toast, addAudit } = useStore()
  const queue = useMemo(
    () =>
      incidents
        .filter((i) => i.status === 'pending' || i.status === 'review')
        .sort((a, b) => Number(!!b.danger) - Number(!!a.danger) || b.createdAt.getTime() - a.createdAt.getTime()),
    [incidents],
  )
  const [selId, setSelId] = useState<string | null>(ctx.param && queue.find((q) => q.id === ctx.param) ? ctx.param : queue[0]?.id ?? null)
  const [q, setQ] = useState('')
  const inc = incidents.find((i) => i.id === selId)
  const [photo, setPhoto] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [reject, setReject] = useState(false)
  const [reason, setReason] = useState(REJECT_REASONS[0])
  const [rejectNote, setRejectNote] = useState('')
  const [askInfo, setAskInfo] = useState(false)
  const [askMsg, setAskMsg] = useState('Hello po! Could you send a wider photo showing the nearest landmark? Salamat.')
  const [compare, setCompare] = useState<Incident | null>(null)
  const [applyAI, setApplyAI] = useState<Category | null>(null)
  const [verified, setVerified] = useState<Incident | null>(null)

  const select = (id: string) => {
    setSelId(id)
    setPhoto(0)
    setChecks({})
  }

  const dups = useMemo(() => {
    if (!inc) return []
    return incidents
      .filter((o) => o.id !== inc.id && o.status !== 'rejected')
      .map((o) => {
        const d = distM(o, inc)
        const hrs = Math.abs(o.createdAt.getTime() - inc.createdAt.getTime()) / 3600e3
        const sameCat = o.category === inc.category || (o.ai && inc.ai && o.ai.category === inc.ai.category)
        const listed = inc.duplicates?.includes(o.id)
        const score = Math.round(Math.max(0, (sameCat ? 45 : 5) + Math.max(0, 35 - (d / ctx.settings.dupRadius) * 30) + Math.max(0, 20 - hrs * 2)))
        return { o, d, hrs, score: Math.min(98, score), listed }
      })
      .filter((x) => x.listed || (x.d <= ctx.settings.dupRadius && x.hrs < 24 && x.score >= 55))
      .sort((a, b) => b.score - a.score)
  }, [inc, incidents, ctx.settings.dupRadius])

  const CHECKS = [
    { k: 'photo', l: 'Photos are authentic and match the description' },
    { k: 'loc', l: 'Location confirmed within barangay boundary' },
    { k: 'dup', l: dups.length ? `Reviewed ${dups.length} possible duplicate${dups.length > 1 ? 's' : ''}` : 'No duplicates found' },
    { k: 'cat', l: 'Category and details are accurate' },
  ]
  const doneChecks = CHECKS.filter((c) => checks[c.k]).length

  const shown = queue.filter((i) => !q || `${i.code} ${i.title} ${i.address}`.toLowerCase().includes(q.toLowerCase()))
  const aiLow = inc?.ai ? inc.ai.confidence * 100 < ctx.settings.aiThreshold : false
  const nextId = () => queue.find((x) => x.id !== selId)?.id ?? null

  return (
    <>
      <PageHeader title="Verification" subtitle="Review resident reports before they enter dispatch. No automatic classifications are generated." actions={<span className="rounded-full bg-surface px-3 py-1.5 text-[13px] font-semibold shadow-card ring-1 ring-line">{queue.length} in queue</span>} />
      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        {/* Queue */}
        <Panel bodyClass="p-2" className={inc ? 'xl:sticky xl:top-0 xl:max-h-[calc(100vh-140px)] xl:self-start' : 'xl:self-stretch'}>
          <div className="p-1 pb-2">
            <SearchField value={q} onChange={setQ} placeholder="Filter queue" />
          </div>
          <div className="max-h-[300px] space-y-1 overflow-y-auto xl:max-h-[calc(100vh-220px)]">
            {shown.length === 0 && <EmptyState icon={ClipboardCheck} title="Queue is clear" body="New reports will appear here." />}
            {shown.map((i) => (
              <button key={i.id} onClick={() => select(i.id)} className={cx('flex w-full gap-3 rounded-[14px] p-2.5 text-left transition', selId === i.id ? 'bg-accent-soft ring-1 ring-accent/30' : 'hover:bg-surface-2')}>
                <div className="relative shrink-0">
                  <img src={i.photos[0]} alt="" className="h-12 w-12 rounded-[11px] object-cover" />
                  <span className="absolute -right-1 -bottom-1">
                    <CategoryIcon category={i.category} size={20} solid />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{i.title}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-3">
                    <span className="font-mono">{i.code}</span> · {timeAgo(i.createdAt)}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <StatusPill status={i.status} size="sm" />
                    {i.danger && <span className="rounded-full bg-danger-soft px-1.5 py-px text-[10px] font-bold text-danger">DANGER</span>}
                    {i.duplicates?.length ? <span className="rounded-full bg-[#8b5cf6]/12 px-1.5 py-px text-[10px] font-bold text-[#8b5cf6]">DUP?</span> : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        {/* Workspace */}
        {!inc ? (
          <Panel>
            <EmptyState icon={CircleCheck} title="All caught up" body="There are no reports waiting for verification." action={<Button onClick={() => ctx.go('assign')}>Go to dispatch</Button>} />
          </Panel>
        ) : (
          <div key={inc.id} className="min-w-0 animate-fade-in space-y-4">
            {/* Header */}
            <div className="rounded-[22px] bg-surface p-5 shadow-card ring-1 ring-line">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[12px] text-ink-3">{inc.code}</span>
                    <StatusPill status={inc.status} size="sm" />
                    {inc.danger && (
                      <span className="flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-bold text-danger">
                        <TriangleExclamationPoint size={12} /> People in danger
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-[24px] leading-tight font-bold tracking-tight">{inc.title}</h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-3">
                    <CategoryTag category={inc.category} />
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> {fmtDateTime(inc.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={13} /> ~{inc.affected} affected · {inc.confirmations} confirmations
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="danger-tinted" icon={XCircle} onClick={() => setReject(true)}>
                    Reject
                  </Button>
                  <Button variant="secondary" icon={MessageSquareText} onClick={() => setAskInfo(true)}>
                    Request info
                  </Button>
                  <Button
                    icon={BadgeCheck}
                    onClick={() => {
                      updateIncident(inc.id, { status: 'verified' }, { note: `Reviewed · ${doneChecks}/4 checks complete`, by: ctx.user.name })
                      toast(`${inc.code} verified`, 'success')
                      setVerified(inc)
                      const n = nextId()
                      if (n) select(n)
                      else setSelId(null)
                    }}
                  >
                    Verify
                  </Button>
                </div>
              </div>
              {inc.status === 'pending' && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[14px] bg-[#8b5cf6]/8 px-4 py-3 ring-1 ring-[#8b5cf6]/20">
                  <Info size={17} className="text-[#8b5cf6]" />
                  <span className="flex-1 text-[13px]">This report is pending. Start a review to update its workspace status.</span>
                  <Button size="sm" variant="secondary" onClick={() => (updateIncident(inc.id, { status: 'review' }, { by: ctx.user.name }), toast('Review started'))}>
                    Start review
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-4 2xl:grid-cols-[1fr_380px]">
              <div className="min-w-0 space-y-4">
                {/* Photos */}
                <Panel title="Photographs" subtitle={`${inc.photos.length} submitted`} icon={Camera} bodyClass="px-5 pb-5">
                  <div className="group relative overflow-hidden rounded-[16px] bg-surface-2">
                    <img src={inc.photos[photo]} alt={`${inc.title} photo ${photo + 1}`} className="aspect-[16/9] w-full object-cover" />
                    <button onClick={() => setLightbox(true)} aria-label="Expand photo" className="glass-strong absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full opacity-0 shadow-float transition group-hover:opacity-100">
                      <Maximize2 size={16} />
                    </button>
                    <div className="glass-strong absolute bottom-3 left-3 rounded-full px-3 py-1 text-[11px] font-medium">
                      Captured {fmtTime(inc.createdAt)} · {inc.lat.toFixed(4)}, {inc.lng.toFixed(4)}
                    </div>
                  </div>
                  {inc.photos.length > 1 && (
                    <div className="mt-3 flex gap-2">
                      {inc.photos.map((p, i) => (
                        <button key={i} onClick={() => setPhoto(i)} className={cx('h-16 w-24 overflow-hidden rounded-[11px] ring-2 transition', i === photo ? 'ring-accent' : 'ring-transparent opacity-70 hover:opacity-100')}>
                          <img src={p} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </Panel>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Panel title="Report details">
                    <p className="text-[14px] leading-relaxed">{inc.description}</p>
                    <div className="mt-4 flex items-center gap-3 rounded-[14px] bg-surface-2 p-3">
                      <Avatar name={inc.reporter.name} size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-[13px] font-semibold">
                          {inc.reporter.name} <BadgeCheck size={14} className="text-[#22a06b]" />
                        </div>
                        <div className="text-[12px] text-ink-3">{inc.reporter.verified ? 'Verified resident' : 'Unverified reporter'}</div>
                      </div>
                      <Button size="sm" variant="secondary" icon={Phone} onClick={() => (inc.reporter.phone ? window.location.assign('tel:' + inc.reporter.phone.replace(/[^+\d]/g, '')) : toast('No contact number is available'))}>
                        Call
                      </Button>
                    </div>
                  </Panel>
                  <Panel title="Location" icon={MapPin} bodyClass="px-5 pb-5">
                    <div className="relative h-44 overflow-hidden rounded-[14px] ring-1 ring-line">
                      <MapView className="absolute inset-0" markers={[{ id: inc.id, x: inc.x, y: inc.y, category: inc.category, pulse: true }, ...dups.map((d) => ({ id: d.o.id, x: d.o.x, y: d.o.y, category: d.o.category, dim: true }))]} focus={{ x: inc.x, y: inc.y, zoom: 2.2 }} initialZoom={2.2} landmarks controls={false} />
                    </div>
                    <div className="mt-3 text-[14px] font-semibold">{inc.address}</div>
                    <div className="text-[12px] text-ink-3">
                      {inc.purok}
                      {inc.landmark && ` · near ${inc.landmark}`}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                      <span className="rounded-full bg-[#22a06b]/12 px-2 py-0.5 text-[#1d8a5c] dark:text-[#4ad396]">Boundary not verified</span>
                      <span className="rounded-full bg-[#22a06b]/12 px-2 py-0.5 text-[#1d8a5c] dark:text-[#4ad396]">Location selected by reporter</span>
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-ink-2">
                        {inc.lat}, {inc.lng}
                      </span>
                    </div>
                  </Panel>
                </div>
              </div>

              {/* Right rail */}
              <div className="space-y-4">
                {ctx.settings.aiEnabled && inc.ai ? (
                  <section className="rounded-[22px] bg-surface p-5 shadow-card ring-1 ring-[#7c5cff]/25">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-[16px] font-semibold">
                        <Sparkles size={17} className="text-[#7c5cff]" /> AI classification
                      </h3>
                      <AIBadge compact />
                    </div>
                    <p className="mt-1 text-[12px] text-ink-3">Suggestion only — requires human verification</p>
                    <div className="mt-4 space-y-2.5">
                      {[{ category: inc.ai.category, confidence: inc.ai.confidence }, ...inc.ai.alts].map((s, i) => (
                        <div key={s.category}>
                          <div className="mb-1 flex items-center justify-between text-[13px]">
                            <span className={cx('flex items-center gap-2', i === 0 ? 'font-semibold' : 'text-ink-2')}>
                              <CategoryIcon category={s.category} size={20} /> {CATEGORIES[s.category].label}
                            </span>
                            <span className="font-semibold tabular">{Math.round(s.confidence * 100)}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.confidence * 100}%`, background: i === 0 ? '#7c5cff' : 'var(--ink-3)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {aiLow && (
                      <div className="mt-3 flex gap-2 rounded-[12px] bg-[#ef8a2b]/10 p-2.5 text-[12px] text-ink-2">
                        <TriangleExclamationPoint size={14} className="mt-0.5 shrink-0 text-[#ef8a2b]" />
                        Below your {ctx.settings.aiThreshold}% confidence threshold. Rely on manual review.
                      </div>
                    )}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                      <div className="rounded-[12px] bg-surface-2 p-2.5">
                        <div className="text-ink-3">Est. severity</div>
                        <div className="text-[14px] font-semibold">{inc.ai.severity}</div>
                      </div>
                      <div className="rounded-[12px] bg-surface-2 p-2.5">
                        <div className="text-ink-3">Reported as</div>
                        <div className="truncate text-[14px] font-semibold">{CATEGORIES[inc.category].short}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {inc.ai.tags.map((t) => (
                        <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-[12px] leading-relaxed text-ink-2 italic">"{inc.ai.summary}"</p>
                    {inc.ai.category !== inc.category ? (
                      <div className="mt-4 rounded-[14px] bg-[#7c5cff]/8 p-3">
                        <div className="text-[12px] font-semibold">Differs from resident's category</div>
                        <Button size="sm" variant="secondary" className="mt-2 w-full" onClick={() => setApplyAI(inc.ai!.category)}>
                          Review & apply "{CATEGORIES[inc.ai.category].short}"
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center gap-2 text-[12px] text-ink-2">
                        <CircleCheck size={14} className="text-[#22a06b]" /> Matches the resident's selected category
                      </div>
                    )}
                    <div className="mt-3 border-t border-line pt-3 text-[11px] leading-snug text-ink-3">Classification from the connected AI service; requires human confirmation.</div>
                  </section>
                ) : (
                  <Panel title="AI classification">
                    <p className="text-[13px] text-ink-3">No AI assessment is available for this report.</p>
                  </Panel>
                )}

                <Panel title="Duplicate detection" subtitle={`Within ${ctx.settings.dupRadius} m · last 24 h`} icon={GitMerge} bodyClass="px-3 pb-3">
                  {dups.length === 0 ? (
                    <div className="flex items-center gap-2 px-2 py-2 text-[13px] text-ink-2">
                      <CircleCheck size={16} className="text-[#22a06b]" /> No likely duplicates
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {dups.map(({ o, d, score }) => (
                        <div key={o.id} className="rounded-[14px] bg-surface-2 p-2.5">
                          <div className="flex gap-2.5">
                            <img src={o.photos[0]} alt="" className="h-11 w-11 rounded-[10px] object-cover" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] font-semibold">{o.title}</div>
                              <div className="text-[11px] text-ink-3">
                                {o.code} · {d} m · {timeAgo(o.createdAt)}
                              </div>
                            </div>
                            <span className={cx('h-fit rounded-full px-2 py-0.5 text-[11px] font-bold tabular', score >= 80 ? 'bg-danger-soft text-danger' : 'bg-[#8b5cf6]/12 text-[#8b5cf6]')}>{score}%</span>
                          </div>
                          <div className="mt-2 flex gap-1.5">
                            <Button size="sm" variant="secondary" className="flex-1" onClick={() => setCompare(o)}>
                              Compare
                            </Button>
                            <Button
                              size="sm"
                              variant="tinted"
                              className="flex-1"
                              icon={GitMerge}
                              onClick={() => {
                                updateIncident(o.id, { status: 'rejected', rejectReason: `Merged as duplicate of ${inc.code}.` }, { note: `Merged into ${inc.code}`, by: ctx.user.name })
                                updateIncident(inc.id, { confirmations: inc.confirmations + o.confirmations + 1, photos: [...inc.photos, ...o.photos.filter((p) => !inc.photos.includes(p))].slice(0, 6) })
                                toast(`${o.code} merged into ${inc.code}`, 'success')
                              }}
                            >
                              Merge
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Verification checklist" subtitle={`${doneChecks} of ${CHECKS.length} complete`} icon={ShieldCheck}>
                  <div className="space-y-2.5">
                    {CHECKS.map((c) => (
                      <label key={c.k} className="flex cursor-pointer items-start gap-2.5 text-[13px]">
                        <span className="mt-px">
                          <Checkbox checked={!!checks[c.k]} onChange={(v) => setChecks({ ...checks, [c.k]: v })} label={c.l} />
                        </span>
                        <span className={cx(checks[c.k] && 'text-ink-3 line-through')}>{c.l}</span>
                      </label>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {inc && inc.photos.length > 0 && (
        <Modal open={lightbox} onClose={() => setLightbox(false)} width={1100} title={`${inc.code} · Photo ${photo + 1} of ${inc.photos.length}`}>
          <div className="relative">
            <img src={inc.photos[photo]?.replace('w=900', 'w=1600')} alt="" className="max-h-[70vh] w-full rounded-[16px] object-contain" />
            {inc.photos.length > 1 && (
              <>
                <button onClick={() => setPhoto((photo - 1 + inc.photos.length) % inc.photos.length)} aria-label="Previous" className="glass-strong absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-float">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => setPhoto((photo + 1) % inc.photos.length)} aria-label="Next" className="glass-strong absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-float">
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Reject */}
      <Modal
        open={reject}
        onClose={() => setReject(false)}
        title="Reject report"
        subtitle="The resident will be notified with the reason you select."
        icon={<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-soft text-danger"><XCircle size={20} /></span>}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReject(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!inc) return
                updateIncident(inc.id, { status: 'rejected', rejectReason: `${reason}${rejectNote ? ` — ${rejectNote}` : ''}` }, { note: reason, by: ctx.user.name })
                toast(`${inc.code} rejected`)
                setReject(false)
                setRejectNote('')
                const n = nextId()
                if (n) select(n)
                else setSelId(null)
              }}
            >
              Reject report
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Reason">
            <Select value={reason} onChange={setReason} options={REJECT_REASONS.map((r) => ({ value: r, label: r }))} />
          </Field>
          <Field label="Note to resident (optional)">
            <TextArea rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Explain what was found or what's needed…" />
          </Field>
        </div>
      </Modal>

      {/* Ask info */}
      <Modal
        open={askInfo}
        onClose={() => setAskInfo(false)}
        title="Request more information"
        subtitle={inc ? `Messaging unavailable for ${inc.reporter.name}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAskInfo(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setAskInfo(false)
                
                toast('Messaging is not connected')
              }}
            >
              Send request
            </Button>
          </>
        }
      >
        <TextArea rows={4} value={askMsg} onChange={(e) => setAskMsg(e.target.value)} />
      </Modal>

      {/* Apply AI */}
      <Modal
        open={!!applyAI}
        onClose={() => setApplyAI(null)}
        title="Apply AI-suggested category?"
        icon={<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c5cff]/12 text-[#7c5cff]"><Sparkles size={20} /></span>}
        footer={
          <>
            <Button variant="ghost" onClick={() => setApplyAI(null)}>
              Keep original
            </Button>
            <Button
              onClick={() => {
                if (!inc || !applyAI) return
                updateIncident(inc.id, { category: applyAI })
                addAudit({ actor: ctx.user.name, role: 'official', action: `Applied AI category suggestion → ${CATEGORIES[applyAI].label} (human-confirmed)`, type: 'ai', target: inc.code })
                toast('Category updated after your confirmation', 'success')
                setApplyAI(null)
              }}
            >
              I've verified — apply
            </Button>
          </>
        }
      >
        {inc && applyAI && (
          <div className="space-y-3 text-[14px] text-ink-2">
            <div className="flex items-center gap-3 rounded-[14px] bg-surface-2 p-3">
              <CategoryIcon category={inc.category} size={32} />
              <ArrowRight size={16} />
              <CategoryIcon category={applyAI} size={32} />
              <span className="font-semibold text-ink">
                {CATEGORIES[inc.category].label} → {CATEGORIES[applyAI].label}
              </span>
            </div>
            <p>Please confirm you have personally reviewed the photos and description. This change will be recorded in the audit log under your name.</p>
          </div>
        )}
      </Modal>

      {/* Compare */}
      <Modal open={!!compare} onClose={() => setCompare(null)} width={860} title="Compare reports" subtitle={compare && inc ? `${distM(compare, inc)} m apart · ${Math.round(Math.abs(compare.createdAt.getTime() - inc.createdAt.getTime()) / 60000)} min apart` : ''}>
        {compare && inc && (
          <div className="grid gap-4 md:grid-cols-2">
            {[inc, compare].map((x, i) => (
              <div key={x.id} className="rounded-[18px] bg-surface-2 p-3">
                <div className="mb-2 text-[11px] font-bold tracking-wide text-ink-3 uppercase">{i === 0 ? 'Current report' : 'Possible duplicate'}</div>
                <img src={x.photos[0]} alt="" className="aspect-video w-full rounded-[12px] object-cover" />
                <div className="mt-3 text-[15px] font-semibold">{x.title}</div>
                <div className="text-[12px] text-ink-3">
                  {x.code} · {x.reporter.name} · {fmtDateTime(x.createdAt)}
                </div>
                <p className="mt-2 text-[13px] text-ink-2">{x.description}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* After verify */}
      <Modal
        open={!!verified}
        onClose={() => setVerified(null)}
        width={440}
        title="Report verified"
        icon={<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0ea5b7]/14 text-[#0ea5b7]"><BadgeCheck size={20} /></span>}
        footer={
          <>
            <Button variant="ghost" onClick={() => setVerified(null)}>
              Continue reviewing
            </Button>
            <Button iconRight={ArrowRight} onClick={() => verified && ctx.go('assign', verified.id)}>
              Assess & dispatch
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-ink-2">{verified?.title} is now marked verified in this workspace. Set its priority and assign a responder next.</p>
      </Modal>
    </>
  )
}
