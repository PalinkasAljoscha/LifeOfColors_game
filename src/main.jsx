import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './i18n.js'
import './index.css'
import { activeTheme, cursorCss } from './themes.js'
import { palette } from './theme.js'
import { initProgress } from './engine/progress.js'

// Saved progress (only if the player opted in earlier) -- before the first render.
initProgress()

// Theme cursor (src/themes.js): a CSS variable used by .theme-cursor in index.css.
const cursor = cursorCss(activeTheme(), palette)
if (cursor) {
  document.documentElement.style.setProperty('--theme-cursor', cursor)
  document.documentElement.classList.add('theme-cursor')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
