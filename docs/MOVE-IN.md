# Move in a static site

The move-in importer accepts one UTF-8 JSON object in the `static-site-json-v1`
format. See [the complete fixture](../fixtures/static-site.json).

## Move in through the workspace

1. Sign in as an owner or admin and choose **Moves**.
2. Paste the whole export into **Source JSON** under **Import a site**,
   including `schemaVersion`, the site name, description and your complete page inventory.
3. Choose **Check import**. This check creates no draft or import job.
4. On **Review your move-in**, read every page. **Import identity** shows the
   exact source fingerprint. Choose **Approve import** to apply that reviewed
   source, or **Cancel** to return without applying it.
5. Follow **Preview draft** in the workspace. The owner chooses
   **Approve & publish** only after checking the preview.

An import creates an unpublished draft; it never changes the live website by
itself. To remove that imported draft, the operator who applied it can choose
**Undo import** in Imports. A published revision cannot be undone: publish or
restore another revision first. An import that has changed since application
is protected by a conflict refusal. Undo retains its source and journal.

The workspace paste importer accepts exports rather than an address or an HTML folder. The authenticated helper can also capture a published site after the explicit DNS proof described below.
The additional documented WXR and capture formats are described below. For another route, your agent can use
[the authenticated helper](AGENT.md).

## Export format

```json
{
  "schemaVersion": 1,
  "name": "Your business",
  "description": "A short description",
  "pages": [
    { "slug": "home", "title": "Home", "body": "Welcome" },
    { "slug": "about", "title": "About", "body": "Our story" },
    { "slug": "services", "title": "Services", "body": "What we do" },
    { "slug": "hours", "title": "Hours", "body": "When we open" },
    { "slug": "contact", "title": "Contact", "body": "Get in touch" }
  ]
}
```

Page slugs must be unique and follow the ordinary editor URL rules. At least one page is required for a native site snapshot. The importer normalizes the site with
the same validator and content hash used by the editor. A name and each page
title may contain at most 120 characters; the description at most 500; each page
body at most 20,000. Names, titles and bodies must contain text. The whole source
is limited to 512,000 UTF-8 bytes. Bodies are plain text; HTML-looking text is
retained as text and must be rendered through ordinary escaped text nodes.

## Review, apply and undo

1. `planMoveIn(db, actor, source)` performs a SELECT-only Base dry run. It returns
   the complete plan, including `fingerprint`, counts, diagnostics and the single
   proposed revision effect. It creates no revision, job or journal rows.
2. Show that plan for review. Pass its exact fingerprint and the same source text
   to `applyMoveIn(db, actor, source, reviewedFingerprint)`. The server recomputes
   the deterministic plan. A changed source, actor or fingerprint cannot publish
   that reviewed operation. The return value includes the Base job `id` and
   `state`; one supported site is one effect in one publication batch.
3. Applying creates a new `pane_revisions` snapshot. It becomes the newest draft
   through the normal revision ordering. It does not change `pane_state.live`.
4. `undoMoveIn(db, actor, jobId)` delegates to Base's strict reversal. It removes
   only that import's unchanged native revision and records the reversal.

Each byte-identical source and actor has a deterministic source and target
identity. Retrying apply resumes/replays the same reviewed operation instead of
creating duplicate revisions. A changed source, including changed whitespace,
has a different artifact identity. Jobs stay bound to the operator that created
them. A different owner or admin cannot take over that operator's job.

Undo refuses a revision that is currently published. Publish another revision
first, then undo. The native foreign key and guarded DELETE also protect against
a publish racing the undo. A change to the imported site's stored JSON, content
hash, actor, timestamp or kit revision evidence blocks reversal with a conflict;
it never deletes the edited revision. The Base reversal may retain `undoing`
intent after a native conflict; once the conflict is deliberately resolved,
calling undo again resumes it. Completed reversal retains the source originals,
plan, provenance and journal. Replaying that same operation does not create a
fresh import after it was undone.

The HTTP handler must validate origin and the native session before invoking
these functions. Active owners and admins may import; members are denied.
Every Base plan/read or write boundary independently consults `oa_operators`
for the exact operator ID, role, active status and captured version. Base repeats
the SQL authorization predicate inside each publication or reversal transaction.
A role/status/version change after preflight therefore invalidates the batch.

## Durable storage

`migrations/core/0016_import_kit.sql` materializes Base's `d1Schema` and every
dependent schema export in the canonical initializer's order. Requests do not
initialize schema. Base owns `ik_jobs`, exact originals and chunks,
`ik_sources`, `ik_provenance`, `ik_batches` and its D1 custody, checkpoint,
assertion and reversal tables.

Base `ik_jobs` contains `id`, `state`, `fingerprint`, `principal_id`, destination,
namespace, mapping version, operation key, retained plan, checkpoint, total,
fence, error and reversal fields. Pane adds `created_at TEXT NOT NULL`, filled
by an insert trigger with a UTC ISO timestamp, so the dashboard can select
`id,state,created_at`. `pane_import_targets(revision_id,kit_revision,created_at)`
links native revisions to Base's applied revision evidence. That evidence is
immutable while present and deleted by cascade only when the native revision is
removed. Exact native snapshots guard every field, including timestamps.

