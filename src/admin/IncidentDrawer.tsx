
import { ArrowRight, MapPin, Phone, RotateCcw, Sparkles, Users } from 'lucide-react'
import { MapView } from '../components/Map'
import { AIBadge, Avatar, Button, CategoryTag, PriorityPill, StatusPill } from '../components/ui'
import { CATEGORIES, STATUSES } from '../data/meta'
import { RESPONDERS, type Incident } from '../data/records'
import { fmtDateTime, timeAgo } from '../lib/format'
import { useStore } from '../store'
import { Drawer, useAdmin } from './common'

export function IncidentDrawer({ incident, onClose }: { incident: Incident | null | undefined; onClose: () => void }) {
  const ctx = useAdmin()
  const { updateIncident, toast } = useStore()
  const inc = incident
  const responder = RESPONDERS.find((r) => r.id === inc?.assignee)

  return (
    <Drawer
      open={!!inc}
      onClose={onClose}
      width={520}
      title={inc && (
        <span className="font-mono text-[13px] text-ink-3">
          {inc.code}
        </span>
      )}
    >
      {inc && (
        <div className="min-w-0 pb-6">

          {/* Incident photos */}
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pt-4">
            {inc.photos.map((p, i) => (
              <img
                key={i}
                src={p}
                alt=""
                className="h-40 w-[75%] shrink-0 rounded-[16px] object-cover sm:h-44 sm:w-[70%] first:w-[80%] sm:first:w-[78%]"
              />
            ))}
          </div>

          <div className="min-w-0 space-y-5 px-5 pt-5">

            {/* Incident information */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={inc.status} />
                <PriorityPill priority={inc.priority} />

                {inc.danger && (
                  <span className="rounded-full bg-danger-soft px-2.5 py-1 text-[11px] font-bold text-danger">
                    PEOPLE IN DANGER
                  </span>
                )}
              </div>

              <h2 className="mt-3 break-words text-[21px] leading-[1.3] font-bold tracking-tight sm:text-[22px]">
                {inc.title}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-ink-3">
                <CategoryTag category={inc.category} />

                <span className="flex min-w-0 items-start gap-1.5">
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 break-words">
                    {inc.address}, {inc.purok.split(' · ')[0]}
                  </span>
                </span>
              </div>

              <p className="mt-4 break-words text-[14px] leading-6 text-ink-2">
                {inc.description}
              </p>
            </div>

            {/* Incident statistics */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Reported', v: timeAgo(inc.createdAt) },
                { l: 'Affected', v: `~${inc.affected}` },
                { l: 'Confirmations', v: inc.confirmations },
              ].map((s) => (
                <div
                  key={s.l}
                  className="min-w-0 rounded-[14px] bg-surface-2 px-2.5 py-3 sm:px-3"
                >
                  <div className="text-[11px] leading-4 text-ink-3">
                    {s.l}
                  </div>

                  <div className="mt-1 break-words text-[14px] leading-5 font-semibold sm:text-[15px]">
                    {s.v}
                  </div>
                </div>
              ))}
            </div>

            {/* Incident location */}
            <div className="relative h-44 overflow-hidden rounded-[16px] ring-1 ring-line">
              <MapView
                interactive={false}
                controls={false}
                markers={[
                  {
                    id: inc.id,
                    x: inc.x,
                    y: inc.y,
                    category: inc.category,
                  },
                ]}
                focus={{
                  x: inc.x,
                  y: inc.y,
                  zoom: 2.4,
                }}
                initialZoom={2.4}
                landmarks
                className="absolute inset-0"
              />
            </div>

            {/* Reporter information */}
            <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-[16px] bg-surface-2 p-3 sm:flex-nowrap">
              <div className="shrink-0">
                <Avatar
                  name={inc.anonymous ? 'Anonymous' : inc.reporter.name}
                  size={36}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="break-words text-[13px] leading-5 font-semibold">
                  {inc.reporter.name}

                  {inc.anonymous && (
                    <span className="ml-1 font-normal text-ink-3">
                      (hidden publicly)
                    </span>
                  )}
                </div>

                <div className="mt-0.5 break-words text-[12px] leading-5 text-ink-3">
                  {inc.reporter.verified ? 'Verified resident' : 'Unverified reporter'} · {inc.reporter.phone || 'No contact number'}
                </div>
              </div>

              <div className="shrink-0">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Phone}
                  onClick={() =>
                    (inc.reporter.phone ? window.location.assign('tel:' + inc.reporter.phone.replace(/[^+\d]/g, '')) : toast('No contact number is available'))
                  }
                >
                  Call
                </Button>
              </div>
            </div>

            {/* Assigned responder */}
            {responder && (
              <div className="flex min-w-0 items-center gap-3 rounded-[16px] bg-surface-2 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Users size={16} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="break-words text-[13px] leading-5 font-semibold">
                    {responder.name}
                  </div>

                  <div className="mt-0.5 break-words text-[12px] leading-5 text-ink-3">
                    {responder.team} · {inc.progress ?? 0}% complete
                  </div>
                </div>
              </div>
            )}

            {/* AI assessment */}
            {ctx.settings.aiEnabled && inc.ai && (
              <div
                className="min-w-0 rounded-[16px] p-3.5 ring-1 ring-[#7c5cff]/25"
                style={{
                  background: 'color-mix(in srgb, #7c5cff 6%, transparent)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <AIBadge />

                  <span className="shrink-0 text-[12px] font-semibold tabular">
                    {Math.round(inc.ai.confidence * 100)}%
                  </span>
                </div>

                <div className="mt-3 flex items-start gap-2 text-[13px] leading-5">
                  <Sparkles
                    size={14}
                    className="mt-0.5 shrink-0 text-[#7c5cff]"
                  />

                  <span className="min-w-0 break-words">
                    Suggested:{' '}
                    <b>{CATEGORIES[inc.ai.category].label}</b>
                    {' · '}
                    Severity {inc.ai.severity}
                  </span>
                </div>
              </div>
            )}

            {/* Incident timeline */}
            <div className="min-w-0">
              <h3 className="mb-4 text-[14px] font-semibold">
                Timeline
              </h3>

              <div className="space-y-4">
                {[...inc.timeline].reverse().map((t, i) => (
                  <div key={i} className="flex min-w-0 items-start gap-3">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: STATUSES[t.status].color,
                      }}
                    />

                    <div className="min-w-0 flex-1 text-[13px]">
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                        <span className="font-semibold leading-5">
                          {STATUSES[t.status].label}
                        </span>

                        <span className="text-[12px] leading-5 text-ink-3">
                          {fmtDateTime(t.at)}
                        </span>
                      </div>

                      <div className="mt-1 break-words leading-5 text-ink-2">
                        {t.note}
                        {' · '}
                        <span className="text-ink-3">
                          {t.by}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Sticky action footer */}
      {inc && (
        <div className="sticky bottom-0 z-10 flex min-w-0 items-center gap-2 border-t border-line bg-surface/95 px-5 py-3.5 backdrop-blur">
          {ctx.role === 'official' &&
            (inc.status === 'pending' || inc.status === 'review') && (
              <Button
                className="flex-1"
                iconRight={ArrowRight}
                onClick={() => (onClose(), ctx.go('verify', inc.id))}
              >
                Open verification
              </Button>
            )}

          {ctx.role === 'official' && inc.status === 'verified' && (
            <Button
              className="flex-1"
              iconRight={ArrowRight}
              onClick={() => (onClose(), ctx.go('assign', inc.id))}
            >
              Assess & dispatch
            </Button>
          )}

          {(inc.status === 'assigned' || inc.status === 'progress') &&
            ctx.role !== 'admin' && (
              <Button
                className="flex-1"
                iconRight={ArrowRight}
                onClick={() => (onClose(), ctx.go('tasks', inc.id))}
              >
                View task
              </Button>
            )}

          {ctx.role === 'official' &&
            (inc.status === 'resolved' || inc.status === 'rejected') && (
              <Button
                variant="secondary"
                className="flex-1"
                icon={RotateCcw}
                onClick={() => (
                  updateIncident(
                    inc.id,
                    { status: 'review' },
                    { note: 'Reopened for review' }
                  ),
                  toast('Incident reopened')
                )}
              >
                Reopen
              </Button>
            )}

          {ctx.role === 'admin' && (
            <div className="min-w-0 flex-1 text-[12px] leading-5 text-ink-3">
              Administrators have read-only access to incident workflows.
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}
