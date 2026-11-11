import {
  CoreAdvancedSearchLayout,
  CoreAdvancedSearchPanel,
  CoreButton,
  CoreInput,
  CorePageContainer,
  CorePageHeader,
  CorePageSection,
  CoreSearchableInput,
  CoreTable,
  type CoreTableColumn,
  type CoreTableQueryState,
} from "@coming.ui.core/themed-components";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import styles from "./TableAndAdvancedSearchPage.module.css";

// PAGE: apply the human config here. No mock data or business actions by default.
const page = {
  title: "Pregled stavki",
  tableName: "items",
  searchPlaceholder: "Šifra ili naziv",
  quickSearch: true,
  advancedSearch: true,
};
export type TableRow = {
  id: string | number;
  code: string | null;
  title: string | null;
};
const emptyRows: TableRow[] = [];

// COLUMNS: ordinary CoreTable columns. Add an action column only when requested.
const columns: CoreTableColumn<TableRow>[] = [
  {
    id: "code",
    accessorKey: "code",
    header: "Šifra",
    cell: ({ getValue }: { getValue: () => unknown }) => (
      <Cell label="Šifra" value={getValue()} />
    ),
  },
  {
    id: "title",
    accessorKey: "title",
    header: "Naziv",
    cell: ({ getValue }: { getValue: () => unknown }) => (
      <Cell label="Naziv" value={getValue()} />
    ),
  },
];

type Props = {
  rows?: TableRow[];
  loading?: boolean;
  headerActions?: ReactNode;
};

export function TableAndAdvancedSearchPage({
  rows = emptyRows,
  loading = false,
  headerActions,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [composing, setComposing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [filterTitle, setFilterTitle] = useState("");
  const [table, setTable] = useState<CoreTableQueryState>({
    pageNumber: 1,
    pageSize: 15,
    sorting: [],
    filters: {},
  });

  function searchNow(value: string) {
    setSearch(value);
    setAppliedSearch(value);
    setTable((current) => ({ ...current, pageNumber: 1 }));
  }

  useEffect(() => {
    if (composing || search === appliedSearch) return;
    const timer = setTimeout(() => searchNow(search), 500);
    return () => clearTimeout(timer);
  }, [search, appliedSearch, composing]);

  // LOCAL DATA: replace with the real API/query only when the config requests it.
  // Core owns sort/pager controls; this local example supplies their requested rows.
  const filteredRows = useMemo(() => {
    const includes = (value: string | null, term: string) =>
      (value ?? "")
        .toLocaleLowerCase("sr")
        .includes(term.trim().toLocaleLowerCase("sr"));
    const result = rows.filter(
      (row) =>
        includes(`${row.code ?? ""} ${row.title ?? ""}`, appliedSearch) &&
        includes(row.title, filterTitle),
    );
    const sort = table.sorting[0];
    if (sort)
      result.sort((a, b) => {
        const key = sort.id as "code" | "title";
        if (a[key] == null || b[key] == null)
          return a[key] == null ? (b[key] == null ? 0 : 1) : -1;
        return (
          a[key].localeCompare(b[key], "sr", { numeric: true }) *
          (sort.desc ? -1 : 1)
        );
      });
    return result;
  }, [rows, appliedSearch, filterTitle, table.sorting]);

  function applyFilters(title: string) {
    setDraftTitle(title);
    setFilterTitle(title);
    setTable((current) => ({ ...current, pageNumber: 1 }));
    if (window.matchMedia("(max-width: 1023px)").matches) setFiltersOpen(false);
  }

  return (
    <CorePageContainer
      className={`${styles.page} ${!page.quickSearch && !page.advancedSearch ? styles.withoutToolbar : ""}`}
    >
      <CoreAdvancedSearchLayout
        // TOOLBAR: Core supplies the container; do not add a second section/padding.
        search={
          page.quickSearch ? (
            <CoreSearchableInput
              aria-label="Brza pretraga"
              placeholder={page.searchPlaceholder}
              value={search}
              onValueChange={setSearch}
              onSearch={searchNow}
              onClear={() => searchNow("")}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing)
                  searchNow(search);
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
              aria-controls={`${page.tableName}-filters`}
              onClick={() => {
                setDraftTitle(filterTitle);
                setFiltersOpen((open) => !open);
              }}
            >
              Napredna pretraga
            </CoreButton>
          ) : null
        }
        // FILTERS: add requested Core fields here, with draft/applied values above.
        panel={
          page.advancedSearch ? (
            <CoreAdvancedSearchPanel
              id={`${page.tableName}-filters`}
              className={styles.filters}
              width="100vw"
              isOpen={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              onApply={() => applyFilters(draftTitle)}
              onReset={() => applyFilters("")}
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
        // RESULTS: optional header Buttons stay inside the SAME 48px header.
        results={
          <CorePageSection
            className={styles.results}
            header={
              <div className={styles.header}>
                <CorePageHeader allUpperCase size="small">
                  <span title={page.title}>{page.title}</span>
                </CorePageHeader>
                {headerActions ? (
                  <div className={styles.headerActions}>{headerActions}</div>
                ) : null}
              </div>
            }
          >
            <CoreTable<TableRow>
              className={styles.table}
              tableName={page.tableName}
              columns={columns}
              dataList={filteredRows.slice(
                (table.pageNumber - 1) * table.pageSize,
                table.pageNumber * table.pageSize,
              )}
              server={{
                state: table,
                totalCount: filteredRows.length,
                onStateChange: setTable,
              }}
              stateStorageType="none"
              language="srb"
              loading={loading}
              emptyTableMessage="Nema rezultata za izabranu pretragu."
            />
          </CorePageSection>
        }
      />
    </CorePageContainer>
  );
}

function Cell({ label, value }: { label: string; value: unknown }) {
  const text = value == null || value === "" ? "/" : String(value);
  return (
    <span className={styles.cell} data-label={label} title={text} tabIndex={0}>
      {text}
    </span>
  );
}
