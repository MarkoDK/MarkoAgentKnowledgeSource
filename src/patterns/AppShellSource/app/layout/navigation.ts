import type { NavItem } from '@coming.ui.core/themed-components'
import { createElement } from 'react'
import { appLayoutConfig } from '../../config/AppLayoutConfig'
import { AppIcon } from '../../shared/AppIcon'

function normalizePath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0]
  return pathname.replace(/\/+$/, '') || '/'
}

/** Keep the deepest visible menu destination active on its detail routes. */
export function activeNavigationPath(items: readonly NavItem[], pathname: string): string {
  const current = normalizePath(pathname)
  let best = ''
  function visit(nodes: readonly NavItem[]) {
    for (const item of nodes) {
      if (item.hidden) continue
      if (item.path) {
        const candidate = normalizePath(item.path)
        if ((current === candidate || (candidate !== '/' && current.startsWith(candidate + '/'))) && candidate.length > best.length) best = candidate
      }
      visit(item.children ?? [])
    }
  }
  visit(items)
  return best || current
}

/** Remount only host topbar controls, never the layout or the page, on navigation. */
export function navigationContextKey(location: { key: string; pathname: string; search: string; hash: string }): string {
  return JSON.stringify([location.key, location.pathname, location.search, location.hash])
}

// One pages array drives both menu and router; hidden links are not permissions.
export function buildNavigationItems(): NavItem[] {
  const items: NavItem[] = []

  for (const page of appLayoutConfig.pages) {
    if (page.menu === false || (page.createPage === false && page.element === undefined)) continue

    const item: NavItem = {
      id: page.path,
      label: page.menuLabel ?? page.title,
      path: page.path,
      icon: page.icon ? createElement(AppIcon, { name: page.icon }) : undefined,
    }

    if (!page.group) {
      items.push(item)
      continue
    }

    const groupId = `group:${page.group.label}`
    let group = items.find((entry) => entry.id === groupId)
    if (!group) {
      group = {
        id: groupId,
        label: page.group.label,
        icon: createElement(AppIcon, { name: page.group.icon ?? 'folder' }),
        children: [],
      }
      items.push(group)
    }
    group.children!.push(item)
  }

  return items
}
