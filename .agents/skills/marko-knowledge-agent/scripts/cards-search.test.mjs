import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { catalogRoot, loadSource, runTransfer } from './source-transfer.mjs'

const source = 'CardsAndAdvancedSearchSource', base = join(catalogRoot, 'src/patterns', source)
const pagePath = 'src/features/cards-search/CardsAndAdvancedSearchPage.tsx'
const cssPath = pagePath.replace('.tsx', '.module.css')
const configPath = 'src/features/cards-search/CardsAndAdvancedSearchConfig.md'
const pending = existsSync(join(base, '.planned'))
const require = createRequire(join(catalogRoot, 'package.json'))
const react = require('react'), ts = require('typescript'), roots = []
const rows = Array.from({ length: 32 }, (_, i) => ({ id: i + 1, code: `ITEM-${i + 1}`, title: i === 0 ? 'Čekić' : i === 1 ? 'Motor' : `Stavka ${i + 1}`, date: '25. 10. 2026.', subtitle: `Podnosilac ${i + 1}` }))
const read = path => readFileSync(path, 'utf8')
function write(root, path, content) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), content) }
function project() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'coming-cards-test-')))
  roots.push(root)
  write(root, 'package.json', JSON.stringify({ private: true, type: 'module' }))
  write(root, 'AGENTS.md', '# Target rules\n\nKeep user instructions.\n')
  symlinkSync(join(catalogRoot, 'node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
  return root
}
after(() => { for (const root of roots) {
  assert.equal(dirname(realpathSync(root)), realpathSync(tmpdir()))
  assert.match(basename(root), /^coming-cards-test-/)
  rmSync(join(root, 'node_modules')); rmSync(root, { recursive: true })
} })
// Actual Core/React SSR; only the page's hook state is seeded/spied, not Core.
function render({ root = catalogRoot, state = {}, props = {}, transform = text => text } = {}) {
  let index = 0
  const effects = [], updates = []
  const page = root === catalogRoot ? join(base, 'app/CardsAndAdvancedSearchPage.tsx') : join(root, pagePath)
  const pageReact = { ...react,
    useState(initial) {
      const position = index++
      const [value] = react.useState(Object.hasOwn(state, position) ? state[position] : initial)
      return [value, next => updates.push({ position, next })]
    },
    useEffect(effect, dependencies) { effects.push(effect); react.useEffect(effect, dependencies) },
  }
  const localRequire = name => name === 'react' ? pageReact : name.endsWith('.module.css')
    ? { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) } : require(name)
  const module = { exports: {} }
  const output = ts.transpileModule(transform(read(page)), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  const html = require('react-dom/server').renderToStaticMarkup(react.createElement(module.exports.CardsAndAdvancedSearchPage, { rows, ...props }))
  return { html, effects, updates }
}
function build(root) {
  write(root, 'index.html', '<html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>')
  write(root, 'src/main.tsx', "import { createRoot } from 'react-dom/client'\nimport '@coming.ui.core/themed-components/style.css'\nimport { CardsAndAdvancedSearchPage } from './features/cards-search/CardsAndAdvancedSearchPage'\ncreateRoot(document.getElementById('root')!).render(<CardsAndAdvancedSearchPage />)\n")
  write(root, 'tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2023', lib: ['ES2023','DOM'], module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true, types: ['vite/client'] }, include: ['src'] }))
  for (const args of [
    [join(catalogRoot, 'node_modules/oxlint/bin/oxlint'), 'src', '--deny-warnings'],
    [join(catalogRoot, 'node_modules/typescript/bin/tsc'), '-p', join(root, 'tsconfig.json')],
    [join(catalogRoot, 'node_modules/vite/bin/vite.js'), 'build', root, '--config', join(catalogRoot, 'vite.config.ts')],
  ]) { const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' }); assert.equal(result.status, 0, result.stdout + result.stderr) }
}

