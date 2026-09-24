import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { removeLegacyDemoData } from './storage/demoData'

// Older versions kept the demo in the person's own database; it has its
// own now, so tidy away anything left over from then. Nothing waits on it.
void removeLegacyDemoData().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
