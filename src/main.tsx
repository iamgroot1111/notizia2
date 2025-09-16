import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './app.css'            // <— du nutzt app.css, das ist richtig

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
