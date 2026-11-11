import { StrictMode, useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CoreLocaleProvider } from '@coming.ui.core/themed-components'
import '@coming.ui.core/themed-components/style.css'
import './index.css'
import { RolesAndPrivilegesPage } from './patterns/RolesAndPrivilegesSource/app/RolesAndPrivilegesPage'
import type {
  RoleId,
  RolePermissions,
} from './patterns/RolesAndPrivilegesSource/app/rolePermissions'
import { mockPrivileges, mockRoleGrants, mockRoleSummaries } from './MockData'

const demo = new URLSearchParams(window.location.search).get('demo')
const grants = new Map<RoleId, RolePermissions>(
  mockRoleGrants.map((role) => [role.roleId, structuredClone(role)]),
)
async function loadRolePermissions(id: RoleId, signal: AbortSignal) {
  signal.throwIfAborted()
  if (demo === 'load-error') throw new Error('Primer greške učitavanja privilegija.')
  const value = grants.get(id)
  if (!value) throw new Error('Rola ne postoji.')
  return structuredClone(value)
}
async function saveRolePermissions(
  id: RoleId,
  extraPermissions: (string | number)[],
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  if (demo === 'save-error') throw new Error('Primer greške čuvanja. Draft ostaje u editoru.')
  const current = grants.get(id)
  if (!current) throw new Error('Rola ne postoji.')
  const saved = { ...current, extraPermissions: [...extraPermissions] }
  grants.set(id, saved)
  return structuredClone(saved)
}
export function Preview() {
  const [roles, setRoles] = useState(mockRoleSummaries)
  const saved = useCallback((value: RolePermissions) => {
    setRoles((current) =>
      current.map((role) =>
        role.id === value.roleId
          ? {
              ...role,
              defaultCount: value.defaultPermissions.length,
              extraCount: value.extraPermissions.length,
            }
          : role,
      ),
    )
  }, [])
  return (
    <div style={{ padding: 24 }}>
      <RolesAndPrivilegesPage
        roles={demo === 'empty' ? [] : roles}
        privileges={mockPrivileges}
        loading={demo === 'loading'}
        error={demo === 'error' ? 'Primer greške pregleda rola.' : undefined}
        canManage={demo !== 'readonly'}
        loadRolePermissions={loadRolePermissions}
        saveRolePermissions={demo === 'missing-save' ? undefined : saveRolePermissions}
        onSaved={saved}
      />
    </div>
  )
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CoreLocaleProvider language="srb">
      <Preview />
    </CoreLocaleProvider>
  </StrictMode>,
)
