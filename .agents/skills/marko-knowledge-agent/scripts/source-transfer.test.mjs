import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { catalogRoot, loadSource, runTransfer } from './source-transfer.mjs'

const temporary = []
const manifest = loadSource('AppShellSource')
const payloadCount = manifest.files.length
const options = (target, mode, extra = {}) => ({ source: 'AppShellSource', target, mode, ...extra })

// Execute only trusted source/synthetic fixtures for Node/SSR tests, never during transfer.
function runtimeLoader() {
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports
    const require = createRequire(file)
    const ts = require('typescript')
    const output = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    const module = { exports: {} }
    cache.set(file, module)
    function localRequire(name) {
      if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_object, key) => String(key) }) }
      if (name.startsWith('.')) {
        const base = resolve(dirname(file), name)
        const dependency = [base, base + '.tsx', base + '.ts'].find((path) => existsSync(path))
        if (!dependency) throw new Error(`Missing fixture import: ${file} -> ${name}`)
        return load(dependency)
      }
      return require(name)
    }
    new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
    return module.exports
  }
  return load
}

function customAppLayoutConfig(original) {
  const require = createRequire(join(catalogRoot, 'package.json'))
  const ts = require('typescript')
  const replacements = {
    appLayoutConfig: `{
      appName: 'Synthetic Documents', shortName: 'D', menuLabel: 'Navigacija', homePath: '/overview',
      topbar: { showTitle: true, description: '', actions: null, profileMenu: null },
      pages: [
        { path: '/overview', title: 'Pregled dokumenata', menuLabel: 'Pregled', icon: 'home' },
        { path: '/documents', title: 'Dokumenti', group: { label: 'Dokumentacija', icon: 'folder' } },
        { path: '/documents/archive', title: 'Arhiva', group: { label: 'Dokumentacija', icon: 'folder' } },
        { path: '/account', title: 'Profil', menu: false },
      ],
    }`,
  }
  const ast = ts.createSourceFile('AppLayoutConfig.tsx', original, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const edits = []
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && replacements[node.name.text]) edits.push({ start: node.initializer.getStart(ast), end: node.initializer.end, text: replacements[node.name.text] })
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(edits.length, 1)
  return edits.sort((a, b) => b.start - a.start).reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), original)
}

