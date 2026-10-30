import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { getAnchorPose } from './agents/anchors'
import { useOfficeStore } from './store/officeStore'
import './styles.css'

// Dev-only handle for debugging and scripted checks (stripped from production builds).
if (import.meta.env.DEV) Object.assign(window, { __office: useOfficeStore, __anchors: getAnchorPose })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
