// Explicit browser verification of the production build, using isolated native fixtures.
import { spawnSync } from 'node:child_process'
process.env.PANE_BROWSER_FIXTURE='1'
const fixture=await import('../tests/browser-runtime.mjs')
try {
 await import('./browser-journey.mjs')
 await import('./editing-journey.mjs')
 await import('./search-journey.mjs')
} finally {await fixture.stop()}
// Each self-contained journey owns a fresh native D1/auth fixture. Unrelated
// journeys must not spend one another's sign-in budget or inherit site state.
const env={...process.env}
delete env.PANE_BROWSER_FIXTURE
for (const name of ['privacy', 'acknowledgment', 'traffic', 'navigation']) {
 const result=spawnSync(process.execPath, [`scripts/${name}-journey.mjs`], {env, stdio:'inherit'})
 if (result.error) throw result.error
 if (result.status!==0) throw Error(`${name} journey failed (${result.signal ?? result.status})`)
}
