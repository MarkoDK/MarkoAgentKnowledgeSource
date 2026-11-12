import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { catalogRoot, loadSource } from './source-transfer.mjs'
import { packageApm, packageSkill } from './package-apm.mjs'

test('APM deploys exactly one Markdown entry point and keeps the catalog in apm_modules', () => {
  assert.deepEqual(packageApm({ check: true }).sources, ['ProjectFoundationSource', 'AppShellSource'])
  assert.equal(packageApm({ check: true }).files, 1)
  assert.deepEqual(readdirSync(packageSkill), ['SKILL.md'])
  assert.ok(readFileSync(join(packageSkill, 'SKILL.md'), 'utf8').includes('apm_modules/MarkoDK/MarkoAgentKnowledgeSource'))
  assert.equal(existsSync(join(packageSkill, 'assets')), false)
  assert.equal(existsSync(join(packageSkill, 'assets/catalog/AGENTS.md')), false)
  assert.equal(existsSync(join(packageSkill, 'assets/catalog/node_modules')), false)
  assert.equal(existsSync(join(packageSkill, 'scripts/package-apm.mjs')), false)
})

test('entry point resolves an installed package; transfer builds Foundation and AppShell without deployed TSX or source writes', async () => {
  const temporary = realpathSync(mkdtempSync(join(tmpdir(), 'coming-apm-contract-')))
  const installedSkill = join(temporary, '.agents/skills/marko-knowledge-agent')
  const modules = join(temporary, 'node_modules')
  try {
    cpSync(packageSkill, installedSkill, { recursive: true })
    assert.deepEqual(readdirSync(installedSkill), ['SKILL.md'])
    const installedPackage = join(temporary, 'apm_modules/MarkoDK/MarkoAgentKnowledgeSource')
    mkdirSync(installedPackage, { recursive: true })
    cpSync(join(catalogRoot, 'apm.yml'), join(installedPackage, 'apm.yml'))
    const packageScripts = join(installedPackage, '.agents/skills/marko-knowledge-agent')
    mkdirSync(join(packageScripts, 'scripts'), { recursive: true })
    for (const file of ['SKILL.md', 'scripts/source-transfer.mjs', 'scripts/project-foundation.mjs']) cpSync(join(catalogRoot, '.agents/skills/marko-knowledge-agent', file), join(packageScripts, file))
    for (const source of packageApm({ check: true }).sources) {
      const manifest = loadSource(source)
      const paths = new Set(['src/patterns/' + source + '/source.manifest.json', 'src/patterns/' + source + '/' + manifest.pattern, ...manifest.files.map(f => f.from), ...(manifest.resources ?? []).map(f => f.path), ...(manifest.screenshots ?? []).map(f => 'src/patterns/' + source + '/' + f)])
      for (const file of paths) {
        mkdirSync(dirname(join(installedPackage, file)), { recursive: true })
        cpSync(join(catalogRoot, file), join(installedPackage, file))
      }
    }
    const transfer = await import(pathToFileURL(join(packageScripts, 'scripts/source-transfer.mjs')).href)
    assert.equal(transfer.catalogRoot, realpathSync(installedPackage))
    const source = join(transfer.catalogRoot, 'src/patterns/AppShellSource/app/layout/AppShell.tsx')
    const original = readFileSync(source)
    const host = JSON.parse(readFileSync(join(catalogRoot, 'package.json'), 'utf8'))
    writeFileSync(join(temporary, 'package.json'), JSON.stringify({ private: true, type: 'module', scripts: { lint: 'oxlint src', build: 'tsc --noEmit && vite build' }, dependencies: host.dependencies, devDependencies: host.devDependencies }))
    writeFileSync(join(temporary, 'AGENTS.md'), '# Existing host instruction\n')
    assert.throws(() => transfer.runTransfer({ source: 'AppShellSource', target: temporary, mode: 'apply' }), /DEPENDENCY_MISSING/)
    assert.equal(existsSync(join(temporary, 'src')), false)

    // Reuse installed packages, with no access to authoring patterns or preview.
    symlinkSync(join(catalogRoot, 'node_modules'), modules, process.platform === 'win32' ? 'junction' : 'dir')
    const run = (source, mode, extra = {}) => transfer.runTransfer({ source, mode, target: temporary, ...extra })
    assert.match(run('ProjectFoundationSource', 'plan').status, /PLAN/)
    run('ProjectFoundationSource', 'apply')
    assert.match(run('ProjectFoundationSource', 'verify').status, /FOUNDATION_CONTRACT_OK/)
    const plan = run('AppShellSource', 'plan')
    assert.deepEqual(plan.files.filter(file => file.status === 'collision').map(file => file.to), ['src/App.tsx', 'src/main.tsx'])
    run('AppShellSource', 'apply', { replaceFiles: ['src/App.tsx', 'src/main.tsx'] })
    assert.match(run('AppShellSource', 'verify').status, /CODE_CONTRACT_OK/)
    assert.match(run('ProjectFoundationSource', 'verify').status, /FOUNDATION_CONTRACT_OK/)
    assert.equal(run('AppShellSource', 'apply').copied, 0)
    assert.match(readFileSync(join(temporary, 'AGENTS.md'), 'utf8'), /Existing host instruction/)
    assert.equal(existsSync(join(temporary, 'src/patterns')), false)
    assert.throws(() => transfer.runTransfer({ source: 'AppShellSource', target: transfer.catalogRoot, mode: 'plan' }), /Target must be/)
    assert.ok(readFileSync(source).equals(original))
    assert.deepEqual(readdirSync(installedSkill), ['SKILL.md'])
    assert.throws(() => transfer.runTransfer({ source: 'AppShellSource', target: join(temporary, 'apm_modules'), mode: 'plan' }), /Target must be/)

    writeFileSync(join(temporary, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { target: 'ES2023', lib: ['ES2023', 'DOM'], module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', allowImportingTsExtensions: true, noEmit: true, skipLibCheck: true, types: ['vite/client'] },
      include: ['src'],
    }))
    writeFileSync(join(temporary, 'vite.config.mjs'), "import {defineConfig} from 'vite'; import react from '@vitejs/plugin-react'; export default defineConfig({plugins:[react()]});\n")
    for (const args of [
      [join(modules, 'oxlint/bin/oxlint'), 'src'],
      [join(modules, 'typescript/bin/tsc'), '--project', join(temporary, 'tsconfig.json')],
      [join(modules, 'vite/bin/vite.js'), 'build'],
    ]) {
      const result = spawnSync(process.execPath, args, { cwd: temporary, encoding: 'utf8' })
      assert.equal(result.status, 0, result.stdout + result.stderr)
    }

    const targetFile = join(temporary, 'src/layout/AppShell.module.css')
    writeFileSync(targetFile, readFileSync(targetFile, 'utf8') + '\n/* test drift */\n')
    assert.throws(() => run('AppShellSource', 'verify'), /FIXED_FILE_DRIFT/)
  } finally {
    assert.equal(dirname(temporary), realpathSync(tmpdir()))
    assert.match(basename(temporary), /^coming-apm-contract-/)
    if (existsSync(modules)) {
      assert.ok(lstatSync(modules).isSymbolicLink())
      rmSync(modules, { recursive: true })
    }
    rmSync(temporary, { recursive: true })
  }
})
