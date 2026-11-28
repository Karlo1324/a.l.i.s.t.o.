import type { Incident } from './records'
import { fromLatLng, toLatLng } from '../lib/geo'

export const MOCK_PLACES = {
  'Barangay Binaton': fromLatLng(6.8374, 125.3520),
  'Digos City (city center)': fromLatLng(6.7443, 125.3565),
}

export type MockPlace = keyof typeof MOCK_PLACES

export function createMockIncidents(place: MockPlace): Incident[] {
  const center = MOCK_PLACES[place]
  const now = Date.now()
  return ([
    ['Water across the footbridge', 'flooding', 'pending', 'high', 44, 46, 2, 'Creekside'],
    ['Drain backing up', 'flooding', 'review', 'medium', 48, 49, 6, 'Creekside'],
    ['Downed power line', 'electrical', 'verified', 'critical', 61, 38, 18, 'Market area'],
    ['Fallen tree across access road', 'tree', 'assigned', 'high', 66, 55, 48, 'Market area'],
    ['Road cleared after flooding', 'road', 'resolved', 'low', 38, 62, 72, 'West sector'],
    ['Cracked retaining wall', 'building', 'review', 'medium', 32, 69, 240, 'West sector'],
  ] as const).map(([title, category, status, priority, column, row, hoursAgo, purok], index) => {
    const at = new Date(now - hoursAgo * 3600000)
    const point = { x: center.x + column - 50, y: center.y + row - 50 }
    const [lat, lng] = toLatLng(point)
    return {
      id: `${place}-sample-${index}`, code: `DEMO-${101 + index}`, title, category, status, priority,
      x: point.x, y: point.y, lat, lng, purok, address: `${purok}, ${place}`, description: '', danger: priority === 'critical',
      reporter: { id: 'sample', name: 'Sample resident', phone: '', verified: false },
      createdAt: at, updatedAt: at, photos: [], timeline: [], affected: 0, confirmations: 0,
    }
  })
}