## Source provenance

`src/modules/import-kit` and `src/modules/d1-transport` are Base copies, recorded
with the Base commit they come from in `base-copies.json` and moved together by
`refresh-base`; `verify-base` checks their bytes. The engine, guards and schema
mechanisms are Base's, unchanged.

`src/pane/import-source.ts`, `import-authority.ts`, `import-targets.ts`
and `src/pane/imports.ts` are Pane's product integration. Native writes return
inert D1 SQL to Base; they do not run a parallel journal or custom undo engine.

## Migration inventory and retained reports

The current page importer also accepts WordPress WXR 1.0–1.2 XML. It imports
supported pages as unpublished semantic snapshots (headings, lists, inline formatting, anchors and inline destinations). It inventories posts,
comments (including parent ID, source post and moderation state), authors,
taxonomy, menus, shortcodes and media as explicit exceptions. It does **not**
create native posts/comments or download media. The documented synthetic WXR
fixture contains 100 posts and 50 comments; those are source counts, not a claim
that those unsupported records were applied.

A static JSON export may include `oldUrl` on each page and this optional field:

```json
{
  "migration": {
    "origin": "https://your-old-site.example",
    "items": [
      {"kind":"post","title":"Old story","oldUrl":"https://your-old-site.example/story","html":"<p>Source body</p>"},
      {"kind":"comment","title":"Comment on Old story","state":"pending"},
      {"kind":"media","title":"Source image","oldUrl":"https://your-old-site.example/image.png"},
      {"kind":"form","title":"Contact","destination":"mailto:old-recipient@example.test"}
    ]
  }
}
```

`kind` is page, post, comment, collection-item, event, gallery, media, product,
form, author, taxonomy, menu or unsupported. Items are inventory-only; they do
not activate recipients, comments, products, marketing consent or connections.
Source HTML is parsed as data and never executed. Document types/entities are
refused. No HTTP request, DNS change or old-host cutover occurs during import.
Unknown site/page fields are named as unsupported rather than silently dropped.

Before apply the report explains that supported semantic page markup is preserved with Pane styling, while original visual layout, interactive widgets and media delivery may not be recreated. Exception counts include partially mapped pages with fidelity warnings as well as wholly unsupported items; they are not subtracted from the planned counts.

Before apply the report shows source, planned and exception counts for every
content type, comment counts by state, the inventory/URL map, form destinations,
unfetched media and history left with the old platform. A reviewed map is not
proof of a redirect on the old domain. Apply rechecks the stored native snapshot,
per-type applied counts, text/fields, link destinations and missing internal
links. It also parses the actual production-rendered page output to check
visible text, link/button destinations, heading levels, list types/items and
inline images, and flags old-domain redirects that have not been verified. Page heading/list/link/formatting and section-anchor fidelity is checked against the rendered native DOM. Captured sites also compare the complete visible page text, including native navigation and framing; body-only WXR exports explicitly retain an unverified whole-page comparison instead of claiming a match. Missing media, interactive buttons and unsupported widgets remain explicit failures. Rich editing and native post/item bodies remain open. Malformed link and image references, including images with no source, are listed as unresolved exceptions without preventing review of the other content. A failure stays
visible; it never becomes an invented successful import.

Choose **View report** on the applied job to reopen the report from the exact
retained original bytes, or call `import-plan` with a JSON request containing
`job` through `/api/pane/import/dry-run`. The same applying owner/admin and the
existing `imports:write` scope are required. Reopening uses the current stored
snapshot, so later changes are detected. Undo leaves the source/report in
custody and shows zero applied content.

## Offline published-site captures

Pane also reads its own `wix-snapshot-v1`, `webflow-snapshot-v1`,
`framer-snapshot-v1` and `durable-snapshot-v1` JSON envelopes:

```json
{
  "format": "webflow-snapshot-v1",
  "origin": "https://your-old-site.example",
  "name": "Your site",
  "sitemap": "<urlset><url><loc>https://your-old-site.example/</loc></url></urlset>",
  "documents": [{"url":"https://your-old-site.example/","title":"Home","html":"<h1>Welcome</h1><p>Our studio.</p>"}],
  "collections": [{"name":"Services","csv":"Name,Slug,Description\nRepair,repair,Original description\n"}]
}
```

Each captured document needs a unique same-origin HTTP(S) URL and HTML text.
Documents may declare `kind` as page, post, collection-item, event or gallery;
only supported pages map to native semantic drafts. The optional flattened URL sitemap
contributes uncaptured URLs as exceptions.
Wix captures additionally require the sitemap and an RSS channel in `rss`;
RSS URLs classify blog posts and detect missing captured posts. This is an
**offline capture only**: controlled live crawling and owner domain-control
proof remain open under IMPORT-003. Do not treat uploaded HTML as authority to
fetch a host. Webflow and Framer `collections` contain separate named official
CSV exports; every row/field is retained and listed as a collection exception
until CMS-001/CMS-007 provide native destinations. Durable has no CSV requirement.
There is no claim that this envelope is any provider's official export format.

