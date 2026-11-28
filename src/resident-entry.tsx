import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ResidentApp } from './resident/ResidentApp'
import { StoreProvider } from './store'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider><ResidentApp framed={false} /></StoreProvider>
  </StrictMode>,
)

if (import.meta.env.PROD && window.isSecureContext && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.warn('Resident offline support could not start.', error)
    })
  })
}