function renderRoutes(load, root, path, shellProps) {
  const require = createRequire(join(root, 'package.json'))
  const { createElement } = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const { MemoryRouter } = require('react-router-dom')
  const routeFile = root === catalogRoot ? 'src/patterns/AppShellSource/app/router/AppRoutes.tsx' : 'src/layout/AppRoutes.tsx'
  const { AppRoutes } = load(join(root, routeFile))
  return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] }, createElement(AppRoutes, { shellProps })))
}
function project({ dependencies = true } = {}) {
  const path = mkdtempSync(join(tmpdir(), 'coming-source-contract-'))
  temporary.push(realpathSync(path))
  writeFileSync(join(path, 'package.json'), JSON.stringify({ private: true, scripts: { lint: 'echo fixture', build: 'echo fixture' } }))
  writeFileSync(join(path, 'AGENTS.md'), '# Target rules\n\nKeep this user instruction.\n')
  writeFileSync(join(path, 'AppLayoutConfig.input.txt'), '// User supplied config attachment\n')
  if (dependencies) symlinkSync(join(catalogRoot, 'node_modules'), join(path, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
  return path
}
after(() => {
  // Only delete exact test-owned temporary roots after checking resolved scope.
  const allowedParent = realpathSync(tmpdir())
  for (const path of temporary) {
    const actual = realpathSync(path)
    assert.equal(dirname(actual), allowedParent)
    assert.match(basename(actual), /^coming-source-contract-/)
    // Remove the dependency link first; never recurse through the catalog's dependencies.
    if (existsSync(join(actual, 'node_modules'))) rmSync(join(actual, 'node_modules'), { recursive: true })
    rmSync(actual, { recursive: true })
  }
})

test('source manifest covers every runtime file and preserves source bytes', () => {
  const payload = manifest.files.map((item) => item.from)
  function files(folder) {
    return readdirSync(folder, { withFileTypes: true }).flatMap((item) => item.isDirectory() ? files(join(folder, item.name)) : [join(folder, item.name)])
  }
  const sourceFolder = join(catalogRoot, 'src/patterns/AppShellSource')
  for (const file of files(sourceFolder).filter((file) => /\.(tsx?|css)$/.test(file))) {
    assert.ok(payload.includes(file.slice(catalogRoot.length + 1).replaceAll('\\', '/')), file)
  }
  assert.ok(manifest.files.every((file) => file.from.startsWith('src/patterns/AppShellSource/')))
  for (const file of manifest.files) assert.doesNotMatch(readFileSync(join(catalogRoot, file.from), 'utf8'), /MockData|Mina Jovanović|example\.test|DemoProfile|sessionMessage/)
  assert.equal(runTransfer({ source: 'AppShellSource', mode: 'check-source' }).files, payloadCount)
  assert.equal(manifest.files.filter((file) => file.role === 'fixed').length, payloadCount - 1)
})

test('plan writes nothing; apply preserves instructions and supplied input; verify succeeds', () => {
  const target = project()
  const before = readdirSync(target)
  assert.equal(runTransfer(options(target, 'plan')).status, 'PLAN_ONLY_NO_WRITES')
  assert.deepEqual(readdirSync(target), before)
  assert.equal(runTransfer(options(target, 'apply')).copied, payloadCount)
  assert.match(readFileSync(join(target, 'AGENTS.md'), 'utf8'), /Keep this user instruction/)
  assert.equal(readFileSync(join(target, 'AppLayoutConfig.input.txt'), 'utf8'), '// User supplied config attachment\n')
  assert.equal(existsSync(join(target, 'AppNiche.md')), false)
  assert.equal(runTransfer(options(target, 'verify')).status, 'CODE_CONTRACT_OK_NOT_A_BUILD_OR_BROWSER_TEST')
  const agents = readFileSync(join(target, 'AGENTS.md'), 'utf8')
  assert.equal(runTransfer(options(target, 'apply')).copied, 0)
  assert.equal(readFileSync(join(target, 'AGENTS.md'), 'utf8'), agents)
  const imports = {
    'src/App.tsx': [['./router/AppRoutes', './layout/AppRoutes']],
    'src/layout/AppShell.tsx': [['../../config/AppLayoutConfig', './AppLayoutConfig'], ['../../shared/AppIcon', './AppIcon']],
    'src/layout/AppRoutes.tsx': [['../../config/AppLayoutConfig', './AppLayoutConfig'], ['../layout/EmptyPage', './EmptyPage'], ['../../shared/AppIcon', './AppIcon'], ['../layout/AppShell', './AppShell']],
    'src/layout/AppLayoutConfig.tsx': [['../shared/AppIcon', './AppIcon']],
    'src/layout/navigation.ts': [['../../config/AppLayoutConfig', './AppLayoutConfig'], ['../../shared/AppIcon', './AppIcon']],
  }
  for (const item of manifest.files) {
    let expected = readFileSync(join(catalogRoot, item.from), 'utf8')
    for (const [from, to] of imports[item.to] ?? []) expected = expected.replace(`'${from}'`, `'${to}'`)
    assert.equal(readFileSync(join(target, item.to), 'utf8'), expected)
    assert.equal(item.to.split('/').includes('patterns'), false)
  }
  assert.equal(existsSync(join(target, 'src/patterns')), false)
  assert.equal(existsSync(join(target, 'src/layout/AppShell.tsx')), true)
  assert.equal(existsSync(join(target, 'src/layout/AppRoutes.tsx')), true)
})

test('collision is rejected before any payload is copied; exact approved replacement works', () => {
  const target = project()
  mkdirSync(join(target, 'src'))
  writeFileSync(join(target, 'src/App.tsx'), '// existing user app\n')
  const agents = readFileSync(join(target, 'AGENTS.md'), 'utf8')
  assert.throws(() => runTransfer(options(target, 'apply')), /COLLISION/)
  assert.equal(readFileSync(join(target, 'src/App.tsx'), 'utf8'), '// existing user app\n')
  assert.equal(readFileSync(join(target, 'AGENTS.md'), 'utf8'), agents)
  assert.equal(existsSync(join(target, 'src/patterns')), false)
  assert.equal(runTransfer(options(target, 'apply', { replaceFiles: ['src/App.tsx'] })).copied, payloadCount)
  assert.equal(runTransfer(options(target, 'verify')).files, payloadCount)
})

test('fixed CSS drift fails even when the file remains valid CSS', () => {
  const target = project()
  runTransfer(options(target, 'apply'))
  const css = join(target, 'src/layout/AppShell.module.css')
  writeFileSync(css, readFileSync(css, 'utf8') + '\n.logo { margin-left: 1px; }\n')
  assert.throws(() => runTransfer(options(target, 'verify')), /FIXED_FILE_DRIFT/)
})

test('one configuration object can change but its types cannot', () => {
  const target = project()
  runTransfer(options(target, 'apply'))
  const config = join(target, 'src/layout/AppLayoutConfig.tsx')
  const original = readFileSync(config, 'utf8')
  const changed = original.replace("appName: 'Nova aplikacija'", "appName: 'Synthetic Documents'")
  assert.notEqual(changed, original)
  writeFileSync(config, changed)
  assert.equal(runTransfer(options(target, 'verify')).files, payloadCount)
  writeFileSync(config, changed.replace('homePath: string', 'homePath: number'))
  assert.throws(() => runTransfer(options(target, 'verify')), /CONFIGURATION_DRIFT/)
})

test('configuration allows JSX slots but rejects inline functions and side effects', () => {
  const target = project()
  runTransfer(options(target, 'apply'))
  const config = join(target, 'src/layout/AppLayoutConfig.tsx')
  writeFileSync(config, readFileSync(config, 'utf8').replace("appName: 'Nova aplikacija'", "appName: (() => 'Unexpected')()"))
  assert.throws(() => runTransfer(options(target, 'verify')), /data\/references/)
})

function metadataDependencies(target, overrides = {}) {
  for (const [name, version] of Object.entries(manifest.dependencies)) {
    const folder = join(target, 'node_modules', name)
    mkdirSync(folder, { recursive: true })
    // Metadata fixtures test version policy only; never build/render a substitute library.
    writeFileSync(join(folder, 'package.json'), JSON.stringify({ version: overrides[name] ?? version }))
  }
}

test('missing or older dependency blocks planning, without changing packages', () => {
  const target = project({ dependencies: false })
  const pkg = readFileSync(join(target, 'package.json'), 'utf8')
  assert.throws(() => runTransfer(options(target, 'plan')), /DEPENDENCY_MISSING/)
  metadataDependencies(target, { react: '0.0.0' })
  assert.throws(() => runTransfer(options(target, 'plan')), /DEPENDENCY_TOO_OLD/)
  assert.equal(readFileSync(join(target, 'package.json'), 'utf8'), pkg)
  assert.equal(existsSync(join(target, 'src')), false)
})

test('newer packages, including a newer Core major, are kept and reported, not pinned or blocked', () => {
  const target = project({ dependencies: false })
  metadataDependencies(target, { '@coming.ui.core/themed-components': '1.0.0', react: '20.0.0' })
  const pkg = readFileSync(join(target, 'package.json'), 'utf8')
  const corePath = join(target, 'node_modules/@coming.ui.core/themed-components/package.json')
  const core = readFileSync(corePath, 'utf8')
  const plan = runTransfer(options(target, 'plan'))
  assert.equal(plan.dependencies.find((item) => item.name === '@coming.ui.core/themed-components').status, 'NEWER_INSTALLED_KEEP_AND_TEST')
  assert.equal(plan.dependencies.find((item) => item.name === 'react').installed, '20.0.0')
  assert.equal(runTransfer(options(target, 'apply')).copied, payloadCount)
  assert.equal(readFileSync(join(target, 'package.json'), 'utf8'), pkg)
  assert.equal(readFileSync(corePath, 'utf8'), core)
})

test('version ordering is numeric and handles prereleases and build metadata', () => {
  const target = project({ dependencies: false })
  for (const [version, accepted] of [['0.1.100', true], ['0.1.9', false], ['0.1.10-rc.1', false], ['0.1.11-rc.1', true], ['0.1.10+build.1', true]]) {
    metadataDependencies(target, { '@coming.ui.core/themed-components': version })
    if (accepted) assert.equal(runTransfer(options(target, 'plan')).status, 'PLAN_ONLY_NO_WRITES')
    else assert.throws(() => runTransfer(options(target, 'plan')), /DEPENDENCY_TOO_OLD/)
  }
})

test('transferred production paths typecheck and build with real installed dependencies', () => {
  const target = project()
  runTransfer(options(target, 'apply'))
  const config = join(target, 'src/layout/AppLayoutConfig.tsx')
  const featureFolder = join(target, 'src/features/documents')
  mkdirSync(featureFolder, { recursive: true })
  writeFileSync(join(featureFolder, 'DocumentsPage.tsx'), "import { CorePageSection } from '@coming.ui.core/themed-components'\nexport default function DocumentsPage() { return <CorePageSection>Real document page</CorePageSection> }\n")
  const customConfig = customAppLayoutConfig(readFileSync(config, 'utf8'))
    .replace("{ path: '/documents', title: 'Dokumenti',", "{ path: '/documents', title: 'Dokumenti', element: <DocumentsPage />,")
    .replace('actions: null, profileMenu: null', 'actions: <span>Configured action</span>, profileMenu: <span>Configured profile</span>')
  writeFileSync(config, "import DocumentsPage from '../features/documents/DocumentsPage'\n" + customConfig)
  assert.equal(runTransfer(options(target, 'verify')).files, payloadCount)
  const html = renderRoutes(runtimeLoader(), target, '/documents')
  assert.match(html, /Synthetic Documents/)
  assert.match(html, /Real document page/)
  assert.match(html, /Configured action/)
  assert.match(html, /Configured profile/)
  assert.doesNotMatch(html, /tc-core-page-header/)
  assert.doesNotMatch(html, /Nova aplikacija|Mina Jovanović/)
  writeFileSync(join(target, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext',
      moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, skipLibCheck: true,
      allowImportingTsExtensions: true, noEmit: true, types: ['vite/client'],
    }, include: ['src'],
  }))
  writeFileSync(join(target, 'index.html'), '<html><head><title>Transfer test</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>')
  const typecheck = spawnSync(process.execPath, [join(catalogRoot, 'node_modules/typescript/bin/tsc'), '--project', join(target, 'tsconfig.json')], { cwd: target, encoding: 'utf8' })
  assert.equal(typecheck.status, 0, typecheck.stdout + typecheck.stderr)
  const lint = spawnSync(process.execPath, [join(catalogRoot, 'node_modules/oxlint/bin/oxlint'), 'src'], { cwd: target, encoding: 'utf8' })
  assert.equal(lint.status, 0, lint.stdout + lint.stderr)
  const build = spawnSync(process.execPath, [join(catalogRoot, 'node_modules/vite/bin/vite.js'), 'build', target, '--config', join(catalogRoot, 'vite.config.ts')], { cwd: target, encoding: 'utf8' })
  assert.equal(build.status, 0, build.stdout + build.stderr)
  assert.equal(existsSync(join(target, 'dist/index.html')), true)
  assert.equal(existsSync(join(target, 'src/patterns')), false)
  assert.equal(runTransfer(options(target, 'verify')).files, payloadCount)
  // A later supported change uses the same config without reapplying the demo payload.
  writeFileSync(config, readFileSync(config, 'utf8').replace("appName: 'Synthetic Documents'", "appName: 'Synthetic Registry'"))
  assert.equal(runTransfer(options(target, 'verify')).files, payloadCount)
  const updated = spawnSync(process.execPath, [join(catalogRoot, 'node_modules/typescript/bin/tsc'), '--project', join(target, 'tsconfig.json')], { cwd: target, encoding: 'utf8' })
  assert.equal(updated.status, 0, updated.stdout + updated.stderr)
  const updatedHtml = renderRoutes(runtimeLoader(), target, '/documents')
  assert.match(updatedHtml, /Synthetic Registry/)
  assert.doesNotMatch(updatedHtml, /Synthetic Documents/)
  writeFileSync(config, readFileSync(config, 'utf8').replace("appName: 'Synthetic Registry',", "appName: 'Synthetic Registry', primaryColor: 'red',"))
  const unsupported = spawnSync(process.execPath, [join(catalogRoot, 'node_modules/typescript/bin/tsc'), '--project', join(target, 'tsconfig.json')], { cwd: target, encoding: 'utf8' })
  assert.notEqual(unsupported.status, 0)
  assert.match(unsupported.stdout + unsupported.stderr, /primaryColor/)
})

