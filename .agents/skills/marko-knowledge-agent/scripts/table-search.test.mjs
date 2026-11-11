import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { catalogRoot, loadSource, runTransfer } from './source-transfer.mjs'

const source = 'TableAndAdvancedSearchSource'
const base = join(catalogRoot, 'src/patterns', source)
const pagePath = 'src/features/table-search/TableAndAdvancedSearchPage.tsx'
const cssPath = pagePath.replace('.tsx', '.module.css')
const inputPath = 'src/features/table-search/TableAndAdvancedSearchConfig.md'
const require = createRequire(join(catalogRoot, 'package.json'))
const react = require('react')
const ts = require('typescript')
const temporary = []
const run = (root, mode, extra = {}) => runTransfer({ source, target: root, mode, ...extra })
const rows = Array.from({ length: 32 }, (_, index) => ({
  id: index + 1, code: 'ROW-' + String(index + 1).padStart(3, '0'),
  title: index === 0 ? 'Čekić' : index === 1 ? 'Motor' : 'Stavka ' + (index + 1),
}))
function write(root, path, text) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text) }
function project() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'coming-table-clean-')))
  temporary.push(root)
  write(root, 'package.json', JSON.stringify({ private: true, type: 'module', scripts: { lint: 'oxlint', build: 'tsc --noEmit && vite build' } }))
  write(root, 'AGENTS.md', '# User instructions\n\nPreserve existing code.\n')
  symlinkSync(join(catalogRoot, 'node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
  return root
}
after(() => {
  for (const root of temporary) {
    assert.equal(dirname(root), realpathSync(tmpdir()))
    assert.match(basename(root), /^coming-table-clean-/)
    rmSync(join(root, 'node_modules'))
    rmSync(root, { recursive: true })
  }
})

// Real React/Core SSR. Seed only the page's initial hook state; Core itself is not mocked.
// Effect/setter spies let the actual small debounce effect be tested without a browser.
function render(root = catalogRoot, { state = {}, props = {} } = {}) {
  const page = join(root, root === catalogRoot ? 'src/patterns/TableAndAdvancedSearchSource/app/TableAndAdvancedSearchPage.tsx' : pagePath)
  const effects = [], updates = [], cache = new Map()
  let index = 0
  const pageReact = { ...react,
    useState(initial) {
      const position = index++
      const [value] = react.useState(Object.hasOwn(state, position) ? state[position] : initial)
      return [value, (next) => updates.push({ position, next })]
    },
    useEffect(effect, dependencies) { effects.push(effect); react.useEffect(effect, dependencies) },
  }
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }
    cache.set(file, module)
    const output = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    const localRequire = (name) => {
      if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) }
      if (name === 'react' && file === page) return pageReact
      if (name.startsWith('.')) {
        const path = resolve(dirname(file), name)
        return load([path, path + '.tsx', path + '.ts'].find(existsSync))
      }
      return require(name)
    }
    new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
    return module.exports
  }
  const Component = load(page).TableAndAdvancedSearchPage
  const html = require('react-dom/server').renderToStaticMarkup(react.createElement(Component, { rows, ...props }))
  return { html, effects, updates }
}
function checkProject(root, { shell = false } = {}) {
  if (!shell) write(root, 'src/main.tsx', "import { createRoot } from 'react-dom/client'\nimport '@coming.ui.core/themed-components/style.css'\nimport { TableAndAdvancedSearchPage } from './features/table-search/TableAndAdvancedSearchPage'\ncreateRoot(document.getElementById('root')!).render(<TableAndAdvancedSearchPage />)\n")
  write(root, 'index.html', '<html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>')
  write(root, 'tsconfig.json', JSON.stringify({ compilerOptions: {
    target: 'ES2023', lib: ['ES2023', 'DOM'], module: 'ESNext', moduleResolution: 'bundler',
    jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true,
    allowImportingTsExtensions: true, types: ['vite/client'],
  }, include: ['src'] }))
  for (const args of [
    [join(catalogRoot, 'node_modules/oxlint/bin/oxlint'), 'src'],
    [join(catalogRoot, 'node_modules/typescript/bin/tsc'), '--project', join(root, 'tsconfig.json')],
    [join(catalogRoot, 'node_modules/vite/bin/vite.js'), 'build', root, '--config', join(catalogRoot, 'vite.config.ts')],
  ]) {
    const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stdout + result.stderr)
  }
}

