import {
  CoreAdvancedSearchLayout,
  CoreAdvancedSearchPanel,
  CoreButton,
  CoreFilterChip,
  CoreForbiddenPage,
  CoreIconButton,
  CoreNotice,
  CorePageContainer,
  CorePageHeader,
  CorePageSection,
  CoreSearchableInput,
  CoreSelectList,
  CoreTable,
  type CoreTableColumn,
  type CoreTableQueryState,
} from '@coming.ui.core/themed-components'
import { useEffect, useId, useState } from 'react'
import { RolePermissionsDialog } from './RolePermissionsDialog'
import {
  normalize,
  type LoadRolePermissions,
  type Privilege,
  type RoleId,
  type RolePermissions,
  type RoleSummary,
  type SaveRolePermissions,
} from './rolePermissions'
import styles from './RolesAndPrivilegesPage.module.css'

// PAGE: apply RolesAndPrivilegesConfig.md here. IDs are exact; never infer a role's grants.
const page = {
  title: 'Podešavanje rola i privilegija',
  tableName: 'role-permissions',
  quickSearch: true,
  advancedSearch: true,
  readOnlyRoleIds: ['admin'] as RoleId[],
}
const noRoles: RoleSummary[] = []
const noPrivileges: Privilege[] = []
type Props = {
  roles?: RoleSummary[]
  privileges?: Privilege[]
  loading?: boolean
  error?: string
  canView?: boolean
  canManage?: boolean
  loadRolePermissions?: LoadRolePermissions
  saveRolePermissions?: SaveRolePermissions
  onSaved?: (value: RolePermissions) => void
  onDirtyChange?: (dirty: boolean) => void
}

