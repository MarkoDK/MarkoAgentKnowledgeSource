import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CoreButton, CoreCentralModal, CoreInput, CoreLocaleProvider } from '@coming.ui.core/themed-components'
import '@coming.ui.core/themed-components/style.css'
import './index.css'
import { mockTableRows } from './MockData'
import { TableAndAdvancedSearchPage } from './patterns/TableAndAdvancedSearchSource/app/TableAndAdvancedSearchPage'

// Catalog-only example: optional custom content is not part of the default pattern.
export function Preview() {
  const [open, setOpen] = useState(false)
  const custom = new URLSearchParams(window.location.search).get('demo') === 'custom'
  return (
    <CoreLocaleProvider language="srb">
      <div style={{ padding: 24 }}>
        <TableAndAdvancedSearchPage rows={mockTableRows} headerActions={custom ?
          <CoreButton size="small" onClick={() => setOpen(true)}>Kreiraj automobil</CoreButton> : undefined}
        />
        {custom ? <CoreCentralModal isOpen={open} onClose={() => setOpen(false)} title="Kreiranje automobila">
          <CoreInput label="Model" />
          <CoreInput label="Registracija" />
          <CoreButton size="small" disabled title="API za čuvanje nije povezan.">Sačuvaj</CoreButton>
        </CoreCentralModal> : null}
      </div>
    </CoreLocaleProvider>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>)
