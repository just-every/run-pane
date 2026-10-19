# Pane

![Pane](public/brand/mark.svg)

Your website, finally yours. Pane is the free, open source website builder a
small business runs on its own account. Today it runs a five-page website
(Home, About, Services, Hours and Contact) with a contact inbox: prepare a
draft, preview every page, publish, and roll back in one step. Pane is free and
open source under the MIT license. Your installation stores the site and inbox
in Cloudflare D1. [CONTRACT.md](CONTRACT.md) is the product Pane is being built
toward, clause by clause, with how close the code is today.

## Try the demo

[demo.run-pane.com](https://demo.run-pane.com/) opens your own throwaway copy of Pane,
signed in as the owner of Cedar Street Studio, a sample furniture workshop with
four months of versions, a draft waiting for approval and a contact inbox. It ends
after an hour and sends nothing to anyone. `rer demo` runs the same copy on your computer.

## Guides

- [Getting started](docs/GETTING-STARTED.md): launch Pane and prepare your first pages.
- [Preview, publish and restore](docs/PUBLISHING.md): change your website with a preview first.
- [Inbox and visits](docs/INBOX-AND-VISITS.md): read messages and understand page counts.
- [Move in a site](docs/MOVE-IN.md): review a site export and import it as a draft.
- [Back up and restore](docs/BACKUP-RESTORE.md): keep a private copy of your site and inbox.
- [Work with your agent](docs/AGENT.md): prepare drafts through the authenticated helper.

## Run Pane on your computer

Install rer, then start Pane. These are the same two lines as the
[Run page](https://run-pane.com/run):

```sh
curl -fsSL https://runeditrun.com/install.sh | sh
rer dev just-every/run-pane
```

The installer brings its own Node when you have no Node 22 or later. If it ends
with a line to run, run it before the second line. Already have Node 22 or
later? One line does both:

```sh
npx -y @runeditrun/rer dev just-every/run-pane
```

To start it again later, run `cd run-pane && rer dev`. Pane pins Node
**22.20.0** and pnpm **10.12.4**; rer selects them.

`rer dev` installs the pinned dependencies, sets up a fresh local installation and
prints progress. Allow ten minutes on a fresh computer. A repeated invocation
resumes the same installation. Open its private `RER_OPEN` link to sign in as the
local owner, then confirm the owner at **Finish setup**. Keep that link private.
Development sends no external mail. Stop with `rer dev --stop` before building,
verification or export. `rer dev --as admin` and `rer dev --as member` provide local
role journeys; they do not grant access on a hosted install.

For an installation with your real mailbox, run `npx -y @runeditrun/rer setup just-every/run-pane`
in place of the one line and enter it at the prompt, then `cd run-pane && rer dev`.

## Do the first jobs

1. Open your workspace at `/app`. Start with your own five pages or copy the
   documented example from [fixtures/static-site.json](fixtures/static-site.json).
   The five route slugs are `home`, `about`, `services`, `hours`, `contact`.
   The editor's **Pages JSON** field accepts the fixture's **pages array**, while the
   move-in form accepts the **whole fixture**. Page bodies are plain text;
   HTML is escaped.
2. Prepare a draft, follow its preview link, and inspect all five pages. The
   owner chooses **Approve & publish**. Open `/site` to see the live version. Admins may
   prepare and preview; members may read the workspace. Only owners publish,
   roll back or erase inbox messages. `/auth/operators` manages invitations.
3. Send a message from the live Contact page. Return to the inbox at `/app`.
   Messages stay in D1; there is no email forwarding. The visit totals count
   page views without cookies or visitor IDs, respect DNT/GPC, and are approximate
   (reloads count; bots can count). No IP address, user agent or referrer is stored.
4. Prepare a changed draft and preview it. Publish it, then choose **Restore live**
   on the earlier revision. Publishing and rollback records show the approving
   operator's ID, exact revision and time.
5. Use **Imports** → **Paste an export** → **Check import** to review a whole static-site JSON export,
   and approve its fingerprint. It creates an unpublished draft. Undo it before
   publishing. See [MOVE-IN.md](docs/MOVE-IN.md) for validation and conflict rules.

The first release is described in [ACCEPTANCE.md](ACCEPTANCE.md).

## Agent commands

Agents prepare; a person reviews the preview and approves publication. The API
uses the same native session and server permissions as the forms. Store a session
Cookie header in a private mode-0600 file, outside this checkout; never commit it.
The helper does not read browser cookies or print credentials.

```sh
node scripts/pane.mjs status --origin http://127.0.0.1:8787 --session-file /private/path/session
node scripts/pane.mjs prepare --origin http://127.0.0.1:8787 --session-file /private/path/session --input fixtures/static-site.json
```

Use the origin printed by `rer dev`. `status` returns revision IDs; previews are
`/preview/REVISION/home`. The person publishes from the browser. Owner-authorized
`publish --revision ID` and `rollback --revision ID` use the same recorded approval
path. Other helper verbs: `import-plan --input FILE`, `import-apply --input FILE
--fingerprint HASH`, `import-undo --job ID`, and `erase --id ID`.

## Backup, restore and deploy

```sh
rer dev --stop
rer export --output /private/path/pane.rer
# In an empty destination with the same code and dependencies:
rer import --input /private/path/pane.rer --yes
rer dev
```

Archives contain customer data: keep them private. Local restore retains owner records;
`rer dev` opens a fresh local session and may ask you to confirm the owner again. Active sessions, local dev
identities, secrets and transient runtime state are excluded. To fence a backup
made before an erasure, supply the later archive from the same installation:
`rer import --input OLD --journal LATER --yes`. A backup containing erased rows
is refused. A fresh destination cannot know about an erasure without that later
journal. Do not reset the only copy of your data. `rer reset --yes` deletes local
state and settings.

Deployment uses your own **RunEditRun Cloudflare account** and the Base owner-account
kit, never this repository's author credentials:

```sh
rer deploy --dry-run
rer deploy
rer signin
```

The dry run validates and builds without provider calls. For real deployment,
follow the credential/setup prompts and [RUN-LOCALLY.md](RUN-LOCALLY.md); provide
the account, Worker/D1 permissions, owner mailbox, session/setup secrets and a
verified mail sender. Replace the explicit `auth@example.invalid` deployment
mail setting with your verified sender before deploying. Commit reviewed source
before a real deploy. `rer signin` supplies the hosted owner's one-time sign-in
link if mail is not ready. The deployed Worker's `/site` is the business website.
Business-site custom domains are outside the current release. The separate public
run site includes the landing page, `/run` and these docs. It is published at
[https://run-pane.com](https://run-pane.com), and its run page is
[https://run-pane.com/run](https://run-pane.com/run). To see the same page from
a local checkout, use the local `/run` page on the `RER_SITE` address printed by
`rer dev`. The run-site deployment workflow stays disabled unless
`RUN_SITE_DEPLOY` is explicitly enabled.

## Development

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm run typecheck
pnpm test
rer verify
```

Tests exercise the real Worker/D1 and native authentication through HTTP, plus
backup/restore through Base's transfer transport. CI shards build/types and the
product journey, then keeps the required Verify result. Build and deploy do not
run tests. New clone/installer journeys belong on release tags and nightly.
See [PROVENANCE.md](docs/PROVENANCE.md) for Base and sibling source origins.
