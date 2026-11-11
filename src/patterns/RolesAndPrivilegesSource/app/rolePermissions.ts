export type RoleId = string | number
export type PrivilegeId = string | number
export type RoleSummary = {
  id: RoleId
  label: string
  userCount: number
  defaultCount: number
  extraCount: number
}
export type Privilege = {
  id: PrivilegeId
  code: string
  label: string
  group: string
  requires: readonly PrivilegeId[]
}
export type RolePermissions = {
  roleId: RoleId
  defaultPermissions: PrivilegeId[]
  extraPermissions: PrivilegeId[]
}
export type LoadRolePermissions = (roleId: RoleId, signal: AbortSignal) => Promise<RolePermissions>
export type SaveRolePermissions = (
  roleId: RoleId,
  extraPermissions: PrivilegeId[],
  signal: AbortSignal,
) => Promise<RolePermissions>

export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('sr')
export const sameIds = (a: readonly PrivilegeId[], b: readonly PrivilegeId[]) =>
  a.length === b.length && a.every((id) => b.includes(id))
export const effectiveIds = (value: RolePermissions) => [
  ...new Set([...value.defaultPermissions, ...value.extraPermissions]),
]

export function withPrerequisites(ids: readonly PrivilegeId[], catalog: readonly Privilege[]) {
  const selected = new Set(ids),
    queue = [...ids]
  for (let index = 0; index < queue.length; index++) {
    const permission = catalog.find((item) => item.id === queue[index])
    if (!permission) throw new Error('Pravo nedostaje u katalogu privilegija.')
    for (const id of permission.requires)
      if (!selected.has(id)) {
        selected.add(id)
        queue.push(id)
      }
  }
  return [...selected]
}
export const requiredBy = (
  ids: readonly PrivilegeId[],
  id: PrivilegeId,
  catalog: readonly Privilege[],
) => ids.filter((other) => other !== id && withPrerequisites([other], catalog).includes(id))

export function readRolePermissions(
  value: RolePermissions,
  roleId: RoleId,
  catalog: readonly Privilege[],
) {
  const known = new Set(catalog.map((item) => item.id))
  const validId = (id: PrivilegeId) =>
    typeof id === 'string' ? !!id.trim() : Number.isSafeInteger(id)
  if (
    known.size !== catalog.length ||
    catalog.some((item) => !validId(item.id) || item.requires.some((id) => !known.has(id)))
  )
    throw new Error('Katalog privilegija nije ispravan.')
  const valid = (ids: unknown): ids is PrivilegeId[] =>
    Array.isArray(ids) && ids.every((id) => known.has(id)) && new Set(ids).size === ids.length
  if (
    !value ||
    value.roleId !== roleId ||
    !valid(value.defaultPermissions) ||
    !valid(value.extraPermissions) ||
    value.extraPermissions.some((id) => value.defaultPermissions.includes(id))
  )
    throw new Error('Odgovor privilegija nije ispravan ili ne pripada izabranoj roli.')
  const ids = effectiveIds(value)
  if (withPrerequisites(ids, catalog).some((id) => !ids.includes(id)))
    throw new Error('Prava role nemaju potrebne preduslove.')
  return {
    roleId,
    defaultPermissions: [...value.defaultPermissions],
    extraPermissions: [...value.extraPermissions],
  }
}
export function sameRolePermissions(a: RolePermissions, b: RolePermissions) {
  return (
    a.roleId === b.roleId &&
    sameIds(a.defaultPermissions, b.defaultPermissions) &&
    sameIds(a.extraPermissions, b.extraPermissions)
  )
}
