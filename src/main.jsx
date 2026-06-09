import React from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#090c10',
      color: '#00d4aa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      letterSpacing: '3px',
      textTransform: 'uppercase',
      fontSize: '14px'
    }}>
      PositionIQ — building…
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