test('pages array controls grouping, hidden links, parked routes and real content without creating page files', () => {
  const load = runtimeLoader()
  const require = createRequire(join(catalogRoot, 'package.json'))
  const { createElement } = require('react')
  const config = load(join(catalogRoot, 'src/patterns/AppShellSource/config/AppLayoutConfig.tsx')).appLayoutConfig
  const { buildNavigationItems } = load(join(catalogRoot, 'src/patterns/AppShellSource/app/layout/navigation.ts'))
  assert.equal(config.pages.length, 6)
  const items = buildNavigationItems()
  assert.equal(items.find((item) => item.id === 'group:Evidencije').children.length, 2)
  assert.equal(items.some((item) => item.path === '/profile'), false)
  assert.match(renderRoutes(load, catalogRoot, '/profile'), /tc-core-page-header[^>]*>Moj profil/)
  config.pages.push({ path: '/future', title: 'Future page', createPage: false })
  assert.equal(buildNavigationItems().some((item) => item.path === '/future'), false)
  assert.match(renderRoutes(load, catalogRoot, '/future'), /Stranica nije pronađena/)
  config.pages.at(-1).element = createElement('main', null, 'Actual future page')
  assert.equal(buildNavigationItems().some((item) => item.path === '/future'), true)
  const html = renderRoutes(load, catalogRoot, '/future')
  assert.match(html, /Actual future page/)
  assert.doesNotMatch(html, /tc-core-page-header/)
})

