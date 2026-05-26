import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AdminApp from './AdminApp.jsx'

const path = window.location.pathname
const root = createRoot(document.getElementById('root'))

if (path.startsWith('/admin')) {
  root.render(<StrictMode><AdminApp /></StrictMode>)
} else if (path.startsWith('/verify-email')) {
  root.render(<StrictMode><App verifyMode={true} /></StrictMode>)
} else if (path.startsWith('/accept-invite')) {
  root.render(<StrictMode><App inviteMode={true} /></StrictMode>)
} else if (path.startsWith('/forgot-password')) {
  root.render(<StrictMode><App forgotMode={true} /></StrictMode>)
} else if (path.startsWith('/reset-password')) {
  root.render(<StrictMode><App resetMode={true} /></StrictMode>)
} else {
  root.render(<StrictMode><App /></StrictMode>)
}
