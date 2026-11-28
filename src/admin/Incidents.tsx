import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, ClipboardCheck, Copy, Download, Ellipsis, Eye, FunnelX, Inbox, Send, SlidersHorizontal, TriangleExclamationPoint, X } from 'lucide-react'
import { Avatar, Button, CategoryIcon, Checkbox, Chip, EmptyState, IconButton, PriorityPill, SearchField, StatusPill } from '../components/ui'
import { CATEGORIES, CATEGORY_KEYS, PRIORITIES, PRIORITY_KEYS, PUROKS, STATUSES, STATUS_KEYS, type Category, type Priority, type Status } from '../data/meta'
import { cx, fmtDateTime, timeAgo } from '../lib/format'
import { useStore } from '../store'
import { downloadCSV, Menu, PageHeader, Select, useAdmin } from './common'
import { IncidentDrawer } from './IncidentDrawer'

type SortKey = 'code' | 'createdAt' | 'priority' | 'status' | 'category'
const PRI_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export function Incidents() {
  const ctx = useAdmin()
  const { incidents, toast, refreshOfficialFeed } = useStore()
  const [status, setStatus] = useState<Status | 'all'>('all')
  const [cat, setCat] = useState<Category | 'all'>('all')
  const [pri, setPri] = useState<Priority | 'all' | 'unset'>('all')
  const [purok, setPurok] = useState<string>('all')
  const [danger, setDanger] = useState(false)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'createdAt', dir: -1 })
  const [sel, setSel] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [drawer, setDrawer] = useState<string | null>(ctx.param ?? null)
  const per = 10

  useEffect(() => setPage(0), [status, cat, pri, purok, danger, q])

  const filtered = useMemo(() => {
    const l = incidents.filter(
      (i) =>
        (status === 'all' || i.status === status) &&
        (cat === 'all' || i.category === cat) &&
        (pri === 'all' || (pri === 'unset' ? !i.priority : i.priority === pri)) &&
        (purok === 'all' || i.purok === purok) &&
        (!danger || i.danger) &&
        (!q || `${i.code} ${i.title} ${i.address} ${i.reporter.name} ${i.purok}`.toLowerCase().includes(q.toLowerCase())),
    )
    const val = (i: (typeof l)[number]) =>
      sort.k === 'createdAt' ? i.createdAt.getTime() : sort.k === 'priority' ? (i.priority ? PRI_ORDER[i.priority] : 9) : sort.k === 'status' ? STATUS_KEYS.indexOf(i.status) : sort.k === 'category' ? i.category : i.code
    return [...l].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir)
  }, [incidents, status, cat, pri, purok, danger, q, sort])

  const rows = filtered.slice(page * per, page * per + per)
  const pages = Math.max(1, Math.ceil(filtered.length / per))
  const anyFilter = cat !== 'all' || pri !== 'all' || purok !== 'all' || danger || q

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={cx('py-2.5 font-medium', className)}>
      <button onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : 1 }))} className={cx('inline-flex items-center gap-1 transition hover:text-ink', sort.k === k && 'text-ink')}>
        {children}
        {sort.k === k ? sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : <ChevronsUpDown size={12} className="opacity-50" />}
      </button>
    </th>
  )

  const exportRows = (list: typeof incidents) =>
    downloadCSV('alisto-incidents.csv', [
      ['Code', 'Title', 'Category', 'Status', 'Priority', 'Purok', 'Address', 'Reported', 'Reporter', 'Assignee'],
      ...list.map((i) => [i.code, i.title, CATEGORIES[i.category].label, STATUSES[i.status].label, i.priority ? PRIORITIES[i.priority].label : '', i.purok, i.address, fmtDateTime(i.createdAt), i.reporter.name, i.assigneeName ?? '']),
    ])

  return (
    <>
      <PageHeader
        title="Incidents"
        subtitle={`${incidents.length} total · ${incidents.filter((i) => !['resolved', 'rejected'].includes(i.status)).length} open`}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={() => (exportRows(filtered), toast(`Exported ${filtered.length} incidents to CSV`, 'success'))}>
              Export CSV
            </Button>
            {(ctx.role === 'official' || ctx.role === 'admin') && (
              <Button icon={ClipboardCheck} onClick={() => ctx.go('verify')}>
                Verification queue
              </Button>
            )}
          </>
        }
      />

      <div className="no-scrollbar -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {(['all', ...STATUS_KEYS] as const).map((s) => {
          const n = s === 'all' ? incidents.length : incidents.filter((i) => i.status === s).length
          const on = status === s
          return (
            <button key={s} onClick={() => setStatus(s)} className={cx('flex h-9 shrink-0 items-center gap-2 rounded-full pr-2 pl-3.5 text-[13px] font-semibold transition', on ? 'bg-ink text-[var(--bg)]' : 'bg-surface text-ink-2 ring-1 ring-line hover:text-ink')}>
              {s !== 'all' && <span className="h-2 w-2 rounded-full" style={{ background: STATUSES[s].color }} />}
              {s === 'all' ? 'All' : STATUSES[s].label}
              <span className={cx('rounded-full px-1.5 text-[11px] tabular', on ? 'bg-white/20 dark:bg-black/15' : 'bg-surface-2')}>{n}</span>
            </button>
          )
        })}
      </div>

      <div className="rounded-[22px] bg-surface shadow-card ring-1 ring-line">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchField value={q} onChange={setQ} placeholder="Search code, title, street, reporter…" className="w-full sm:w-[300px]" />
          <Select value={cat} onChange={setCat} icon={SlidersHorizontal} options={[{ value: 'all' as const, label: 'All categories' }, ...CATEGORY_KEYS.map((k) => ({ value: k, label: CATEGORIES[k].label, color: CATEGORIES[k].color }))]} className="w-[200px]" />
          <Select value={pri} onChange={setPri} options={[{ value: 'all' as const, label: 'Any priority' }, ...PRIORITY_KEYS.map((k) => ({ value: k, label: PRIORITIES[k].label, color: PRIORITIES[k].color })), { value: 'unset' as const, label: 'Not yet set' }]} className="w-[150px]" />
          <Select value={purok} onChange={setPurok} options={[{ value: 'all', label: 'All puroks' }, ...PUROKS.map((p) => ({ value: p, label: p }))]} className="w-[200px]" />
          <Chip active={danger} onClick={() => setDanger(!danger)} icon={TriangleExclamationPoint} color="var(--danger)">
            Danger flagged
          </Chip>
          {anyFilter && (
            <Button
              size="sm"
              variant="ghost"
              icon={FunnelX}
              onClick={() => {
                setCat('all')
                setPri('all')
                setPurok('all')
                setDanger(false)
                setQ('')
              }}
            >
              Clear
            </Button>
          )}
          <span className="ml-auto text-[13px] text-ink-3">{filtered.length} results</span>
        </div>

        {sel.length > 0 && (
          <div className="flex animate-fade-in items-center gap-3 border-b border-line bg-accent-soft px-4 py-2.5">
            <span className="text-[13px] font-semibold text-accent">{sel.length} selected</span>
            {ctx.role === 'official' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const n = sel.filter((id) => incidents.find((i) => i.id === id)?.status === 'pending')
                  try {
                    const { updateStaffReport } = await import('../lib/staffAuth')
                    await Promise.all(n.map(reportId => updateStaffReport(ctx.token, { reportId, action: 'start_review' })))
                    refreshOfficialFeed()
                    toast(`${n.length} incidents moved to Under Review`, 'success')
                    setSel([])
                  } catch (error) {
                    toast(error instanceof Error ? error.message : 'Could not update the selected reports.', 'danger')
                  }
                }}
              >
                Mark Under Review
              </Button>
            )}
            <Button size="sm" variant="secondary" icon={Download} onClick={() => (exportRows(incidents.filter((i) => sel.includes(i.id))), toast('Selection exported', 'success'))}>
              Export
            </Button>
            <button onClick={() => setSel([])} className="ml-auto text-ink-3 hover:text-ink" aria-label="Clear selection">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[12px] text-ink-3">
                <th className="w-[76px] min-w-[76px] py-3 pl-5 pr-4 align-middle">
                  <Checkbox checked={rows.length > 0 && rows.every((r) => sel.includes(r.id))} onChange={(v) => setSel(v ? [...new Set([...sel, ...rows.map((r) => r.id)])] : sel.filter((s) => !rows.find((r) => r.id === s)))} label="Select all" />
                </th>
                <Th k="code" className="pl-3">Incident</Th>
                <Th k="category">Category</Th>
                <th className="py-2.5 font-medium">Location</th>
                <Th k="createdAt">Reported</Th>
                <Th k="priority">Priority</Th>
                <Th k="status">Status</Th>
                <th className="py-2.5 font-medium">Assignee</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                return (
                  <tr key={i.id} onClick={() => setDrawer(i.id)} className={cx('cursor-pointer border-b border-line transition last:border-0 hover:bg-surface-2', sel.includes(i.id) && 'bg-accent-soft/50')}>
                    <td className="w-[76px] min-w-[76px] py-3.5 pl-5 pr-4 align-middle" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={sel.includes(i.id)} onChange={(v) => setSel(v ? [...sel, i.id] : sel.filter((s) => s !== i.id))} label={`Select ${i.code}`} />
                    </td>
                    <td className="py-3.5 pl-3 pr-6 align-middle">
                      <div className="flex min-w-0 items-center gap-4">
                        <img src={i.photos[0]} alt="" className="h-12 w-12 shrink-0 rounded-[12px] object-cover" />
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="block max-w-[280px] truncate font-semibold">{i.title}</span>
                            {i.danger && <TriangleExclamationPoint size={13} className="shrink-0 text-danger" />}
                          </div>
                          <div className="font-mono text-[11px] text-ink-3">{i.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-2">
                        <CategoryIcon category={i.category} size={24} />
                        <span className="text-ink-2">{CATEGORIES[i.category].short}</span>
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="max-w-[180px] truncate">{i.address}</div>
                      <div className="text-[12px] text-ink-3">{i.purok.split(' · ')[0]}</div>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap text-ink-2">
                      {timeAgo(i.createdAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <PriorityPill priority={i.priority} size="sm" />
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPill status={i.status} size="sm" />
                    </td>
                    <td className="py-3 pr-4">
                      {i.assigneeName ? (
                        <span className="flex items-center gap-2">
                          <Avatar name={i.assigneeName} size={24} />
                          <span className="max-w-[120px] truncate text-ink-2">{i.assigneeName}</span>
                        </span>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <Menu
                        trigger={(open) => <IconButton icon={Ellipsis} label="Actions" size={30} onClick={open} />}
                        items={[
                          { label: 'View details', icon: Eye, onClick: () => setDrawer(i.id) },
                          ...((ctx.role === 'official' || ctx.role === 'admin') && (i.status === 'pending' || i.status === 'review') ? [{ label: 'Open verification', icon: ClipboardCheck, onClick: () => ctx.go('verify', i.id) }] : []),
                          ...((ctx.role === 'official' || ctx.role === 'admin') && (i.status === 'verified' || (i.status === 'assigned' && i.acceptanceStatus === 'declined')) ? [{ label: 'Assess & dispatch', icon: Send, onClick: () => ctx.go('assign', i.id) }] : []),
                          { label: 'Copy reference', icon: Copy, onClick: () => (navigator.clipboard?.writeText(i.code), toast(`${i.code} copied`)) },
                        ]}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState icon={Inbox} title="No incidents match" body="Try adjusting the filters or search terms." />}
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-ink-3">
          <span>
            Showing {filtered.length ? page * per + 1 : 0}–{Math.min(filtered.length, page * per + per)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <IconButton icon={ChevronLeft} label="Previous page" size={32} disabled={page === 0} onClick={() => setPage(page - 1)} className="disabled:opacity-30" />
            {Array.from({ length: pages }).map((_, p) => (
              <button key={p} onClick={() => setPage(p)} className={cx('h-8 min-w-8 rounded-[9px] px-2 font-semibold tabular', p === page ? 'bg-accent text-accent-ink' : 'hover:bg-surface-2')}>
                {p + 1}
              </button>
            ))}
            <IconButton icon={ChevronRight} label="Next page" size={32} disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="disabled:opacity-30" />
          </div>
        </div>
      </div>
      <IncidentDrawer incident={incidents.find((i) => i.id === drawer)} onClose={() => setDrawer(null)} />
    </>
  )
}
