import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from 'parse5'
import { sitePreview } from '@runeditrun/rer/internal/cli/site-preview.mjs'

// Exercise the same built files and HTTP router that rer dev uses for RER_SITE.
test('the run site opens the run instructions and every linked documentation page without installation sign-in links', async () => {
  const site = await sitePreview('dist/site', { ports: Array.from({ length: 10 }, (_, index) => 47470 + index) })
  try {
    const visited = new Set()
    async function open(url) {
      const response = await fetch(url)
      assert.equal(response.status, 200, url.href)
      assert.match(response.headers.get('content-type'), /^text\/html\b/, url.href)
      const document = parse(await response.text())
      function elements(node) {
        return [node, ...(node.childNodes ?? []).flatMap(elements)]
      }
      const nodes = elements(document)
      const attribute = (node, name) => node.attrs?.find(attr => attr.name === name)?.value
      const base = nodes.find(node => node.tagName === 'base' && attribute(node, 'href') !== undefined)
      const baseUrl = base ? new URL(attribute(base, 'href'), response.url) : response.url
      const links = nodes.filter(node => ['a', 'area'].includes(node.tagName) && attribute(node, 'href') !== undefined)
        .map(node => new URL(attribute(node, 'href'), baseUrl))
      for (const target of links) {
        assert.doesNotMatch(decodeURIComponent(target.pathname), /^\/(?:sign[-_]?in|log[-_]?in|auth|__dev)(?:\/|$)/i,
          `${url.href} must not offer installation sign-in: ${target.href}`)
      }
      return links
    }
    const home = await open(new URL('/', site.url))
    const destination = path => home.find(target => target.origin === site.url && target.pathname === path)
    const run = destination('/run')
    assert.ok(run, 'the homepage offers the local run journey')
    await open(run)
    const docs = destination('/docs')
    assert.ok(docs, 'documentation is reachable from the homepage')
    const pending = [docs]
    while (pending.length) {
      const url = pending.shift()
      if (visited.has(url.pathname)) continue
      visited.add(url.pathname)
      for (const target of await open(url)) {
        if (target.origin !== site.url || !/^\/docs(?:\/|$)/.test(target.pathname)) continue
        if (!visited.has(target.pathname)) pending.push(target)
      }
    }
    assert.ok(visited.size > 1, 'the docs index opens the Markdown guides')
    assert.equal((await fetch(site.url + '/page-that-does-not-exist')).status, 404)
  } finally { await site.close() }
})
