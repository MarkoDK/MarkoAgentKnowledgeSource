import { CoreProfileDropdown } from '@coming.ui.core/themed-components'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockProfile } from './MockData'
import { AppRoutes } from './patterns/AppShellSource/app/router/AppRoutes'

// Catalog preview: production bootstrap is inside AppShellSource/app/.
function App() {
  return <AppRoutes shellProps={{ profileMenu: <PreviewProfile /> }} />
}

function PreviewProfile() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <CoreProfileDropdown
      {...mockProfile}
      actions={[{ label: 'Moj profil', onClick: () => navigate('/profile') }]}
      closeOnActionClick
      onToggle={() => setOpen((current) => !current)}
      open={open}
    />
  )
}

export default App
