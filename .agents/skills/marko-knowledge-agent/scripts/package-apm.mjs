import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { catalogRoot, loadSource } from './source-transfer.mjs'

// Add a Source only after its transfer contract is ready.
const sources = ['ProjectFoundationSource', 'AppShellSource']
export const packageSkill = join(catalogRoot, '.apm/skills/marko-knowledge-agent')
const authorSkill = join(catalogRoot, '.agents/skills/marko-knowledge-agent')

function safeFile(root, path) {
  if (typeof path !== 'string' || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid package path: ' + path)
  const output = resolve(root, path)
  if (relative(root, output).startsWith('..')) throw new Error('Package path escapes root: ' + path)
  let current = root
  for (const part of path.split('/')) {
    current = join(current, part)
    if (lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error('Package symlink rejected: ' + current)
  }
  return output
}

function filesIn(root, prefix = '') {
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const path = prefix ? prefix + '/' + entry.name : entry.name
    const full = safeFile(packageSkill, path)
    return entry.isDirectory() ? filesIn(full, path) : [path]
  })
}

export function packageApm({ check = false } = {}) {
  const files = new Map()
  files.set('SKILL.md', readFileSync(join(authorSkill, 'SKILL.md')))
  for (const name of ['source-transfer.mjs', 'project-foundation.mjs']) {
    files.set('scripts/' + name, readFileSync(join(authorSkill, 'scripts', name)))
  }
  // Validate all sources and collect the exact manifest payload before writing.
  for (const name of sources) {
    const manifest = loadSource(name)
    const folder = 'src/patterns/' + name + '/'
    const inputs = new Set([
      folder + 'source.manifest.json',
      folder + manifest.pattern,
      ...manifest.files.map(file => file.from),
      ...(manifest.resources ?? []).map(file => file.path),
      ...(manifest.screenshots ?? []).map(file => folder + file),
    ])
    for (const path of inputs) files.set('assets/catalog/' + path, readFileSync(safeFile(catalogRoot, path)))
  }
  // This exact generated directory is versioned so a Git install needs no build.
  safeFile(catalogRoot, '.apm/skills/marko-knowledge-agent')
  const existing = filesIn(packageSkill)
  const extra = existing.filter(path => !files.has(path))
  if (extra.length) throw new Error('Unexpected files in generated skill: ' + extra.join(', '))
  const differences = [...files].filter(([path, bytes]) => {
    const output = safeFile(packageSkill, path)
    return !existsSync(output) || !readFileSync(output).equals(bytes)
  })
  if (check && differences.length) throw new Error('APM_PACKAGE_DRIFT: run npm run apm:package. ' + differences.map(([path]) => path).join(', '))
  if (!check) {
    for (const [path, bytes] of differences) {
      const output = safeFile(packageSkill, path)
      mkdirSync(dirname(output), { recursive: true })
      writeFileSync(output, bytes)
    }
  }
  return { sources, files: files.size, updated: check ? 0 : differences.length, status: check ? 'APM_PACKAGE_CURRENT' : 'APM_PACKAGE_PREPARED' }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2)
    if (args.length && (args.length !== 1 || args[0] !== '--check')) throw new Error('Use no arguments or --check.')
    console.log(JSON.stringify(packageApm({ check: args.includes('--check') }), null, 2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
