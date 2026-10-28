<!-- Generated from CONTRACT.md by contract-docs. Edit CONTRACT.md, then regenerate. -->

# Accept a CONTRACT.md — Pane installation

The primary journey: Exercise the capabilities and acceptance journeys below.

## Progress

| Tier | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Core | 51 | 32 | 44 | 127 |
| Agent surface | 0 | 0 | 0 | 0 |
| Later | 0 | 0 | 0 | 0 |
| Full target | 51 | 32 | 44 | 127 |

Judged from the code and tests at commit `3b35726211c3a5ac20eeba8b0f8b82b37d2995d4` (27 October 2026). Continued on candidate branch `cloud/sx-pane-c-i983`. The final candidate additionally isolates the existing starter-template proof with its own native owner session. Exact-candidate Verify loads the route assertions and both collection browser journeys. CMS-001 and CMS-002 retain their acceptance sentences and explicit receiving-duty citations. Other clause statuses retain their earlier judgments; PAGE-015 and API-001 remain partial. Field proof register: 0 rows; 0 passed, 0 failed, 0 not run.

## Core

### Sign-in, roles and authority

#### ACCESS-001 — Server-side role authorization

Core · published · **done**

**Requirement.** Native operator sessions authorize every private handler, including direct API and command-helper calls, never only a route guard. Owners publish, roll back and erase messages; owners and admins prepare, preview and import; members read the workspace. A deactivated operator loses access at the next request. Target roles (`ROLE-001`) extend this table; none of them bypasses the server check.

**Acceptance.**
1. Sign in as owner, invite and confirm an admin and a member, then call `/api/pane` routes signed out, as each role and after deactivating the admin.
2. Signed-out calls get 401, a member is refused prepare, an admin is refused publish, and the deactivated admin gets 401 with no write.

**Evidence.** `src/pane/handler.ts`; `tests/pane.test.mjs`
**Gap.** None.

#### ACCESS-002 — Canonical-origin mutations

Core · published · **done**

**Requirement.** Every private mutation and every public form or visit post requires the installation's canonical origin; a cross-origin request is refused before any write.

**Acceptance.**
1. Post a prepare request and a contact message with a foreign `Origin` header and see 403 with no new revision or message.

**Evidence.** `src/pane/handler.ts`; `src/pane/public.ts`; `tests/pane.test.mjs`
**Gap.** None.

### Revisions and publication

#### PUBLISH-001 — Immutable complete revisions

Core · published · **done**

**Requirement.** A revision holds the complete site snapshot and its SHA-256. It is never edited after it is created. As the target editor, collections, navigation, styles and media arrive (`PAGE-*`, `CMS-*`, `STYLE-*`, `MEDIA-*`), the snapshot grows to hold all of them, so a revision always reproduces the whole public site.

**Acceptance.**
1. Prepare two revisions, read them back through `/api/pane` and compare their snapshots and hashes; neither changes after a later prepare, publish or rollback.

**Evidence.** `src/pane/content.ts`; `tests/pane.test.mjs`
**Gap.** None.

#### PUBLISH-002 — Private draft preview

Core · published · **done**

**Requirement.** An owner or admin previews any revision before it is live, at its own private URL, with an explicit draft banner and contact sending disabled. Signed-out visitors are sent to sign in and members are refused.

**Acceptance.**
1. Open a revision's preview signed out (redirect to sign-in), as a member (403) and as an admin (the draft's pages with the banner).

**Evidence.** `src/pane/handler.ts`; `src/pane/public-view.ts`; `tests/pane.test.mjs`
**Gap.** None.

#### PUBLISH-003 — Owner-approved atomic publication

Core · published · **done**

**Requirement.** Publication selects one revision as live and records the owner's approval (actor, revision, time) in one atomic write. An admin can prepare but cannot publish unless the owner delegates that right under `ROLE-002`.

**Acceptance.**
1. As owner, publish a prepared revision; every public page serves it and the approval record names the owner and revision.
2. As admin, publishing is refused.

**Evidence.** `src/pane/content.ts`; `tests/pane.test.mjs`; `scripts/browser-journey.mjs`
**Gap.** None.

#### PUBLISH-004 — One-action rollback

Core · published · **done**

**Requirement.** The owner restores any earlier immutable revision as the live site in one action, and the rollback is recorded like a publication.

**Acceptance.**
1. Publish a change, roll back to the first revision, and see the public site lose the change and the approval record gain one rollback entry.

**Evidence.** `src/pane/content.ts`; `tests/pane.test.mjs`; `scripts/browser-journey.mjs`
**Gap.** None.

### Contact inbox and visit counts

#### INBOX-001 — Durable, escaped and idempotent contact submissions

Core · published · **done**

**Requirement.** A visitor's contact message is stored once per submission key, so a retried post never creates a duplicate, and it is shown escaped in the workspace. An erased submission key cannot be replayed into the inbox.

**Acceptance.**
1. Submit the same contact form twice with one key and see one inbox message; submit a name containing markup and see it escaped in `/app`.

**Evidence.** `src/pane/public.ts`; `tests/pane.test.mjs`
**Gap.** None.

#### VISIT-001 — Cookie-free aggregate visit counts

Core · published · **done**

**Requirement.** Live page views store only a day and path count. No cookie, identifier or address is stored, previews are not counted, and a browser sending Do Not Track or Global Privacy Control is not counted.

**Acceptance.**
1. Post a visit with `DNT: 1` and one without; the page's count rises by exactly one and no visitor record exists.

**Evidence.** `src/pane/public.ts`; `tests/pane.test.mjs`
**Gap.** None.

### Move-in, backup and erasure

#### MOVEIN-001 — Reviewed static-site move-in with guarded undo

Core · published · **done**

**Requirement.** An owner or admin dry-runs the documented static-site JSON through Base's import kit, approves the plan's fingerprint and imports an unpublished draft. Undo reverses an unchanged, unpublished import and keeps its journal; undoing a published import is refused.

**Acceptance.**
1. Dry-run the fixture, apply with a wrong fingerprint (refused), apply with the reviewed one, confirm the live site is unchanged, undo as a member (refused) and as an admin (undone, journal kept).

**Evidence.** `src/pane/imports.ts`; `tests/pane.test.mjs`; `docs/MOVE-IN.md`
**Gap.** None.

#### BACKUP-001 — Export and restore into an empty installation

Core · published · **done**

**Requirement.** The owner exports installation data and restores it into an empty installation; the live revision, history and import journals come back.

**Acceptance.**
1. Export a populated installation, restore it into a fresh empty D1 and read the live revision and import jobs.

**Evidence.** `scripts/pane-policy.mjs`; `tests/pane.test.mjs`; `docs/BACKUP-RESTORE.md`
**Gap.** None.

#### ERASE-001 — Message erasure fenced against old backups

Core · published · **done**

**Requirement.** The owner erases a contact message. The erasure commits with the portability fence in one batch, so a backup taken before the erasure cannot restore the message and the same submission cannot be replayed.

**Acceptance.**
1. Erase a message as admin (refused) and as owner, replay its submission (not stored), then restore an older archive with the later journal and see it refused.

**Evidence.** `src/pane/handler.ts`; `tests/pane.test.mjs`
**Gap.** None.

### Operation and presentation

#### HEALTH-001 — Deployment health and unknown paths

Core · published · **done**

**Requirement.** `/health` identifies the Worker deployment (source, fingerprint, version) and unknown paths return 404.

**Acceptance.**
1. Read `/health` on a local and a deployed Worker and compare its deployment fields with the deploy record; request an unknown app path and an unknown site page and see 404.

**Evidence.** `tests/search.test.mjs` — health identifies the local deployment and unknown installed paths return 404; `scripts/deployment-journey.mjs` — deployment identity, migrations and removal (local and hosted identity against the deploy record, RunEditRun sandbox 2026-10-21, source dfc3ce80c9d4806c8c0e13363d786dee4e12cbb9); `scripts/health-browser-journey.mjs` — health and unknown installed path at 1440 and 390
**Gap.** None.

#### DEPLOY-001 — Install on the owner's Cloudflare account

Core · published · **done**

**Requirement.** `rer deploy` installs the Worker, D1 database and migrations on the owner's own Cloudflare account and checks health; the owner pays Cloudflare directly in USD.

**Acceptance.**
1. Run `rer deploy` against a test Cloudflare account, see migrations applied and `/health` match, then remove the deployment.

**Evidence.** `scripts/deployment-journey.mjs` — “deployment identity, migrations and removal”: owner-account identity checked against the deployment receipt; applied migration names and SHA-256 values read from hosted D1; local and hosted “/health” deployment identity compared with that receipt; guarded removal and missing local record asserted. Runner: “rer deploy --environment test-pane --non-interactive”, then “node scripts/deployment-journey.mjs test-pane” (RunEditRun live sandbox receipt 2026-10-21, source dfc3ce80c9d4806c8c0e13363d786dee4e12cbb9, 16 migrations). `tests/search.test.mjs` — “health identifies the local deployment and unknown installed paths return 404”, loaded by “pnpm test” through “pnpm verify” in Verify's product journey job. `scripts/health-browser-journey.mjs` — “Health and unknown installed path browser journey”, run with “node scripts/health-browser-journey.mjs” at 1440 and 390. Provider acceptance is the live sandbox receipt, never the local fixture
**Gap.** None.

#### RUNSITE-001 — Public run site and documentation

Core · published · **done**

**Requirement.** The public run site is a static build of the picked Pane homepage, `/run` and the Markdown guides, with no installation sign-in links.

**Acceptance.**
1. Build with `rer build --site`, open `/`, `/run` and every linked `/docs` page (200) and an unknown path (404).

**Evidence.** `tests/site.test.mjs`; `docs/site.json`
**Gap.** None.

#### LOBBY-001 — Shared Lobby, workspace and theme

Core · published · **done**

**Requirement.** The installed `/` is the shared Lobby; `/app` keeps its anchored workspace sections; the fuchsia (`--pn-fuchsia: #f5026f`, with `--pn-action: #e8176e` actions) and self-hosted Figtree theme is shared across `/`, `/signin`, `/setup` and `/app`.

**Acceptance.**
1. Open `/`, `/signin`, `/setup` and `/app` at 1440 and 390 wide and see the shared theme, the workspace anchors and no horizontal overflow.

**Evidence.** `scripts/browser-journey.mjs` — “Shared Lobby and workspace theme”: “capture” asserts self-hosted loaded Figtree, both fuchsia tokens and no overflow on “/”, “/signin”, “/setup” and “/app” at 1440 and 390; native owner bootstrap and setup reach “/app”; keyboard activation proves the workspace “#main” anchor; visible icon-only controls have tooltips, with delayed hover and immediate keyboard focus on the account control. Runner: Verify browser job builds with “pnpm exec vite build”, then “node scripts/browser-proof.mjs” imports the journey and its native fixture. Focused runner: “PANE_BROWSER_FIXTURE=1 node scripts/browser-journey.mjs --lobby-only” after that build
**Gap.** None.

#### PRESENT-001 — Labeled previews and unbranded live pages

Core · published · **done**

**Requirement.** Previews use the business site's typography with an explicit draft banner. Live business pages carry the business's name only: no Pane branding in the page, title, footer or metadata.

**Acceptance.**
1. Open a preview and see the banner; open every live page and find no Pane name or mark in the HTML, including `<title>`.

**Evidence.** `src/pane/public-view.ts`; `src/pane/views.ts`; `tests/pane.test.mjs`; `scripts/browser-journey.mjs`
**Gap.** None.

### Pages and the visual editor

#### PAGE-001 — Unlimited pages, folders and clean URLs

Core · target · **done**

**Requirement.** An editor adds, renames, reorders, hides and deletes any number of pages, groups them in folders, and sets each page's clean URL slug. The home page is chosen, not fixed. Deleting or renaming a published page offers a redirect (`SEO-002`). The five-page ceiling is removed; the five starter pages become a template (`STYLE-001`). The not-found page is an ordinary editable page (heading, text, search box, links, any section) that the live site serves for every unknown URL with HTTP status 404.

**Acceptance.**
1. Create 40 pages in three folders through the editor, rename two slugs, delete one, publish, and open every URL; renamed and deleted pages answer 301 to the chosen targets, and the revision snapshot holds all 40.
2. Edit the not-found page, publish, request an unknown URL and see the edited page with status 404.

**Evidence.** `tests/pane.test.mjs` — “page organization keeps stable identities, complete revisions, safe edits and chosen public home and not-found content” (identities, folders, chosen home, nested preview, deleted retention, edited 404/search/links, conflict refusal, publication/rollback); `tests/search.test.mjs` — “published URL changes offer explicit redirects and each revision owns its exact status and target map” (rename/deletion offers, chosen 301 targets); `scripts/pages-journey.mjs` — “Forty-page editor journey” (40 pages created through editor in three folders, order/hide/home, two renamed slugs and one deletion, all current/old URLs, complete 40-entry snapshot, edited 404, tab reopen, five undo/redo steps and structural conflicts at 1440/390; exact candidate heavy-slot run cited in campaign plan)
**Gap.** None.

#### PAGE-002 — Visual section and block editor with layout controls

Core · target · **partial**

**Requirement.** Pages are built visually from sections (hero, text, image, gallery, columns, list, testimonials, pricing, FAQ, contact, map, call-to-action) and the blocks inside them, drawn from the block catalog of `PAGE-014`, whose text blocks carry the headings, formatting, lists and links that clause states. An editor adds, moves by drag or keyboard, duplicates and deletes sections and blocks, and edits text in place on the page as it will look. New sections and blocks start from the site's styles (`STYLE-002`), and the editor then controls the layout of each one: blocks are placed and resized on a 12-column grid (column span, row placement, overlap order) with left, center or right alignment and vertical alignment; a columns section sets its column ratio (for example 1:1, 1:2, 2:1 or 1:1:1) and gap; each section sets its background (a color from the palette or any hex color, an image with a focal point and overlay opacity, or a muted looping background video from the media library or a YouTube or Vimeo link, with a still image shown while it loads, under reduced motion and on data saver), its minimum height (auto, small, medium, large or full screen) and its top and bottom padding; and an image block is cropped to a chosen aspect ratio (original, 1:1, 4:3, 3:2, 16:9 or free) around its focal point (`MEDIA-003`). Every control is reachable by keyboard and every override can be reset to the style default.

**Acceptance.**
1. Build a services page with a 2:1 columns section, an image block cropped to 4:3, a block spanning columns 2 to 7 and right-aligned, a section with an image background and focal point, a section with a background video and a section with a hex background color and large padding, using drag and keyboard on a phone and a desktop browser; then publish.
2. A browser test reads every block's bounding box in the editor canvas and on the live page at 1440 and 390 wide: each box matches in position and size within 2 CSS pixels, and a screenshot comparison of canvas and live page differs in no more than 0.5% of pixels (editor chrome masked).
3. Under `prefers-reduced-motion` the video section shows its still image.

**Evidence.** `tests/pane.test.mjs` — “section drafts preserve validated layout and reading text through publication, conflict and rollback” (validated immutable geometry, semantic heading, shared CSS, search, conflict, publication and rollback); `scripts/components-code-journey.mjs` — “Reusable components and isolated custom code journey” (native canvas text, column placement, ratio, hex background and padding, reset, section drag and keyboard reorder, duplication and deletion, reopen, undo and redo, retained conflict copy and latest selection, native geometry and pixel parity, reversible raster image ratios and focal points, keyboard crop selection and retained original pixels at 1440 and 390)
**Gap.** A focused visual canvas extends the approved Pages editor without replacing its composition. Editors add, duplicate, delete and reorder text sections and text blocks, edit text in place, set twelve-column placement, row and overlap order, horizontal and vertical alignment, column ratios and gaps, hex backgrounds, minimum height and padding, and reset local layout overrides to the existing theme defaults. The canvas and live page import one section renderer. Immutable revisions retain stable identities and reading text; the existing autosave, undo, redo, retained conflict copy and explicit latest-version selection apply. Native text canvas and live block boxes match within two CSS pixels at 1440 and 390; the chrome-masked native content screenshots differ by no more than 0.5%. Native raster image blocks now support original, square, 4:3, 3:2, 16:9 and free aspect ratios, bounded focal points and reset without changing the retained pixels. Gap: media-library integration, image backgrounds and overlays, background video with loading, reduced-motion and data-saver stills need MEDIA-001 and MEDIA-003 or MEDIA-004. The native canvas now retains structured inline formats, nested lists, large and small paragraphs and justified text through the shared renderer. The full PAGE-014 catalog and destinations, all section presets, touch-gesture drag proof, STYLE-002 owner-configured site defaults and full media-page geometry and screenshot parity remain unproved. PAGE-002 stays partial.

#### PAGE-003 — Navigation menus, header and footer

Core · target · **done**

**Requirement.** The owner edits the main menu (order, labels, dropdown groups, external links, a call-to-action button), a footer with business details and secondary links, and a mobile menu. Hidden pages stay out of menus. The header and footer can each show social icons linking to the business's Facebook, Instagram, LinkedIn, X, YouTube, TikTok, Yelp and Google Business Profile pages, entered once in the brand kit (`STYLE-004`), each with an accessible name.

**Acceptance.**
1. Build a menu with two dropdowns, an external link and a Book button, hide one page, add Instagram, Facebook and Yelp links to the brand kit with icons in header and footer, publish, and use the menu and icons with a mouse, keyboard and a 390-wide phone; each icon link has an accessible name and opens its profile.

**Evidence.** `tests/pane.test.mjs` — “published navigation keeps ordered dropdowns, links, CTA, footer and shared accessible social profiles with hidden pages excluded” (order, both dropdowns, external and CTA destinations, hidden exclusion, footer details and links, all eight named social profiles, draft isolation and rollback); `scripts/navigation-journey.mjs` — “Navigation editor and published menus” (editor controls, mouse and keyboard, 1440/390 mobile disclosure and Instagram/Facebook/Yelp destinations in header and footer)
**Gap.** None.

#### PAGE-004 — Reusable sections and global components

Core · target · **done**

**Requirement.** An editor saves a section as a reusable component (an announcement bar, a contact block, a promotion). Changing it once updates every page that uses it, in the next revision, and the editor shows where it is used.

**Acceptance.**
1. Place one component on five pages, edit it once, preview all five changed, and detach one copy that then stays unchanged.

**Evidence.** `tests/pane.test.mjs` — “reusable section references propagate across five immutable pages and detached copies remain independent” (five linked placements, one edit, all five previews, detached isolation, old snapshots, conflict and approval fences); `scripts/components-code-journey.mjs` — “Reusable components and isolated custom code journey” (save, five placements, usage links, one edit, all five previews, detached isolation, autosave, undo and redo, tooltips and no overflow at 1440 and 390)
**Gap.** Editors save a validated section or the current page text as a reusable component with a stable identity. Linked placements resolve in each new immutable site revision, the editor lists every page using the component, and detachment retains an independent section snapshot. Component text uses the existing autosave, undo, redo and conflict boundary. Shared changes require whole-site approval; old revisions remain unchanged. PAGE-002 retains its separate visual-canvas and media obligations.

#### PAGE-005 — Device previews and a separate mobile layout

Core · target · **done**

**Requirement.** The editor and preview switch between desktop, tablet and phone widths. Pane derives a phone layout automatically by stacking each section's blocks in reading order; the editor can then arrange the phone layout separately (move, resize and reorder blocks on the phone grid, change a section's height and padding, hide a block or section on phones) without changing desktop, and changes on desktop never move an arranged phone block. The editor marks which blocks have phone overrides and can reset them.

**Acceptance.**
1. Preview a draft at 1440, 768 and 390 wide from the editor; in the phone view move a block above another, resize a block, reduce a section's padding and hide one section; publish.
2. On the live page the section is absent at 390 and present at 1440, and a browser test reads block bounding boxes in the editor's phone view and on the live page at 390 wide (and the desktop view and live page at 1440) and finds each within 2 CSS pixels in position and size; the desktop layout is unchanged from before the phone edits.

**Evidence.** `scripts/device-journey.mjs` — “Device canvas journey” (real 1440, 768 and 390 previews at both screen widths; automatic reading-order stacking; independent phone move, reorder, resize, height, gap, padding, block and section visibility; override indicators and reset; reopening; unchanged desktop before and after phone edits; desktop edits preserve arranged phone geometry; editor and live block boxes within two CSS pixels at 1440 and 390); `tests/pane.test.mjs` — “section drafts preserve validated layout and reading text through publication, conflict and rollback” (validated phone geometry and visibility retained in immutable drafts, publication and rollback; invalid overrides refused)
**Gap.** None.

#### PAGE-006 — Autosave, undo and safe concurrent editing

Core · target · **done**

**Requirement.** Edits save as a draft continuously, an editor can undo and redo within a session, and two editors on the same page never silently overwrite each other: the second sees the other's change and merges or keeps their own copy. Every future page or body editor introduced by `PAGE-001`, `PAGE-002` or `CMS-011` inherits these requirements before it ships.

