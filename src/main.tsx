import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Dopo un nuovo deploy i chunk lazy cambiano nome: una scheda aperta con la
// versione vecchia fallisce nel caricare un modulo. Ricarichiamo una sola volta
// per prendere il nuovo index (con guardia anti-loop: max 1 reload ogni 10s).
window.addEventListener('vite:preloadError', () => {
  const key = 'preload-reload-at'
  const last = Number(sessionStorage.getItem(key) || '0')
  if (Date.now() - last > 10000) {
    sessionStorage.setItem(key, String(Date.now()))
    window.location.reload()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
