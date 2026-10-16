import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sitePreview } from '@runeditrun/rer/internal/cli/site-preview.mjs'

// Exercise the same built files and HTTP router that rer dev uses for RER_SITE.
test('the run site opens the run instructions and every linked documentation page', async () => {
  const site = await sitePreview('dist/site', { ports: Array.from({ length: 10 }, (_, index) => 47470 + index) })
  try {
    const visited = new Set()
    async function open(path) {
      const response = await fetch(site.url + path)
      assert.equal(response.status, 200, path)
      return response.text()
    }
    const home = await open('/')
    const links = html => [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1].replaceAll('&amp;', '&'))
    assert.ok(links(home).includes('/run'), 'the homepage offers the local run journey')
    await open('/run')
    assert.ok(links(home).includes('/docs'), 'documentation is reachable from the homepage')
    const pending = ['/docs']
    while (pending.length) {
      const path = pending.shift()
      if (visited.has(path)) continue
      visited.add(path)
      const html = await open(path)
      for (const href of links(html)) {
        const target = new URL(href, site.url + path)
        if (target.origin !== site.url || !target.pathname.startsWith('/docs')) continue
        if (!visited.has(target.pathname)) pending.push(target.pathname)
      }
    }
    assert.ok(visited.size > 1, 'the docs index opens the Markdown guides')
    assert.equal((await fetch(site.url + '/page-that-does-not-exist')).status, 404)
  } finally { await site.close() }
})
