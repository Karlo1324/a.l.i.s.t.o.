import { useMemo, useState } from 'react'
import { BadgeCheck, CircleCheck, Gauge, MapPin, Send, Sparkles, Star, Truck, Users } from 'lucide-react'
import { MapView } from '../components/Map'
import { AIBadge, Avatar, Button, CategoryIcon, EmptyState, Field, PriorityPill, Segmented, StatusPill, Switch, TextArea } from '../components/ui'
import { CATEGORIES, PRIORITIES, PRIORITY_KEYS, type Category, type Priority } from '../data/meta'
import { RESPONDERS } from '../data/records'
import { cx, timeAgo } from '../lib/format'
import { useStore } from '../store'
import { PageHeader, Panel, useAdmin } from './common'
import { distM } from './Verification'

const FACTORS = [
  { k: 'life', l: 'Hazard to life', opts: ['None', 'Possible', 'Imminent'] },
  { k: 'pop', l: 'People affected', opts: ['< 10', '10 – 50', '50+'] },
  { k: 'infra', l: 'Infrastructure impact', opts: ['Minor', 'Moderate', 'Severe'] },
  { k: 'spread', l: 'Escalation risk', opts: ['Low', 'Medium', 'High'] },
] as const
type FactorKey = (typeof FACTORS)[number]['k']

const CHECKLISTS: Record<Category, string[]> = {
  flooding: ['Secure area and warn residents', 'Clear drainage / deploy pumps', 'Assist evacuation if needed', 'Final photo documentation'],
  road: ['Install warning cones', 'Measure and document damage', 'Temporary patch or barricade', 'Reopen lane'],
  building: ['Cordon off structure', 'Structural safety assessment', 'Clear debris', 'Temporary shoring or fencing'],
  tree: ['Cordon off area', 'Cut and clear tree', 'Haul debris', 'Reopen road'],
  landslide: ['Evacuate at-risk households', 'Cordon off slope', 'Clear debris', 'Request city engineering assessment'],
  electrical: ['Cordon off and warn residents', 'Coordinate shutdown with Meralco', 'Make area safe', 'Confirm power restored'],
  other: ['Inspect and document', 'Install temporary safety measure', 'Endorse for repair', 'Close out'],
}

