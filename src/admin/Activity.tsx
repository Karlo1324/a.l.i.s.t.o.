import { useMemo, useState } from 'react'
import { BellOff, CircleCheck, Download, Info, ScrollText, Siren, TriangleExclamationPoint } from 'lucide-react'
import { Avatar, Button, Chip, EmptyState, RolePill, SearchField } from '../components/ui'
import { STATUSES } from '../data/meta'
import type { AuditEntry } from '../data/records'
import { cx, fmtDateTime, fmtTime, timeAgo } from '../lib/format'
import { useStore } from '../store'
import { downloadCSV, PageHeader, Tabs, useAdmin } from './common'

type Tab = 'notifications' | 'history' | 'audit'
const TYPES: { v: AuditEntry['type'] | 'all'; l: string }[] = [
  { v: 'all', l: 'All' },
  { v: 'auth', l: 'Authentication' },
  { v: 'incident', l: 'Incidents' },
  { v: 'assignment', l: 'Assignments' },
  { v: 'ai', l: 'AI suggestions' },
  { v: 'user', l: 'Users' },
  { v: 'settings', l: 'Settings' },
]

export function ActivityPage() {
  const ctx = useAdmin()
  const { staffNotifs, markStaffRead, incidents, audit, toast, getIncident } = useStore()
  const canAudit = ctx.role === 'admin' || ctx.role === 'official'
  const [tab, setTab] = useState<Tab>(ctx.param === 'audit' && canAudit ? 'audit' : 'notifications')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [type, setType] = useState<AuditEntry['type'] | 'all'>('all')
  const [q, setQ] = useState('')

  const history = useMemo(
    () =>
      incidents
        .flatMap((i) => i.timeline.map((t) => ({ ...t, inc: i })))
        .sort((a, b) => b.at.getTime() - a.at.getTime())
        .slice(0, 40),
    [incidents],
  )
  const groupedHistory = useMemo(() => {
    const g: Record<string, typeof history> = {}
    history.forEach((h) => {
      const d = h.at.toDateString() === new Date().toDateString() ? 'Today' : h.at.toDateString() === new Date(Date.now() - 864e5).toDateString() ? 'Yesterday' : h.at.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })
      ;(g[d] ??= []).push(h)
    })
    return g
  }, [history])

  const logs = audit.filter((a) => (type === 'all' || a.type === type) && (!q || `${a.actor} ${a.action} ${a.target}`.toLowerCase().includes(q.toLowerCase())))
  const notifs = staffNotifs.filter((n) => !unreadOnly || !n.read)
  const tone = { critical: { c: '#e5372a', i: Siren }, warning: { c: '#ef8a2b', i: TriangleExclamationPoint }, info: { c: '#3b6ef0', i: Info }, success: { c: '#22a06b', i: CircleCheck } }

  return (
    <>
      <PageHeader title={canAudit ? 'Activity & Audit' : 'Activity'} subtitle="Notifications and workflow actions recorded in this workspace" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'notifications', label: 'Notifications', count: staffNotifs.filter((n) => !n.read).length },
          { value: 'history', label: 'Activity history' },
          ...(canAudit ? [{ value: 'audit' as const, label: 'Audit logs', count: audit.length }] : []),
        ]}
      />
      <div className="mt-5">
        {tab === 'notifications' && (
          <div className="rounded-[22px] bg-surface shadow-card ring-1 ring-line">
            <div className="flex items-center gap-2 border-b border-line p-3">
              <Chip active={!unreadOnly} onClick={() => setUnreadOnly(false)}>
                All
              </Chip>
              <Chip active={unreadOnly} onClick={() => setUnreadOnly(true)}>
                Unread
              </Chip>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => markStaffRead()}>
                Mark all as read
              </Button>
            </div>
            {notifs.length === 0 && <EmptyState icon={BellOff} title="No notifications" />}
            {notifs.map((n) => {
              const T = tone[n.tone]
              const inc = n.incidentId ? getIncident(n.incidentId) : undefined
              return (
                <div key={n.id} className={cx('flex items-start gap-4 border-b border-line px-5 py-4 last:border-0', !n.read && 'bg-accent-soft/40')}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${T.c} 14%, transparent)`, color: T.c }}>
                    <T.i size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold">{n.title}</span>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-accent" />}
                    </div>
                    <div className="mt-0.5 text-[13px] text-ink-2">{n.body}</div>
                    <div className="mt-1 text-[12px] text-ink-3">{fmtDateTime(n.at)}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {!n.read && (
                      <Button size="sm" variant="ghost" onClick={() => markStaffRead(n.id)}>
                        Mark read
                      </Button>
                    )}
                    {inc && (
                      <Button size="sm" variant="secondary" onClick={() => {
                        markStaffRead(n.id)
                        const nextPage = ctx.role === 'admin'
                          ? 'incidents'
                          : inc.status === 'pending' || inc.status === 'review'
                            ? 'verify'
                            : inc.status === 'verified'
                              ? 'assign'
                              : ctx.user.responderId && inc.assignee === ctx.user.responderId && (inc.status === 'assigned' || inc.status === 'progress')
                                ? 'tasks'
                                : 'incidents'
                        ctx.go(nextPage, inc.id)
                      }}>
                        Open
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-6">
            {Object.entries(groupedHistory).map(([day, items]) => (
              <div key={day}>
                <div className="mb-2 text-[13px] font-semibold text-ink-3">{day}</div>
                <div className="rounded-[22px] bg-surface p-2 shadow-card ring-1 ring-line">
                  {items.map((h, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-[14px] px-3 py-2.5 hover:bg-surface-2">
                      <span className="w-16 shrink-0 text-[12px] text-ink-3 tabular">{fmtTime(h.at)}</span>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUSES[h.status].color }} />
                      <div className="min-w-0 flex-1 text-[13px]">
                        <span className="font-semibold">{h.by}</span> <span className="text-ink-2">marked</span> <span className="font-mono text-[12px]">{h.inc.code}</span> <span className="text-ink-2">as</span> <span className="font-semibold" style={{ color: `color-mix(in srgb, ${STATUSES[h.status].color} 80%, var(--ink))` }}>{STATUSES[h.status].label}</span>
                        <div className="truncate text-[12px] text-ink-3">
                          {h.inc.title} · {h.note}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'audit' && canAudit && (
          <div className="rounded-[22px] bg-surface shadow-card ring-1 ring-line">
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
              <SearchField value={q} onChange={setQ} placeholder="Search actor, action, target" className="w-full sm:w-[280px]" />
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                {TYPES.map((t) => (
                  <Chip key={t.v} active={type === t.v} onClick={() => setType(t.v)}>
                    {t.l}
                  </Chip>
                ))}
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={Download}
                className="ml-auto"
                onClick={() => {
                  downloadCSV('alisto-audit-log.csv', [['Timestamp', 'Actor', 'Role', 'Action', 'Type', 'Target', 'IP'], ...logs.map((l) => [l.at.toISOString(), l.actor, l.role, l.action, l.type, l.target, l.ip])])
                  toast(`Exported ${logs.length} audit entries`, 'success')
                }}
              >
                Export
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[12px] text-ink-3">
                    <th className="px-5 py-2.5 font-medium">Timestamp</th>
                    <th className="py-2.5 font-medium">Actor</th>
                    <th className="py-2.5 font-medium">Action</th>
                    <th className="py-2.5 font-medium">Target</th>
                    <th className="py-2.5 pr-5 font-medium">IP address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="tabular">{fmtDateTime(l.at)}</div>
                        <div className="text-[11px] text-ink-3">{timeAgo(l.at)}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={l.actor} size={28} />
                          <div>
                            <div className="font-semibold">{l.actor}</div>
                            <RolePill role={l.role} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className={cx(l.action.startsWith('Failed') && 'font-semibold text-danger')}>{l.action}</div>
                        <div className="text-[11px] tracking-wide text-ink-3 uppercase">{l.type}</div>
                      </td>
                      <td className="py-3 pr-4 font-mono text-[12px] text-ink-2">{l.target}</td>
                      <td className="py-3 pr-5 font-mono text-[12px] text-ink-3">{l.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && <EmptyState icon={ScrollText} title="No matching entries" />}
            </div>
            <div className="border-t border-line px-5 py-3 text-[12px] text-ink-3">Activity is stored only in memory and clears on refresh. No server audit service is connected.</div>
          </div>
        )}
      </div>
    </>
  )
}
