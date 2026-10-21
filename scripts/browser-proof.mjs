// Explicit browser verification of the production build, using an isolated native fixture.
process.env.PANE_BROWSER_FIXTURE='1'
const fixture=await import('../tests/browser-runtime.mjs')
try {
 await import('./browser-journey.mjs')
 await import('./editing-journey.mjs')
 await import('./search-journey.mjs')
 await import('./privacy-journey.mjs')
 await import('./acknowledgment-journey.mjs')
} finally {await fixture.stop()}
