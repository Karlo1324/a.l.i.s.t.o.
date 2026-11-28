export interface PsgcEntry {
  code: string
  name: string
}

const API_URL = 'https://psgc.cloud/api/v2'

async function getEntries(path: string, signal?: AbortSignal): Promise<PsgcEntry[]> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw new Error(`PSGC Cloud returned ${response.status} while loading barangay locations.`)

  const payload: unknown = await response.json()
  const entries = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && 'data' in payload && Array.isArray(payload.data)
      ? payload.data
      : null
  if (!entries) throw new Error('PSGC Cloud returned an unexpected location response.')

  return entries.filter((entry): entry is PsgcEntry =>
    !!entry && typeof entry === 'object' && 'code' in entry && typeof entry.code === 'string'
      && 'name' in entry && typeof entry.name === 'string',
  )
}

export function getPsgcRegions(signal?: AbortSignal) {
  return getEntries('/regions', signal)
}

export function getPsgcProvinces(regionCode: string, signal?: AbortSignal) {
  return getEntries(`/regions/${encodeURIComponent(regionCode)}/provinces`, signal)
}

export function getPsgcCities(regionCode: string, provinceCode?: string, signal?: AbortSignal) {
  const path = provinceCode
    ? `/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities`
    : `/regions/${encodeURIComponent(regionCode)}/cities-municipalities`
  return getEntries(path, signal)
}

export function getPsgcBarangays(cityCode: string, signal?: AbortSignal) {
  return getEntries(`/cities-municipalities/${encodeURIComponent(cityCode)}/barangays`, signal)
}