export function RolesAndPrivilegesPage({
  roles = noRoles,
  privileges = noPrivileges,
  loading = false,
  error,
  canView = true,
  canManage = false,
  loadRolePermissions,
  saveRolePermissions,
  onSaved,
  onDirtyChange,
}: Props) {
  const filtersId = useId()
  const [search, setSearch] = useState(''),
    [applied, setApplied] = useState('')
  const [composing, setComposing] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftRole, setDraftRole] = useState<RoleId | null>(null)
  const [filterRole, setFilterRole] = useState<RoleId | null>(null)
  const [target, setTarget] = useState<RoleSummary | null>(null)
  const [table, setTable] = useState<CoreTableQueryState>({
    pageNumber: 1,
    pageSize: 15,
    sorting: [],
    filters: {},
  })
  function searchNow(value: string) {
    setSearch(value)
    setApplied(value)
    setTable((current) => ({ ...current, pageNumber: 1 }))
  }
  useEffect(() => {
    if (composing || search === applied) return
    const timer = setTimeout(() => searchNow(search), 500)
    return () => clearTimeout(timer)
  }, [search, applied, composing])

  // LOCAL DATA: complete host role list, never a second filter over an API page.
  const rows = roles.filter(
    (role) =>
      normalize(role.label).includes(normalize(applied)) &&
      (filterRole === null || role.id === filterRole),
  )
  const sort = table.sorting[0]
  if (sort)
    rows.sort((a, b) => {
      const value = (role: RoleSummary) =>
        sort.id === 'total'
          ? role.defaultCount + role.extraCount
          : sort.id === 'label'
          ? role.label
          : role[sort.id as 'userCount' | 'defaultCount']
      const left = value(a),
        right = value(b)
      return (
        (typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right), 'sr', { numeric: true })) *
        (sort.desc ? -1 : 1)
      )
    })
  const currentPage = Math.min(table.pageNumber, Math.max(1, Math.ceil(rows.length / 15)))
  const editable = (role: RoleSummary) => canManage && !page.readOnlyRoleIds.includes(role.id)
  const columns: CoreTableColumn<RoleSummary>[] = [
    {
      id: 'label',
      accessorKey: 'label',
      header: 'Rola',
      size: 600,
      cell: ({ row }: { row: { original: RoleSummary } }) => (
        <Cell label="Rola" value={row.original.label} />
      ),
    },
    {
      id: 'userCount',
      accessorKey: 'userCount',
      header: 'Korisnici',
      size: 150,
      cell: ({ row }: { row: { original: RoleSummary } }) => (
        <Cell label="Korisnici" value={row.original.userCount} />
      ),
    },
    {
      id: 'defaultCount',
      accessorKey: 'defaultCount',
      header: 'Podrazumevane',
      size: 220,
      cell: ({ row }: { row: { original: RoleSummary } }) => (
        <Cell label="Podrazumevane" value={row.original.defaultCount} />
      ),
    },
    {
      id: 'total',
      accessorFn: (role: RoleSummary) => role.defaultCount + role.extraCount,
      header: 'Ukupno privilegija',
      size: 250,
      cell: ({ row }: { row: { original: RoleSummary } }) => (
        <Cell
          label="Ukupno privilegija"
          value={row.original.defaultCount + row.original.extraCount}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      pinnedRight: true,
      enableSorting: false,
      size: 70,
      cell: ({ row }: { row: { original: RoleSummary } }) => (
        <div className={styles.rowAction}>
          <CoreIconButton
            appearance="ghost"
            size="large"
            variant={editable(row.original) ? 'secondary' : 'primary'}
            label={
              (editable(row.original) ? 'Izmeni privilegije: ' : 'Pregledaj privilegije: ') +
              row.original.label
            }
            onClick={() => setTarget(row.original)}
            icon={
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {editable(row.original) ? (
                  <path d="m16 3 5 5-12 12-6 1 1-6L16 3zm-2 2 5 5" />
                ) : (
                  <>
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            }
          />
        </div>
      ),
    },
  ]
  function applyRole(value: RoleId | null) {
    setDraftRole(value)
    setFilterRole(value)
    setTable((current) => ({ ...current, pageNumber: 1 }))
    if (window.matchMedia('(max-width: 1023px)').matches) setFiltersOpen(false)
  }
  if (!canView) return <CoreForbiddenPage title="Nemate pravo pregleda rola i privilegija." />
  return (
    <CorePageContainer
      className={[
        styles.page,
        !page.quickSearch && !page.advancedSearch ? styles.withoutToolbar : '',
      ].join(' ')}
    >
      <CoreAdvancedSearchLayout
        search={
          page.quickSearch ? (
            <CoreSearchableInput
              aria-label="Pretraži role"
              placeholder="Naziv role"
              value={search}
              onValueChange={setSearch}
              onSearch={searchNow}
              onClear={() => searchNow('')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  searchNow(search)
                }
              }}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
            />
          ) : null
        }
        actions={
          page.advancedSearch ? (
            <CoreButton
              size="small"
              variant="primary-soft"
              aria-expanded={filtersOpen}
              aria-controls={filtersId}
              onClick={() => {
                setDraftRole(filterRole)
                setFiltersOpen((open) => !open)
              }}
            >
              Napredna pretraga
            </CoreButton>
          ) : null
        }
        panel={
          page.advancedSearch ? (
            <CoreAdvancedSearchPanel
              id={filtersId}
              className={styles.filters}
              width="100vw"
              isOpen={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              onApply={() => applyRole(draftRole)}
              onReset={() => applyRole(null)}
              fields={
                <CoreSelectList
                  label="Rola"
                  placeholder="Sve role"
                  value={draftRole}
                  isClearable
                  items={roles.map((role) => ({ id: role.id, label: role.label }))}
                  onChange={setDraftRole}
                />
              }
            />
          ) : null
        }
        results={
          <CorePageSection
            className={styles.results}
            header={
              <CorePageHeader allUpperCase size="small">
                <span title={page.title}>{page.title}</span>
              </CorePageHeader>
            }
          >
            {filterRole !== null && (
              <div className={styles.chips}>
                <CoreFilterChip
                  label="Rola"
                  value={roles.find((role) => role.id === filterRole)?.label ?? String(filterRole)}
                  onRemove={() => applyRole(null)}
                />
              </div>
            )}
            {error ? (
              <CoreNotice variant="danger" role="alert">
                {error}
              </CoreNotice>
            ) : (
              <CoreTable<RoleSummary>
                className={styles.table}
                tableName={page.tableName}
                columns={columns}
                dataList={rows.slice((currentPage - 1) * 15, currentPage * 15)}
                getRowId={(role) => typeof role.id + ':' + String(role.id)}
                server={{
                  state: { ...table, pageNumber: currentPage, pageSize: 15 },
                  totalCount: rows.length,
                  onStateChange: (next) => setTable({ ...next, pageSize: 15 }),
                }}
                loading={loading}
                language="srb"
                stateStorageType="none"
                emptyTableMessage="Nema rola za izabrane kriterijume."
              />
            )}
          </CorePageSection>
        }
      />
      {target !== null && (
        <RolePermissionsDialog
          key={typeof target.id + ':' + String(target.id)}
          role={target}
          privileges={privileges}
          readOnly={!editable(target)}
          loadPermissions={loadRolePermissions}
          savePermissions={saveRolePermissions}
          onClose={() => setTarget(null)}
          onSaved={onSaved}
          onDirtyChange={onDirtyChange}
        />
      )}
    </CorePageContainer>
  )
}
function Cell({ label, value }: { label: string; value: string | number }) {
  return (
    <span className={styles.cell} data-label={label} title={String(value)}>
      {value}
    </span>
  )
}
