import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { runFoundation } from './project-foundation.mjs'

const skillRoot = realpathSync(fileURLToPath(new URL('../', import.meta.url)))
const bundledCatalog = join(skillRoot, 'assets/catalog')
const bundled = existsSync(bundledCatalog)
export const catalogRoot = realpathSync(bundled ? bundledCatalog : fileURLToPath(new URL('../../../../', import.meta.url)))
const digest = (data) => createHash('sha256').update(data).digest('hex')
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
function fail(message) { throw new Error(message) }
function inside(root, candidate) {
  const path = relative(root, candidate)
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path))
}
function safePath(root, name) {
  if (typeof name !== 'string' || !name || name.includes('\\') || isAbsolute(name) || name.split('/').some((part) => !part || part === '.' || part === '..')) fail(`Unsafe relative path: ${name}`)
  const result = resolve(root, name)
  if (!inside(root, result)) fail(`Path escapes root: ${name}`)
  let current = root
  for (const part of name.split('/')) {
    current = join(current, part)
    if (lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) fail(`Payload symlink rejected: ${name}`)
  }
  return result
}
export function loadSource(name) {
  if (!/^[A-Za-z][A-Za-z0-9]*Source$/.test(name ?? '')) fail('Specify a named Source, e.g. AppShellSource.')
  const folder = safePath(catalogRoot, `src/patterns/${name}`)
  if (existsSync(safePath(folder, '.planned'))) fail(`SOURCE_PLANNED_NOT_IMPLEMENTED: ${name}; roadmap only, no generation available.`)
  const manifest = readJson(join(folder, 'source.manifest.json'))
  if (manifest.schemaVersion !== 2 || manifest.source !== name || !manifest.revision || manifest.dependencyPolicy !== 'tested-or-newer' || !Array.isArray(manifest.files) || !manifest.files.length) fail('Invalid source manifest.')
  if (!existsSync(safePath(folder, manifest.pattern))) fail('Pattern document missing.')
  if (manifest.kind && manifest.kind !== 'foundation') fail('Unsupported source kind.')
  if (manifest.kind !== 'foundation' && !manifest.screenshots?.length) fail('Source screenshots missing.')
  for (const name of manifest.screenshots ?? []) if (!existsSync(safePath(folder, name))) fail(`Screenshot missing: ${name}`)
  if (manifest.kind === 'foundation') {
    if (name !== 'ProjectFoundationSource' || !manifest.resources?.length) fail('Invalid Foundation contract.')
    for (const item of manifest.resources) if (digest(readFileSync(safePath(catalogRoot, item.path))) !== item.sha256) fail(`SOURCE_DRIFT: ${item.path}`)
    for (const resource of [manifest.configuration, manifest.starterFixtures]) if (!manifest.resources.some((item) => item.path === resource)) fail('Foundation resource integrity declaration missing.')
  }
  const outputs = new Set()
  const inputs = new Set()
  for (const item of manifest.files) {
    const roles = manifest.kind === 'foundation' ? ['managed-document', 'decision-log', 'starter'] : ['fixed', 'configuration', 'instructions', 'scaffold']
    if (!roles.includes(item.role) || !/^[a-f0-9]{64}$/.test(item.sha256 ?? '')) fail('Invalid payload role/hash.')
    safePath(catalogRoot, item.from)
    safePath(catalogRoot, item.to)
    if (item.to.split('/').includes('patterns')) fail(`Catalog-only patterns folder is not a target destination: ${item.to}`)
    if (inputs.has(item.from)) fail(`Duplicate input: ${item.from}`)
    inputs.add(item.from)
    if (outputs.has(item.to)) fail(`Duplicate output: ${item.to}`)
    outputs.add(item.to)
    if (digest(readFileSync(safePath(catalogRoot, item.from))) !== item.sha256) fail(`SOURCE_DRIFT: ${item.from}; author must review and version the canonical source.`)
    if (item.role === 'configuration' && (!Array.isArray(item.initializers) || !item.initializers.length)) fail('Configuration boundary missing.')
    if (item.role === 'instructions' && (!item.to.endsWith('.md') || item.to !== manifest.configurationDocument)) fail('Unsupported human configuration boundary.')
  }
  for (const item of manifest.files) targetPayload(manifest, item)
  return manifest
}
// Relocate only relative module specifiers. JSX, CSS and other source bytes stay unchanged.
// Expected target bytes are calculated by this same mapping during copy AND verification.
function targetPayload(manifest, item) {
  const bytes = readFileSync(safePath(catalogRoot, item.from))
  if (!/\.[jt]sx?$/.test(item.from)) return bytes
  const text = bytes.toString('utf8').replace(/\b(from\s*|import\s*)(['"])(\.[^'"\r\n]+)\2/g, (original, prefix, quote, specifier) => {
    const base = posix.normalize(posix.join(posix.dirname(item.from), specifier))
    const candidates = [base, ...['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'].map((suffix) => base + suffix)]
    const dependency = manifest.files.find((file) => candidates.includes(file.from))
    if (!dependency) fail(`UNMAPPED_LOCAL_IMPORT: ${item.from} -> ${specifier}`)
    let destination = dependency.to
    if (!/\.[^/]+$/.test(specifier)) destination = destination.replace(/\.[jt]sx?$/, '')
    let mapped = posix.relative(posix.dirname(item.to), destination)
    if (!mapped.startsWith('.')) mapped = './' + mapped
    if (mapped === specifier) return original
    return prefix + quote + mapped + quote
  })
  return Buffer.from(text, 'utf8')
}
function targetRoot(path) {
  if (!path || !existsSync(path)) fail('Target directory must already exist.')
  const target = realpathSync(resolve(path))
  const installedInTarget = bundled && skillRoot === join(target, '.agents/skills/marko-knowledge-agent')
  if (dirname(target) === target || inside(catalogRoot, target) || (inside(target, catalogRoot) && !installedInTarget)) fail('Target must be a separate project, not the catalog, its descendant or ancestor.')
  if (!existsSync(join(target, 'package.json'))) fail('Target package.json missing; prepare a project first.')
  return target
}
function compareVersions(actual, tested) {
  const parse = (value) => {
    const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(value)
    if (!match) fail(`Invalid installed/tested package version: ${value}`)
    const pre = match[4]?.split('.') ?? []
    if (pre.some((part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0'))) fail(`Invalid prerelease version: ${value}`)
    return { core: match.slice(1, 4).map(BigInt), pre }
  }
  const a = parse(actual), b = parse(tested)
  for (let i = 0; i < 3; i++) if (a.core[i] !== b.core[i]) return a.core[i] > b.core[i] ? 1 : -1
  if (!a.pre.length || !b.pre.length) return a.pre.length === b.pre.length ? 0 : a.pre.length ? -1 : 1
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    if (a.pre[i] === undefined || b.pre[i] === undefined) return a.pre[i] === undefined ? -1 : 1
    if (a.pre[i] === b.pre[i]) continue
    const an = /^\d+$/.test(a.pre[i]), bn = /^\d+$/.test(b.pre[i])
    if (an && bn) return BigInt(a.pre[i]) > BigInt(b.pre[i]) ? 1 : -1
    if (an !== bn) return an ? -1 : 1
    return a.pre[i] > b.pre[i] ? 1 : -1
  }
  return 0
}
function checkDependencies(manifest, target) {
  const dependencies = []
  const issues = []
  const commands = []
  let coreSetup = false
  for (const [name, expected] of Object.entries(manifest.dependencies)) {
    const path = join(target, 'node_modules', name, 'package.json')
    if (!existsSync(path)) {
      issues.push(`DEPENDENCY_MISSING: ${name} — nije instaliran; potrebna je verzija ${expected} ili novija.`)
    } else {
      const actual = readJson(path).version
      const comparison = compareVersions(actual, expected)
      if (comparison >= 0) {
        dependencies.push({ name, tested: expected, installed: actual, status: comparison > 0 ? 'NEWER_INSTALLED_KEEP_AND_TEST' : 'TESTED_VERSION' })
        continue
      }
      issues.push(`DEPENDENCY_TOO_OLD: ${name} — instalirana je ${actual}; potrebna je ${expected} ili novija.`)
    }
    commands.push(`npm install --save-exact ${name}`)
    if (name === '@coming.ui.core/themed-components') coreSetup = true
  }
  const scripts = readJson(join(target, 'package.json')).scripts
  if (!scripts?.lint || !scripts?.build) issues.push('Target lint/build scripts are required; do not claim verification without them.')
  if (issues.length) {
    const report = ['Potrebna je priprema projekta pre primene patterna.', ...issues]
    if (coreSetup) report.push(
      '',
      'Coming Core je privatni paket. Pre njegove instalacije podesi firmin npm registry preko lokalnog .npmrc fajla u root-u projekta ili postojeće korisničke npm konfiguracije.',
      'Koristi odobrenu konfiguraciju i drži .npmrc sa pristupnim podacima izvan Git-a. Agent ne čita niti prikazuje njegov sadržaj.',
    )
    if (commands.length) report.push(
      '',
      'Predložene komande za instalaciju ili ažuriranje:',
      ...commands,
      'Komande biraju verziju iz podešenog registry-ja i upisuju tačnu verziju u package.json. Zatim ponovi preflight da proveriš da li zadovoljava minimum.',
      'Ako npm prijavi konflikt zavisnosti, uskladi verzije povezanih paketa pre ponovnog pokušaja.',
    )
    report.push('Priprema paketa čeka tvoju akciju ili izričito odobrenje za instalaciju.')
    fail(report.join('\n'))
  }
  return dependencies
}
function maskedConfiguration(source, names, ts, item = {}) {
  const text = source.replaceAll('\r\n', '\n')
  const file = ts.createSourceFile('config.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  if (file.parseDiagnostics.length) fail('Configuration is not valid TSX.')
  const regions = []
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && names.includes(node.name.text)) {
      if (!node.initializer || regions.some((region) => region.name === node.name.text)) fail('Missing/duplicate configuration initializer.')
      function dataOnly(child) {
        if (ts.isCallExpression(child) || ts.isNewExpression(child) || ts.isArrowFunction(child) || ts.isFunctionExpression(child) || (!item.allowJsx && (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child))) || ts.isSpreadAssignment(child) || ts.isComputedPropertyName(child)) fail('Configuration accepts data/references and declared JSX slots, not calls/functions or side effects.')
        ts.forEachChild(child, dataOnly)
      }
      dataOnly(node.initializer)
      regions.push({ name: node.name.text, start: node.initializer.getStart(file), end: node.initializer.end })
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  if (regions.length !== names.length) fail('Required configuration initializer missing.')
  if (item.allowLocalImports) {
    for (const node of file.statements.filter(ts.isImportDeclaration)) regions.push({ start: node.getFullStart(), end: node.end })
  }
  return regions.sort((a, b) => b.start - a.start).reduce((value, region) => value.slice(0, region.start) + (region.name ? `__CONFIG_${region.name}__` : '') + value.slice(region.end), text).trim()
}
function verifyConfiguration(manifest, item, target) {
  const require = createRequire(join(target, 'package.json'))
  let ts
  try { ts = require('typescript') } catch { fail('TypeScript is required in the target to check configuration boundaries.') }
  const baselineText = targetPayload(manifest, item).toString('utf8')
  const currentText = readFileSync(safePath(target, item.to), 'utf8')
  if (item.allowLocalImports) {
    const imports = (text) => {
      const ast = ts.createSourceFile('config.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      return ast.statements.filter(ts.isImportDeclaration).map((node) => ({ text: node.getText(ast), local: Boolean(node.importClause) && /^\.{1,2}\//.test(node.moduleSpecifier.text) }))
    }
    const baselineImports = imports(baselineText), currentImports = imports(currentText)
    if (baselineImports.some((original) => !currentImports.some((entry) => entry.text === original.text))) fail('CONFIGURATION_DRIFT: preserve source imports.')
    if (currentImports.some((entry) => !entry.local && !baselineImports.some((original) => original.text === entry.text))) fail('CONFIGURATION_DRIFT: additional imports must be named/default local application imports, not side effects or packages.')
  }
  const baseline = maskedConfiguration(baselineText, item.initializers, ts, item)
  const current = maskedConfiguration(currentText, item.initializers, ts, item)
  if (baseline !== current) fail(`CONFIGURATION_DRIFT: changes outside declared data initializers: ${item.to}`)
}
function managedNote(manifest) {
  return `<!-- coming-source:${manifest.source}:start -->\n### ${manifest.source} — ${manifest.revision}\n\n- Fixed payload: use the source manifest; do not rewrite JSX/CSS or format copied files.\n- Configuration: ${manifest.files.filter((item) => item.role === 'configuration').map((item) => `${item.to} (${item.initializers.join(', ')}${item.allowJsx ? '; JSX slots and local component imports allowed' : ''})`).join('; ') || 'see human input and editable scaffold below'}.\n${manifest.files.some((item) => item.role === 'scaffold') ? `- Editable scaffold: ${manifest.files.filter((item) => item.role === 'scaffold').map((item) => item.to).join(', ')}. Apply only requested config changes; review and build are required, not fixed-byte equality.\n` : ''}${manifest.configurationDocument ? `- Human input: ${manifest.configurationDocument}. Agent applies it to declared scaffold/config points; no derived definition or runtime parser.\n` : ''}- Verify with the installed marko-knowledge-agent source-transfer tool: verify --source ${manifest.source} --target .\n- Lint/build and browser checks remain separate. This receipt does not prove visual fidelity.\n<!-- coming-source:${manifest.source}:end -->`
}
export function runTransfer({ mode, source, target: targetPath, replaceFiles = [], config }) {
  if (!['check-source', 'plan', 'apply', 'verify'].includes(mode)) fail('Modes: check-source, plan, apply, verify.')
  const manifest = loadSource(source)
  if (mode === 'check-source') return { mode, source, revision: manifest.revision, files: manifest.files.length, status: 'SOURCE_INTEGRITY_OK' }
  const target = targetRoot(targetPath)
  for (const item of manifest.files) if (inside(skillRoot, safePath(target, item.to))) fail('Target payload must preserve the installed skill.')
  const dependencies = checkDependencies(manifest, target)
  if (manifest.kind === 'foundation') return runFoundation({ mode, target, manifest, dependencies, config, replaceFiles }, { safePath, digest, targetPayload, catalogRoot })
  if (config) fail('--config is only supported by the Foundation JSON contract; use the named config boundary for this Source.')
  const replacements = new Set(replaceFiles)
  for (const name of replacements) if (!manifest.files.some((item) => item.to === name)) fail(`Replacement is not in payload: ${name}`)
  const plan = manifest.files.map((item) => {
    const path = safePath(target, item.to)
    const status = !existsSync(path) ? 'create' : digest(readFileSync(path)) === digest(targetPayload(manifest, item)) ? 'identical' : 'collision'
    return { ...item, status }
  })
  if (mode === 'plan') return { mode, source, revision: manifest.revision, dependencies, files: plan.map(({ to, role, status }) => ({ to, role, status })), status: 'PLAN_ONLY_NO_WRITES' }
  if (mode === 'apply') {
    const collisions = plan.filter((item) => item.status === 'collision' && !replacements.has(item.to))
    if (collisions.length) fail(`COLLISION: ${collisions.map((item) => item.to).join(', ')}. Obtain approval for exact --replace-file paths first.`)
    // Resolve every output and read every source before the first write.
    const writes = plan.filter((item) => item.status !== 'identical').map((item) => ({ path: safePath(target, item.to), data: targetPayload(manifest, item) }))
    const agentsPath = safePath(target, 'AGENTS.md')
    let agents = existsSync(agentsPath) ? readFileSync(agentsPath, 'utf8') : ''
    const start = `<!-- coming-source:${source}:start -->`, end = `<!-- coming-source:${source}:end -->`
    if (agents.includes(start) !== agents.includes(end)) fail('Malformed existing Generated Sources block; refusing to replace instructions.')
    const startAt = agents.indexOf(start), endAt = agents.indexOf(end)
    if (startAt >= 0) {
      if (endAt < startAt || agents.indexOf(start, startAt + start.length) >= 0) fail('Duplicate/malformed Generated Sources block.')
      agents = agents.slice(0, startAt) + managedNote(manifest) + agents.slice(endAt + end.length)
    } else agents = agents.trimEnd() + `${/^## Generated Sources\s*$/m.test(agents) ? '\n\n' : '\n\n## Generated Sources\n\n'}` + managedNote(manifest) + '\n'
    for (const write of writes) { mkdirSync(dirname(write.path), { recursive: true }); writeFileSync(write.path, write.data) }
    writeFileSync(agentsPath, agents)
    return { mode, source, revision: manifest.revision, dependencies, copied: writes.length, status: 'COPIED_CONFIGURE_AND_VERIFY_NEXT' }
  }
  for (const item of plan) {
    if (item.status === 'create') fail(`MISSING_TARGET_FILE: ${item.to}`)
    if (item.role === 'fixed' && item.status !== 'identical') fail(`FIXED_FILE_DRIFT: ${item.to}`)
    if (item.role === 'configuration') verifyConfiguration(manifest, item, target)
    if (item.role === 'instructions' && !readFileSync(safePath(target, item.to), 'utf8').trim()) fail(`EMPTY_CONFIG_INSTRUCTIONS: ${item.to}`)
    if (item.role === 'scaffold' && !readFileSync(safePath(target, item.to), 'utf8').trim()) fail(`EMPTY_SCAFFOLD: ${item.to}`)
  }
  const agents = readFileSync(safePath(target, 'AGENTS.md'), 'utf8')
  if (!agents.includes(managedNote(manifest))) fail('Generated Sources baseline record missing or changed.')
  return { mode, source, revision: manifest.revision, dependencies, files: plan.length,
    editableScaffolds: manifest.files.filter((item) => item.role === 'scaffold').map((item) => item.to),
    status: 'CODE_CONTRACT_OK_NOT_A_BUILD_OR_BROWSER_TEST' }
}

function cli(argv) {
  const [mode, ...args] = argv
  const options = { mode, replaceFiles: [] }
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i], value = args[i + 1]
    if (!value || !['--source', '--target', '--replace-file', '--config'].includes(flag)) fail('Use --source NAME, --target PATH, optional exact --replace-file PATH or Foundation --config JSON_PATH.')
    if (flag === '--replace-file') options.replaceFiles.push(value)
    else options[flag.slice(2)] = value
  }
  return runTransfer(options)
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { console.log(JSON.stringify(cli(process.argv.slice(2)), null, 2)) }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 }
}
