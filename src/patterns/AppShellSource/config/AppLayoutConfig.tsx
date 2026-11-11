import type { ReactNode } from 'react'
import type { AppIconName } from '../shared/AppIcon'

export type AppPage = {
  path: string
  title: string
  icon?: AppIconName
  menuLabel?: string
  menu?: boolean
  group?: { label: string; icon?: AppIconName }
  createPage?: boolean
  element?: ReactNode
}

type AppLayoutConfiguration = {
  appName: string
  shortName: string
  menuLabel: string
  homePath: string
  topbar: {
    showTitle: boolean
    description: string
    actions: ReactNode
    profileMenu: ReactNode
  }
  pages: AppPage[]
}

// EDIT HERE: application identity, topbar slots and routes.
// English path -> folders/file; title -> visible heading (any application language).
// The skill creates missing placeholder pages and adds their imports/element automatically.
export const appLayoutConfig: AppLayoutConfiguration = {
  appName: 'Nova aplikacija',
  shortName: 'A',
  menuLabel: 'Meni',
  homePath: '/dashboard',

  topbar: {
    showTitle: true,
    description: '',
    actions: null,
    profileMenu: null,
  },

  // Array order is menu order. A group appears at its first page.
  // Example: /cars -> src/features/cars/PreviewCars.tsx; title: 'Pregled svih vozila'.
  // No element = create a placeholder. element: <MyPage /> = keep the supplied page.
  // menu: false hides only the menu link. createPage: false parks an unimplemented route.
  pages: [
    { path: '/dashboard', title: 'Dashboard', icon: 'home' },
    { path: '/overview', title: 'Pregled', icon: 'folder' },
    {
      path: '/records/first',
      title: 'Prva evidencija',
      group: { label: 'Evidencije', icon: 'archive' },
    },
    {
      path: '/records/second',
      title: 'Druga evidencija',
      group: { label: 'Evidencije', icon: 'archive' },
    },
    { path: '/settings', title: 'Podešavanja', icon: 'settings' },
    { path: '/profile', title: 'Moj profil', menu: false },
  ],
}
