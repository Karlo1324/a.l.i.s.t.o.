import { useCallback, useEffect, useRef, useState } from 'react'
import { fromLatLng } from './geo'

export function locationErrorMessage(code: number) {
  if (code === 1) return 'Location permission was denied. Allow location access in your browser settings, then try again.'
  if (code === 3) return 'Finding your location timed out. Please try again or select a point on the map.'
  return 'Your location is unavailable. Check device location services or select a point on the map.'
}

export function useDeviceLocation() {
  const [location, setLocation] = useState<({ x: number; y: number; accuracy: number }) | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(0)
  useEffect(() => () => { request.current++ }, [])
  const cancel = useCallback(() => { request.current++; setLocating(false) }, [])
  const locate = useCallback(() => {
    const id = ++request.current
    setError('')
    if (!window.isSecureContext || !navigator.geolocation) {
      setLocating(false)
      setError(!window.isSecureContext ? 'Location requires HTTPS or localhost. Open the app using a secure address.' : 'This browser does not support device location.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (request.current !== id) return
        setLocation({ ...fromLatLng(coords.latitude, coords.longitude), accuracy: coords.accuracy })
        setLocating(false)
      },
      (failure) => {
        if (request.current !== id) return
        setError(locationErrorMessage(failure.code))
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }, [])
  return { location, locating, error, locate, cancel }
}
