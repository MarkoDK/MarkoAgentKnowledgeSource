import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, realpathSync, symlinkSync, rmSync } from 'node:fs'
import { dirname, basename, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { catalogRoot, loadSource } from './source-transfer.mjs'

const require = createRequire(join(catalogRoot, 'package.json'))
const ts = require('typescript'), realReact = require('react')
const base = join(catalogRoot, 'src/patterns/RolesAndPrivilegesSource')
const manifest = JSON.parse(readFileSync(join(base, 'source.manifest.json'), 'utf8'))
const catalog = [
  { id: 1, label: 'Pregled', code: 'view', group: 'Zapisi', requires: [] },
  { id: 2, label: 'Izmena', code: 'edit', group: 'Zapisi', requires: [1] },
  { id: 3, label: 'Brisanje', code: 'delete', group: 'Zapisi', requires: [2] },
  { id: 4, label: 'Preuzmi PDF', code: 'export', group: 'Izveštaji', requires: [] },
]
const role = { id: 'manager', label: 'Rukovodilac', userCount: 2, defaultCount: 1, extraCount: 1 }
function runtime(react = realReact, mockCore = false, transform = text => text) {
  const modules = new Map()
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports
    const module = { exports: {} }; modules.set(file, module)
    const input = file.endsWith('RolesAndPrivilegesPage.tsx') ? transform(readFileSync(file, 'utf8')) : readFileSync(file, 'utf8')
    const code = ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    const local = name => {
      if (name === 'react') return react
      if (mockCore && name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'Fragment' }
      if (mockCore && name === '@coming.ui.core/themed-components') return new Proxy({}, { get: (_, key) => String(key) })
      if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }
      if (name.startsWith('.')) { const path = resolve(dirname(file), name); return load([path, path + '.tsx', path + '.ts'].find(existsSync)) }
      return require(name)
    }
    new Function('require', 'module', 'exports', code)(local, module, module.exports)
    return module.exports
  }
  return load
}
const model = runtime()(join(base, 'app/rolePermissions.ts'))
const dto = (extraPermissions = [4], defaultPermissions = [1]) => ({ roleId: role.id, defaultPermissions, extraPermissions })
const walk = (node, out = []) => {
  if (Array.isArray(node)) node.forEach(child => walk(child, out))
  else if (node?.props) { out.push(node); for (const key of ['children', 'label', 'header', 'results', 'panel', 'fields', 'search', 'actions']) walk(node.props[key], out) }
  return out
}
function harness() {
  let hooks = [], cursor = 0, effects = [], tree, props, component
  const react = {
    useState(initial) {
      const index = cursor++
      if (!hooks[index]) hooks[index] = { value: typeof initial === 'function' ? initial() : initial }
      return [hooks[index].value, next => { if(hooks[index]) hooks[index].value = typeof next === 'function' ? next(hooks[index].value) : next }]
    },
    useRef(value) { return react.useState(() => ({ current: value }))[0] },
    useId() { return react.useState('filters-test')[0] },
    useEffect(fn, deps) {
      const index = cursor++, old = hooks[index]
      if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
        hooks[index] = { ...old, deps }
        effects.push(() => { old?.cleanup?.(); hooks[index].cleanup = fn() })
      }
    },
  }
  react.useLayoutEffect = react.useEffect
  const load = runtime(react, true)
  const draw = () => { cursor = 0; effects = []; tree = component(props); effects.forEach(fn => fn()); return tree }
  return {
    get tree() { return tree }, load,
    mount(nextProps, page = false) {
      props = nextProps
      component = load(join(base, 'app/' + (page ? 'RolesAndPrivilegesPage.tsx' : 'RolePermissionsDialog.tsx')))[page ? 'RolesAndPrivilegesPage' : 'RolePermissionsDialog']
      draw()
    },
    update(next) { props = { ...props, ...next }; draw() },
    draw,
    unmount() { hooks.forEach(value => value?.cleanup?.()); hooks = [] },
    nodes(type) { return walk(tree).filter(node => node.type === type) },
    button(text) { return this.nodes('CoreButton').find(node => node.props.children === text)?.props },
    checkbox(id) { return this.nodes('CoreCheckbox').find(node => walk(node.props.label).some(child => child.type === 'small' && child.props.children === id))?.props },
  }
}
const settle = async h => { for (let i = 0; i < 20; i++) await Promise.resolve(); h.draw() }
const oldWindow = globalThis.window
globalThis.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) }
after(() => { globalThis.window = oldWindow })
async function editor(options = {}) {
  const h = harness(), writes = [], events = []
  let server = dto(), closeCount = 0
  const props = {
    role, privileges: catalog, readOnly: false,
    loadPermissions: async () => structuredClone(server),
    savePermissions: async (id, extraPermissions, signal) => { signal.throwIfAborted(); writes.push({ id, extraPermissions }); server = { ...server, extraPermissions }; return structuredClone(server) },
    onClose: () => { closeCount++ }, onSaved: value => events.push(value),
    ...options,
  }
  h.mount(props); await settle(h)
  return { h, writes, events, props, get closed() { return closeCount }, setServer: value => { server = value } }
}

