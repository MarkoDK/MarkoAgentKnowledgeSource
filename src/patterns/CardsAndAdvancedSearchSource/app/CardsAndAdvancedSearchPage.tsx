import {
  CoreAdvancedSearchLayout,
  CoreAdvancedSearchPanel,
  CoreButton,
  CoreExpandableCards,
  CoreInput,
  CoreNotice,
  CorePageContainer,
  CorePageHeader,
  CorePageSection,
  CorePagination,
  CorePreviewField,
  CoreSearchableInput,
  type CoreExpandableCardId,
} from '@coming.ui.core/themed-components'
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import styles from './CardsAndAdvancedSearchPage.module.css'

// PAGE: apply CardsAndAdvancedSearchConfig.md here; no runtime config parser.
const page = {
  title: 'Pregled stavki',
  searchPlaceholder: 'Šifra ili naziv',
  quickSearch: true,
  advancedSearch: true,
  expandable: true,
}
export type CardRow = {
  id: string | number
  code: string | null
  title: string | null
  date?: string | null
  subtitle?: string | null
}
const emptyRows: CardRow[] = []
type Props = { rows?: CardRow[]; loading?: boolean; error?: ReactNode; headerActions?: ReactNode }

export function CardsAndAdvancedSearchPage({
  rows = emptyRows,
  loading = false,
  error,
  headerActions,
}: Props) {
  const filtersId = useId()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [composing, setComposing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [filterTitle, setFilterTitle] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [expandedId, setExpandedId] = useState<CoreExpandableCardId | null>(null)
  const pageSize = 15

  function searchNow(value: string) {
    setSearch(value)
    setAppliedSearch(value)
    setPageNumber(1)
    setExpandedId(null)
  }
  useEffect(() => {
    if (composing || search === appliedSearch) return
    const timer = setTimeout(() => searchNow(search), 500)
    return () => clearTimeout(timer)
  }, [search, appliedSearch, composing])

  // LOCAL DATA: replace this filter/slice with ONE server query when requested.
  const filteredRows = useMemo(() => {
    const includes = (value: string | null, term: string) =>
      (value ?? '').toLocaleLowerCase('sr').includes(term.trim().toLocaleLowerCase('sr'))
    return rows.filter(
      (row) =>
        includes(`${row.code ?? ''} ${row.title ?? ''}`, appliedSearch) &&
        includes(row.title, filterTitle),
    )
  }, [rows, appliedSearch, filterTitle])
  const pages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(pageNumber, pages)

  function applyFilters(title: string) {
    setDraftTitle(title)
    setFilterTitle(title)
    setPageNumber(1)
    setExpandedId(null)
    if (window.matchMedia('(max-width: 1023px)').matches) setFiltersOpen(false)
  }

  // CARDS: ordinary Core items. Add fields/status/viewAction only as requested.
  const items = filteredRows
    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
    .map((row) => ({
      id: row.id,
      reference: { value: row.code?.trim() || '/', caption: row.date?.trim() || '/' },
      title: row.title?.trim() || '/',
      subtitle: row.subtitle?.trim() || '/',
      expandedContent: page.expandable ? (
        <div className={styles.details}>
          <CorePreviewField label="Šifra" value={row.code} />
          <CorePreviewField label="Naziv" value={row.title} />
        </div>
      ) : undefined,
    }))

  return (
    <CorePageContainer
      className={`${styles.page} ${!page.quickSearch && !page.advancedSearch ? styles.withoutToolbar : ''}`}
    >
      <CoreAdvancedSearchLayout
        // TOOLBAR: Core supplies the container; no second section/padding.
        search={
          page.quickSearch ? (
            <CoreSearchableInput
              aria-label="Brza pretraga"
              placeholder={page.searchPlaceholder}
              value={search}
              onValueChange={setSearch}
              onSearch={searchNow}
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
                setDraftTitle(filterTitle)
                setFiltersOpen((open) => !open)
              }}
            >
              Napredna pretraga
            </CoreButton>
          ) : null
        }
        // FILTERS: explicit Core fields + draft/applied state, not a field engine.
        panel={
          page.advancedSearch ? (
            <CoreAdvancedSearchPanel
              id={filtersId}
              className={styles.filters}
              width="100vw"
              isOpen={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              onApply={() => applyFilters(draftTitle)}
              onReset={() => applyFilters('')}
              isLoading={loading}
              fields={
                <CoreInput
                  label="Naziv"
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                />
              }
            />
          ) : null
        }
        // RESULTS: Buttons never increase the 48px section header.
        results={
          <CorePageSection
            className={styles.results}
            aria-busy={loading || undefined}
            header={
              <div className={styles.header}>
                <CorePageHeader allUpperCase size="small">
                  <span title={page.title}>{page.title}</span>
                </CorePageHeader>
                {headerActions ? <div className={styles.headerActions}>{headerActions}</div> : null}
              </div>
            }
          >
            {error ? (
              <CoreNotice variant="danger" role="alert">
                {error}
              </CoreNotice>
            ) : loading ? (
              <CoreNotice variant="info" role="status">
                Učitavanje…
              </CoreNotice>
            ) : (
              <CoreExpandableCards
                items={items}
                expandedId={expandedId}
                onExpandedChange={setExpandedId}
                emptyContent="Nema rezultata za izabranu pretragu."
                pagination={
                  <CorePagination
                    pageNumber={currentPage}
                    pageSize={pageSize}
                    totalCount={filteredRows.length}
                    onPageChange={(next) => {
                      setPageNumber(next)
                      setExpandedId(null)
                    }}
                  />
                }
              />
            )}
          </CorePageSection>
        }
      />
    </CorePageContainer>
  )
}
