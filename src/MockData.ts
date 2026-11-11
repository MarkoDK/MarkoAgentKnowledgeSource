// Catalog preview only. Never imported by a transferable pattern.
export const mockProfile = {
  initials: 'MJ',
  title: 'Mina Jovanović',
  subtitle: 'Primer korisnika',
  description: 'mina.jovanovic@example.test',
}

export const mockTableRows = Array.from({ length: 32 }, (_, index) => ({
  id: index + 1,
  code: `DEMO-${String(index + 1).padStart(3, '0')}`,
  title: `Primer stavke ${index + 1}`,
}))

export const mockCardRows = Array.from({ length: 32 }, (_, index) => ({
  id: index + 1,
  code: `ITEM-${String(index + 1).padStart(3, '0')}`,
  title: index === 0 ? 'Dugačak naziv stavke sa punim tekstom na hover '.repeat(5) : `Primer stavke ${index + 1}`,
  date: '25. 10. 2026.',
  subtitle: index === 0 ? 'Dugačak naziv podnosioca '.repeat(5) : `Primer podnosioca ${index + 1}`,
}))

// Dashboard catalog preview only; never imported by DashboardSource.
export const mockDashboard = {
  cards: [
    { id: 'total', title: 'Ukupno stavki', value: 360, icon: 'archive' as const },
    { id: 'new', title: 'Nove stavke', value: 42, icon: 'calendar' as const },
    { id: 'active', title: 'U obradi', value: 86, icon: 'edit' as const },
    { id: 'waiting', title: 'Na čekanju', value: 18, icon: 'clock' as const, tone: 'secondary' as const },
    { id: 'completed', title: 'Završene stavke', value: 198, icon: 'check' as const },
    { id: 'cancelled', title: 'Stornirane stavke', value: 16, icon: 'close' as const, tone: 'danger' as const },
  ],
  monthly: ['Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar'].map((label, i) => ({
    id: 'month-' + i, label, shortLabel: label.slice(0, 3), value: [24, 42, 37, 65, 58, 86][i],
  })),
  statuses: [
    { id: 'new', label: 'Novo', value: 42, color: '#2aa7b8' },
    { id: 'active', label: 'U obradi', value: 86, color: '#1769f7' },
    { id: 'waiting', label: 'Na čekanju', value: 18, color: '#f79009' },
    { id: 'completed', label: 'Završeno', value: 198, color: '#35b66f' },
    { id: 'cancelled', label: 'Stornirano', value: 16, color: '#ef5b5b' },
  ],
  recentItems: Array.from({ length: 5 }, (_, i) => ({
    id: 'item-' + i, title: 'Primer stavke ' + (i + 1), subtitle: 'Primer evidencije ' + (i + 1),
    date: (27 - i) + '. 10. 2026.', color: '#35b66f', status: { label: 'Završeno', variant: 'success' as const },
  })),
  recentActivities: Array.from({ length: 5 }, (_, i) => ({
    id: 'activity-' + i, title: 'Primer aktivnosti ' + (i + 1), subtitle: 'Primer korisnika ' + (i + 1),
    date: (27 - i) + '. 10. 2026.', color: '#1769f7', status: { label: 'U obradi', variant: 'info' as const },
  })),
}


// Roles catalog preview only; no mock data is transferred.
export const mockPrivileges = [
  { id: 1, code: 'records.view', label: 'Pregled zapisa', group: 'Zapisi', requires: [] },
  { id: 2, code: 'records.create', label: 'Kreiranje zapisa', group: 'Zapisi', requires: [1] },
  { id: 3, code: 'records.edit', label: 'Izmena zapisa', group: 'Zapisi', requires: [1] },
  { id: 4, code: 'records.delete', label: 'Brisanje zapisa', group: 'Zapisi', requires: [3] },
  { id: 5, code: 'reports.view', label: 'Pregled izveštaja', group: 'Izveštaji', requires: [] },
  { id: 6, code: 'reports.export', label: 'Preuzimanje izveštaja', group: 'Izveštaji', requires: [5] },
  { id: 7, code: 'users.view', label: 'Pregled korisnika', group: 'Korisnici', requires: [] },
  { id: 8, code: 'users.edit', label: 'Izmena korisnika', group: 'Korisnici', requires: [7] },
  { id: 9, code: 'notifications.receive', label: 'Prijem obaveštenja', group: 'Obaveštenja (prijem)', requires: [] },
]
export const mockRoleGrants = [
  { roleId: 'admin', defaultPermissions: [1, 2, 3, 4, 5, 6, 7, 8], extraPermissions: [] as number[] },
  { roleId: 'manager', defaultPermissions: [1, 3, 5], extraPermissions: [6, 9] },
  { roleId: 'operator', defaultPermissions: [1, 2], extraPermissions: [5] },
  { roleId: 'viewer', defaultPermissions: [1], extraPermissions: [] as number[] },
]
export const mockRoleSummaries = mockRoleGrants.map((value, index) => ({
  id: value.roleId,
  label: ['Administrator', 'Rukovodilac', 'Operater', 'Posmatrač'][index],
  userCount: [0, 2, 7, 3][index],
  defaultCount: value.defaultPermissions.length,
  extraCount: value.extraPermissions.length,
}))