test('payload hashes, layout boundary and supplied screenshot references', () => {
  assert.equal(manifest.files.length, 5)
  for (const file of manifest.files) {
    const text = readFileSync(join(catalogRoot, file.from), 'utf8')
    assert.equal(createHash('sha256').update(text).digest('hex'), file.sha256)
    assert.ok(file.to.startsWith('src/features/role-settings/'))
    assert.doesNotMatch(text, /from ['"][^'"]*(MockData|MD.UI)|fetch\(|axios|@tanstack/)
  }
  assert.ok(existsSync(join(base, 'screenshots/reference-roles-desktop.png')))
  assert.ok(existsSync(join(base, 'screenshots/reference-editor-desktop.png')))
})
test('transitive prerequisites, cycles, string IDs and unknown dependencies', () => {
  assert.deepEqual(model.withPrerequisites([3], catalog), [3, 2, 1])
  assert.deepEqual(model.requiredBy([1, 2, 3], 1, catalog), [2, 3])
  assert.deepEqual(model.withPrerequisites(['edit'], [{ id: 'edit', requires: ['view'] }, { id: 'view', requires: ['edit'] }]), ['edit', 'view'])
  assert.throws(() => model.withPrerequisites([100], catalog))
  assert.equal(model.normalize('Podešavanje'), model.normalize('Podesavanje'))
})
test('invalid responses cannot become grants', () => {
  for (const value of [null, { ...dto(), roleId: 'other' }, dto([99]), dto([4, 4]), dto([1]), { ...dto(), extraPermissions: null }])
    assert.throws(() => model.readRolePermissions(value, role.id, catalog))
  assert.throws(() => model.readRolePermissions(dto([], [3]), role.id, catalog))
  assert.throws(() => model.readRolePermissions(dto(), role.id, [...catalog, catalog[0]]))
  assert.throws(() => model.readRolePermissions(dto(), role.id, [{ ...catalog[0], requires: [99] }]))
  const copy = model.readRolePermissions(dto(), role.id, catalog)
  copy.extraPermissions.push(2)
  assert.deepEqual(dto().extraPermissions, [4])
})
test('real installed Core renders the page and default readonly/edit icons', () => {
  const Page = runtime()(join(base, 'app/RolesAndPrivilegesPage.tsx')).RolesAndPrivilegesPage
  const roles = [{ ...role, id: 'admin', label: 'Administrator' }, role]
  const html = require('react-dom/server').renderToStaticMarkup(realReact.createElement(Page, { roles, privileges: catalog, canManage: true }))
  assert.match(html, /Pregledaj privilegije: Administrator/)
  assert.match(html, /Izmeni privilegije: Rukovodilac/)
  assert.match(html, /Napredna pretraga/)
})
test('custom readonly IDs, actor access, filters and pagination preserve exact IDs', () => {
  for (const id of ['manager', 7]) {
    const h = harness()
    const load = runtime({
      useState: value => [typeof value === 'function' ? value() : value, () => {}],
      useId: () => 'test', useEffect() {},
    }, true, text => text.replace("['admin'] as RoleId[]", JSON.stringify([id]) + ' as RoleId[]'))
    const Page = load(join(base, 'app/RolesAndPrivilegesPage.tsx')).RolesAndPrivilegesPage
    const tree = Page({ roles: [{ ...role, id }], canManage: true })
    const table = walk(tree).find(node => node.type === 'CoreTable').props
    const cell = table.columns.at(-1).cell({ row: { original: { ...role, id } } })
    assert.match(walk(cell).find(node => node.type === 'CoreIconButton').props.label, /Pregledaj/)
    h.unmount()
  }
  const h = harness(), roles = Array.from({ length: 20 }, (_, i) => ({ ...role, id: i, label: 'Rola ' + i }))
  h.mount({ roles, canManage: false }, true)
  let table = h.nodes('CoreTable')[0].props
  assert.equal(table.dataList.length, 15); assert.equal(table.server.totalCount, 20)
  assert.match(walk(table.columns.at(-1).cell({ row: { original: roles[0] } })).find(node => node.type === 'CoreIconButton').props.label, /Pregledaj/)
  table.server.onStateChange({ pageNumber: 2, pageSize: 15, sorting: [], filters: {} }); h.draw()
  assert.equal(h.nodes('CoreTable')[0].props.dataList.length, 5)
  h.nodes('CoreSelectList')[0].props.onChange(7); h.draw()
  assert.equal(h.nodes('CoreTable')[0].props.server.totalCount, 20)
  h.nodes('CoreAdvancedSearchPanel')[0].props.onApply(); h.draw()
  assert.equal(h.nodes('CoreTable')[0].props.dataList[0].id, 7)
  h.nodes('CoreFilterChip')[0].props.onRemove(); h.draw()
  h.nodes('CoreSearchableInput')[0].props.onSearch('Rola 19'); h.draw()
  assert.equal(h.nodes('CoreTable')[0].props.dataList.length, 1)
  h.update({ canView: false }); assert.equal(h.tree.type, 'CoreForbiddenPage')
  h.unmount()
})
test('editor locks defaults and dependencies; filtered-out extras remain in whole payload', async () => {
  const x = await editor(), { h } = x
  assert.ok(h.checkbox(1).checked && h.checkbox(1).disabled)
  h.checkbox(1).onChange(false); h.draw(); assert.ok(h.checkbox(1).checked)
  h.checkbox(3).onChange(true); h.draw()
  assert.ok(h.checkbox(2).checked && h.checkbox(2).disabled)
  h.nodes('CoreSearchableInput')[0].props.onValueChange('Brisanje'); h.draw()
  assert.equal(h.checkbox(4), undefined)
  h.button('Sačuvaj privilegije').onClick(); await settle(h)
  assert.deepEqual(x.writes, [{ id: role.id, extraPermissions: [4, 3, 2] }])
  assert.equal(x.closed, 1); assert.equal(x.events.length, 1)
  h.unmount()
})
test('readonly and missing save handler never mutate', async () => {
  const x = await editor({ readOnly: true }), { h } = x
  assert.ok(h.nodes('CoreCheckbox').every(node => node.props.disabled))
  assert.equal(h.button('Sačuvaj privilegije'), undefined)
  assert.equal(h.button('Vrati podrazumevane privilegije'), undefined)
  h.checkbox(3).onChange(true); h.draw(); assert.equal(h.checkbox(3).checked, false)
  assert.equal(x.writes.length, 0); h.unmount()
  const y = await editor({ savePermissions: undefined })
  y.h.checkbox(3).onChange(true); y.h.draw()
  assert.ok(y.h.button('Sačuvaj privilegije').disabled)
  assert.match(y.h.button('Sačuvaj privilegije').title, /nije povezano/)
  y.h.unmount()
})
test('reset confirms and removes extras only; dirty close confirms discard', async () => {
  const x = await editor(), { h } = x
  h.button('Vrati podrazumevane privilegije').onClick(); h.draw()
  assert.ok(h.nodes('CoreConfirmDialog')[0].props.isOpen)
  h.nodes('CoreConfirmDialog')[0].props.onConfirm(); await settle(h)
  assert.deepEqual(x.writes[0].extraPermissions, [])
  assert.ok(h.checkbox(1).checked); assert.equal(x.closed, 0)
  h.checkbox(3).onChange(true); h.draw()
  h.button('Odustani').onClick(); h.draw()
  assert.match(h.nodes('CoreConfirmDialog')[0].props.title, /Nesnimljene/)
  h.nodes('CoreConfirmDialog')[0].props.onClose(); h.draw()
  assert.ok(h.checkbox(3).checked); assert.equal(x.closed, 0)
  h.button('Odustani').onClick(); h.draw(); h.nodes('CoreConfirmDialog')[0].props.onConfirm()
  assert.equal(x.closed, 1); h.unmount()
})
test('concurrent change blocks PUT and requires explicit reload before save', async () => {
  const x = await editor(), { h } = x
  h.checkbox(3).onChange(true); h.draw(); x.setServer(dto([]))
  h.button('Sačuvaj privilegije').onClick(); await settle(h)
  assert.equal(x.writes.length, 0); assert.ok(h.button('Sačuvaj privilegije').disabled)
  h.button('Učitaj aktuelna prava').onClick(); h.draw(); h.nodes('CoreConfirmDialog')[0].props.onConfirm()
  await settle(h); assert.equal(h.checkbox(4).checked, false); assert.equal(h.checkbox(3).checked, false)
  h.unmount()
})
test('failed save preserves draft; successful save with failed host refresh is reported accurately', async () => {
  const x = await editor({ savePermissions: async () => { throw Error('Save failed') } }), { h } = x
  h.checkbox(3).onChange(true); h.draw(); h.button('Sačuvaj privilegije').onClick(); await settle(h)
  assert.ok(h.checkbox(3).checked); assert.equal(x.closed, 0)
  assert.ok(h.nodes('CoreNotice').some(node => node.props.role === 'alert'))
  h.unmount()
  const y = await editor({ onSaved() { throw Error('refresh failed') } })
  y.h.checkbox(3).onChange(true); y.h.draw(); y.h.button('Sačuvaj privilegije').onClick(); await settle(y.h)
  assert.equal(y.writes.length, 1)
  assert.ok(y.h.nodes('CoreNotice').some(node => String(node.props.children).includes('sačuvane')))
  y.h.unmount()
})
test('double click, unmount and revoked management during fresh read prevent extra writes', async () => {
  for (const mode of ['unmount', 'readonly', 'double']) {
    let resolveRead, reads = 0
    const loadPermissions = () => ++reads === 1 ? Promise.resolve(dto()) : new Promise(resolve => { resolveRead = resolve })
    const x = await editor({ loadPermissions }), { h } = x
    h.checkbox(3).onChange(true); h.draw()
    const save = h.button('Sačuvaj privilegije')
    save.onClick(); save.onClick()
    if (mode === 'unmount') h.unmount()
    if (mode === 'readonly') h.update({ readOnly: true })
    resolveRead(dto())
    for (let i = 0; i < 20; i++) await Promise.resolve()
    assert.equal(x.writes.length, mode === 'double' ? 1 : 0)
    if (mode !== 'unmount') h.unmount()
  }
})
test('missing loader and load failure show real errors instead of unchecked grants', async () => {
  for (const loadPermissions of [undefined, async () => { throw Error('Load failed') }]) {
    const x = await editor({ loadPermissions })
    assert.equal(x.h.nodes('CoreCheckbox').length, 0)
    assert.ok(x.h.nodes('CoreNotice').some(node => node.props.role === 'alert'))
    assert.ok(x.h.button('Sačuvaj privilegije').disabled)
    x.h.unmount()
  }
})
test('clean independent host compiles default and custom readonly configuration without reference projects', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'coming-roles-check-')))
  const write = (file, text) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text) }
  assert.equal(dirname(root), realpathSync(tmpdir()))
  assert.match(basename(root), /^coming-roles-check-/)
  try {
    symlinkSync(join(catalogRoot, 'node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
    write('package.json', '{"private":true,"type":"module"}')
    write('index.html', '<html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>')
    write('src/main.tsx', "import {createRoot} from 'react-dom/client'\nimport '@coming.ui.core/themed-components/style.css'\nimport {RolesAndPrivilegesPage} from './features/role-settings/RolesAndPrivilegesPage'\ncreateRoot(document.getElementById('root')!).render(<RolesAndPrivilegesPage />)")
    write('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2023', lib: ['ES2023', 'DOM'], module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true, types: ['vite/client'] }, include: ['src'] }))
    for (const custom of [false, true]) {
      for (const file of manifest.files) write(file.to, readFileSync(join(catalogRoot, file.from), 'utf8').replace("['admin'] as RoleId[]", custom ? "['manager', 7] as RoleId[]" : "['admin'] as RoleId[]"))
      for (const args of [
        [join(catalogRoot, 'node_modules/oxlint/bin/oxlint'), 'src', '--deny-warnings'],
        [join(catalogRoot, 'node_modules/typescript/bin/tsc'), '-p', join(root, 'tsconfig.json')],
        [join(catalogRoot, 'node_modules/vite/bin/vite.js'), 'build', root, '--config', join(catalogRoot, 'vite.config.ts')],
      ]) {
        const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' })
        assert.equal(result.status, 0, result.stdout + result.stderr)
      }
    }
  } finally {
    rmSync(join(root, 'node_modules'))
    rmSync(root, { recursive: true })
  }
})
test('generator keeps the genuine runtime screenshot gate', () => {
  assert.throws(() => loadSource('RolesAndPrivilegesSource'), /SOURCE_PLANNED_NOT_IMPLEMENTED/)
})
test('final real transfer after screenshot approval', { skip: 'Runtime desktop/mobile references and approval pending' }, () => {})
