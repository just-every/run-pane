# Work with your agent

Your agent can prepare a draft through Pane's authenticated command helper.
You preview the result and approve publication in the workspace.

## Give the helper a session

The helper uses the same native session and server permissions as the forms.
Store the session's Cookie header value in a private mode-0600 file outside
the checkout. Do not commit it or put it in command arguments. The helper does
not read browser cookies or print credentials.

Use the origin printed by `rer dev`; the port below is an example. Pass an
actual whole-site JSON file, including `name`, `description` and all five pages:

```sh
node scripts/pane.mjs status --origin http://127.0.0.1:8787 --session-file /private/path/session
node scripts/pane.mjs prepare --origin http://127.0.0.1:8787 --session-file /private/path/session --input /private/path/site.json
```

The [example site export](../fixtures/static-site.json) shows the whole-site
shape. Owners, admins and assigned editors may prepare; unassigned members remain read-only. The helper returns JSON
and a nonzero exit status when the request fails.

## Review the draft

`status` returns revision IDs. In your running app, a preview is at
`/preview/REVISION/home`, with the other four page slugs available through its
navigation. Open the preview as an owner, admin or assigned editor, inspect every page, then
return to the workspace and choose **Approve & publish** yourself.

## Other helper commands

Every command takes `--origin` and `--session-file`. These commands use the same
authorization and recorded approval paths as the app:

| Command | Additional arguments | Role |
| --- | --- | --- |
| `import-crawl-challenge` | `--input FILE` (source origin and provider) | Native owner or admin session only |
| `import-crawl` | `--input FILE` (challenge and explicit confirmation) | Native owner or admin session only |
| `import-plan` | `--input FILE` | Owner or admin |
| `import-apply` | `--input FILE --fingerprint HASH` | Owner or admin |
| `import-undo` | `--job ID` | Owner or admin; the job's original operator |
| `publish` | `--revision ID` | Owner |
| `rollback` | `--revision ID` (a revision that was live before) | Owner |
| `erase` | `--id ID` | Owner |

Use publication commands only with the owner's explicit approval of the exact
revision. The normal agent workflow ends at preparing a draft for a person to
review. Read [Move in a site](MOVE-IN.md) before applying or undoing imports.

## Private credentials and scoped integrations

Automated tests create their session file directly from the `Set-Cookie` response
of their own authorized native sign-in. Do not obtain it from a browser profile,
cookie jar or exported `storageState`. The helper refuses symlinks, non-regular
files, files not owned by the caller and permissions other than 0600. Credentials
never belong in arguments or repository files.

For an integration, the owner uses native sign-in to call
`POST /api/pane/tokens/create` with a name, explicit scopes, an optional active
`operatorId` (the owner by default), and `days` (7 by default, 1–30 allowed).
Save the returned `token` directly to a private 0600 file; it is shown once and
only its SHA-256 hash is stored. `GET /api/pane/tokens` lists metadata;
`POST /api/pane/tokens/revoke` takes its `id`. Dev/review sessions cannot create
persistent tokens. Tokens are excluded from installation archives.

Run the same helper with `--token-file PRIVATE_FILE` instead of `--session-file`.
Every token call also needs its bound person's current server permissions:

| Scope | Door |
| --- | --- |
| `status:read` | `status`: role and draft/live IDs only |
| `pages:read` | `pages`: current draft page inventory |
| `collections:read` | Reserved `collections` door; currently 501 until CMS-001 |
| `draft:write` | `prepare` / autosave |
| `imports:write` | `import-plan`, `import-apply`, `import-undo` |

An absent scope is refused. Tokens cannot publish, roll back, erase people or
messages, read activity, manage roles, or mint tokens. Deactivation, native role
changes and erasure invalidate tokens; Pane grant changes apply on the next
request. All API responses, including refusals, add an owner-readable audit
entry containing a fixed route label, method, result status, actor and an opaque agent-token ID, without
request bodies, queries or credentials. A refused call presenting an expired or
revoked token, or one whose person is deactivated, keeps that token's ID. Use native owner sign-in for explicitly
approved publication. ct approved these token defaults on 22 Oct; API-001
remains partial until the collection reader exists (CMS-001).

## Composable team roles

The owner calls `POST /api/pane/roles/invite` with `email`, `displayName` and a
nonempty `roles` array. It uses Base's native member invitation and withholds
its email until Pane grants are saved. No separate sign-in system is created.
`GET /api/pane/roles` lists native people and their Pane assignments;
`POST /api/pane/roles/set` takes `operatorId` and a `roles` array. An empty array
removes all content permissions immediately. Owners and admins retain native
permissions. Existing native members without a Pane assignment retain their
published read-only workspace access; an explicit Pane assignment replaces it.

| Role | Current access |
| --- | --- |
| `editor` | Edit/preview pages and search drafts; no publication or inbox/reporting |
| `inbox` | Read enquiries, explicitly send replies and manage their follow-up |
| `reporting` | Read aggregate traffic and goal reports; no drafts or enquiries |
| `author` | No content access yet; own-post writing/submission awaits CMS-004 |
| `comment-moderator` | No content access yet; queue/notifications await CMS-010 |

Roles compose by union. Every Pane handler and search/preview door checks them
on the server; dashboard responses omit inaccessible content. Only the owner
can assign roles. ct approved that default and the reserved author/moderator
behavior on 22 Oct; ROLE-001 stays partial until every role's doors exist.
Future collection, post and moderation
doors must implement their named permission and audit before shipping.

Enquiry replies require a unique `idempotency` key and explicit
`confirm: "send-reply"`, plus `id`, `subject` and `body`, at
`POST /api/pane/messages/reply`. The inbox supplies these through its reply
form. Only accepted provider sends mark the enquiry replied. Development/demo
mail is suppressed. Failed or uncertain sends retain their text and status;
a key is never automatically retried. Erasing the enquiry also erases replies,
and the existing backup-erasure fence rejects an older archive containing it.

## Owner activity and account erasure

The owner reads the Activity log on Sites or `GET /api/pane/activity` and exports
it through `/api/pane/activity/export`. Events use a monotonic sequence, time,
actor attribution and an opaque subject. Successful mutations and their audit
record commit together; native connection callbacks attribute the persisted
owner approval. API call outcomes are also recorded. No automatic purge runs.

`POST /api/pane/people/erase` requires a non-owner `id` and explicit
`confirm: "erase-person"`. It erases the account's email/name and external
identity associations, deactivates it, revokes sessions/links/tokens and removes
its activity attribution, including its tokens' IDs, while keeping events. It does not erase authored
business content or implement PRIV-002's complete person discovery or older
account-backup fencing. ct approved the retention/anonymization policy on
22 Oct; those boundaries keep AUDIT-001 partial. Last-owner protection is preserved.


## Explicit published-site capture

The `import-crawl-challenge` and `import-crawl` helper commands use the existing
native session file. Scoped agent tokens cannot authorize outbound crawling.
They do not apply content or publish. Follow the [controlled crawl steps](MOVE-IN.md#controlled-published-site-crawls)
to prove the exact source hostname by DNS and explicitly approve each capture.
The returned `source` is the exact export text to review and later pass to
`import-apply`; its `plan.fingerprint` approves only those bytes.