test('config integration imports are local components, not side-effect/package imports or changed source imports', () => {
  const target = project()
  runTransfer(options(target, 'apply'))
  const path = join(target, 'src/layout/AppLayoutConfig.tsx')
  const original = readFileSync(path, 'utf8')
  for (const extra of ["import './effects'\n", "import Something from 'new-package'\n"]) {
    writeFileSync(path, extra + original)
    assert.throws(() => runTransfer(options(target, 'verify')), /CONFIGURATION_DRIFT/)
  }
  writeFileSync(path, original.replace("import type { ReactNode } from 'react'", "import type { ReactNode } from 'other-react'"))
  assert.throws(() => runTransfer(options(target, 'verify')), /preserve source imports/)
})

test('documented cars/settings/work-orders scaffolds render their own Core headings and remain editable project files', () => {
  const target = project()
  runTransfer(options(target, 'apply'))
  assert.equal(existsSync(join(target, 'src/features/workspace')), false)
  const pages = [
    { folder: 'cars', component: 'PreviewCars', title: 'Pregled svih vozila' },
    { folder: 'settings', component: 'PreviewSettings', title: 'Podešavanja' },
    { folder: 'work-orders', component: 'PreviewWorkOrders', title: 'Radni nalozi' },
  ]
  const template = readFileSync(join(target, 'src/layout/EmptyPage.tsx'), 'utf8')
  // Exercise the documented agent edits using the real Core JSX template, not a new generator.
  for (const page of pages) {
    const folder = join(target, 'src/features', page.folder)
    mkdirSync(folder, { recursive: true })
    const content = template
      .replace('export function EmptyPage({ title }: { title: string })', `export default function ${page.component}()`)
      .replace("'./EmptyPage.module.css'", "'../../layout/EmptyPage.module.css'")
      .replace('{title}', `{${JSON.stringify(page.title)}}`)
    writeFileSync(join(folder, page.component + '.tsx'), content)
  }
  const configPath = join(target, 'src/layout/AppLayoutConfig.tsx')
  const imports = pages.map((page) => `import ${page.component} from '../features/${page.folder}/${page.component}'`).join('\n')
  const entries = pages.map((page) => `{ path: '/${page.folder}', title: ${JSON.stringify(page.title)}, element: <${page.component} /> }`).join(',\n')
  const config = readFileSync(configPath, 'utf8')
    .replace("homePath: '/dashboard'", "homePath: '/cars'")
    .replace(/pages: \[[\s\S]*?\n  \],/, `pages: [${entries}],`)
  writeFileSync(configPath, imports + '\n' + config)
  assert.equal(runTransfer(options(target, 'verify')).files, payloadCount)
  for (const page of pages) {
    const html = renderRoutes(runtimeLoader(), target, '/' + page.folder)
    assert.ok(html.includes('>' + page.title + '</h4>'), page.folder)
    assert.equal([...html.matchAll(/<h[1-6][^>]+class="tc-core-page-header\b/g)].length, 1)
    assert.deepEqual(readdirSync(join(target, 'src/features', page.folder)), [page.component + '.tsx'])
  }
  // Source verification must not lock a generated business page against later development.
  const carsFile = join(target, 'src/features/cars/PreviewCars.tsx')
  writeFileSync(carsFile, readFileSync(carsFile, 'utf8').replace('<div aria-hidden="true" className={styles.emptyBody} />', '<p>Cars page implementation</p>'))
  assert.equal(runTransfer(options(target, 'verify')).files, payloadCount)
  assert.match(renderRoutes(runtimeLoader(), target, '/cars'), /Cars page implementation/)
  writeFileSync(join(target, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    target: 'ES2022', lib: ['ES2022', 'DOM'], module: 'ESNext', moduleResolution: 'bundler',
    jsx: 'react-jsx', strict: true, skipLibCheck: true, noEmit: true,
    allowImportingTsExtensions: true, types: ['vite/client'],
  }, include: ['src'] }))
  for (const args of [
    [join(catalogRoot, 'node_modules/typescript/bin/tsc'), '--project', join(target, 'tsconfig.json')],
    [join(catalogRoot, 'node_modules/oxlint/bin/oxlint'), 'src'],
  ]) {
    const result = spawnSync(process.execPath, args, { cwd: target, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stdout + result.stderr)
  }
})

test('active navigation selects the deepest visible segment boundary, not a lookalike prefix', () => {
  const { activeNavigationPath } = runtimeLoader()(join(catalogRoot, 'src/patterns/AppShellSource/app/layout/navigation.ts'))
  const items = [
    { id: 'home', label: 'Home', path: '/' },
    { id: 'group', label: 'Group', children: [
      { id: 'documents', label: 'Documents', path: '/documents/' },
      { id: 'archive', label: 'Archive', path: '/documents/archive' },
    ] },
    { id: 'hidden', label: 'Hidden', hidden: true, children: [{ id: 'secret', label: 'Secret', path: '/documents/archive/secret' }] },
  ]
  assert.equal(activeNavigationPath(items, '/documents/42/edit'), '/documents')
  assert.equal(activeNavigationPath(items, '/documents/archive/42?tab=files#details'), '/documents/archive')
  assert.equal(activeNavigationPath([...items].reverse(), '/documents/archive/42'), '/documents/archive')
  assert.equal(activeNavigationPath(items, '/documents/archive/secret/42'), '/documents/archive')
  assert.equal(activeNavigationPath(items, '/documents-old/42'), '/documents-old/42')
  assert.equal(activeNavigationPath(items, '/'), '/')
})

test('navigation reset key changes on pathname, query, hash and same-URL history navigation', () => {
  const { navigationContextKey } = runtimeLoader()(join(catalogRoot, 'src/patterns/AppShellSource/app/layout/navigation.ts'))
  const location = { key: 'one', pathname: '/documents', search: '', hash: '' }
  for (const change of [{ pathname: '/account' }, { search: '?page=2' }, { hash: '#files' }, { key: 'two' }]) {
    assert.notEqual(navigationContextKey(location), navigationContextKey({ ...location, ...change }))
  }
  assert.equal(navigationContextKey(location), navigationContextKey({ ...location }))
})

test('real Core SSR renders a neutral shell, configured/overridden slots and 404 without a fake profile', () => {
  const load = runtimeLoader()
  const require = createRequire(join(catalogRoot, 'package.json'))
  const { createElement } = require('react')
  const baseline = renderRoutes(load, catalogRoot, '/overview')
  assert.match(baseline, /Nova aplikacija/)
  assert.match(baseline, /Pregled/)
  assert.doesNotMatch(baseline, /Mina|Odjavi se|example\.test|profile-dropdown/)
  const custom = renderRoutes(load, catalogRoot, '/overview', {
    topbarTitle: createElement('span', null, 'Custom workspace'),
    topbarActions: createElement('button', { type: 'button' }, 'Host action'),
    profileMenu: createElement('span', null, 'Host profile'),
  })
  assert.match(custom, /Custom workspace/)
  assert.match(custom, /Host action/)
  assert.match(custom, /Host profile/)
  const config = load(join(catalogRoot, 'src/patterns/AppShellSource/config/AppLayoutConfig.tsx'))
  config.appLayoutConfig.topbar.description = 'Configured description'
  config.appLayoutConfig.topbar.actions = createElement('span', null, 'Configured actions')
  config.appLayoutConfig.topbar.profileMenu = createElement('span', null, 'Configured profile')
  const configured = renderRoutes(load, catalogRoot, '/overview')
  assert.match(configured, /Configured description/)
  assert.match(configured, /Configured actions/)
  assert.match(configured, /Configured profile/)
  const removedSlots = renderRoutes(load, catalogRoot, '/overview', { topbarTitle: null, topbarActions: null, profileMenu: null })
  assert.doesNotMatch(removedSlots, /Configured description|Configured actions|Configured profile/)
  config.appLayoutConfig.topbar.showTitle = false
  assert.doesNotMatch(renderRoutes(load, catalogRoot, '/overview'), /Configured description|class="productName"/)
  assert.match(renderRoutes(load, catalogRoot, '/not-a-route'), /Stranica nije pronađena/)
})

test('target must be separate; unknown source/path traversal/force flags are rejected', () => {
  assert.throws(() => runTransfer(options(catalogRoot, 'plan')), /separate project/)
  assert.throws(() => loadSource('../AppShellSource'), /named Source/)
  assert.throws(() => loadSource('NotPublishedSource'), /ENOENT/)
  const target = project()
  assert.throws(() => runTransfer(options(target, 'apply', { replaceFiles: ['../secret.txt'] })), /not in payload/)
  const cli = spawnSync(process.execPath, [resolve(catalogRoot, '.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs'), 'apply', '--source', 'AppShellSource', '--target', target, '--force', 'yes'], { encoding: 'utf8' })
  assert.equal(cli.status, 1)
  assert.equal(existsSync(join(target, 'src')), false)
})

test('payload symlink and malformed managed instructions are rejected before writes', () => {
  const target = project(), destination = project()
  symlinkSync(destination, join(target, 'src'), process.platform === 'win32' ? 'junction' : 'dir')
  assert.throws(() => runTransfer(options(target, 'apply')), /symlink rejected/)
  assert.equal(existsSync(join(destination, 'App.tsx')), false)
  const target2 = project()
  writeFileSync(join(target2, 'AGENTS.md'), '# User rules\n<!-- coming-source:AppShellSource:start -->\n')
  assert.throws(() => runTransfer(options(target2, 'apply')), /Malformed existing/)
  assert.equal(existsSync(join(target2, 'src')), false)
})

test('planned catalog entries cannot be loaded, copied or mistaken for implemented sources', () => {
  const entries = readdirSync(join(catalogRoot, 'src/patterns'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(catalogRoot, 'src/patterns', entry.name, '.planned')))
  for (const entry of entries) {
    const folder = join(catalogRoot, 'src/patterns', entry.name)
    const marker = JSON.parse(readFileSync(join(folder, '.planned'), 'utf8'))
    assert.ok(['PLANNED', 'IMPLEMENTED_PENDING_VISUAL'].includes(marker.status))
    assert.equal(marker.implemented, marker.status === 'IMPLEMENTED_PENDING_VISUAL')
    if (marker.implemented) {
      assert.ok(marker.pending)
      assert.ok(existsSync(join(folder, 'source.manifest.json')))
    }
    assert.ok(marker.scope.length > 0)
    assert.throws(() => loadSource(entry.name), /SOURCE_PLANNED_NOT_IMPLEMENTED/)
    const target = project({ dependencies: false })
    assert.throws(() => runTransfer({ source: entry.name, target, mode: 'apply' }), /SOURCE_PLANNED_NOT_IMPLEMENTED/)
    assert.equal(existsSync(join(target, 'src')), false)
  }
})

test('documentation has one global generation owner, no dangling local links or duplicate plans', () => {
  const skillFile = join(catalogRoot, '.agents/skills/marko-knowledge-agent/SKILL.md')
  const patternFile = join(catalogRoot, 'src/patterns/AppShellSource/AppLayoutPattern.md')
  for (const file of [skillFile, patternFile, join(catalogRoot, 'README.md'), join(catalogRoot, 'AGENTS.md')]) {
    const text = readFileSync(file, 'utf8')
    assert.doesNotMatch(text, /NEW-RULES|PROJECT_PLAN\.md|AppNiche|appConfig\.tsx/)
    if (file !== join(catalogRoot, 'AGENTS.md')) assert.doesNotMatch(text, /C:\/Users\/|C:\\Users\\/)
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (!/^[a-z]+:/.test(match[1])) assert.ok(existsSync(resolve(dirname(file), match[1])), `${file}: ${match[1]}`)
    }
  }
  assert.equal(existsSync(join(catalogRoot, 'docs/PROJECT_PLAN.md')), false)
  assert.equal(existsSync(join(catalogRoot, 'AppNiche.md')), false)
  assert.equal(existsSync(join(catalogRoot, 'src/patterns/AppShellSource/config/appConfig.tsx')), false)
  assert.ok(existsSync(join(catalogRoot, 'src/patterns/AppShellSource/config/AppLayoutConfig.tsx')))
})
