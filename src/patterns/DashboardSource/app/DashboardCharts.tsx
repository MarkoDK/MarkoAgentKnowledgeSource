import { useId, useState } from 'react'
import styles from './DashboardPage.module.css'

// Both charts and their table replacements consume this same plain data.
export type DashboardPoint = {
  id: string
  label: string
  value: number
  color?: string
  shortLabel?: string
}
const colors = ['#1769f7', '#35b66f', '#2aa7b8', '#8665dc', '#f79009', '#ef5b5b']
const invalid = (points: DashboardPoint[]) =>
  points.some((point) => !Number.isFinite(point.value) || point.value < 0)

export function DashboardLineChart({ points, label }: { points: DashboardPoint[]; label: string }) {
  const gradientId = useId()
  const [active, setActive] = useState<string | null>(null)
  if (!points.length) return <div className={styles.empty}>Nema podataka za prikaz.</div>
  if (invalid(points))
    return (
      <div className={styles.empty} role="alert">
        Grafikon zahteva nenegativne konačne vrednosti.
      </div>
    )
  const maxValue = Math.max(...points.map((point) => point.value))
  const roughStep = maxValue / 4
  const magnitude = roughStep ? 10 ** Math.floor(Math.log10(roughStep)) : 1
  const normalized = roughStep / magnitude
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude
  const maximum = step * 4
  const plot = points.map((point, index) => ({
    ...point,
    x: 42 + (points.length === 1 ? 291 : (index * 582) / (points.length - 1)),
    y: 200 - (point.value / maximum) * 184,
  }))
  const line = plot.map((point, index) => (index ? 'L ' : 'M ') + point.x + ' ' + point.y).join(' ')
  const area = line + ' L ' + plot[plot.length - 1].x + ' 200 L ' + plot[0].x + ' 200 Z'
  const selected = plot.find((point) => point.id === active)

  return (
    <div className={styles.lineChart}>
      <svg viewBox="0 0 640 238" role="group" aria-label={label}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--dashboard-primary)" stopOpacity=".18" />
            <stop offset="100%" stopColor="var(--dashboard-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 5 }, (_, index) => (
          <g key={index}>
            <line
              x1="42"
              x2="624"
              y1={200 - index * 46}
              y2={200 - index * 46}
              className={styles.chartGridLine}
            />
            <text x="30" y={204 - index * 46} textAnchor="end" className={styles.chartAxisText}>
              {step * index}
            </text>
          </g>
        ))}
        <path d={area} fill={'url(#' + gradientId + ')'} />
        <path d={line} className={styles.chartLine} />
        {plot.map((point) => (
          <g
            key={point.id}
            className={styles.chartPointButton}
            role="button"
            tabIndex={0}
            aria-label={point.label + ': ' + point.value}
            aria-pressed={active === point.id}
            onClick={() => setActive((current) => (current === point.id ? null : point.id))}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              setActive((current) => (current === point.id ? null : point.id))
            }}
          >
            <circle cx={point.x} cy={point.y} r="4" className={styles.chartPoint}>
              <title>{point.label + ': ' + point.value}</title>
            </circle>
            <text x={point.x} y="226" textAnchor="middle" className={styles.chartAxisText}>
              {point.shortLabel ?? point.label}
            </text>
          </g>
        ))}
        {selected && (
          <g
            className={styles.chartTooltip}
            aria-hidden="true"
            transform={
              'translate(' +
              Math.min(Math.max(selected.x - 86, 42), 452) +
              ' ' +
              Math.max(selected.y - 58, 2) +
              ')'
            }
          >
            <rect width="172" height="48" rx="7" />
            <text x="12" y="19" className={styles.tooltipTitle}>
              {selected.label}
            </text>
            <text x="12" y="37" className={styles.tooltipValue}>
              Ukupno: {selected.value}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

export function DashboardPieChart({ points, label }: { points: DashboardPoint[]; label: string }) {
  if (!points.length) return <div className={styles.empty}>Nema podataka za prikaz.</div>
  if (invalid(points))
    return (
      <div className={styles.empty} role="alert">
        Grafikon zahteva nenegativne konačne vrednosti.
      </div>
    )
  const total = points.reduce((sum, point) => sum + point.value, 0)
  const circumference = 2 * Math.PI * 64
  const segments = points.map((point, index) => {
    const length = total ? (point.value / total) * circumference : 0
    const segment = {
      ...point,
      length: Math.max(length - 1.4, 0),
      offset: total
        ? (-points.slice(0, index).reduce((sum, item) => sum + item.value, 0) / total) *
          circumference
        : 0,
      color: point.color ?? colors[index % colors.length],
    }
    return segment
  })
  return (
    <div className={styles.pieLayout}>
      <div className={styles.donutWrap}>
        <svg className={styles.donut} viewBox="0 0 180 180" role="img" aria-label={label}>
          <circle cx="90" cy="90" r="64" className={styles.donutTrack} />
          {segments.map((segment) => (
            <circle
              key={segment.id}
              cx="90"
              cy="90"
              r="64"
              fill="none"
              stroke={segment.color}
              strokeWidth="40"
              strokeDasharray={segment.length + ' ' + (circumference - segment.length)}
              strokeDashoffset={segment.offset}
              transform="rotate(-90 90 90)"
            >
              <title>{segment.label + ': ' + segment.value}</title>
            </circle>
          ))}
        </svg>
        <div className={styles.donutTotal}>
          <span>Ukupno</span>
          <strong>{total}</strong>
        </div>
      </div>
      <div className={styles.legend}>
        <div className={styles.legendHeader}>
          <span>Kategorija</span>
          <span>Broj</span>
        </div>
        <div className={styles.legendRows}>
          {segments.map((segment) => (
            <div className={styles.legendRow} key={segment.id}>
              <span className={styles.legendName} title={segment.label}>
                <i style={{ background: segment.color }} aria-hidden="true" />
                <span>{segment.label}</span>
              </span>
              <strong>{segment.value}</strong>
            </div>
          ))}
        </div>
        <div className={styles.legendTotal}>
          <strong>Ukupno</strong>
          <strong>{total}</strong>
        </div>
      </div>
    </div>
  )
}
