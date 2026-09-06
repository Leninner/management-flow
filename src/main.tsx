import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

/**
 * Ask the browser not to evict IndexedDB. It can refuse, which is why the
 * JSON backup exists and why the app nags about it.
 */
void navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
