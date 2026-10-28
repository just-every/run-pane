# Pane contract mechanisms

These details accompany the behavioral requirements; status and acceptance are in CONTRACT.md.

## Presentation

The fuchsia theme uses `--pn-fuchsia: #f5026f` and `--pn-action: #e8176e`, with self-hosted Figtree. Shared entry documents deny camera, microphone and geolocation.

## Search normalization

Effective metadata includes site defaults and compares after Unicode NFKC normalization, whitespace folding and en-US lowercasing.

## Public goal event

Custom code subscribes to the `pane:goal` browser event with goal name and value. It follows the consent and isolation rules of the page holding it.

## Capacity and custody

The current typed bounds and recovery procedure are documented in [forms](../FORMS-AND-ACCESS.md), [move-in](../MOVE-IN.md), [custom code](../CUSTOM-CODE.md) and [backup and restore](../BACKUP-RESTORE.md). They bound request rate, serialized draft size and individual media size; no fixed daily business quota is introduced by this rewrite.

## Search and delivery implementation

### CMS-008

Visitors search the current published pages at `/site/search`, with Unicode-normalized matching and links to results. Drafts stay private and publication/rollback update results atomically. Posts, collection items and protected-page filtering still await CMS-001, CMS-002, CMS-004 and PAGE-011.

### DOMAIN-001

The business site is served only at `/site` on the Worker origin; no domain connection or alias domains.

### HOST-001

Live pages are served at `/site` with `no-store`, reading D1 on every request; no edge cache or performance budget.

### PRIV-002

Owner-only email lookup/export covers current enquiries, replies, queued intake, account/role/external-identity records, credential-free access metadata and activity. Explicit erasure requires native fresh proof and commits all matched D1 deletions, account/activity anonymization, replay tombstones, old-archive redaction checkpoint and transfer invalidation in one guarded transaction. A concurrent new record aborts rather than permitting partial erasure. Pending durable enquiries are included and fenced before deletion; an owner account requires handover first. Existing single-account erasure now carries the same old-archive checkpoint. Browser-local consent choices have no email identifier; recorded acknowledgment mail services are listed for owner follow-up without automatic outbound erasure. Gap: real CRM delivery inventory/receipt proof awaits FORM-005. FORM-001 files, FORM-008 consents, CMS-010 comments and LINK-003 subscribers inherit lookup, export, erasure and backup fencing before shipping.