test('source is one TSX, one fixed CSS and one short human config; no runtime engine or default actions', () => {
  const manifest = loadSource(source)
  assert.equal(manifest.files.length, 3)
  assert.deepEqual(manifest.files.map((file) => file.role).sort(), ['fixed', 'instructions', 'scaffold'])
  assert.ok(manifest.files.every((file) => !/runtime|Definition|\.mjs|\.mts/.test(file.from)))
  assert.equal(existsSync(join(base, 'config/TableAndAdvancedSearchDefinition.ts')), false)
  const text = readFileSync(join(base, 'app/TableAndAdvancedSearchPage.tsx'), 'utf8')
  assert.doesNotMatch(text, /CoreCentralModal|CoreIconButton|MockData|fetch\(|actionHandlers|effect\.kind/)
  assert.match(text, /CoreAdvancedSearchLayout/)
  assert.match(text, /CoreAdvancedSearchPanel/)
  assert.match(text, /CoreTable<TableRow>/)
  assert.ok(text.split('\n').length < 150)
})

test('real Core renders the minimal default, 15 rows, pager, full cell titles and no business actions', () => {
  const { html } = render()
  const body = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)[1]
  assert.equal([...body.matchAll(/<tr\b/g)].length, 15)
  assert.match(body, /title="Čekić"/)
  assert.doesNotMatch(body, /ROW-016/)
  assert.match(html, /Napredna pretraga/)
  assert.match(html, /tc-core-table__pagination/)
  assert.doesNotMatch(html, /Kreiraj|Izmeni|Obriši|tc-modal/)
  assert.match(render(catalogRoot, { props: { rows: [] } }).html, /Nema rezultata za izabranu pretragu/)
  const nullable = render(catalogRoot, { props: { rows: [{ id: 1, code: null, title: '' }] } }).html
  assert.equal([...nullable.matchAll(/data-label="(?:Šifra|Naziv)" title="\/"/g)].length, 2)
})

test('page logic applies search/filter/sort/paging without mutating rows; draft alone does not filter', () => {
  const before = JSON.stringify(rows)
  // Hook positions are the explicitly visible states in the single page, not a hidden data schema.
  assert.match(render(catalogRoot, { state: { 2: 'ČEKIĆ' } }).html, /Čekić/)
  assert.doesNotMatch(render(catalogRoot, { state: { 2: 'ČEKIĆ' } }).html, /ROW-002/)
  assert.match(render(catalogRoot, { state: { 2: 'cekic' } }).html, /Nema rezultata/)
  assert.match(render(catalogRoot, { state: { 4: 'Motor' } }).html, /Čekić/)
  assert.doesNotMatch(render(catalogRoot, { state: { 5: 'Motor' } }).html, /ROW-001/)
  const lastPage = render(catalogRoot, { state: { 6: { pageNumber: 3, pageSize: 15, sorting: [], filters: {} } } }).html
  assert.match(lastPage, /ROW-031/)
  assert.match(lastPage, /ROW-032/)
  assert.doesNotMatch(lastPage, /ROW-030/)
  const sorted = render(catalogRoot, { state: { 6: { pageNumber: 1, pageSize: 15, sorting: [{ id: 'code', desc: true }], filters: {} } } }).html
  assert.ok(sorted.indexOf('ROW-032') < sorted.indexOf('ROW-031'))
  assert.equal(JSON.stringify(rows), before)
})

