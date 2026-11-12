import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

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

// First-project initialization: reset the declared starter scope once.
// Later calls never reset application code. Config is data; packages are not installed.
export function runFoundation({ mode, target, manifest, dependencies, config, replaceFiles }, context) {
  if (replaceFiles.length) fail('Foundation does not accept --replace-file; initialization has one declared scope.')
  const { safePath, digest, targetPayload } = context
  const pathFor = (name) => safePath(target, name)
  const read = (name) => existsSync(pathFor(name)) ? readFileSync(pathFor(name)) : null
  const settings = configFor(manifest, config, context)
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

  const decisionItem = items.find((item) => item.role === 'decision-log')
  const decision = read(decisionItem.to)?.toString('utf8') ?? ''
  const start = marker('adoption', 'start'), end = marker('adoption', 'end')
  const startCount = decision.split(start).length - 1, endCount = decision.split(end).length - 1
  if (startCount !== endCount || startCount > 1 || (startCount && decision.indexOf(end) < decision.indexOf(start))) fail('MANAGED_BLOCK_MALFORMED: DecisionLog.md adoption receipt.')
  const initializing = startCount === 0
  const directories = []

  if (initializing) {
    // This Source is explicitly for a fresh project, before any feature Source.
    // Enumerate precise files; reject links and validate paths before any write.
    function clearStarter(folder) {
      const directory = pathFor(folder)
      if (!existsSync(directory)) return
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const name = folder + '/' + entry.name
        pathFor(name)
        if (/^(?:\.env(?:\..*)?|\.npmrc|\.yarnrc(?:\.yml)?|credentials(?:\..*)?|secrets?(?:\..*)?|\.aws|\.git|node_modules|\.codex-tmp)$/i.test(entry.name)) {
          fail('PROTECTED_FILE_IN_STARTER_SCOPE: ' + name + '; move it outside src/public before initialization.')
        }
        if (entry.isDirectory()) clearStarter(name)
        else if (!byTarget.has(name)) propose(name, null, 'Remove initial project content from the declared src/public scope.')
      }
      directories.push(folder)
    }
    clearStarter('src')
    clearStarter('public')
    if (read('README.md') !== null) propose('README.md', null, 'Remove the initial starter README; project rules are in AGENTS.md and DesignRules.md.')
    for (const item of items.filter((item) => item.role === 'starter' && item.to !== 'index.html')) {
      propose(item.to, item.data, 'Initialize the clean React/Core bootstrap, independently of starter version.')
    }
  }

  const html = byTarget.get('index.html')
  const template = html.data.toString('utf8')
  const desiredHtml = Buffer.from(template.replace('{{DOCUMENT_TITLE}}', htmlTitle(settings.documentTitle)))
  const currentHtml = read('index.html')
  const isFoundationHtml = currentHtml !== null && normalize(currentHtml.toString('utf8')).replace(/<title>[^<]*<\/title>/, '<title>{{DOCUMENT_TITLE}}</title>') === normalize(template)
  if (initializing || (config && isFoundationHtml)) propose('index.html', desiredHtml, 'Apply the configured title to the neutral Foundation HTML.')
  else if (currentHtml !== null) preserve('index.html', 'Already initialized; preserve application HTML and its current title.')

  const ignore = read('.gitignore')?.toString('utf8') ?? ''
  // Place the directory rule last, so a previous negation cannot expose backups.
  const ignored = ignore.trimEnd().split(/\r?\n/).at(-1) === '.codex-tmp/'
  propose('.gitignore', Buffer.from(ignored ? ignore : appendSection(ignore, '# Local verification and recoverable backups\n.codex-tmp/')), 'Keep local backups out of version control; preserve existing ignore rules.')

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
    const order = (item) => item.path === '.gitignore' ? -1 : item.path === decisionItem.to ? 1 : 0
    writes.sort((a, b) => order(a) - order(b))
    for (const action of writes) {
      const file = pathFor(action.path)
      if (action.status === 'remove') unlinkSync(file)
      else { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, action.data) }
    }
    for (const folder of directories) {
      const directory = pathFor(folder)
      if (folder !== 'src' && existsSync(directory) && readdirSync(directory).length === 0) rmdirSync(directory)
    }
  } catch (error) {
    fail(`FOUNDATION_WRITE_FAILED: ${error.message}; inspect current state, do not retry blindly. Recovery: ${backup ?? 'only new files were planned'}`)
  }
  return { mode, source: manifest.source, revision: manifest.revision, dependencies, files: report(), changed: writes.length, backup: writes.length ? backup : null, status: 'FOUNDATION_APPLIED_VERIFY_LINT_BUILD_NEXT' }
}
