import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { catalogRoot, loadSource, runTransfer } from './source-transfer.mjs'

const source = 'DashboardSource'
const base = join(catalogRoot, 'src/patterns', source)
const manifest = JSON.parse(readFileSync(join(base, 'source.manifest.json'), 'utf8'))
const pending = existsSync(join(base, '.planned'))
const require = createRequire(join(catalogRoot, 'package.json'))
const react = require('react'), ts = require('typescript')
const temporary = []
const read = file => readFileSync(file, 'utf8')
const points = Array.from({ length: 12 }, (_, i) => ({ id: 'month-' + i, label: 'Mesec ' + (i + 1), value: i + 1 }))
const records = Array.from({ length: 7 }, (_, i) => ({ id: i, title: 'Stavka ' + i, subtitle: 'Opis ' + i, date: '27. 10. 2026.', status: { label: 'Završeno', variant: 'success' } }))
const data = { monthly: points, statuses: [{ id: 'active', label: 'Aktivno', value: 3 }, { id: 'done', label: 'Gotovo', value: 7 }], recentItems: records, recentActivities: records }
function write(root, file, text) { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text) }
function runtime(root = base, transform = text => text, months = 6) {
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }; cache.set(file, module)
    const input = file.endsWith('DashboardPage.tsx') ? transform(read(file)) : read(file)
    const output = ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    const localRequire = name => {
      if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }
      if (name === 'react' && file.endsWith('DashboardPage.tsx')) return { ...react, useState: initial => react.useState(typeof initial === 'number' ? months : initial) }
      if (name.startsWith('.')) {
        const resolved = resolve(dirname(file), name)
        return load([resolved, resolved + '.tsx', resolved + '.ts'].find(existsSync))
      }
      return require(name)
    }
    new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
    return module.exports
  }
  return load
}
function render(props = data, transform, months = 6) {
  const Page = runtime(base, transform, months)(join(base, 'app/DashboardPage.tsx')).DashboardPage
  return require('react-dom/server').renderToStaticMarkup(react.createElement(Page, props))
}
function asTables(text) {
  return text
    .replace('import { DashboardLineChart, DashboardPieChart, type DashboardPoint }', 'import { type DashboardPoint }')
    .replace('title="Mesečni rezultati"', 'title="Mesečni rezultati" table')
    .replace('<DashboardPanel title="Raspodela po statusima"', '<DashboardPanel table title="Raspodela po statusima"')
    .replace('<DashboardLineChart points={visibleMonths} label="Mesečni rezultati" />', '<DashboardTable rows={visibleMonths} columns={[{ id: "label", title: "Mesec", render: row => row.label }, { id: "value", title: "Broj", render: row => row.value }]} rowKey={row => row.id} label="Mesečni rezultati" />')
    .replace('<DashboardPieChart points={statuses} label="Raspodela po statusima" />', '<DashboardTable rows={statuses} columns={[{ id: "label", title: "Status", render: row => row.label }, { id: "value", title: "Broj", render: row => row.value }]} rowKey={row => row.id} label="Raspodela po statusima" />')
}
function withoutCards(text) { return text.replace(/const defaultCards: DashboardMetric\[\] = \[[\s\S]*?\n\]/, 'const defaultCards: DashboardMetric[] = []') }
function wideRow(text) {
  const start = text.indexOf('          <DashboardPanel table title="Raspodela po statusima"')
  const end = text.indexOf('</DashboardPanel>', start) + '</DashboardPanel>'.length
  assert.ok(start > 0 && end > start)
  return (text.slice(0, start).replace('<div className={styles.row}>', '<div className={styles.rowFull}>') + text.slice(end)).replace('  statuses = emptyPoints,\n', '')
}
function host() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'coming-dashboard-check-')))
  temporary.push(root)
  write(root, 'package.json', JSON.stringify({ private: true, type: 'module' }))
  write(root, 'AGENTS.md', '# Existing target instructions\n')
  symlinkSync(join(catalogRoot, 'node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
  return root
}
function copyPayload(root, transform = text => text) {
  for (const file of manifest.files) write(root, file.to, file.role === 'scaffold' ? transform(read(join(catalogRoot, file.from))) : read(join(catalogRoot, file.from)))
}
function build(root) {
  write(root, 'src/main.tsx', "import { createRoot } from 'react-dom/client'\nimport '@coming.ui.core/themed-components/style.css'\nimport { DashboardPage } from './features/dashboard/DashboardPage'\ncreateRoot(document.getElementById('root')!).render(<DashboardPage />)\n")
  write(root, 'index.html', '<html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>')
  write(root, 'tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2023', lib: ['ES2023', 'DOM'], module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, noEmit: true, noUnusedLocals: true, noUnusedParameters: true, skipLibCheck: true, types: ['vite/client'] }, include: ['src'] }))
  for (const args of [
    [join(catalogRoot, 'node_modules/oxlint/bin/oxlint'), 'src', '--deny-warnings'],
    [join(catalogRoot, 'node_modules/typescript/bin/tsc'), '-p', join(root, 'tsconfig.json')],
    [join(catalogRoot, 'node_modules/vite/bin/vite.js'), 'build', root, '--config', join(catalogRoot, 'vite.config.ts')],
  ]) {
    const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stdout + result.stderr)
  }
}
after(() => { for (const root of temporary) {
  assert.equal(dirname(root), realpathSync(tmpdir()))
  assert.match(basename(root), /^coming-dashboard-check-/)
  rmSync(join(root, 'node_modules'))
  rmSync(root, { recursive: true })
} })

