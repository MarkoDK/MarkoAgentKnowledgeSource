import {
  CorePageContainer,
  CorePageHeader,
  CorePageSection,
} from '@coming.ui.core/themed-components'
import styles from './EmptyPage.module.css'

export function EmptyPage({ title }: { title: string }) {
  return (
    <CorePageContainer className={styles.page}>
      <CorePageSection
        className={styles.pageSection}
        header={
          <div className={styles.pageHeader}>
            <CorePageHeader allUpperCase size="small">
              {title}
            </CorePageHeader>
          </div>
        }
      >
        <div aria-hidden="true" className={styles.emptyBody} />
      </CorePageSection>
    </CorePageContainer>
  )
}
