// After rer deploy, prove the local and hosted public doors against its record,
// then remove only the resources that rer recorded for this test environment.
import assert from 'node:assert/strict'
import { readFile, readdir, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { runtime } from '../tests/runtime.mjs'

const environment = process.argv[2]
assert.match(environment ?? '', /^sx-[a-z0-9-]+$/, 'Use an isolated sx test environment, never production')
const recordPath = `.rer/deploy/${environment}.json`
const state = JSON.parse(await readFile(recordPath, 'utf8'))
assert.equal(state.accountId, process.env.CLOUDFLARE_ACCOUNT_ID)
const receipt = state.receipt
const expected = {sourceSha: receipt.source.sha, fingerprint: receipt.fingerprint, versionId: receipt.provider.versionId}
const summary = {journey: 'deployment identity, migrations and removal', sourceSha: receipt.source.sha, environment, local: false, deployed: false, migrations: [], removed: false}
let local
try {
 local = await runtime({bindings: {RER_DEPLOY_SOURCE: expected.sourceSha, RER_DEPLOY_FINGERPRINT: expected.fingerprint, RER_VERSION: {id: expected.versionId}}})
 const health = await local.request('/health')
 assert.equal(health.status, 200)
 assert.deepEqual((await health.json()).deployment, expected)
 assert.equal((await local.request('/unknown-installed-path')).status, 404)
 summary.local = true
 const live = await fetch(new URL('/health', receipt.origin), {redirect: 'manual', signal: AbortSignal.timeout(30000)})
 assert.equal(live.status, 200)
 const body = await live.json()
 assert.equal(body.ok, true)
 assert.deepEqual(body.deployment, expected)
 assert.equal((await fetch(new URL('/unknown-installed-path', receipt.origin), {redirect: 'manual', signal: AbortSignal.timeout(30000)})).status, 404)
 summary.deployed = true
 const database = receipt.resources.d1.find(item => item.binding === 'DB')
 const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${state.accountId}/d1/database/${database.id}/query`, {
  method: 'POST', headers: {Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json'},
  body: JSON.stringify({sql: 'SELECT name,sha256,state FROM d1_migrations ORDER BY name'}), signal: AbortSignal.timeout(30000),
 })
 assert.equal(response.status, 200)
 const ledger = await response.json()
 assert.equal(ledger.success, true)
 const rows = ledger.result[0].results
 const files = (await readdir('migrations/core')).filter(name => name.endsWith('.sql')).sort()
 assert.deepEqual(rows.map(row => row.name), files)
 for (const row of rows) {
  assert.equal(row.state, 'applied')
  assert.equal(row.sha256, createHash('sha256').update(await readFile('migrations/core/' + row.name)).digest('hex'))
 }
 assert.deepEqual(receipt.migrations.find(item => item.binding === 'DB').history, rows.map(({name, sha256}) => ({name, sha256})))
 summary.migrations = files
} finally {
 await local?.mf.dispose()
 execFileSync('rer', ['deploy', '--environment', environment, '--remove', '--yes', '--non-interactive'], {stdio: 'inherit'})
 await assert.rejects(access(recordPath), {code: 'ENOENT'})
 summary.removed = true
 console.log(JSON.stringify(summary))
}
