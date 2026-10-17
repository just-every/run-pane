# Move in a static site

The move-in importer accepts one UTF-8 JSON object in the `static-site-json-v1`
format. See [the complete fixture](../fixtures/static-site.json).

## Move in through the workspace

1. Sign in as an owner or admin. Choose **Imports**, then **Paste an export**.
2. Paste the whole export into **Source JSON**, including `schemaVersion`, the
   site name, description and all five pages. This differs from the editor's
   **Pages JSON**, which takes only the pages array.
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

The importer accepts this JSON format, not a website address, HTML folder or
a provider-specific archive. Convert your existing site to the format below
before checking it. For another route, your agent can use
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

All five slugs are required exactly once. The importer normalizes the site with
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
   `state`; one site is one effect in one publication batch.
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
