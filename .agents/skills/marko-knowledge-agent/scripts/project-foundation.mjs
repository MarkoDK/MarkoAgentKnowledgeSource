import { randomUUID } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'

const normalize = (value) => value.replaceAll('\r\n', '\n')
const marker = (name, edge) => `<!-- project-foundation:${name}:${edge} -->`
const fail = (message) => { throw new Error(message) }
function appendSection(current, section) {
  const gap = !current || /\r?\n\r?\n$/.test(current) ? '' : /\r?\n$/.test(current) ? '\n' : '\n\n'
  return current + gap + section + '\n'
}

function managedDocument(current, name, template, revision) {
  const start = marker(name, 'start'), end = marker(name, 'end')
  const block = `${start}\n<!-- revision: ${revision} -->\n${template.trimEnd()}\n${end}`
  const starts = current.split(start).length - 1, ends = current.split(end).length - 1
  if (starts !== ends || starts > 1 || (starts && current.indexOf(end) < current.indexOf(start))) fail(`MANAGED_BLOCK_MALFORMED: ${name}`)
  if (!starts) return appendSection(current, block)
  const existing = current.slice(current.indexOf(start), current.indexOf(end) + end.length)
  if (normalize(existing) !== normalize(block)) fail(`MANAGED_BLOCK_CHANGED: ${name}; preserve edits and request a reviewed migration.`)
  return current
}

function configFor(manifest, config, context) {
  const file = config ? resolve(config) : context.safePath(context.catalogRoot, manifest.configuration)
  const value = JSON.parse(readFileSync(file, 'utf8'))
  if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).length !== 1 || typeof value.documentTitle !== 'string' || !value.documentTitle.trim() || value.documentTitle.length > 100 || [...value.documentTitle].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) fail('INVALID_FOUNDATION_CONFIG: only documentTitle (1–100 characters) is supported.')
  return value
}

