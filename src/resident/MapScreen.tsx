import { useMemo, useState } from 'react'
import { ChevronRight, Flame, Layers, List, Navigation, Search, Tent, ThumbsUp, WavesHorizontal, X } from 'lucide-react'
import { Button, CategoryIcon, Sheet, StatusPill } from '../components/ui'
import { Switch } from './ResidentControls'
import { MapView } from '../components/Map'
import { CATEGORIES, CATEGORY_KEYS, type Category } from '../data/meta'
import { cx, distanceLabel, timeAgo } from '../lib/format'
import { useStore } from '../store'
import { useNav } from './common'

export function MapScreen() {
  const nav = useNav()
  const { incidents, toast, updateIncident } = useStore()
  const [cats, setCats] = useState<Category[]>([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [layersOpen, setLayersOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [layers, setLayers] = useState({ resolved: false, hazard: false, heat: false, evac: false })
  const [confirmed, setConfirmed] = useState<string[]>([])

  const list = useMemo(
    () =>
      incidents.filter(
        (i) =>
          i.status !== 'rejected' &&
          (layers.resolved || i.status !== 'resolved') &&
          (cats.length === 0 || cats.includes(i.category)) &&
          (!q || `${i.title} ${i.address} ${i.purok}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [incidents, cats, q, layers.resolved],
  )
  const sel = incidents.find((i) => i.id === selected)

  return (
    <div className="absolute inset-0">
      <MapView
        autoLocate
        className="absolute inset-0"
        markers={list.map((i) => ({ id: i.id, x: i.x, y: i.y, category: i.category, status: i.status, pulse: i.danger && i.status === 'pending' }))}
        selectedId={selected}
        onSelect={setSelected}
        initialZoom={1.4}
        focus={sel ? { x: sel.x, y: sel.y + 6, zoom: 2.2, key: sel.id } : null}
        hazard={layers.hazard}
        heatmap={layers.heat}
        landmarks={layers.evac}
        clusters
        controlsClassName={sel ? 'bottom-[300px]' : 'bottom-[120px]'}
      >
        {/* top controls */}
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-[var(--bg)]/70 to-transparent px-4 pt-[58px] pb-6">
          <div className="flex gap-2">
            <div className="glass-strong flex h-12 flex-1 items-center gap-2.5 rounded-full px-4 shadow-float ring-1 ring-line">
              <Search size={18} className="text-ink-3" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search incidents or streets" className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3 focus-visible:outline-none" />
              {q && (
                <button onClick={() => setQ('')} aria-label="Clear">
                  <X size={16} className="text-ink-3" />
                </button>
              )}
            </div>
            <button onClick={() => setLayersOpen(true)} aria-label="Map layers" className="glass-strong flex h-12 w-12 items-center justify-center rounded-full text-ink-2 shadow-float ring-1 ring-line">
              <Layers size={20} />
            </button>
          </div>
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
            <button onClick={() => setCats([])} className={cx('h-9 shrink-0 rounded-full px-3.5 text-[14px] font-semibold shadow-card transition', cats.length === 0 ? 'bg-ink text-[var(--bg)]' : 'glass-strong text-ink-2 ring-1 ring-line')}>
              All
            </button>
            {CATEGORY_KEYS.map((k) => {
              const c = CATEGORIES[k]
              const on = cats.includes(k)
              return (
                <button key={k} onClick={() => setCats(on ? cats.filter((x) => x !== k) : [...cats, k])} className={cx('flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold shadow-card transition', on ? 'text-white' : 'glass-strong text-ink-2 ring-1 ring-line')} style={on ? { background: c.color } : undefined}>
                  <c.icon size={15} style={on ? undefined : { color: c.color }} />
                  {c.short}
                </button>
              )
            })}
          </div>
        </div>

        {/* bottom card */}
        {sel ? (
          <div key={sel.id} className="glass-strong absolute inset-x-3 bottom-[100px] animate-slide-up rounded-[28px] p-4 shadow-pop ring-1 ring-line">
            <button onClick={() => setSelected(null)} aria-label="Close" className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-surface-3/80 text-ink-2">
              <X size={15} strokeWidth={2.5} />
            </button>
            <div className="flex gap-3">
              <img src={sel.photos[0]} alt={sel.title} className="h-[84px] w-[84px] shrink-0 rounded-[18px] object-cover" />
              <div className="min-w-0 flex-1 pr-6">
                <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: CATEGORIES[sel.category].color }}>
                  {CATEGORIES[sel.category].label}
                </div>
                <div className="mt-0.5 line-clamp-2 text-[16px] leading-snug font-semibold">{sel.title}</div>
                <div className="mt-1 text-[13px] text-ink-3">
                  {timeAgo(sel.createdAt)}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <StatusPill status={sel.status} size="sm" />
              <span className="text-[13px] text-ink-3">{sel.confirmations} residents confirmed</span>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
              <Button
                variant={confirmed.includes(sel.id) ? 'tinted' : 'secondary'}
                icon={ThumbsUp}
                onClick={() => {
                  if (confirmed.includes(sel.id)) return
                  setConfirmed([...confirmed, sel.id])
                  updateIncident(sel.id, { confirmations: sel.confirmations + 1 })
                  toast('Thanks — your confirmation helps prioritize', 'success')
                }}
              >
                {confirmed.includes(sel.id) ? 'Confirmed' : 'Me too'}
              </Button>
              <Button variant="secondary" icon={Navigation} onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lng}`, '_blank', 'noopener,noreferrer')}>
                Directions
              </Button>
              <Button variant="primary" aria-label="View details" onClick={() => nav.push({ name: 'reportDetail', id: sel.id })} className="px-3">
                <ChevronRight size={20} />
              </Button>
            </div>
          </div>
        ) : (
          <button onClick={() => setListOpen(true)} className="glass-strong absolute bottom-[104px] left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-[14px] font-semibold shadow-float ring-1 ring-line">
            <List size={17} className="text-accent" /> {list.length} incidents in view
          </button>
        )}
      </MapView>

      <Sheet open={layersOpen} onClose={() => setLayersOpen(false)} title="Map layers">
        <div className="overflow-hidden rounded-[18px] bg-surface-2">
          {[
            { k: 'heat' as const, i: Flame, c: '#e5372a', l: 'Incident heatmap', s: 'Where reports are concentrated' },
            { k: 'resolved' as const, i: Layers, c: '#8d96aa', l: 'Show resolved incidents', s: 'Past 7 days' },
          ].map((r) => (
            <div key={r.k} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: r.c }}>
                <r.i size={16} />
              </span>
              <div className="flex-1">
                <div className="text-[15px] font-semibold">{r.l}</div>
                <div className="text-[12px] text-ink-3">{r.s}</div>
              </div>
              <Switch checked={layers[r.k]} onChange={(v) => setLayers({ ...layers, [r.k]: v })} label={r.l} />
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet open={listOpen} onClose={() => setListOpen(false)} title="Incidents">
        <div className="space-y-2 pb-2">
          {[...list]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((i) => (
              <button
                key={i.id}
                onClick={() => {
                  setListOpen(false)
                  setSelected(i.id)
                }}
                className="flex w-full items-center gap-3 rounded-[18px] bg-surface-2 p-3 text-left active:scale-[0.99]"
              >
                <CategoryIcon category={i.category} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{i.title}</div>
                  <div className="text-[12px] text-ink-3">
                    {i.purok.split(' · ')[0]} · {timeAgo(i.createdAt)}
                  </div>
                </div>
                <StatusPill status={i.status} size="sm" />
              </button>
            ))}
        </div>
      </Sheet>
    </div>
  )
}