test('three-file payload is self-contained and its digests match the reviewed source', () => {
  const manifest = JSON.parse(read(join(base, 'source.manifest.json')))
  assert.equal(manifest.files.length, 3)
  assert.deepEqual(manifest.files.map(f => f.role).sort(), ['fixed', 'instructions', 'scaffold'])
  for (const f of manifest.files) assert.equal(createHash('sha256').update(readFileSync(join(catalogRoot, f.from))).digest('hex'), f.sha256)
  const text = read(join(base, 'app/CardsAndAdvancedSearchPage.tsx'))
  assert.doesNotMatch(text, /MockData|fetch\(|CoreTable[<(]|actionRegistry|runtime\//)
  assert.deepEqual([...text.matchAll(/from\s+['"]([^'"]+)/g)].map(m => m[1]).sort(), ['./CardsAndAdvancedSearchPage.module.css', '@coming.ui.core/themed-components', 'react'])
})
test('real Core renders 15 cards, reference rows, expand and the original pager shape without business actions', () => {
  const { html } = render()
  assert.equal([...html.matchAll(/role="article"/g)].length, 15)
  assert.match(html, /tc-core-expandable-cards__reference/)
  assert.match(html, /title="25. 10. 2026."/)
  assert.match(html, /tc-core-pagination__input/)
  assert.match(html, /Prikaz 1 do 15 od ukupno 32 elemenata/)
  assert.doesNotMatch(html, /ITEM-16|Kreiraj|tc-core-expandable-cards__view|tc-core-status-badge/)
  assert.equal([...html.matchAll(/role="region"[^>]*hidden|hidden[^>]*role="region"/g)].length, 15)
})
test('search, applied filter and paging use all rows without mutating them; draft does not apply', () => {
  const before = JSON.stringify(rows)
  assert.doesNotMatch(render({ state: { 2: 'ČEKIĆ' } }).html, /ITEM-2/)
  assert.match(render({ state: { 4: 'Motor' } }).html, /Čekić/)
  assert.doesNotMatch(render({ state: { 5: 'Motor' } }).html, /ITEM-1/)
  assert.match(render({ state: { 6: 3 } }).html, /ITEM-31/)
  assert.doesNotMatch(render({ state: { 6: 3 } }).html, /ITEM-30/)
  assert.match(render({ state: { 6: 99 }, props: { rows: rows.slice(0, 2) } }).html, /Prikaz 1 do 2/)
  assert.equal(JSON.stringify(rows), before)
})
test('actual debounce cancels old work, waits 500ms and respects IME', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const one = render({ state: { 1: 'A' } }), cancel = one.effects[0]()
  t.mock.timers.tick(499); assert.equal(one.updates.length, 0); cancel()
  const two = render({ state: { 1: 'AB' } }), stop = two.effects[0]()
  t.mock.timers.tick(500)
  assert.equal(one.updates.length, 0)
  assert.ok(two.updates.some(u => u.position === 2 && u.next === 'AB'))
  assert.ok(two.updates.some(u => u.position === 6 && u.next === 1))
  assert.ok(two.updates.some(u => u.position === 7 && u.next === null)); stop()
  assert.equal(render({ state: { 1: '未', 3: true } }).effects[0](), undefined)
})
test('empty/loading/error states differ; missing fields, static cards and optional header Buttons render', () => {
  assert.match(render({ props: { rows: [] } }).html, /Nema rezultata za izabranu pretragu/)
  assert.match(render({ props: { loading: true } }).html, /role="status"/)
  const error = render({ props: { loading: true, error: 'Stvarna greška' } }).html
  assert.match(error, /role="alert"/); assert.doesNotMatch(error, /role="article"|Učitavanje/)
  assert.match(render({ props: { rows: [{ id: 0, code: null, title: null }] } }).html, /title="\/"/)
  const { CoreButton } = require('@coming.ui.core/themed-components')
  assert.match(render({ props: { headerActions: react.createElement(CoreButton, { size: 'small' }, 'Custom naziv') } }).html, /Custom naziv/)
  assert.doesNotMatch(render({ transform: t => t.replace('expandable: true', 'expandable: false') }).html, /role="region"/)
})
test('readiness gate never claims missing visual references are available', () => {
  if (pending) assert.throws(() => loadSource(source), /SOURCE_PLANNED_NOT_IMPLEMENTED/)
  else assert.equal(loadSource(source).source, source)
})
test('a custom config becomes ordinary Core JSX and compiles in a separate blank host', () => {
  const root = project()
  const manifest = JSON.parse(read(join(base, 'source.manifest.json')))
  // Authoring compilation only while visual references are pending; not a transfer claim.
  for (const file of manifest.files) write(root, file.to, read(join(catalogRoot, file.from)))
  write(root, configPath, 'Vozila: dodaj Vlasnik polje, info Status i prečicu. Header Kreiraj automobil otvara Core modal. API nije povezan; Save disabled.\n')
  let text = read(join(root, pagePath))
    .replace('  CoreExpandableCards,', '  CoreExpandableCards, CoreCentralModal, CoreStatusBadge,')
    .replace('  const filtersId = useId()', `  const [editing, setEditing] = useState<CardRow | null>(null)
  const actions = headerActions ?? <CoreButton size="small" onClick={() => setEditing({ id: 'new', code: null, title: null })}>Kreiraj automobil</CoreButton>
  const filtersId = useId()`)
    .replace('    id: row.id,', `    id: row.id,
    fields: [{ id: 'owner', label: 'Vlasnik', value: row.subtitle }],
    status: <CoreStatusBadge variant="info" size="small">U obradi</CoreStatusBadge>,
    accent: 'info' as const,
    viewAction: { label: 'Pregledaj vozilo', onClick: () => setEditing(row) },`)
    .replaceAll('{headerActions ?', '{actions ?').replaceAll('{headerActions}</div>', '{actions}</div>')
    .replace('</CorePageContainer>', `<CoreCentralModal isOpen={editing !== null} onClose={() => setEditing(null)} title="Vozilo">
      <CoreInput label="Model" defaultValue={editing?.title ?? ''} />
      <CoreInput label="Registracija" />
      <CoreButton disabled title="API nije povezan.">Sačuvaj</CoreButton>
    </CoreCentralModal></CorePageContainer>`)
  assert.match(text, /setEditing\(row\)/)
  write(root, pagePath, text)
  const html = render({ root }).html
  assert.match(html, /Kreiraj automobil/); assert.match(html, /Pregledaj vozilo/)
  assert.match(html, /Vlasnik/); assert.match(html, /U obradi/)
  build(root)
})
test('ready source transfers, preserves host code, builds and rejects collisions/drift', { skip: pending ? 'Awaiting approved visual references' : false }, () => {
  const root = project(), run = mode => runTransfer({ source, target: root, mode })
  write(root, 'src/App.tsx', '// Existing application\n')
  assert.equal(run('plan').status, 'PLAN_ONLY_NO_WRITES'); assert.equal(existsSync(join(root, pagePath)), false)
  assert.equal(run('apply').copied, 3); assert.equal(run('apply').copied, 0)
  assert.match(read(join(root, 'AGENTS.md')), /Keep user instructions/)
  assert.equal(read(join(root, 'src/App.tsx')), '// Existing application\n')
  assert.deepEqual(run('verify').editableScaffolds, [pagePath]); build(root)
  write(root, pagePath, read(join(root, pagePath)).replace('Pregled stavki', 'Pregled vozila'))
  write(root, configPath, 'Naslov: Pregled vozila.\n')
  assert.match(run('verify').status, /^CODE_CONTRACT_OK/)
  assert.throws(() => run('apply'), /COLLISION/)
  write(root, cssPath, read(join(root, cssPath)) + '\n.bad { margin: 100px }\n')
  assert.throws(() => run('verify'), /FIXED_FILE_DRIFT/)
})
