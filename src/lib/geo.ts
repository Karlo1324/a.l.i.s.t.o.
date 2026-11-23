/** Convert internal map coordinates to geographic coordinates. */
export function toLatLng(point: { x: number; y: number }): [number, number] {
  return [14.6507 + (50 - point.y) * 0.00011, 121.1029 + (point.x - 50) * 0.00016]
}

export function fromLatLng(lat: number, lng: number) {
  return { x: 50 + (lng - 121.1029) / 0.00016, y: 50 - (lat - 14.6507) / 0.00011 }
}

export function mapZoom(scale = 1) {
  return Math.min(19, Math.max(14, 16 + Math.log2(scale)))
}
