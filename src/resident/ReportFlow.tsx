import { useEffect, useRef, useState } from 'react'
import { Camera, Check, ChevronLeft, ImagePlus, Lightbulb, LocateFixed, MapPin, Minus, Pencil, Phone, Plus, ShieldCheck, X } from 'lucide-react'
import { Button, CategoryIcon, Sheet, Switch, TextArea, TextInput } from '../components/ui'
import { MapView } from '../components/Map'
import { CATEGORIES, CATEGORY_KEYS, type Category } from '../data/meta'
import { type Incident } from '../data/records'
import { cx } from '../lib/format'
import { useStore } from '../store'
import { addressFor, useNav } from './common'
import { useDeviceLocation } from '../lib/useDeviceLocation'

const STEPS = ['Category', 'Details', 'Photos', 'Location', 'Review']
const SUGGEST: Record<Category, string[]> = {
  flooding: ['Street flooding', 'Clogged drainage', 'Water entering homes'],
  road: ['Pothole', 'Road crack', 'Sinkhole'],
  building: ['Collapsed wall', 'Roof damage', 'Structural crack'],
  tree: ['Fallen tree blocking road', 'Branch on power line', 'Leaning tree'],
  landslide: ['Soil erosion', 'Rockfall', 'Slope crack'],
  electrical: ['Downed power line', 'Sparking post', 'Exposed wiring'],
  other: ['Broken streetlight', 'Missing drainage cover', 'Damaged footbridge'],
}
export function ReportFlow({ initialCategory }: { initialCategory?: Category }) {
  const nav = useNav()
  const { submitReport, signedIn, resident } = useStore()
  const [step, setStep] = useState(initialCategory ? 1 : 0)
  const [category, setCategory] = useState<Category | null>(initialCategory ?? null)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [danger, setDanger] = useState(false)
  const [affectedText, setAffectedText] = useState('0')
  const affected = Number(affectedText)
  const [photos, setPhotos] = useState<string[]>([])
  const [loc, setLoc] = useState<{ x: number; y: number } | null>(null)
  const { location, locating, error: locationError, locate, cancel: cancelLocate } = useDeviceLocation()
  const [landmark, setLandmark] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reportId] = useState(() => crypto.randomUUID())
  const uploads = useRef(new Map<string, string>())
  const [error, setError] = useState('')
  const [done, setDone] = useState<Incident | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [flash, setFlash] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (location) setLoc(location) }, [location])
  useEffect(() => {
    if (step === 3 && !loc) locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const addr = loc ? addressFor(loc.x, loc.y) : null
  const canNext = [!!category, title.trim().length >= 5 && desc.trim().length >= 10, true, !!loc && !locating, true][step]

  const cameraRef = useRef<HTMLInputElement>(null)
  const takePhoto = () => cameraRef.current?.click()
  const uploadPhotos = (files: FileList | null) => {
    if (Array.from(files ?? []).some(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 5242880)) {
      setError('Choose JPEG, PNG, or WebP photos up to 5 MB each.')
      return
    }
    setError('')
    const selected = Array.from(files ?? []).filter((f) => f.type.startsWith('image/')).slice(0, 6 - photos.length)
    setPhotos((list) => [...list, ...selected.map((f) => URL.createObjectURL(f))].slice(0, 6))
  }

  const submit = async () => {
    if (!category || !loc || !addr || submitting) return
    const report = { category, title: title.trim(), description: desc.trim(), photos, x: loc.x, y: loc.y, address: addr.address, purok: addr.purok, landmark: landmark || undefined, danger, affected, anonymous }
    setSubmitting(true)
    setError('')
    try {
      const saved = signedIn ? await (await import('../lib/submitResidentReport')).submitResidentReport(
        reportId, resident.id, report, location?.x === loc.x && location?.y === loc.y ? 'GPS' : 'MANUAL', uploads.current
      ) : undefined
      setDone(submitReport(report, saved))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done)
    return (
      <div className="absolute inset-0 z-40 flex animate-fade-in flex-col bg-bg px-6 pt-[120px] pb-12">
        <div className="flex flex-1 flex-col items-center text-center">
          <div className="relative">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-[#22a06b]/30" />
            <span className="relative flex h-24 w-24 animate-pop items-center justify-center rounded-full bg-[#22a06b] text-white shadow-[0_20px_40px_-15px_rgba(34,160,107,.8)]">
              <Check size={48} strokeWidth={2.6} />
            </span>
          </div>
          <h1 className="mt-8 text-[30px] font-bold tracking-tight">{signedIn ? 'Report submitted' : 'Report added locally'}</h1>
          <p className="mt-2 max-w-[300px] text-[16px] leading-relaxed text-ink-2">{signedIn ? 'Your report is pending barangay verification.' : 'Your guest report is stored locally until you refresh.'}</p>
          <div className="mt-8 w-full rounded-[22px] bg-surface p-4 text-left shadow-card ring-1 ring-line">
            <div className="flex items-center gap-3">
              <CategoryIcon category={done.category} size={44} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-semibold">{done.title}</div>
                <div className="text-[13px] text-ink-3">{done.address}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-[14px] bg-surface-2 px-3.5 py-2.5">
              <span className="text-[13px] text-ink-3">Reference no.</span>
              <span className="font-mono text-[15px] font-semibold">{done.code}</span>
            </div>
          </div>
        </div>
        <Button size="lg" className="w-full" onClick={() => nav.replace({ name: 'reportDetail', id: done.id })}>
          Track this report
        </Button>
        <Button size="lg" variant="ghost" className="mt-2 w-full" onClick={() => nav.pop()}>
          Done
        </Button>
      </div>
    )

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-bg">
      {/* header */}
      <div className="relative z-10 px-4 pt-[54px]">
        <div className="flex h-11 items-center justify-between">
          <button disabled={submitting} onClick={() => (step === 0 || (initialCategory && step === 1) ? (category || title ? setConfirmClose(true) : nav.pop()) : setStep(step - 1))} className="flex items-center text-[17px] text-accent">
            {step === 0 ? <X size={24} /> : <ChevronLeft size={28} strokeWidth={2.2} />}
            {step === 0 ? '' : 'Back'}
          </button>
          <span className="text-[17px] font-semibold">New report</span>
          <button disabled={submitting} onClick={() => setConfirmClose(true)} className="text-[17px] text-ink-3">
            Cancel
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3 rounded-[18px] bg-danger-soft p-3.5">
          <Phone size={18} className="shrink-0 text-danger" />
          <span className="flex-1 text-[13px] leading-snug text-ink">
            <b>Life-threatening emergency?</b> Contact your local emergency service first.
          </span>
          <button onClick={() => nav.openSheet('hotlines')} className="text-[13px] font-semibold text-danger">
            Call
          </button>
        </div>
        <div className="mt-2 flex gap-1.5">
          {STEPS.map((s, i) => (
            <span key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
              <span className="block h-full rounded-full bg-accent transition-all duration-500" style={{ width: i <= step ? '100%' : '0%' }} />
            </span>
          ))}
        </div>
        <div className="mt-2 text-[13px] font-medium text-ink-3">
          Step {step + 1} of 5 · {STEPS[step]}
        </div>
      </div>

      <div key={step} className={cx('no-scrollbar relative flex-1 animate-slide-in overflow-y-auto', step === 3 ? '' : 'px-5 pt-4 pb-6')}>
        {step === 0 && (
          <>
            <h1 className="text-[28px] font-bold tracking-[-0.02em]">What happened?</h1>
            <p className="mt-1 text-[15px] text-ink-2">Choose the category that best describes the incident.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {CATEGORY_KEYS.map((k) => {
                const c = CATEGORIES[k]
                const on = category === k
                return (
                  <button
                    key={k}
                    onClick={() => setCategory(k)}
                    className={cx('relative flex flex-col items-start rounded-[22px] p-4 text-left transition active:scale-[0.97]', on ? 'bg-surface shadow-float ring-2' : 'bg-surface shadow-card ring-1 ring-line', k === 'other' && 'col-span-2 flex-row items-center gap-3')}
                    style={on ? ({ '--tw-ring-color': c.color } as React.CSSProperties) : undefined}
                  >
                    <CategoryIcon category={k} size={44} solid={on} />
                    <div className={k === 'other' ? '' : 'mt-3'}>
                      <div className="text-[15px] font-semibold">{c.label}</div>
                      <div className="mt-0.5 text-[12px] leading-snug text-ink-3">{c.desc}</div>
                    </div>
                    {on && (
                      <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: c.color }}>
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {step === 1 && category && (
          <>
            <div className="flex items-center gap-3">
              <CategoryIcon category={category} size={40} />
              <div>
                <div className="text-[13px] font-medium text-ink-3">{CATEGORIES[category].label}</div>
                <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">Tell us more</h1>
              </div>
            </div>
            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-ink-2">Short title</label>
                <TextInput value={title} onChange={(e) => setTitle(e.target.value.slice(0, 60))} placeholder="e.g. Street flooding near covered court" />
                <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
                  {SUGGEST[category].map((s) => (
                    <button key={s} onClick={() => setTitle(s)} className="shrink-0 rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 flex justify-between text-[13px] font-semibold text-ink-2">
                  Description <span className="font-normal text-ink-3 tabular">{desc.length}/500</span>
                </label>
                <TextArea rows={5} value={desc} onChange={(e) => setDesc(e.target.value.slice(0, 500))} placeholder="What do you see? How big is the area? Is it getting worse? (English or Filipino)" />
              </div>
              <div className="overflow-hidden rounded-[18px] bg-surface ring-1 ring-line">
                <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
                  <div className="flex-1">
                    <div className="text-[15px] font-semibold">Is anyone in immediate danger?</div>
                    <div className="text-[13px] text-ink-3">Marks the local report as urgent</div>
                  </div>
                  <Switch checked={danger} onChange={setDanger} label="Immediate danger" />
                </div>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1">
                    <div className="text-[15px] font-semibold">People affected</div>
                    <div className="text-[13px] text-ink-3">Your best estimate</div>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
                    <button aria-label="Decrease" onClick={() => setAffectedText(String(Math.max(0, affected - 5)))} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface shadow-card">
                      <Minus size={16} />
                    </button>
                    <input aria-label="People affected" type="text" inputMode="numeric" pattern="[0-9]*"
                      value={affectedText} placeholder="0"
                      onChange={event => {
                        const digits = event.target.value.replace(/[^0-9]/g, '')
                        if (Number.isSafeInteger(Number(digits))) setAffectedText(digits)
                      }}
                      onFocus={event => event.target.select()}
                      onBlur={() => setAffectedText(String(affected))}
                      className="h-8 w-16 rounded-lg bg-surface text-center text-[16px] font-semibold tabular ring-1 ring-line" />
                    <button aria-label="Increase" onClick={() => setAffectedText(String(Math.min(Number.MAX_SAFE_INTEGER, affected + 5)))} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface shadow-card">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && category && (
          <>
            <h1 className="text-[28px] font-bold tracking-[-0.02em]">Add photos</h1>
            <p className="mt-1 text-[15px] text-ink-2">Clear photos help officials verify your report faster. Up to 6.</p>
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {photos.map((p, i) => (
                <div key={p + i} className="relative aspect-square animate-pop overflow-hidden rounded-[18px] bg-surface-2">
                  <img src={p} alt={`Incident photo ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">Cover</span>}
                  <button aria-label="Remove photo" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur">
                    <X size={14} strokeWidth={2.6} />
                  </button>
                </div>
              ))}
              {photos.length < 6 &&
                Array.from({ length: Math.max(1, 3 - photos.length) }).map((_, i) => (
                  <button key={`add${i}`} onClick={takePhoto} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-dashed border-line-2 bg-surface text-ink-3 transition hover:text-accent">
                    <Plus size={22} />
                    {i === 0 && <span className="text-[11px] font-semibold">Add</span>}
                  </button>
                ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="tinted" size="lg" icon={Camera} onClick={takePhoto} disabled={photos.length >= 6}>
                Camera
              </Button>
              <Button variant="secondary" size="lg" icon={ImagePlus} onClick={() => fileRef.current?.click()} disabled={photos.length >= 6}>
                Library
              </Button>
              <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => { uploadPhotos(e.target.files); e.target.value = '' }} />
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  uploadPhotos(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>
            <div className="mt-6 flex gap-3 rounded-[18px] bg-surface p-4 ring-1 ring-line">
              <Lightbulb size={20} className="shrink-0 text-warn" />
              <div className="text-[13px] leading-relaxed text-ink-2">
                <b className="text-ink">Photo tips:</b> Capture the whole scene and one close-up. Include a landmark if possible. Avoid photographing faces of bystanders.
              </div>
            </div>
            {photos.length === 0 && <p className="mt-4 text-center text-[13px] text-ink-3">You can continue without photos, but verification may take longer.</p>}
          </>
        )}

        {step === 3 && (
          <div className="relative h-full min-h-[560px]">
            <MapView
              className="absolute inset-0"
              autoLocate={false}
              pin={loc}
              user={location}
              onPick={(x, y) => { cancelLocate(); setLoc({ x, y }) }}
              focus={loc ? { x: loc.x, y: loc.y, zoom: 2.2 } : undefined}
              landmarks
              controlsClassName="bottom-[218px]"
            >
              <div className="glass-strong absolute top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium shadow-float ring-1 ring-line">
                Tap the map to adjust the pin
              </div>
              <div className="glass-strong absolute inset-x-3 bottom-3 rounded-[24px] p-4 shadow-float ring-1 ring-line">
                {locationError && <p role="status" className="mb-2 text-[13px] text-danger">{locationError}</p>}
                {!locating && !loc && <Button variant="secondary" onClick={locate}>Use current location</Button>}
                {locating ? (
                  <div className="flex items-center gap-3 py-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-r-transparent" />
                    <div>
                      <div className="text-[15px] font-semibold">Finding your location…</div>
                      <div className="text-[13px] text-ink-3">Using GPS and nearby Wi-Fi</div>
                    </div>
                  </div>
                ) : (
                  addr && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-alert/12 text-alert">
                          <MapPin size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[16px] font-semibold">{addr.address}</div>
                          <div className="text-[13px] text-ink-3">
                            {location && loc?.x === location.x && loc?.y === location.y ? `Device accuracy ±${Math.round(location.accuracy)} m` : 'Location selected on map'}
                          </div>
                        </div>
                        <button onClick={locate} aria-label="Use current location" className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                          <LocateFixed size={18} />
                        </button>
                      </div>
                      <TextInput className="mt-3 h-11 bg-surface" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Nearby landmark (optional)" />
                    </>
                  )
                )}
              </div>
            </MapView>
          </div>
        )}

        {step === 4 && category && addr && loc && (
          <>
            <h1 className="text-[28px] font-bold tracking-[-0.02em]">Review & submit</h1>
            <p className="mt-1 text-[15px] text-ink-2">Make sure everything looks right.</p>
            <div className="mt-5 overflow-hidden rounded-[22px] bg-surface shadow-card ring-1 ring-line">
              {photos.length > 0 && (
                <div className="no-scrollbar flex gap-1 overflow-x-auto">
                  {photos.map((p, i) => (
                    <img key={i} src={p} alt="" className={cx('h-36 shrink-0 object-cover', photos.length === 1 ? 'w-full' : 'w-[62%]')} />
                  ))}
                </div>
              )}
              <div className="space-y-4 p-4">
                <ReviewRow label="Category" onEdit={() => setStep(0)}>
                  <span className="flex items-center gap-2">
                    <CategoryIcon category={category} size={24} /> {CATEGORIES[category].label}
                  </span>
                </ReviewRow>
                <ReviewRow label="Details" onEdit={() => setStep(1)}>
                  <div className="font-semibold">{title}</div>
                  <div className="mt-0.5 text-[14px] leading-relaxed text-ink-2">{desc}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {danger && <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">People in danger</span>}
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2">~{affected} affected</span>
                  </div>
                </ReviewRow>
                <ReviewRow label="Photos" onEdit={() => setStep(2)}>
                  {photos.length ? `${photos.length} attached` : <span className="text-warn">No photos</span>}
                </ReviewRow>
                <ReviewRow label="Location" onEdit={() => setStep(3)}>
                  <div>{addr.address}</div>
                  <div className="text-[13px] text-ink-3">
                    {addr.purok}
                    {landmark && ` · near ${landmark}`}
                  </div>
                  <div className="relative mt-2 h-28 overflow-hidden rounded-[14px]">
                    <MapView interactive={false} controls={false} pin={loc} focus={{ x: loc.x, y: loc.y, zoom: 2.4 }} initialZoom={2.4} labels={false} className="absolute inset-0" />
                  </div>
                </ReviewRow>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-[18px] bg-surface px-4 py-3.5 ring-1 ring-line">
              <div className="flex-1">
                <div className="text-[15px] font-semibold">Hide my name publicly</div>
                <div className="text-[13px] text-ink-3">Officials can still see your contact info</div>
              </div>
              <Switch checked={anonymous} onChange={setAnonymous} label="Hide my name" />
            </div>
            <div className="mt-4 flex gap-2.5 px-1 text-[12px] leading-relaxed text-ink-3">
              <ShieldCheck size={16} className="mt-0.5 shrink-0" />
              By submitting, you confirm this report is accurate. {signedIn ? 'Your report will be sent for verification.' : 'Guest reports are stored only in this workspace.'}
            </div>
          </>
        )}
      </div>

      {step !== 3 || !locating ? (
        <div className={cx('relative z-10 px-5 pt-3 pb-9', step === 3 ? 'bg-surface' : 'glass-strong border-t border-line')}>
          {error && <p role="alert" className="mb-2 text-sm text-danger">{error}</p>}
          {step < 4 ? (
            <Button size="lg" className="w-full" disabled={!canNext} onClick={() => setStep(step + 1)}>
              {step === 2 && photos.length === 0 ? 'Skip for now' : step === 3 ? 'Confirm location' : 'Continue'}
            </Button>
          ) : (
            <Button size="lg" className="w-full bg-alert text-white" loading={submitting} onClick={submit}>
              {signedIn ? 'Submit report' : 'Add report locally'}
            </Button>
          )}
        </div>
      ) : null}

      {flash && <div className="pointer-events-none absolute inset-0 z-[70] bg-white" />}

      <Sheet open={confirmClose} onClose={() => setConfirmClose(false)}>
        <div className="pt-2 pb-2 text-center">
          <div className="text-[19px] font-bold">Discard this report?</div>
          <p className="mt-1 text-[15px] text-ink-2">Your details and photos will not be saved.</p>
          <Button size="lg" variant="danger" className="mt-5 w-full" onClick={() => nav.pop()}>
            Discard
          </Button>
          <Button size="lg" variant="ghost" className="mt-2 w-full" onClick={() => setConfirmClose(false)}>
            Keep editing
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

function ReviewRow({ label, children, onEdit }: { label: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="border-b border-line pb-4 last:border-0 last:pb-0">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">{label}</span>
        <button onClick={onEdit} className="flex items-center gap-1 text-[13px] font-semibold text-accent">
          <Pencil size={12} /> Edit
        </button>
      </div>
      <div className="text-[15px]">{children}</div>
    </div>
  )
}

