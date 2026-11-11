import {
  CoreButton,
  CoreNotice,
  CorePageHeader,
  CorePageSection,
  type CoreStatusBadgeVariant,
} from '@coming.ui.core/themed-components'
import type { CSSProperties, ReactNode } from 'react'
import styles from './DashboardPage.module.css'

export type DashboardState = { loading?: boolean; error?: string }
export type DashboardMetric = {
  id: string
  title: string
  value: number | string | null
  description?: string
  icon?: 'archive' | 'calendar' | 'edit' | 'clock' | 'check' | 'close'
  tone?: 'primary' | 'secondary' | 'danger'
  onClick?: () => void
}
export type DashboardRecord = {
  id: string | number
  title: string
  subtitle?: string
  date?: string
  color?: string
  status?: { label: string; variant: CoreStatusBadgeVariant }
}
export type DashboardColumn<Row> = {
  id: string
  title: string
  width?: string
  primary?: boolean
  render: (row: Row) => ReactNode
}

// Font Awesome Free icons by Fonticons, Inc. — unchanged SVG paths.
// CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
// https://fontawesome.com/license/free
const icons = {
  archive: {
    width: 512,
    height: 512,
    path: 'M32 32l448 0c17.7 0 32 14.3 32 32l0 32c0 17.7-14.3 32-32 32L32 128C14.3 128 0 113.7 0 96L0 64C0 46.3 14.3 32 32 32zm0 128l448 0 0 256c0 35.3-28.7 64-64 64L96 480c-35.3 0-64-28.7-64-64l0-256zm128 80c0 8.8 7.2 16 16 16l160 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-160 0c-8.8 0-16 7.2-16 16z',
  },
  calendar: {
    width: 448,
    height: 512,
    path: 'M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 48 0c26.5 0 48 21.5 48 48l0 48L0 160l0-48C0 85.5 21.5 64 48 64l48 0 0-32c0-17.7 14.3-32 32-32zM0 192l448 0 0 272c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 192zm64 80l0 32c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-32c0-8.8-7.2-16-16-16l-32 0c-8.8 0-16 7.2-16 16zm128 0l0 32c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-32c0-8.8-7.2-16-16-16l-32 0c-8.8 0-16 7.2-16 16zm144-16c-8.8 0-16 7.2-16 16l0 32c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-32c0-8.8-7.2-16-16-16l-32 0zM64 400l0 32c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-32c0-8.8-7.2-16-16-16l-32 0c-8.8 0-16 7.2-16 16zm144-16c-8.8 0-16 7.2-16 16l0 32c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-32c0-8.8-7.2-16-16-16l-32 0zm112 16l0 32c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-32c0-8.8-7.2-16-16-16l-32 0c-8.8 0-16 7.2-16 16z',
  },
  edit: {
    width: 512,
    height: 512,
    path: 'M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z',
  },
  clock: {
    width: 384,
    height: 512,
    path: 'M32 0C14.3 0 0 14.3 0 32S14.3 64 32 64l0 11c0 42.4 16.9 83.1 46.9 113.1L146.7 256 78.9 323.9C48.9 353.9 32 394.6 32 437l0 11c-17.7 0-32 14.3-32 32s14.3 32 32 32l32 0 256 0 32 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l0-11c0-42.4-16.9-83.1-46.9-113.1L237.3 256l67.9-67.9c30-30 46.9-70.7 46.9-113.1l0-11c17.7 0 32-14.3 32-32s-14.3-32-32-32L320 0 64 0 32 0zM96 75l0-11 192 0 0 11c0 25.5-10.1 49.9-28.1 67.9L192 210.7l-67.9-67.9C106.1 124.9 96 100.4 96 75z',
  },
  check: {
    width: 448,
    height: 512,
    path: 'M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z',
  },
  close: {
    width: 384,
    height: 512,
    path: 'M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z',
  },
}

