import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { Incident } from '../data/records'

export function IncidentDensity3D({ incidents }: { incidents: Incident[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(7, 6, 8)
    camera.lookAt(0, 0, 0)
    const root = new THREE.Group()
    scene.add(root)
    root.rotation.y = -0.45
    const light = new THREE.DirectionalLight(0xffffff, 2.2)
    light.position.set(4, 8, 5)
    scene.add(light, new THREE.AmbientLight(0x7fa7ee, 1.6))
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshBasicMaterial({ color: 0x1f4fd1, transparent: true, opacity: 0.08 }))
    floor.rotation.x = -Math.PI / 2
    root.add(floor)
    const counts = new Map<string, number>()
    incidents.forEach(incident => {
      const key = `${Math.min(5, Math.max(0, Math.floor(incident.x / 17)))}:${Math.min(4, Math.max(0, Math.floor(incident.y / 20)))}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    counts.forEach((count, key) => {
      const [column, row] = key.split(':').map(Number)
      const height = 0.25 + count * 0.38
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.72, height, 0.72), new THREE.MeshStandardMaterial({ color: count > 2 ? 0xe5372a : 0x1f4fd1, roughness: 0.7 }))
      bar.position.set(column - 2.5, height / 2, row - 2)
      root.add(bar)
    })
    const resize = () => {
      const width = canvas.clientWidth || 320
      const height = canvas.clientHeight || 180
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    let frame = 0
    const render = () => {
      root.rotation.y += 0.002
      renderer.render(scene, camera)
      frame = requestAnimationFrame(render)
    }
    render()
    return () => { cancelAnimationFrame(frame); observer.disconnect(); renderer.dispose(); root.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); if (Array.isArray(object.material)) object.material.forEach(material => material.dispose()); else object.material.dispose() } }) }
  }, [incidents])
  return <canvas ref={canvasRef} aria-label="Three-dimensional incident density preview" className="h-full w-full" />
}
