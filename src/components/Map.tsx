import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { divIcon, type Map as LeafletMap } from 'leaflet'
import { Circle, CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import { CATEGORIES, STATUSES, type Category, type Status } from '../data/meta'
import { LANDMARKS, type Responder } from '../data/records'
import { cx } from '../lib/format'
import { fromLatLng, mapZoom, toLatLng } from '../lib/geo'
import { useDeviceLocation } from '../lib/useDeviceLocation'
import 'leaflet/dist/leaflet.css'

export interface MapMarker {
  id: string
  x: number
  y: number
  category: Category
  status?: Status
  pulse?: boolean
  dim?: boolean
}

interface Props {
  markers?: MapMarker[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  heatmap?: boolean
  clusters?: boolean
  hazard?: boolean
  landmarks?: boolean
  responders?: Responder[]
  onSelectResponder?: (id: string) => void
  highlightResponder?: string | null
  user?: { x: number; y: number } | null
  pin?: { x: number; y: number } | null
  onPick?: (x: number, y: number) => void
  focus?: { x: number; y: number; zoom?: number; key?: string | number } | null
  interactive?: boolean
  autoLocate?: boolean
  controls?: boolean
  controlsClassName?: string
  initialZoom?: number
  className?: string
  children?: ReactNode
  followLocation?: boolean
  labels?: boolean
  routeTo?: { from: { x: number; y: number }; to: { x: number; y: number } } | null
}

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function MapController({ focus, onPick, onReady, onZoom }: Pick<Props, 'focus' | 'onPick'> & { onReady: (map: LeafletMap) => void; onZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    click: (event) => {
      const point = fromLatLng(event.latlng.lat, event.latlng.lng)
      onPick?.(point.x, point.y)
    },
    zoomend: () => onZoom(map.getZoom()),
  })
  useEffect(() => {
    onReady(map)
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map, onReady])
  useEffect(() => {
    if (focus) map.setView(toLatLng(focus), mapZoom(focus.zoom), { animate: false })
  }, [map, focus?.x, focus?.y, focus?.zoom, focus?.key])
  return null
}

function IncidentMarkers({ markers, clusters, selectedId, onSelect, zoom }: Pick<Props, 'markers' | 'clusters' | 'selectedId' | 'onSelect'> & { zoom: number }) {
  const map = useMap()
  const groups = useMemo(() => {
    const result: { items: MapMarker[]; x: number; y: number }[] = []
    for (const marker of markers ?? []) {
      const pixel = map.project(toLatLng(marker), zoom)
      const group = clusters && zoom < 18 && marker.id !== selectedId
        ? result.find((g) => !g.items.some((i) => i.id === selectedId) && Math.hypot(g.x - pixel.x, g.y - pixel.y) < 44)
        : undefined
      if (group) {
        const n = group.items.length
        group.x = (group.x * n + pixel.x) / (n + 1)
        group.y = (group.y * n + pixel.y) / (n + 1)
        group.items.push(marker)
      } else result.push({ items: [marker], x: pixel.x, y: pixel.y })
    }
    return result
  }, [map, markers, clusters, selectedId, zoom])
  return <>{groups.map((group) => {
    const marker = group.items[0]
    if (group.items.length > 1) return <Marker key={marker.id} position={map.unproject([group.x, group.y], zoom)}
      icon={divIcon({ className: 'alisto-map-cluster', html: String(group.items.length), iconSize: [38, 38], iconAnchor: [19, 19] })}
      eventHandlers={{ click: () => map.setView(map.unproject([group.x, group.y], zoom), Math.min(19, zoom + 1)) }}>
      <Tooltip>{group.items.length} incidents · click to expand</Tooltip>
    </Marker>
    const color = CATEGORIES[marker.category].color
    return <CircleMarker key={marker.id} center={toLatLng(marker)} radius={selectedId === marker.id ? 13 : 9}
      bubblingMouseEvents={false}
      pathOptions={{ color: selectedId === marker.id ? '#0b1e45' : '#fff', weight: selectedId === marker.id ? 4 : 2, fillColor: color, fillOpacity: marker.dim ? 0.35 : 0.95, className: marker.pulse ? 'alisto-map-urgent' : '' }}
      eventHandlers={{ click: () => onSelect?.(marker.id) }}>
      <Tooltip>{CATEGORIES[marker.category].label}{marker.status ? ` · ${STATUSES[marker.status].label}` : ''}</Tooltip>
    </CircleMarker>
  })}</>
}

/** Shared geographic map. */
export function MapView({ markers = [], selectedId, onSelect, heatmap, clusters, hazard, landmarks,
  responders, onSelectResponder, highlightResponder, user, pin, onPick, focus,
  interactive = true, autoLocate, followLocation = false, controls = true, controlsClassName, initialZoom = 1,
  className, children, routeTo }: Props) {
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [zoom, setZoom] = useState(mapZoom(focus?.zoom ?? initialZoom))
  const [tileError, setTileError] = useState(false)
  const [retry, setRetry] = useState(0)
  const { location, locating, error: locationError, locate } = useDeviceLocation(followLocation)
  const shouldLocate = useRef(autoLocate ?? (interactive && controls && !focus && !routeTo))
  const pickRef = useRef(onPick)
  pickRef.current = onPick
  useEffect(() => { if (shouldLocate.current) locate() }, [locate])
  useEffect(() => {
    if (map && location) {
      map.setView(toLatLng(location), 17, { animate: false })
      pickRef.current?.(location.x, location.y)
    }
  }, [map, location])
  const userPoint = location ?? user
  const initial = useRef({ center: toLatLng(focus ?? user ?? { x: 50, y: 50 }), zoom: mapZoom(focus?.zoom ?? initialZoom) })
  return (
    <div className={cx(!/(^|\s)(absolute|fixed)(\s|$)/.test(className ?? '') && 'relative', 'alisto-map isolate overflow-hidden bg-surface-2', className)}>
      <MapContainer center={initial.current.center} zoom={initial.current.zoom} minZoom={3} maxZoom={19}
        zoomSnap={0.25} zoomControl={false} attributionControl={true}
        dragging={interactive} scrollWheelZoom={interactive} doubleClickZoom={interactive}
        touchZoom={interactive} boxZoom={interactive} keyboard={interactive}
        className="absolute inset-0 h-full w-full" style={{ zIndex: 0 }}>
        <TileLayer key={retry} url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19}
          eventHandlers={{ tileerror: () => setTileError(true) }} />
        <MapController focus={focus} onPick={interactive ? onPick : undefined} onReady={setMap} onZoom={setZoom} />
        {heatmap && markers.map((marker) => <Circle key={marker.id} center={toLatLng(marker)} radius={marker.status === 'resolved' ? 45 : 90}
          interactive={false} pathOptions={{ stroke: false, fillColor: '#ef482b', fillOpacity: 0.12 }} />)}
        {routeTo && <Polyline positions={[toLatLng(routeTo.from), toLatLng(routeTo.to)]}
          interactive={false} pathOptions={{ color: '#1f4fd1', weight: 4, dashArray: '8 8' }} />}
        {landmarks && LANDMARKS.map((landmark) => <CircleMarker key={landmark.id} center={toLatLng(landmark)} radius={7}
          bubblingMouseEvents={false} pathOptions={{ color: '#fff', weight: 2, fillColor: '#22a06b', fillOpacity: 1 }}>
          <Tooltip>{landmark.label}</Tooltip>
        </CircleMarker>)}
        {responders?.map((responder) => <CircleMarker key={responder.id} center={toLatLng(responder)} radius={highlightResponder === responder.id ? 12 : 8}
          bubblingMouseEvents={false}
          pathOptions={{ color: highlightResponder === responder.id ? '#0b1e45' : '#fff', weight: 3, fillColor: responder.status === 'available' ? '#22a06b' : '#3b6ef0', fillOpacity: 1 }}
          eventHandlers={{ click: () => onSelectResponder?.(responder.id) }}>
          <Tooltip>{responder.name} · {responder.team}</Tooltip>
        </CircleMarker>)}
        <IncidentMarkers markers={markers} selectedId={selectedId} onSelect={onSelect} clusters={clusters} zoom={zoom} />
        {location && <Circle center={toLatLng(location)} radius={location.accuracy} interactive={false}
          pathOptions={{ color: '#3b82f6', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.1 }} />}
        {userPoint && <CircleMarker center={toLatLng(userPoint)} radius={7}
          pathOptions={{ color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 }}>
          <Tooltip>{location ? `Your location · accuracy ±${Math.round(location.accuracy)} m` : 'Selected location'}</Tooltip>
        </CircleMarker>}
        {pin && <Marker position={toLatLng(pin)} draggable={interactive && !!onPick}
          icon={divIcon({ className: 'alisto-map-pin', html: '<span></span>', iconSize: [28, 36], iconAnchor: [14, 36] })}
          eventHandlers={{ dragend: (event) => { const p = event.target.getLatLng(); const point = fromLatLng(p.lat, p.lng); onPick?.(point.x, point.y) } }} />}
      </MapContainer>
      <div className="pointer-events-none absolute inset-0 z-[1] [&>*]:pointer-events-auto">{children}</div>
      {controls && interactive && <div className={cx('absolute right-3 bottom-8 z-[2] flex flex-col gap-2', controlsClassName)}>
        <div className="glass-strong overflow-hidden rounded-[14px] shadow-float ring-1 ring-line">
          <button type="button" aria-label="Zoom in" onClick={() => map?.zoomIn()} className="flex h-10 w-10 items-center justify-center"><Plus size={18} /></button>
          <button type="button" aria-label="Zoom out" onClick={() => map?.zoomOut()} className="flex h-10 w-10 items-center justify-center border-t border-line"><Minus size={18} /></button>
        </div>
        <button type="button" aria-label="Use current location" title="Use current location" disabled={locating} onClick={locate}
          className="glass-strong flex h-10 w-10 items-center justify-center rounded-[14px] text-accent shadow-float disabled:opacity-60"><LocateFixed size={18} className={locating ? 'animate-pulse' : ''} /></button>
      </div>}
      {followLocation && location && !locationError && <div className="pointer-events-none absolute bottom-6 left-2 z-[2] rounded-sm bg-surface/95 px-2 py-1 font-mono text-[10px] tabular-nums text-ink-2">
        <span className="sr-only">Your latitude and longitude </span>{toLatLng(location).map(coordinate => coordinate.toFixed(4)).join(', ')} · ±{Math.round(location.accuracy)} m
      </div>}
      {(locationError || locating) && <div role="status" className="absolute inset-x-3 top-[30%] z-[3] mx-auto max-w-sm rounded-xl bg-surface p-3 text-center text-sm shadow-pop">
        {locating ? 'Finding your current location…' : locationError}
        {locationError && <button type="button" className="ml-2 font-semibold text-accent" onClick={locate}>Try again</button>}
      </div>}
      <div className="pointer-events-none absolute bottom-0 left-0 z-[2] max-w-[55%] bg-white/90 px-1.5 py-0.5 text-[9px] leading-tight text-slate-700">
        {routeTo ? 'Direct line, not road directions' : ''}{hazard ? ' · Flood layer unavailable' : ''}
      </div>
      {tileError && <div role="status" className="absolute inset-x-3 top-1/2 z-[3] mx-auto max-w-sm rounded-xl bg-surface p-3 text-center text-sm shadow-pop">
        Map tiles could not load. Check your connection.
        <button type="button" className="ml-2 font-semibold text-accent" onClick={() => { setTileError(false); setRetry((n) => n + 1) }}>Retry</button>
      </div>}
    </div>
  )
}
