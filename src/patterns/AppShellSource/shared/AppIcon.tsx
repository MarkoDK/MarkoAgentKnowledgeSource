export type AppIconName =
  | 'archive'
  | 'car'
  | 'chart'
  | 'folder'
  | 'home'
  | 'logout'
  | 'settings'
  | 'user'
  | 'wallet'
  | 'wrench'

type AppIconProps = {
  name: AppIconName
  size?: number
}

const paths: Record<AppIconName, React.ReactNode> = {
  archive: (
    <>
      <path d="M4 7h16v13H4z" />
      <path d="M3 4h18v3H3zM9 11h6" />
    </>
  ),
  car: (
    <>
      <path d="M5 16h14l-1-5a2 2 0 0 0-2-1H8a2 2 0 0 0-2 1z" />
      <path d="m7 10 1.5-4h7L17 10M4 16v3M20 16v3" />
      <circle cx="8" cy="15" r="1" />
      <circle cx="16" cy="15" r="1" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  folder: <path d="M3 6h7l2 2h9v11H3z" />,
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5H4v14h6M14 8l4 4-4 4M18 12H8" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5L9.1 6a7 7 0 0 0-1.7 1L5 6 3 9.4 5.1 11a7 7 0 0 0 0 2L3 14.6 5 18l2.4-1a7 7 0 0 0 1.7 1l.4 3h5l.4-3a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.6a7 7 0 0 0 .1-1Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 6h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12" />
      <path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z" />
    </>
  ),
  wrench: (
    <path d="M14 6a4 4 0 0 0-5 5L3 17l4 4 6-6a4 4 0 0 0 5-5l-3 2-3-3z" />
  ),
}

export function AppIcon({ name, size = 20 }: AppIconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        {paths[name]}
      </g>
    </svg>
  )
}
