import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { catalogRoot } from './source-transfer.mjs'
import { packageApm, packageSkill } from './package-apm.mjs'

test('APM package is current and contains only the two ready Source contracts', () => {
  assert.deepEqual(packageApm({ check: true }).sources, ['ProjectFoundationSource', 'AppShellSource'])
  assert.equal(existsSync(join(packageSkill, 'assets/catalog/AGENTS.md')), false)
  assert.equal(existsSync(join(packageSkill, 'assets/catalog/node_modules')), false)
  assert.equal(existsSync(join(packageSkill, 'scripts/package-apm.mjs')), false)
})

test('installed skill applies Foundation and AppShell in its own host, builds, and protects its sources', async () => {
  const temporary = realpathSync(mkdtempSync(join(tmpdir(), 'coming-apm-contract-')))
  const installedSkill = join(temporary, '.agents/skills/marko-knowledge-agent')
  const modules = join(temporary, 'node_modules')
  try {
    cpSync(packageSkill, installedSkill, { recursive: true })
    const transfer = await import(pathToFileURL(join(installedSkill, 'scripts/source-transfer.mjs')).href)
    assert.equal(transfer.catalogRoot, realpathSync(join(installedSkill, 'assets/catalog')))
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
