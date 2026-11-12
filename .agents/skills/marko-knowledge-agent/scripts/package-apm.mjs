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
  for (const name of sources) loadSource(name)
  const header = readFileSync(join(authorSkill, 'SKILL.md'), 'utf8').match(/^---\r?\n[\s\S]*?\r?\n---/)
  if (!header) throw new Error('Skill frontmatter missing.')
  const entry = header[0].replaceAll('\r\n', '\n') + `

# Marko KnowledgeSource — APM ulaz

Ovaj fajl samo pronalazi instalirani paket; ne sadrži kopiju kataloga.

1. U ciljnom projektu pronađi MarkoAgentKnowledgeSource unutar apm_modules.
   Uobičajena putanja je apm_modules/MarkoDK/MarkoAgentKnowledgeSource.
   Ako se razlikuje, proveri apm.lock.yaml i pronađi paket čiji apm.yml ima
   name: marko-agent-knowledge-source. Ne koristi autorov lokalni checkout.
   Ako paket nedostaje ili je izbor dvosmislen, prijavi problem instalacije.
2. Iz tog paketa pročitaj .agents/skills/marko-knowledge-agent/SKILL.md.
   To je jedini globalni ugovor. Ne čitaj razvojni AGENTS.md paketa.
3. Katalog i izvršne skripte ostaju u tom paketu, read-only. U komandama
   <catalog> znači root pronađenog paketa; <target> je root React projekta.
   Ne kopiraj katalog, skripte ili druge skillove u aplikaciju.

Ova APM verzija podržava ${sources.join(' i ')}.
Instalacija sama ne primenjuje nijedan pattern. Posle pronalaska ugovora
izvrši korisnikov poziv kroz njegov postojeći plan/apply/verify workflow.
`
  const files = new Map([['SKILL.md', Buffer.from(entry)]])
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
