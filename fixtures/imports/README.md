# Synthetic incumbent exports

All content and identities in this directory are synthetic (`synthetic-pane-*`).
No provider account, key, production crawl or delivery is represented.

- `migration-report.json` extends `static-site-json-v1` with the documented
  migration inventory: a skipped page, a post linking to it, comments in all
  three states, an unfetched image, a form destination, a product and a plugin.
- `wordpress.xml` uses WordPress's WXR 1.2 RSS namespaces and fields:
  <https://wordpress.org/documentation/article/tools-export-screen/> and
  <https://developer.wordpress.org/reference/classes/wp_export/>. It contains
  two pages, 100 posts, 50 comments (17 approved, 17 pending, 16 spam), parent
  comment IDs, an author, a category and media references. It is a documented
  synthetic export, not a live WordPress.com account receipt.
- `wix.json` is an offline capture envelope with the published URL sitemap,
  blog RSS and captured HTML. The sitemap includes a missing page. Capture
  provenance does not establish owner domain control or execute a live crawl.
  Wix export limitations and RSS:
  <https://support.wix.com/en/article/exporting-or-embedding-your-wix-site-elsewhere>
  and <https://support.wix.com/en/article/wix-blog-adding-an-rss-button-to-your-blog>.
- `webflow.json` captures HTML and two named CSV collections; `framer.json`
  captures HTML and one CSV collection. CSV retains field headers and exact
  quoted, comma-containing and multiline values. Export references:
  <https://university.webflow.com/lesson/export-collection-content> and
  <https://www.framer.com/help/articles/how-to-import-and-export-cms-content/>.
- `durable.json` captures published HTML and a sitemap. It does not claim that
  Durable supplies an official archive/export format.

The JSON capture envelopes are Pane's documented offline interchange, not
invented official provider formats. CSV rows, posts, comments and media are
reported as exceptions while their native CMS/media targets remain absent.
`tests/pane-imports.test.mjs` and `scripts/imports-journey.mjs` exercise these
through the authenticated built Worker rather than parser-only calls.
