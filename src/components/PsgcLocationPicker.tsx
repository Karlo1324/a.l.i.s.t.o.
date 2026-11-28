import { useEffect, useMemo, useState } from 'react'
import {
  getPsgcBarangays,
  getPsgcCities,
  getPsgcProvinces,
  getPsgcRegions,
  type PsgcEntry,
} from '../lib/psgc'

export interface PsgcSelection {
  region: PsgcEntry
  province?: PsgcEntry
  city: PsgcEntry
  barangay: PsgcEntry
}

const fieldClass = 'h-12 w-full rounded-[14px] bg-surface-2 px-3.5 text-[15px] text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-accent/60 disabled:opacity-60'

function LocationSelect({ label, value, options, onChange, disabled, loading }: {
  label: string
  value: string
  options: PsgcEntry[]
  onChange: (value: string) => void
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-ink-2">{label}</span>
      <select className={fieldClass} value={value} disabled={disabled || loading || options.length === 0} onChange={event => onChange(event.target.value)}>
        <option value="">{loading ? 'Loading…' : `Choose ${label.toLowerCase()}`}</option>
        {options.map(option => <option key={option.code} value={option.code}>{option.name}</option>)}
      </select>
    </label>
  )
}

export function PsgcLocationPicker({ onChange, resetKey = 0 }: {
  onChange: (selection: PsgcSelection | null) => void
  resetKey?: number
}) {
  const [regions, setRegions] = useState<PsgcEntry[]>([])
  const [provinces, setProvinces] = useState<PsgcEntry[]>([])
  const [cities, setCities] = useState<PsgcEntry[]>([])
  const [barangays, setBarangays] = useState<PsgcEntry[]>([])
  const [regionCode, setRegionCode] = useState('')
  const [provinceCode, setProvinceCode] = useState('')
  const [cityCode, setCityCode] = useState('')
  const [barangayCode, setBarangayCode] = useState('')
  const [loadingRegions, setLoadingRegions] = useState(true)
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadingBarangays, setLoadingBarangays] = useState(false)
  const [provinceRegion, setProvinceRegion] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getPsgcRegions(controller.signal).then(rows => {
      if (!controller.signal.aborted) setRegions(rows)
    }).catch(reason => {
      if (reason.name !== 'AbortError') setError(reason instanceof Error ? reason.message : 'Could not load PSGC regions.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingRegions(false)
    })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!regionCode) {
      setProvinceRegion('')
      setProvinces([])
      return
    }
    const controller = new AbortController()
    setProvinceRegion('')
    setProvinces([])
    setLoadingProvinces(true)
    setError('')
    getPsgcProvinces(regionCode, controller.signal).then(rows => {
      if (!controller.signal.aborted) {
        setProvinces(rows)
        setProvinceRegion(regionCode)
      }
    }).catch(reason => {
      if (reason.name !== 'AbortError') setError(reason instanceof Error ? reason.message : 'Could not load PSGC provinces.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingProvinces(false)
    })
    return () => controller.abort()
  }, [regionCode])

  useEffect(() => {
    if (!regionCode || provinceRegion !== regionCode || (provinces.length > 0 && !provinceCode)) {
      setCities([])
      return
    }
    const controller = new AbortController()
    setCities([])
    setLoadingCities(true)
    setError('')
    getPsgcCities(regionCode, provinces.length ? provinceCode : undefined, controller.signal).then(rows => {
      if (!controller.signal.aborted) setCities(rows)
    }).catch(reason => {
      if (reason.name !== 'AbortError') setError(reason instanceof Error ? reason.message : 'Could not load PSGC cities and municipalities.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingCities(false)
    })
    return () => controller.abort()
  }, [regionCode, provinceCode, provinceRegion, provinces.length])

  useEffect(() => {
    if (!cityCode) {
      setBarangays([])
      return
    }
    const controller = new AbortController()
    setBarangays([])
    setLoadingBarangays(true)
    setError('')
    getPsgcBarangays(cityCode, controller.signal).then(rows => {
      if (!controller.signal.aborted) setBarangays(rows)
    }).catch(reason => {
      if (reason.name !== 'AbortError') setError(reason instanceof Error ? reason.message : 'Could not load PSGC barangays.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingBarangays(false)
    })
    return () => controller.abort()
  }, [cityCode])

  const region = regions.find(item => item.code === regionCode)
  const province = provinces.find(item => item.code === provinceCode)
  const city = cities.find(item => item.code === cityCode)
  const barangay = barangays.find(item => item.code === barangayCode)
  const selection = useMemo(() => region && city && barangay
    ? { region, province, city, barangay }
    : null, [region, province, city, barangay])

  useEffect(() => onChange(selection), [onChange, selection])

  useEffect(() => {
    setRegionCode('')
    setProvinceCode('')
    setCityCode('')
    setBarangayCode('')
    setError('')
    onChange(null)
  }, [resetKey, onChange])

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <LocationSelect label="Region" value={regionCode} options={regions} loading={loadingRegions} onChange={value => {
          setRegionCode(value)
          setProvinceCode('')
          setCityCode('')
          setBarangayCode('')
          setError('')
        }} />
        {provinceRegion === regionCode && provinces.length > 0 && <LocationSelect label="Province" value={provinceCode} options={provinces} loading={loadingProvinces} disabled={!regionCode} onChange={value => {
          setProvinceCode(value)
          setCityCode('')
          setBarangayCode('')
        }} />}
        <LocationSelect label="City / municipality" value={cityCode} options={cities} loading={loadingCities || loadingProvinces} disabled={!regionCode || (provinces.length > 0 && !provinceCode)} onChange={value => {
          setCityCode(value)
          setBarangayCode('')
        }} />
        <LocationSelect label="Barangay" value={barangayCode} options={barangays} loading={loadingBarangays} disabled={!cityCode} onChange={value => setBarangayCode(value)} />
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </div>
  )
}