**Acceptance.**
1. Edit, close the tab and reopen to find the draft kept; undo and redo five steps; edit one page from two browsers and see the conflict surfaced, never lost.

**Evidence.** `src/pane/content.ts`; `src/pane/handler.ts`; `src/pane/ui/editor.ts`; `public/pane-autosave.js`; `tests/pane.test.mjs`; `scripts/editing-journey.mjs`
**Gap.** None.

#### PAGE-007 — Page status and review requests

Core · target · **partial**

**Requirement.** Each page and post carries draft, needs review, scheduled or published status. An editor sends a page for review; the owner (or a delegated publisher, `ROLE-002`) approves it from the workspace or a notification. Publishing one page leaves other unfinished drafts unpublished, while every publication still creates an immutable whole-site revision (`PUBLISH-001`).

**Acceptance.**
1. Edit two pages, send one for review, approve and publish only that one, and see the other stay draft while the revision history records the publication.

**Evidence.** `tests/pane.test.mjs` — “page review binds the exact content and selective owner approval keeps other drafts and records an immutable revision” (two edited pages, review request, owner approval, unrelated draft retention, immutable history and stale and concurrent refusals); `scripts/pages-journey.mjs` — “Forty-page editor journey” (review, selected publication, retained other draft and revision history at 1440 and 390).
**Gap.** scheduled page publication, post states and review, delegated publishing and notification approval through ROLE-002 remain unimplemented. URL and shared organization changes still use explicit whole-site approval with reviewed redirects.

#### PAGE-008 — Custom code, embeds and CSS

Core · target · **done**

**Requirement.** An owner adds custom CSS, an HTML embed block, site-wide header and footer code (for example a verification tag) and per-page header code on any page, including a form's or booking's thank-you page (for example a Google Ads conversion snippet). Custom code can subscribe to Pane's goal events (`STATS-002`) through a documented `pane:goal` browser event carrying the goal name and value, so a hand-written tag fires on a lead rather than a page view. Custom header code is marked third-party and waits for consent under `PRIV-001`. Embeds run sandboxed under a per-site content security policy the owner sees, and nothing they add can reach the workspace or a session.

**Acceptance.**
1. Add a custom CSS rule, an embed block, a site-wide header verification tag and per-page header code on a quote form's thank-you page; see the per-page code only on that page, see a listener on `pane:goal` receive the quote-form goal when the form is submitted, and see custom code not run before consent or under GPC; see them live, see the policy list the embed's host, and see the embed unable to read workspace cookies or call `/api/pane`.

**Evidence.** `tests/pane.test.mjs` — “custom code requires owner authoring and approved immutable live revisions while previews and privacy refusals stay inert” (owner authority including import refusal, unchanged published source, every edit requiring new approval, audited revocation and next-request takedown in both live stores, preview isolation, page scope, resource-loading CSS refusal, GPC and DNT); `scripts/components-code-journey.mjs` — “Reusable components and isolated custom code journey” (custom HTML, effective live CSS, site verification and footer, separate quote thank-you header and goal name and value, no-choice and refusal gating, opaque cookie, storage, other-frame and identity isolation and API refusal including blocked navigation and provider-consent bypass, immediate withdrawal, owner revocation and unavailable live page, saved-grant GPC and DNT, tooltips and no overflow at 1440 and 390); `tests/search.test.mjs` — “only an approved page embed widens its frame policy and workspace previews stay inert”; `scripts/privacy-journey.mjs` — “Privacy browser journey” (existing URL-embed host policy and consent boundary)
**Gap.** Native owners author revisioned site CSS, HTML, header and footer code and page header or HTML code. Only an explicitly approved immutable live revision can execute it. Third-party HTML and scripts run in an opaque sandbox with outbound connections, forms and nested frames denied; the live CSP authorizes only the exact approved inline script and style hashes. Consent also applies resource-free CSS to the live document and copies inert verification metadata into its header. Workspace and preview documents stay inert. The shared pane:consent:analytics browser choice controls activation; no choice means off, GPC and DNT override saved grants, and withdrawal removes the active frame, CSS and metadata and clears analytics cookies in the open session. The sandbox receives pane:goal with the public goal name and numeric occurrence value 1; form events arrive on the accepted thank-you view, including a configured page redirect, without sending answers or identity. Permissions Policy remains camera=(), microphone=(), geolocation=() for every nested frame; no allow attribute delegates a feature. Approved by ct (25 October 20:55Z): native owner-only authoring, deny by default, audited immutable approval, live-only opaque execution, no automatic outbound action, no external custom scripts or resource-loading CSS. Published code is never edited in place: every change creates a new immutable draft and needs a new explicit approval. The opaque sandbox cannot read cookies, local or session storage, other frame documents or visitor identity. The owner can revoke an approval in Publication settings; the live page is unavailable on the next request, including isolated live storage, and a revoked revision cannot be restored or republished. Revocation remains in the activity log; restoring delivery requires a new draft and explicit approval. Third-party tag and pixel marketplace with per-tag consent categories is provided separately by PAGE-017. PRIV-001 and STATS-005 inherit this gate and immediate withdrawal duty.

#### PAGE-009 — Accessible output by default

Core · target · **done**

**Requirement.** Published pages meet WCAG 2.2 AA by default: images need alt text (or an explicit decorative mark) before publishing, headings are in order, colors in styles meet contrast, forms are labeled, everything works by keyboard, and a skip link is present. The editor warns before publishing a page that fails.

**Acceptance.**
1. Run axe and a keyboard pass over every template and a populated site at 1440 and 390 wide with zero serious violations; try to publish an image without alt text and see the warning.

**Evidence.** `scripts/accessibility-journey.mjs` — “Accessible output journey” (all seven current starter layouts and populated native canvas output, axe with zero serious or critical violations and keyboard passes at 1440 and 390; skip links, menu and FAQ disclosures, labeled contact fields, keyboard submission and visible focus; real raster upload, missing-alt publication warning, descriptive and decorative images, heading and contrast owner warnings, tooltips); `tests/pane.test.mjs` — “image drafts preserve explicit descriptions and publication refuses missing alt while warning about headings and contrast” (missing-alt refusal in both live stores and selected page approval, explicit decorative choice, descriptive alt, imported missing-alt preservation, invalid raster and metadata refusal); `scripts/device-journey.mjs` — “Device canvas journey” (responsive DOM reading order follows the arranged phone grid)
**Gap.** None.

#### PAGE-010 — Duplicate pages and starter layouts

Core · target · **done**

**Requirement.** An editor duplicates a page or starts one from a starter layout (landing page, service detail, team, menu, pricing, FAQ, location) that already uses the site's styles.

**Acceptance.**
1. Create a page from each starter layout and one duplicate, publish, and see each use the site's fonts and colors.

**Evidence.** `tests/pane.test.mjs` — “starter layouts and duplicates retain editable content and shared published styles” (all seven starters, duplicate content, independent editing and published routes); `scripts/pages-journey.mjs` — “Forty-page editor journey” (each starter and duplicate created and published with matching computed site font and color, editable FAQ disclosure and editor tooltip at 1440 and 390).
**Gap.** None.

#### PAGE-011 — Password-protected and member-only pages and site

Core · target · **done**

**Requirement.** The owner protects a page or folder with a password, or limits it to signed-in site members. Pane checks native member access on every request and never serves protected content in the public cache. Paid membership connection to Stall or Nectar remains a separate obligation (`PAGE-016`, `LINK-002`). Before launch, or during a rebuild, the owner can put the whole site behind a site-wide password or an editable coming-soon page (with an optional signup block, `LINK-003`); the gate answers `noindex`, and the workspace and preview links keep working.

**Acceptance.**
1. Protect a folder with a password and another with member sign-in; signed-out requests see the gate, the right password or member sees the page, and no cached response leaks it.
2. Turn on the coming-soon page: every live URL shows it with `noindex`, the site password opens the site, preview still works, and turning it off restores the published site.

**Evidence.** `tests/pane.test.mjs` — “page and folder gates require passwords or explicitly admitted active native members without leaking through discovery” (page and folder passwords, signed-out gates, admitted and unadmitted native accounts, removal and deactivation on the next request, owner preview without admission or member-state change, no inferred paid access, non-owner setting refusal, password rotation, private delivery, separate-visitor refusal and discovery exclusions); “coming-soon and site password gates cover every live URL while previews and disabling restore the published site” (every live path, noindex, site password, preview bypass and disabling); `scripts/gates-journey.mjs` — “Gate browser journey” (owner settings, both admission modes, errors, coming soon, site password, owner preview without member admission, removal refusal, disabling and hover and keyboard tooltips at 1440 and 390)
**Gap.** Page and folder passwords, explicitly admitted native members, private no-store delivery, protected search and sitemap exclusions, editable coming-soon and site-password gates, preview bypass and disabling are proved. Approved ct semantics (25 Oct 18:50Z): only the native owner configures access; admission is an explicit allowlist of active invited native accounts checked on every request. Unadmitted and inactive accounts are refused beside an admitted active account; removal or deactivation takes effect on the next request. The owner is not admitted automatically; owner preview works without changing member state. No paid entitlement is inferred. Password proofs expire after one hour and rotation invalidates earlier proofs. Paid-access connection remains missing in PAGE-016; Pane never rebuilds billing. LINK-003 owns the optional coming-soon signup.

#### PAGE-012 — Gallery blocks with grid, slideshow and lightbox

Core · target · **done**

**Requirement.** A gallery block shows images from the media library as a grid (column count and gap set per device), masonry, a slideshow or a carousel, with captions, an optional click-to-enlarge lightbox (keyboard and swipe navigation, focus kept inside, Escape closes) and per-image links. Galleries reuse the image optimization of `MEDIA-002` and lazy-load beyond the first screen.

**Acceptance.**
1. Build one gallery of 24 images in each layout, open the lightbox and move through it by keyboard and swipe, set three columns on desktop and one on phones, and see each layout on the live site at 1440 and 390 wide with no layout shift and a passing accessibility run.

**Evidence.** `scripts/components-code-journey.mjs` — Gallery, brand and content checks (24 library images in grid, masonry, slideshow and carousel, columns and gaps, captions and links, autosave, undo, redo, reopen, keyboard, real touch swipe, focus, Escape, intrinsic geometry, zero gallery cumulative layout shift, axe and tooltips at 1440 and 390; outside Verify heavy-slot run sx-pane-c-i822 on the reported candidate SHA); `tests/pane.test.mjs` — gallery publications resolve immutable library images and enforce the page gate and revocation for every rendition
**Gap.** None.

#### PAGE-013 — Promotional pop-up and announcement bar

Core · target · **partial**

