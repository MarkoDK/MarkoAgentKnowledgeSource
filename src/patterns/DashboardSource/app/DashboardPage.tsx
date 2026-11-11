import { CoreCardGrid, CorePageContainer, CoreStatusBadge } from '@coming.ui.core/themed-components'
import { useState, type CSSProperties } from 'react'
import { DashboardLineChart, DashboardPieChart, type DashboardPoint } from './DashboardCharts'
import {
  DashboardPanel,
  DashboardSummary,
  DashboardTable,
  type DashboardColumn,
  type DashboardMetric,
  type DashboardRecord,
  type DashboardState,
} from './DashboardWidgets'
import styles from './DashboardPage.module.css'

// SUMMARY: configure the cards here. No separate count; [] removes the entire row.
const defaultCards: DashboardMetric[] = [
  { id: 'total', title: 'Ukupno stavki', value: null, icon: 'archive' },
  { id: 'new', title: 'Nove stavke', value: null, icon: 'calendar' },
  { id: 'active', title: 'U obradi', value: null, icon: 'edit' },
  { id: 'waiting', title: 'Na čekanju', value: null, icon: 'clock', tone: 'secondary' },
  { id: 'completed', title: 'Završene stavke', value: null, icon: 'check' },
  { id: 'cancelled', title: 'Stornirane stavke', value: null, icon: 'close', tone: 'danger' },
]
const emptyPoints: DashboardPoint[] = []
const emptyRecords: DashboardRecord[] = []

// Share one status tone between the badge and row marker; no status means neutral blue.
function recordColor(row: DashboardRecord) {
  if (!row.status) return 'var(--dashboard-primary)'
  return (
    row.color ??
    {
      neutral: 'var(--tc-color-on-closing, #374151)',
      info: 'var(--dashboard-primary)',
      success: '#147a4f',
      warning: 'var(--tc-color-secondary, #f97316)',
      danger: 'var(--tc-color-danger, #d92d20)',
    }[row.status.variant]
  )
}

// COLUMNS: ordinary JSX cells, not a runtime schema or a business status mapping.
const recordColumns: DashboardColumn<DashboardRecord>[] = [
  {
    id: 'accent',
    title: 'Oznaka',
    width: '8px',
    render: (row) => (
      <span className={styles.recordIndicator} style={{ background: recordColor(row) }} />
    ),
  },
  {
    id: 'title',
    title: 'Naziv',
    primary: true,
    render: (row) => (
      <span className={styles.recordIdentity}>
        <strong title={row.title}>{row.title || '/'}</strong>
        <small title={row.subtitle ?? '/'}>{row.subtitle || '/'}</small>
      </span>
    ),
  },
  { id: 'date', title: 'Datum', width: '104px', render: (row) => row.date || '/' },
  {
    id: 'status',
    title: 'Status',
    width: '148px',
    render: (row) =>
      row.status ? (
        <CoreStatusBadge
          variant={row.status.variant}
          size="small"
          style={
            {
              '--tc-core-status-badge-tone': recordColor(row),
              color: recordColor(row),
            } as CSSProperties
          }
        >
          {row.status.label}
        </CoreStatusBadge>
      ) : (
        '/'
      ),
  },
]

type Props = {
  cards?: DashboardMetric[]
  monthly?: DashboardPoint[]
  statuses?: DashboardPoint[]
  recentItems?: DashboardRecord[]
  recentActivities?: DashboardRecord[]
  states?: Partial<
    Record<'summary' | 'monthly' | 'statuses' | 'items' | 'activities', DashboardState>
  >
  onViewAllItems?: () => void
  onViewAllActivities?: () => void
  onOpenRecord?: (row: DashboardRecord) => void
}

export function DashboardPage({
  cards = defaultCards,
  monthly = emptyPoints,
  statuses = emptyPoints,
  recentItems = emptyRecords,
  recentActivities = emptyRecords,
  states = {},
  onViewAllItems,
  onViewAllActivities,
  onOpenRecord,
}: Props) {
  const [months, setMonths] = useState(6)
  // LOCAL DATA: host supplies chronological monthly points. API filtering belongs to the host.
  const visibleMonths = monthly.slice(-months)

  return (
    <CorePageContainer className={styles.page}>
      <div className={styles.dashboard}>
        {cards.length > 0 && (
          <CoreCardGrid
            columns={6}
            gap="md"
            responsive={false}
            className={styles.summaryGrid}
            style={{ '--dashboard-summary-columns': Math.min(cards.length, 6) } as CSSProperties}
          >
            {cards.map((card) => (
              <DashboardSummary key={card.id} card={card} state={states.summary} />
            ))}
          </CoreCardGrid>
        )}

        {/* ROW 1: replace only the requested chart/table child; keep this panel and its data. */}
        <div className={styles.row}>
          <DashboardPanel
            title="Mesečni rezultati"
            state={states.monthly}
            controls={
              <div className={styles.periodOptions} role="group" aria-label="Period prikaza">
                {[3, 6, 12].map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={months === value ? styles.periodActive : undefined}
                    aria-label={'Poslednjih ' + value + ' meseci'}
                    aria-pressed={months === value}
                    onClick={() => setMonths(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            }
          >
            <DashboardLineChart points={visibleMonths} label="Mesečni rezultati" />
          </DashboardPanel>
          <DashboardPanel title="Raspodela po statusima" state={states.statuses}>
            <DashboardPieChart points={statuses} label="Raspodela po statusima" />
          </DashboardPanel>
        </div>

        {/* ROW 2: compact semantic tables; no ordinary lists or automatic row actions. */}
        <div className={styles.row}>
          <DashboardPanel
            title="Poslednje stavke"
            table
            state={states.items}
            footerLabel="Prikaži sve stavke"
            onViewAll={onViewAllItems}
          >
            <DashboardTable
              rows={recentItems.slice(0, 5)}
              columns={recordColumns.filter(
                (column) => column.id !== 'status' || recentItems.some((row) => row.status),
              )}
              rowKey={(row) => row.id}
              label="Poslednje stavke"
              onOpen={onOpenRecord}
            />
          </DashboardPanel>
          <DashboardPanel
            title="Poslednje aktivnosti"
            table
            state={states.activities}
            footerLabel="Prikaži sve aktivnosti"
            onViewAll={onViewAllActivities}
          >
            <DashboardTable
              rows={recentActivities.slice(0, 5)}
              columns={recordColumns.filter(
                (column) => column.id !== 'status' || recentActivities.some((row) => row.status),
              )}
              rowKey={(row) => row.id}
              label="Poslednje aktivnosti"
              onOpen={onOpenRecord}
            />
          </DashboardPanel>
        </div>
      </div>
    </CorePageContainer>
  )
}
