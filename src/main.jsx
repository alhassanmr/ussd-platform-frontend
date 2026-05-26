import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AdminApp from './AdminApp.jsx'

const path = window.location.pathname

// Route to the right app
const root = createRoot(document.getElementById('root'))

if (path.startsWith('/admin')) {
  root.render(<StrictMode><AdminApp /></StrictMode>)
} else if (path.startsWith('/verify-email')) {
  // Lazy import to avoid circular deps — just render App which handles the route
  root.render(<StrictMode><App verifyMode={true} /></StrictMode>)
} else {
  root.render(<StrictMode><App /></StrictMode>)
}
