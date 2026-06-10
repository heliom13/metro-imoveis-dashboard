import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ImoveisDashboard from './ImoveisDashboard'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ImoveisDashboard />
  </StrictMode>,
)
