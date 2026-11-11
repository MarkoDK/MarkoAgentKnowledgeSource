import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CoreLocaleProvider } from '@coming.ui.core/themed-components'
import '@coming.ui.core/themed-components/style.css'
import './index.css'
import { DashboardPage } from './patterns/DashboardSource/app/DashboardPage'
import { mockDashboard } from './MockData'

// Catalog-only data and font reference. No preview code is transferred.
const demo = new URLSearchParams(window.location.search).get('demo')
const data = demo === 'empty' ? {} : demo === 'no-status' ? {
  ...mockDashboard,
  recentItems: mockDashboard.recentItems.map(row => ({ ...row, status: undefined })),
  recentActivities: mockDashboard.recentActivities.map(row => ({ ...row, status: undefined })),
} : mockDashboard
const states =
  demo === 'loading'
    ? {
        summary: { loading: true },
        monthly: { loading: true },
        statuses: { loading: true },
        items: { loading: true },
        activities: { loading: true },
      }
    : demo === 'error'
    ? { monthly: { error: 'Primer greške mesečnog pregleda.' } }
    : {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CoreLocaleProvider language="srb">
      <div
        style={{ padding: 24, fontFamily: 'Lato, system-ui, Arial, sans-serif', lineHeight: 1.5 }}
      >
        <DashboardPage {...data} states={states} />
      </div>
    </CoreLocaleProvider>
  </StrictMode>,
)