The entire submitted source is limited to 512,000 UTF-8 bytes. Pages use the
current editor's variable inventory (at least one valid page, no fixed five-page
requirement), with the existing title/body limits. An inventory-only import with
no supported pages creates no native page revision. See
[documented source fixtures](../fixtures/imports/README.md) for boundaries and
examples. These offline readers supply no network authority, native CMS, original-media storage or arbitrary
old-domain redirects.


## Controlled published-site crawls

A native owner or admin can explicitly capture a Wix, Webflow, Framer or Durable
published site through the authenticated helper. The adopted conservative default
is pending ct approval under IMPORT-003/004: scoped tokens and members cannot
start crawls; only the exact DNS-controlled public HTTPS origin is fetched;
there is no automatic capture, form submission, media fetch, redirect following,
DNS write, cutover or publication. Source requests send no installation cookie
or Authorization header. Cloudflare's public DNS-over-HTTPS resolver checks the
TXT proof and screens public A/AAAA answers before each source request.

1. Save a private JSON input such as
   `{"origin":"https://your-old-site.example","provider":"wix"}`. Supported
   providers are `wix`, `webflow`, `framer` and `durable`.
2. Run `node scripts/pane.mjs import-crawl-challenge --origin INSTALLATION_ORIGIN --session-file PRIVATE_SESSION --input PRIVATE_INPUT`.
   Publish the returned TXT record at `_pane-import.SOURCE_HOSTNAME` yourself.
   No source page has been requested. The challenge binds the exact origin,
   provider, native operator and account version and expires after 15 minutes.
3. Save a second private JSON input containing the returned `challenge` and
   `"confirm":"crawl-source"`. For Wix, `/blog-feed.xml` is the default RSS
   path; set `rssPath` to another same-origin path if needed. Webflow/Framer
   inputs may also include the named `collections` CSV exports documented above.
4. Run `node scripts/pane.mjs import-crawl --origin INSTALLATION_ORIGIN --session-file PRIVATE_SESSION --input PRIVATE_INPUT`.
   The server checks the DNS proof before any source page request. It reads
   `/sitemap.xml` (including up to ten child sitemaps), the Wix RSS, and HTML
   pages discovered through same-origin links. No source script runs.
5. Read `plan.report`, save the returned `source` string as an export file,
   preview its mapped pages, and apply only with `plan.fingerprint` through the
   existing `import-apply` command. A crawl itself creates no revision/import job.
   An ordinary `import-plan` of those exact bytes returns the same reviewed plan.
6. Undo through the normal unpublished-draft door. The retained report keeps
   the exact actor-bound capture receipt, including after undo. It does not
   authorize any future network request; another capture needs another explicit
   confirmation and a still-valid proof. Remove the temporary DNS TXT record
   when finished. Pane never changes it for you.

Captures stop at 100 discovered URLs, 120 source requests, a 45-second crawl
window, 100 KB per HTML page and the import's 512,000-byte source limit. A source
that exceeds the URL/map/export limits is refused. Unfetched individual pages,
HTTP failures, denied redirects and oversized pages remain in the inventory
with reasons. RSS contributes every post URL even if its HTML cannot be captured.
Native posts/comments/collections, responsive media and live old-URL redirects
remain explicit exceptions, so these import clauses stay partial.

The receipt is bound to the captured bytes' SHA-256 and the operator, held in
`pane_import_crawls`, and included in installation archives. It contains public
source-origin/provider/time metadata and no DNS challenge or session credential.
The owner-readable audit records the explicit capture using its opaque hash.
An uploaded capture with changed bytes or invented provenance cannot inherit a
verified receipt. No live provider/sandbox receipt is claimed by the synthetic
DNS/source-network fixtures.


## Preserved page bodies

Mapped HTML pages keep supported heading levels, paragraphs, ordered/unordered
and nested lists, inline emphasis, quotes, section IDs, link positions and
safe external/mail/phone/SMS destinations. Internal links resolve through the
reviewed source URL map; draft links stay within that draft. New-tab links get
`noopener noreferrer`. Source scripts, styles, handlers and widgets never run;
source images stay inert, retaining their alternative text and captions while
the report names the missing native media copy.

An imported structured body is shown read-only in the existing page editor so
an ordinary text save cannot silently discard its headings and links. Title,
visibility and other page settings keep their existing draft/approval behavior.
To update the structured body, edit and re-import the source. PAGE-018, PAGE-019 and
CMS-011 inherit safe rich-body editing with PAGE-006 autosave/undo/conflict
protection; this reader does not claim those editors or native post/item/comment
targets are complete. Standard native JSON plain-text pages remain editable.