export function DashboardSummary({
  card,
  state,
}: {
  card: DashboardMetric
  state?: DashboardState
}) {
  const icon = icons[card.icon ?? 'archive']
  const content = (
    <>
      <span
        className={[styles.summaryIcon, styles[card.tone ?? 'primary']].join(' ')}
        aria-hidden="true"
      >
        <svg viewBox={'0 0 ' + icon.width + ' ' + icon.height} fill="currentColor">
          <path d={icon.path} />
        </svg>
      </span>
      <span className={styles.summaryContent}>
        <span className={styles.summaryTitle} title={card.title}>
          {card.title}
        </span>
        <strong className={styles.summaryValue}>
          {state?.loading || state?.error ? '/' : card.value ?? '/'}
        </strong>
        {(state?.loading || state?.error || card.description) && (
          <span
            className={styles.summaryDescription}
            role={state?.error ? 'alert' : state?.loading ? 'status' : undefined}
          >
            {state?.error || (state?.loading ? 'Učitavanje…' : card.description)}
          </span>
        )}
      </span>
    </>
  )
  return (
    <CorePageSection className={styles.summaryCard}>
      {card.onClick ? (
        <button
          type="button"
          className={styles.summaryCardButton}
          onClick={card.onClick}
          aria-label={card.title}
        >
          {content}
        </button>
      ) : (
        <div className={styles.summaryCardContent}>{content}</div>
      )}
    </CorePageSection>
  )
}

type PanelProps = {
  title: string
  children: ReactNode
  controls?: ReactNode
  table?: boolean
  state?: DashboardState
  footerLabel?: string
  onViewAll?: () => void
}

export function DashboardPanel({
  title,
  children,
  controls,
  table = false,
  state,
  footerLabel,
  onViewAll,
}: PanelProps) {
  return (
    <CorePageSection
      className={table ? styles.tablePanel : styles.chartPanel}
      header={
        <div className={styles.panelHeader}>
          <CorePageHeader size="small" allUpperCase>
            <span title={title}>{title}</span>
          </CorePageHeader>
          {controls}
        </div>
      }
      footer={
        footerLabel ? (
          <CoreButton
            type="button"
            size="small"
            variant="primary-soft"
            className={styles.viewAllButton}
            onClick={onViewAll}
            disabled={!onViewAll}
            title={!onViewAll ? 'Navigacija nije povezana.' : undefined}
          >
            {footerLabel}
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </CoreButton>
        ) : undefined
      }
    >
      {state?.error ? (
        <div className={styles.panelState}>
          <CoreNotice variant="danger" role="alert">
            {state.error}
          </CoreNotice>
        </div>
      ) : state?.loading ? (
        <div className={styles.panelState} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          Učitavanje…
        </div>
      ) : (
        children
      )}
    </CorePageSection>
  )
}

export function DashboardTable<Row>({
  rows,
  columns,
  rowKey,
  label,
  onOpen,
}: {
  rows: Row[]
  columns: DashboardColumn<Row>[]
  rowKey: (row: Row) => string | number
  label: string
  onOpen?: (row: Row) => void
}) {
  if (!rows.length) return <div className={styles.empty}>Nema podataka za prikaz.</div>
  const grid = {
    '--dashboard-table-columns': columns
      .map((column) => column.width ?? 'minmax(0, 1fr)')
      .join(' '),
  } as CSSProperties
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table} aria-label={label} style={grid}>
        <thead className={styles.srOnly}>
          <tr>
            {columns.map((column) => (
              <th key={column.id} scope="col">
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className={styles.tableRow}>
              {columns.map((column) => {
                const value = column.render(row)
                const title =
                  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined
                return (
                  <td key={column.id} title={title}>
                    <span className={styles.cellValue}>
                      {onOpen && column.primary ? (
                        <button
                          type="button"
                          className={styles.recordButton}
                          onClick={() => onOpen(row)}
                        >
                          {value ?? '/'}
                        </button>
                      ) : (
                        value ?? '/'
                      )}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