export function Assignment() {
  const ctx = useAdmin()
  const { incidents, updateIncident, toast } = useStore()
  const queue = incidents.filter((i) => i.status === 'verified')
  const [selId, setSelId] = useState<string | null>(ctx.param && incidents.find((i) => i.id === ctx.param) ? ctx.param : queue[0]?.id ?? null)
  const inc = incidents.find((i) => i.id === selId)

  const initFactors = (): Record<FactorKey, number> =>
    inc ? { life: inc.danger ? 2 : inc.ai?.severity === 'Severe' ? 1 : 0, pop: inc.affected >= 50 ? 2 : inc.affected >= 10 ? 1 : 0, infra: inc.ai?.severity === 'Severe' ? 2 : inc.ai?.severity === 'High' ? 1 : 0, spread: inc.category === 'flooding' || inc.category === 'landslide' ? 2 : 1 } : { life: 0, pop: 0, infra: 0, spread: 0 }
  const [factors, setFactors] = useState(initFactors)
  const [override, setOverride] = useState<Priority | null>(null)
  const [overrideNote, setOverrideNote] = useState('')
  const [responder, setResponder] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [sms, setSms] = useState(true)

  const pick = (id: string) => {
    setSelId(id)
    setOverride(null)
    setOverrideNote('')
    setResponder(null)
    setNotes('')
  }
  // Re-init factors when selection changes
  const [lastSel, setLastSel] = useState(selId)
  if (lastSel !== selId) {
    setLastSel(selId)
    setFactors(initFactors())
  }

  const weights = { life: 40, pop: 20, infra: 20, spread: 20 }
  const score = Math.round((Object.keys(factors) as FactorKey[]).reduce((a, k) => a + (factors[k] / 2) * weights[k], 0))
  const recommended: Priority = score >= 70 ? 'critical' : score >= 45 ? 'high' : score >= 25 ? 'medium' : 'low'
  const final = override ?? recommended

  const ranked = useMemo(() => {
    if (!inc) return []
    return RESPONDERS.filter((r) => r.status !== 'off-duty')
      .map((r) => {
        const d = distM(r, inc)
        const load = incidents.filter((i) => i.assignee === r.id && (i.status === 'assigned' || i.status === 'progress')).length
        const skill = r.skills.includes(inc.category)
        const match = Math.round(Math.min(99, (skill ? 50 : 10) + (r.status === 'available' ? 25 : 5) + Math.max(0, 20 - d / 60) - load * 6 + r.rating))
        return { r, d, load, skill, match, eta: Math.max(3, Math.round(d / 180)) }
      })
      .sort((a, b) => b.match - a.match)
  }, [inc, incidents])
  const chosen = ranked.find((x) => x.r.id === responder)

  return (
    <>
      <PageHeader title="Priority & Dispatch" subtitle="Assess verified incidents, confirm priority, and assign the best-matched responder." />
      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <Panel title="Ready for dispatch" subtitle={`${queue.length} verified`} bodyClass="p-2" className="xl:self-start">
          {queue.length === 0 && <EmptyState icon={CircleCheck} title="Nothing to dispatch" body="Verified incidents will appear here." action={<Button size="sm" onClick={() => ctx.go('verify')}>Verification queue</Button>} />}
          {queue.map((i) => (
            <button key={i.id} onClick={() => pick(i.id)} className={cx('flex w-full items-center gap-3 rounded-[14px] p-2.5 text-left transition', selId === i.id ? 'bg-accent-soft ring-1 ring-accent/30' : 'hover:bg-surface-2')}>
              <CategoryIcon category={i.category} size={38} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">{i.title}</div>
                <div className="text-[11px] text-ink-3">
                  {i.code} · verified {timeAgo(i.updatedAt)}
                </div>
              </div>
              {i.danger && <span className="h-2 w-2 rounded-full bg-danger" />}
            </button>
          ))}
        </Panel>

        {!inc ? (
          <Panel>
            <EmptyState icon={Send} title="Select an incident" body="Choose a verified incident to begin assessment." />
          </Panel>
        ) : (
          <div key={inc.id} className="min-w-0 animate-fade-in space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-[22px] bg-surface p-4 shadow-card ring-1 ring-line">
              <img src={inc.photos[0]} alt="" className="h-16 w-16 rounded-[14px] object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12px] text-ink-3">{inc.code}</span>
                  <StatusPill status={inc.status} size="sm" />
                </div>
                <div className="truncate text-[19px] font-bold tracking-tight">{inc.title}</div>
                <div className="flex items-center gap-1 text-[13px] text-ink-3">
                  <MapPin size={13} /> {inc.address} · {inc.purok}
                </div>
              </div>
              {inc.status !== 'verified' && <span className="text-[13px] text-ink-3">Currently {inc.status} — reassigning will update the task.</span>}
            </div>

            <div className="grid gap-4 2xl:grid-cols-2">
              <Panel title="Priority assessment" subtitle="Weighted factors · official has final say" icon={Gauge}>
                <div className="space-y-4">
                  {FACTORS.map((f) => (
                    <div key={f.k} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[14px] font-medium">{f.l}</span>
                      <Segmented size="sm" value={String(factors[f.k])} onChange={(v) => setFactors({ ...factors, [f.k]: Number(v) })} options={f.opts.map((o, i) => ({ value: String(i), label: o }))} />
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-4 rounded-[16px] bg-surface-2 p-4">
                  <div className="relative h-16 w-16">
                    <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-3)" strokeWidth="3.5" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke={PRIORITIES[recommended].color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(score / 100) * 97.4} 97.4`} className="transition-all duration-500" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[17px] font-bold tabular">{score}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] text-ink-3">Recommended priority</div>
                    <PriorityPill priority={recommended} />
                    <div className="mt-1 text-[12px] text-ink-3">Response SLA {PRIORITIES[recommended].sla}</div>
                  </div>
                  {ctx.settings.aiEnabled && inc.ai && (
                    <div className="text-right">
                      <AIBadge compact />
                      <div className="mt-1 text-[12px] text-ink-3">Severity est.: {inc.ai?.severity}</div>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <div className="mb-2 text-[13px] font-semibold text-ink-2">Final priority</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PRIORITY_KEYS.map((p) => (
                      <button key={p} onClick={() => setOverride(p === recommended ? null : p)} className={cx('rounded-[14px] p-3 text-left ring-1 transition', final === p ? 'ring-2' : 'ring-line hover:bg-surface-2')} style={final === p ? { ['--tw-ring-color' as string]: PRIORITIES[p].color, background: `color-mix(in srgb, ${PRIORITIES[p].color} 8%, transparent)` } : undefined}>
                        <PriorityPill priority={p} size="sm" />
                        <div className="mt-1 text-[11px] text-ink-3">SLA {PRIORITIES[p].sla}</div>
                      </button>
                    ))}
                  </div>
                  {override && (
                    <div className="mt-3 animate-fade-in">
                      <Field label="Reason for override (required)">
                        <TextArea rows={2} value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} placeholder="e.g. Elderly residents in affected households" />
                      </Field>
                    </div>
                  )}
                </div>
              </Panel>

              <Panel title="Responder location" subtitle={chosen ? `${chosen.r.name} · ${chosen.d} m` : 'Select a responder to preview route'} icon={Truck} bodyClass="px-2 pb-2">
                <div className="relative h-[360px] overflow-hidden rounded-[16px] 2xl:h-full 2xl:min-h-[420px]">
                  <MapView
                    className="absolute inset-0"
                    markers={[{ id: inc.id, x: inc.x, y: inc.y, category: inc.category, pulse: true }]}
                    responders={RESPONDERS.filter((r) => r.status !== 'off-duty')}
                    highlightResponder={responder}
                    onSelectResponder={setResponder}
                    routeTo={chosen ? { from: chosen.r, to: inc } : null}
                    focus={chosen ? { x: (chosen.r.x + inc.x) / 2, y: (chosen.r.y + inc.y) / 2, zoom: 1.5, key: chosen.r.id } : { x: inc.x, y: inc.y, zoom: 1.3 }}
                    initialZoom={1.3}
                    landmarks
                  />
                </div>
              </Panel>
            </div>

            <Panel title="Recommended responders" subtitle="Registered responders" icon={Users} bodyClass="px-3 pb-3">
              <div className="grid gap-2 lg:grid-cols-2">
                {ranked.map(({ r, d, load, skill, match, eta }, idx) => (
                  <button key={r.id} onClick={() => setResponder(r.id)} className={cx('flex items-center gap-3 rounded-[16px] p-3 text-left ring-1 transition', responder === r.id ? 'bg-accent-soft ring-2 ring-accent' : 'ring-line hover:bg-surface-2')}>
                    <div className="relative">
                      <Avatar name={r.name} size={42} />
                      <span className={cx('absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface', r.status === 'available' ? 'bg-[#22a06b]' : 'bg-[#3b6ef0]')} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[14px] font-semibold">{r.name}</span>
                        {idx === 0 && <span className="rounded-full bg-[#22a06b]/12 px-1.5 py-px text-[10px] font-bold text-[#1d8a5c] dark:text-[#4ad396]">BEST MATCH</span>}
                      </div>
                      <div className="truncate text-[12px] text-ink-3">
                        {r.team} · {r.vehicle}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-ink-2">
                        <span>{d} m</span>
                        <span>{load} active</span>
                        <span className="flex items-center gap-0.5">
                          <Star size={10} className="fill-[#f5b301] text-[#f5b301]" /> {r.rating}
                        </span>
                        {skill && <span className="font-semibold text-accent">✓ {CATEGORIES[inc.category].short} skilled</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[17px] font-bold tabular">{match}%</div>
                      <div className="text-[10px] text-ink-3">match</div>
                    </div>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Dispatch instructions">
              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Notes for responder">
                  <TextArea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Access route, hazards, contact person on site…" />
                </Field>
                <div>
                  <div className="mb-1.5 text-[13px] font-semibold text-ink-2">Task checklist (auto-generated)</div>
                  <ul className="space-y-1.5 rounded-[14px] bg-surface-2 p-3">
                    {CHECKLISTS[inc.category].map((c) => (
                      <li key={c} className="flex items-center gap-2 text-[13px]">
                        <span className="h-4 w-4 rounded-[5px] ring-1 ring-line-2" /> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <label className="flex items-center gap-3 text-[13px] text-ink-2">
                  <Switch checked={false} onChange={() => {}} disabled label="SMS unavailable" /> Notification delivery is not connected
                </label>
                <Button
                  size="lg"
                  icon={Send}
                  disabled={!responder || (!!override && overrideNote.trim().length < 4)}
                  onClick={() => {
                    if (!chosen) return
                    updateIncident(
                      inc.id,
                      { status: 'assigned', priority: final, assignee: chosen.r.id, progress: 0, checklist: CHECKLISTS[inc.category].map((l) => ({ label: l, done: false })) },
                      { note: `Assigned to ${chosen.r.name} · Priority ${PRIORITIES[final].label}${override ? ` (override: ${overrideNote})` : ''}`, by: ctx.user.name },
                    )
                    toast(`${chosen.r.name} assigned in local workspace`, 'success')
                    const next = queue.find((q) => q.id !== inc.id)
                    if (next) pick(next.id)
                    else ctx.go('tasks', inc.id)
                  }}
                >
                  Dispatch {chosen ? chosen.r.name.split(' ')[0] : 'responder'}
                </Button>
              </div>
            </Panel>
            <div className="flex items-center gap-2 px-1 text-[12px] text-ink-3">
              <Sparkles size={13} /> Responder ranking is based on the available records. <BadgeCheck size={13} /> Final assignment is made by the duty official.
            </div>
          </div>
        )}
      </div>
    </>
  )
}
