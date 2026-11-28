import { useCallback, useEffect, useRef, useState } from 'react'
import { fromLatLng } from './geo'

export function locationErrorMessage(code: number) {
  if (code === 1) return 'Location permission was denied. Allow location access in your browser settings, then try again.'
  if (code === 3) return 'Finding your location timed out. Please try again or select a point on the map.'
  return 'Your location is unavailable. Check device location services or select a point on the map.'
}

export function useDeviceLocation(follow = false) {
  const [location, setLocation] = useState<({ x: number; y: number; accuracy: number }) | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(0)
  const watch = useRef<number | null>(null)
  const stopWatch = useCallback(() => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current)
    watch.current = null
  }, [])
  useEffect(() => () => { request.current++; stopWatch() }, [stopWatch])
  const cancel = useCallback(() => { request.current++; stopWatch(); setLocating(false) }, [stopWatch])
  const locate = useCallback(() => {
    stopWatch()
    const id = ++request.current
    setError('')
    if (!window.isSecureContext || !navigator.geolocation) {
      setLocating(false)
      setError(!window.isSecureContext ? 'Location requires HTTPS or localhost. Open the app using a secure address.' : 'This browser does not support device location.')
      return
    }
    setLocating(true)
    const onPosition = ({ coords }: GeolocationPosition) => {
        if (request.current !== id) return
        setError('')
        setLocation({ ...fromLatLng(coords.latitude, coords.longitude), accuracy: coords.accuracy })
        setLocating(false)
      }
    const onError = (failure: GeolocationPositionError) => {
        if (request.current !== id) return
        setError(locationErrorMessage(failure.code))
        setLocating(false)
      }
    const options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    if (follow) watch.current = navigator.geolocation.watchPosition(onPosition, onError, options)
    else navigator.geolocation.getCurrentPosition(onPosition, onError, options)
  }, [follow, stopWatch])
  return { location, locating, error, locate, cancel }
}
