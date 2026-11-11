import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  CoreButton,
  CoreCentralModal,
  CoreInput,
  CoreLocaleProvider,
  CoreSelectList,
} from '@coming.ui.core/themed-components'
import '@coming.ui.core/themed-components/style.css'
import './index.css'
import { mockCardRows } from './MockData'
import { CardsAndAdvancedSearchPage } from './patterns/CardsAndAdvancedSearchSource/app/CardsAndAdvancedSearchPage'

// Catalog preview only; neither this file nor MockData is transferred.
export function Preview() {
  const [open, setOpen] = useState(false)
  const demo = new URLSearchParams(window.location.search).get('demo')
  return (
    <CoreLocaleProvider language="srb">
      <div style={{ padding: 24 }}>
        <CardsAndAdvancedSearchPage
          rows={demo === 'empty' ? [] : mockCardRows}
          loading={demo === 'loading'}
          error={demo === 'error' ? 'Primer neuspelog učitavanja.' : undefined}
          headerActions={
            demo === 'custom' ? (
              <CoreButton size="small" onClick={() => setOpen(true)}>
                Kreiraj automobil
              </CoreButton>
            ) : undefined
          }
        />
        {demo === 'custom' ? (
          <CoreCentralModal
            isOpen={open}
            onClose={() => setOpen(false)}
            title="Kreiranje automobila"
          >
            <CoreSelectList label="Marka" items={[{ id: 'demo', label: 'Primer marke' }]} />
            <CoreInput label="Model" />
            <CoreInput label="Registracija" />
            <CoreInput label="Godište" type="number" />
            <CoreButton disabled title="API za čuvanje nije povezan.">
              Sačuvaj
            </CoreButton>
          </CoreCentralModal>
        ) : null}
      </div>
    </CoreLocaleProvider>
  )
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