test('the actual debounce effect waits 500ms from the last change, cancels on cleanup and respects IME', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const first = render(catalogRoot, { state: { 1: 'A' } })
  const cancel = first.effects[0]()
  t.mock.timers.tick(499)
  assert.equal(first.updates.length, 0)
  cancel()
  const second = render(catalogRoot, { state: { 1: 'AB' } })
  const cleanup = second.effects[0]()
  t.mock.timers.tick(499)
  assert.equal(second.updates.length, 0)
  t.mock.timers.tick(1)
  assert.ok(second.updates.some((update) => update.position === 2 && update.next === 'AB'))
  assert.equal(first.updates.length, 0)
  cleanup()
  const composing = render(catalogRoot, { state: { 1: 'Unfinished', 3: true } })
  assert.equal(composing.effects[0](), undefined)
  t.mock.timers.tick(1000)
  assert.equal(composing.updates.length, 0)
})

test('transfer preserves the host and user rules, is idempotent, and a clean target lints/typechecks/builds', () => {
  const root = project()
  write(root, 'src/App.tsx', '// Existing host\n')
  const before = readFileSync(join(root, 'AGENTS.md'), 'utf8')
  assert.equal(run(root, 'plan').status, 'PLAN_ONLY_NO_WRITES')
  assert.equal(existsSync(join(root, pagePath)), false)
  assert.equal(run(root, 'apply').copied, 3)
  assert.equal(run(root, 'apply').copied, 0)
  assert.equal(readFileSync(join(root, 'src/App.tsx'), 'utf8'), '// Existing host\n')
  assert.ok(readFileSync(join(root, 'AGENTS.md'), 'utf8').startsWith(before.trimEnd()))
  assert.deepEqual(run(root, 'verify').editableScaffolds, [pagePath])
  assert.deepEqual(readdirSync(join(root, 'src/features/table-search')).sort(), ['TableAndAdvancedSearchConfig.md', 'TableAndAdvancedSearchPage.module.css', 'TableAndAdvancedSearchPage.tsx'])
  checkProject(root)
})

test('custom header modal and row icons are normal optional JSX, not default runtime capabilities', () => {
  const root = project()
  run(root, 'apply')
  write(root, inputPath, 'Header: Kreiraj automobil otvara Core modal sa Markom, Modelom, Registracijom i Godištem. Red: Izmeni i Preuzmi sve informacije o fudbalerima. API nije povezan.\n')
  let text = readFileSync(join(root, pagePath), 'utf8').replace('CorePageContainer,', 'CoreCentralModal, CoreSelectList, CoreIconButton, CorePageContainer,')
  const columnBlock = text.match(/const columns: CoreTableColumn<TableRow>\[\] = \[([\s\S]*?)\n\]/)
  text = text.replace(columnBlock[0], '')
  const localColumns = columnBlock[0].replace(/\n\]$/, `
    { id: 'actions', header: '', enableSorting: false, cell: ({ row }: { row: { original: TableRow } }) => (
      <div className={styles.rowActions}>
        <CoreIconButton label="Izmeni" size="large" appearance="ghost" variant="secondary"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="m4 16 12-12 4 4L8 20H4z" /></svg>}
          onClick={() => setEditing(row.original)} />
        <CoreIconButton label="Preuzmi sve informacije o fudbalerima" size="large" appearance="ghost"
          disabled title="API nije povezan."
          icon={<svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v14m-5-5 5 5 5-5M4 20h16" /></svg>} />
      </div>
    ) },
  ]`)
  text = text.replace("  const [filtersOpen", `  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<TableRow | null>(null)
  const actions = headerActions ?? <CoreButton size="small" onClick={() => setCreating(true)}>Kreiraj automobil</CoreButton>
  ${localColumns}
  const [filtersOpen`)
    .replace('{headerActions ? <div className={styles.headerActions}>{headerActions}</div> : null}', '{actions ? <div className={styles.headerActions}>{actions}</div> : null}')
    .replace('</CorePageContainer>', `<CoreCentralModal isOpen={creating} onClose={() => setCreating(false)} title="Kreiranje automobila">
      <CoreSelectList label="Marka" items={[{ id: 'A', label: 'Demo A' }]} />
      <CoreInput label="Model" /><CoreInput label="Registracija" /><CoreInput label="Godište" type="number" />
      <CoreButton disabled title="API nije povezan.">Sačuvaj</CoreButton>
    </CoreCentralModal>
    <CoreCentralModal isOpen={editing !== null} onClose={() => setEditing(null)} title="Izmena">
      <CoreInput label="Naziv" defaultValue={editing?.title} />
      <CoreButton disabled title="API nije povezan.">Sačuvaj</CoreButton>
    </CoreCentralModal>
    </CorePageContainer>`)
  write(root, pagePath, text)
  assert.deepEqual(run(root, 'verify').editableScaffolds, [pagePath])
  assert.match(render(root).html, /Kreiraj automobil/)
  assert.match(render(root).html, /Preuzmi sve informacije o fudbalerima/)
  checkProject(root)
  // Re-applying a template is NOT an update mechanism; it must not overwrite these edits.
  assert.throws(() => run(root, 'apply'), /COLLISION/)
  assert.equal(readFileSync(join(root, pagePath), 'utf8'), text)
  write(root, cssPath, readFileSync(join(root, cssPath), 'utf8') + '\n.header { height: 100px }\n')
  assert.throws(() => run(root, 'verify'), /FIXED_FILE_DRIFT/)
})

