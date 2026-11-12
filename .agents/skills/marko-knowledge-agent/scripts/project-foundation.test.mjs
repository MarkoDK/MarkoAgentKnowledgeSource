import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { catalogRoot, loadSource, runTransfer } from './source-transfer.mjs'

const source = 'ProjectFoundationSource'
const manifest = loadSource(source)
const temporary = []
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const run = (target, mode, extra = {}) => runTransfer({ target, mode, source, ...extra })

function write(root, name, data) {
  const file = join(root, name)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, data)
}
function project({ version, dependencies = true } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'coming-foundation-contract-')))
  temporary.push(root)
  write(root, 'package.json', JSON.stringify({ private: true, type: 'module', scripts: { lint: 'oxlint', build: 'tsc --noEmit && vite build' } }))
  if (dependencies) symlinkSync(join(catalogRoot, 'node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
  if (version) {
    // Deliberately varied starter content: cleanup must not depend on an exact Vite release.
    write(root, 'src/App.tsx', "import './App.css'\nexport default function App(){ return <h1>Starter " + version + "</h1> }\n")
    write(root, 'src/main.tsx', '// Initial Vite entry ' + version)
    write(root, 'src/index.css', 'body { color: purple }')
    write(root, 'src/App.css', '.demo { padding: 42px }')
    write(root, 'src/assets/react.svg', '<svg>starter logo ' + version + '</svg>')
    write(root, 'src/assets/hero.png', Buffer.from([1, 2, 3, 4]))
    write(root, 'public/icons.svg', '<svg>starter icons</svg>')
    write(root, 'public/favicon.svg', '<svg>starter favicon</svg>')
    write(root, 'index.html', '<html><title>experiment32</title><img src="/favicon.svg"></html>')
    write(root, 'README.md', '# Default Vite README')
  }
  return root
}
function snapshot(root) {
  const files = {}
  function walk(folder = '') {
    for (const entry of readdirSync(join(root, folder), { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue
      const name = folder ? `${folder}/${entry.name}` : entry.name
      const path = join(root, name)
      if (lstatSync(path).isSymbolicLink()) files[name] = '<symlink>'
      else if (entry.isDirectory()) walk(name)
      else files[name] = sha(readFileSync(path))
    }
  }
  walk()
  return files
}
after(() => {
  for (const root of temporary) {
    assert.equal(dirname(root), realpathSync(tmpdir()))
    assert.ok(basename(root).startsWith('coming-foundation-contract-'))
    // Remove exact fixture-owned junctions before recursive cleanup of this temp root.
    for (const name of ['node_modules', 'src', '.codex-tmp']) {
      const link = join(root, name)
      if (lstatSync(link, { throwIfNoEntry: false })?.isSymbolicLink()) rmSync(link)
    }
    rmSync(root, { recursive: true, force: true })
  }
})

test('Foundation is nonvisual, has no starter-version dependency and shares the AppShell font baseline', () => {
  assert.equal(manifest.kind, 'foundation')
  assert.equal(manifest.starterFixtures, undefined)
  assert.equal(manifest.files.length, 7)
  const css = manifest.files.find((file) => file.to === 'src/index.css')
  const shellCss = loadSource('AppShellSource').files.find((file) => file.to === css.to)
  assert.equal(css.sha256, shellCss.sha256)
  const installedCss = readFileSync(join(catalogRoot, 'node_modules/@coming.ui.core/themed-components/style.css'), 'utf8')
  assert.equal(installedCss.includes('@font-face'), false)
  assert.deepEqual([...new Set([...installedCss.matchAll(/font-family:([^;}]+)/g)].map((match) => match[1].trim()))], ['inherit'])
})

test('plan reads only and missing dependencies block Foundation before writes', () => {
  const root = project({ version: 'v8.0.0' })
  const before = snapshot(root)
  const plan = run(root, 'plan')
  assert.equal(plan.status, 'PLAN_ONLY_NO_WRITES')
  assert.ok(plan.files.some((file) => file.path === 'src/assets/react.svg' && file.status === 'remove'))
  assert.deepEqual(snapshot(root), before)
  const missing = project({ dependencies: false })
  const empty = snapshot(missing)
  assert.throws(() => run(missing, 'apply'), (error) => {
    for (const name of Object.keys(manifest.dependencies)) {
      assert.ok(error.message.includes('DEPENDENCY_MISSING: ' + name))
      assert.ok(error.message.includes('npm install --save-exact ' + name))
    }
    assert.match(error.message, /lokalnog \.npmrc/)
    assert.match(error.message, /korisničke npm konfiguracije/)
    return true
  })
  assert.deepEqual(snapshot(missing), empty)
})

for (const version of ['v7.3.0', 'v8.0.0']) test(`cleans all initial ${version} content, backs up original bytes and is idempotent`, () => {
  const root = project({ version })
  write(root, '.gitignore', 'node_modules\ndist\n')
  const before = snapshot(root)
  const result = run(root, 'apply')
  assert.ok(result.changed > 0)
  assert.ok(result.backup.startsWith('.codex-tmp/project-foundation-backups/'))
  assert.equal(sha(readFileSync(join(root, result.backup, 'src/App.tsx'))), before['src/App.tsx'])
  assert.equal(sha(readFileSync(join(root, result.backup, 'src/assets/react.svg'))), before['src/assets/react.svg'])
  assert.equal(existsSync(join(root, 'src/App.css')), false)
  assert.equal(existsSync(join(root, 'src/assets')), false)
  assert.equal(existsSync(join(root, 'public')), false)
  assert.equal(existsSync(join(root, 'README.md')), false)
  assert.equal(existsSync(join(root, 'src/assets/react.svg')), false)
  assert.equal(readFileSync(join(root, 'src/App.tsx'), 'utf8').includes('return null'), true)
  assert.doesNotMatch(readFileSync(join(root, 'index.html'), 'utf8'), /favicon|vite\.svg|Vite \+/)
  const main = readFileSync(join(root, 'src/main.tsx'), 'utf8')
  assert.ok(main.indexOf('themed-components/style.css') < main.indexOf("'./index.css'"))
  assert.match(run(root, 'verify').status, /^FOUNDATION_CONTRACT_OK/)
  const applied = snapshot(root)
  assert.equal(run(root, 'apply').changed, 0)
  assert.deepEqual(snapshot(root), applied)
  assert.equal(readFileSync(join(root, 'DecisionLog.md'), 'utf8').split('project-foundation:adoption:start').length - 1, 1)
  assert.equal(before['package.json'], applied['package.json'])
})

test('first initialization removes every initial src/public file regardless of its name, type or size', () => {
  const root = project({ version: 'future-vite' })
  write(root, 'src/unknown/template.scss', '.unknown { color: red }')
  write(root, 'public/future/demo/image.bin', Buffer.alloc(2 * 1024 * 1024 + 1, 'x'))
  write(root, 'tsconfig.json', '{"compilerOptions":{}}')
  write(root, 'vite.config.ts', '// Tool configuration stays')
  write(root, '.npmrc', '# Local registry sentinel')
  write(root, '.env.local', 'LOCAL_SETTING=unchanged')
  write(root, 'apm.yml', 'name: host')
  write(root, '.agents/skills/host/SKILL.md', '# Existing skill')
  const before = snapshot(root)
  const result = run(root, 'apply')
  for (const name of ['tsconfig.json', 'vite.config.ts', '.npmrc', '.env.local', 'apm.yml', '.agents/skills/host/SKILL.md', 'package.json']) assert.equal(snapshot(root)[name], before[name], name)
  assert.deepEqual(readdirSync(join(root, 'src')).sort(), ['App.tsx', 'index.css', 'main.tsx'])
  for (const name of ['src/unknown/template.scss', 'public/future/demo/image.bin', 'src/assets/hero.png', 'README.md']) {
    assert.equal(existsSync(join(root, name)), false)
    assert.equal(sha(readFileSync(join(root, result.backup, name))), before[name])
  }
  assert.match(run(root, 'verify').status, /^FOUNDATION_CONTRACT_OK/)
})

test('repeat initialization never removes later application code, assets, README or custom HTML', () => {
  const root = project({ version: 'fresh' })
  run(root, 'apply')
  write(root, 'src/App.tsx', 'export default function App(){return <h1>Real application</h1>}')
  write(root, 'src/features/cars/PreviewCars.tsx', 'export const Cars = () => null')
  write(root, 'src/assets/new-logo.svg', '<svg>application logo</svg>')
  write(root, 'public/favicon.svg', '<svg>application favicon</svg>')
  write(root, 'index.html', '<html><title>Application</title></html>')
  write(root, 'README.md', '# Application documentation')
  const before = snapshot(root)
  assert.equal(run(root, 'apply').changed, 0)
  assert.match(run(root, 'verify').status, /^FOUNDATION_CONTRACT_OK/)
  assert.deepEqual(snapshot(root), before)
})

test('protected content inside the reset scope blocks before writes', () => {
  const root = project({ version: 'fresh' })
  write(root, 'src/.env.local', 'PROTECTED_SENTINEL=1')
  const before = snapshot(root)
  assert.throws(() => run(root, 'apply'), /PROTECTED_FILE_IN_STARTER_SCOPE/)
  assert.deepEqual(snapshot(root), before)
})

test('existing instructions, design exceptions and decisions are preserved and numbered correctly', () => {
  const root = project()
  const originalInstructions = '# User instruction\r\n\r\nNever change business rules.  \r\n\r\n\r\n'
  write(root, 'AGENTS.md', originalInstructions)
  write(root, 'DesignRules.md', '# Existing design\n\nApproved special spacing on page A.\n')
  write(root, 'DecisionLog.md', '# History\n\n## DL-009 — Existing confirmed decision\n\nKeep this.\n')
  const result = run(root, 'apply')
  assert.ok(readFileSync(join(root, 'AGENTS.md'), 'utf8').startsWith(originalInstructions))
  assert.match(readFileSync(join(root, 'DesignRules.md'), 'utf8'), /^# Existing design\n\nApproved special spacing on page A\./)
  const decision = readFileSync(join(root, 'DecisionLog.md'), 'utf8')
  assert.match(decision, /^# History\n\n## DL-009/)
  assert.ok(decision.includes(`ProjectFoundationSource ${manifest.revision}`))
  assert.match(decision, /NISU izvršeni ovim alatom/)
  assert.equal(readFileSync(join(root, result.backup, 'DecisionLog.md'), 'utf8').includes('DL-010'), false)
  const coreVersion = JSON.parse(readFileSync(join(catalogRoot, 'node_modules/@coming.ui.core/themed-components/package.json'), 'utf8')).version
  assert.ok(decision.includes(`@coming.ui.core/themed-components: installed ${coreVersion}`))
  write(root, 'AGENTS.md', readFileSync(join(root, 'AGENTS.md'), 'utf8') + '\n## Later rule\nKeep this too.\n')
  assert.equal(run(root, 'apply').changed, 0)
  assert.match(readFileSync(join(root, 'AGENTS.md'), 'utf8'), /Keep this too/)
})

test('even an existing empty DecisionLog has a recoverable original', () => {
  const root = project()
  write(root, 'DecisionLog.md', '')
  const result = run(root, 'apply')
  assert.ok(result.backup)
  assert.equal(readFileSync(join(root, result.backup, 'DecisionLog.md'), 'utf8'), '')
})

test('malformed and modified managed blocks fail before any mutation', () => {
  const root = project({ version: 'v8.0.0' })
  write(root, 'AGENTS.md', '<!-- project-foundation:AGENTS.md:start -->\n')
  const before = snapshot(root)
  assert.throws(() => run(root, 'apply'), /MANAGED_BLOCK_MALFORMED/)
  assert.deepEqual(snapshot(root), before)
  const second = project()
  run(second, 'apply')
  write(second, 'DesignRules.md', readFileSync(join(second, 'DesignRules.md'), 'utf8').replace('Zajednički dizajn pravilnik', 'manually modified'))
  const changed = snapshot(second)
  assert.throws(() => run(second, 'apply'), /MANAGED_BLOCK_CHANGED/)
  assert.throws(() => run(second, 'verify'), /MANAGED_BLOCK_CHANGED/)
  assert.deepEqual(snapshot(second), changed)
})

test('JSON config rejects unknown keys/code, escapes title, and repeat default does not reset it', () => {
  const root = project({ version: 'v8.0.0' })
  const config = join(root, 'ProjectFoundationConfig.input.json')
  writeFileSync(config, JSON.stringify({ documentTitle: 'QA <Catalog> & "Files"' }))
  run(root, 'apply', { config })
  const html = readFileSync(join(root, 'index.html'), 'utf8')
  assert.match(html, /QA &lt;Catalog&gt; &amp; &quot;Files&quot;/)
  assert.equal(run(root, 'apply').changed, 0)
  assert.equal(readFileSync(join(root, 'index.html'), 'utf8'), html)
  writeFileSync(config, JSON.stringify({ documentTitle: 'Other', primaryColor: 'red' }))
  const before = snapshot(root)
  assert.throws(() => run(root, 'apply', { config }), /INVALID_FOUNDATION_CONFIG/)
  assert.deepEqual(snapshot(root), before)
  assert.throws(() => run(root, 'apply', { replaceFiles: ['src/App.tsx'] }), /does not accept --replace-file/)
})

test('symlinked output, broken directory junction and backup escape block the entire operation', () => {
  const root = project(), external = project()
  symlinkSync(external, join(root, 'src'), process.platform === 'win32' ? 'junction' : 'dir')
  const before = snapshot(root), outside = snapshot(external)
  assert.throws(() => run(root, 'apply'), /symlink rejected/)
  assert.deepEqual(snapshot(root), before)
  assert.deepEqual(snapshot(external), outside)
  const backupRoot = project()
  write(backupRoot, 'AGENTS.md', '# Existing\n')
  symlinkSync(external, join(backupRoot, '.codex-tmp'), process.platform === 'win32' ? 'junction' : 'dir')
  assert.throws(() => run(backupRoot, 'apply'), /symlink rejected/)
  assert.equal(existsSync(join(backupRoot, 'DesignRules.md')), false)
  const broken = project()
  symlinkSync(join(broken, 'does-not-exist'), join(broken, 'src'), process.platform === 'win32' ? 'junction' : 'dir')
  assert.throws(() => run(broken, 'apply'), /symlink rejected/)
  assert.equal(existsSync(join(broken, 'does-not-exist')), false)
})

test('a real clean Foundation builds, then composes with AppShell without losing project rules', () => {
  const root = project({ version: 'v8.0.0' })
  write(root, 'tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2023', lib: ['ES2023', 'DOM'], module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', allowImportingTsExtensions: true, noEmit: true, skipLibCheck: true, types: ['vite/client'] }, include: ['src'] }))
  run(root, 'apply')
  function check() {
    for (const args of [
      [join(catalogRoot, 'node_modules/oxlint/bin/oxlint'), 'src'],
      [join(catalogRoot, 'node_modules/typescript/bin/tsc'), '--project', join(root, 'tsconfig.json')],
      [join(catalogRoot, 'node_modules/vite/bin/vite.js'), 'build', root, '--config', join(catalogRoot, 'vite.config.ts')],
    ]) {
      const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' })
      assert.equal(result.status, 0, result.stdout + result.stderr)
    }
  }
  check()
  const shell = { source: 'AppShellSource', target: root }
  const plan = runTransfer({ ...shell, mode: 'plan' })
  assert.deepEqual(plan.files.filter((file) => file.status === 'collision').map((file) => file.to), ['src/App.tsx', 'src/main.tsx'])
  runTransfer({ ...shell, mode: 'apply', replaceFiles: ['src/App.tsx', 'src/main.tsx'] })
  assert.match(runTransfer({ ...shell, mode: 'verify' }).status, /^CODE_CONTRACT_OK/)
  assert.match(run(root, 'verify').status, /^FOUNDATION_CONTRACT_OK/)
  assert.equal(run(root, 'apply').changed, 0)
  assert.match(readFileSync(join(root, 'AGENTS.md'), 'utf8'), /project-foundation:AGENTS.md:start/)
  assert.match(readFileSync(join(root, 'AGENTS.md'), 'utf8'), /coming-source:AppShellSource:start/)
  assert.equal(existsSync(join(root, 'src/patterns')), false)
  check()
})

test('Foundation docs have valid local links and no author machine paths', () => {
  const file = join(catalogRoot, 'src/patterns/ProjectFoundationSource/ProjectFoundationPattern.md')
  const content = readFileSync(file, 'utf8')
  assert.doesNotMatch(content, /C:\/Users\/|C:\\Users\\/)
  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) if (!/^[a-z]+:/.test(match[1])) assert.ok(existsSync(resolve(dirname(file), match[1])), match[1])
})
