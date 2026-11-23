import { useMemo, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Layers, Phone, Tent, TrendingUp, Truck, WavesHorizontal, X } from 'lucide-react'
import { MapView } from '../components/Map'
import { Avatar, Button, CategoryIcon, PriorityPill, Segmented, StatusPill, Switch } from '../components/ui'
import { CATEGORIES, CATEGORY_KEYS, PUROKS, type Category } from '../data/meta'
import { RESPONDERS } from '../data/records'
import { cx, timeAgo } from '../lib/format'
import { useStore } from '../store'
import { useAdmin } from './common'

export function Monitoring() {
  const ctx = useAdmin()
  const { incidents, toast } = useStore()
  const isResp = ctx.role === 'responder'
  const [panel, setPanel] = useState(true)
  const [win, setWin] = useState<'24h' | '7d' | '30d'>('7d')
  const [cats, setCats] = useState<Category[]>([])
  const [scope, setScope] = useState<'active' | 'all'>('active')
  const [L, setL] = useState({ clusters: true, heat: !isResp, hazard: false, responders: true, facilities: false })
  const [sel, setSel] = useState<string | null>(null)
  const [selR, setSelR] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ x: number; y: number; zoom: number; key: number } | null>(null)

  const hours = { '24h': 24, '7d': 168, '30d': 720 }[win]
  const list = useMemo(
    () =>
      incidents.filter(
        (i) =>
          (Date.now() - i.createdAt.getTime()) / 3600e3 <= hours &&
          (scope === 'all' ? i.status !== 'rejected' : !['resolved', 'rejected'].includes(i.status)) &&
          (cats.length === 0 || cats.includes(i.category)) &&
          (!isResp || i.assignee === ctx.user.responderId || i.status === 'verified'),
      ),
    [incidents, hours, scope, cats, isResp, ctx.user.responderId],
  )

  const hotspots = useMemo(() => {
    const counts = PUROKS.map((p) => {
      const items = incidents.filter((i) => i.purok === p && (Date.now() - i.createdAt.getTime()) / 3600e3 <= hours)
      const top = CATEGORY_KEYS.map((k) => ({ k, n: items.filter((i) => i.category === k).length })).sort((a, b) => b.n - a.n)[0]
      const cx = items.reduce((a, b) => a + b.x, 0) / (items.length || 1)
      const cy = items.reduce((a, b) => a + b.y, 0) / (items.length || 1)
      return { p, n: items.length, top: top?.k, x: cx, y: cy }
    })
    return counts.filter((c) => c.n > 0).sort((a, b) => b.n - a.n)
  }, [incidents, hours])
  const maxHot = Math.max(1, ...hotspots.map((h) => h.n))

  const inc = incidents.find((i) => i.id === sel)
  const resp = RESPONDERS.find((r) => r.id === selR)
  const critical = list.filter((i) => i.priority === 'critical' || i.danger).length

  return (
    <div className="relative h-full">
      <MapView
        className="absolute inset-0"
        markers={list.map((i) => ({ id: i.id, x: i.x, y: i.y, category: i.category, status: i.status, pulse: i.danger && ['pending', 'review'].includes(i.status) }))}
        selectedId={sel}
        onSelect={(id) => (setSel(id), setSelR(null))}
        onSelectResponder={(id) => (setSelR(id), setSel(null))}
        highlightResponder={selR}
        clusters={L.clusters}
        heatmap={L.heat}
        hazard={L.hazard}
        landmarks={L.facilities}
        responders={L.responders ? RESPONDERS.filter((r) => r.status !== 'off-duty') : undefined}
        focus={focus}
        initialZoom={1}
        controlsClassName="bottom-5 right-5"
      >
        {/* Top stats */}
        <div className="pointer-events-none absolute top-4 right-4 left-4 flex justify-end">
          <div className="glass-strong pointer-events-auto flex items-center gap-4 rounded-full py-2 pr-4 pl-3 text-[13px] shadow-float ring-1 ring-line">
            <span className="flex items-center gap-2 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-[#22a06b]" />
                <span className="h-2 w-2 rounded-full bg-[#22a06b]" />
              </span>
              Workspace
            </span>
            <span className="text-ink-2">
              <b className="text-ink tabular">{list.length}</b> incidents
            </span>
            <span className="text-ink-2">
              <b className="text-danger tabular">{critical}</b> critical
            </span>
            <span className="hidden text-ink-2 sm:inline">
              <b className="text-ink tabular">{RESPONDERS.filter((r) => r.status === 'on-task').length}</b> teams deployed
            </span>
          </div>
        </div>

        {/* Left panel */}
        {panel ? (
          <div className="glass-strong absolute top-4 bottom-4 left-4 flex w-[320px] max-w-[calc(100%-32px)] animate-slide-up flex-col overflow-hidden rounded-[24px] shadow-pop ring-1 ring-line">
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <div>
                <h1 className="text-[18px] font-bold tracking-tight">{isResp ? 'Task map' : 'Geospatial monitoring'}</h1>
                <div className="text-[12px] text-ink-3">Incident locations</div>
              </div>
              <button onClick={() => setPanel(false)} aria-label="Collapse panel" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-ink-2">
                <ChevronLeft size={16} />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
              <div>
                <div className="mb-2 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">Time window</div>
                <Segmented full size="sm" value={win} onChange={setWin} options={[{ value: '24h', label: '24 hours' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }]} />
                <div className="mt-2">
                  <Segmented full size="sm" value={scope} onChange={setScope} options={[{ value: 'active', label: 'Active only' }, { value: 'all', label: 'Include resolved' }]} />
                </div>
              </div>
              <div>
                <div className="mb-2 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">Layers</div>
                <div className="overflow-hidden rounded-[14px] bg-surface ring-1 ring-line">
                  {[
                    { k: 'clusters' as const, l: 'Incident clusters', i: Layers, c: '#0b1e45' },
                    { k: 'heat' as const, l: 'Hotspot heatmap', i: Flame, c: '#e5372a' },
                    
                    { k: 'responders' as const, l: 'Responder units', i: Truck, c: '#22a06b' },
                    
                  ].map((x) => (
                    <div key={x.k} className="flex items-center gap-2.5 border-b border-line px-3 py-2 last:border-0">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md text-white" style={{ background: x.c }}>
                        <x.i size={13} />
                      </span>
                      <span className="flex-1 text-[13px] font-medium">{x.l}</span>
                      <span className="origin-right scale-[0.8]">
                        <Switch checked={L[x.k]} onChange={(v) => setL({ ...L, [x.k]: v })} label={x.l} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">Categories</span>
                  {cats.length > 0 && (
                    <button onClick={() => setCats([])} className="text-[12px] font-semibold text-accent">
                      Reset
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_KEYS.map((k) => {
                    const on = cats.includes(k)
                    const C = CATEGORIES[k]
                    return (
                      <button key={k} onClick={() => setCats(on ? cats.filter((x) => x !== k) : [...cats, k])} className={cx('flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold transition', on ? 'text-white' : 'bg-surface text-ink-2 ring-1 ring-line')} style={on ? { background: C.color } : undefined}>
                        <C.icon size={12} style={on ? undefined : { color: C.color }} /> {C.short}
                      </button>
                    )
                  })}
                </div>
              </div>
              {!isResp && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
                    <TrendingUp size={12} /> Hotspots · {win}
                  </div>
                  <div className="space-y-1">
                    {hotspots.map((h, i) => (
                      <button key={h.p} onClick={() => setFocus({ x: h.x, y: h.y, zoom: 2, key: Date.now() })} className="w-full rounded-[12px] p-2 text-left transition hover:bg-surface">
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="flex items-center gap-2 font-semibold">
                            <span className="w-4 text-ink-3 tabular">{i + 1}</span>
                            {h.p}
                          </span>
                          <span className="font-semibold tabular">{h.n}</span>
                        </div>
                        <div className="mt-1.5 ml-6 h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <div className="h-full rounded-full" style={{ width: `${(h.n / maxHot) * 100}%`, background: `linear-gradient(90deg, #ef8a2b, #e5372a)` }} />
                        </div>
                        {h.top && <div className="mt-1 ml-6 text-[11px] text-ink-3">Mostly {CATEGORIES[h.top].label.toLowerCase()}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button onClick={() => setPanel(true)} className="glass-strong absolute top-4 left-4 flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold shadow-float ring-1 ring-line">
            <Layers size={16} /> Layers & filters <ChevronRight size={14} />
          </button>
        )}

        {/* Legend */}
        <div className="glass-strong absolute right-20 bottom-5 hidden flex-wrap items-center gap-x-3 gap-y-1 rounded-[14px] px-3 py-2 text-[11px] font-medium text-ink-2 shadow-float ring-1 ring-line lg:flex">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#22a06b]" /> Unit available</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#3b6ef0]" /> Unit on task</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-navy dark:bg-royal" /> Cluster</span>
          {L.hazard && <span className="flex items-center gap-1"><span className="h-2.5 w-4 rounded-sm bg-accent/25" /> Flood zone</span>}
        </div>

        {/* Detail card */}
        {inc && (
          <div key={inc.id} className="glass-strong absolute top-16 right-4 w-[340px] max-w-[calc(100%-32px)] animate-pop overflow-hidden rounded-[24px] shadow-pop ring-1 ring-line">
            <div className="relative">
              <img src={inc.photos[0]} alt="" className="h-40 w-full object-cover" />
              <button onClick={() => setSel(null)} aria-label="Close" className="glass-strong absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full">
                <X size={15} />
              </button>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={inc.status} size="sm" />
                <PriorityPill priority={inc.priority} size="sm" />
              </div>
              <div className="mt-2 text-[17px] leading-snug font-bold">{inc.title}</div>
              <div className="mt-0.5 text-[12px] text-ink-3">
                {inc.code} · {inc.address} · {timeAgo(inc.createdAt)}
              </div>
              <p className="mt-2 line-clamp-2 text-[13px] text-ink-2">{inc.description}</p>
              <Button
                className="mt-4 w-full"
                iconRight={ArrowRight}
                onClick={() =>
                  isResp ? ctx.go('tasks', inc.id) : ctx.role === 'admin' ? ctx.go('incidents', inc.id) : ctx.go(inc.status === 'pending' || inc.status === 'review' ? 'verify' : inc.status === 'verified' ? 'assign' : inc.status === 'resolved' ? 'incidents' : 'tasks', inc.id)
                }
              >
                {inc.status === 'pending' || inc.status === 'review' ? 'Open verification' : inc.status === 'verified' ? 'Assess & dispatch' : 'Open details'}
              </Button>
            </div>
          </div>
        )}
        {resp && (
          <div key={resp.id} className="glass-strong absolute top-16 right-4 w-[320px] animate-pop rounded-[24px] p-4 shadow-pop ring-1 ring-line">
            <div className="flex items-center gap-3">
              <Avatar name={resp.name} size={46} />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold">{resp.name}</div>
                <div className="text-[12px] text-ink-3">{resp.team}</div>
              </div>
              <button onClick={() => setSelR(null)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2">
                <X size={15} />
              </button>
            </div>
            <div className="mt-3 space-y-1.5">
              {incidents
                .filter((i) => i.assignee === resp.id && i.status !== 'resolved')
                .map((i) => (
                  <div key={i.id} className="flex items-center gap-2 rounded-[12px] bg-surface-2 p-2 text-[12px]">
                    <CategoryIcon category={i.category} size={24} />
                    <span className="flex-1 truncate font-medium">{i.title}</span>
                    <StatusPill status={i.status} size="sm" />
                  </div>
                ))}
              {!incidents.some((i) => i.assignee === resp.id && i.status !== 'resolved') && <div className="text-[13px] text-ink-3">No active tasks · {resp.vehicle}</div>}
            </div>
            <Button variant="secondary" className="mt-3 w-full" icon={Phone} onClick={() => toast('Radio communication is not connected')}>
              Contact unit
            </Button>
          </div>
        )}
      </MapView>
    </div>
  )
}