test('table-only customization removes the entire toolbar; source CSS keeps header/fullscreen geometry', () => {
  const root = project()
  run(root, 'apply')
  write(root, inputPath, 'Ukloni ceo toolbar, bez akcija.\n')
  write(root, pagePath, readFileSync(join(root, pagePath), 'utf8').replace('quickSearch: true, advancedSearch: true', 'quickSearch: false, advancedSearch: false'))
  const html = render(root).html
  assert.doesNotMatch(html, /tc-core-advanced-search-layout__toolbar-section|Brza pretraga|Napredna pretraga/)
  assert.match(run(root, 'verify').status, /^CODE_CONTRACT_OK/)
  // Static geometry checks are not a browser/pixel-perfect claim.
  const css = readFileSync(join(root, cssPath), 'utf8')
  assert.match(css, /max-height: 48px/)
  assert.match(css, /height: 32px/)
  assert.match(css, /max-width: 1023px/)
  assert.match(readFileSync(join(root, pagePath), 'utf8'), /width="100vw"/)
  write(root, pagePath, '')
  assert.throws(() => run(root, 'verify'), /EMPTY_SCAFFOLD/)
})

test('AppShell and Table sources compose through AppLayoutConfig without changing the fixed router', () => {
  const root = project()
  const shell = { source: 'AppShellSource', target: root }
  runTransfer({ ...shell, mode: 'apply' })
  run(root, 'apply')
  const path = 'src/layout/AppLayoutConfig.tsx'
  const text = readFileSync(join(root, path), 'utf8').replace("{ path: '/overview', title: 'Pregled', icon: 'folder' }", "{ path: '/overview', title: 'Pregled', icon: 'folder', element: <TableAndAdvancedSearchPage /> }")
  write(root, path, "import { TableAndAdvancedSearchPage } from '../features/table-search/TableAndAdvancedSearchPage'\n" + text)
  assert.match(runTransfer({ ...shell, mode: 'verify' }).status, /^CODE_CONTRACT_OK/)
  assert.match(run(root, 'verify').status, /^CODE_CONTRACT_OK/)
  checkProject(root, { shell: true })
  assert.match(runTransfer({ ...shell, mode: 'verify' }).status, /^CODE_CONTRACT_OK/)
  assert.match(run(root, 'verify').status, /^CODE_CONTRACT_OK/)
})

test('documentation links resolve and there are no retired engine files or dangling source imports', () => {
  const manifest = loadSource(source)
  const text = readFileSync(join(base, manifest.pattern), 'utf8')
  assert.doesNotMatch(text, /C:\/Users\/|MD\.UI|PSBG|record-config/)
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) if (!/^[a-z]+:/.test(match[1])) assert.ok(existsSync(resolve(base, match[1])), match[1])
  assert.equal(existsSync(join(catalogRoot, '.agents/skills/marko-knowledge-agent/scripts/table-search-verification.mjs')), false)
  assert.equal(manifest.generatedDefinition, undefined)
})
