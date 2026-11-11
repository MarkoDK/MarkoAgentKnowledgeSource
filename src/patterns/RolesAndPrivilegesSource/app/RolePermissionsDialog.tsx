import {
  CentralModalFooter,
  CoreButton,
  CoreCentralModal,
  CoreCheckbox,
  CoreConfirmDialog,
  CoreNotice,
  CorePageHeader,
  CoreSearchableInput,
  CoreSelectList,
} from '@coming.ui.core/themed-components'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  effectiveIds,
  normalize,
  readRolePermissions,
  requiredBy,
  sameIds,
  sameRolePermissions,
  withPrerequisites,
  type LoadRolePermissions,
  type Privilege,
  type PrivilegeId,
  type RolePermissions,
  type RoleSummary,
  type SaveRolePermissions,
} from './rolePermissions'
import styles from './RolesAndPrivilegesPage.module.css'

type Props = {
  role: RoleSummary
  privileges: readonly Privilege[]
  readOnly: boolean
  loadPermissions?: LoadRolePermissions
  savePermissions?: SaveRolePermissions
  onClose: () => void
  onSaved?: (value: RolePermissions) => void
  onDirtyChange?: (dirty: boolean) => void
}
export function RolePermissionsDialog({
  role,
  privileges,
  readOnly,
  loadPermissions,
  savePermissions,
  onClose,
  onSaved,
  onDirtyChange,
}: Props) {
  const [baseline, setBaseline] = useState<RolePermissions | null>(null)
  const [selected, setSelected] = useState<PrivilegeId[]>([])
  const [search, setSearch] = useState(''),
    [group, setGroup] = useState('')
  const [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false)
  const [error, setError] = useState(''),
    [conflict, setConflict] = useState(false)
  const [confirmation, setConfirmation] = useState<'reset' | 'discard' | 'reload' | null>(null)
  const controller = useRef<AbortController | null>(null)
  const inFlight = useRef(false),
    mounted = useRef(false),
    writable = useRef(!readOnly)
  useLayoutEffect(() => {
    writable.current = !readOnly
  }, [readOnly])
  useEffect(() => {
    mounted.current = true
    const abort = new AbortController()
    controller.current = abort
    void Promise.resolve()
      .then(() => {
        abort.signal.throwIfAborted()
        if (!loadPermissions) throw new Error('Učitavanje privilegija nije povezano.')
        return loadPermissions(role.id, abort.signal)
      })
      .then((value) => {
        const data = readRolePermissions(value, role.id, privileges)
        if (!abort.signal.aborted) {
          setBaseline(data)
          setSelected(effectiveIds(data))
          setConflict(false)
        }
      })
      .catch((failure) => {
        if (!abort.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Privilegije nisu učitane.')
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false)
      })
    return () => {
      mounted.current = false
      abort.abort()
    }
  }, [role.id, loadPermissions, privileges])

  const dirty = baseline !== null && !sameIds(selected, effectiveIds(baseline))
  useEffect(() => {
    onDirtyChange?.(dirty || pending)
    if (!dirty) return () => onDirtyChange?.(false)
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
      onDirtyChange?.(false)
    }
  }, [dirty, pending, onDirtyChange])
  const groups = [...new Set(privileges.map((item) => item.group))]
  const visible = privileges.filter(
    (item) =>
      (!group || item.group === group) &&
      normalize(item.id + ' ' + item.label + ' ' + item.code).includes(normalize(search)),
  )
  function close() {
    if (!inFlight.current) {
      if (dirty) setConfirmation('discard')
      else onClose()
    }
  }
  function toggle(id: PrivilegeId, checked: boolean) {
    if (
      !baseline ||
      readOnly ||
      inFlight.current ||
      conflict ||
      baseline.defaultPermissions.includes(id) ||
      requiredBy(selected, id, privileges).length
    )
      return
    setSelected((current) =>
      withPrerequisites(
        checked ? [...current, id] : current.filter((value) => value !== id),
        privileges,
      ),
    )
  }
  async function persist(reset: boolean) {
    const signal = controller.current?.signal
    if (
      !baseline ||
      !loadPermissions ||
      !savePermissions ||
      !signal ||
      signal.aborted ||
      !writable.current ||
      inFlight.current ||
      conflict ||
      (!reset && !dirty)
    )
      return
    inFlight.current = true
    setPending(true)
    setError('')
    setConfirmation(null)
    try {
      // Advisory fresh-read check; host/server owns atomic concurrency (ETag/version if available).
      const fresh = readRolePermissions(await loadPermissions(role.id, signal), role.id, privileges)
      if (signal.aborted || !mounted.current || !writable.current) return
      if (!sameRolePermissions(fresh, baseline)) {
        setConflict(true)
        setError('Privilegije su promenjene. Učitajte aktuelna prava pre čuvanja.')
        return
      }
      const extraPermissions = reset
        ? []
        : withPrerequisites([...baseline.defaultPermissions, ...selected], privileges).filter(
            (id) => !baseline.defaultPermissions.includes(id),
          )
      const saved = readRolePermissions(
        await savePermissions(role.id, extraPermissions, signal),
        role.id,
        privileges,
      )
      if (signal.aborted || !mounted.current || !writable.current) return
      setBaseline(saved)
      setSelected(effectiveIds(saved))
      try {
        onSaved?.(saved)
      } catch {
        setError('Privilegije su sačuvane, ali pregled nije osvežen.')
        return
      }
      if (!reset) onClose()
    } catch (failure) {
      if (!signal.aborted && mounted.current)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Privilegije nisu sačuvane. Pokušajte ponovo.',
        )
    } finally {
      inFlight.current = false
      if (mounted.current) setPending(false)
    }
  }
  async function reload() {
    const signal = controller.current?.signal
    if (!loadPermissions || !signal || signal.aborted || inFlight.current) return
    inFlight.current = true
    setPending(true)
    setConfirmation(null)
    setError('')
    try {
      const fresh = readRolePermissions(await loadPermissions(role.id, signal), role.id, privileges)
      if (!signal.aborted && mounted.current) {
        setBaseline(fresh)
        setSelected(effectiveIds(fresh))
        setConflict(false)
      }
    } catch (failure) {
      if (!signal.aborted && mounted.current)
        setError(failure instanceof Error ? failure.message : 'Privilegije nisu učitane.')
    } finally {
      inFlight.current = false
      if (mounted.current) setPending(false)
    }
  }
  const saveReason = !savePermissions
    ? 'Čuvanje privilegija nije povezano.'
    : conflict
    ? 'Prvo učitajte aktuelna prava.'
    : !dirty
    ? 'Nema nesnimljenih izmena.'
    : undefined

  return (
    <>
      <CoreCentralModal
        isOpen
        size="wide"
        className={styles.permissionsModal}
        closeOnBackdropClick={false}
        onClose={close}
        title={
          <CorePageHeader allUpperCase size="small">
            {readOnly ? 'Pregled privilegija' : 'Izmena privilegija'}: {role.label}
          </CorePageHeader>
        }
      >
        {loading ? (
          <CoreNotice variant="info" role="status">
            Učitavanje privilegija…
          </CoreNotice>
        ) : (
          baseline && (
            <>
              <div className={styles.permissionDirectoryToolbar}>
                <CoreSearchableInput
                  aria-label="Pretraži privilegije"
                  placeholder="Naziv, kod ili broj privilegije"
                  value={search}
                  onValueChange={setSearch}
                  onSearch={setSearch}
                  onClear={() => setSearch('')}
                />
                <CoreSelectList
                  placeholder="Svi moduli"
                  value={group || null}
                  isClearable
                  items={groups.map((value) => ({ id: value, label: value }))}
                  onChange={(value) => setGroup(String(value ?? ''))}
                />
              </div>
              <div className={styles.permissionDirectory} aria-busy={pending}>
                {groups.map((name) => {
                  const items = visible.filter((item) => item.group === name)
                  return items.length ? (
                    <section className={styles.permissionGroup} key={name}>
                      <h3 className={styles.permissionDirectoryHeader}>{name}</h3>
                      {items.map((permission) => {
                        const inherited = baseline.defaultPermissions.includes(permission.id)
                        const required = requiredBy(selected, permission.id, privileges).length > 0
                        const reason = inherited
                          ? 'Podrazumevana privilegija role ne može se isključiti.'
                          : readOnly
                          ? 'Rola je dostupna samo za pregled.'
                          : required
                          ? 'Preduslov izabrane akcije.'
                          : undefined
                        return (
                          <div
                            className={styles.permissionDirectoryRow}
                            key={typeof permission.id + ':' + String(permission.id)}
                            data-selected={selected.includes(permission.id) || undefined}
                            title={reason}
                          >
                            <CoreCheckbox
                              size="small"
                              checked={selected.includes(permission.id)}
                              disabled={readOnly || pending || conflict || inherited || required}
                              onChange={(checked) => toggle(permission.id, checked)}
                              label={
                                <span className={styles.permissionDirectoryLabel}>
                                  <span title={permission.label}>
                                    <small className={styles.enumId}>{permission.id}</small>{' '}
                                    {permission.label}
                                  </span>
                                  <small>
                                    {inherited
                                      ? 'Podrazumevana · zaključano'
                                      : required
                                      ? 'Preduslov izabrane akcije'
                                      : 'Dodatna'}
                                    <span className={styles.permissionCode} title={permission.code}>
                                      {permission.code}
                                    </span>
                                  </small>
                                </span>
                              }
                            />
                          </div>
                        )
                      })}
                    </section>
                  ) : null
                })}
                {!visible.length && (
                  <p className={styles.empty}>Nema privilegija za unetu pretragu.</p>
                )}
              </div>
            </>
          )
        )}
        {error && (
          <CoreNotice variant="warning" role="alert">
            {error}
            {loadPermissions && (
              <CoreButton
                size="small"
                variant="primary-soft"
                disabled={pending || loading}
                onClick={() => (dirty ? setConfirmation('reload') : void reload())}
              >
                Učitaj aktuelna prava
              </CoreButton>
            )}
          </CoreNotice>
        )}
        <CentralModalFooter>
          {!readOnly && (
            <CoreButton
              variant="secondary"
              disabled={
                !baseline ||
                !savePermissions ||
                pending ||
                conflict ||
                (!baseline.extraPermissions.length && !dirty)
              }
              title={!savePermissions ? 'Čuvanje privilegija nije povezano.' : undefined}
              onClick={() => setConfirmation('reset')}
            >
              Vrati podrazumevane privilegije
            </CoreButton>
          )}
          <CoreButton variant="closing" disabled={pending} onClick={close}>
            {readOnly ? 'Zatvori' : 'Odustani'}
          </CoreButton>
          {!readOnly && (
            <CoreButton
              disabled={!baseline || pending || !!saveReason}
              loading={pending}
              title={saveReason}
              onClick={() => void persist(false)}
            >
              Sačuvaj privilegije
            </CoreButton>
          )}
        </CentralModalFooter>
      </CoreCentralModal>
      <CoreConfirmDialog
        className={styles.confirmation}
        language="srb"
        isOpen={confirmation !== null}
        pending={pending}
        intent="warning"
        onClose={() => setConfirmation(null)}
        onConfirm={() => {
          if (confirmation === 'discard') onClose()
          else if (confirmation === 'reset') void persist(true)
          else if (confirmation === 'reload') void reload()
        }}
        title={
          confirmation === 'discard'
            ? 'Nesnimljene privilegije'
            : confirmation === 'reset'
            ? 'Vraćanje podrazumevanih privilegija'
            : 'Učitavanje aktuelnih privilegija'
        }
        message={
          confirmation === 'discard'
            ? 'Odbaciti nesnimljene izmene privilegija?'
            : confirmation === 'reset'
            ? 'Ukloniti dodatne privilegije ove role? Podrazumevane ostaju.'
            : 'Odbaciti lokalne izmene i učitati aktuelna prava role?'
        }
        confirmLabel={
          confirmation === 'discard'
            ? 'Odbaci izmene'
            : confirmation === 'reset'
            ? 'Vrati podrazumevane'
            : 'Učitaj aktuelna prava'
        }
      />
    </>
  )
}
