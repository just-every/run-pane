// Explicit browser verification of the production build, using isolated native fixtures.
import { spawnSync } from 'node:child_process'
const shard=process.env.PANE_BROWSER_SHARD??'all'
if(!['all','core','canvas'].includes(shard))throw Error('Choose a known browser shard.')
if(shard==='all'||shard==='core'){
 process.env.PANE_BROWSER_FIXTURE='1'
 const fixture=await import('../tests/browser-runtime.mjs')
 try {
  await import('./browser-journey.mjs')
  await import('./editing-journey.mjs')
  await import('./search-journey.mjs')
 } finally {await fixture.stop()}
}
// Each self-contained journey owns a fresh native D1/auth fixture. Unrelated
// journeys must not spend one another's sign-in budget or inherit site state.
const env={...process.env}
delete env.PANE_BROWSER_FIXTURE
const journeys=['imports', 'outage', 'custody', 'access', 'privacy', 'acknowledgment', 'traffic', 'analytics', 'navigation', 'pages', 'redirects', 'scheduling', 'promotions', 'gates', 'forms', 'components-code', 'device', 'accessibility', 'ai', 'posts', 'lifecycle', 'collections', 'collection-template','comments', 'templates']
const canvas=new Set(['components-code','device','accessibility','ai','posts','lifecycle','collections','collection-template','comments'])
for(const name of journeys.filter(name=>shard==='all'||(shard==='templates'?name==='templates':name!=='templates'&&(shard==='canvas')===canvas.has(name)))) {
 const result=spawnSync(process.execPath, [`scripts/${name}-journey.mjs`], {env, stdio:'inherit'})
 if (result.error) throw result.error
 if (result.status!==0) throw Error(`${name} journey failed (${result.signal ?? result.status})`)
}
