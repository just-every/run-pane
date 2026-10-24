# Foundation operations

Run all first-party operations from the composed, runnable edition checkout
with `rer`. Without it, start with
`npx -y @runeditrun/rer dev just-every/run-pane` (set up only:
`npx -y @runeditrun/rer setup just-every/run-pane`; without Node:
`curl -fsSL https://runeditrun.com/install.sh | sh -s -- dev just-every/run-pane`). `rer dev` alone launches
a fresh checkout for review. The detailed flags and effects are in
`RUN-LOCALLY.md` and `SEED-COMMAND-CONTRACT.md`.

```sh
rer install
rer setup --owner-email you@example.com
rer dev
```

Use the setup prompt instead of the owner-email flag when entering the real
mailbox. Open the printed `RER_OPEN` link to sign in as the owner. Development
and demo mail is silently suppressed. Stop `dev` with
`rer dev --stop` or Ctrl-C, and stop `preview` with
`rer preview --stop` before build or verification.

```sh
rer verify
rer reset --yes
rer export --output exports/installation.rer
rer import --input exports/installation.rer --yes
rer deploy
rer describe
```

Use `rer describe` to inspect the checkout's actual
capabilities. `rer check --profile first-party` validates the
declared command contract; it does not run application journeys or contact a
provider.

## Local data and recovery

Setup and development use explicit owner identity and real local migrations.
Dev and preview use the same owner and canonical `.wrangler/state`. Local dev
sign-in uses the checkout’s private key; keep `RER_OPEN` private. Private
settings are kept in `.dev.vars` with mode 0600 and are not copied into build output.

Local export creates a private archive with an integrity receipt and explicit
exclusions. The foundation has no product-domain tables or background jobs; an
edition's archive contains the supported domain tables and resources that its
adapter declares. Owner/auth, outbox, bookkeeping, private settings and
transient runtime state are excluded. Import validates and restores atomically
into an empty destination; confirmed reset preserves export archives. Run setup
after restore to establish a fresh owner. Each first-party seed verifies local
export/import/export equivalence across its supported resources. Remote transfer
is available only when the adapter declares complete resource coverage.

Preserve ambiguous state and applied migration history. Never place a remote
credential, owner secret or local resource ID in source. A schema change needs
a forward migration and verified transition/recovery.

## Deployment

`rer deploy --dry-run` validates the real owner-account
deployment declaration and builds locally without provider requests. Real
deployment requires privately supplied `CLOUDFLARE_ACCOUNT_ID` and
`CLOUDFLARE_API_TOKEN`, the declared owner/session/setup secrets, and a real
verified mail sender in `deploy.json`. Follow the owner-account deploy-kit
instructions under `node_modules/@runeditrun/rer/modules/deploy-kit`; account scope,
resource ownership, migrations, receipt and health checks are defined there.
Local validation does not prove hosted acceptance, provider delivery or remote
health.

## Business schedules

The Worker cron runs each minute through `src/server.ts`. The Pages editor's Schedules controls use the business's US IANA time zone. Publish approves the exact revision's holiday/promotion windows and quarterly page-review rule; draft rules never run. Sites shows the last platform check, actual transitions, overdue unapproved drafts and outstanding stale-page reviews. Mark reviewed records the signed-in owner/admin and clears that page's reminders.

A page is stale when neither its published content nor its recorded review changed since the previous quarterly occurrence. Reminder recurrence preserves local time across daylight saving; nonexistent or repeated dates are rejected on entry. A later recurring occurrence that crosses a clock gap or repetition is flagged in schedule event history for correction instead of choosing an offset. Banners use plain escaped text; reminders stay in the workspace. The schedule clock, execution history, active banners and page reviews are included in native exports.

## Hosted delivery

Build with `pnpm run build`, then write the source deployment specification with
`pnpm delivery:spec`. `pnpm check:deployment-spec` checks freshness against the
real emitted Worker configuration and the seed-owned `packaging.json` policy.
Package with `node scripts/delivery/base/cli.mjs package --config packaging.json
--output rer-package`; artifact generation uses the same CLI with `artifact`.
These commands prepare source and payloads without deploying or releasing.

Managed hosting supplies the RER mail relay URL, sender and private installation
credential. Assisted hosting exposes the selected RER, Resend, SendGrid or
Cloudflare provider setup fields. Development and demo delivery stay suppressed.
Configure production mail through setup; keep private values outside source.

The native archive covers the resources declared by the portability adapter.
The independent live snapshot and pending enquiry receipts in `PANE_LIVE` are
not covered by that archive. Preserve their storage separately before recovery;
never discard pending receipts during a cutover. See the descriptor recovery
operation for the empty-target restore and verification sequence.
