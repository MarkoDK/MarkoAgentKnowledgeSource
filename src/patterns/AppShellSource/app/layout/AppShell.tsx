import { AppLayout } from '@coming.ui.core/themed-components'
import type { ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { appLayoutConfig } from '../../config/AppLayoutConfig'
import { activeNavigationPath, buildNavigationItems, navigationContextKey } from './navigation'
import styles from './AppShell.module.css'

export type AppShellProps = {
  /** undefined uses config; null hides the slot; JSX replaces it. */
  topbarTitle?: ReactNode
  topbarActions?: ReactNode
  profileMenu?: ReactNode
}

export function AppShell({ topbarTitle, topbarActions, profileMenu }: AppShellProps = {}) {
  const location = useLocation()
  const navigate = useNavigate()
  const navigationItems = buildNavigationItems()
  const { topbar } = appLayoutConfig

  return (
    <AppLayout
      appLogo={<span aria-hidden="true" className={styles.logo}>{appLayoutConfig.shortName}</span>}
      appName={appLayoutConfig.appName}
      currentPath={activeNavigationPath(navigationItems, location.pathname)}
      items={navigationItems}
      language="sr"
      menuLabel={appLayoutConfig.menuLabel}
      onLogoClick={() => navigate(appLayoutConfig.homePath)}
      onNavigate={navigate}
      topNavigation={
        <div className={styles.topNavigation}>
          {topbarTitle !== undefined ? topbarTitle : topbar.showTitle ? (
            <div className={styles.productName}>
              <strong>{appLayoutConfig.appName}</strong>
              {topbar.description ? <span>{topbar.description}</span> : null}
            </div>
          ) : null}
          <div className={styles.topbarActions} key={navigationContextKey(location)}>
            {topbarActions === undefined ? topbar.actions : topbarActions}
            {profileMenu === undefined ? topbar.profileMenu : profileMenu}
          </div>
        </div>
      }
    >
      <Outlet />
    </AppLayout>
  )
}