**Requirement.** The owner shows a promotional pop-up (newsletter signup, offer or announcement) and an announcement bar. The pop-up opens after a delay, a scroll depth or exit intent on desktop, on chosen pages only, at most once per visitor per chosen number of days (remembered without cookies, in the visitor's browser storage), and never on the first screen of a phone visit in a way that hides content. It is an accessible dialog (focus trapped, Escape and a visible close button), and it can be scheduled (`CMS-005`).

**Acceptance.**
1. Configure a newsletter pop-up after 10 seconds on two pages with a seven-day frequency cap and exit intent on desktop; see it appear on those pages only, not again within seven days, and close by keyboard; on a 390-wide phone see no full-screen interstitial on arrival; schedule an announcement bar and see it appear and expire on time.

**Evidence.** `scripts/scheduling-journey.mjs` — “Business-local scheduling journey” (scheduled announcement bar appears and expires on time at 1440/390); `tests/pane.test.mjs` — “published promotions target selected pages while invalid settings and unauthorized changes stay fenced” (published targeting, draft and preview isolation, schedule validation and mutation refusals); `scripts/promotions-journey.mjs` — “Promotional popup journey” (owner settings and undo, ten-second delay on selected pages, scroll and desktop exit triggers, seven-day browser cap and repeat eligibility, focus containment, Escape and visible close, scheduled start and expiry, safe phone arrival and icon tooltips at 1440 and 390; exact-candidate timing receipt in the campaign report)
**Gap.** Newsletter signup awaits LINK-003 and an authorized Mango or Mailchimp audience. No address collection or automatic subscription action is added; this conservative default keeps PAGE-013 partial pending ct scope approval.

#### PAGE-014 — Block catalog, text formatting and links

Core · target · **partial**

**Requirement.** The editor's block catalog is: text, heading, image, button, quote (with attribution), line (divider), spacer, list, accordion, social links (`STYLE-004`), audio (an uploaded MP3 or M4A from the library with a native player and download option, or a SoundCloud or Spotify embed), code (preformatted text), chart (bar, line or pie from an entered table, with the table available to screen readers), scrolling text (marquee, paused under `prefers-reduced-motion`), shape (a filled or outlined shape from a set, with a color and optional link), and the blocks other clauses define: HTML embed (`PAGE-008`), video, map and social-post embeds (`MEDIA-004`), form (`FORM-001`), newsletter signup (`LINK-003`), booking (`LINK-001`), product and buy button (`LINK-002`), summary and collection list (`CMS-003`), events calendar (`CMS-009`), site search (`CMS-008`) and gallery (`PAGE-012`). Every block in the catalog can be added to any section, placed on the grid of `PAGE-002`, duplicated and deleted. A text block offers the paragraph styles Heading 1 to Heading 4, paragraph, large paragraph, small paragraph, quote and preformatted, each rendered as its semantic element (`h1` to `h4`, `p`, `blockquote`, `pre`) and styled by `STYLE-002`; bold, italic, underline and strikethrough; bulleted and numbered lists with one level of nesting; and left, center, right or justified alignment per paragraph. Any selected text and any button links to: a page on the site (chosen from the page list, so it follows a slug change), a section anchor on the same or another page (each section has an editable anchor ID), an external URL with an optional open-in-new-tab setting, a media-library file (`MEDIA-001`, for example a PDF price list), a `mailto:` address with optional subject, a `tel:` number and an `sms:` number with optional message body. A button block has the same destinations plus a label and a primary, secondary or tertiary style from `STYLE-002`. Links to internal pages and anchors are stored by reference, so renaming a page or anchor updates every link, and a link whose target is deleted is listed in the editor before publishing. Markdown shortcuts (`#`, `**`, `-`, `1.`) and pasted HTML from Word or Google Docs map to the same styles, with unsupported markup stripped.

**Acceptance.**
1. Build one page holding every block in the catalog and one text block using every paragraph style, every inline format, both list types with a nested item, all four alignments and one link of each destination type (a page, an anchor on another page, an external URL with new tab on, a library PDF, `mailto:` with subject, `tel:` and `sms:`), plus a button of each destination type; publish it.
2. A browser test on the live page finds every catalog block by its block type attribute; finds each heading as the `h1` to `h4` element chosen and each list as a `ul` or `ol` with its nested list; finds `strong`, `em`, `u` and `s` around the formatted words; checks each link's and button's `href` against its destination type (the page's live URL, `/<page>#<anchor>` that scrolls to the section, the external `https://` URL with `target="_blank"` and `rel="noopener"` only where new tab is on, the file's served URL, `mailto:` with the encoded subject, `tel:` and `sms:`); tabs through the page and reaches every link and button in reading order with a visible focus ring; and passes an axe accessibility run.
3. Rename the linked page and the anchor, republish, and see both links follow.
4. Delete the linked page and see the editor list the broken link before publishing.
5. Paste a Google Docs fragment with headings, a list and a link and see them kept as styles.

**Evidence.** `tests/pane.test.mjs` — “rich section text keeps semantic formatting and nested lists through immutable publication and rollback” (semantic inline formats, nested lists, matching search text, publication, rollback and invalid-tree refusals); `scripts/components-code-journey.mjs` — “Reusable components and isolated custom code journey” (all paragraph styles, pointer and keyboard inline format controls, independent paragraph and list-item alignments, nested list authoring and inert styled paste, autosave and reopen, rich canvas and live geometry and pixel parity at 1440 and 390)
**Gap.** The shared native canvas retains structured text with Heading 1 to Heading 4, paragraph, large and small paragraph, quote and preformatted styles, bold, italic, underline and strikethrough, bulleted and numbered lists with one nested level, and four block alignments including justified text. Paragraphs and list items inside a mixed document also retain independent left, center, right or justified alignment. Semantic trees are validated at the immutable revision boundary and use the same canvas and live renderer; search reads their matching text. Literal Word and Google Docs text formatting and list markup can be pasted without executing scripts, loading media or retaining arbitrary attributes. Safe HTML paste now keeps supported links, headings, formatting and lists without loading remote media. CMS-004 proves captioned images, an attributed quote, a consented YouTube embed, a page button and stable post and PDF and telephone links in the native post body. Gap: the remaining block catalog, every remaining link and button destination, cross-page anchors, Markdown, complete Word and Google Docs paste fidelity and the full catalog keyboard and axe journey remain unproved.

#### PAGE-015 — Trash and single page or post restore

Core · target · **partial**

**Requirement.** A deleted page, blog post, collection item or event goes to a trash and stays there for at least 30 days, with who deleted it and when; an editor restores any one of them, with its URL, menu place and body, without touching the rest of the site, and a restored published item goes live at its next publication with the redirect offered at deletion removed. Separately, the history of any one page, post or item lists its earlier published and draft versions, and an editor restores one version of that page, post or item alone as a new draft, keeping every later edit to every other page; the whole-site rollback of `PUBLISH-004` stays for undoing a whole publication. Restores are recorded in the activity log (`AUDIT-001`).

**Acceptance.**
1. Publish a site, then delete one page and one post and edit three other pages; restore the post from the trash and publish: the post answers 200 at its old URL, the earlier redirect is gone, and the three edited pages keep their edits.
2. Restore an earlier version of one of the edited pages from its own history as a draft, publish, and see only that page change.
3. See an item deleted 31 days ago gone from the trash and both restores in the activity log with actor and time.

**Evidence.** `src/pane/content.ts`; `tests/pane.test.mjs`
**Gap.** Native page, post and collection-item trash and selective history are implemented. Exact-candidate lifecycle clock proof and fresh completion judgment remain required.

#### PAGE-016 — Paid membership access connection

Core · target · **missing**

**Requirement.** Paid membership is sold through Stall or Nectar (`LINK-002`). Pane connects that paid-access source, checks its entitlement on every protected request and never serves protected content in the public cache. Native account admission alone supplies no paid entitlement, and billing stays with the provider.

**Acceptance.**
1. Connect Stall or Nectar paid membership access and request a protected page with and without its entitlement; only the entitled member receives it, checks repeat on every request and no public cache response leaks it.

**Evidence.** —
**Gap.** No paid-access connection to Stall or Nectar exists. PAGE-011 proves explicit native admission only; LINK-002 must supply the provider connection and every-request entitlement proof. Billing is never rebuilt in Pane.

### Templates and brand styles

#### PAGE-017 — Third-party tag and pixel marketplace with per-tag consent categories

Core · target · **done**

**Requirement.** An owner selects third-party tags and pixels from a marketplace and assigns each its consent category. Each tag loads only after the visitor grants its category, honors GPC and immediate withdrawal, and stays outside the workspace. PAGE-008 custom code and its shared analytics choice do not supply this marketplace.

**Acceptance.**
1. Configure two tags with different categories, grant one category and see only its tag load; withdraw it and see execution stop, then visit under GPC and see advertising tags refused.

**Evidence.** `tests/pane.test.mjs` — “custom code requires owner authoring and approved immutable live revisions while previews and privacy refusals stay inert” (owner-only marketplace configuration, invalid category refusal, inert previews, immutable approval, GPC and DNT, audited revocation in both live stores); `scripts/privacy-journey.mjs` — “Privacy browser journey” (marketplace settings, two categories, only the granted provider script loading, opaque cookie and storage and frame and identity isolation, current-session execution stopping on withdrawal, saved advertising grant refused under header GPC and browser GPC, workspace refusal, tooltips and no overflow at 1440 and 390; provider scripts are network-edge fakes)
**Gap.** Native owners select Plausible Analytics and Meta Pixel from site settings and assign each a consent category; Meta requires advertising. Every configuration change is a new immutable draft requiring explicit publication approval. Live tags remain off until their separate category is granted, with GPC and DNT overriding saved grants. Withdrawal destroys the executing frame in the current session. Each provider executes in an opaque sandbox without cookies, storage, other frame documents or visitor identity, with only its named script and connection origins permitted; forms and nested frames remain denied. Workspace and preview pages stay inert. Existing owner-only audited approval revocation takes down the live page and tag delivery on the next request in both live stores. PAGE-008 owner-authored code retains its separate resource-free sandbox and shared analytics choice. PRIV-001 and STATS-005 inherit this category gate and withdrawal boundary; actual goal mapping and provider conversion receipts remain STATS-005 work.

#### STYLE-001 — Responsive templates for US local businesses

Core · target · **partial**

**Requirement.** A new site starts from a template catalog for common US small businesses (restaurant, salon and spa, trades and home services, professional services, clinic, studio, retail, nonprofit), each responsive and fully editable.

**Acceptance.**
1. See at least 40 templates in the catalog, at least four in each of the eight categories; start a site from each template, publish, and check every page at 1440 and 390 wide with no overflow and a passing accessibility run.

**Evidence.** `public/pane.css`; `src/pane/public-view.ts`
**Gap.** One fixed responsive layout; no template catalog. Every future template must provide the native CMS-001 starter collection pack.

#### STYLE-002 — Site-wide brand styles

Core · target · **partial**

**Requirement.** The owner sets fonts, colors, button shapes, spacing and section backgrounds once for the whole site, with live preview. Fonts come from a built-in catalog, from font files the owner uploads (WOFF2, WOFF, TTF or OTF, self-hosted on the site's origin with `font-display: swap`) or from an Adobe Fonts web project the owner connects by project ID. A change applies everywhere in the next revision.

**Acceptance.**
1. Change the heading font, primary color and button style, preview three pages showing the change, publish, and roll back to the earlier styles.
2. Upload a WOFF2 font and connect a test Adobe Fonts project, set one as the heading and one as the body font, and see both render on the live site, the uploaded one served from the site's own origin.

**Evidence.** `public/pane.css`
**Gap.** Styles are fixed in source CSS; no owner style controls.

#### STYLE-003 — Switch templates without rebuilding content

Core · target · **missing**

**Requirement.** Changing template restyles the site and keeps every page, collection item, image and form. Anything the new template cannot place is listed before the switch. This answers the incumbent complaint that a template change means rebuilding.

**Acceptance.**
1. Switch a populated site between two templates, read the pre-switch list, publish, and see every page and item present; roll back to the previous template.

**Evidence.** None.
**Gap.** No templates to switch between.

#### STYLE-004 — Logo, favicon and brand kit

Core · target · **done**

**Requirement.** The owner uploads a logo, favicon and social image once and enters the business's social profile links once; Pane sizes the images for the header, browser tab, home-screen icon and social cards (`SEO-006`), and uses the profile links for social icons (`PAGE-003`) and structured data `sameAs` (`SEO-005`).

**Acceptance.**
1. Upload a logo and favicon and see them in the header, browser tab and a social card preview; enter two social profile links and see them in the header icons and the LocalBusiness `sameAs`.

**Evidence.** `scripts/components-code-journey.mjs` — Gallery, brand and content checks (logo, favicon, social image upload and preview, public header and icon bytes, social card metadata, two profile icons, LocalBusiness sameAs and tooltips at 1440 and 390); `tests/pane.test.mjs` — brand uploads stay draft until approval and publish served icons, social images and profile structured data
**Gap.** None.

### Media library

#### MEDIA-001 — Media library with alt text and usage

Core · target · **partial**

**Requirement.** Images, video files (MP4 and MOV, transcoded for the web with a poster frame), PDFs (menus, price lists) and other files upload once into a searchable library with folders, alt text, captions and a list of where each is used. Deleting a file in use is refused with its uses listed. The image picker also searches free stock photos from Unsplash through its official API; a chosen photo is copied into the library with its photographer credit and Unsplash link kept as attribution, and Unsplash's download event is triggered as its API terms require.

**Acceptance.**
1. Upload 50 images and three PDFs, search and filter them, set alt text, place one image on three pages, and try to delete it (refused, uses listed).
2. Search Unsplash for plumber photos, add a photo to a page, and see it in the library with the photographer's name and link and the download event recorded by the Unsplash API.

**Evidence.** `tests/pane.test.mjs` — "native media library uploads, organizes and reuses private assets while refusing used deletion and stale edits" and "gallery publications resolve immutable library images and enforce the page gate and revocation for every rendition"; `scripts/media-library-journey.mjs` — "mediaLibraryJourney", invoked by `scripts/components-code-journey.mjs`: native 50-image and three-PDF upload, search and type and folder filters, metadata and alternative text, three-page reuse and exact usage refusal, missing-alt publication refusal, private originals and immutable approval, reopen and conflict resolution, automatic metadata saves, five-step undo and redo, protected PDF delivery, keyboard and axe at 1440 and 390
**Gap.** Official Unsplash search and import, photographer attribution and download-event proof require an owner-authorized Unsplash developer app and key not held. Live provider-storage qualification remains held with the shared Cloudflare family; MP4 and MOV transcoding and poster frames and other-file support remain unimplemented. Native owner-only image and PDF library uses existing whole-draft storage bounds. PAGE-002 and collection holds remain unchanged.

#### MEDIA-002 — Responsive image optimization

Core · target · **done**

**Requirement.** Pane serves every image in modern formats (AVIF or WebP with a fallback), at sizes matched to the screen (`srcset`), lazily below the fold and with dimensions set so the layout does not shift.

**Acceptance.**
1. Upload a 6000-pixel photo and see the live page serve a phone-sized WebP or AVIF at 390 wide, a larger one at 1440, with width and height attributes and lazy loading below the fold.

**Evidence.** `scripts/components-code-journey.mjs` — “Native canvas and reversible image journey” (real photo uploaded at 6000 pixels, distinct phone and desktop WebP network responses with one selected payload at 390 and 1440, intrinsic width and height, below-fold lazy loading, private original retention, rotation and reset of matching renditions, shared canvas and live pixels, tooltips and no overflow); `tests/pane.test.mjs` — “image drafts preserve explicit descriptions and publication refuses missing alt while warning about headings and contrast” (public PNG fallback bytes, HEAD, unknown width refusal, invalid rendition rejection, private original custody, membership-gated delivery and immediate revocation in both live stores)
**Gap.** Native image uploads retain their original privately and prepare bounded 480, 960 and 1600-pixel WebP renditions, without upscaling smaller images, plus a PNG fallback. The shared renderer supplies srcset, screen-matched sizes, intrinsic dimensions and stable aspect ratios, and loads below-fold live images lazily. Public image requests read only the current approved page, enforce its access gate on every request, never serve the original and use private no-store delivery so revocation and protection cannot leak through public caches. Rotation and reset regenerate the matching rendition set. Native PNG, JPEG and WebP uploads allow up to 768 KiB, with a bounded whole-draft budget; a 6000-pixel photographic upload is proved at both widths. MEDIA-001, MEDIA-004 and CMS-011 inherit this rendition and custody pipeline when their image doors ship.

#### MEDIA-003 — Basic image editing

Core · target · **done**

**Requirement.** An editor crops, rotates and sets a focal point on an image in the browser; the original is kept and edits are reversible.

**Acceptance.**
1. Crop and set a focal point, see the hero keep the subject at 390 and 1440 wide, then revert to the original.

**Evidence.** `tests/pane.test.mjs` — “image drafts preserve explicit descriptions and publication refuses missing alt while warning about headings and contrast” (exact original bytes through immutable save and authenticated reopen, original omitted from public delivery, native refusal, invalid original and rotation rejection, and stale-base conflict); `scripts/components-code-journey.mjs` — “Native canvas and reversible image journey” with PANE_CANVAS_ONLY=1 (6000-pixel original retained before downsampling, pixel-exact quarter turns, crop ratios and focal point, undo and redo, reopen, hero subject bounds, published crop and reset at 1440 and 390, shared-renderer geometry and pixel parity, and icon-control tooltip audit)
**Gap.** None. Native uploads are bounded to 768 KiB and kept privately; public documents use only the prepared display image.

#### MEDIA-004 — Video, map, social embeds and Instagram feed

Core · target · **partial**

**Requirement.** A video block plays an uploaded library video (`MEDIA-001`) in an accessible player with controls, captions from an uploaded WebVTT file, a poster frame, and optional autoplay-muted and loop, streamed at sizes matched to the screen; or it embeds YouTube and Vimeo videos. Blocks also embed a Google Maps location for each business address, and Instagram or Facebook posts. An Instagram feed block connects the business's Instagram professional account through Instagram's official API and shows its most recent posts (count and grid or carousel layout chosen by the editor) on the live site, refreshed automatically at least hourly, with images re-served through `MEDIA-002` and each tile linking to its post; the access token is an installation secret refreshed before it expires, and a broken connection shows in `LINK-005` while the block keeps the last posts it fetched. Third-party embeds load only after consent where `PRIV-001` requires it.

**Acceptance.**
1. Upload a 200 MB MOV and place it in a video block with a WebVTT caption file; see it play with controls and captions by keyboard on the live site at 1440 and 390 wide, start from its poster frame and stream a phone-sized rendition at 390.
2. Add a YouTube video, a Vimeo video, a Google Map, an Instagram post and a Facebook post; see each on the live site, see them wait for consent where required, and see the CSP list only their hosts.
3. Connect a test Instagram professional account, place a nine-post feed block, publish a new Instagram post and see it on the live site within an hour; revoke the token and see the connection fail in `LINK-005` while the block still shows the last nine posts.

**Evidence.** `scripts/privacy-journey.mjs` — owner-added YouTube URL embed waits for consent, keeps only its host in CSP and is suppressed under GPC
**Gap.** YouTube URL embed isolation is proved at both widths. Uploaded video, captions/renditions, actual playback, other named provider embeds and the official Instagram feed/refresh/revocation remain unproved.

### Collections and blog

#### CMS-001 — Structured collections with typed fields

Core · target · **done**

**Requirement.** *Cites:* ACCESS-001, ACCESS-002, PUBLISH-001, PUBLISH-002, PUBLISH-003, PUBLISH-004, PAGE-006, PAGE-009 and CMS-011.

The owner keeps structured collections such as services, team members, projects, testimonials, locations, FAQs and menu items, with typed fields (text, rich text, image, number, USD price, date, link, reference to another collection, option), each of which can be marked required with help text. A rich-text field is edited and rendered with the body editor of `CMS-011`: the `PAGE-014` paragraph styles, inline formats, lists, links and buttons, and inline blocks, never plain text or bold and italic alone. Starter collections come with each template.

**Acceptance.**
1. Create a services collection with ten fields including a USD price, a reference to team members and a required rich-text description, add 30 items, and edit an item; validation refuses wrong types and an empty required field.
2. Give one item's description an H2, a bulleted list, bold text, an inline image and links to a page, a library PDF and a `tel:` number, publish, and see the item page render them as `PAGE-014` requires (`CMS-011`).

**Evidence.** `tests/posts.test.mjs` — “typed service collections validate thirty items and publish rich descriptions with selective item restoration” (ten typed fields, thirty retained items, native editor writes with private-post exclusion, required and wrong-type and reference and calendar refusal without mutation, starter collections, semantic heading and nested list and bold and inline raster and stable page and PDF and telephone destinations, USD value and team reference, native admin and editor publication refusal, exact selected native-owner publication, original URL and menu placement, unchanged unrelated live and draft work and immutable source hashes, metadata-only restore actor and server time, zero outbound action, 31-day exclusion and guessed expired restore refusal); `scripts/collections-journey.mjs` — “Collections browser journey” (native ten-field schema creation, thirty items, typed item editing, the shared visual rich description editor, five durable undo and redo steps, two-tab conflict comparison and retained copy, exact owner approval and public live link, semantic public DOM, keyboard reading order and focus, axe, tooltip hover and keyboard focus, schema and details and rich body and published item and history and trash and expired end states at 1440 and 390). The canvas shard in `scripts/browser-proof.mjs` always runs the journey. Its exact-candidate outside-Verify clock run is identified in the lane handoff.  `tests/posts.test.mjs` also asserts every wrong field type and missing-alt item-publication refusal without any revision or approval change; `scripts/collections-journey.mjs` compares every downloaded personal conflict field with the retained losing-tab state.  `tests/posts.test.mjs` also proves native administrator item preview with a draft banner, signed-out refusal and unchanged anonymous delivery; `scripts/collections-journey.mjs` opens that private preview at both acceptance widths.  `tests/pane.test.mjs` — “starter layouts and duplicates retain editable content and shared published styles” independently initializes each current template with editable empty starter collections. `tests/posts.test.mjs` additionally asserts all six mutation actions through both native form and API doors with signed-out, wrong-role, revoked-grant and foreign or absent origin refusal; identical role-filtered conflict bodies; H3, nested lists, italic, both actual inline images with their own descriptions and captions, attributed quote, consent-gated video, every stated destination and direct renamed-post resolution; exact selected approval actor and revision; transactional metadata-only edit and publication activity. `tests/posts.test.mjs` — “designed collection templates publish every item with exact metadata and prepared social images” also proves populated whole-site rollback with original values, bindings, all thirty item URLs and unchanged source snapshots and hashes. The collection journey repeats the complete rich body and renamed destination at both acceptance widths.
**Gap.** None.

#### CMS-002 — Collection template pages with item URLs

Core · target · **done**

**Requirement.** *Cites:* ACCESS-001, ACCESS-002, PUBLISH-001, PUBLISH-002, PUBLISH-003, PUBLISH-004, PAGE-006, PAGE-009 and CMS-011.

Each collection can have a template page that renders every item at its own clean URL, with item-level title, description and social image for search (`SEO-001`).

**Acceptance.**
1. Design a service template page, publish, and open every service item's URL with its own title, description and structured data.

**Evidence.** `tests/posts.test.mjs` — “designed collection templates publish every item with exact metadata and prepared social images” (native owner design and whole-site approval, invalid binding refusal, all thirty item URLs, exact bound titles and descriptions, ordered visible fields, safe Service structured data and selected USD offers, canonical URLs, prepared social-image bytes and selective update isolation); `scripts/collection-template-journey.mjs` — “Collection template browser journey” (native template settings, ordered fields and search bindings, explicit whole-site owner approval, all thirty anonymous URLs and structured data, public social image, keyboard order, axe, tooltips and both settings and published item end states at 1440 and 390), always loaded by the canvas shard. The same typed-service route test covers collection-template authority and canonical-origin refusal. The template route test also asserts populated whole-site rollback, exact original metadata and item values at every URL, retained current draft and immutable source snapshots.
**Gap.** None.

#### CMS-003 — Collection lists and filters on any page

Core · target · **missing**

**Requirement.** Any page can show a list or grid of collection items, filtered, sorted, limited and optionally featured (for example the three newest projects or testimonials for one service). Date fields support relative filters evaluated at request time in the business's time zone (upcoming only, past only, today, the next N days), so a list of upcoming items stays correct without republishing.

**Acceptance.**
1. Place a filtered, sorted list of three featured projects on the home page and a full filterable list on a projects page; change an item and see both update in the next revision.
2. Place an upcoming-only list of dated items, let the clock pass one item's date in America/Chicago, and see that item leave the list without a new publication.

**Evidence.** None.
**Gap.** Collection-list authoring, filtering and date-relative evaluation remain unimplemented.

#### CMS-004 — Blog with categories, tags and authors

Core · target · **done**

**Requirement.** One or more blogs (for example News and Recipes), each with its own URL prefix, index, RSS feed (`CMS-006`) and comment settings (`CMS-010`), holding posts with excerpts, featured images, categories, tags, author pages, archives and pagination. Each post's body is written in the block editor of `CMS-011`, so a post holds the same blocks, headings, formatting, lists, links and buttons as a page. Each post can show share buttons for Facebook, X, LinkedIn, Pinterest and email that open the network's share URL with the post's link and social card (`SEO-006`) and load no third-party script. Authors write and submit posts within their role (`ROLE-001`).

**Acceptance.**
1. Create two blogs, News and Recipes.
2. As an author, write three posts in each with categories and tags, submit them for review, have the owner publish, and open each blog's index and feed, a category, a tag, an author page and each post; see each feed hold only its own blog's posts.
3. One of the posts carries the `CMS-011` acceptance body, and its live DOM passes the `CMS-011` checks.
4. Click each share button and see the network's share URL carry the post's URL, with no request to the network before the click.

**Evidence.** `tests/posts.test.mjs` — “authors submit two isolated blogs for exact owner approval and public semantic delivery” (six posts in two blogs, native author isolation, signed-out and foreign-origin refusal, native owner-only current-review approval, stale review and revision refusal, exact approving owner and transactional activity, immutable sources and unrelated live content, exact filtered post sets, isolated RSS, semantic body and stable destinations, approved PDF bytes and private-file refusal, click-only share URLs); `scripts/posts-journey.mjs` — “Posts browser journey” (native blog settings autosave with stale-save value retention and private PDF upload, author composition, both blog indices and isolated feeds, category and tag and author and month archive pages, excerpts and responsive featured images, pagination, full body composition and live semantic DOM, keyboard reading order and axe, two captioned raster images, attributed quote, consented YouTube, page button and post and PDF and telephone links, post rename without a redirect hop, semantic absolute-URL RSS, all five share actions with zero third-party requests before a click, five durable undo and redo steps, reopen and stale-tab retention, account and editor tooltips, native post-screen axe, 1440 and 390). The canvas shard in `scripts/browser-proof.mjs` always loads this journey.  `scripts/posts-journey.mjs` additionally proves each named share origin and endpoint, email’s mailto scheme, exact post URLs and complete retained conflict-download title and body; `tests/posts.test.mjs` — “authors submit two isolated blogs for exact owner approval and public semantic delivery” additionally refuses reviewed inline images lacking alt text or an explicit decorative choice, returns an accessibility warning and preserves every revision and approval.
**Gap.** CMS-006 retains feed validation, podcast support and subscriber delivery; CMS-010 retains comments; CMS-011 retains its remaining catalog, and PAGE-014 retains the remaining blocks and destinations.

#### CMS-005 — Scheduled publishing and expiry

Core · target · **partial**

**Requirement.** Pages, posts, collection items and announcement sections can be scheduled to publish and to unpublish at a date and time in the business's US time zone, daylight saving included. The workspace shows what actually went live and flags a scheduled change that has not been approved by its time.

**Acceptance.**
1. Schedule a post for 9:00 America/Chicago and a promotion to expire across a daylight saving change; see each happen at the right local time and see an unapproved schedule flagged, not published.

**Evidence.** `tests/posts.test.mjs` — “approved immutable posts publish at Chicago nine while unapproved times are flagged and retries stay fenced” (09:00 Chicago publication and optional expiry, approved immutable source, actual execution history, retained later drafts, unapproved post flag and refusal, native owner authority, invalid DST choices, cancellation and replay fences with ordinary and durable live storage); `tests/posts.test.mjs` — “an invalidated blog schedule cannot starve other publications or leave an expired post public” and “committed publications and expiries reconcile durable reads even when failure recording is unavailable” (independent due entries, visible sanitized failure history, public state matching committed publications and expiries through a later failure, banner reconciliation before surfacing a storage failure); `tests/pane.test.mjs` — “approved business-local schedules drive banners and reminders while drafts, roles and invalid DST dates stay fenced” (Denver promotion expiry across spring DST and unapproved schedule refusal); `scripts/scheduling-journey.mjs` — “Business-local scheduling journey” (native post scheduling controls, 09:00 Chicago execution history, optional post expiry, unapproved post flag, Chicago announcement activation and expiry across fall DST, changed screens at 1440 and 390); `scripts/post-schedules-journey.mjs` — “Invalidated post schedule journey” (native invalidated approval, unrelated publication, successful expiry, matching public durable state and visible failure screens at 1440 and 390)
**Gap.** Selective page and collection-item publication and expiry remain unimplemented. These future scheduling doors must retain the approved immutable-revision fence, actual execution history and due-unapproved refusal. Native post publication and expiry now isolate invalidated schedules, show their sanitized failures and reconcile committed changes to public durable state even when another entry fails. Announcement schedules retain their existing proof. This does not complete the remaining page and item target.

#### CMS-006 — RSS and podcast feeds and new-post notifications

Core · target · **partial**

**Requirement.** The blog and each collection with a template page publish an RSS feed. A blog whose posts carry an audio file can also publish a podcast feed with the Apple Podcasts (iTunes) tags (show title, author, artwork, category, explicit flag, episode duration and enclosure) for Apple Podcasts and Spotify. On publication, subscribers who opted in receive the new post through Mango or Mailchimp (`LINK-003`), whichever the owner connected, and the owner sees the send state.

**Acceptance.**
1. Validate the RSS feed and a podcast feed with two audio posts against the W3C feed validator and the Apple Podcasts feed requirements.
2. With Mango connected, publish a post and see the Mango campaign queued with its delivery state in Pane; repeat with a Mailchimp test audience and see the Mailchimp campaign created and sent to the audience with its delivery state in Pane.

**Evidence.** `tests/posts.test.mjs` — “authors submit two isolated blogs for exact owner approval and public semantic delivery” (six posts in two blogs, native author isolation, signed-out and foreign-origin refusal, native owner-only current-review approval, stale review and revision refusal, exact approving owner and transactional activity, immutable sources and unrelated live content, exact filtered post sets, isolated RSS, semantic body and stable destinations, approved PDF bytes and private-file refusal, click-only share URLs); `scripts/posts-journey.mjs` — “Posts browser journey” (native blog settings autosave with stale-save value retention and private PDF upload, author composition, both blog indices and isolated feeds, category and tag and author and month archive pages, excerpts and responsive featured images, pagination, full body composition and live semantic DOM, keyboard reading order and axe, two captioned raster images, attributed quote, consented YouTube, page button and post and PDF and telephone links, post rename without a redirect hop, semantic absolute-URL RSS, all five share actions with zero third-party requests before a click, five durable undo and redo steps, reopen and stale-tab retention, account and editor tooltips, native post-screen axe, 1440 and 390). The canvas shard in `scripts/browser-proof.mjs` always loads this journey.
**Gap.** Native blog RSS serves only the current approved posts of its own blog and carries the same semantic body with absolute destinations. Gap: W3C validator and Apple Podcasts validation, two audio episodes, collection feeds, Mango and Mailchimp consented campaign delivery and visible delivery state remain unproved.

#### CMS-007 — Collection CSV import and export

Core · target · **missing**

**Requirement.** Collections import from and export to CSV, matching collection-based visual site builder's and design-first visual site builder's CMS exports, with a field-mapping preview and a list of rows that could not be imported.

**Acceptance.**
1. Import a collection-based visual site builder CMS CSV and a design-first visual site builder CSV with images, review the mapping and rejected rows, apply, export the collection again and compare.

**Evidence.** None.
**Gap.** Only the static-site JSON move-in exists (`MOVEIN-001`).

#### CMS-008 — Site search

Core · target · **partial**

**Requirement.** Visitors search the site's pages, posts and collection items; results respect password and member-only pages (`PAGE-011`).

**Acceptance.**
1. Search for a service name, a post tag and a word on a protected page; the first two return results and the protected page does not for a signed-out visitor.

**Evidence.** `src/pane/site-search.ts`; `src/pane/public.ts`; `src/pane/public-view.ts`; `tests/search.test.mjs`; `scripts/search-journey.mjs`
**Gap.** Visitors search the current published pages at `/site/search`, with Unicode-normalized matching and links to results. Drafts stay private and publication/rollback update results atomically. Posts, collection items and protected-page filtering still await CMS-001, CMS-002, CMS-004 and PAGE-011.

#### CMS-009 — Events calendar with list and month views

Core · target · **missing**

**Requirement.** An events collection holds each event's title, description, image, start and end date and time with its IANA time zone (all-day and multi-day events included), location (address with a map, `MEDIA-004`, or an online link), price in USD, capacity note and a register or buy action. Recurring events (weekly, monthly, custom dates) produce one item per occurrence. An events page shows them as a list or a month calendar (switchable by the visitor, keyboard-navigable), splits upcoming and past automatically at request time in the event's time zone, and each event has its own page (`CMS-002`) with add-to-calendar links (an ICS download and Google Calendar and Outlook links) and Event structured data (`SEO-005`). Calendar and summary blocks (`CMS-003`) put upcoming events on any page. The register or buy action hands off to Dial for a booked session (`LINK-001`), to Stall, a Stripe Payment Link or PayPal for a paid workshop or ticket (`LINK-002`), or to a Pane registration form (`FORM-001`), and a completed registration or purchase counts as a conversion on that event (`STATS-002`).

**Acceptance.**
1. Create a one-off workshop in America/New_York, a weekly class in America/Los_Angeles that crosses a daylight saving change and an all-day event; see the events page in list and month views, each occurrence at the right local time, and an upcoming-events block on the home page.
2. Let one event's end time pass and see it move to past without a new publication.
3. Download the ICS and import it into Google Calendar and Outlook with the right times, pass Google's Rich Results Test for the Event page, and complete a test-mode Stall purchase and a Dial booking from two events, each counted as a conversion on its event.

**Evidence.** None.
**Gap.** No events or calendar. PAGE-015 requires this future content door to retain deletion actor and time, at least 30-day trash availability, immutable source, original URL and menu place, draft-only single-item restoration and history without changing unrelated content, separate permission-checked publication that removes only its deletion redirect, and exact restore actor and time in activity.

#### CMS-010 — Blog comments and moderation

Core · target · **partial**

**Requirement.** The owner turns comments on or off for the whole blog, per post and automatically after a chosen number of days. Visitors comment with a name and email (and optionally a website); comments can be threaded one level deep, and posts can show a simple like count kept without cookies. New comments are held for approval by default (or approved automatically for previously approved commenters, as the owner chooses), and a moderation queue lets an owner or comment moderator (`ROLE-001`) approve, mark as spam, delete, edit or reply as the post's author, singly or in bulk. Spam protection reuses the form protection of `FORM-002` (honeypot, rate limits and Turnstile) and holds comments with many links or blocked words. Moderators receive an email and push notification (`MOBILE-002`) for each new comment, or a daily digest. Commenter emails are never shown publicly, comments are included in person-level privacy requests (`PRIV-002`) and in the WXR export (`EXPORT-001`), and imported comments keep their author, date, approval state and threading (`IMPORT-001`, `IMPORT-002`).

**Acceptance.**
1. Enable comments with approval required; post three comments as visitors (one with a filled honeypot, one with six links), see the honeypot comment refused and the link-heavy one held as spam, approve one as a comment moderator from the notification, reply as the post's author and see the threaded reply live; close comments on one post and see the form gone; run a privacy request for a commenter's email and see their comments exported and erased.

**Evidence.** `tests/posts.test.mjs` — “native comment moderation protects notifications, threaded replies, closure and person erasure” (approval by default, honeypot refusal, six-link and blocked-word spam, native role and notification boundaries, notification-linked approval, author and authorized moderator replies, one-level public threads, per-post and timed closure, cookie-free counts, daily digest, metadata-only audit, person export, guarded erasure with both cross-store replay fences and old-archive refusal; matching private review links in plain-text and HTML immediate mail and daily digests); `scripts/comments-journey.mjs` — “Comments browser journey” (native comment settings autosave and durable reopen, selection-only bulk actions, visitor form, moderator notification review, author reply, approved thread, closed form, person export and erasure, axe and tooltips, screens at 1440 and 390).
**Gap.** Native push notification proof requires MOBILE-002 device and signing authority. Live Turnstile acceptance is not proved by the existing provider fixture. WXR comment export and imported author, date, approval state and threading remain unproved under EXPORT-001, IMPORT-001 and IMPORT-002. A recorded exact-candidate Verify and guarded landing remain pending; no DONE claim is made.

#### CMS-011 — Post and collection item bodies in the block editor

Core · target · **partial**

**Requirement.** A blog post's body, and every rich-text field of a collection item (`CMS-001`) or event (`CMS-009`), is written in the same editor as a page (`PAGE-014`), shown as the post or item will look on the live site. It offers every `PAGE-014` paragraph style (Heading 1 to Heading 4 rendered as `h1` to `h4`, paragraph, large and small paragraph, quote and preformatted), every inline format (bold, italic, underline, strikethrough), bulleted and numbered lists with one level of nesting, alignment, and every link and button destination (a page, a post, a collection item, a section anchor, an external URL with an optional new tab, a media-library file, `mailto:`, `tel:` and `sms:`). Between paragraphs the author inserts at least the image (with caption, alt text and link), gallery (`PAGE-012`), video and social-post embed (`MEDIA-004`), quote, button, line, spacer, HTML embed (`PAGE-008`), audio, code, accordion, form (`FORM-001`), newsletter signup (`LINK-003`), booking (`LINK-001`), product (`LINK-002`) and summary (`CMS-003`) blocks; a post or item body can also hold a section with the `PAGE-002` grid when the author chooses a wide layout. Links to pages, posts, items and anchors are stored by reference, as in `PAGE-014`, so renaming or moving any of them updates every link in every post and item, and a link whose target is deleted is listed before publishing. Markdown shortcuts and pasted Word or Google Docs content map to the same styles. The body is stored as structured blocks, rendered to semantic HTML on the live post, included in the post's RSS item (`CMS-006`) with absolute URLs, indexed by site search (`CMS-008`) and exported with the post (`EXPORT-001`).

**Acceptance.**
1. As an author, write a post containing an H2 and an H3, a bulleted list with a nested item, bold and italic text, two inline images with captions, a quote with attribution, a YouTube embed, a button to a page, and links to another post, a library PDF and a `tel:` number; submit it, have the owner publish it, and read the live post DOM with the same checks as `PAGE-014`: each heading is the chosen `h2` or `h3`, the list is a `ul` holding a nested `ul`, `strong` and `em` wrap the formatted words, each image is a `figure` with its `figcaption` and alt text, the quote is a `blockquote` with its attribution, the video is the `MEDIA-004` embed, the button's `href` is the page's live URL, and each link's `href` is the other post's live URL, the PDF's served URL and the `tel:` number; tab through the post and reach every link and button in reading order; and pass an axe run.
2. Rename the linked post's slug, republish, and see the link follow to the new URL with no redirect hop.
3. Do the same in a services item's rich-text description and check its item page the same way.
4. Read the blog's RSS feed and see the post's item carry the same headings, list, images and links with absolute URLs.

**Evidence.** `tests/posts.test.mjs` — “authors submit two isolated blogs for exact owner approval and public semantic delivery” (six posts in two blogs, native author isolation, signed-out and foreign-origin refusal, native owner-only current-review approval, stale review and revision refusal, exact approving owner and transactional activity, immutable sources and unrelated live content, exact filtered post sets, isolated RSS, semantic body and stable destinations, approved PDF bytes and private-file refusal, click-only share URLs); `scripts/posts-journey.mjs` — “Posts browser journey” (native blog settings autosave with stale-save value retention and private PDF upload, author composition, both blog indices and isolated feeds, category and tag and author and month archive pages, excerpts and responsive featured images, pagination, full body composition and live semantic DOM, keyboard reading order and axe, two captioned raster images, attributed quote, consented YouTube, page button and post and PDF and telephone links, post rename without a redirect hop, semantic absolute-URL RSS, all five share actions with zero third-party requests before a click, five durable undo and redo steps, reopen and stale-tab retention, account and editor tooltips, native post-screen axe, 1440 and 390). The canvas shard in `scripts/browser-proof.mjs` always loads this journey.  `tests/posts.test.mjs` — “typed service collections validate thirty items and publish rich descriptions with selective item restoration” (ten typed fields, thirty retained items, native editor writes with private-post exclusion, required and wrong-type and reference and calendar refusal without mutation, starter collections, semantic heading and nested list and bold and inline raster and stable page and PDF and telephone destinations, USD value and team reference, native admin and editor publication refusal, exact selected native-owner publication, original URL and menu placement, unchanged unrelated live and draft work and immutable source hashes, metadata-only restore actor and server time, zero outbound action, 31-day exclusion and guessed expired restore refusal); `scripts/collections-journey.mjs` — “Collections browser journey” (native ten-field schema creation, thirty items, typed item editing, the shared visual rich description editor, five durable undo and redo steps, two-tab conflict comparison and retained copy, exact owner approval and public live link, semantic public DOM, keyboard reading order and focus, axe, tooltip hover and keyboard focus, schema and details and rich body and published item and history and trash and expired end states at 1440 and 390). The canvas shard in `scripts/browser-proof.mjs` always runs the journey. Its exact-candidate outside-Verify clock run is identified in the lane handoff.
**Gap.** The native post limb is proved by the CMS-004 route test and native browser journey: the complete acceptance post body, semantic live DOM, keyboard reading order, axe, linked-post rename without a redirect hop and absolute-URL semantic RSS. Gap: the remaining PAGE-014 catalog, destinations and Markdown, search indexing under CMS-008 and open post export under EXPORT-001 remain unproved. Future collection and event editors inherit the same shared semantic body, safe references, image-description and rendition custody, autosave, five-step undo and redo, conflict retention and transactional activity obligations before shipping.

### Domains and hosting

#### DOMAIN-001 — Connect a custom domain with apex and www

Core · target · **missing**

**Requirement.** The owner connects a domain they own, at the apex and `www`, with one chosen as primary and the other redirecting to it. Pane creates the Cloudflare Workers custom domain in the owner's Cloudflare account, or shows the exact records to add at another DNS host (GoDaddy, Namecheap, Squarespace Domains, Google Cloud DNS, Network Solutions) and checks them. The owner can also connect any number of additional domains (a `.net`, a common misspelling, an old brand) as aliases, each at apex and `www` with HTTPS, that answer 301 to the same path on the primary domain.

**Acceptance.**
1. Connect a test domain held in Cloudflare and one at an external DNS host, see the status move from pending to live, and see `www` redirect to the apex with 301.
2. Connect two alias domains and see `https://alias/services?x=1` and `http://www.alias/services` each answer 301 to `https://primary/services` with the path and query kept.

**Evidence.** None.
**Gap.** The business site is served only at `/site` on the Worker origin; no domain connection or alias domains.

#### DOMAIN-002 — Managed HTTPS and certificate status

Core · target · **missing**

**Requirement.** Every connected domain is served over HTTPS with an automatically issued and renewed certificate; HTTP redirects to HTTPS; the workspace shows certificate status and expiry, and alerts before a renewal problem (`AUTO-004`).

**Acceptance.**
1. Connect a domain, see the certificate issued and listed with its expiry, and see `http://` redirect to `https://`.

**Evidence.** None.
**Gap.** No domain or certificate handling beyond the Worker's default hostname.

#### DOMAIN-003 — DNS status that preserves business email

Core · target · **missing**

**Requirement.** Before cutover Pane reads the domain's existing DNS and keeps every record it does not own, especially MX, SPF, DKIM and DMARC for Google Workspace or Microsoft 365, so connecting the website never breaks the business's email. It shows each record as kept, added or needing action. Mail records that point at a registrar's or site builder's email forwarding service are flagged as forwarding, not mailboxes, and handled by `DOMAIN-005` before any nameserver or transfer change.

**Acceptance.**
1. Connect a domain that has Google Workspace MX, SPF and DKIM records; after connection the mail records are unchanged and mail still delivers, and the status screen lists them as kept.
2. Connect a domain whose MX records point at Squarespace email forwarding and see them flagged as forwarding with the `DOMAIN-005` step required.

**Evidence.** None.
**Gap.** No DNS reading or writing.

#### DOMAIN-004 — Domain registration and transfer guidance

Core · target · **missing**

**Requirement.** An owner without a domain is guided to register one in their own Cloudflare Registrar account (at cost, in USD) or keep their current registrar; an owner leaving XML-export site builder Domains, crawl-only site builder or hosted WXR publishing platform gets the transfer or nameserver steps for that registrar. Before the owner closes the old account, Pane lists the services billed through it that will stop with it: email forwarding (`DOMAIN-005`), and a Google Workspace subscription bought through XML-export site builder or crawl-only site builder, with the steps to move that subscription to direct billing with Google first so mailboxes are not interrupted. Pane never holds the registration.

**Acceptance.**
1. Follow the guided path for a new domain and for a domain at XML-export site builder Domains with XML-export site builder email forwarding and a Google Workspace subscription billed through XML-export site builder, ending with a connected domain in each case; the XML-export site builder path shows the forwarding and Workspace billing steps as required before account closure, and marks each done only when the owner confirms it.

**Evidence.** None.
**Gap.** No domain guidance.

#### DOMAIN-005 — Registrar email forwarding carried over

Core · target · **missing**

**Requirement.** Squarespace Domains, Wix, WordPress.com and GoDaddy include free email forwarding (aliases such as `info@` and a catch-all) that stops when the domain's nameservers move or it transfers. Before cutover Pane detects that forwarding from the domain's MX records and the registrar, asks the owner for the alias list and destinations (which the existing records do not reveal), and recreates every alias and the catch-all in Cloudflare Email Routing in the owner's Cloudflare account, including the destination-address verification Cloudflare requires. Pane then sends a test message to each alias and records it as arrived only when its unique token is confirmed at the destination (by the owner's confirmation link or a connected mailbox), and keeps the cutover (`IMPORT-006`) blocked until every alias has passed. After cutover it repeats the test and alerts (`AUTO-004`) if any alias stops delivering.

**Acceptance.**
1. Cut over a test domain using Squarespace email forwarding with a catch-all and two aliases: see the forwarding detected, enter the aliases, see them created in Cloudflare Email Routing with verified destinations, see cutover refused while one alias is unconfirmed, then confirm all three; after cutover, send mail from an outside account to each alias and to an unlisted address and see every message arrive at its destination, and see the post-cutover check pass.

**Evidence.** None.
**Gap.** No DNS reading, forwarding detection or Email Routing setup.

#### HOST-001 — The business site at the domain root, fast

Core · target · **partial**

**Requirement.** The live site is served at the root of its domain (not under `/site`), cached at Cloudflare's edge and purged on publication. Each template meets Core Web Vitals at the 75th percentile on a mid-range phone over 4G: Largest Contentful Paint 2.5 s or less, Interaction to Next Paint 200 ms or less, Cumulative Layout Shift 0.1 or less. Before a site has field data, the same budgets are checked in the lab: Lighthouse's default mobile profile (emulated Moto G Power, simulated throttling at 150 ms round trip, 1.6 Mbps down and 4x CPU slowdown) with Largest Contentful Paint 2.5 s or less, Total Blocking Time 200 ms or less and Cumulative Layout Shift 0.1 or less, median of five runs. A publication reaches the edge everywhere within 30 seconds.

**Acceptance.**
1. Publish a populated site on a connected domain and run Lighthouse with the stated mobile profile five times on every template's home, collection and blog pages; the medians meet the lab budgets.
2. Where Vane (`STATS-003`) has 28 days of field data, its 75th percentiles meet the field budgets.
3. Publish a change and request the changed page from probes in Virginia, California, Frankfurt, Singapore and Sydney every two seconds: every probe serves the new revision within 30 seconds of the publication.

**Evidence.** `src/pane/public.ts`
**Gap.** Live pages are served at `/site` with `no-store`, reading D1 on every request; no edge cache or performance budget.

#### HOST-002 — The live site survives an admin outage

Core · target · **done**

**Requirement.** Publishing writes a static snapshot of the live revision, so visitors keep getting the published site if the workspace, database or an integration is unavailable. Forms queue submissions and deliver them when service returns.

**Acceptance.**
1. Make the database unavailable on a deployed site; every live page still loads and a contact submission is accepted and appears in the inbox once the database returns.

**Evidence.** `tests/pane.test.mjs` — “published snapshot and queued forms survive missing workspace tables and drain once after recovery” (every live page, acceptance while D1 is unavailable and exactly-once recovery); `scripts/outage-journey.mjs` — “Outage browser journey” (live pages, contact and recovered inbox at 1440/390); `scripts/hosted-outage-journey.mjs` — “Hosted outage journey” (RunEditRun deployed D1 disconnection, two accepted/recovered enquiries and guarded cleanup; receipt sx-pane-c9-hosted-final)
**Gap.** None.

#### HOST-003 — Updates without plugin maintenance

Core · target · **missing**

**Requirement.** Pane ships platform, security and template updates as signed releases, whose signature the installation verifies against the published release key before applying (an unsigned or tampered release is refused), that the owner applies in one action (or automatically, if they choose), with a preview of what changes and a rollback. There are no third-party plugins to keep updated.

**Acceptance.**
1. Apply a release to a running installation, see the change list, its signature verified against the published release key and a passing health check, then roll it back.
2. Offer the installation a release with a tampered artifact and one with no signature, and see each refused with the reason shown and nothing changed.

**Evidence.** None.
**Gap.** No in-product update channel.

#### HOST-004 — Transparent running cost in USD

Core · target · **missing**

**Requirement.** The workspace shows the site's Cloudflare usage this month and the estimated cost in USD against the owner's plan, with no feature that is locked behind an upsell. This answers incumbent complaints about add-on pricing.

**Acceptance.**
1. Generate traffic and storage on a test account and see usage and the USD estimate match the Cloudflare dashboard within 5%.

**Evidence.** None.
**Gap.** No usage or cost view.

#### HOST-005 — Install from the browser with no terminal

Core · target · **missing**

**Requirement.** An owner who has never opened a terminal installs Pane from its run site in a browser: they sign up for or sign in to Cloudflare through Cloudflare's own authorization screen, grant a token limited to the account resources Pane needs, and Pane deploys the Worker, database and storage into that account, creates the first owner sign-in and opens the workspace, showing each step's progress and a plain-language error with a retry when a step fails. The same path upgrades an installation (`HOST-003`). `rer deploy` (`DEPLOY-001`) stays for technical owners and both produce the same installation.

**Acceptance.**
1. From a fresh Cloudflare account and a browser with no local tools, start the install on the run site, complete Cloudflare's authorization, and reach a signed-in Pane workspace on the account's `workers.dev` hostname with no command typed; the granted token holds only the listed scopes.
2. Cancel authorization once and see the plain-language error and a working retry.

**Evidence.** None.
**Gap.** Installation runs through `rer deploy` or the `npx @runeditrun/rer` command line only; no browser install path.

### Search visibility

#### SEO-001 — Page titles and meta descriptions

Core · target · **partial**

**Requirement.** Every page, post and collection item has an editable search title and meta description, with sensible defaults and a search-result preview; the site name appears as the owner chooses.

**Acceptance.**
1. Set a title and description on a page and an item, see the preview, publish, and read them in each page's `<title>` and `<meta name="description">`.

**Evidence.** `src/pane/search.ts`; `src/pane/search-settings.ts`; `src/pane/search-view.ts`; `tests/search.test.mjs`; `scripts/search-journey.mjs`
**Gap.** Current pages have editable search titles and descriptions, defaults and a saved search preview. Posts and collection items still depend on CMS-001, CMS-002 and CMS-004.

#### SEO-002 — Redirect manager and slug-change redirects

Core · target · **done**

**Requirement.** The owner manages 301 and 302 redirects one by one or by CSV import, and Pane offers a redirect automatically whenever a published URL changes or a page is deleted. Imported sites bring their old URL map (`IMPORT-005`).

**Acceptance.**
1. Rename a published slug and accept the offered redirect, import 200 redirects by CSV, and request each old URL to get the right status and target.

**Evidence.** `tests/search.test.mjs` — “published URL changes offer explicit redirects and each revision owns its exact status and target map” (rename/deletion offers, chosen 301/302 GET/HEAD targets, draft isolation, invalid/cyclic targets, atomic malformed-CSV refusal and rollback); `scripts/redirects-journey.mjs` — “Redirect manager journey” (accepted published-slug offer, individual 301/302 addition/retargeting/deletion, quoted 200-row CSV import with every status/target requested, import undo/redo, publication and rollback at 1440/390; exact candidate heavy-slot run cited in campaign plan)
**Gap.** None.

#### SEO-003 — Automatic sitemap and robots.txt

Core · target · **partial**

**Requirement.** Pane generates `sitemap.xml` (pages, posts, items, last-modified dates; excluding hidden, protected and noindex pages) and an editable `robots.txt`, updated on every publication.

**Acceptance.**
1. Publish a site with hidden, protected and noindex pages, validate the sitemap, and see only public indexable URLs listed; edit `robots.txt` and see it served.

**Evidence.** `src/pane/search.ts`; `src/pane/search-settings.ts`; `src/pane/search-view.ts`; `tests/search.test.mjs`; `scripts/search-journey.mjs`
**Gap.** Published revisions generate sitemap.xml with last-modified dates and noindex exclusions, and editable robots.txt; drafts never change either and rollback restores them. Hidden/protected pages and post/item URLs await PAGE-001, PAGE-011 and CMS-001 to CMS-004.

#### SEO-004 — Canonical URLs and indexing controls

Core · target · **partial**

**Requirement.** Every page carries a canonical URL on the primary domain; the owner can mark a page noindex or set a custom canonical, and preview and staging addresses are always noindex.

**Acceptance.**
1. Read canonical tags across `www` and apex, set one page noindex, and confirm previews send `noindex`.

**Evidence.** `src/pane/search.ts`; `src/pane/search-settings.ts`; `src/pane/search-view.ts`; `tests/search.test.mjs`; `scripts/search-journey.mjs`
**Gap.** Current pages have canonical URLs, custom canonical overrides and noindex controls; draft previews and development-origin pages send noindex. Primary custom-domain routing and www/apex acceptance await DOMAIN-001.

#### SEO-005 — Structured data for local businesses

Core · target · **missing**

**Requirement.** Pane emits JSON-LD from the site's business facts and collections: LocalBusiness (name, address, phone, opening hours, service area, price range, social profiles as `sameAs`), Service, Article, FAQPage, BreadcrumbList and Event, validated before publication.

**Acceptance.**
1. Publish a site with hours, services, FAQs and posts, and pass Google's Rich Results Test and the Schema.org validator on each page type.

**Evidence.** None.
**Gap.** No structured data.

#### SEO-006 — Social preview cards

Core · target · **missing**

**Requirement.** Every page has Open Graph and X card title, description and image, defaulting from the page and brand kit (`STYLE-004`), with a preview in the editor.

**Acceptance.**
1. Share a page URL into the Facebook Sharing Debugger and an X card validator and see the chosen title, description and image.

**Evidence.** None.
**Gap.** No social metadata.

#### SEO-007 — Google Search Console and Bing Webmaster Tools

Core · target · **missing**

**Requirement.** The owner connects Google Search Console and Bing Webmaster Tools: Pane verifies the domain, submits the sitemap, and shows queries, clicks, impressions and indexing problems per page in the workspace.

**Acceptance.**
1. Connect a test Google Search Console property and a test Bing Webmaster Tools site for the same domain; for each, see verification succeed and the sitemap submitted, and see per-page clicks and impressions imported for the last 28 days, labeled by search engine.

**Evidence.** None.
**Gap.** No search console connection.

#### SEO-008 — Google Business Profile consistency

Core · target · **missing**

**Requirement.** The owner connects their Google Business Profile. Pane compares its name, address, phone, hours and holiday hours with the site and shows differences; the owner chooses which is right and Pane updates the other with their approval.

**Acceptance.**
1. Connect a test profile whose holiday hours differ from the site, see the difference listed, approve the site's version and see the profile updated.

**Evidence.** None.
**Gap.** No Google Business Profile connection.

#### SEO-009 — Per-page search checks

Core · target · **done**

**Requirement.** Before publication the editor lists search problems per page: missing or duplicate titles and descriptions, missing alt text, broken internal links, noindex mistakes and very large images. Title and description checks compare the effective metadata, including the site defaults, after Unicode NFKC normalization, whitespace folding and en-US lowercasing. A noindex setting is flagged for owner review, since excluding a page may be intentional; the check never changes that setting. Each future block, media and content capability inherits the corresponding checks before it ships (`PAGE-014`, `MEDIA-001`, `MEDIA-002`, `CMS-001` to `CMS-004`).

**Acceptance.**
1. Publish a draft with a duplicate title, a broken internal link and a missing alt text, and see each listed with a link to fix it.

**Evidence.** `scripts/search-journey.mjs` — Search journey (effective metadata normalization, missing and duplicate titles and descriptions, noindex and fix links at 1440 and 390); `scripts/components-code-journey.mjs` — Gallery, brand and content checks (combined duplicate title, deleted native reference, broken gallery URL, missing alt and large public image warnings with fix links at both widths); `tests/search.test.mjs` — native page references follow renamed URLs and report a deleted destination before publication
**Gap.** None.

#### SEO-010 — Multilingual sites with per-language URLs

Core · target · **missing**

**Requirement.** The owner adds languages to the site (Spanish first for US businesses). Each page, post, collection item, menu, form label and search title has a version per language, drafted by `AI-002` or written by hand and published only when approved; a missing translation is listed rather than falling back silently. Each language has its own URL prefix (for example `/es/servicios`), pages carry `hreflang` alternates and `x-default`, the sitemap lists every language version, and a language switcher in the header goes to the same page in the other language.

**Acceptance.**
1. Add Spanish to a five-page site, translate three pages and leave two untranslated; see the untranslated pages listed, publish, and open `/es/` pages through the switcher; read reciprocal `hreflang` and `x-default` tags on each translated page, see them in the sitemap, and see a crawl of the live site report no `hreflang` errors (missing return links, invalid language codes or alternates that do not answer 200).

**Evidence.** None.
**Gap.** No languages or translated pages.

### Forms and enquiries

#### FORM-001 — Form builder with multiple forms

Core · target · **done**

**Requirement.** The owner builds any number of forms (contact, quote request, job application, event registration) with text, email, US phone, address, choice, date, file upload and consent fields, places them on any page, and sets each form's confirmation message or redirect. Each field has a label, optional help text shown under it, an optional placeholder and a required setting; required fields are marked visibly and with `required`/`aria-required`, and a submission with an empty required field or a badly formed email, phone or date is refused both in the browser and by the server, with a validation message beside each failing field, announced to screen readers and tied to it by `aria-describedby`, and the visitor's other answers kept. Uploaded files go to private storage with size and type limits.

**Acceptance.**
1. Build a quote form with a file upload and a US phone field, place it on two pages, submit it with a 5 MB PDF, and see the submission and file in the inbox; an oversized or wrong-type file is refused.
2. Mark the phone field required with help text, then submit with it empty and with an invalid email, in the browser and by a direct POST: both are refused, the page shows each field's message linked by `aria-describedby`, the other answers stay filled, and the help text is the field's accessible description.

**Evidence.** `tests/pane.test.mjs` — “reusable typed forms preserve invalid answers, enforce every field type, accept a private five MB PDF and refuse unsafe files through public doors” (two placements, typed validation, required fields, retained direct-POST answers, accessible errors and help, 5 MB PDF, inbox, private download, confirmation, size and type refusals, honeypot and verification refusal); “private uploads join native archive restore and person export and erasure without replaying old files” (private bytes in person export and current archive restore, fresh-proof erasure and old-backup refusal); “durable typed intake retains private upload chunks through workspace outage and drains once after recovery” (durable intake and one-time recovery); “rejected PDFs leave no stored bytes and only opted-in validated text and metadata can be rescued by the owner” (regular D1 and durable intake contain no rejected bytes, default-off retention, 30 days when enabled, reason reaches submitter, text and metadata only, confirmed owner rescue and no automatic reply); `scripts/forms-journey.mjs` — “Typed form browser journey” (real builder, configurable help and validation message, two placements, browser and direct-POST errors with retained answers, private 5 MB PDF, refusals, confirmation, inbox download, rejected-file reason, owner-visible 30-day review and explicit text-only rescue, and hover and keyboard tooltips at 1440 and 390)
**Gap.** Reusable revisioned forms support text, email, US phone, address, choice, date, PDF upload and consent fields with configurable labels, required settings, help, placeholders, validation messages, submit labels and confirmations or local redirects. Accepted PDFs are private, limited to 5 MB and checked by signature and type; person export, erasure, replay fencing, current archive restore, old-backup refusal and durable outage intake include their custody. Approved ct semantics (25 Oct 18:50Z): rejected upload bytes are discarded from every store; only validated text and file metadata can enter owner-opted-in spam review for the stated 30-day period, subject to explicit legal holds. Rejection reasons reach the submitter. Rescue creates a normal submission only on explicit confirmed owner action, carries no file bytes and sends no automatic reply. Visitors reselect a file after rejection.

#### FORM-002 — Spam protection

Core · target · **done**

**Requirement.** Every form is protected by a hidden honeypot, per-form rate limits and Cloudflare Turnstile, without image puzzles for real visitors. Rejected spam is counted and can be reviewed, never silently mixed into the inbox.

**Acceptance.**
1. Submit with the honeypot filled, in a burst over the limit and with a failed Turnstile token; each is refused or quarantined and counted, while a normal submission arrives.

**Evidence.** `tests/pane.test.mjs` — “form protection refuses and separately counts honeypot, per-form bursts and invalid provider proofs” (all current form doors, independent limits, fail-closed verification, normal delivery and separate counts); “rejected content is opt-in, owner-only and expires after thirty days unless explicitly held” (default off, explicit opt-in, owner boundary, escaping, exact retention duration and scheduled expiry); “owner rescues a rejection once without an automatic reply and confirmed purge fences replay” (concurrent rescue, no acknowledgment, confirmed purge and value-free audit); “rejected answers join person export and atomic erasure while legal holds refuse deletion and archives exclude content” (lookup, export, holds, whole-request erasure refusal, erasure and replay fencing, archive exclusion and restore default); `scripts/privacy-journey.mjs` — “Privacy browser journey” (retention settings, rejected answers, holds, rescue, purge confirmation, person export and erasure, no overflow and delayed hover and keyboard focus tooltips at 1440 and 390)
**Gap.** Every current contact-form door has a honeypot, independent 20-attempt minute bucket and fail-closed Turnstile hostname, action and form verification. Rejections are counted separately. Approved ct semantics (23 Oct 09:30Z and 11:28Z): rejected-content retention is off by default; explicit owner opt-in retains validated names, email addresses and answers for 30 days. Only the owner reviews retained content, marks it not spam for one-time inbox delivery without an automatic reply, confirms permanent purge, and explicitly places or releases legal holds. Holds prevent expiry, rescue, purge and person erasure until released; person export includes held records. Expiry runs on scheduled processing and before review. Person lookup, export and guarded atomic erasure include retained rejections and replay fences. Rejected content and its opt-in setting are excluded from installation archives, so restore starts with capture off. Metadata remains separate and contains no answers or addresses. FORM-001 and CMS-010 inherit all three protection checks, owner review, retention, hold and privacy boundaries before shipping.

#### FORM-003 — Enquiry email to named recipients and reply

Core · target · **partial**

**Requirement.** Each form notifies named recipients by email (sent through the installation's mail relay or the business's Google Workspace or Microsoft 365 account) with the sender as Reply-To, so the owner replies from Gmail or Outlook. The workspace shows each notification's provider acceptance separately from the stored enquiry, and an owner can also reply from the inbox.

**Acceptance.**
1. Submit a form three times, sending its notification once through each of the installation relay, a Google Workspace test account and a Microsoft 365 test account, and see each notification accepted by its provider with Reply-To set; reply from the inbox and see the reply recorded on the enquiry; a failed send is shown as failed, with the enquiry kept.

**Evidence.** `src/pane/views.ts`; `src/pane/data.ts`
**Gap.** Enquiries appear in the workspace inbox only; no notification email or reply.

#### FORM-004 — Automatic acknowledgment to the sender

Core · target · **done**

**Requirement.** Each form can send the visitor an acknowledgment email with the owner's wording and expected response time.

The current Contact form defaults off. Its subject, wording and response time live in the immutable site revision and take effect only when the owner publishes it. The enquiry and its acknowledgment outcome are stored independently; one atomic send claim prevents replay, and uncertain provider outcomes are never automatically resent. Development and demo mail stays suppressed. FORM-001 inherits these optional per-form settings and durable provider outcomes for every form it adds.

**Acceptance.**
1. Enable an acknowledgment, submit, and see the sender's message accepted by the provider edge with the configured wording.

**Evidence.** `tests/pane.test.mjs` — an approved form acknowledgment reaches the provider once with owner wording and durable independent status (SendGrid network edge acceptance, configured recipient/text/time, one send, failure/uncertainty retained, replay/erasure and development suppression); `scripts/acknowledgment-journey.mjs` — saved wording, explicit enable, owner publication, durable inquiry, suppression and disable at 1440 and 390
**Gap.** None.

#### FORM-005 — Lead routing to Orbit, HubSpot and signed webhooks

Core · target · **missing**

**Requirement.** Each form routes submissions to Orbit, HubSpot or a signed HTTPS webhook (Zapier, Crank or the buyer's own endpoint), with field mapping, retries with backoff, and a visible per-submission delivery state (delivered, retrying, failed) that never hides the stored inbox copy.

**Acceptance.**
1. Route a form to Orbit and to HubSpot test accounts and to a webhook that fails twice then succeeds; see the contact created in each CRM, the webhook signature verify, and the delivery state per submission.

**Evidence.** None.
**Gap.** Submissions are stored locally only.

#### FORM-006 — Enquiry ownership, status and follow-up

Core · target · **done**

**Requirement.** Each enquiry has an owner, a status (new, replied, booked, closed, spam) and a follow-up time. An enquiry with no reply after the owner's response window (default one business day in the business's time zone) is escalated to its owner and then the site owner.

**Acceptance.**
1. Assign an enquiry, leave another unanswered past the window, and see the reminder and escalation; mark one replied and see it leave the queue.

**Evidence.** `tests/pane.test.mjs` — enquiries carry an owner, status and follow-up time; unanswered ones are reminded then escalated by business day and replied ones leave the queue (SendGrid network edge: assignee reminder, owner fallback, one-time owner escalation, no enquiry text in mail; weekend and daylight-saving business days; role refusals; replied leaves the queue; reopen); `scripts/acknowledgment-journey.mjs` — assign an owner and mark an enquiry replied from the inbox into Handled at 1440 and 390
**Gap.** None.

#### FORM-007 — Submission export and Google Sheets

Core · target · **partial**

**Requirement.** Submissions export to CSV per form and date range, and a form can append each submission to a Google Sheet in the owner's Google Drive.

**Acceptance.**
1. Export a form's submissions to CSV, connect a Google Sheet, submit, and see the row appended.

**Evidence.** `tests/pane.test.mjs` — native submission CSV filters stable forms and inclusive UTC dates beyond the inbox limit without exposing erased or unauthorized records; composable Pane roles; private uploads join native archive restore and person export and erasure; durable typed intake; rejected PDFs remain absent until explicit rescue. `scripts/forms-journey.mjs` — native CSV downloads through Inquiries at 1440 and 390.
**Gap.** Google Sheet connection, append on submission, connector lifecycle and real provider proof remain unimplemented. Held: an owner-authorized Google user and Sheet, test-user access, OAuth scopes and callback registration on the real origin. Earlier flattened enquiries remain archive-only because their original form identity and structured values were not captured.

#### FORM-008 — Consent capture for email and SMS

Core · target · **partial**

**Requirement.** A form can ask for marketing consent with the owner's wording, record the exact text, time and page, and pass it with the contact to Mango, Mailchimp or Orbit. SMS consent follows TCPA practice: a separate unchecked box naming the business and message frequency. Consent records are kept with the enquiry and travel in exports.

**Acceptance.**
1. With Mango connected, submit a form with email consent ticked and SMS consent unticked; see consent text, time and page recorded and only the email consent reach the Mango contact.
2. Repeat with a Mailchimp test audience and see the contact subscribed with marketing permission and the consent text, time and page stored on the Mailchimp member, and the SMS consent absent.
3. Repeat with Orbit and see the consent on the Orbit contact.

**Evidence.** `tests/pane.test.mjs` — marketing choices bind published wording to immutable enquiry receipts and travel through export, archives and erasure without subscription delivery; durable typed intake retains private upload chunks through workspace outage and drains once after recovery. `scripts/forms-journey.mjs` — native owner configuration, separate unchecked choices, keyboard and axe, inbox records and CSV at 1440 and 390. `scripts/custody-journey.mjs` — portable marketing records, person erasure and captured retry refusal at both widths.
**Gap.** Mango email-only propagation, Mailchimp subscription with marketing permission and member consent text, time and page while SMS consent remains absent, Orbit contact consent delivery and all real-provider proofs remain unimplemented. Held: authorized Mango and Orbit tenants and a Mailchimp test audience and key, none supplied for this run.

### Bookings, checkout and connections

#### LINK-001 — Booking through Dial, Calendly or Acuity

Core · target · **missing**

**Requirement.** A booking block embeds Dial (first), Calendly or Acuity Scheduling (Squarespace Scheduling) inline or as a pop-up, passes the page and campaign as booking source (Calendly UTM parameters, Acuity URL parameters or intake field), and reports completed bookings back to Pane's conversion goals (`STATS-002`): from Dial's booking event, Calendly's `event_scheduled` embed event or webhook, and Acuity's appointment-scheduled webhook. An owner moving from an existing website platform pastes their existing Acuity scheduling link or owner ID and keeps their Acuity account, appointment types and calendar. A restaurant adds a reservation block for Placemat (first), OpenTable or Tock and an online-ordering block for Toast or ChowNow by pasting its widget or ordering link; each embeds inline or opens as a button, and clicks through to it count as an outbound goal (`STATS-002`).

**Acceptance.**
1. On one service page, embed Dial, Calendly and Acuity Scheduling (a test Acuity account with one appointment type); complete a test booking in each from a UTM-tagged visit, and see each booking counted as a conversion for that page and campaign, with the Acuity booking confirmed by its webhook and carrying the page as its source; cancel the Acuity booking and see the conversion marked canceled.
2. On a restaurant page, add OpenTable and Tock reservation widgets and Toast and ChowNow ordering buttons from test restaurant IDs; see each widget render on the live site after consent where `PRIV-001` requires it, and each click counted as an outbound goal for that page.

**Evidence.** None.
**Gap.** No booking embeds; the previous contract excluded bookings.

#### LINK-002 — Checkout through Stall, Stripe Payment Links or PayPal

Core · target · **missing**

**Requirement.** A buy or pay button and a product block hand visitors to Stall (first), a Stripe Payment Link or PayPal. Pane never handles card details; completed payments come back as conversions where the provider reports them. Sales tax is calculated by Stall or Stripe.

**Acceptance.**
1. Add a Stall product block, a Stripe Payment Link button and a PayPal button, complete a test-mode (PayPal sandbox) purchase through each, and see each counted as a conversion with no card data reaching Pane.

**Evidence.** None.
**Gap.** No checkout; the previous contract excluded payments.

#### LINK-003 — Newsletter signup through Mango or Mailchimp

Core · target · **missing**

**Requirement.** A signup block (inline, in the footer, on the coming-soon page or in a pop-up, `PAGE-011`, `PAGE-013`) adds consenting visitors to an audience in Mango (first) or Mailchimp, with double opt-in when the owner chooses, the signup's consent text, time and page sent with the contact (`FORM-008`), optional tags or groups, and CAN-SPAM details (business postal address) checked. A failed handoff keeps the signup and retries, with its state shown in `LINK-005`.

**Acceptance.**
1. With Mango connected, sign up through the block, confirm the double opt-in email and see the contact in the Mango audience with its consent record.
2. With a Mailchimp test audience connected, sign up with double opt-in on: see the member created as pending, follow Mailchimp's confirmation email, and see the member subscribed with its tag and the consent text, time and page recorded; make the Mailchimp key invalid, sign up again and see the signup kept, retried and shown as failing in the health panel.

**Evidence.** None.
**Gap.** No newsletter signup.

#### LINK-004 — Zapier, Crank and outgoing webhooks

Core · target · **missing**

**Requirement.** Form submissions, publications and enquiry status changes are available as signed outgoing webhooks and as triggers in published Zapier and Crank apps.

**Acceptance.**
1. Connect a Zapier test zap and a Crank flow to form submission and publication triggers, fire each, and see the payload arrive signed.

**Evidence.** None.
**Gap.** No outgoing events.

#### LINK-005 — Connection health panel

Core · target · **missing**

**Requirement.** One panel lists every connected service (domain, mail, email forwarding, CRM, booking, checkout, newsletter, analytics, search consoles, Google Business Profile, Instagram feed, social accounts, webhooks) with its state, last success, last failure and how to fix it.

**Acceptance.**
1. Break a CRM credential and a webhook endpoint and see both shown as failing with their last success and a fix action; repair them and see them recover.

**Evidence.** None.
**Gap.** No connections to show.

#### API-001 — Agent command helper and API

Core · target · **partial**

**Requirement.** Agents and scripts act through an authenticated helper and API with the same server permissions as the workspace: read status, prepare drafts, run imports and, for the owner, publish and roll back. Target: scoped API tokens per agent or integration, a read API for pages and collections, and every call recorded in the activity log (`AUDIT-001`).

**Acceptance.**
1. Run the helper's status, prepare and import commands as an admin with a private session file; see publish refused for the admin; create a scoped token and see a call outside its scope refused and logged.

**Evidence.** `tests/pane.test.mjs` — “the real helper uses an authorized admin private session file for status, prepare and import and refuses publication”; “scoped agent tokens intersect native authority and audit allowed, denied, expired and revoked calls without exposing credentials”; `scripts/pane.mjs`; `docs/AGENT.md`
**Gap.** Complete public-door proof of populated scoped collection reads through the helper remains required. AGENT-008 retains budgets and agent controls.

### Analytics and reporting

#### STATS-001 — Traffic by page, source, device and campaign

Core · target · **done**

**Requirement.** The workspace shows visits by page, day, referrer, device type, country or US state and UTM campaign, still without cookies or personal identifiers, and still not counting browsers that send Global Privacy Control or Do Not Track.

**Acceptance.**
1. Visit pages from a phone and a desktop with UTM tags and a referrer, then read the dashboard by page, source, device and campaign; a GPC visit is not counted.

**Evidence.** `tests/pane.test.mjs` — traffic groups real public visit events without retaining raw referrers or unapproved identifiers and excludes privacy opt-outs (page/day/device/trusted location; registrable domains and channel groups; fixed medium and approved/known source; canonical case-insensitive campaigns and separate unapproved counts; no discarded text in any table; GPC/DNT zero writes; every public visit response carries no Set-Cookie); `scripts/traffic-journey.mjs` — published label settings, actual tagged phone/desktop visits, Yelp/ChatGPT domain/channel dashboard output, IP refusal, safe source/medium and unapproved counts, GPC exclusion and an empty browser cookie jar at 1440 and 390
**Gap.** None.

#### STATS-002 — Conversion goals and click insights

Core · target · **done**

**Requirement.** The owner sets goals (form submissions, bookings, checkouts, signups, phone-number and email clicks, outbound clicks) and sees conversions and conversion rate by page, source and campaign, plus a simple funnel from landing page to goal. Each goal can be mapped to a Meta standard event and a Google Ads conversion action (`STATS-005`) and is raised in the browser as a `pane:goal` event for custom code (`PAGE-008`).

**Acceptance.**
1. Define a quote-form goal and a phone-click goal, complete each from a tagged campaign, and see them counted by page and campaign with a funnel.

**Evidence.** `tests/pane.test.mjs` — conversion goals count quote-form submissions and phone clicks by page, channel and campaign with a funnel, never for opt-outs or replays (goal definition validation; tagged form and phone completions; campaign, channel and page conversion rates; opt-out, replay, honeypot and unapproved-text refusals; no cookie); `scripts/traffic-journey.mjs` — goals defined in the editor and published, a tagged quote form and phone tap, the dashboard funnel and rates, an empty visitor cookie jar and no GPC goal request at 1440 and 390
**Gap.** None.

#### STATS-003 — Vane and Google Analytics 4 with consent

Core · target · **done**

**Requirement.** The owner connects Vane (first) or Google Analytics 4 by measurement ID through one Google tag that `STATS-005` reuses for Google Ads. Vane runs cookie-free; GA4 loads only after consent where `PRIV-001` requires it, and never under GPC.

**Acceptance.**
1. Connect Vane and see events arrive; connect GA4 and see it load only after consent and send page views and goals.

**Evidence.** `tests/pane.test.mjs` — connected Vane and Google Analytics 4 render only on live pages, widen the policy only for what is connected and stay absent for GPC and DNT visitors; `scripts/analytics-journey.mjs` — published connections, Vane page views and goals arriving, zero Google requests before consent or after refusal, consented page views and goals with advertising storage denied, withdrawal clearing cookies, thank-you-view form goal sent once, zero third-party requests under GPC even with an allow choice saved, and tooltips on icon-only controls at 1440 and 390 (network-edge Vane and Google script stand-ins); live receipt 2026-10-23 (real run-vane main 8549e6e129e1725d8e85d8d25ca3814831f204da and the real Google tag over the public network with a synthetic measurement ID: Vane stored 3 page views and both goals, Google received page views, phone and quote events with analytics-only consent, no policy violations; source c6e92e3cc67f19d98aeb16cf3661b987e01b8cd7)
**Gap.** None.

#### STATS-004 — Monthly owner report

Core · target · **missing**

**Requirement.** On the first business day of each month the owner receives a short report: visits, top pages, search clicks (`SEO-007`), enquiries and bookings by source, unanswered enquiries and open site problems.

**Acceptance.**
1. Advance the clock to a month boundary and see the report accepted by the mail provider with figures that match the dashboard.

**Evidence.** None.
**Gap.** No reports.

#### STATS-005 — Meta Pixel and Google Ads conversion tracking

Core · target · **missing**

**Requirement.** The owner connects the Meta Pixel by pixel ID and the Google tag for Google Ads by its `AW-` conversion ID from native connection panels, with no code. Page views go to both. Each `STATS-002` goal maps to a Meta standard event and to a Google Ads conversion action the owner picks from the connected account (or enters as a conversion label): by default a form submission sends `Lead`, a booking confirmed through `LINK-001` sends `Schedule`, a checkout confirmed through `LINK-002` sends `Purchase` with its USD value, a newsletter signup sends `CompleteRegistration` and a phone or email click sends `Contact`. Browser events fire when the goal completes, with an event ID. Optionally, Pane also sends the same event server-side from the stored submission through the Meta Conversions API and Google Ads enhanced conversions, with the visitor's email and phone normalized and SHA-256 hashed and the same event ID so the platform de-duplicates it. Everything waits for consent and nothing is sent under GPC (`PRIV-001`); the access tokens are installation secrets with their health in `LINK-005`.

**Acceptance.**
1. Connect a test Meta pixel and a test Google Ads account.
2. From a visit tagged with `fbclid` and `gclid`, accept consent, then submit a quote form, complete a Dial booking and click a phone number.
3. See `Lead`, `Schedule` and `Contact` in Meta Events Manager's Test Events with those names, see each mapped Google Ads conversion recorded through Tag Assistant, and with server-side sending on see the Conversions API events de-duplicated against the browser events by event ID and the enhanced conversion carrying only hashed identifiers.
4. Repeat without consent and with GPC and see no request to Meta or Google, browser or server-side.

**Evidence.** None.
**Gap.** No Meta Pixel, Google Ads connection, goal-to-event mapping or server-side conversions.

### Team, roles and activity

#### ROLE-001 — Roles for editors, authors, moderators and reporting

Core · target · **partial**

**Requirement.** Beyond owner, admin and member, the owner assigns editor (edits pages and collections, cannot publish), author (writes and submits own posts only), comment moderator (approves, marks spam, deletes and replies to blog comments and receives comment notifications, `CMS-010`), inbox (reads and replies to enquiries) and reporting (reads analytics) roles. A person can hold several roles. Every role is enforced on the server (`ACCESS-001`).

**Acceptance.**
1. Invite one person per role and exercise every route as each; each sees and does only what its role allows, and only the owner, admins and comment moderators can act on the comment queue or receive comment notifications.
2. Assistance initiation: Native page writers and own-post authors explicitly initiate assistance within their current content authority.
3. `tests/search.test.mjs` — “native page writers initiate private assistance within their current grant and retain actor-owned decisions” and “native authors write and submit only own posts and use assistance without exposing other content” prove direct server calls, own-post restrictions, refusal outside authority, combined grants, metadata audit, conflicts and next-request revocation.
4. `scripts/ai-journey.mjs` — “editorInitiation” proves the existing editor at 1440 and 390.
5. Assistance grants no publication rights.
6. ROLE-002 retains review notifications and publishing delegation; ACCESS-001 retains server-side enforcement.

**Evidence.** `tests/pane.test.mjs` — “composable Pane roles are invited natively and enforced across workspace, preview, search and every existing API action”; “explicit enquiry replies are retained, delivered once at the provider edge and erased with the parent enquiry”; `scripts/access-journey.mjs` — “Access browser journey” (owner, editor, inbox and reporting at 1440/390)  `tests/search.test.mjs` — “native page writers initiate private assistance within their current grant and retain actor-owned decisions”; “native authors write and submit only own posts and use assistance without exposing other content”; `scripts/ai-journey.mjs` — “editorInitiation”.  `tests/posts.test.mjs` — “authors submit two isolated blogs for exact owner approval and public semantic delivery”; `scripts/posts-journey.mjs` — “Posts browser journey” (native own-post visual authoring, review, owner approval and publication at 1440 and 390).
**Gap.** Pane-owned composable grants extend native member invitations without changing Base copies, sessions or last-owner protection. Editors edit and preview page and search drafts; inbox users read, explicitly reply and manage enquiries; reporting users read aggregate reports. Every current Pane route, preview and search handler enforces capabilities and omits inaccessible response data; grants revoke on the next request, including token calls. Approved by ct (22 Oct): only the owner assigns roles; grants compose by union and an explicit assignment replaces legacy member access; unassigned native members keep their ACCESS-001 read-only access until a grant replaces it; editors cannot change business and robots settings or publish; authors write and submit their own private posts through the native API; comment-moderator authority remains denied until its CMS doors exist. Inbox replies are explicit, idempotent sends that retain provider status and never retry automatically. Gap: the clause stays partial until every role is exercised: editor collection editing is now proved by CMS-001, and comment queue and notifications await CMS-010 (which must admit only owner, admin and comment moderators).

#### ROLE-002 — Review requests and publish delegation

Core · target · **missing**

**Requirement.** The owner can delegate publishing to named people, for all pages or one folder or collection. A review request notifies the publisher by email and push (`MOBILE-002`), and every delegated publication records who approved it.

**Acceptance.**
1. Delegate the blog to an admin, have an author submit a post, approve it as the admin from a notification, and see the approval recorded under the admin.

**Evidence.** None.
**Gap.** Only the owner can publish.

#### ROLE-003 — Designer-to-client handover

Core · target · **done**

**Requirement.** A designer or agency builds a site, transfers ownership to the business owner, and keeps a contributor role the owner can revoke at any time.

**Acceptance.**
1. Build a site as a designer, transfer ownership to a new owner, see the designer drop to editor, and revoke them.

**Evidence.** `tests/pane.test.mjs` — “ownership handover atomically grants the business owner, demotes the designer and permits immediate revocation” (native fresh-proof refusal, explicit target and email confirmation, racing transfers, promotion and demotion, session and token fences, editor-only authority, audit and revocation); `scripts/custody-journey.mjs` — “Custody browser journey” (unobstructed transfer controls, new owner, designer editor, revoked sign-in and icon tooltips at 1440 and 390)
**Gap.** None.

#### ROLE-004 — Two-step sign-in and passkeys for workspace users

Core · target · **partial**

**Requirement.** Every workspace person signs in through Base's native operator sign-in: an email sign-in link, or an identity provider (Auth, Google, Microsoft Entra ID or Okta) over OIDC. On top of that, each person can register passkeys (WebAuthn) and an authenticator-app one-time code (TOTP) with single-use recovery codes, and the owner can require two-step sign-in for every role or for owner and admin only; a person without it is sent to enroll before reaching the workspace. Signing in through an identity provider that reports multi-factor authentication satisfies the requirement. Losing a second factor is recovered by the owner, never by email alone, and every enrollment, removal and recovery is in the activity log (`AUDIT-001`).

**Acceptance.**
1. Require two-step sign-in for all roles; sign in as an editor with an email link and see the enrollment step before `/app`; register a passkey and sign in with it; register TOTP and see a wrong or reused code refused; use a recovery code once and see it refused the second time; sign in through an OIDC provider that reports MFA and reach `/app` without a second prompt; and read each event in the activity log.

**Evidence.** `src/modules/operator-auth/identity/email-link/index.mjs`; `src/modules/operator-auth/identity/oidc/index.mjs`
**Gap.** Email-link and OIDC sign-in exist; no passkeys, TOTP, recovery codes or owner-required two-step sign-in.

#### AUDIT-001 — Activity log of every change

Core · target · **done**

**Requirement.** One log records every edit, publication, rollback, setting change, connection change, import, erasure, role change and agent action (`AGENT-008`) with actor, time and subject. It is readable by the owner, exportable and survives erasure of the subject with the actor anonymized where required.

**Acceptance.**
1. Perform each kind of action, read the log in order, export it, erase a person and see their actor entries anonymized while the log remains.

**Evidence.** `tests/pane.test.mjs` — “activity records successful existing changes atomically and exports ordered owner-only metadata”; “explicit person erasure preserves anonymous ordered activity through archive restore and revokes access” (erasure, journal refusal, restored anonymous history, ordered export and denied account and credential access); “native connection approval, callback, settings and unlink produce owner-attributed secret-free activity”; `scripts/access-journey.mjs` — “Access browser journey” (owner ordered log and export before and after actor erasure, access refusal and icon tooltips at 1440 and 390)
**Gap.** Successful current revision, publication, rollback, import, enquiry, native person/role and connection writes are recorded atomically with request attribution. The owner reads and exports the ordered metadata log; explicit non-owner account erasure removes identifying account data and anonymizes its activity attribution. Approved by ct (22 Oct): an owner-only, append-only metadata log and export, and owner-only erasure; no bodies, addresses, request queries or credentials in events; no automatic purge; explicit non-owner account erasure permanently anonymizes that actor's entries while the log stays. Future content, connector, agent and role doors (CMS-001, CMS-004, CMS-010, LINK-005, AGENT-008, ROLE-002/003/004) inherit transactional audit before shipping. Native link approval/callback/unlink and settings are proved with a network-edge provider, using persisted owner approval attribution. The shared erasure checkpoint refuses a pre-erasure archive when supplied with the current erasure journal. A current archive restores the retained ordered metadata log with anonymous actor attribution; the erased address, prior session and API token cannot regain access. A fresh destination requires that current journal to know about later erasure. Recorded publication approvals are migrated; other events before this migration cannot be reconstructed.

### Moving in from incumbents

#### IMPORT-001 — WXR publishing platform import

Core · target · **partial**

**Requirement.** Pane imports a WXR publishing platform export (WXR XML) from hosted WXR publishing platform or self-hosted WXR publishing platform: pages, posts, categories, tags, authors, featured images and media files fetched from their references, menus where present, comments (approved, pending and spam, with author name, email, URL, date and reply threading) into `CMS-010`, and every old URL mapped for redirects. Shortcodes and plugin blocks it cannot render are listed, not dropped silently.

**Acceptance.**
1. Import a real hosted WXR publishing platform export with 100 posts, media and at least 50 comments including threaded replies and pending ones, review the plan and its exceptions (including the comment counts by state), apply as an unpublished draft, see every comment on its post with the same threading and state, and open every old URL on the new site through its redirect.
2. The import passes only when: every source page, post, collection item, event and gallery image is present on the new site or listed in the `IMPORT-005` report with a reason; each page's, post's and item's visible text matches the source's after whitespace normalization; every source image is fetched and served through `MEDIA-002` or listed as unfetchable; every old URL from the source sitemap and crawl answers 301 to a new URL that answers 200; on each imported page, blog post, collection item and event (its body and every rich-text field, held in the `CMS-011` editor) every source link and button is present with the same destination (internal targets resolved through the URL map to the new URL, anchors to the matching section anchor, files to their `MEDIA-001` copy, and external, `mailto:`, `tel:` and `sms:` targets unchanged), each source heading has the same level, each source list is a list of the same type with the same items, and each inline image is in the same place in the body with its caption and alt text; and the applied counts per content type equal the report's counts.

**Evidence.** `tests/pane-imports.test.mjs` — "documented WXR inventories 100 posts and 50 comments by state while applying only supported unpublished pages"; `fixtures/imports/README.md`; `tests/pane-imports.test.mjs` — "imported page bodies preserve semantic headings, nested lists, anchors and inline destinations while scripts, media and widgets stay inert"; `scripts/imports-journey.mjs` — exact-candidate WXR inventory and apply and undo and semantic page and readonly editor at 1440/390
**Gap.** Documented synthetic WXR 1.0–1.2 reader imports supported pages as unpublished semantic snapshots with heading and list and inline-link and formatting and section-anchor fidelity and reports posts, comment state and parent and post metadata, authors, taxonomy, menus, shortcodes and media references as exceptions. The fixture inventories 100 posts and 50 threaded and approved and pending and spam comments; two supported pages are applied and reconciled, with no native post and comment success claimed. Gap: native posts and taxonomy and authors and menus and threaded comments, complete published-page capture and fidelity, original media delivery, editable rich bodies and every old-URL redirect await CMS-004, CMS-010 and CMS-011, PAGE-014, MEDIA-001 and MEDIA-002 and IMPORT-006.

#### IMPORT-002 — XML-export site builder import

Core · target · **missing**

**Requirement.** Pane imports an XML-export site builder site from its WXR publishing platform-format export plus a crawl of the published site for what the export omits, keeping the URL map. Each XML-export site builder blog page becomes its own blog (`CMS-004`) with its posts, feed URL and comments (`CMS-010`). Restaurant menu blocks become items in a menu-items collection (`CMS-001`) with section, name, description and USD price, shown through a collection list (`CMS-003`). Calendar (events) pages are imported into the events collection (`CMS-009`) with each event's title, description, image, start and end time in the site's time zone, location and its register or buy link, read from the calendar page's published event data, and old event URLs redirect to the new event pages. Gallery pages and gallery sections are rebuilt as gallery blocks (`PAGE-012`) with their images and captions, and other page layouts are rebuilt as sections from the crawl, with XML-export site builder blocks mapped to the `PAGE-014` catalog (text with its heading levels, formatting, lists and links; button, quote, line, spacer, accordion, social links, audio, code, chart, scrolling text and shape blocks) and every link and button target kept. Blog post bodies are mapped the same way into the `CMS-011` editor, keeping inline images with their captions, quotes, video embeds, buttons and links. Each XML-export site builder form block becomes a working `FORM-001` form on the same page with the same fields in the same order, each field's type, label, description and required setting, the submit label, the confirmation message or redirect, and the notification recipients (`FORM-003`); a field type with no equivalent is listed in the report. Products are written to a Stall product import file (or listed with their Stripe or PayPal replacements) because checkout belongs to Stall (`LINK-002`), and scheduling blocks keep their Acuity link (`LINK-001`). Whatever still cannot map is listed in the report (`IMPORT-005`), never left as an unexplained to-do.

**Acceptance.**
1. Import a test XML-export site builder site with two blog pages with comments, a calendar page of 12 events (past and upcoming, one with a product block), a gallery page, a menu block of 20 items and a scheduling block; review the report and apply.
2. The import passes only when: every source page, post, collection item, event and gallery image is present on the new site or listed in the `IMPORT-005` report with a reason; each page's, post's and item's visible text matches the source's after whitespace normalization; every source image is fetched and served through `MEDIA-002` or listed as unfetchable; every old URL from the source sitemap and crawl answers 301 to a new URL that answers 200; on each imported page, blog post, collection item and event (its body and every rich-text field, held in the `CMS-011` editor) every source link and button is present with the same destination (internal targets resolved through the URL map to the new URL, anchors to the matching section anchor, files to their `MEDIA-001` copy, and external, `mailto:`, `tel:` and `sms:` targets unchanged), each source heading has the same level, each source list is a list of the same type with the same items, and each inline image is in the same place in the body with its caption and alt text; and the applied counts per content type equal the report's counts.
3. In addition: each blog page is its own blog with its own feed and every comment on its post with threading and state; every event is in the events collection with correct local times, its old URL redirecting to it and the upcoming split right; the 20 menu items are in the menu-items collection with their prices; the scheduling block keeps its Acuity link; the product is in a Stall import file; a post holding headings, a list, two inline images with captions, a quote, a YouTube video, a button and links to a service page, another post and a PDF passes the link, heading, list and inline-image checks; and a contact form block with a required field and a field description becomes a `FORM-001` form that refuses the empty required field and delivers a test submission to the same recipient.

**Evidence.** None.
**Gap.** No XML-export site builder import.

#### IMPORT-003 — Crawl-only site builder import

Core · target · **partial**

**Requirement.** Because crawl-only site builder offers no full site export, Pane imports a crawl-only site builder site by crawling its published pages and blog (and the blog's RSS) with the owner's proof of domain control, rebuilding pages from the content and keeping the URL map.

**Acceptance.**
1. Import a published crawl-only site builder test site with a blog by crawl, review the mapping and apply.
2. The import passes only when: every source page, post, collection item, event and gallery image is present on the new site or listed in the `IMPORT-005` report with a reason; each page's, post's and item's visible text matches the source's after whitespace normalization; every source image is fetched and served through `MEDIA-002` or listed as unfetchable; every old URL from the source sitemap and crawl answers 301 to a new URL that answers 200; on each imported page, blog post, collection item and event (its body and every rich-text field, held in the `CMS-011` editor) every source link and button is present with the same destination (internal targets resolved through the URL map to the new URL, anchors to the matching section anchor, files to their `MEDIA-001` copy, and external, `mailto:`, `tel:` and `sms:` targets unchanged), each source heading has the same level, each source list is a list of the same type with the same items, and each inline image is in the same place in the body with its caption and alt text; and the applied counts per content type equal the report's counts.
3. The source's page and post list is its published sitemap plus the crawl, and blog posts are checked against the blog's RSS.

**Evidence.** `tests/pane-imports.test.mjs` — "captured Wix sitemap and RSS preserve the source inventory and explicitly report unverified live crawl"; `scripts/imports-journey.mjs` — real helper DNS-controlled Wix capture, reviewed apply and undo and retained proof at 1440/390; `tests/pane-imports.test.mjs` — "a controlled published Wix crawl proves DNS ownership before capture and retains exact-source proof through reviewed apply and undo", "crawl consent and authority refuse unsafe origins, altered challenges, members and scoped tokens before outbound work", "controlled crawls refuse private DNS and source redirects without contacting another origin"
**Gap.** Native owners and admins explicitly capture a published crawl-only site builder sitemap, same-origin linked pages and blog RSS after an operator-bound expiring DNS TXT proof. The reviewed exact-byte capture maps supported semantic pages (headings and lists and inline destinations and section anchors) to an unpublished draft, retains an auditable proof receipt, reconciles counts and supports retained report and undo; missing captures and native post and media and form and fidelity exceptions remain explicit. Offline uploads grant no network authority. Gap: native blog bodies, rich editing, complete-page text and framing fidelity, original media delivery and every old-URL redirect await CMS-004 and CMS-011, PAGE-014, MEDIA-001 and MEDIA-002 and IMPORT-006. Conservative default ADOPTED pending ct approval: native owner and admin consent per crawl, exact DNS-controlled public HTTPS origin only, public-address screening, no source redirects and credentials and scripts and forms, bounded capture, receipt retained with import custody; scoped tokens cannot start outbound crawls. DNS and source edges are synthetic; no live incumbent receipt is claimed.

#### IMPORT-004 — Visual and generated site builder import

Core · target · **partial**

**Requirement.** Pane imports collection-based visual site builder and design-first visual site builder CMS CSV exports (`CMS-007`) and their published pages by crawl, and AI-generated site builder sites by crawl, with the same review, exceptions and URL map.

**Acceptance.**
1. Import a collection-based visual site builder site with two collections, a design-first visual site builder site with one collection and a published AI-generated site builder site by crawl, review exceptions for each and apply.
2. The import passes only when: every source page, post, collection item, event and gallery image is present on the new site or listed in the `IMPORT-005` report with a reason; each page's, post's and item's visible text matches the source's after whitespace normalization; every source image is fetched and served through `MEDIA-002` or listed as unfetchable; every old URL from the source sitemap and crawl answers 301 to a new URL that answers 200; on each imported page, blog post, collection item and event (its body and every rich-text field, held in the `CMS-011` editor) every source link and button is present with the same destination (internal targets resolved through the URL map to the new URL, anchors to the matching section anchor, files to their `MEDIA-001` copy, and external, `mailto:`, `tel:` and `sms:` targets unchanged), each source heading has the same level, each source list is a list of the same type with the same items, and each inline image is in the same place in the body with its caption and alt text; and the applied counts per content type equal the report's counts.
3. The rule is applied to each of the three sites separately, and every CSV row of each collection-based visual site builder and design-first visual site builder collection is an item with each field's value equal to the CSV's.

**Evidence.** `tests/pane-imports.test.mjs` — "Webflow, Framer and Durable captures are reconciled separately with every collection CSV field retained as an exception"; `fixtures/imports/README.md`; `scripts/imports-journey.mjs` — separate DNS-controlled Webflow and Framer and Durable captures, CSV exceptions, reviewed apply and undo and retained proof at 1440/390
**Gap.** Separate DNS-controlled, explicitly authorized collection-based visual site builder, design-first visual site builder and AI-generated site builder crawls and offline captures map supported semantic pages to unpublished drafts, preserve their headings and lists and inline destinations and anchors and report capture and media and form and fidelity exceptions. Every row and exact field value in two collection-based visual site builder collections and one design-first visual site builder collection is retained as an unsupported collection item. Exact-byte proof receipts, reviewed apply, retained reports and undo use the same import doors. Gap: native CMS CSV item writes and bodies, rich editing, complete-page text and framing fidelity, original media delivery and every old-URL redirect await CMS-001, CMS-007 and CMS-011, PAGE-014, MEDIA-001 and MEDIA-002 and IMPORT-006. IMPORT-003 conservative crawl default ADOPTED pending ct approval applies to all three providers; synthetic DNS and source-network proof is not a live incumbent receipt. Offline capture envelopes are Pane interchange, not official provider export claims.

#### IMPORT-005 — Migration report and URL map

Core · target · **done**

**Requirement.** Every import shows, before anything is written, a report of what will map where, what will not (with reasons), counts per content type (pages, posts, comments by state, collection items, events, galleries, media, products handed to Stall), every old URL and its new target, media that could not be fetched, and each form's old destination. Apply needs the report's fingerprint; undo works while the draft is unpublished (`MOVEIN-001`). After apply, the report is re-checked against the new site with the import pass rule every incumbent import (`IMPORT-001` to `IMPORT-004`) states, including its link, button, heading, list and inline-image checks on every page, post, collection item and event, and any item that fails it (for example a link whose internal target did not import) is added to the report with its reason. The report also states plainly what stays behind with the old platform, including its traffic and sales analytics history.

**Acceptance.**
1. Run an import with unsupported content, comments, a post linking to a page the import skips and a broken image link; read the report, see the post's dangling link listed after apply, with its per-type counts, apply with its fingerprint, see the applied counts equal the report's, and undo.

**Evidence.** `tests/pane-imports.test.mjs` — "migration preflight reports complete typed inventory, exceptions, old URLs, form destinations and history without writes" (preflight map/counts/reasons/media/forms/history), "reviewed apply reconciles the stored draft, lists dangling post links and reopens the retained report" (fingerprint/applied counts/dangling link/reopen/undo), "captured Wix sitemap and RSS preserve the source inventory and explicitly report unverified live crawl" (production-rendered text/link/button/heading/list/image and redirect failures), "native JSON custom home and separately declared links keep their rendering semantics in the fidelity report" (positive rendered fidelity); `scripts/imports-journey.mjs` — 1440/390 review/apply/retained report/undo/tooltips
**Gap.** IMPORT-001/002/003/004 and CMS-007 inherit report/reconciliation/undo when additional targets ship.

#### IMPORT-006 — Verified cutover with the old site kept

Core · target · **missing**

**Requirement.** Cutover is a checked step: Pane confirms the new site's pages, redirects, forms and lead routes work on a preview hostname, that mailbox records are kept (`DOMAIN-003`) and that every registrar email forwarding alias has been recreated and proven (`DOMAIN-005`), then switches the domain (`DOMAIN-001`) while the old site stays reachable until the owner closes it, and rolls the DNS back in one action if needed.

**Acceptance.**
1. Cut a test domain with Google Workspace MX records and XML-export site builder email forwarding over from an old host: see cutover refused until every forwarding alias is proven, see pre-cutover checks pass, then roll back and forward again with mailbox mail and every forwarded alias still delivering.

**Evidence.** None.
**Gap.** No cutover.

#### IMPORT-007 — Enquiry and subscriber history import

Core · target · **missing**

**Requirement.** An owner moving in brings their history: past form submissions exported from XML-export site builder (form storage and contacts), crawl-only site builder (form submissions CSV) or hosted WXR publishing platform (form responses CSV) import into the inbox with their original dates, form and fields, marked as imported and not re-notified; and the old platform's newsletter subscriber list imports into Mango or Mailchimp (`LINK-003`) with each subscriber's original consent date and source carried and unsubscribed or bounced contacts kept suppressed, never re-subscribed. Analytics history can come too: a monthly visits-by-page CSV exported from XML-export site builder Analytics (or crawl-only site builder or hosted WXR publishing platform stats) imports as a baseline that `STATS-001` charts before Pane's own counts begin, marked as imported; without one, the migration report (`IMPORT-005`) says that traffic and sales history stays with the old platform.

**Acceptance.**
1. Import an XML-export site builder form-submissions CSV of 200 rows and a subscriber list with 20 unsubscribed contacts; see the 200 enquiries in the inbox with original dates and no notifications sent, and see the subscribers in Mango and in a Mailchimp test audience with consent dates and source kept and the 20 unsubscribed contacts suppressed.
2. Import a 12-month XML-export site builder Analytics visits-by-page CSV and see each month's visits per page in `STATS-001`, labeled imported, matching the CSV's totals.

**Evidence.** None.
**Gap.** Only the static-site JSON move-in exists; no submission or subscriber import.

### Portability, privacy and US norms

#### EXPORT-001 — Open-format site export

Core · target · **partial**

**Requirement.** Besides the installation archive (`BACKUP-001`), the owner exports content in open formats: WordPress WXR for pages and posts, CSV for each collection and form, a ZIP of original media, and a static HTML copy of the live site that runs on any host.

**Acceptance.**
1. Export a populated site in every format, import the WXR into WordPress, open the CSVs, and serve the static copy from a plain web server.

**Evidence.** `scripts/pane-policy.mjs`
**Gap.** Only Pane's own installation archive exports.

#### PRIV-001 — Consent for analytics and third-party embeds

Core · target · **partial**

**Requirement.** Pane's own counting needs no consent. When the owner adds GA4, the Meta Pixel, the Google tag for Google Ads (`STATS-005`), custom header code (`PAGE-008`) or a third-party embed, a consent banner appears with US-appropriate choices, Global Privacy Control is honored as an opt-out of sale and sharing, and nothing third-party loads before the choice. Under GPC no advertising pixel or tag loads at all and no server-side conversion (`STATS-005`) is sent for that visit.

**Acceptance.**
1. Add GA4, the Meta Pixel, a Google Ads tag and a YouTube embed, visit with and without GPC, and see no third-party request before consent, and none at all under GPC for GA4, the Meta Pixel or the Google tag; submit a form under GPC and see no Conversions API or enhanced-conversion request sent.

**Evidence.** `tests/pane.test.mjs` — “connected Vane and Google Analytics 4 render only on live pages, widen the policy only for what is connected and stay absent for GPC and DNT visitors”; `scripts/analytics-journey.mjs` — “Analytics browser journey” (zero Google loads before consent, refusal, withdrawal and GPC); `scripts/privacy-journey.mjs` — “Privacy browser journey” (per-origin embeds, revocation and saved-consent GPC refusal at 1440/390)
**Gap.** Current GA4 and embed doors are consent-gated, revocable and suppressed under GPC, including saved grants. Gap: the explicit Meta and Google Ads and server-conversion journey requires STATS-005, while PAGE-008 now proves custom-code consent, privacy refusal and current-session withdrawal under its ct-approved default. The provider journey remains unproved.

#### PRIV-002 — Person-level privacy requests

Core · target · **partial**

**Requirement.** For a CCPA or similar request, the owner finds everything stored about one email address (enquiries, consents, files, blog comments, subscriber records and the CRM deliveries Pane made), exports it for the person and erases it in one action, with the erasure fenced against old backups (`ERASE-001`) and the downstream services listed for follow-up.

**Acceptance.**
1. Submit three forms as one person, run a request by email, export their data, erase it, and see every record gone, the fence in place and the CRM deliveries listed.

**Evidence.** `tests/pane.test.mjs` — “person privacy finds three enquiries, exports portable records, atomically erases and fences old account backups” (email lookup, portable export, guarded all-record erasure, other-person isolation, account/session refusal and old-backup fence); “person erasure includes pending durable enquiries and prevents their recovery delivery” (queued intake and replay fence); `scripts/custody-journey.mjs` — “Custody browser journey” (lookup/export/confirmation/erased inbox at 1440/390)
**Gap.** Owner-only email lookup/export covers current enquiries, replies, queued intake, account/role/external-identity records, credential-free access metadata and activity. Explicit erasure requires native fresh proof and commits all matched D1 deletions, account/activity anonymization, replay tombstones, old-archive redaction checkpoint and transfer invalidation in one guarded transaction. A concurrent new record aborts rather than permitting partial erasure. Pending durable enquiries are included and fenced before deletion; an owner account requires handover first. Existing single-account erasure now carries the same old-archive checkpoint. Browser-local consent choices have no email identifier; recorded acknowledgment mail services are listed for owner follow-up without automatic outbound erasure. Gap: real CRM delivery inventory/receipt proof awaits FORM-005. FORM-001 files, FORM-008 consents, CMS-010 comments and LINK-003 subscribers inherit lookup, export, erasure and backup fencing before shipping.

#### PRIV-003 — Policy and accessibility statement starters

Core · target · **partial**

**Requirement.** Pane offers starter privacy policy, terms and accessibility statement pages that list what this site actually collects and which services it connects, for the owner to review; they are clearly marked as starters, not legal advice.

When AI assistance is connected, the actual-service inventory and privacy starter name OpenAI as the AI processor accessed through Base AI and describe the selected page and named image inputs sent only after the owner’s explicit request; pre-request consent copy makes the same disclosure. This addition does not certify provider terms, legal compliance or accessibility.

**Acceptance.**
1. Connect GA4 and a CRM, generate the privacy policy starter, and see both services named; edit and publish it.

**Evidence.** `tests/pane.test.mjs` — “policy starters name actual services, remain editable drafts and require owner publication” (actual GA4/Vane/form/Turnstile inventory, all three labeled starters, editability, no overwrite and draft isolation); `scripts/custody-journey.mjs` — “Custody browser journey” (generate, edit and publish all three starter pages at 1440/390)
**Gap.** Privacy, terms and accessibility starters derive from the actual revision and are clearly labeled for owner review, not legal advice. GA4, Vane, connected embed origins, current form fields, Turnstile and applicable acknowledgment relay are named truthfully. Generation never overwrites an existing page and uses the normal immutable draft and owner publication path. Gap: the acceptance journey naming a real connected CRM still requires FORM-005 and an authorized CRM tenant. FORM-005, FORM-008, CMS-010, FORM-001 and LINK-003 must extend the real collection and connection inventory when they add a door. When AI assistance is connected, the actual-service inventory and privacy starter name OpenAI as the AI processor accessed through Base AI and describe the selected page and named image inputs sent only after the owner’s explicit request; pre-request consent copy makes the same disclosure. This addition does not certify provider terms, legal compliance or accessibility.

#### PRIV-004 — Security headers on every page

Core · target · **done**

**Requirement.** Workspace and live pages send a strict content security policy, frame protection, `nosniff`, a referrer policy and a permissions policy; the live site's policy widens only for embeds the owner added (`PAGE-008`).

The installation's shared Lobby (`/`), sign-in (`/signin` and `/auth/*` pages) and setup (`/setup`) documents are workspace pages for this clause: each sends the same permissions policy, `camera=(), microphone=(), geolocation=()`, as workspace and live pages, without changing their sign-in behavior or content security policy. That policy also applies to every frame inside a page and an embed's `allow` attribute cannot override it; the live site delegates one of these features only to a named embed's own origin, on the page holding it, after consent (`PRIV-001`), and only where a target clause names that need.

The current embed door stores a supported HTTPS provider URL in an immutable page revision. Only its published page lists that exact origin in frame-src; workspace and draft previews stay inert. Visitor consent is per provider origin and can be revoked; GPC keeps these embeds off even after saved consent. PAGE-008, MEDIA-004, PRIV-001, LINK-001, STATS-003 and STATS-005 inherit the same origin, consent and workspace boundaries when they add a door. No current embed delegates device permissions.

**Acceptance.**
1. Read the headers on every page type and see the policy; add an embed and see only its host added.

**Evidence.** `tests/search.test.mjs` — PRIV-004: current Pane workspace, preview, live, search and not-found documents retain their security headers; shared entry documents deny device permissions while native authentication and origin refusals remain intact; only an approved page embed widens its frame policy and workspace previews stay inert; `scripts/privacy-journey.mjs` — owner approval, page-only CSP, consent, GPC, opaque sandbox and API refusal at 1440 and 390
**Gap.** None.

#### LOCALE-001 — US defaults

Core · target · **done**

**Requirement.** The workspace and live site default to US English, the business's US time zone with daylight saving, US date and time formats, USD prices, US phone and address formats, and Sunday-start calendars; a business can change each.

**Acceptance.**
1. Set the time zone to America/Denver, and see workspace dates, scheduled times and opening hours in local US format with USD prices.

**Evidence.** `tests/pane.test.mjs` — “US business defaults render Denver hours, currency, phone, address and Sunday calendars and owners can change the formats” (US defaults, Denver, changed formats and draft isolation); “approved business-local schedules drive banners and reminders while drafts, roles and invalid DST dates stay fenced” (DST and schedule execution); `scripts/scheduling-journey.mjs` — “Business-local scheduling journey” (Denver hours, USD, phone, address, Sunday calendar and changed formats at 1440 and 390); `scripts/access-journey.mjs` — “Access browser journey” (all current workspace dates remain in Denver in a Tokyo browser at 1440 and 390).
**Gap.** None.

### Owner mobile

#### MOBILE-001 — Responsive owner workspace on a phone

Core · target · **partial**

**Requirement.** Every workspace task works on a 390-wide phone browser: editing, previewing, approving, replying to enquiries and reading stats, with no horizontal scroll.

**Acceptance.**
1. Run the full browser journey at 390 wide, including the target editor, approvals and inbox replies, with no overflow and a passing accessibility run.

**Evidence.** `scripts/browser-journey.mjs`
**Gap.** The current workspace is checked for overflow at 390 wide; the target editor, inbox replies and approvals on a phone are not built.

#### MOBILE-002 — Native iOS and Android owner app

Core · target · **missing**

**Requirement.** A native owner app sends push notifications for new enquiries, review requests and site problems, lets the owner reply, approve and publish, post to the blog with photos from the camera, and read stats. Its post editor writes `CMS-011` bodies with every paragraph style, inline format, list and link destination, and image (camera or library, with caption and alt text), gallery, quote, button, line and video embed blocks; any other block in a post is shown as a labeled placeholder and kept unchanged when the post is saved from the phone. It uses the installation's own sign-in and holds no content offline beyond what the owner opens.

**Acceptance.**
1. Install the app on iOS and Android test devices, receive a push for a new enquiry, reply, approve a review request and publish a photo post holding an H2, a bulleted list, a link to a page and two camera photos with captions; the live post passes the `CMS-011` DOM checks.
2. Edit a desktop-written post containing a form block on the phone and see the form block unchanged after saving.

**Evidence.** None.
**Gap.** No native app.

### Automation and follow-up

#### AUTO-001 — Form-triggered automations

Core · target · **missing**

**Requirement.** The owner sets rules on form submission: acknowledge the sender, notify people, create a follow-up task, post to Nook, Slack or Microsoft Teams, route to a CRM or tag the enquiry, with conditions on form and field values.

**Acceptance.**
1. Create a rule that posts quote requests over $5,000 to a Nook channel, a Slack test channel and a Microsoft Teams test channel and tags them; submit two forms and see only the large one posted to all three and tagged.

**Evidence.** None.
**Gap.** No automations.

#### AUTO-002 — Scheduled automations

Core · target · **done**

**Requirement.** Time-based rules run on the owner's schedule in their US time zone: holiday-hour banners, recurring reminders to review stale pages, and expiring promotions.

**Acceptance.**
1. Schedule a holiday banner for Thanksgiving and a quarterly page-review reminder, advance the clock, and see both happen at local time.

**Evidence.** `tests/pane.test.mjs` — “approved business-local schedules drive banners and reminders while drafts, roles and invalid DST dates stay fenced” (US business zone, spring DST expiry, duplicate/late cron, page review and approval fences); `scripts/scheduling-journey.mjs` — “Business-local scheduling journey” (Thanksgiving holiday banner and quarterly stale-page reminders at local time, fall DST promotion expiry and spring DST recurring reminders, unapproved schedules flagged without publication, durable editor reopen/undo and 1440/390 screens; exact-candidate timing run cited in campaign plan)
**Gap.** None.

#### AUTO-003 — Share new posts to social accounts

Core · target · **missing**

**Requirement.** On publication a post can be shared to the business's connected Facebook Page, Instagram, LinkedIn Page or X account with owner-approved text.

**Acceptance.**
1. Connect a test Facebook Page, Instagram professional account, LinkedIn Page and X account, publish a post with sharing on, and see each of the four shares created with its link (the Instagram share with the post's featured image).

**Evidence.** None.
**Gap.** No social connections.

#### AUTO-004 — Site problem alerts

Core · target · **missing**

**Requirement.** Pane alerts the owner when a form delivery fails, a connection breaks, a certificate or domain is near expiry, a page returns errors or links break, and can hand external uptime checks to Uptime.

**Acceptance.**
1. Break a webhook, expire a test certificate and add a broken link; see one alert per problem by email and push, and see Uptime monitors created for the live site on request.

**Evidence.** None.
**Gap.** No alerts.

### AI site building

#### AI-001 — Draft a whole site from business facts

Core · target · **missing**

**Requirement.** From the owner's business facts (name, services, service area, hours, prices, team, tone, photos), Pane drafts a complete site: pages, sections, collections, copy, menus, search titles and structured data, using the owner's photos or clearly marked placeholders. The result is an unpublished draft the owner previews and edits; nothing is published without approval, and no reviews, credentials or prices are invented.

**Acceptance.**
1. Enter facts for a test plumbing business (six services with USD prices, two staff, weekly hours, two real reviews), receive a draft site within two minutes and preview every page.
2. A check over the draft's text and structured data passes only when: every price, review, staff name, credential, phone number and opening hour in the draft equals an entered fact or is marked as a placeholder; every entered service has its own page or collection item; every entered staff member and review appears; and every image is an owner photo or a marked placeholder.
3. Publish after edits.

**Evidence.** None.
**Gap.** Whole-site generation from verified business facts is not implemented; current owner assistance is scoped by AI-002 and AI-003.

#### AI-002 — Writing, alt text and translation assist

Core · target · **done**

**Requirement.** In the editor, AI rewrites, shortens and adjusts the tone of selected text, drafts alt text for images, and translates pages into Spanish or other languages as separate draft pages; every suggestion is accepted or rejected by the editor.

**Acceptance.**
1. Rewrite a paragraph, draft alt text for five images and translate the home page to Spanish; accept some suggestions and reject others, and see only accepted text in the draft.
2. Interim product default approved by CT with riders on 26 October 2026: only the authenticated native owner may explicitly request assistance.
3. The server records the generation click with actor, time, operation, selected page, source revision, named image identifiers and request identifier.
4. Before the request, consent copy names OpenAI as the AI processor accessed through Base AI and identifies the selected content and named images being sent.
5. Only that selected page’s content and necessary page-local context and explicitly named image inputs may be sent.
6. Other pages, unrelated unpublished material, revision history, visitor data, form submissions, enquiries, account records and secrets are excluded.
7. Linked targets are not fetched.
8. Every proposal remains pending until individually accepted or rejected; generation changes no draft. Acceptance creates only a new immutable unpublished draft, and translations create separate draft pages. Acceptance atomically checks the reviewed revision and inherits PAGE-006 durable reopen, five-step undo and redo, retained work and explicit conflict resolution without silent overwrite. Publication remains a separate explicit approval under the existing publication guarantees. No automatic publication or other outbound action follows generation or acceptance. The audit records only actor, action, time, operation, identifiers, revisions, provider, model, decision and sanitized outcome metadata; it contains no prompt or output bodies, content excerpts, image bytes, signed image links, credentials or raw provider errors. PRIV-003 policy starters name OpenAI when assistance is connected, remain labeled editable drafts and preserve existing pages. Evidence limits: approval of these defaults is not implementation acceptance. Provider-fake evidence and real-model evidence must be labeled separately. Provider-fake journeys do not establish OpenAI acceptance, provider data handling, model quality or cost. Privacy, legal compliance, accessibility, translation quality and search rankings are not certified by this ruling. The original target and acceptance journey remain binding, and this ruling changes no clause status. CMS-011 retains the remaining full catalog and destinations; PAGE-014 retains its remaining catalog and destinations. AI-004 retains bulk work, SEO-010 retains multilingual-site delivery and AGENT-008 retains USD budgets and agent controls. Scope clarification: A native owner using the editor can satisfy AI-002’s functional acceptance; that journey does not require a non-owner actor. ROLE-001 owns editor and author initiation of assistance within their existing content permissions, enforced server-side by ACCESS-001. The owner-only interim default grants no additional role authority. AI-002 remains partial while applicable ROLE-001 initiation is unproved, even if its owner functional journey passes. Retain selected-text rewriting, shortening and tone adjustment, alt text for five images, Spanish and other-language translation into separate draft pages, individual acceptance and rejection, accepted-only draft changes, and every standing payload, audit, five-step undo and redo, and conflict rider. This clarification approves no implementation, status promotion or completion.

**Evidence.** Provider fake: `tests/search.test.mjs` — “Pane AI writing modes change selected text only and fence both saved and in-flight stale revisions” (rewrite, shorten, tone, accepted-only selected text, imported formatting, five durable undo and redo steps and saved or in-flight revision conflicts); “Pane AI reviews five real page images individually and creates a hidden translated draft without changing its source” (five named raster inputs, selective alt edits, unchanged sixth image, separate Spanish and French drafts and unchanged source). `scripts/ai-journey.mjs` — “AI-003 and AI-002 browser journey” (editor controls, five actual raster inputs, mixed decisions, separate Spanish draft, private previews, retained comparison, copy and guarded undo at 1440 and 390). Real model: `docs/evidence/ai-live.json` — OpenAI, gpt-4.1-mini, 2026-10-26, implementation 57911f06018582251d41429c9cec40750ae17734, 8 explicit requests, sanitized provider response identifiers and operation outcomes. Provider fake: `scripts/ai-riders.mjs` — “riderProof”, loaded by the existing AI journey in the canvas shard (pre-send disclosure and named inputs at both widths, scoped-token refusal, complete provider body exclusion of private sentinels, fixture credential and private signed image URL; full audit allowlists for request, proposal, mixed decision, rejection-only, undo, redo and failure with outcome-specific revision references; all private-data classes, pending decisions, source display, immutable source, sanitized provider failure and connected policy starter); `tests/browser-ai-riders.mjs` — “providerInput” and “auditMetadata”; `docs/evidence/ai-riders.md` — prior 17 source mutations and four fix-round counterexample mutations with before and after output.  Provider fake: `tests/search.test.mjs` — “native page writers initiate private assistance within their current grant and retain actor-owned decisions” (native grant checks, private decisions, refusal, revocation, stale conflicts and code-authoring boundary); “native authors write and submit only own posts and use assistance without exposing other content” (native own-post foundation, all five writing modes, five image inputs, separate Spanish draft, unchanged source and unrelated content, individual decisions, five durable undo and redo steps, conflicts and combined-grant privacy). `scripts/ai-journey.mjs` — “editorInitiation” (all writing modes, five named images, separate Spanish draft, private decisions, five durable undo and redo steps, audit, publication refusal, revocation, icon tooltips and no overflow at 1440 and 390). Provider fake: `tests/search.test.mjs` — “native authors write and submit only own posts and use assistance without exposing other content” now checks the entire provider body, including system instructions and exact output schema; author request, proposal, mixed acceptance, rejection-only, five undo and redo outcomes and sanitized failure through full audit allowlists; and every outbound request around generation and decisions. `tests/pane.test.mjs` — “PRESENT-001: five pages preview with a draft banner and publish without product branding” asserts the exact approving native owner; “later change and rollback restore the exact immutable site with recorded decisions” rereads both complete source snapshots and hashes after later prepare, publication and rollback. `docs/evidence/ai-riders.md` records all five CT counterexample mutations failing at the intended assertion and the restored normal route and browser proof.
**Gap.** CMS-011 retains the remaining catalog-wide rich body workflow. AI-004 retains bulk work, SEO-010 retains multilingual-site delivery and AGENT-008 retains USD budgets and agent controls.

#### AI-003 — Search and content suggestions with approval

Core · target · **done**

**Requirement.** AI reviews pages for search and clarity (titles, descriptions, headings, internal links, structured data gaps) and proposes edits as a draft the owner approves.

**Acceptance.**
1. Run the review on a weak page, see proposed titles, descriptions and links, accept two and publish.
2. Interim product default approved by CT with riders on 26 October 2026: only the authenticated native owner may explicitly request assistance.
3. The server records the generation click with actor, time, operation, selected page, source revision, named image identifiers and request identifier.
4. Before the request, consent copy names OpenAI as the AI processor accessed through Base AI and identifies the selected content and named images being sent.
5. Only that selected page’s content and necessary page-local context and explicitly named image inputs may be sent.
6. Other pages, unrelated unpublished material, revision history, visitor data, form submissions, enquiries, account records and secrets are excluded.
7. Linked targets are not fetched.
8. Every proposal remains pending until individually accepted or rejected; generation changes no draft. Acceptance creates only a new immutable unpublished draft, and translations create separate draft pages. Acceptance atomically checks the reviewed revision and inherits PAGE-006 durable reopen, five-step undo and redo, retained work and explicit conflict resolution without silent overwrite. Publication remains a separate explicit approval under the existing publication guarantees. No automatic publication or other outbound action follows generation or acceptance. The audit records only actor, action, time, operation, identifiers, revisions, provider, model, decision and sanitized outcome metadata; it contains no prompt or output bodies, content excerpts, image bytes, signed image links, credentials or raw provider errors. PRIV-003 policy starters name OpenAI when assistance is connected, remain labeled editable drafts and preserve existing pages. Evidence limits: approval of these defaults is not implementation acceptance. Provider-fake evidence and real-model evidence must be labeled separately. Provider-fake journeys do not establish OpenAI acceptance, provider data handling, model quality or cost. Privacy, legal compliance, accessibility, translation quality and search rankings are not certified by this ruling. The original target and acceptance journey remain binding, and this ruling changes no clause status. SEO-005 retains structured-data implementation, AI-004 retains bulk work and AGENT-008 retains USD budgets and agent controls.

**Evidence.** Provider fake: `tests/search.test.mjs` — “Pane AI search decisions require the native owner, preserve rejected edits and publish approved native links” (titles, descriptions, accepted heading and native link destinations, read-only structured data findings, individual decisions, two accepted metadata edits, separate publication, unchanged reusable placements and pending redirects); “Pane AI writing modes change selected text only and fence both saved and in-flight stale revisions” (five durable undo and redo steps and saved or in-flight revision conflicts). `scripts/ai-journey.mjs` — “AI-003 and AI-002 browser journey” (review, two accepted search edits, rejected remainder, separate publication, retained comparison and download, explicit latest selection and undo or redo at 1440 and 390). Real model: `docs/evidence/ai-live.json` — OpenAI, gpt-4.1-mini, 2026-10-26, implementation 57911f06018582251d41429c9cec40750ae17734, 8 explicit requests, sanitized provider response identifiers and operation outcomes. Provider fake: `scripts/ai-riders.mjs` — “riderProof”, loaded by the existing AI journey in the canvas shard (pre-send disclosure and named inputs at both widths, scoped-token refusal, complete provider body exclusion of private sentinels, fixture credential and private signed image URL; full audit allowlists for request, proposal, mixed decision, rejection-only, undo, redo and failure with outcome-specific revision references; all private-data classes, pending decisions, source display, immutable source, sanitized provider failure and connected policy starter); `tests/browser-ai-riders.mjs` — “providerInput” and “auditMetadata”; `docs/evidence/ai-riders.md` — prior 17 source mutations and four fix-round counterexample mutations with before and after output.
**Gap.** SEO-005 retains structured-data implementation, AI-004 retains bulk work and AGENT-008 retains USD budgets and agent controls.

#### AI-004 — AI collection and bulk content operations

Core · target · **missing**

**Requirement.** AI creates a collection schema from a description or a pasted list, fills items from source text the owner provides, and makes bulk edits (for example update every service's price range) as one reviewable draft.

**Acceptance.**
1. Paste a price list, see a services collection proposed and filled, then ask for a bulk change and approve the diff.

**Evidence.** None.
**Gap.** No collection or bulk AI operations.

### Agents that build and keep the site true

#### AGENT-001 — Interview the owner and build from verified facts

Core · push-further · **missing**

**Requirement.** *What the agent does:* Interviews the owner by chat or voice (on the web or the phone app) about the business, then checks each fact against sources the owner names: their Google Business Profile, existing website, Orbit services and Dial availability. It builds the draft site (`AI-001`) only from confirmed facts, marks each claim with its source, and asks about anything it could not confirm instead of guessing.

*Data:* The interview, the owner's connected profiles and existing site, and the business's own records in Orbit and Dial when connected.

*Human control:* The owner confirms every fact, offer, price and staff name, and approves the preview before publication. The agent cannot publish, invent reviews, credentials or prices, or contact anyone.

**Acceptance.**
1. Run the interview for a test business with a connected Google Business Profile that disagrees with one answer; see the conflict raised, each published claim traced to a source, and nothing live before the owner approves.

**Evidence.** None.
**Gap.** No agent; the interview, fact store and sourcing do not exist.

#### AGENT-002 — Keep business facts current across the site

Core · push-further · **missing**

**Requirement.** *What the agent does:* Watches for facts going stale: hours and holiday hours that differ from Google Business Profile, services or prices changed in Orbit, staff who left, seasonal promotions past their date, and pages not reviewed in six months. It drafts only the affected pages, items and redirects as one revision.

*Data:* Site revisions, collections, Google Business Profile (`SEO-008`), Orbit and Dial records, schedules (`CMS-005`).

*Human control:* Each change arrives as a draft with its reason and source; the owner previews and approves. Price and offer changes always need the owner, even when publishing is delegated.

**Acceptance.**
1. Change a service price in Orbit and holiday hours in the profile; see one draft that changes only the affected page, item and structured data, with sources, waiting for approval.

**Evidence.** None.
**Gap.** No fact watching.

#### AGENT-003 — Prove every enquiry reaches a person

Core · push-further · **missing**

**Requirement.** *What the agent does:* With the owner's permission, sends clearly labeled test submissions through each form on a schedule and checks the whole path: stored, notification accepted, CRM record created (`FORM-005`), booking handoff working. On a failure it identifies the broken step, files a repair task to the right person and re-checks after repair; it also flags real enquiries that have no owner or reply (`FORM-006`).

*Data:* Forms, delivery states, CRM and booking connection states, enquiry status.

*Human control:* The owner turns test submissions on, sets their schedule and label, and they are excluded from stats and CRM pipelines. The agent cannot pose as a customer to anyone outside the business or change a route without approval.

**Acceptance.**
1. Break the HubSpot connection; the next scheduled test finds it, names the failing step, notifies the owner, and passes after repair, with no test record left in reports.

**Evidence.** None.
**Gap.** Enquiries reach the workspace inbox (`INBOX-001`) but nothing checks delivery; no agent.

#### AGENT-004 — Recover lost search traffic and broken paths

Core · push-further · **missing**

**Requirement.** *What the agent does:* Watches Search Console clicks (`SEO-007`), 404s from old URLs, broken links and slow pages. When traffic to a page drops or an old URL starts failing, it explains the likely cause with evidence and drafts the fix: a redirect, a restored page, a better title or a smaller image.

*Data:* Search Console data, server 404 counts, link checks, Core Web Vitals (`HOST-001`), revision history.

*Human control:* Fixes are drafts the owner approves. The agent never promises rankings and reports uncertainty with each diagnosis.

**Acceptance.**
1. Delete a page that receives search clicks without a redirect; the agent reports the 404s with the lost clicks and drafts the redirect; approve it and see the 404s stop.

**Evidence.** None.
**Gap.** No search data or link checks.

#### AGENT-005 — Measure changes against real leads and bookings

Core · push-further · **missing**

**Requirement.** *What the agent does:* Joins page revisions with conversions (`STATS-002`): enquiries, bookings and purchases confirmed by Orbit, Dial, Stall or Stripe. It proposes a limited change (headline, form length, call-to-action) with a stated hypothesis, runs it as a before-and-after comparison or an A/B split, and reports the result with its confidence.

*Data:* Revisions, conversion goals, CRM and booking outcomes, traffic by source.

*Human control:* The owner approves each experiment, its traffic split and duration, and every live claim. The agent reports uncertainty, never treats clicks as revenue and ends an experiment the owner stops.

**Acceptance.**
1. Approve an A/B test of two contact-page headlines; see traffic split as approved, conversions counted from real form submissions, and a final report with confidence and a recommended winner the owner can publish.

**Evidence.** None.
**Gap.** Revisions and day counts exist but no conversion data or experiments.

#### AGENT-006 — Move a business off its old platform

Core · push-further · **missing**

**Requirement.** *What the agent does:* Reads the old site (`IMPORT-001` to `IMPORT-004`), proposes the page and collection mapping, rebuilds layouts it cannot import directly, tests every old URL's redirect and every form's lead route on a preview hostname, and prepares the cutover plan (`IMPORT-006`).

*Data:* The old site's export and published pages, its URL list, its form destinations and DNS records.

*Human control:* The owner reviews the migration report and every listed loss, proves domain control and chooses when to cut over and roll back. The old site stays live until the owner closes it.

**Acceptance.**
1. Migrate a test XML-export site builder site; see the mapping, the rebuilt pages, a redirect test with every old URL passing, form routes tested, and a cutover the owner approves and then rolls back once.

**Evidence.** None.
**Gap.** Only the reviewed static JSON move-in exists (`MOVEIN-001`).

#### AGENT-007 — Follow up unanswered enquiries under an approved policy

Core · push-further · **missing**

**Requirement.** *What the agent does:* Drafts replies to new enquiries from the site's facts and the owner's past replies, and sends the owner's approved holding reply when an enquiry passes the response window (`FORM-006`). Full help-desk work stays in HappyToHelp.

*Data:* Enquiries, the site's published facts, the owner's sent replies, booking availability from Dial.

*Human control:* The owner approves a response policy (which enquiries, what wording, when). Anything outside it is a draft for the owner. The agent never quotes a price, promises availability or sends marketing.

**Acceptance.**
1. Approve a holding-reply policy, leave a quote request unanswered past the window, and see the holding reply sent within policy while a draft full reply waits for the owner.

**Evidence.** None.
**Gap.** No reply drafting or sending.

#### AGENT-008 — Agent controls, budgets and audit

Core · push-further · **missing**

**Requirement.** *What the agent does:* Governs every agent above: each proposal arrives as a draft revision or a queued action with its reason and evidence, every action is recorded in the activity log (`AUDIT-001`), and each agent runs within a monthly USD budget for model and provider costs.

*Data:* The agents' proposals, actions and costs.

*Human control:* The owner turns each agent on or off, sets its budget and its permissions, and can undo any agent change in one action. When the budget is reached the agent stops and says so.

**Acceptance.**
1. Turn on two agents with a $5 budget, let one reach the budget, and see it stop with a notice; undo an agent's approved change and see the log record both.

**Evidence.** None.
**Gap.** No agents run inside Pane; outside agents use the command helper (`API-001`). Every future agent door must enforce the existing API-001 native authority intersection, explicit scope, credential custody and transactional metadata audit.

## Agent surface

None.

## Later

None.

## Field proof register

No field proof is recorded yet.