test('source payload is self-contained, uses installed Core and has current hashes', () => {
  assert.equal(manifest.files.length, 5)
  assert.equal(manifest.dependencies['@coming.ui.core/themed-components'], '0.1.12')
  for (const file of manifest.files) {
    assert.equal(createHash('sha256').update(readFileSync(join(catalogRoot, file.from))).digest('hex'), file.sha256)
    assert.ok(file.to.startsWith('src/features/dashboard/'))
    assert.doesNotMatch(read(join(catalogRoot, file.from)), /MockData|E-Arhiva|MD\.UI|node_modules|fetch\(/)
  }
})
test('default has six summary cards, one line, one pie, and two semantic five-row tables', () => {
  const html = render()
  assert.equal([...html.matchAll(/class="[^"]*\bsummaryCard\b[^"]*"/g)].length, 6)
  assert.equal([...html.matchAll(/<linearGradient/g)].length, 1)
  assert.match(html, /class="donut"/)
  assert.equal([...html.matchAll(/<table\b/g)].length, 2)
  assert.equal([...html.matchAll(/<tr class="tableRow"/g)].length, 10)
  assert.doesNotMatch(html, /Stavka 5|Stavka 6/)
  assert.equal([...html.matchAll(/Navigacija nije povezana/g)].length, 2)
})
test('same data becomes four tables, no charts, no summary cards and no mutation', () => {
  const before = JSON.stringify(data)
  const html = render(data, text => withoutCards(asTables(text)))
  assert.equal([...html.matchAll(/<table\b/g)].length, 4)
  assert.doesNotMatch(html, /summaryCard|<linearGradient|class="donut"/)
  assert.match(html, /Mesec 12/); assert.match(html, /Aktivno/); assert.match(html, /Gotovo/)
  assert.equal(JSON.stringify(data), before)
  const wide = render(data, text => wideRow(withoutCards(asTables(text))))
  assert.equal([...wide.matchAll(/<table\b/g)].length, 3)
  assert.match(wide, /class="rowFull"/); assert.doesNotMatch(wide, /Raspodela po statusima/)
})
test('table status columns are independent and badge/marker share one color', () => {
  const noStatus = records.map(({ status: _status, ...row }) => ({ ...row, color: '#ff0000' }))
  const html = render({ ...data, recentItems: noStatus })
  const tables = [...html.matchAll(/<table\b[\s\S]*?<\/table>/g)].map(match => match[0])
  assert.equal(tables.length, 2)
  assert.doesNotMatch(tables[0], /<th[^>]*>Status<|tc-core-status-badge|148px|background:#ff0000/)
  assert.match(tables[0], /background:var\(--dashboard-primary\)/)
  assert.match(tables[1], /<th[^>]*>Status<|tc-core-status-badge/)
  const colored = render({ ...data, recentItems: [{ ...records[0], color: '#8665dc' }] })
  assert.match(colored, /background:#8665dc/)
  assert.match(colored, /--tc-core-status-badge-tone:#8665dc;color:#8665dc/)
  const mixed = render({ ...data, recentItems: [noStatus[0], records[1]], recentActivities: noStatus })
  const mixedTables = [...mixed.matchAll(/<table\b[\s\S]*?<\/table>/g)].map(match => match[0])
  assert.equal([...mixedTables[0].matchAll(/class="tc-core-status-badge /g)].length, 1)
  assert.doesNotMatch(mixedTables[1], /tc-core-status-badge|<th[^>]*>Status</)
})

test('period controls select 3/6/12 chronological points and card count follows its array', () => {
  const three = render(data, undefined, 3), twelve = render(data, undefined, 12)
  assert.doesNotMatch(three, /Mesec 9/); assert.match(three, /Mesec 10/)
  assert.match(twelve, /Mesec 1:/)
  const html = render({ ...data, cards: [{ id: 'zero', title: 'Nula', value: 0 }] })
  assert.equal([...html.matchAll(/class="[^"]*\bsummaryCard\b[^"]*"/g)].length, 1)
  assert.match(html, /class="summaryValue">0</)
})
test('empty, loading and failed resources are independent and errors win', () => {
  assert.equal([...render({}).matchAll(/Nema podataka za prikaz/g)].length, 4)
  const html = render({ ...data, states: { monthly: { loading: true, error: 'Neuspeo trend' }, items: { loading: true } } })
  assert.match(html, /role="alert"/); assert.match(html, /Neuspeo trend/); assert.match(html, /role="status"/)
  assert.match(html, /class="donut"/)
  assert.equal([...html.matchAll(/<linearGradient/g)].length, 0)
  assert.equal([...html.matchAll(/<table\b/g)].length, 1)
})
test('chart gradient IDs are unique, all-zero data renders and invalid data is explicit', () => {
  const { DashboardLineChart, DashboardPieChart } = runtime()(join(base, 'app/DashboardCharts.tsx'))
  const renderComponent = (component, points) => require('react-dom/server').renderToStaticMarkup(react.createElement(component, { points, label: 'Serija' }))
  const pair = require('react-dom/server').renderToStaticMarkup(react.createElement('div', null, react.createElement(DashboardLineChart, { points, label: 'A' }), react.createElement(DashboardLineChart, { points, label: 'B' })))
  const ids = [...pair.matchAll(/<linearGradient id="([^"]+)"/g)].map(match => match[1])
  assert.equal(new Set(ids).size, 2)
  for (const component of [DashboardLineChart, DashboardPieChart]) {
    assert.doesNotMatch(renderComponent(component, [{ id: '0', label: 'Nula', value: 0 }]), /NaN|Infinity/)
    assert.match(renderComponent(component, [{ id: 'x', label: 'Neispravno', value: -1 }]), /role="alert"/)
  }
})
test('both default and four-table config compile in an independent blank host without reference projects', () => {
  const root = host()
  copyPayload(root); build(root)
  copyPayload(root, text => withoutCards(asTables(text))); build(root)
  copyPayload(root, text => wideRow(withoutCards(asTables(text)))); build(root)
})
test('production generator respects the visual-reference gate', () => {
  if (pending) assert.throws(() => loadSource(source), /SOURCE_PLANNED_NOT_IMPLEMENTED/)
  else assert.equal(loadSource(source).source, source)
})
test('ready source uses the normal transfer, preserves host files and rejects drift/collisions', { skip: pending ? 'Awaiting approved visual references' : false }, () => {
  const root = host(), run = mode => runTransfer({ source, target: root, mode })
  write(root, 'src/App.tsx', '// Existing code\n')
  assert.equal(run('plan').status, 'PLAN_ONLY_NO_WRITES')
  assert.equal(run('apply').copied, 5)
  assert.equal(run('apply').copied, 0)
  assert.equal(read(join(root, 'src/App.tsx')), '// Existing code\n')
  assert.match(run('verify').status, /^CODE_CONTRACT_OK/)
  const fixed = join(root, 'src/features/dashboard/DashboardPage.module.css')
  writeFileSync(fixed, read(fixed) + '\n.bad {margin:100px}\n')
  assert.throws(() => run('verify'), /FIXED_FILE_DRIFT/)
  assert.throws(() => run('apply'), /COLLISION/)
})