function htmlTitle(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

// Nonvisual Source: managed documents + a narrowly recognized Vite starter cleanup.
// Never delete by filename alone, never evaluate a supplied config, never install packages.
export function runFoundation({ mode, target, manifest, dependencies, config, replaceFiles }, context) {
  if (replaceFiles.length) fail('Foundation does not accept --replace-file. Unknown application files must be preserved.')
  const { safePath, digest, targetPayload, catalogRoot } = context
  const pathFor = (name) => safePath(target, name)
  const read = (name) => existsSync(pathFor(name)) ? readFileSync(pathFor(name)) : null
  const settings = configFor(manifest, config, context)
  const fixture = JSON.parse(readFileSync(safePath(catalogRoot, manifest.starterFixtures), 'utf8'))
  const versions = Object.values(fixture.releases)
  const oldText = new Map()
  for (const version of versions) for (const [path, text] of Object.entries(version.files)) {
    if (!oldText.has(path)) oldText.set(path, [])
    oldText.get(path).push(normalize(text))
  }
  const recognized = (name, data) => data !== null && oldText.get(name)?.includes(normalize(data.toString('utf8')))
  const items = manifest.files.map((item) => ({ ...item, data: targetPayload(manifest, item) }))
  const byTarget = new Map(items.map((item) => [item.to, item]))
  const actions = new Map()
  function propose(name, data, reason) {
    const before = read(name)
    const identical = before !== null && data !== null && before.equals(data)
    actions.set(name, { path: name, status: identical ? 'identical' : data === null ? 'remove' : before === null ? 'create' : 'update', reason, before, data })
  }
  function preserve(name, reason) { actions.set(name, { path: name, status: 'preserve', reason, before: read(name), data: null }) }
  for (const item of items.filter((item) => item.role === 'managed-document')) {
    const current = read(item.to)?.toString('utf8') ?? ''
    const next = managedDocument(current, item.to, item.data.toString('utf8'), manifest.revision)
    propose(item.to, Buffer.from(next), 'Merge source-owned block; preserve all project content outside it.')
  }

  // Treat the React entry/CSS/App as a unit: replacing only one can break user code.
  const bootstrap = items.filter((item) => item.role === 'starter' && item.to !== 'index.html')
  const safeBootstrap = bootstrap.every((item) => {
    const current = read(item.to)
    return current === null || current.equals(item.data) || recognized(item.to, current)
  })
  for (const item of bootstrap) {
    if (safeBootstrap) propose(item.to, item.data, 'Absent, exact Foundation baseline, or verified Vite starter.')
    else preserve(item.to, 'Application entry group contains custom code; no partial rewrite.')
  }
  const html = byTarget.get('index.html')
  const template = html.data.toString('utf8')
  const desiredHtml = Buffer.from(template.replace('{{DOCUMENT_TITLE}}', htmlTitle(settings.documentTitle)))
  const currentHtml = read('index.html')
  const isFoundationHtml = currentHtml !== null && normalize(currentHtml.toString('utf8')).replace(/<title>[^<]*<\/title>/, '<title>{{DOCUMENT_TITLE}}</title>') === normalize(template)
  if (safeBootstrap && (currentHtml === null || recognized('index.html', currentHtml) || (isFoundationHtml && config))) propose('index.html', desiredHtml, 'Remove verified demo favicon/title; apply documentTitle only to the neutral Foundation HTML.')
  else if (isFoundationHtml) propose('index.html', currentHtml, safeBootstrap ? 'Keep current Foundation title unless a custom config is explicitly supplied.' : 'Application entry group is custom; keep its current HTML unchanged.')
  else preserve('index.html', 'Custom HTML or application code; preserve metadata and entry references.')

  const candidates = new Map()
  const appCss = read('src/App.css')
  if (recognized('src/App.css', appCss)) candidates.set('src/App.css', appCss)
  else if (appCss !== null) preserve('src/App.css', 'Not an exact verified demo stylesheet.')
  for (const version of versions) for (const [name, asset] of Object.entries(version.assets)) {
    const bytes = read(name)
    if (bytes === null) continue
    if (digest(bytes) === asset.sha256) candidates.set(name, bytes)
    else if (!candidates.has(name)) preserve(name, 'Unknown or modified asset: filename is not permission to delete.')
  }

  // Conservative reference scan of prospective app files. Resolve a fixed point so
  // a preserved demo file also keeps the demo assets it still references.
  const texts = new Map()
  let incompleteScan = false
  function walk(folder) {
    const directory = pathFor(folder)
    if (!existsSync(directory)) return
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = `${folder}/${entry.name}`
      pathFor(name) // Reject symlinks before the first write, including directory links.
      if (/^(?:\.env(?:\..*)?|\.npmrc|\.yarnrc(?:\.yml)?|credentials(?:\..*)?|secrets?(?:\..*)?|\.aws|\.git|node_modules|\.codex-tmp)$/i.test(entry.name)) incompleteScan = true
      else if (entry.isDirectory()) walk(name)
      else if (lstatSync(pathFor(name)).size > 2 * 1024 * 1024) incompleteScan = true
      else texts.set(name, read(name).toString('utf8'))
    }
  }
  walk('src'); walk('public')
  if (incompleteScan) {
    for (const name of candidates.keys()) preserve(name, 'Reference scan skipped protected content or a file over 2 MiB; preserve demo assets conservatively.')
    candidates.clear()
  }
  if (currentHtml !== null) texts.set('index.html', currentHtml.toString('utf8'))
  for (const action of actions.values()) if (['create', 'update', 'identical'].includes(action.status)) texts.set(action.path, action.data.toString('utf8'))
  let changed
  do {
    changed = false
    for (const [name] of candidates) {
      if ([...texts].some(([reader, text]) => reader !== name && !candidates.has(reader) && text.includes(basename(name)))) {
        candidates.delete(name)
        preserve(name, 'Still referenced by prospective application content.')
        changed = true
      }
    }
  } while (changed)
  for (const [name] of candidates) propose(name, null, 'Exact verified demo fingerprint AND no remaining application reference.')

  const ignore = read('.gitignore')?.toString('utf8') ?? ''
  // Place the directory rule last, so a previous negation cannot expose backups.
  const ignored = ignore.trimEnd().split(/\r?\n/).at(-1) === '.codex-tmp/'
  propose('.gitignore', Buffer.from(ignored ? ignore : appendSection(ignore, '# Local verification and recoverable backups\n.codex-tmp/')), 'Keep local backups out of version control; preserve existing ignore rules.')

  const decisionItem = items.find((item) => item.role === 'decision-log')
  const decision = read(decisionItem.to)?.toString('utf8') ?? ''
  const start = marker('adoption', 'start'), end = marker('adoption', 'end')
  const startCount = decision.split(start).length - 1, endCount = decision.split(end).length - 1
  if (startCount !== endCount || startCount > 1 || (startCount && decision.indexOf(end) < decision.indexOf(start))) fail('MANAGED_BLOCK_MALFORMED: DecisionLog.md adoption receipt.')
  const changes = [...actions.values()].filter((item) => ['create', 'update', 'remove'].includes(item.status))
  const needsBackup = changes.some((item) => item.before !== null) || (!startCount && read(decisionItem.to) !== null)
  const backup = needsBackup ? `.codex-tmp/project-foundation-backups/${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}` : null
  if (!startCount) {
    const numbers = [...decision.matchAll(/\bDL-(\d+)\b/g)].map((match) => Number(match[1]))
    const id = `DL-${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}`
    const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest' }).format(new Date())
    const summary = [...actions.values()].filter((item) => item.status !== 'identical').map((item) => `- ${item.status}: ${item.path} — ${item.reason}`).join('\n')
    const entry = decisionItem.data.toString('utf8')
      .replace('{{DECISION_ID}}', id).replace('{{DATE}}', date).replace('{{REVISION}}', manifest.revision)
      .replace('{{ACTIONS}}', `${summary}\n- ${decision ? 'update' : 'create'}: DecisionLog.md — append this adoption entry; preserve existing decisions.`)
      .replace('{{DEPENDENCIES}}', dependencies.map((item) => `- ${item.name}: installed ${item.installed}; tested ${item.tested}; ${item.status}`).join('\n'))
      .replace('{{BACKUP}}', backup ?? 'nisu bile potrebne (novi fajlovi)')
    propose(decisionItem.to, Buffer.from(appendSection(decision, `${start}\n${entry.trimEnd()}\n${end}`)), 'Append one dated adoption decision; do not rewrite earlier history.')
  } else propose(decisionItem.to, Buffer.from(decision), 'Already adopted; no duplicate decision or reset of historical results.')

  const report = () => [...actions.values()].map(({ path, status, reason }) => ({ path, status, reason }))
  if (mode === 'plan') return { mode, source: manifest.source, revision: manifest.revision, dependencies, files: report(), status: 'PLAN_ONLY_NO_WRITES' }
  if (mode === 'verify') {
    if (items.filter((item) => item.role === 'managed-document').some((item) => !read(item.to))) fail('FOUNDATION_DOCUMENT_MISSING')
    for (const item of items.filter((item) => item.role === 'managed-document')) if (actions.get(item.to).status !== 'identical') fail(`FOUNDATION_BLOCK_MISSING: ${item.to}`)
    if (!startCount) fail('FOUNDATION_DECISION_MISSING')
    if (!ignored) fail('FOUNDATION_BACKUP_IGNORE_MISSING')
    const remaining = [...actions.values()].filter((item) => item.status === 'remove' || (['src/App.tsx', 'src/main.tsx', 'src/index.css', 'index.html'].includes(item.path) && ['create', 'update'].includes(item.status)))
    if (remaining.length) fail(`FOUNDATION_STARTER_CLEANUP_PENDING: ${remaining.map((item) => item.path).join(', ')}`)
    return { mode, source: manifest.source, revision: manifest.revision, dependencies, status: 'FOUNDATION_CONTRACT_OK_NOT_A_BUILD_OR_BROWSER_TEST', preserved: report().filter((item) => item.status === 'preserve'), runtimePolicy: 'Bootstrap may be superseded by another Source or user application; documents stay managed.' }
  }

  const writes = [...actions.values()].filter((item) => ['create', 'update', 'remove'].includes(item.status))
  // Resolve all output/backup paths and verify the snapshots before any mutation.
  for (const action of writes) {
    pathFor(action.path)
    const current = read(action.path)
    if ((current === null) !== (action.before === null) || (current !== null && !current.equals(action.before))) fail(`TARGET_CHANGED_DURING_PREFLIGHT: ${action.path}`)
    if (backup && action.before !== null) pathFor(`${backup}/${action.path}`)
  }
  if (backup && writes.length) {
    const receipt = pathFor(`${backup}/receipt.json`)
    for (const action of writes.filter((item) => item.before !== null)) {
      const file = pathFor(`${backup}/${action.path}`)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, action.before, { flag: 'wx' })
    }
    mkdirSync(dirname(receipt), { recursive: true })
    writeFileSync(receipt, JSON.stringify({ source: manifest.source, revision: manifest.revision, createdAt: new Date().toISOString(), actions: writes.map((item) => ({ path: item.path, status: item.status, beforeSha256: item.before === null ? null : digest(item.before), afterSha256: item.data === null ? null : digest(item.data) })) }, null, 2), { flag: 'wx' })
  }
  try {
    // Ignore backups before changing application content.
    writes.sort((a, b) => Number(b.path === '.gitignore') - Number(a.path === '.gitignore'))
    for (const action of writes) {
      const file = pathFor(action.path)
      if (action.status === 'remove') unlinkSync(file)
      else { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, action.data) }
    }
  } catch (error) {
    fail(`FOUNDATION_WRITE_FAILED: ${error.message}; inspect current state, do not retry blindly. Recovery: ${backup ?? 'only new files were planned'}`)
  }
  return { mode, source: manifest.source, revision: manifest.revision, dependencies, files: report(), changed: writes.length, backup: writes.length ? backup : null, status: 'FOUNDATION_APPLIED_VERIFY_LINT_BUILD_NEXT' }
}
