import { CoreForbiddenPage } from '@coming.ui.core/themed-components'
import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { appLayoutConfig, type AppPage } from '../../config/AppLayoutConfig'
import { EmptyPage } from '../layout/EmptyPage'
import { AppIcon } from '../../shared/AppIcon'
import { AppShell, type AppShellProps } from '../layout/AppShell'

export function AppRoutes({ shellProps }: { shellProps?: AppShellProps } = {}) {
  return (
    <Routes>
      <Route element={<AppShell {...shellProps} />}>
        <Route element={<Navigate replace to={appLayoutConfig.homePath} />} path="/" />
        {appLayoutConfig.pages
          .filter((page) => page.createPage !== false || page.element !== undefined)
          .map((page) => (
            <Route element={<PageContent page={page} />} key={page.path} path={page.path} />
          ))}
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  )
}

function PageContent({ page }: { page: AppPage }) {
  useEffect(() => {
    document.title = `${page.title} | ${appLayoutConfig.appName}`
  }, [page.title])

  return page.element === undefined ? <EmptyPage title={page.title} /> : page.element
}

function NotFoundPage() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = `Stranica nije pronađena | ${appLayoutConfig.appName}`
  }, [])

  return (
    <CoreForbiddenPage
      actions={[{ label: 'Idi na početnu', onClick: () => navigate(appLayoutConfig.homePath), variant: 'primary' }]}
      code="404"
      description="Proverite adresu ili izaberite dostupnu stavku u meniju."
      icon={<AppIcon name="folder" size={36} />}
      title="Stranica nije pronađena"
    />
  )
}
