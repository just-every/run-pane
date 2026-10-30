# Pane target product contract

Target edition: 16 October 2026. Pane is the owned website builder and CMS a US small business uses instead of Squarespace, Wix or WordPress.com: a visual editor with unlimited pages, responsive templates and brand styles, a media library, CMS collections and a blog, custom domains on fast hosting, a full search toolkit, forms that route leads to a person and a CRM, and booking, checkout and newsletter blocks handed to the products that own those jobs. Agents build the site from verified business facts and keep it current, discoverable and converting.

## Product target

| | |
| --- | --- |
| Category | Small-business website builder and CMS |
| Incumbents a buyer switches from | Squarespace, Wix, WordPress.com |
| Up-and-comers it must also beat | Framer, Webflow, Durable |
| First buyer | The owner or marketing generalist of a 1 to 50 person US local or professional-service business (a restaurant, salon, trade, clinic, studio or practice) moving a site from an existing website platform; costs in USD on the buyer's own Cloudflare account, with no per-feature upsells |
| What switching means | Their pages, posts, collections, media and old URLs arrive with an explicit list of what did not map; their domain moves without breaking their email; every daily job (editing, publishing, blogging, answering enquiries, taking bookings, reading results) has a Pane equivalent; their CRM, booking, checkout, newsletter, analytics and search accounts plug in; and they can leave with open-format exports |

A buyer replacing an incumbent needs the whole job, so the target is the whole job:

- **Build visually.** Unlimited pages with folders, clean URLs and an editable not-found page, a section and block editor with grid placement, column ratios, section backgrounds (image, color, video), spacing and image cropping, a separate phone layout, galleries with lightbox, menus with social icons, reusable components, pop-ups, autosave, page status and review, custom code, a coming-soon gate, accessible output, a trash with single page and post restore and a full block catalog whose text carries heading levels, formatting, lists and links to pages, anchors, files, URLs, email, phone and text messages (`PAGE-001` to `PAGE-015`), on responsive templates with site-wide brand styles that survive a template switch (`STYLE-001` to `STYLE-004`), with a media library that optimizes images and embeds video and maps (`MEDIA-001` to `MEDIA-004`).
- **Publish content.** CMS collections for services, team, projects, testimonials, locations, FAQs and menus with template pages, lists, a blog whose posts and rich-text fields use the same block editor as pages, moderated comments, an events calendar, scheduling, RSS and podcast feeds, CSV import and site search (`CMS-001` to `CMS-011`), always through immutable revisions, preview, approval and one-action rollback (`PUBLISH-001` to `PUBLISH-004`).
- **Be found.** A custom domain at apex and `www`, plus alias domains, with managed HTTPS that keeps the business's email working, mailboxes and registrar email forwarding alike, fast edge hosting that survives an admin outage, updates without plugin upkeep, a visible USD running cost and an install from the browser with no terminal (`DOMAIN-001` to `DOMAIN-005`, `HOST-001` to `HOST-005`); titles, descriptions, redirects, sitemap, canonical URLs, local-business structured data, social cards, Search Console, Bing, Google Business Profile and multilingual sites with `hreflang` (`SEO-001` to `SEO-010`).
- **Turn visitors into business.** Forms with spam protection, email notification and reply, acknowledgments, CRM routing to Orbit or HubSpot, enquiry ownership and follow-up, Google Sheets export and consent capture (`FORM-001` to `FORM-008`); booking, checkout, newsletter and automation connections with a health panel (`LINK-001` to `LINK-005`, `API-001`); traffic, conversion goals, Vane or GA4, Meta Pixel and Google Ads conversions on those goals and a monthly report (`STATS-001` to `STATS-005`); form-triggered and scheduled automations, social sharing and problem alerts (`AUTO-001` to `AUTO-004`).
- **Run it as a team, anywhere.** Owner, admin, editor, author, inbox and reporting roles, delegated publishing, designer handover, passkeys and two-step sign-in and a full activity log (`ACCESS-*`, `ROLE-001` to `ROLE-004`, `AUDIT-001`); a phone-ready workspace and native iOS and Android owner apps (`MOBILE-001`, `MOBILE-002`).
- **Move in and out.** Imports from hosted and self-hosted WXR publishing platforms, XML-export and crawl-only site builders, collection-based and design-first visual site builders, and AI-generated site builders with a migration report, URL map, comments, events, enquiry and subscriber history and verified cutover (`MOVEIN-001`, `IMPORT-001` to `IMPORT-007`); open-format exports, backups, person-level privacy requests, US policy starters, security headers and US defaults (`BACKUP-001`, `ERASE-001`, `EXPORT-001`, `PRIV-001` to `PRIV-004`, `LOCALE-001`).
- **Let AI and agents do the work.** AI drafts a whole site from business facts, assists writing, alt text and translation, suggests search fixes and edits collections in bulk (`AI-001` to `AI-004`); agents interview the owner, keep facts current, prove enquiries reach a person, recover lost search traffic, measure changes against real leads, migrate platforms and follow up enquiries, all under owner control and a USD budget (`AGENT-001` to `AGENT-008`).

### Neighboring products stay separate

Pane is one product: the website. Where the market sells a neighboring product separately, Pane connects to it and does not rebuild it; when the neighbor is a Run Edit Run sibling, Pane links to that sibling first and to the US incumbent second.

| Job | Owned by | How Pane meets it |
| --- | --- | --- |
| CRM, contacts and sales pipeline | [Orbit](https://github.com/just-every/run-orbit) (or HubSpot, Pipedrive) | Lead routing from forms with delivery state (`FORM-005`); facts for agents (`AGENT-001`, `AGENT-002`) |
| Appointment booking | [Dial](https://github.com/just-every/run-dial) (or Calendly, Acuity Scheduling) | Booking blocks and booking conversions (`LINK-001`) |
| Online store, cart and checkout | [Stall](https://github.com/just-every/run-stall) (or Squarespace Commerce, Shopify, Stripe Payment Links, PayPal) | Product blocks and buy buttons that hand off checkout (`LINK-002`) |
| Paid memberships and subscriptions | [Nectar](https://github.com/just-every/run-nectar) or Stall (or Stripe Billing) | Member-only pages check access (`PAGE-011`); billing stays with the provider |
| Email marketing and newsletters | [Mango](https://github.com/just-every/run-mango) (or Mailchimp, Kit) | Signup blocks and pop-ups, consent, new-post sends and subscriber import (`LINK-003`, `FORM-008`, `CMS-006`, `PAGE-013`, `IMPORT-007`) |
| Web analytics | [Vane](https://github.com/just-every/run-vane) (or Google Analytics 4) | Built-in counts and goals plus a connection (`STATS-001` to `STATS-003`); ad conversions to Meta and Google Ads (`STATS-005`) |
| Standalone forms and surveys | [Pencil](https://github.com/just-every/run-pencil) (or Typeform, Jotform) | Pane builds site forms (`FORM-001`); multi-step surveys and quizzes embed from Pencil |
| Help desk and live chat | [HappyToHelp](https://github.com/just-every/run-happytohelp) (or Zendesk, Intercom) | Enquiry follow-up only (`FORM-006`, `AGENT-007`); support queues and chat widgets embed from HappyToHelp |
| Workflow automation across apps | [Crank](https://github.com/just-every/run-crank) (or Zapier, Make) | Signed webhooks and published triggers (`LINK-004`) |
| Observability | [Porthole](https://github.com/just-every/run-porthole) (sibling seed) | Observability stays with Porthole |
| Uptime monitoring | [Uptime](https://github.com/just-every/run-uptime) (or UptimeRobot) | Problem alerts hand external checks to Uptime (`AUTO-004`) |
| Team chat | [Nook](https://github.com/just-every/run-nook) (or Slack, Microsoft Teams) | Enquiry and review notifications (`AUTO-001`) |
| Restaurant reservations | [Placemat](https://github.com/just-every/run-placemat) (or OpenTable, Resy) | Embedded through the booking and custom embed blocks (`LINK-001`, `PAGE-008`) |
| Class schedules for studios | [Strap](https://github.com/just-every/run-strap) (or Mindbody) | Embedded through the booking and custom embed blocks |
| File storage | [Chest](https://github.com/just-every/run-chest) (or Google Drive) | Media is Pane's own (`MEDIA-001`); shared drives stay in Chest |
| Workforce sign-in | [Auth](https://github.com/just-every/run-auth) (or Okta, Microsoft Entra ID) | Optional identity provider for the workspace through Base's native sign-in |

Observability stays with [Porthole](https://github.com/just-every/run-porthole); external uptime checks stay with Uptime (`AUTO-004`).

A business phone system has no sibling; Pane links phone numbers for click-to-call and counts the clicks (`STATS-002`) and does not route calls.

#

The primary journey: Move the existing business site in, inspect its content and old URLs, keep its email, edit and preview, publish on its domain, route enquiries to a person and measure the resulting leads, with export and recovery throughout.

## How to read this contract

- This follows the RER contract standard.
- Core includes first-week switching depth and push-further jobs; Agent surface is reported separately and Later retains premium or rare scope.
- Done means every acceptance point has a named sanity journey on the exact candidate.
- The Field proof register keeps dated real-world proof separate from seed acceptance.
- ACCEPTANCE.md, docs/CLAIMS.md and summary counts are generated from this source.

## Door rules

- **D-1.** A native person's publication, import or assistance decision binds the exact reviewed revision. An agent's equivalent draft change carries standard; publication carries external and live, adding commitment for binding offers, and the company's policy decides each class. Native person steps in the acceptance journeys use the held company policy; they prescribe no agent disposition. Captures retain the native-only authority required by RL-101.

- **D-2.** Private changes and public form and visit submissions require the installation's canonical origin; a foreign origin changes nothing.

- **D-3.** Import fidelity. every source page, post, collection item, event and gallery image is present on the new site or listed in the `IMPORT-005` report with a reason; each page's, post's and item's visible text matches the source's after whitespace normalization; every source image is fetched and served through `MEDIA-002` or listed as unfetchable; every old URL from the source sitemap and crawl answers 301 to a new URL that answers 200; on each imported page, blog post, collection item and event (its body and every rich-text field, held in the `CMS-011` editor) every source link and button is present with the same destination (internal targets resolved through the URL map to the new URL, anchors to the matching section anchor, files to their `MEDIA-001` copy, and external, `mailto:`, `tel:` and `sms:` targets unchanged), each source heading has the same level, each source list is a list of the same type with the same items, and each inline image is in the same place in the body with its caption and alt text; and the applied counts per content type equal the report's counts.

- **D-4.** Public counting excludes DNT and GPC and keeps no visitor identity. Third-party content uses the visitor's category or provider choice; GPC overrides advertising and analytics grants, and withdrawal stops active execution. Public code stays isolated from workspace data and sessions.

- **D-5.** Controlled capture (RL-101). Every fresh Wix, Webflow, Framer or Durable crawl requires current native owner/admin authority, per-crawl explicit purpose and consent, and an expiring operator-bound DNS proof for the exact controlled public HTTPS origin. Screen all addresses; follow no redirects, send no source credentials and execute no scripts or forms. Bound capture and retain exact capture, mapping and exception receipts in ordinary import custody; apply only the reviewed unpublished draft. Show every unfetched item and redirect explicitly. DNS control proves origin control, not ownership or licensing of every asset. Offline uploads convey no network authority, and scoped tokens have none.

## Shared duties (Base)

| Base duty | Duty | Delta clauses | Base journey |
| --- | --- | --- | --- |
| BASE-ACCESS-001 | Sign-in | ACCESS-001, HOST-005, ROLE-004 | not run |
| BASE-ACCESS-002 | Sessions | ACCESS-001, PUBLISH-002 | not run |
| BASE-ACCESS-003 | Public endpoints | none | not run |
| BASE-ACCESS-004 | Server-side authorisation | ACCESS-001, ACCESS-002 | not run |
| BASE-INPUT-001 | Validation | MOVEIN-001, CMS-001, CMS-002, FORM-001, IMPORT-005, IMPORT-006, IMPORT-007 | not run |
| BASE-INPUT-002 | HTML | INBOX-001 | not run |
| BASE-INPUT-003 | Uploads | STYLE-004, MEDIA-001, MEDIA-002, MEDIA-003, FORM-001 | not run |
| BASE-SECRET-001 | No leakage | PAGE-008, PAGE-017, MEDIA-004, STATS-003, PRIV-004 | not run |
| BASE-SECRET-002 | Startup | none | not run |
| BASE-DATA-001 | Export and import | BACKUP-001, FORM-007, EXPORT-001 | not run |
| BASE-DATA-002 | Retention | none | not run |
| BASE-DATA-003 | Erasure | INBOX-001, ERASE-001, PRIV-002, AUDIT-001 | not run |
| BASE-DATA-004 | Outbound flows | none | not run |
| BASE-DATA-005 | Independence | none | not run |
| BASE-PUBLIC-001 | Privacy | VISIT-001, RUNSITE-001, PAGE-008, PAGE-017, MEDIA-004, STATS-003, PRIV-001, PRIV-004 | not run |
| BASE-PUBLIC-002 | Origins | none | not run |
| BASE-PUBLIC-003 | Accessibility | PAGE-009 | not run |
| BASE-OPS-001 | Health | HEALTH-001 | not run |
| BASE-OPS-002 | Migrations | DEPLOY-001, HOST-003 | not run |
| BASE-OPS-003 | Idempotency | INBOX-001, FORM-004, AUTO-001, AUTO-002, AUTO-003, AUTO-004 | not run |
| BASE-OPS-004 | Failure is visible | AUTO-001, AUTO-002, AUTO-003, AUTO-004 | not run |
| BASE-OPS-005 | Audit | AUDIT-001 | not run |
| BASE-ROLE-001 | Roles through every door | ACCESS-001, PUBLISH-002, PUBLISH-003, MOVEIN-001, PAGE-011, PAGE-016, CMS-001, CMS-002, ROLE-001, ROLE-003 | not run |
| BASE-AUDIT-001 | Searchable, durable audit | PUBLISH-004, ROLE-004, AUDIT-001 | not run |
| BASE-BACKUP-001 | Independent backup, restore and rollback | BACKUP-001, HOST-003 | not run |
| BASE-DATA-006 | Erasure respects retention and legal hold | ERASE-001, PRIV-002 | not run |
| BASE-SIGNIN-001 | Standards-based SSO and lifecycle | ROLE-004 | not run |
| BASE-SIGNIN-002 | Native multi-factor authentication | ROLE-004 | not run |
| BASE-INSTALL-001 | Free self-host and removal | DEPLOY-001, HOST-005 | not run |
| BASE-MAIL-001 | Truthful mail outcomes | DOMAIN-005, FORM-003, FORM-004, LINK-003 | not run |
| BASE-ACCESSIBILITY-001 | One accessibility bar | LOBBY-001, PAGE-009, CMS-001, CMS-002, FORM-001 | not run |
| BASE-DOCS-001 | On-site docs from one contract | RUNSITE-001 | not run |
| BASE-AGENT-001 | One MCP door per seed | SURFACE-001 | not run |
| BASE-AGENT-002 | The seed's jobs are tools, through the UI's own actions | AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-006, AGENT-007, AGENT-008, SURFACE-001 | not run |
| BASE-AGENT-003 | Records are resources | SURFACE-001 | not run |
| BASE-AGENT-004 | Business identity and short-lived, audience-bound tokens | API-001, SURFACE-004 | not run |
| BASE-AGENT-005 | An agent acts as a person in a role, never more | API-001, SURFACE-003 | not run |
| BASE-AGENT-006 | Every action declares its risk class | PUBLISH-003, SEO-008, SEO-010, API-001, AI-001, AI-002, AI-003, AI-005, AI-006, AI-004, AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-006, AGENT-007, AGENT-008, SURFACE-002, SURFACE-003 | not run |
| BASE-AGENT-007 | The company's policy decides, at one chokepoint | PUBLISH-003, SEO-008, SEO-010, API-001, AI-001, AI-002, AI-003, AI-005, AI-006, AI-004, AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-006, AGENT-007, AGENT-008, SURFACE-002, SURFACE-003, SURFACE-004 | not run |
| BASE-AGENT-008 | Truthful attribution | SURFACE-003 | not run |
| BASE-AGENT-009 | Every agent action is audited with its class and decision | API-001, AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-006, AGENT-007, AGENT-008, SURFACE-004 | not run |
| BASE-AGENT-010 | Agents can follow changes | SURFACE-001 | not run |
| BASE-AGENT-011 | Limits are policy, and Pause stops everything | AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-006, AGENT-007, AGENT-008, SURFACE-004 | not run |
| BASE-AGENT-012 | Writes are idempotent and conflict-safe | SURFACE-004 | not run |
| BASE-AGENT-013 | Manifest, docs and the conformance journey | SURFACE-001, SURFACE-004 | not run |

## Published clauses

- `ACCESS-001`: *Tier:* Core · *Cites:* BASE-ACCESS-001, BASE-ACCESS-002, BASE-ACCESS-004, BASE-ROLE-001
- `ACCESS-002`: *Tier:* Core · *Cites:* BASE-ACCESS-004 · *Rules:* D-2
- `PUBLISH-001`: *Tier:* Core
- `PUBLISH-002`: *Tier:* Core · *Cites:* BASE-ACCESS-002, BASE-ROLE-001
- `PUBLISH-003`: *Tier:* Core · *Cites:* BASE-ROLE-001, BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-1
- `PUBLISH-004`: *Tier:* Core · *Cites:* BASE-AUDIT-001 · *Rules:* D-1
- `INBOX-001`: *Tier:* Core · *Cites:* BASE-INPUT-002, BASE-OPS-003, BASE-DATA-003
- `VISIT-001`: *Tier:* Core · *Cites:* BASE-PUBLIC-001 · *Rules:* D-4
- `MOVEIN-001`: *Tier:* Core · *Cites:* BASE-INPUT-001, BASE-ROLE-001 · *Rules:* D-1, D-2
- `BACKUP-001`: *Tier:* Core · *Cites:* BASE-DATA-001, BASE-BACKUP-001
- `ERASE-001`: *Tier:* Core · *Cites:* BASE-DATA-003, BASE-DATA-006
- `HEALTH-001`: *Tier:* Core · *Cites:* BASE-OPS-001 · *Register:* R-1
- `DEPLOY-001`: *Tier:* Core · *Cites:* BASE-INSTALL-001, BASE-OPS-002 · *Register:* R-1
- `RUNSITE-001`: *Tier:* Core · *Cites:* BASE-DOCS-001, BASE-PUBLIC-001
- `LOBBY-001`: *Tier:* Core · *Cites:* BASE-ACCESSIBILITY-001
- `PRESENT-001`: *Tier:* Core

### Sign-in, roles and authority

#### ACCESS-001 — Server-side role authorization

**Requirement.** Pane's role matrix gives owners publication, rollback and message erasure; owners and admins prepare, preview and import; members read the workspace. ROLE-001 extends this matrix.

**Acceptance.**
1. Sign in as owner, invite and confirm an admin and member, then exercise Pane's permitted and forbidden prepare, publish and workspace actions; deactivate the admin and repeat its prepare request without a write.

#### ACCESS-002 — Canonical-origin mutations

**Requirement.** Pane's canonical-origin rule includes public contact and visit submissions as well as private mutations.

**Acceptance.**
1. A foreign-origin prepare request and contact submission leave both the revision inventory and inbox unchanged; equivalent canonical-origin actions complete.

### Revisions and publication

#### PUBLISH-001 — Immutable complete revisions

**Requirement.** A revision holds the complete site snapshot and its SHA-256. It is never edited after it is created. As the target editor, collections, navigation, styles and media arrive (`PAGE-*`, `CMS-*`, `STYLE-*`, `MEDIA-*`), the snapshot grows to hold all of them, so a revision always reproduces the whole public site.

**Acceptance.**
1. Prepare two revisions, read them back through the private product API and compare their snapshots and hashes; neither changes after a later prepare, publish or rollback.

#### PUBLISH-002 — Private draft preview

**Requirement.** An owner or admin previews a selected revision privately with a draft banner and contact sending disabled.

**Acceptance.**
1. Open the selected revision signed out, as a member and as an admin: the first two gain no draft access and the admin sees its pages and banner with contact sending disabled.

#### PUBLISH-003 — Owner-approved atomic publication

**Requirement.** Publication selects one revision as live and records the owner's approval (actor, revision, time) in one atomic write. An admin can prepare but cannot publish unless the owner delegates that right under `ROLE-002`.

**Acceptance.**
1. As owner, publish a prepared revision; every public page serves it and the approval record names the owner and revision.
2. As admin, publishing is refused.

#### PUBLISH-004 — One-action rollback

**Requirement.** The owner restores any earlier immutable revision as the live site in one action, and the rollback is recorded like a publication.

**Acceptance.**
1. Publish a change, roll back to the first revision, and see the public site lose the change and the approval record gain one rollback entry.

### Contact inbox and visit counts

#### INBOX-001 — Durable, escaped and idempotent contact submissions

**Requirement.** Pane's public contact door keeps one durable enquiry for a retried submission key; an erased key cannot recreate its enquiry.

**Acceptance.**
1. Submit a contact twice with one key and a name containing markup: read one escaped enquiry in the workspace; erase it and retry the key without recreating it.

#### VISIT-001 — Cookie-free aggregate visit counts

**Requirement.** Live page views store only a day and path count. No cookie, identifier or address is stored, previews are not counted, and a browser sending Do Not Track or Global Privacy Control is not counted.

**Acceptance.**
1. Post a visit with `DNT: 1` and one without; the page's count rises by exactly one and no visitor record exists.

### Move-in, backup and erasure

#### MOVEIN-001 — Reviewed static-site move-in with guarded undo

**Requirement.** An owner or admin dry-runs the documented static-site JSON through Base's import kit, approves the plan's fingerprint and imports an unpublished draft. Undo reverses an unchanged, unpublished import and keeps its journal; undoing a published import is refused.

**Acceptance.**
1. Dry-run the fixture, apply with a wrong fingerprint (refused), apply with the reviewed one, confirm the live site is unchanged, undo as a member (refused) and as an admin (undone, journal kept).

#### BACKUP-001 — Export and restore into an empty installation

**Requirement.** Pane's installation archive carries the live site revision, immutable history and import journals.

**Acceptance.**
1. Export a populated Pane installation, restore into an empty installation through the archive transport, and reconcile the live revision, history and import journals; an occupied destination is refused without changing it.

#### ERASE-001 — Message erasure fenced against old backups

**Requirement.** Message erasure fences Pane's earlier archives and remembers the erased submission key so neither restoration nor a visitor retry resurrects it.

**Acceptance.**
1. Erase a message as admin (refused) and as owner, replay its submission (not stored), then restore an older archive with the later journal and see it refused.

### Operation and presentation

#### HEALTH-001 — Deployment health and unknown paths

**Requirement.** Pane exposes the deployment's source, fingerprint and version in its health response; unknown workspace and business-site pages are missing pages.

**Acceptance.**
1. Compare local deployment identity with its deployment record, and request unknown workspace and site pages to see missing-page responses.

#### DEPLOY-001 — Install on the owner's Cloudflare account

**Requirement.** Pane's command-line installation supplies its site-revision D1 schema and migration history alongside its Worker. The supported provider account is Cloudflare and costs are in USD.

**Acceptance.**
1. Through the supported deployment command and a Cloudflare-compatible provider edge, apply Pane's migrations, read matching deployment identity and remove the isolated installation.

#### RUNSITE-001 — Public run site and documentation

**Requirement.** Pane's run site presents its picked homepage and run instructions without installation sign-in links.

**Acceptance.**
1. Build the public run site and open the homepage, run instructions and every linked guide through its HTTP router; an unknown page is missing and no installation sign-in link is offered.

#### LOBBY-001 — Shared Lobby, workspace and theme

**Requirement.** Pane's shared Lobby, sign-in, setup and anchored workspace use its fuchsia and self-hosted Figtree theme; [presentation details](docs/contract/MECHANISM.md) define the theme.

**Acceptance.**
1. Open the Lobby, sign-in, setup and workspace at 1440 and 390: read the shared theme, activate a workspace anchor and see no horizontal overflow.

#### PRESENT-001 — Labeled previews and unbranded live pages

**Requirement.** Previews use the business site's typography with an explicit draft banner. Live business pages carry the business's name only: no Pane branding in the page, title, footer or metadata.

**Acceptance.**
1. Open a preview and see the banner; open every live page and find no Pane name or mark in the HTML, including `<title>`.

## Target clauses

### Pages and the visual editor

#### PAGE-001 — Unlimited pages, folders and clean URLs

*Tier:* Core

**Requirement.** An editor adds, renames, reorders, hides and deletes any number of pages, groups them in folders, and sets each page's clean URL slug. The home page is chosen, not fixed. Deleting or renaming a published page offers a redirect (`SEO-002`). The five-page ceiling is removed; the five starter pages become a template (`STYLE-001`). The not-found page is an ordinary editable page (heading, text, search box, links, any section) that the live site serves for every unknown URL with HTTP status 404.

**Acceptance.**
1. Create 40 pages in three folders through the editor, rename two slugs, delete one, publish, and open every URL; renamed and deleted pages answer 301 to the chosen targets, and the revision snapshot holds all 40.
2. Edit the not-found page, publish, request an unknown URL and see the edited page with status 404.

#### PAGE-002 — Visual section and block editor with layout controls

*Tier:* Core

**Requirement.** Pages are built visually from sections (hero, text, image, gallery, columns, list, testimonials, pricing, FAQ, contact, map, call-to-action) and the blocks inside them, drawn from the block catalog of `PAGE-014`, whose text blocks carry the headings, formatting, lists and links that clause states. An editor adds, moves by drag or keyboard, duplicates and deletes sections and blocks, and edits text in place on the page as it will look. New sections and blocks start from the site's styles (`STYLE-002`), and the editor then controls the layout of each one: blocks are placed and resized on a 12-column grid (column span, row placement, overlap order) with left, center or right alignment and vertical alignment; a columns section sets its column ratio (for example 1:1, 1:2, 2:1 or 1:1:1) and gap; each section sets its background (a color from the palette or any hex color, an image with a focal point and overlay opacity, or a muted looping background video from the media library or a YouTube or Vimeo link, with a still image shown while it loads, under reduced motion and on data saver), its minimum height (auto, small, medium, large or full screen) and its top and bottom padding; and an image block is cropped to a chosen aspect ratio (original, 1:1, 4:3, 3:2, 16:9 or free) around its focal point (`MEDIA-003`). Every control is reachable by keyboard and every override can be reset to the style default.

**Acceptance.**
1. Build a services page with a 2:1 columns section, an image block cropped to 4:3, a block spanning columns 2 to 7 and right-aligned, a section with an image background and focal point, a section with a background video and a section with a hex background color and large padding, using drag and keyboard on a phone and a desktop browser; then publish.
2. A browser test reads every block's bounding box in the editor canvas and on the live page at 1440 and 390 wide: each box matches in position and size within 2 CSS pixels, and a screenshot comparison of canvas and live page differs in no more than 0.5% of pixels (editor chrome masked).
3. Under `prefers-reduced-motion` the video section shows its still image.

#### PAGE-003 — Navigation menus, header and footer

*Tier:* Core

**Requirement.** The owner edits the main menu (order, labels, dropdown groups, external links, a call-to-action button), a footer with business details and secondary links, and a mobile menu. Hidden pages stay out of menus. The header and footer can each show social icons linking to the business's Facebook, Instagram, LinkedIn, X, YouTube, TikTok, Yelp and Google Business Profile pages, entered once in the brand kit (`STYLE-004`), each with an accessible name.

**Acceptance.**
1. Build a menu with two dropdowns, an external link and a Book button, hide one page, add Instagram, Facebook and Yelp links to the brand kit with icons in header and footer, publish, and use the menu and icons with a mouse, keyboard and a 390-wide phone; each icon link has an accessible name and opens its profile.

#### PAGE-004 — Reusable sections and global components

*Tier:* Core

**Requirement.** An editor saves a section as a reusable component (an announcement bar, a contact block, a promotion). Changing it once updates every page that uses it, in the next revision, and the editor shows where it is used.

**Acceptance.**
1. Place one component on five pages, edit it once, preview all five changed, and detach one copy that then stays unchanged.

#### PAGE-005 — Device previews and a separate mobile layout

*Tier:* Core

**Requirement.** The editor and preview switch between desktop, tablet and phone widths. Pane derives a phone layout automatically by stacking each section's blocks in reading order; the editor can then arrange the phone layout separately (move, resize and reorder blocks on the phone grid, change a section's height and padding, hide a block or section on phones) without changing desktop, and changes on desktop never move an arranged phone block. The editor marks which blocks have phone overrides and can reset them.

**Acceptance.**
1. Preview a draft at 1440, 768 and 390 wide from the editor; in the phone view move a block above another, resize a block, reduce a section's padding and hide one section; publish.
2. On the live page the section is absent at 390 and present at 1440, and a browser test reads block bounding boxes in the editor's phone view and on the live page at 390 wide (and the desktop view and live page at 1440) and finds each within 2 CSS pixels in position and size; the desktop layout is unchanged from before the phone edits.

#### PAGE-006 — Autosave, undo and safe concurrent editing

*Tier:* Core

**Requirement.** Edits save as a draft continuously, an editor can undo and redo within a session, and two editors on the same page never silently overwrite each other: the second sees the other's change and merges or keeps their own copy. Every future page or body editor introduced by `PAGE-001`, `PAGE-002` or `CMS-011` inherits these requirements before it ships.

**Acceptance.**
1. Edit, close the tab and reopen to find the draft kept; undo and redo five steps; edit one page from two browsers and see the conflict surfaced, never lost.

#### PAGE-007 — Page status and review requests

*Tier:* Core

**Requirement.** Each page and post carries draft, needs review, scheduled or published status. An editor sends a page for review; the owner (or a delegated publisher, `ROLE-002`) approves it from the workspace or a notification. Publishing one page leaves other unfinished drafts unpublished, while every publication still creates an immutable whole-site revision (`PUBLISH-001`).

**Acceptance.**
1. Edit two pages, send one for review, approve and publish only that one, and see the other stay draft while the revision history records the publication.

#### PAGE-008 — Custom code, embeds and CSS

*Tier:* Core · *Cites:* BASE-PUBLIC-001, BASE-SECRET-001 · *Rules:* D-4

**Requirement.** An owner adds custom CSS, an HTML embed block, site-wide header and footer code (for example a verification tag) and per-page header code on any page, including a form's or booking's thank-you page (for example a Google Ads conversion snippet). Custom code can subscribe to Pane's goal events (`STATS-002`) through a documented the documented goal event browser event carrying the goal name and value, so a hand-written tag fires on a lead rather than a page view. Custom header code is marked third-party and waits for consent under `PRIV-001`. Embeds run sandboxed under a per-site content security policy the owner sees, and nothing they add can reach the workspace or a session.

**Acceptance.**
1. Add a custom CSS rule, an embed block, a site-wide header verification tag and per-page header code on a quote form's thank-you page; see the per-page code only on that page, see a listener on the documented goal event receive the quote-form goal when the form is submitted, and see custom code not run before consent or under GPC; see them live, see the policy list the embed's host, and see the embed unable to read workspace cookies or call the private product API.

#### PAGE-009 — Accessible output by default

*Tier:* Core · *Cites:* BASE-ACCESSIBILITY-001, BASE-PUBLIC-003 · *Register:* R-2, R-3

**Requirement.** Before publication Pane warns about missing image descriptions, out-of-order headings and contrast in the selected site's styles; images require alt text or an explicit decorative choice and pages include a skip link.

**Acceptance.**
1. Across every template and a populated site, exercise the Base accessibility bar and the skip link; attempt publication without an image description and see the warning, then use a description or explicit decorative choice.

#### PAGE-010 — Duplicate pages and starter layouts

*Tier:* Core

**Requirement.** An editor duplicates a page or starts one from a starter layout (landing page, service detail, team, menu, pricing, FAQ, location) that already uses the site's styles.

**Acceptance.**
1. Create a page from each starter layout and one duplicate, publish, and see each use the site's fonts and colors.

#### PAGE-011 — Password-protected and member-only pages and site

*Tier:* Core · *Cites:* BASE-ROLE-001

**Requirement.** The owner protects a page or folder with a password, or limits it to signed-in site members. Pane checks native member access on every request and never serves protected content in the public cache. Paid membership connection to Stall or Nectar remains a separate obligation (`PAGE-016`, `LINK-002`). Before launch, or during a rebuild, the owner can put the whole site behind a site-wide password or an editable coming-soon page (with an optional signup block, `LINK-003`); the gate answers `noindex`, and the workspace and preview links keep working.

**Acceptance.**
1. Protect a folder with a password and another with member sign-in; signed-out requests see the gate, the right password or member sees the page, and no cached response leaks it.
2. Turn on the coming-soon page: every live URL shows it with `noindex`, the site password opens the site, preview still works, and turning it off restores the published site.

#### PAGE-012 — Gallery blocks with grid, slideshow and lightbox

*Tier:* Core

**Requirement.** A gallery block shows images from the media library as a grid (column count and gap set per device), masonry, a slideshow or a carousel, with captions, an optional click-to-enlarge lightbox (keyboard and swipe navigation, focus kept inside, Escape closes) and per-image links. Galleries reuse the image optimization of `MEDIA-002` and lazy-load beyond the first screen.

**Acceptance.**
1. Build one gallery of 24 images in each layout, open the lightbox and move through it by keyboard and swipe, set three columns on desktop and one on phones, and see each layout on the live site at 1440 and 390 wide with no layout shift and a passing accessibility run.

#### PAGE-013 — Promotional pop-up and announcement bar

*Tier:* Core

**Requirement.** The owner shows a promotional pop-up (newsletter signup, offer or announcement) and an announcement bar. The pop-up opens after a delay, a scroll depth or exit intent on desktop, on chosen pages only, at most once per visitor per chosen number of days (remembered without cookies, in the visitor's browser storage), and never on the first screen of a phone visit in a way that hides content. It is an accessible dialog (focus trapped, Escape and a visible close button), and it can be scheduled (`CMS-005`). Its newsletter action uses LINK-003's destination guard (RL-102).

**Acceptance.**
1. Configure a newsletter pop-up after 10 seconds on two pages with a seven-day frequency cap and exit intent on desktop; see it appear on those pages only, not again within seven days, and close by keyboard; on a 390-wide phone see no full-screen interstitial on arrival; schedule an announcement bar and see it appear and expire on time.

#### PAGE-014 — Block catalog, text formatting and links

*Tier:* Core · *From:* PAGE-014

**Requirement.** The editor's block catalog is: text, heading, image, button, quote (with attribution), line (divider), spacer, list, accordion, social links (`STYLE-004`), audio (an uploaded MP3 or M4A from the library with a native player and download option, or a SoundCloud or Spotify embed), code (preformatted text), chart (bar, line or pie from an entered table, with the table available to screen readers), scrolling text (marquee, paused under `prefers-reduced-motion`), shape (a filled or outlined shape from a set, with a color and optional link), and the blocks other clauses define: HTML embed (`PAGE-008`), video, map and social-post embeds (`MEDIA-004`), form (`FORM-001`), newsletter signup (`LINK-003`), booking (`LINK-001`), product and buy button (`LINK-002`), summary and collection list (`CMS-003`), events calendar (`CMS-009`), site search (`CMS-008`) and gallery (`PAGE-012`). Every block in the catalog can be added to any section, placed on the grid of `PAGE-002`, duplicated and deleted. Text styles are PAGE-018; destinations and stable references are PAGE-019.

**Acceptance.**
1. Build a page holding every catalog block, add each to a section, place it on the page grid, duplicate and delete a copy, and publish; find every remaining block by its type and use it through the live page.

#### PAGE-018 — Rich text styles and pasted content

*Tier:* Core · *From:* PAGE-014

**Requirement.** A text block offers the paragraph styles Heading 1 to Heading 4, paragraph, large paragraph, small paragraph, quote and preformatted, each rendered as its semantic element (`h1` to `h4`, `p`, `blockquote`, `pre`) and styled by `STYLE-002`; bold, italic, underline and strikethrough; bulleted and numbered lists with one level of nesting; and left, center, right or justified alignment per paragraph. Markdown shortcuts (`#`, `**`, `-`, `1.`) and pasted HTML from Word or Google Docs map to the same styles, with unsupported markup stripped.

**Acceptance.**
1. Use Heading 1 to Heading 4, paragraph, large and small paragraph, quote and preformatted styles; bold, italic, underline and strikethrough; both list types with a nested item; and all four alignments. Publish and read the matching semantic headings, paragraphs, quote, preformatted text, lists and inline elements.
2. Paste Word and Google Docs fragments with headings, a list and link; use the Markdown shortcuts and see the same styles with unsupported markup stripped.

#### PAGE-019 — Links and buttons that follow their destinations

*Tier:* Core · *From:* PAGE-014

**Requirement.** Selected text and buttons link to: a page on the site (chosen from the page list, so it follows a slug change), a section anchor on the same or another page (each section has an editable anchor ID), an external URL with an optional open-in-new-tab setting, a media-library file (`MEDIA-001`, for example a PDF price list), a `mailto:` address with optional subject, a `tel:` number and an `sms:` number with optional message body. A button block has the same destinations plus a label and a primary, secondary or tertiary style from `STYLE-002`. Links to internal pages and anchors are stored by reference, so renaming a page or anchor updates every link, and a link whose target is deleted is listed in the editor before publishing.

**Acceptance.**
1. Publish a text link and a primary, secondary or tertiary button for every destination: a native page, another page's anchor, an external URL with optional new tab, a library PDF, email with subject, telephone and SMS with message. Read each resolved destination; a new tab uses safe opener isolation and the anchor scrolls to its section.
2. Rename the referenced page and anchor and republish: both links follow; delete the destination and read the broken-link finding before publication.
3. Tab through the published links and buttons in reading order with visible focus and the Base accessibility bar.

#### PAGE-015 — Trash and single page or post restore

*Tier:* Core

**Requirement.** A deleted page, blog post, collection item or event goes to a trash and stays there for at least 30 days, with who deleted it and when; an editor restores any one of them, with its URL, menu place and body, without touching the rest of the site, and a restored published item goes live at its next publication with the redirect offered at deletion removed. Separately, the history of any one page, post or item lists its earlier published and draft versions, and an editor restores one version of that page, post or item alone as a new draft, keeping every later edit to every other page; the whole-site rollback of `PUBLISH-004` stays for undoing a whole publication. Restores are recorded in the activity log (`AUDIT-001`).

**Acceptance.**
1. Publish a site, then delete one page and one post and edit three other pages; restore the post from the trash and publish: the post answers 200 at its old URL, the earlier redirect is gone, and the three edited pages keep their edits.
2. Restore an earlier version of one of the edited pages from its own history as a draft, publish, and see only that page change.
3. See an item deleted 31 days ago gone from the trash and both restores in the activity log with actor and time.

#### PAGE-016 — Paid membership access connection

*Tier:* Core · *Cites:* BASE-ROLE-001

**Requirement.** Paid membership is sold through Stall or Nectar (`LINK-002`). Pane connects that paid-access source, checks its entitlement on every protected request and never serves protected content in the public cache. Native account admission alone supplies no paid entitlement, and billing stays with the provider.

**Acceptance.**
1. Connect Stall or Nectar paid membership access and request a protected page with and without its entitlement; only the entitled member receives it, checks repeat on every request and no public cache response leaks it.

### Templates and brand styles

#### PAGE-017 — Third-party tag and pixel marketplace with per-tag consent categories

*Tier:* Core · *Cites:* BASE-PUBLIC-001, BASE-SECRET-001 · *Rules:* D-4

**Requirement.** An owner selects third-party tags and pixels from a marketplace and assigns each its consent category. Each tag loads only after the visitor grants its category, honors GPC and immediate withdrawal, and stays outside the workspace. PAGE-008 custom code and its shared analytics choice do not supply this marketplace.

**Acceptance.**
1. Configure two tags with different categories, grant one category and see only its tag load; withdraw it and see execution stop, then visit under GPC and see advertising tags refused.

#### STYLE-001 — Responsive templates for US local businesses

*Tier:* Core

**Requirement.** A new site starts from a template catalog for common US small businesses (restaurant, salon and spa, trades and home services, professional services, clinic, studio, retail, nonprofit), each responsive and fully editable.

**Acceptance.**
1. See at least 40 templates in the catalog, at least four in each of the eight categories; start a site from each template, publish, and check every page at 1440 and 390 wide with no overflow and a passing accessibility run.

#### STYLE-002 — Site-wide brand styles

*Tier:* Core · *Register:* R-11

**Requirement.** The owner sets fonts, colors, button shapes, spacing and section backgrounds once for the whole site, with live preview. Fonts come from a built-in catalog, from font files the owner uploads (WOFF2, WOFF, TTF or OTF, self-hosted on the site's origin with `font-display: swap`) or from an Adobe Fonts web project the owner connects by project ID. A change applies everywhere in the next revision.

**Acceptance.**
1. Change the heading font, primary color and button style, preview three pages showing the change, publish, and roll back to the earlier styles.
2. Upload a WOFF2 font and connect a test Adobe Fonts project, set one as the heading and one as the body font, and see both render on the live site, the uploaded one served from the site's own origin.

#### STYLE-003 — Switch templates without rebuilding content

*Tier:* Core

**Requirement.** Changing template restyles the site and keeps every page, collection item, image and form. Anything the new template cannot place is listed before the switch. This answers the incumbent complaint that a template change means rebuilding.

**Acceptance.**
1. Switch a populated site between two templates, read the pre-switch list, publish, and see every page and item present; roll back to the previous template.

#### STYLE-004 — Logo, favicon and brand kit

*Tier:* Core · *Cites:* BASE-INPUT-003

**Requirement.** The owner uploads a logo, favicon and social image once and enters the business's social profile links once; Pane sizes the images for the header, browser tab, home-screen icon and social cards (`SEO-006`), and uses the profile links for social icons (`PAGE-003`) and structured data `sameAs` (`SEO-005`).

**Acceptance.**
1. Upload a logo and favicon and see them in the header, browser tab and a social card preview; enter two social profile links and see them in the header icons and the LocalBusiness `sameAs`.

### Media library

#### MEDIA-001 — Media library with alt text and usage

*Tier:* Core · *Cites:* BASE-INPUT-003 · *Register:* R-11

**Requirement.** Images, video files (MP4 and MOV, transcoded for the web with a poster frame), PDFs (menus, price lists) and other files upload once into a searchable library with folders, alt text, captions and a list of where each is used. Deleting a file in use is refused with its uses listed. The image picker also searches free stock photos from Unsplash through its official API; a chosen photo is copied into the library with its photographer credit and Unsplash link kept as attribution, and Unsplash's download event is triggered as its API terms require.

**Acceptance.**
1. Upload 50 images and three PDFs, search and filter them, set alt text, place one image on three pages, and try to delete it (refused, uses listed).
2. Search Unsplash for plumber photos, add a photo to a page, and see it in the library with the photographer's name and link and the download event recorded by the Unsplash API.

#### MEDIA-002 — Responsive image optimization

*Tier:* Core · *Cites:* BASE-INPUT-003

**Requirement.** Pane serves every image in modern formats (AVIF or WebP with a fallback), at sizes matched to the screen (`srcset`), lazily below the fold and with dimensions set so the layout does not shift.

**Acceptance.**
1. Upload a 6000-pixel photo and see the live page serve a phone-sized WebP or AVIF at 390 wide, a larger one at 1440, with width and height attributes and lazy loading below the fold.

#### MEDIA-003 — Basic image editing

*Tier:* Core · *Cites:* BASE-INPUT-003

**Requirement.** An editor crops, rotates and sets a focal point on an image in the browser; the original is kept and edits are reversible.

**Acceptance.**
1. Crop and set a focal point, see the hero keep the subject at 390 and 1440 wide, then revert to the original.

#### MEDIA-004 — Video, map, social embeds and Instagram feed

*Tier:* Core · *Cites:* BASE-PUBLIC-001, BASE-SECRET-001 · *Rules:* D-4

**Requirement.** A video block plays an uploaded library video (`MEDIA-001`) in an accessible player with controls, captions from an uploaded WebVTT file, a poster frame, and optional autoplay-muted and loop, streamed at sizes matched to the screen; or it embeds YouTube and Vimeo videos. Blocks also embed a Google Maps location for each business address, and Instagram or Facebook posts. An Instagram feed block connects the business's Instagram professional account through Instagram's official API and shows its most recent posts (count and grid or carousel layout chosen by the editor) on the live site, refreshed automatically at least hourly, with images re-served through `MEDIA-002` and each tile linking to its post; the connection refreshes its token before it expires, and a broken connection shows in `LINK-005` while the block keeps the last posts it fetched. Third-party embeds load only after consent where `PRIV-001` requires it.

**Acceptance.**
1. Upload a 200 MB MOV and place it in a video block with a WebVTT caption file; see it play with controls and captions by keyboard on the live site at 1440 and 390 wide, start from its poster frame and stream a phone-sized rendition at 390.
2. Add a YouTube video, a Vimeo video, a Google Map, an Instagram post and a Facebook post; see each on the live site, see them wait for consent where required, and see the CSP list only their hosts.
3. Connect a test Instagram professional account, place a nine-post feed block, publish a new Instagram post and see it on the live site within an hour; revoke the token and see the connection fail in `LINK-005` while the block still shows the last nine posts.

### Collections and blog

#### CMS-001 — Structured collections with typed fields

*Tier:* Core · *Cites:* BASE-INPUT-001, BASE-ROLE-001, BASE-ACCESSIBILITY-001 · *Rules:* D-1, D-2

**Requirement.** The owner keeps structured collections such as services, team members, projects, testimonials, locations, FAQs and menu items, with typed fields (text, rich text, image, number, USD price, date, link, reference to another collection, option), each of which can be marked required with help text. A rich-text field is edited and rendered with the body editor of `CMS-011`: the `PAGE-018` paragraph styles, inline formats, lists, links and buttons, and inline blocks, never plain text or bold and italic alone. Starter collections come with each template.

**Acceptance.**
1. Create a services collection with ten fields including a USD price, a reference to team members and a required rich-text description, add 30 items, and edit an item; validation refuses wrong types and an empty required field.
2. Give one item's description an H2, a bulleted list, bold text, an inline image and links to a page, a library PDF and a `tel:` number, publish, and see the item page render them as PAGE-018 and PAGE-019 require (`CMS-011`).

#### CMS-002 — Collection template pages with item URLs

*Tier:* Core · *Cites:* BASE-INPUT-001, BASE-ROLE-001, BASE-ACCESSIBILITY-001 · *Rules:* D-1, D-2

**Requirement.** Each collection can have a template page that renders every item at its own clean URL, with item-level title, description and social image for search (`SEO-001`).

**Acceptance.**
1. Design a service template page, publish, and open every service item's URL with its own title, description and structured data.

#### CMS-003 — Collection lists and filters on any page

*Tier:* Core

**Requirement.** Any page can show a list or grid of collection items, filtered, sorted, limited and optionally featured (for example the three newest projects or testimonials for one service). Date fields support relative filters evaluated at request time in the business's time zone (upcoming only, past only, today, the next N days), so a list of upcoming items stays correct without republishing.

**Acceptance.**
1. Place a filtered, sorted list of three featured projects on the home page and a full filterable list on a projects page; change an item and see both update in the next revision.
2. Place an upcoming-only list of dated items, let the clock pass one item's date in America/Chicago, and see that item leave the list without a new publication.

#### CMS-004 — Blog with categories, tags and authors

*Tier:* Core

**Requirement.** One or more blogs (for example News and Recipes), each with its own URL prefix, index, RSS feed (`CMS-006`) and comment settings (`CMS-010`), holding posts with excerpts, featured images, categories, tags, author pages, archives and pagination. Each post's body is written in the block editor of `CMS-011`, so a post holds the same blocks, headings, formatting, lists, links and buttons as a page. Each post can show share buttons for Facebook, X, LinkedIn, Pinterest and email that open the network's share URL with the post's link and social card (`SEO-006`) and load no third-party script. Authors write and submit posts within their role (`ROLE-001`).

**Acceptance.**
1. Create two blogs, News and Recipes.
2. As an author, write three posts in each with categories and tags, submit them for review, have the owner publish, and open each blog's index and feed, a category, a tag, an author page and each post; see each feed hold only its own blog's posts.
3. One of the posts carries the `CMS-011` acceptance body, and its live DOM passes the `CMS-011` checks.
4. Click each share button and see the network's share URL carry the post's URL, with no request to the network before the click.

#### CMS-005 — Scheduled publishing and expiry

*Tier:* Core

**Requirement.** Pages, posts, collection items and announcement sections can be scheduled to publish and to unpublish at a date and time in the business's US time zone, daylight saving included. The workspace shows what actually went live and flags a scheduled change that has not been approved by its time.

**Acceptance.**
1. Schedule a post for 9:00 America/Chicago and a promotion to expire across a daylight saving change; see each happen at the right local time and see an unapproved schedule flagged, not published.

#### CMS-006 — RSS and podcast feeds and new-post notifications

*Tier:* Core

**Requirement.** The blog and each collection with a template page publish an RSS feed. A blog whose posts carry an audio file can also publish a podcast feed with the Apple Podcasts (iTunes) tags (show title, author, artwork, category, explicit flag, episode duration and enclosure) for Apple Podcasts and Spotify. On publication, subscribers who opted in receive the new post through Mango or Mailchimp (`LINK-003`), whichever the owner connected, and the owner sees the send state.

**Acceptance.**
1. Validate the RSS feed and a podcast feed with two audio posts against the W3C feed validator and the Apple Podcasts feed requirements.
2. With Mango connected, publish a post and see the Mango campaign queued with its delivery state in Pane; repeat with a Mailchimp test audience and see the Mailchimp campaign created and sent to the audience with its delivery state in Pane.

#### CMS-007 — Collection CSV import and export

*Tier:* Core

**Requirement.** Collections import from and export to CSV, matching collection-based visual site builder's and design-first visual site builder's CMS exports, with a field-mapping preview and a list of rows that could not be imported.

**Acceptance.**
1. Import a collection-based visual site builder CMS CSV and a design-first visual site builder CSV with images, review the mapping and rejected rows, apply, export the collection again and compare.

#### CMS-008 — Site search

*Tier:* Core

**Requirement.** Visitors search the site's pages, posts and collection items; results respect password and member-only pages (`PAGE-011`).

**Acceptance.**
1. Search for a service name, a post tag and a word on a protected page; the first two return results and the protected page does not for a signed-out visitor.

#### CMS-009 — Events calendar with list and month views

*Tier:* Core

**Requirement.** An events collection holds each event's title, description, image, start and end date and time with its IANA time zone (all-day and multi-day events included), location (address with a map, `MEDIA-004`, or an online link), price in USD, capacity note and a register or buy action. Recurring events (weekly, monthly, custom dates) produce one item per occurrence. An events page shows them as a list or a month calendar (switchable by the visitor, keyboard-navigable), splits upcoming and past automatically at request time in the event's time zone, and each event has its own page (`CMS-002`) with add-to-calendar links (an ICS download and Google Calendar and Outlook links) and Event structured data (`SEO-005`). Calendar and summary blocks (`CMS-003`) put upcoming events on any page. The register or buy action hands off to Dial for a booked session (`LINK-001`), to Stall, a Stripe Payment Link or PayPal for a paid workshop or ticket (`LINK-002`), or to a Pane registration form (`FORM-001`), and a completed registration or purchase counts as a conversion on that event (`STATS-002`).

**Acceptance.**
1. Create a one-off workshop in America/New_York, a weekly class in America/Los_Angeles that crosses a daylight saving change and an all-day event; see the events page in list and month views, each occurrence at the right local time, and an upcoming-events block on the home page.
2. Let one event's end time pass and see it move to past without a new publication.
3. Download the ICS and import it into Google Calendar and Outlook with the right times, pass Google's Rich Results Test for the Event page, and complete a test-mode Stall purchase and a Dial booking from two events, each counted as a conversion on its event.

#### CMS-010 — Blog comments and moderation

*Tier:* Core

**Requirement.** The owner turns comments on or off for the whole blog, per post and automatically after a chosen number of days. Visitors comment with a name and email (and optionally a website); comments can be threaded one level deep, and posts can show a simple like count kept without cookies. New comments are held for approval by default (or approved automatically for previously approved commenters, as the owner chooses), and a moderation queue lets an owner or comment moderator (`ROLE-001`) approve, mark as spam, delete, edit or reply as the post's author, singly or in bulk. Spam protection reuses the form protection of `FORM-002` (honeypot, rate limits and Turnstile) and holds comments with many links or blocked words. Moderators receive an email and push notification (`MOBILE-002`) for each new comment, or a daily digest. Commenter emails are never shown publicly, comments are included in person-level privacy requests (`PRIV-002`) and in the WXR export (`EXPORT-001`), and imported comments keep their author, date, approval state and threading (`IMPORT-001`, `IMPORT-002`).

**Acceptance.**
1. Enable comments with approval required; post three comments as visitors (one with a filled honeypot, one with six links), see the honeypot comment refused and the link-heavy one held as spam, approve one as a comment moderator from the notification, reply as the post's author and see the threaded reply live; close comments on one post and see the form gone; run a privacy request for a commenter's email and see their comments exported and erased.

#### CMS-011 — Post and collection item bodies in the block editor

*Tier:* Core · *From:* CMS-011

**Requirement.** A blog post's body, and every rich-text field of a collection item (`CMS-001`) or event (`CMS-009`), is written in the same editor as a page (PAGE-014 catalog, PAGE-018 text and PAGE-019 destinations), shown as the post or item will look on the live site. It offers every `PAGE-018` paragraph style (Heading 1 to Heading 4 rendered as `h1` to `h4`, paragraph, large and small paragraph, quote and preformatted), every inline format (bold, italic, underline, strikethrough), bulleted and numbered lists with one level of nesting, alignment, and every link and button destination (a page, a post, a collection item, a section anchor, an external URL with an optional new tab, a media-library file, `mailto:`, `tel:` and `sms:`). Between paragraphs the author inserts at least the image (with caption, alt text and link), gallery (`PAGE-012`), video and social-post embed (`MEDIA-004`), quote, button, line, spacer, HTML embed (`PAGE-008`), audio, code, accordion, form (`FORM-001`), newsletter signup (`LINK-003`), booking (`LINK-001`), product (`LINK-002`) and summary (`CMS-003`) blocks; a post or item body can also hold a section with the `PAGE-002` grid when the author chooses a wide layout. Links to pages, posts, items and anchors are stored by reference, as in `PAGE-019`, so renaming or moving any of them updates every link in every post and item, and a link whose target is deleted is listed before publishing. Markdown shortcuts and pasted Word or Google Docs content map to the same styles. Distribution of those structured bodies is CMS-012.

**Acceptance.**
1. As an author, write a post containing an H2 and an H3, a bulleted list with a nested item, bold and italic text, two inline images with captions, a quote with attribution, a YouTube embed, a button to a page, and links to another post, a library PDF and a `tel:` number; submit it, have the owner publish it, and read the live post DOM with the same checks as PAGE-018 and PAGE-019: each heading is the chosen `h2` or `h3`, the list is a `ul` holding a nested `ul`, `strong` and `em` wrap the formatted words, each image is a `figure` with its `figcaption` and alt text, the quote is a `blockquote` with its attribution, the video is the `MEDIA-004` embed, the button's `href` is the page's live URL, and each link's `href` is the other post's live URL, the PDF's served URL and the `tel:` number; tab through the post and reach every link and button in reading order; and pass an axe run.
2. Rename the linked post's slug, republish, and see the link follow to the new URL with no redirect hop.
3. Do the same in a services item's rich-text description and check its item page the same way.

#### CMS-012 — Structured bodies in feeds, search and exports

*Tier:* Core · *From:* CMS-011

**Requirement.** Structured post, collection and event bodies are rendered to semantic HTML on the live post, included in the post's RSS item (`CMS-006`) with absolute URLs, indexed by site search (`CMS-008`) and exported with the post (`EXPORT-001`).

**Acceptance.**
1. Read the blog's RSS feed and see the post's item carry the same headings, list, images and links with absolute URLs.
2. Search the populated post's text and find it, then open its exported body with the same content and structure.

### Domains and hosting

#### DOMAIN-001 — Connect a custom domain with apex and www

*Tier:* Core

**Requirement.** The owner connects a domain they own, at the apex and `www`, with one chosen as primary and the other redirecting to it. Pane creates the Cloudflare Workers custom domain in the owner's Cloudflare account, or shows the exact records to add at another DNS host (GoDaddy, Namecheap, Squarespace Domains, Google Cloud DNS, Network Solutions) and checks them. The owner can also connect any number of additional domains (a `.net`, a common misspelling, an old brand) as aliases, each at apex and `www` with HTTPS, that answer 301 to the same path on the primary domain.

**Acceptance.**
1. Connect a test domain held in Cloudflare and one at an external DNS host, see the status move from pending to live, and see `www` redirect to the apex with 301.
2. Connect two alias domains and see `https://alias/services?x=1` and `http://www.alias/services` each answer 301 to `https://primary/services` with the path and query kept.

#### DOMAIN-002 — Managed HTTPS and certificate status

*Tier:* Core

**Requirement.** Every connected domain is served over HTTPS with an automatically issued and renewed certificate; HTTP redirects to HTTPS; the workspace shows certificate status and expiry, and alerts before a renewal problem (`AUTO-004`).

**Acceptance.**
1. Connect a domain, see the certificate issued and listed with its expiry, and see `http://` redirect to `https://`.

#### DOMAIN-003 — DNS status that preserves business email

*Tier:* Core

**Requirement.** Before cutover Pane reads the domain's existing DNS and keeps every record it does not own, especially MX, SPF, DKIM and DMARC for Google Workspace or Microsoft 365, so connecting the website never breaks the business's email. It shows each record as kept, added or needing action. Mail records that point at a registrar's or site builder's email forwarding service are flagged as forwarding, not mailboxes, and handled by `DOMAIN-005` before any nameserver or transfer change.

**Acceptance.**
1. Connect a domain that has Google Workspace MX, SPF and DKIM records; after connection the mail records are unchanged and mail still delivers, and the status screen lists them as kept.
2. Connect a domain whose MX records point at Squarespace email forwarding and see them flagged as forwarding with the `DOMAIN-005` step required.

#### DOMAIN-004 — Domain registration and transfer guidance

*Tier:* Core

**Requirement.** An owner without a domain is guided to register one in their own Cloudflare Registrar account (at cost, in USD) or keep their current registrar; an owner leaving XML-export site builder Domains, crawl-only site builder or hosted WXR publishing platform gets the transfer or nameserver steps for that registrar. Before the owner closes the old account, Pane lists the services billed through it that will stop with it: email forwarding (`DOMAIN-005`), and a Google Workspace subscription bought through XML-export site builder or crawl-only site builder, with the steps to move that subscription to direct billing with Google first so mailboxes are not interrupted. Pane never holds the registration.

**Acceptance.**
1. Follow the guided path for a new domain and for a domain at XML-export site builder Domains with XML-export site builder email forwarding and a Google Workspace subscription billed through XML-export site builder, ending with a connected domain in each case; the XML-export site builder path shows the forwarding and Workspace billing steps as required before account closure, and marks each done only when the owner confirms it.

#### DOMAIN-005 — Registrar email forwarding carried over

*Tier:* Core · *Cites:* BASE-MAIL-001 · *Register:* R-5

**Requirement.** Squarespace Domains, Wix, WordPress.com and GoDaddy include free email forwarding (aliases such as `info@` and a catch-all) that stops when the domain's nameservers move or it transfers. Before cutover Pane detects that forwarding from the domain's MX records and the registrar, asks the owner for the alias list and destinations (which the existing records do not reveal), and recreates every alias and the catch-all in Cloudflare Email Routing in the owner's Cloudflare account, including the destination-address verification Cloudflare requires. Pane then sends a test message to each alias and records it as arrived only when its unique token is confirmed at the destination (by the owner's confirmation link or a connected mailbox), and keeps the cutover (`IMPORT-006`) blocked until every alias has passed. After cutover it repeats the test and alerts (`AUTO-004`) if any alias stops delivering.

**Acceptance.**
1. Cut over a test domain using Squarespace email forwarding with a catch-all and two aliases: see the forwarding detected, enter the aliases, see them created in Cloudflare Email Routing with verified destinations, see cutover refused while one alias is unconfirmed, then confirm all three; after cutover, send mail from an outside account to each alias and to an unlisted address and see every message arrive at its destination, and see the post-cutover check pass.

#### HOST-001 — The business site at the domain root, fast

*Tier:* Core · *Register:* R-7

**Requirement.** The live site is served at the root of its domain (not under the business-site path), cached at Cloudflare's edge and purged on publication. Field Core Web Vitals are published in R-7. The gating lab budgets are: Lighthouse's default mobile profile (emulated Moto G Power, simulated throttling at 150 ms round trip, 1.6 Mbps down and 4x CPU slowdown) with Largest Contentful Paint 2.5 s or less, Total Blocking Time 200 ms or less and Cumulative Layout Shift 0.1 or less, median of five runs. A publication reaches the edge everywhere within 30 seconds.

**Acceptance.**
1. Publish a populated site on a connected domain and run Lighthouse with the stated mobile profile five times on every template's home, collection and blog pages; the medians meet the lab budgets.
2. Publish a change and request the changed page from probes in Virginia, California, Frankfurt, Singapore and Sydney every two seconds: every probe serves the new revision within 30 seconds of the publication.

#### HOST-002 — The live site survives an admin outage

*Tier:* Core

**Requirement.** Publishing writes a static snapshot of the live revision, so visitors keep getting the published site if the workspace, database or an integration is unavailable. Forms queue submissions and deliver them when service returns.

**Acceptance.**
1. Make the database unavailable on a deployed site; every live page still loads and a contact submission is accepted and appears in the inbox once the database returns.

#### HOST-003 — Updates without plugin maintenance

*Tier:* Core · *Cites:* BASE-OPS-002, BASE-BACKUP-001

**Requirement.** Pane ships platform, security and template updates as signed releases, whose signature the installation verifies against the published release key before applying (an unsigned or tampered release is refused), that the owner applies in one action (or automatically, if they choose), with a preview of what changes. There are no third-party plugins to keep updated.

**Acceptance.**
1. Apply a release to a running installation, see the change list, its signature verified against the published release key and a passing health check, then roll it back.
2. Offer the installation a release with a tampered artifact and one with no signature, and see each refused with the reason shown and nothing changed.

#### HOST-004 — Transparent running cost in USD

*Tier:* Core · *Register:* R-1

**Requirement.** The workspace shows the site's Cloudflare usage this month and the estimated cost in USD against the owner's plan, with no feature that is locked behind an upsell. This answers incumbent complaints about add-on pricing.

**Acceptance.**
1. Generate traffic and storage on a test account and see usage and the USD estimate match the Cloudflare dashboard within 5%.

#### HOST-005 — Install from the browser with no terminal

*Tier:* Core · *Cites:* BASE-INSTALL-001, BASE-ACCESS-001 · *Register:* R-1

**Requirement.** An owner who has never opened a terminal installs Pane from its run site in a browser: they sign up for or sign in to Cloudflare through Cloudflare's own authorization screen, grant a token limited to the account resources Pane needs, and Pane deploys the Worker, database and storage into that account, creates the first owner sign-in and opens the workspace, showing each step's progress and a plain-language error with a retry when a step fails. The same path upgrades an installation (`HOST-003`). `rer deploy` (`DEPLOY-001`) stays for technical owners and both produce the same installation.

**Acceptance.**
1. From a fresh Cloudflare account and a browser with no local tools, start the install on the run site, complete Cloudflare's authorization, and reach a signed-in Pane workspace on the account's `workers.dev` hostname with no command typed; the granted token holds only the listed scopes.
2. Cancel authorization once and see the plain-language error and a working retry.

### Search visibility

#### SEO-001 — Page titles and meta descriptions

*Tier:* Core

**Requirement.** Every page, post and collection item has an editable search title and meta description, with sensible defaults and a search-result preview; the site name appears as the owner chooses.

**Acceptance.**
1. Set a title and description on a page and an item, see the preview, publish, and read them in each page's `<title>` and `<meta name="description">`.

#### SEO-002 — Redirect manager and slug-change redirects

*Tier:* Core

**Requirement.** The owner manages 301 and 302 redirects one by one or by CSV import, and Pane offers a redirect automatically whenever a published URL changes or a page is deleted. Imported sites bring their old URL map (`IMPORT-005`).

**Acceptance.**
1. Rename a published slug and accept the offered redirect, import 200 redirects by CSV, and request each old URL to get the right status and target.

#### SEO-003 — Automatic sitemap and robots.txt

*Tier:* Core

**Requirement.** Pane generates `sitemap.xml` (pages, posts, items, last-modified dates; excluding hidden, protected and noindex pages) and an editable `robots.txt`, updated on every publication.

**Acceptance.**
1. Publish a site with hidden, protected and noindex pages, validate the sitemap, and see only public indexable URLs listed; edit `robots.txt` and see it served.

#### SEO-004 — Canonical URLs and indexing controls

*Tier:* Core

**Requirement.** Every page carries a canonical URL on the primary domain; the owner can mark a page noindex or set a custom canonical, and preview and staging addresses are always noindex.

**Acceptance.**
1. Read canonical tags across `www` and apex, set one page noindex, and confirm previews send `noindex`.

#### SEO-005 — Structured data for local businesses

*Tier:* Core

**Requirement.** Pane emits JSON-LD from the site's business facts and collections: LocalBusiness (name, address, phone, opening hours, service area, price range, social profiles as `sameAs`), Service, Article, FAQPage, BreadcrumbList and Event, validated before publication.

**Acceptance.**
1. Publish a site with hours, services, FAQs and posts, and pass Google's Rich Results Test and the Schema.org validator on each page type.

#### SEO-006 — Social preview cards

*Tier:* Core

**Requirement.** Every page has Open Graph and X card title, description and image, defaulting from the page and brand kit (`STYLE-004`), with a preview in the editor.

**Acceptance.**
1. Share a page URL into the Facebook Sharing Debugger and an X card validator and see the chosen title, description and image.

#### SEO-007 — Google Search Console and Bing Webmaster Tools

*Tier:* Core

**Requirement.** The owner connects Google Search Console and Bing Webmaster Tools: Pane verifies the domain, submits the sitemap, and shows queries, clicks, impressions and indexing problems per page in the workspace.

**Acceptance.**
1. Connect a test Google Search Console property and a test Bing Webmaster Tools site for the same domain; for each, see verification succeed and the sitemap submitted, and see per-page clicks and impressions imported for the last 28 days, labeled by search engine.

#### SEO-008 — Google Business Profile consistency

*Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-1

**Requirement.** The owner connects their Google Business Profile. Pane compares its name, address, phone, hours and holiday hours with the site and shows differences; the owner chooses which is right; a native decision updates the other, and an agent update carries external and live, decided by company policy.

**Acceptance.**
1. Connect a test profile whose holiday hours differ from the site, see the difference listed, approve the site's version and see the profile updated.

#### SEO-009 — Per-page search checks

*Tier:* Core

**Requirement.** Before publication the editor lists search problems per page: missing or duplicate titles and descriptions, missing alt text, broken internal links, noindex mistakes and very large images. Title and description checks compare effective metadata using the [documented normalization](docs/contract/MECHANISM.md#search-normalization). A noindex setting is flagged for owner review, since excluding a page may be intentional; the check never changes that setting. Each future block, media and content capability inherits the corresponding checks before it ships (PAGE-014, PAGE-018, PAGE-019, `MEDIA-001`, `MEDIA-002`, `CMS-001` to `CMS-004`).

**Acceptance.**
1. Publish a draft with a duplicate title, a broken internal link and a missing alt text, and see each listed with a link to fix it.

#### SEO-010 — Multilingual sites with per-language URLs

*Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-1

**Requirement.** The owner adds languages to the site (Spanish first for US businesses). Each page, post, collection item, menu, form label and search title has a version per language, drafted by `AI-002` or written by hand, with native publication decided by its publisher and an agent publication decided by company policy for external and live; a missing translation is listed rather than falling back silently. Each language has its own URL prefix (for example `/es/servicios`), pages carry `hreflang` alternates and `x-default`, the sitemap lists every language version, and a language switcher in the header goes to the same page in the other language.

**Acceptance.**
1. Add Spanish to a five-page site, translate three pages and leave two untranslated; see the untranslated pages listed, publish, and open `/es/` pages through the switcher; read reciprocal `hreflang` and `x-default` tags on each translated page, see them in the sitemap, and see a crawl of the live site report no `hreflang` errors (missing return links, invalid language codes or alternates that do not answer 200).

### Forms and enquiries

#### FORM-001 — Form builder with multiple forms

*Tier:* Core · *Cites:* BASE-INPUT-001, BASE-INPUT-003, BASE-ACCESSIBILITY-001

**Requirement.** The owner builds any number of forms (contact, quote request, job application, event registration) with text, email, US phone, address, choice, date, file upload and consent fields, places them on any page, and sets each form's confirmation message or redirect. Each field has a label, optional help text shown under it, an optional placeholder and a required setting; required fields are marked visibly and with `required`/`aria-required`, and a submission with an empty required field or a badly formed email, phone or date is refused both in the browser and by the server, with a validation message beside each failing field, announced to screen readers and tied to it by `aria-describedby`, and the visitor's other answers kept.

**Acceptance.**
1. Build a quote form with a file upload and a US phone field, place it on two pages, submit it with a 5 MB PDF, and see the submission and file in the inbox; an oversized or wrong-type file is refused.
2. Mark the phone field required with help text, then submit with it empty and with an invalid email, in the browser and by a direct POST: both are refused, the page shows each field's message linked by `aria-describedby`, the other answers stay filled, and the help text is the field's accessible description.

#### FORM-002 — Spam protection

*Tier:* Core

**Requirement.** Every form is protected by a hidden honeypot, per-form rate limits and Cloudflare Turnstile, without image puzzles for real visitors. Rejected spam is counted and can be reviewed, never silently mixed into the inbox.

**Acceptance.**
1. Submit with the honeypot filled, in a burst over the limit and with a failed Turnstile token; each is refused or quarantined and counted, while a normal submission arrives.

#### FORM-003 — Enquiry email to named recipients and reply

*Tier:* Core · *Cites:* BASE-MAIL-001 · *Register:* R-4

**Requirement.** Each form notifies named recipients by email (sent through the installation's mail relay or the business's Google Workspace or Microsoft 365 account) with the sender as Reply-To, so the owner replies from Gmail or Outlook. The workspace shows each notification's provider acceptance separately from the stored enquiry, and an owner can also reply from the inbox.

**Acceptance.**
1. Submit a form three times, sending its notification once through each of the installation relay, a Google Workspace test account and a Microsoft 365 test account, and see each notification accepted by its provider with Reply-To set; reply from the inbox and see the reply recorded on the enquiry; a failed send is shown as failed, with the enquiry kept.

#### FORM-004 — Automatic acknowledgment to the sender

*Tier:* Core · *Cites:* BASE-MAIL-001, BASE-OPS-003 · *Rules:* D-1

**Requirement.** Each form has optional acknowledgment wording and an expected response time in its immutable publication. Its enquiry and acknowledgment outcomes remain independent; the Contact acknowledgment starts off. The published settings apply to each form under FORM-001.

**Acceptance.**
1. Enable acknowledgment wording, publish the revision, submit a contact and read the configured provider-edge outcome independently from its stored enquiry; replay the submission and see one send.

#### FORM-005 — Lead routing to Orbit, HubSpot and signed webhooks

*Tier:* Core

**Requirement.** Each form routes submissions to Orbit, HubSpot or a signed HTTPS webhook (Zapier, Crank or the buyer's own endpoint), with field mapping, retries with backoff, and a visible per-submission delivery state (delivered, retrying, failed) that never hides the stored inbox copy.

**Acceptance.**
1. Route a form to Orbit and to HubSpot test accounts and to a webhook that fails twice then succeeds; see the contact created in each CRM, the webhook signature verify, and the delivery state per submission.

#### FORM-006 — Enquiry ownership, status and follow-up

*Tier:* Core

**Requirement.** Each enquiry has an owner, a status (new, replied, booked, closed, spam) and a follow-up time. An enquiry with no reply after the owner's response window (default one business day in the business's time zone) is escalated to its owner and then the site owner.

**Acceptance.**
1. Assign an enquiry, leave another unanswered past the window, and see the reminder and escalation; mark one replied and see it leave the queue.

#### FORM-007 — Submission export and Google Sheets

*Tier:* Core · *Cites:* BASE-DATA-001

**Requirement.** Submissions export to CSV per form and date range, and a form can append each submission to a Google Sheet in the owner's Google Drive.

**Acceptance.**
1. Export a form's submissions to CSV, connect a Google Sheet, submit, and see the row appended.

#### FORM-008 — Consent capture for email and SMS

*Tier:* Core

**Requirement.** A form can ask for marketing consent with the owner's wording, record the exact text, time and page, and pass it with the contact to Mango, Mailchimp or Orbit. SMS consent follows TCPA practice: a separate unchecked box naming the business and message frequency. Consent records are kept with the enquiry and travel in exports.

**Acceptance.**
1. With Mango connected, submit a form with email consent ticked and SMS consent unticked; see consent text, time and page recorded and only the email consent reach the Mango contact.
2. Repeat with a Mailchimp test audience and see the contact subscribed with marketing permission and the consent text, time and page stored on the Mailchimp member, and the SMS consent absent.
3. Repeat with Orbit and see the consent on the Orbit contact.

### Bookings, checkout and connections

#### LINK-001 — Booking through Dial, Calendly or Acuity

*Tier:* Core

**Requirement.** A booking block embeds Dial (first), Calendly or Acuity Scheduling (Squarespace Scheduling) inline or as a pop-up, passes the page and campaign as booking source (Calendly UTM parameters, Acuity URL parameters or intake field), and reports completed bookings back to Pane's conversion goals (`STATS-002`): from Dial's booking event, Calendly's `event_scheduled` embed event or webhook, and Acuity's appointment-scheduled webhook. An owner moving from an existing website platform pastes their existing Acuity scheduling link or owner ID and keeps their Acuity account, appointment types and calendar. A restaurant adds a reservation block for Placemat (first), OpenTable or Tock and an online-ordering block for Toast or ChowNow by pasting its widget or ordering link; each embeds inline or opens as a button, and clicks through to it count as an outbound goal (`STATS-002`).

**Acceptance.**
1. On one service page, embed Dial, Calendly and Acuity Scheduling (a test Acuity account with one appointment type); complete a test booking in each from a UTM-tagged visit, and see each booking counted as a conversion for that page and campaign, with the Acuity booking confirmed by its webhook and carrying the page as its source; cancel the Acuity booking and see the conversion marked canceled.
2. On a restaurant page, add OpenTable and Tock reservation widgets and Toast and ChowNow ordering buttons from test restaurant IDs; see each widget render on the live site after consent where `PRIV-001` requires it, and each click counted as an outbound goal for that page.

#### LINK-002 — Checkout through Stall, Stripe Payment Links or PayPal

*Tier:* Core

**Requirement.** A buy or pay button and a product block hand visitors to Stall (first), a Stripe Payment Link or PayPal. Pane never handles card details; completed payments come back as conversions where the provider reports them. Sales tax is calculated by Stall or Stripe.

**Acceptance.**
1. Add a Stall product block, a Stripe Payment Link button and a PayPal button, complete a test-mode (PayPal sandbox) purchase through each, and see each counted as a conversion with no card data reaching Pane.

#### LINK-003 — Newsletter signup through Mango or Mailchimp

*Tier:* Core · *Cites:* BASE-MAIL-001

**Requirement.** A signup block (inline, in the footer, on the coming-soon page or in a pop-up, `PAGE-011`, `PAGE-013`) adds consenting visitors to an audience in Mango (first) or Mailchimp, with double opt-in when the owner chooses, the signup's consent text, time and page sent with the contact (`FORM-008`), optional tags or groups, and CAN-SPAM details (business postal address) checked. A failed handoff keeps the signup and retries, with its state shown in `LINK-005`. Under RL-102, collection starts only with a real authorized audience: disclose the destination, obtain explicit signup and applicable verification, report the actual provider outcome and honor suppression. Offers and announcements remain independent.

**Acceptance.**
1. With Mango connected, sign up through the block, confirm the double opt-in email and see the contact in the Mango audience with its consent record.
2. With a Mailchimp test audience connected, sign up with double opt-in on: see the member created as pending, follow Mailchimp's confirmation email, and see the member subscribed with its tag and the consent text, time and page recorded; make the Mailchimp key invalid, sign up again and see the signup kept, retried and shown as failing in the health panel.
3. Disconnect the audience and attempt a newsletter signup: no address is collected or subscribed; reconnect and complete the disclosed, verified signup while suppressed contacts remain suppressed.

#### LINK-004 — Zapier, Crank and outgoing webhooks

*Tier:* Core

**Requirement.** Form submissions, publications and enquiry status changes are available as signed outgoing webhooks and as triggers in published Zapier and Crank apps.

**Acceptance.**
1. Connect a Zapier test zap and a Crank flow to form submission and publication triggers, fire each, and see the payload arrive signed.

#### LINK-005 — Connection health panel

*Tier:* Core

**Requirement.** One panel lists every connected service (domain, mail, email forwarding, CRM, booking, checkout, newsletter, analytics, search consoles, Google Business Profile, Instagram feed, social accounts, webhooks) with its state, last success, last failure and how to fix it.

**Acceptance.**
1. Break a CRM credential and a webhook endpoint and see both shown as failing with their last success and a fix action; repair them and see them recover.

#### API-001 — Agent command helper and API

*Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-004, BASE-AGENT-005, BASE-AGENT-009 · *Rules:* D-1

**Requirement.** Pane's authenticated helper and API expose status, draft preparation, reviewed imports, publication and rollback, plus scoped per-agent credentials and read access to pages and collections. The native admin cannot publish; agent calls carry their computed classes and follow company policy.

**Acceptance.**
1. Through an admin's private session file run status, prepare and import, and see publication refused; create a scoped token, attempt an out-of-scope call and read its refusal and activity.

### Analytics and reporting

#### STATS-001 — Traffic by page, source, device and campaign

*Tier:* Core · *Rules:* D-4

**Requirement.** The workspace shows visits by page, day, referrer, device type, country or US state and UTM campaign, still without cookies or personal identifiers, and still not counting browsers that send Global Privacy Control or Do Not Track.

**Acceptance.**
1. Visit pages from a phone and a desktop with UTM tags and a referrer, then read the dashboard by page, source, device and campaign; a GPC visit is not counted.

#### STATS-002 — Conversion goals and click insights

*Tier:* Core · *Rules:* D-4

**Requirement.** The owner sets goals (form submissions, bookings, checkouts, signups, phone-number and email clicks, outbound clicks) and sees conversions and conversion rate by page, source and campaign, plus a simple funnel from landing page to goal. Each goal can be mapped to a Meta standard event and a Google Ads conversion action (`STATS-005`) and is raised in the browser as a the documented goal event event for custom code (`PAGE-008`).

**Acceptance.**
1. Define a quote-form goal and a phone-click goal, complete each from a tagged campaign, and see them counted by page and campaign with a funnel.

#### STATS-003 — Vane and Google Analytics 4 with consent

*Tier:* Core · *Cites:* BASE-PUBLIC-001, BASE-SECRET-001 · *Rules:* D-4

**Requirement.** The owner connects Vane (first) or Google Analytics 4 by measurement ID through one Google tag that `STATS-005` reuses for Google Ads. Vane runs cookie-free; GA4 loads only after consent where `PRIV-001` requires it, and never under GPC.

**Acceptance.**
1. Connect Vane and see events arrive; connect GA4 and see it load only after consent and send page views and goals.

#### STATS-004 — Monthly owner report

*Tier:* Core

**Requirement.** On the first business day of each month the owner receives a short report: visits, top pages, search clicks (`SEO-007`), enquiries and bookings by source, unanswered enquiries and open site problems.

**Acceptance.**
1. Advance the clock to a month boundary and see the report accepted by the mail provider with figures that match the dashboard.

#### STATS-005 — Meta Pixel and Google Ads conversion tracking

*Tier:* Core · *Rules:* D-4

**Requirement.** The owner connects the Meta Pixel by pixel ID and the Google tag for Google Ads by its `AW-` conversion ID from native connection panels, with no code. Page views go to both. Each `STATS-002` goal maps to a Meta standard event and to a Google Ads conversion action the owner picks from the connected account (or enters as a conversion label): by default a form submission sends `Lead`, a booking confirmed through `LINK-001` sends `Schedule`, a checkout confirmed through `LINK-002` sends `Purchase` with its USD value, a newsletter signup sends `CompleteRegistration` and a phone or email click sends `Contact`. Browser events fire when the goal completes, with an event ID. Optionally, Pane also sends the same event server-side from the stored submission through the Meta Conversions API and Google Ads enhanced conversions, with the visitor's email and phone normalized and SHA-256 hashed and the same event ID so the platform de-duplicates it. Everything waits for consent and nothing is sent under GPC (`PRIV-001`); the access tokens are installation secrets with their health in `LINK-005`.

**Acceptance.**
1. Connect a test Meta pixel and a test Google Ads account.
2. From a visit tagged with `fbclid` and `gclid`, accept consent, then submit a quote form, complete a Dial booking and click a phone number.
3. See `Lead`, `Schedule` and `Contact` in Meta Events Manager's Test Events with those names, see each mapped Google Ads conversion recorded through Tag Assistant, and with server-side sending on see the Conversions API events de-duplicated against the browser events by event ID and the enhanced conversion carrying only hashed identifiers.
4. Repeat without consent and with GPC and see no request to Meta or Google, browser or server-side.

### Team, roles and activity

#### ROLE-001 — Roles for editors, authors, moderators and reporting

*Tier:* Core · *Cites:* BASE-ROLE-001

**Requirement.** Beyond owner, admin and member, the owner assigns editor (edits pages and collections, cannot publish), author (writes and submits own posts only), comment moderator (approves, marks spam, deletes and replies to blog comments and receives comment notifications, `CMS-010`), inbox (reads and replies to enquiries) and reporting (reads analytics) roles. A person can hold several roles. Only the owner assigns roles; grants compose by union and an explicit assignment replaces legacy member access. Unassigned native members keep ACCESS-001 read-only access until a grant replaces it. Editors cannot change business or robots settings or publish; authors write and submit only their own private posts. The native assignment rules are recorded in RL-9.

**Acceptance.**
1. Invite one person per role and exercise every route as each; each sees and does only what its role allows, and only the owner, admins and comment moderators can act on the comment queue or receive comment notifications.
2. Native page writers and own-post authors initiate assistance within their existing content authority; assistance adds no publication rights.

#### ROLE-002 — Review requests and publish delegation

*Tier:* Core

**Requirement.** The owner can delegate publishing to named people, for all pages or one folder or collection. A review request notifies the publisher by email and push (`MOBILE-002`), and every delegated publication records who approved it.

**Acceptance.**
1. Delegate the blog to an admin, have an author submit a post, approve it as the admin from a notification, and see the approval recorded under the admin.

#### ROLE-003 — Designer-to-client handover

*Tier:* Core · *Cites:* BASE-ROLE-001

**Requirement.** A designer or agency builds a site, transfers ownership to the business owner, and keeps a contributor role the owner can revoke at any time.

**Acceptance.**
1. Build a site as a designer, transfer ownership to a new owner, see the designer drop to editor, and revoke them.

#### ROLE-004 — Two-step sign-in and passkeys for workspace users

*Tier:* Core · *Cites:* BASE-ACCESS-001, BASE-SIGNIN-001, BASE-SIGNIN-002, BASE-AUDIT-001 · *Register:* R-6

**Requirement.** Pane's two-step coverage can target its owner and admin roles or every workspace role, including its editors and own-post authors. Its provider choices are Auth, Google, Entra ID and Okta; account-specific enrollment, removal and recovery appear in Pane's activity view.

**Acceptance.**
1. Require two-step sign-in for all roles; sign in as an editor by email and see enrollment before the workspace; register and use a passkey and authenticator code, refusing wrong and reused codes; use a recovery code once and refuse it twice; complete OIDC provider MFA without a second prompt; recover through the owner and read each enrollment, removal and recovery event.

#### AUDIT-001 — Activity log of every change

*Tier:* Core · *Cites:* BASE-AUDIT-001, BASE-DATA-003, BASE-OPS-005

**Requirement.** Pane's metadata-only owner activity view includes every edit, publication, rollback, setting change, connection change, import, erasure, role change and agent action, identifying each subject (RL-3).

**Acceptance.**
1. Perform each kind of Pane action, read its metadata trail in order and open the export.

### Moving in from incumbents

#### IMPORT-001 — WXR publishing platform import

*Tier:* Core · *Rules:* D-1, D-2, D-3 · *Register:* R-8

**Requirement.** Pane imports a WXR publishing platform export (WXR XML) from hosted WXR publishing platform or self-hosted WXR publishing platform: pages, posts, categories, tags, authors, featured images and media files fetched from their references, menus where present, comments (approved, pending and spam, with author name, email, URL, date and reply threading) into `CMS-010`, and every old URL mapped for redirects. Shortcodes and plugin blocks it cannot render are listed, not dropped silently.

**Acceptance.**
1. Import a real hosted WXR publishing platform export with 100 posts, media and at least 50 comments including threaded replies and pending ones, review the plan and its exceptions (including the comment counts by state), apply as an unpublished draft, see every comment on its post with the same threading and state, and open every old URL on the new site through its redirect.
2. Apply the import and inspect every content type against D-3, including each retained exception, old URL and rendered rich body; its applied counts equal the report.

#### IMPORT-002 — XML-export site builder import

*Tier:* Core · *Rules:* D-1, D-2, D-3 · *Register:* R-8

**Requirement.** Pane imports an XML-export site builder site from its WXR publishing platform-format export plus a crawl of the published site for what the export omits, keeping the URL map. Each XML-export site builder blog page becomes its own blog (`CMS-004`) with its posts, feed URL and comments (`CMS-010`). Restaurant menu blocks become items in a menu-items collection (`CMS-001`) with section, name, description and USD price, shown through a collection list (`CMS-003`). Calendar (events) pages are imported into the events collection (`CMS-009`) with each event's title, description, image, start and end time in the site's time zone, location and its register or buy link, read from the calendar page's published event data, and old event URLs redirect to the new event pages. Gallery pages and gallery sections are rebuilt as gallery blocks (`PAGE-012`) with their images and captions, and other page layouts are rebuilt as sections from the crawl, with XML-export site builder blocks mapped to the `PAGE-014` catalog (text with its heading levels, formatting, lists and links; button, quote, line, spacer, accordion, social links, audio, code, chart, scrolling text and shape blocks) and every link and button target kept. Blog post bodies are mapped the same way into the `CMS-011` editor, keeping inline images with their captions, quotes, video embeds, buttons and links. Each XML-export site builder form block becomes a working `FORM-001` form on the same page with the same fields in the same order, each field's type, label, description and required setting, the submit label, the confirmation message or redirect, and the notification recipients (`FORM-003`); a field type with no equivalent is listed in the report. Products are written to a Stall product import file (or listed with their Stripe or PayPal replacements) because checkout belongs to Stall (`LINK-002`), and scheduling blocks keep their Acuity link (`LINK-001`). Whatever still cannot map is listed in the report (`IMPORT-005`), never left as an unexplained to-do.

**Acceptance.**
1. Import a test XML-export site builder site with two blog pages with comments, a calendar page of 12 events (past and upcoming, one with a product block), a gallery page, a menu block of 20 items and a scheduling block; review the report and apply.
2. Apply the import and inspect every content type against D-3, including each retained exception, old URL and rendered rich body; its applied counts equal the report.
3. In addition: each blog page is its own blog with its own feed and every comment on its post with threading and state; every event is in the events collection with correct local times, its old URL redirecting to it and the upcoming split right; the 20 menu items are in the menu-items collection with their prices; the scheduling block keeps its Acuity link; the product is in a Stall import file; a post holding headings, a list, two inline images with captions, a quote, a YouTube video, a button and links to a service page, another post and a PDF passes the link, heading, list and inline-image checks; and a contact form block with a required field and a field description becomes a `FORM-001` form that refuses the empty required field and delivers a test submission to the same recipient.

#### IMPORT-003 — Crawl-only site builder import

*Tier:* Core · *Rules:* D-1, D-2, D-3, D-5 · *Register:* R-8

**Requirement.** Because crawl-only site builder offers no full site export, Pane imports a crawl-only site builder site by crawling its published pages and blog (and the blog's RSS) with the owner's proof of domain control, rebuilding pages from the content and keeping the URL map. Controlled public captures obey D-5 (RL-101); DNS control does not license the assets.

**Acceptance.**
1. Import a published crawl-only site builder test site with a blog by crawl, review the mapping and apply.
2. Apply the import and inspect every content type against D-3, including each retained exception, old URL and rendered rich body; its applied counts equal the report.
3. The source's page and post list is its published sitemap plus the crawl, and blog posts are checked against the blog's RSS.

#### IMPORT-004 — Visual and generated site builder import

*Tier:* Core · *Rules:* D-1, D-2, D-3, D-5 · *Register:* R-8

**Requirement.** Pane imports collection-based visual site builder and design-first visual site builder CMS CSV exports (`CMS-007`) and their published pages by crawl, and AI-generated site builder sites by crawl, with the same review, exceptions and URL map. Controlled public captures obey D-5 (RL-101); DNS control does not license the assets.

**Acceptance.**
1. Import a collection-based visual site builder site with two collections, a design-first visual site builder site with one collection and a published AI-generated site builder site by crawl, review exceptions for each and apply.
2. Apply the import and inspect every content type against D-3, including each retained exception, old URL and rendered rich body; its applied counts equal the report.
3. The rule is applied to each of the three sites separately, and every CSV row of each collection-based visual site builder and design-first visual site builder collection is an item with each field's value equal to the CSV's.

#### IMPORT-005 — Migration report and URL map

*Tier:* Core · *Cites:* BASE-INPUT-001

**Requirement.** Every import shows, before anything is written, a report of what will map where, what will not (with reasons), counts per content type (pages, posts, comments by state, collection items, events, galleries, media, products handed to Stall), every old URL and its new target, media that could not be fetched, and each form's old destination. Apply needs the report's fingerprint; undo works while the draft is unpublished (`MOVEIN-001`). After apply, the report is re-checked against the new site with the import pass rule every incumbent import (`IMPORT-001` to `IMPORT-004`) states, including its link, button, heading, list and inline-image checks on every page, post, collection item and event, and any item that fails it (for example a link whose internal target did not import) is added to the report with its reason. The report also states plainly what stays behind with the old platform, including its traffic and sales analytics history.

**Acceptance.**
1. Run an import with unsupported content, comments, a post linking to a page the import skips and a broken image link; read the report, see the post's dangling link listed after apply, with its per-type counts, apply with its fingerprint, see the applied counts equal the report's, and undo.

#### IMPORT-006 — Verified cutover with the old site kept

*Tier:* Core · *Cites:* BASE-INPUT-001

**Requirement.** Cutover is a checked step: Pane confirms the new site's pages, redirects, forms and lead routes work on a preview hostname, that mailbox records are kept (`DOMAIN-003`) and that every registrar email forwarding alias has been recreated and proven (`DOMAIN-005`), then switches the domain (`DOMAIN-001`) while the old site stays reachable until the owner closes it, and rolls the DNS back in one action if needed.

**Acceptance.**
1. Cut a test domain with Google Workspace MX records and XML-export site builder email forwarding over from an old host: see cutover refused until every forwarding alias is proven, see pre-cutover checks pass, then roll back and forward again with mailbox mail and every forwarded alias still delivering.

#### IMPORT-007 — Enquiry and subscriber history import

*Tier:* Core · *Cites:* BASE-INPUT-001

**Requirement.** An owner moving in brings their history: past form submissions exported from XML-export site builder (form storage and contacts), crawl-only site builder (form submissions CSV) or hosted WXR publishing platform (form responses CSV) import into the inbox with their original dates, form and fields, marked as imported and not re-notified; and the old platform's newsletter subscriber list imports into Mango or Mailchimp (`LINK-003`) with each subscriber's original consent date and source carried and unsubscribed or bounced contacts kept suppressed, never re-subscribed. Analytics history can come too: a monthly visits-by-page CSV exported from XML-export site builder Analytics (or crawl-only site builder or hosted WXR publishing platform stats) imports as a baseline that `STATS-001` charts before Pane's own counts begin, marked as imported; without one, the migration report (`IMPORT-005`) says that traffic and sales history stays with the old platform.

**Acceptance.**
1. Import an XML-export site builder form-submissions CSV of 200 rows and a subscriber list with 20 unsubscribed contacts; see the 200 enquiries in the inbox with original dates and no notifications sent, and see the subscribers in Mango and in a Mailchimp test audience with consent dates and source kept and the 20 unsubscribed contacts suppressed.
2. Import a 12-month XML-export site builder Analytics visits-by-page CSV and see each month's visits per page in `STATS-001`, labeled imported, matching the CSV's totals.

### Portability, privacy and US norms

#### EXPORT-001 — Open-format site export

*Tier:* Core · *Cites:* BASE-DATA-001

**Requirement.** Besides the installation archive (`BACKUP-001`), the owner exports content in open formats: WordPress WXR for pages and posts, CSV for each collection and form, a ZIP of original media, and a static HTML copy of the live site that runs on any host.

**Acceptance.**
1. Export a populated site in every format, import the WXR into WordPress, open the CSVs, and serve the static copy from a plain web server.

#### PRIV-001 — Consent for analytics and third-party embeds

*Tier:* Core · *Cites:* BASE-PUBLIC-001 · *Rules:* D-4

**Requirement.** Pane's own counting needs no consent. When the owner adds GA4, the Meta Pixel, the Google tag for Google Ads (`STATS-005`), custom header code (`PAGE-008`) or a third-party embed, a consent banner appears with US-appropriate choices, Global Privacy Control is honored as an opt-out of sale and sharing, and nothing third-party loads before the choice. Under GPC no advertising pixel or tag loads at all and no server-side conversion (`STATS-005`) is sent for that visit.

**Acceptance.**
1. Add GA4, the Meta Pixel, a Google Ads tag and a YouTube embed, visit with and without GPC, and see no third-party request before consent, and none at all under GPC for GA4, the Meta Pixel or the Google tag; submit a form under GPC and see no Conversions API or enhanced-conversion request sent.

#### PRIV-002 — Person-level privacy requests

*Tier:* Core · *Cites:* BASE-DATA-003, BASE-DATA-006

**Requirement.** For a CCPA or similar request, the owner finds everything stored about one email address (enquiries, consents, files, blog comments, subscriber records and the CRM deliveries Pane made), exports it for the person and erases it in one action, with the erasure fenced against old backups (`ERASE-001`) and the downstream services listed for follow-up.

**Acceptance.**
1. Submit three forms as one person, run a request by email, export their data, erase it, and see every record gone, the fence in place and the CRM deliveries listed.

#### PRIV-003 — Policy and accessibility statement starters

*Tier:* Core

**Requirement.** Pane offers starter privacy policy, terms and accessibility statement pages that list what this site actually collects and which services it connects, for the owner to review; they are clearly marked as starters, not legal advice.

When AI assistance is connected, the actual-service inventory and privacy starter name OpenAI as the AI processor accessed through Base AI and describe the selected page and named image inputs sent only after the owner’s explicit request; pre-request consent copy makes the same disclosure. This addition does not certify provider terms, legal compliance or accessibility.

**Acceptance.**
1. Connect GA4 and a CRM, generate the privacy policy starter, and see both services named; edit and publish it.

#### PRIV-004 — Security headers on every page

*Tier:* Core · *Cites:* BASE-SECRET-001, BASE-PUBLIC-001 · *Rules:* D-4

**Requirement.** Pane's workspace, shared entry screens and live pages have a strict content security policy, frame protection, MIME sniffing protection, a referrer policy and a permissions policy. An approved embed widens only its own published page's host policy. Device permissions remain denied throughout nested frames unless a target clause explicitly needs a named embed's origin on its own page after consent.

**Acceptance.**
1. Read the headers on each page type, add and publish an embed, and see only that page allow its host; workspace and draft previews remain inert and nested frames cannot override denied device permissions.

#### LOCALE-001 — US defaults

*Tier:* Core

**Requirement.** The workspace and live site default to US English, the business's US time zone with daylight saving, US date and time formats, USD prices, US phone and address formats, and Sunday-start calendars; a business can change each.

**Acceptance.**
1. Set the time zone to America/Denver, and see workspace dates, scheduled times and opening hours in local US format with USD prices.

### Owner mobile

#### MOBILE-001 — Responsive owner workspace on a phone

*Tier:* Core

**Requirement.** Every workspace task works on a 390-wide phone browser: editing, previewing, approving, replying to enquiries and reading stats, with no horizontal scroll.

**Acceptance.**
1. Run the full browser journey at 390 wide, including the target editor, approvals and inbox replies, with no overflow and a passing accessibility run.

#### MOBILE-002 — Native iOS and Android owner app

*Tier:* Core · *Register:* R-9

**Requirement.** A native owner app sends push notifications for new enquiries, review requests and site problems, lets the owner reply, approve and publish, post to the blog with photos from the camera, and read stats. Its post editor writes `CMS-011` bodies with every paragraph style, inline format, list and link destination, and image (camera or library, with caption and alt text), gallery, quote, button, line and video embed blocks; any other block in a post is shown as a labeled placeholder and kept unchanged when the post is saved from the phone. It uses the installation's own sign-in and holds no content offline beyond what the owner opens.

**Acceptance.**
1. Install the app on iOS and Android test devices, receive a push for a new enquiry, reply, approve a review request and publish a photo post holding an H2, a bulleted list, a link to a page and two camera photos with captions; the live post passes the `CMS-011` DOM checks.
2. Edit a desktop-written post containing a form block on the phone and see the form block unchanged after saving.

### Automation and follow-up

#### AUTO-001 — Form-triggered automations

*Tier:* Core · *Cites:* BASE-OPS-003, BASE-OPS-004

**Requirement.** The owner sets rules on form submission: acknowledge the sender, notify people, create a follow-up task, post to Nook, Slack or Microsoft Teams, route to a CRM or tag the enquiry, with conditions on form and field values.

**Acceptance.**
1. Create a rule that posts quote requests over $5,000 to a Nook channel, a Slack test channel and a Microsoft Teams test channel and tags them; submit two forms and see only the large one posted to all three and tagged.

#### AUTO-002 — Scheduled automations

*Tier:* Core · *Cites:* BASE-OPS-003, BASE-OPS-004

**Requirement.** Time-based rules run on the owner's schedule in their US time zone: holiday-hour banners, recurring reminders to review stale pages, and expiring promotions.

**Acceptance.**
1. Schedule a holiday banner for Thanksgiving and a quarterly page-review reminder, advance the clock, and see both happen at local time.

#### AUTO-003 — Share new posts to social accounts

*Tier:* Core · *Cites:* BASE-OPS-003, BASE-OPS-004

**Requirement.** On publication a post can be shared to the business's connected Facebook Page, Instagram, LinkedIn Page or X account with owner-approved text.

**Acceptance.**
1. Connect a test Facebook Page, Instagram professional account, LinkedIn Page and X account, publish a post with sharing on, and see each of the four shares created with its link (the Instagram share with the post's featured image).

#### AUTO-004 — Site problem alerts

*Tier:* Core · *Cites:* BASE-OPS-003, BASE-OPS-004

**Requirement.** Pane alerts the owner when a form delivery fails, a connection breaks, a certificate or domain is near expiry, a page returns errors or links break, and can hand external uptime checks to Uptime.

**Acceptance.**
1. Break a webhook, expire a test certificate and add a broken link; see one alert per problem by email and push, and see Uptime monitors created for the live site on request.

### AI site building

#### AI-001 — Draft a whole site from business facts

*Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-1

**Requirement.** From the owner's business facts (name, services, service area, hours, prices, team, tone, photos), Pane drafts a complete site: pages, sections, collections, copy, menus, search titles and structured data, using the owner's photos or clearly marked placeholders. The result is an unpublished draft the owner previews and edits; an agent publication carries external and live, decided by company policy, and no reviews, credentials or prices are invented.

**Acceptance.**
1. Enter facts for a test plumbing business (six services with USD prices, two staff, weekly hours, two real reviews), receive a draft site within two minutes and preview every page.
2. A check over the draft's text and structured data passes only when: every price, review, staff name, credential, phone number and opening hour in the draft equals an entered fact or is marked as a placeholder; every entered service has its own page or collection item; every entered staff member and review appears; and every image is an owner photo or a marked placeholder.
3. Publish after edits.

#### AI-002 — Writing, alt text and translation assist

*Tier:* Core · *From:* AI-002 · *Cites:* BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-1 · *Register:* R-10

**Requirement.** In the editor, AI rewrites, shortens and adjusts the tone of selected text, drafts alt text for images, and translates into Spanish or other languages as separate draft pages. Input custody and decision history are AI-005 and AI-006 (RL-1, RL-2).

**Acceptance.**
1. Under the held company policy, rewrite, shorten and change a paragraph's tone, draft alt text for five images and translate the home page to Spanish and another language; accept some suggestions and reject others, and read only accepted text in the draft with its separate translated pages.

#### AI-003 — Search and content suggestions

*Tier:* Core · *From:* AI-003 · *Cites:* BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-1 · *Register:* R-10

**Requirement.** AI examines a page's search and clarity: titles, descriptions, headings, internal links and structured-data gaps. Its proposed edits use AI-005 input custody and AI-006 decision history (RL-1).

**Acceptance.**
1. Under the held company policy, examine a weak page, read proposed titles, descriptions and links, accept two, reject the others and publish the accepted changes.

#### AI-005 — Selected assistance inputs and disclosure

*Tier:* Core · *From:* AI-002, AI-003 · *Cites:* BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-1 · *Register:* R-10

**Requirement.** Assistance sends OpenAI through Base AI only the selected page's content, necessary page-local context and explicitly named image inputs. RL-1 and RL-2 retain each native writer's existing content authority. An agent's provider call carries external, adding sensitive for regulated input; the company's policy decides the call.

**Acceptance.**
1. Before a native request, read disclosure naming OpenAI through Base AI, the selected content and named images; initiating records actor, time, operation, selected page, source revision, named image identifiers and request identifier.
2. Inspect the provider payload: other pages, unrelated unpublished material, history, visitors, submissions, enquiries, accounts and secrets are absent; linked targets are never fetched.
3. A native page writer and an own-post author request only within their existing content permissions; an out-of-authority request sends nothing. No additional role or publication authority is conferred.
4. Connected policy starters and pre-request copy disclose that processor and those inputs, remain editable drafts and preserve existing pages.

#### AI-006 — Assistance decisions and durable history

*Tier:* Core · *From:* AI-002, AI-003 · *Cites:* BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-1 · *Register:* R-10

**Requirement.** Assistance generation alone does not edit a native draft. Native decisions individually accept or reject suggestions, bind their reviewed revision and retain PAGE-006 history and conflict recovery. An agent's draft application carries standard and its publication carries external and live, adding commitment for binding offers; the company's policy decides each call (RL-1, RL-2).

**Acceptance.**
1. Under the held company policy, inspect pending suggestions, accept some and reject others; only accepted changes enter a new immutable unpublished draft and translations become separate pages.
2. Reopen, undo and redo five steps; change the source from another editor and see the reviewed decision refused without a silent overwrite, with the losing work retained for comparison, copy or explicit latest selection.
3. Read metadata-only lifecycle activity: actor, action, time, operation, identifiers, revisions, provider, model, decision and sanitized outcome; no prompt or output body, excerpt, image bytes, signed image link, credential or raw provider error appears.
4. Under that held policy, generation, acceptance, rejection and undo or redo send no publication, mail or linked fetch; publication is a separate action.

#### AI-004 — AI collection and bulk content operations

*Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-1

**Requirement.** Under the company's policy for external processor input and standard draft writes, AI creates a collection schema from a description or a pasted list, fills items from source text the owner provides, and makes bulk edits (for example update every service's price range) as one reviewable draft.

**Acceptance.**
1. Under the held company policy, paste a price list, inspect the proposed services schema and items, then request a bulk change and decide its exact diff.

### Agent surface

**Specialist: website steward.** Keeps a small business's site accurate, moves it safely, publishes its changes and follows enquiries through to people.

Inherits BASE-AGENT-001 to BASE-AGENT-013. The company's policy decides every call; Pane presets no disposition.

**How Pane computes each class.**
- standard: reversible private drafts and internal record work, measured in items.
- external: a public revision, outside message, shared link or processor input, with recipients and known, new or public counterparty taken from the business's records and exposure.
- live: changed published behavior, DNS, routing, scheduling or executing code, naming the affected site.
- commitment: a binding offer, published price or sign-off others rely on, with value and counterparty.
- access: membership, roles, ownership and grants, with people and widening or narrowing direction.
- security: credentials, admission, protective settings and code permissions, naming the setting.
- destructive: permanent enquiry/media erasure or archive replacement that cannot be undone, with item count.
- sensitive: ID, health or bank information in a private record or attachment, with kind and record count; Pane never processes payment-card details.
- accounts: an outside account or paid provider resource, naming the provider.
- money: the actual change to provider charges, with amount, currency and counterparty.
- gated: an outside provider's consent, verification or hosted payment step reserved to a person, naming provider and step.

| Tool | Does | Core clauses | Risk class | Today |
| --- | --- | --- | --- | --- |
| `pane.pages.edit` | Organize pages and edit visual sections and rich bodies | PAGE-001, PAGE-002, PAGE-003, PAGE-004, PAGE-005, PAGE-006, PAGE-010, PAGE-015, PAGE-014, PAGE-018, PAGE-019, CMS-011 | standard | Native capability or target only; MCP mapping missing |
| `pane.pages.review` | Request and manage page review | PAGE-007, ROLE-002 | standard or commitment | Native capability or target only; MCP mapping missing |
| `pane.sites.publish` | Select a complete public revision | PUBLISH-001, PUBLISH-003, PUBLISH-004 | external · live (+ commitment) | Native capability or target only; MCP mapping missing |
| `pane.sites.preview` | Read a private revision | PUBLISH-002 | standard | Native capability or target only; MCP mapping missing |
| `pane.sites.gates` | Configure page, folder and site admission | PAGE-011, PAGE-016 | access · security (+ live) | Native capability or target only; MCP mapping missing |
| `pane.promotions.update` | Prepare popups and bars | PAGE-013 | standard | Native capability or target only; MCP mapping missing |
| `pane.code.update` | Configure custom code and marketplace tags | PAGE-008, PAGE-017, PRIV-004 | security (+ external · live) | Native capability or target only; MCP mapping missing |
| `pane.styles.update` | Select templates, site styles and brand images | STYLE-001, STYLE-002, STYLE-003, STYLE-004 | standard | Native capability or target only; MCP mapping missing |
| `pane.media.manage` | Upload, organize, transform and remove media | MEDIA-001, MEDIA-002, MEDIA-003, MEDIA-004, PAGE-012 | standard or destructive (+ external) | Native capability or target only; MCP mapping missing |
| `pane.collections.manage` | Define collections, templates, lists, events and CSV transfers | CMS-001, CMS-002, CMS-003, CMS-007, CMS-009, CMS-012 | standard (+ external) | Native capability or target only; MCP mapping missing |
| `pane.posts.manage` | Write blogs, schedules, feeds, comments and search settings | CMS-004, CMS-005, CMS-006, CMS-008, CMS-010 | standard or destructive (+ external · live) | Native capability or target only; MCP mapping missing |
| `pane.domains.connect` | Connect domains, certificates, DNS and forwarding | DOMAIN-001, DOMAIN-002, DOMAIN-003, DOMAIN-005 | external · live (+ accounts · security · gated · money) | Native capability or target only; MCP mapping missing |
| `pane.hosting.update` | Apply a signed installation update | HOST-003 | security · live (+ destructive) | Native capability or target only; MCP mapping missing |
| `pane.hosting.cost` | Read running cost | HOST-004 | standard | Native capability or target only; MCP mapping missing |
| `pane.search.update` | Manage search metadata, redirects, structured data and languages | SEO-001, SEO-002, SEO-003, SEO-004, SEO-005, SEO-006, SEO-007, SEO-008, SEO-009, SEO-010 | standard (+ external · live · gated) | Native capability or target only; MCP mapping missing |
| `pane.forms.configure` | Configure typed forms, protection, destinations and consent | FORM-001, FORM-002, FORM-003, FORM-004, FORM-005, FORM-008 | standard (+ external · security) | Native capability or target only; MCP mapping missing |
| `pane.enquiries.manage` | Read enquiries, reply, assign, export or erase | INBOX-001, FORM-006, FORM-007, ERASE-001, PRIV-002 | standard or destructive (+ external · sensitive) | Native capability or target only; MCP mapping missing |
| `pane.connections.manage` | Connect booking, checkout, newsletters, triggers and health | LINK-001, LINK-002, LINK-003, LINK-004, LINK-005 | standard (+ external · accounts · gated · security · money) | Native capability or target only; MCP mapping missing |
| `pane.analytics.read` | Read visits, goals, conversions and reports | VISIT-001, STATS-001, STATS-002, STATS-004 | standard | Native capability or target only; MCP mapping missing |
| `pane.analytics.configure` | Configure analytics and advertising goal handoffs | STATS-003, STATS-005 | external · security (+ sensitive · live) | Native capability or target only; MCP mapping missing |
| `pane.people.manage` | Assign roles, hand over ownership and configure sign-in | ACCESS-001, ROLE-001, ROLE-003, ROLE-004 | access (+ security · gated) | Native capability or target only; MCP mapping missing |
| `pane.activity.read` | Read and export site activity | AUDIT-001 | standard (+ sensitive) | Native capability or target only; MCP mapping missing |
| `pane.imports.run` | Review, apply, inspect and undo a move-in | MOVEIN-001, IMPORT-001, IMPORT-002, IMPORT-003, IMPORT-004, IMPORT-005, IMPORT-007 | standard (+ external · sensitive) | Native capability or target only; MCP mapping missing |
| `pane.cutover.run` | Switch or roll back the public domain | IMPORT-006 | external · live · security | Native capability or target only; MCP mapping missing |
| `pane.archives.manage` | Export and restore installation or open-format content | BACKUP-001, EXPORT-001 | standard or destructive (+ security · sensitive) | Native capability or target only; MCP mapping missing |
| `pane.privacy.configure` | Set visitor choices and generate policy starters | PRIV-001, PRIV-003 | standard (+ security · live) | Native capability or target only; MCP mapping missing |
| `pane.locale.update` | Set business formats | LOCALE-001 | standard | Native capability or target only; MCP mapping missing |
| `pane.automations.manage` | Configure timed work, social sharing and problem alerts | AUTO-001, AUTO-002, AUTO-003, AUTO-004 | standard (+ external · live) | Native capability or target only; MCP mapping missing |
| `pane.assistance.run` | Draft sites, text, image descriptions, search changes and bulk edits | AI-001, AI-002, AI-003, AI-004, AI-005, AI-006 | external (+ sensitive · standard · live · commitment) | Native capability or target only; MCP mapping missing |
| `pane.specialist.run` | Interview, maintain facts, prove delivery, repair search, experiment, migrate and follow up | AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-006, AGENT-007, AGENT-008 | standard (+ external · live · commitment · sensitive · security · destructive) | Native capability or target only; MCP mapping missing |
| `pane.credentials.manage` | Configure helper and integration grants | API-001 | access · security | Native capability or target only; MCP mapping missing |

**Resources.** `pane://site/{id}`, `pane://revision/{id}`, `pane://page/{id}`, `pane://post/{id}`, `pane://collection/{id}`, `pane://enquiry/{id}`, `pane://import/{id}`, `pane://connection/{id}`. **Events.** `page.changed`, `revision.published`, `enquiry.received`, `enquiry.updated`, `import.completed`, `connection.failed`, and the inherited decision events. **Prompts.** Interview and build (AGENT-001); maintain facts (AGENT-002); prove enquiries (AGENT-003); recover search (AGENT-004); compare leads (AGENT-005); migrate (AGENT-006); follow up (AGENT-007).

**Not tools, and why.** ACCESS-002: a condition of every request, rather than a separate user job; HEALTH-001: deployment identity is an installation fact; DEPLOY-001: initial provisioning is an installation fact before the installed agent door exists; RUNSITE-001: the static public run site is an installation artifact; LOBBY-001: the shared Lobby and theme are a person's interactive screens; PRESENT-001: preview labeling and unbranded presentation are output properties; PAGE-009: accessible output is a property of every generated page and editing screen; HOST-001: edge latency and caching are installation facts; HOST-002: outage continuity is an installation property; HOST-005: the initial account authorization is a person's hosted provider screen; DOMAIN-004: registrar choice, transfer guidance and outside account closure are a person's provider screens; MOBILE-001: responsive workspace use is a person's screen; MOBILE-002: camera, push and native app installation are device-only work.

**Limits.** Pane's draft, media, body-size and request-rate capacity bounds are documented in its [mechanisms](docs/contract/MECHANISM.md); business thresholds and spend caps are the company's policy. **Handoffs.** Listens for Orbit fact changes, Dial bookings, Stall purchases and Mango subscription outcomes; emits enquiry, publication, connection and import events for those specialists and for Uptime. No event text selects authority.

#### SURFACE-001 — The website specialist registry

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-001, BASE-AGENT-002, BASE-AGENT-003, BASE-AGENT-010, BASE-AGENT-013 · *Register:* R-12

**Requirement.** Pane's website steward exposes the jobs, record resources, handoffs and prompts listed here through the shared agent door.

**Acceptance.**
1. Discover Pane's registry and reconcile each Core clause with the listed tool or its stated non-tool reason; invoke site status and draft preparation and compare their resulting Pane records with the same workspace actions.
2. Open linked site, revision, page, post, collection, enquiry, import and connection resources after a tool changes them and read the matching Pane state.
3. Follow page, publication, enquiry and import changes from the workspace through Pane's event feed and webhook handoffs; match their event and record identities.
4. Discover and use the interview, maintain-site, prove-enquiries, recover-search, compare-leads, migrate and follow-up prompts against the clauses listed here.

#### SURFACE-002 — Content exposure and live-site classes

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-006, BASE-AGENT-007 · *Register:* R-12

**Requirement.** Pane computes standard, external, live and commitment from its revision's visibility, recipients and binding business claims.

**Acceptance.**
1. Edit and undo a private site draft: the call is standard and names the changed item count; publishing it adds external with public counterparty and live with the affected site.
2. Send an enquiry reply to a recorded customer and to a new address: both are external with the correct known or new counterparty and recipient count; an open preview link is public.
3. Apply a services price or binding offer to published content: commitment carries the affected offer value and counterparty alongside external and live; a wording-only private draft remains standard.
4. Send selected assistance input to its declared processor: classify the outside recipient as external from the installation's connection, regardless of an agent or imported page claiming it is internal.

#### SURFACE-003 — Authority, provider and data classes

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-005, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008 · *Register:* R-12

**Requirement.** Pane computes the remaining classes from the changed people and settings, permanence, provider resource and charges, hosted provider steps and regulated fields.

**Acceptance.**
1. Invite an editor and revoke a contributor: access names each person and widening or narrowing; sign-in, code policy and credential changes also carry security naming the setting.
2. Permanently erase an enquiry and restore an archive: destructive names the irreversible record count, while reversible draft edits and trash remain standard; restoring protective settings also carries security.
3. Read an enquiry attachment containing an ID or bank field: sensitive names its regulated kind and record count; a public brochure has no sensitive class.
4. Create a paid provider resource for a domain connection: accounts names Cloudflare and money carries its exact charge, currency and counterparty; a cost read alone has neither class.
5. Encounter Cloudflare authorization, destination verification or a provider's hosted payment step that requires a person: gated names that provider and exact step; use a company API credential where the provider accepts it and compute the remaining classes from that route.

#### SURFACE-004 — A seeded week through the website door

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-004, BASE-AGENT-007, BASE-AGENT-009, BASE-AGENT-011, BASE-AGENT-012, BASE-AGENT-013 · *Register:* R-12

**Requirement.** A stranger website steward given the installation URL completes a week of site work entirely through Pane's MCP tools under two named company policies.

**Acceptance.**
1. With the all-autonomous company policy covering every class, import a seeded small business, draft its service and blog content, correct sourced hours, publish a change, check its old redirects and process its enquiries without a policy hold or refusal.
2. Repeat that week under the held company policy: standard calls enter review and every other declared class waits for that policy's named person to decide the exact saved revision; read the resulting site, enquiries, review feed and activity.
3. Under a company policy that blocks outside replies, attempt the follow-up: see no message sent and retain the enquiry for handoff; permitted private site work still completes.
4. Reconcile the week's site changes, enquiry outcomes and handoffs against the site's activity and record resources.

## Push further

### Agents that build and keep the site true

#### AGENT-001 — Interview the owner and build from verified facts

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-009, BASE-AGENT-011 · *Rules:* D-1

**Requirement.** Interviews the owner by web or phone chat or voice, checks their named Google Business Profile, existing site, Orbit services and Dial availability, and drafts AI-001 from verified business facts. Each claim retains its source; conflicting facts are raised, and missing facts remain questions rather than invented reviews, credentials, prices, offers or staff.

**Acceptance.**
1. Under the held company policy, interview a test business whose Google profile conflicts with an answer, resolve the discrepancy with the owner, and trace each published claim to its source; the draft stays private until that policy's publication decision completes.

#### AGENT-002 — Keep business facts current across the site

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-009, BASE-AGENT-011 · *Rules:* D-1

**Requirement.** Compares revisions, collections, Google Business Profile, Orbit, Dial and schedules for stale hours and holiday hours, changed services and prices, departed staff, expired seasonal promotions and pages unreviewed for six months. One change set contains only affected pages, items, redirects and structured data, with reasons and sources. Price or offer changes carry commitment; publication carries external and live. The company's policy decides them even when publishing is delegated.

**Acceptance.**
1. Under the held company policy, change an Orbit service price and profile holiday hours, inspect one sourced draft changing only the affected page, item and structured data, and complete its policy decision.

#### AGENT-003 — Prove every enquiry reaches a person

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-009, BASE-AGENT-011 · *Rules:* D-1

**Requirement.** Runs clearly labeled scheduled test submissions across forms, storage, notification acceptance, CRM creation and booking handoff. It identifies failures, assigns repair tasks and rechecks repairs, and finds real enquiries without owners or replies. The owner chooses the schedule and label; synthetic enquiries stay out of business stats and CRM pipelines. Test contact carries external; routing changes add live, decided by company policy.

**Acceptance.**
1. Break HubSpot, run the scheduled labeled enquiry, read the identified failure and owner notification, repair it and read a passing retry with no test enquiry in business reports.

#### AGENT-004 — Recover lost search traffic and broken paths

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-009, BASE-AGENT-011 · *Rules:* D-1

**Requirement.** Uses Search Console clicks, failed old URLs, link checks, Core Web Vitals and revision history to explain likely search losses with evidence and uncertainty. It prepares a redirect, restored page, improved title or smaller image. Publication carries external and live, decided by company policy; no ranking is guaranteed.

**Acceptance.**
1. Delete a search-receiving page without a redirect; read the lost clicks and failed URLs, inspect the suggested redirect, and under the held policy complete its decision and see the failures stop.

#### AGENT-005 — Measure changes against real leads and bookings

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-009, BASE-AGENT-011 · *Rules:* D-1

**Requirement.** Joins revisions to enquiry, booking and purchase outcomes from Orbit, Dial, Stall or Stripe; proposes a bounded headline, form or call-to-action experiment with hypothesis, traffic split and duration; and reports before-and-after or A/B results with confidence. It distinguishes clicks from revenue and ends experiments the owner stops. Live experiments and changed public claims carry live and external, adding commitment for binding offers; company policy decides them.

**Acceptance.**
1. Under the held company policy, decide a two-headline contact-page experiment, read its chosen traffic split, conversions from actual seeded form submissions and final confidence report, then publish the selected winner through that policy.

#### AGENT-006 — Move a business off its old platform

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-009, BASE-AGENT-011 · *Rules:* D-1

**Requirement.** Uses source exports, published pages, old URLs, form destinations and DNS records to propose import mappings, rebuild unsupported layouts, inspect every redirect and lead route on a preview and prepare cutover and rollback. The migration report exposes every loss; origin proof and controlled captures follow D-5. Domain cutover carries live and external, adding security for credential handling, and company policy decides it. The old site stays reachable until its owner closes it.

**Acceptance.**
1. Under the held company policy, migrate a test Squarespace site, read its mapping and rebuilt pages, inspect every old redirect and form route, then complete the cutover decision and roll back once.

#### AGENT-007 — Follow up unanswered enquiries by company policy

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-009, BASE-AGENT-011 · *Rules:* D-1

**Requirement.** Uses enquiries, published facts, sent replies and Dial availability to draft replies and deliver the owner's chosen holding wording after the response window. Full help-desk work stays in HappyToHelp. Outside replies carry external, and binding price or availability commitments add commitment; the company's policy decides each. Marketing remains with Mango rather than being inferred from an enquiry.

**Acceptance.**
1. With a held company policy that permits the chosen holding reply and holds full replies, leave a quote request past the response window; read the holding message sent to its real destination and the pending full reply, with the policy rule named.

#### AGENT-008 — Agent controls, budgets and recovery

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-009, BASE-AGENT-011 · *Rules:* D-1

**Requirement.** Pane's site-building agents expose their proposed revisions or queued jobs with reasons, evidence, costs and reversible site changes. The owner chooses agent permissions and a monthly USD model and provider budget in company policy. Each agent can be enabled or disabled, and its reversible site change can be undone in one action.

**Acceptance.**
1. Under a company policy with a $5 monthly budget for each of two enabled agents, exhaust one budget, read the stop notice and costs, then undo a permitted site change and read both activity outcomes.

## Field proof register

| ID | Proof | Clauses | State | Date | Receipt |
| --- | --- | --- | --- | --- | --- |
| R-1 | Live owner-account Cloudflare installation, migration, removal, browser provisioning and cost receipts | HEALTH-001, DEPLOY-001, HOST-004, HOST-005 | not run | | |
| R-2 | Human screen-reader pass on realistic Pane journeys | PAGE-009 | not run | | |
| R-3 | VPAT issued for the installation | PAGE-009 | not run | | |
| R-4 | Google Workspace and Microsoft 365 real-tenant mail outcomes | FORM-003 | not run | | |
| R-5 | Real registrar forwarding and mailbox continuity before and after DNS cutover | DOMAIN-005 | not run | | |
| R-6 | Okta, Entra ID and Google vendor-tenant interoperability receipts | ROLE-004 | not run | | |
| R-7 | 28-day Vane field data: p75 LCP ≤2.5 seconds, INP ≤200 milliseconds and CLS ≤0.1 | HOST-001 | not run | | |
| R-8 | Live incumbent source captures with origin authority and provider-specific fidelity receipts | IMPORT-001, IMPORT-002, IMPORT-003, IMPORT-004 | not run | | |
| R-9 | Apple App Store and Google Play approval/listings | MOBILE-002 | not run | | |
| R-10 | Real-model quality, processor handling and measured assistance cost | AI-002, AI-003, AI-005, AI-006 | not run | | |
| R-11 | Authorized live Unsplash app, Adobe Fonts project and external integration account receipts | MEDIA-001, STYLE-002 | not run | | |
| R-12 | Claude, ChatGPT, Codex and Copilot client receipts | SURFACE-001, SURFACE-002, SURFACE-003, SURFACE-004 | not run | | |

## Boundaries

- **Card processing, money movement and a full store.** Pane hands checkout to Stall, Stripe Payment Links or PayPal (`LINK-002`) and never holds card details or funds. Sales tax, refunds and inventory live there.
- **Domain registration, certificate authority and the delivery network.** The owner registers domains in their own Cloudflare Registrar account or keeps their registrar; Cloudflare issues certificates and serves traffic in the owner's account (`DOMAIN-001` to `DOMAIN-004`). Pane operates them for the owner and never holds a registration.
- **Business email hosting.** Mailboxes stay with Google Workspace or Microsoft 365; Pane preserves their DNS records (`DOMAIN-003`), recreates registrar email forwarding in the owner's Cloudflare Email Routing (`DOMAIN-005`) and sends form mail through the installation relay or the owner's account.
- **Rebuilding neighboring products.** CRM, booking, store, memberships billing, email marketing, help desk, surveys, chat, uptime monitoring and observability stay with the sibling or incumbent named in [Neighboring products stay separate](#neighboring-products-stay-separate), each with its connection status visible.
- **WordPress plugins and lossless import of every site.** Pane does not run WordPress plugins or themes. Imports bring content, media and URLs with every exception listed (`IMPORT-005`); a site that depends on a specialist plugin keeps that service through an embed, a connection or WordPress hosting.
- **Rankings, legal compliance and invented claims.** Pane provides search controls and agents that report evidence, not guaranteed rankings. Policy starters and accessibility checks support, but do not replace, the owner's own legal review. Pane never publishes invented reviews, credentials, staff or prices.
- **US first.** Defaults are US English, US time zones, USD and US formats (`LOCALE-001`); other locales and currencies are settings, and translated native pages follow AI-006; an agent publication takes company policy for external and live. No HIPAA business associate agreement is offered; a clinic keeps patient intake in its practice system (for example Balm) and links to it.

## Homepage claims

| # | Claim | Clauses |
| --- | --- | --- |
| 1 | Your website, finally yours. A free open-source alternative to Squarespace, Wix and WordPress.com. | DEPLOY-001, EXPORT-001 |
| 2 | Build visually, move old links and email, and check every inquiry reaches a person. | PAGE-002, IMPORT-005, DOMAIN-003, DOMAIN-005, AGENT-003 |
| 3 | Squarespace import: 46 pages and 212 old links kept. | IMPORT-002, IMPORT-005, SEO-002 |
| 4 | Bounced notice recovered, flagged to the owner and replied. | FORM-003, FORM-006, AGENT-003, AGENT-007 |
| 5 | Page 87 published; Wix move-in keeps business email. | PAGE-001, PUBLISH-003, IMPORT-003, DOMAIN-003 |
| 6 | A studio booking connects to the existing class schedule. | LINK-001, STATS-002 |
| 7 | Five trades run their own sites. | STYLE-001, DEPLOY-001 |
| 8 | Twelve interview answers produce a complete eight-page studio draft with verified Google and Strap facts. | AGENT-001, AI-001 |
| 9 | Every fact is sourced and confirmed; placeholder photos are marked and replaceable. | AGENT-001, AI-001, MEDIA-001 |
| 10 | Build a services page from hero, columns, gallery, booking, form and FAQ blocks. | PAGE-002, PAGE-012, PAGE-014, LINK-001, FORM-001 |
| 11 | Arrange a separate phone layout, review from a phone and publish English and Spanish. | PAGE-005, PAGE-007, ROLE-002, SEO-010, MOBILE-001 |
| 12 | Migration keeps pages, posts, comment state/threading, events, galleries, media and form fields/recipients. | IMPORT-002, IMPORT-005, CMS-010, CMS-009 |
| 13 | Past submissions are imported without resending; subscribers move with suppression. | IMPORT-007 |
| 14 | Shop products hand off to Stall; existing Acuity scheduling is kept. | IMPORT-002, LINK-001, LINK-002 |
| 15 | Every old URL is tested on preview and every unsupported item is listed before apply. | IMPORT-005, IMPORT-006 |
| 16 | Apply as a private draft and test lead routes before checked cutover. | MOVEIN-001, IMPORT-006, AGENT-003 |
| 17 | Google Workspace DNS remains unchanged; Squarespace aliases and catch-all are recreated and proven. | DOMAIN-003, DOMAIN-005 |
| 18 | Apex and www launch with HTTPS; bookings count by source. | DOMAIN-001, DOMAIN-002, LINK-001, STATS-002 |
| 19 | Stored inquiry, notification, HubSpot and booking route reach a person despite a bounced notice. | FORM-003, FORM-005, FORM-006, AGENT-003 |
| 20 | Find unseen old Wix links from 404s and Search Console history and prepare redirects. | AGENT-004, SEO-002, SEO-007 |
| 21 | Monthly owner reports show visits, search clicks, inquiries, bookings by source and unanswered work. | STATS-004 |
| 22 | Every published version remains; restore one page without losing other edits. | PUBLISH-001, PAGE-015 |
| 23 | Leave with WXR, CSV, original-media ZIP and static HTML; close the old site on your chosen day. | EXPORT-001, IMPORT-006 |
| 24 | Run it on your own computer and Cloudflare account. | DEPLOY-001, HOST-005 |
| 25 | Pane updates verify the release signature and site health, with no plugins to maintain. | HOST-003 |
| 26 | The launched site's sitemap is sent to Google Search Console and Bing. | SEO-007 |
| 27 | Correct the Google profile's opening hours and keep site holiday hours and banners current from confirmed business facts. | SEO-008, AGENT-002 |

## Status

Judged from the code and tests at commit `3b35726211c3a5ac20eeba8b0f8b82b37d2995d4` (27 October 2026).

| Clauses | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Published | 11 | 5 | 0 | 16 |
| Target and push further | 32 | 40 | 48 | 120 |
| All | 43 | 45 | 48 | 136 |

| Clause | Title | Kind | Status | Evidence | Gap |
| --- | --- | --- | --- | --- | --- |
| `ACCESS-001` | Server-side role authorization | published | done | `tests/pane.test.mjs` — “native owner sign-in and role sessions protect direct handlers”; `tests/pane.test.mjs` — “deactivated credentials lose access to direct product commands” |  |
| `ACCESS-002` | Canonical-origin mutations | published | done | `tests/pane.test.mjs` — “ACCESS-002: mutations require the canonical origin; accepted contact is durable and visits respect privacy” |  |
| `PUBLISH-001` | Immutable complete revisions | published | done | `tests/pane.test.mjs` — “later change and rollback restore the exact immutable site with recorded decisions” |  |
| `PUBLISH-002` | Private draft preview | published | partial | `tests/pane.test.mjs` — “private selected previews refuse visitors and members and keep ordinary and typed contact sending inert” (native owner and admin access, signed-out and member refusal, both contact forms, inert POST, zero enquiry and notification effects, immutable selected snapshot and hash, unchanged live pages, revoked-session refusal and positive live submissions); `scripts/browser-journey.mjs` — “privatePreviewJourney” (native role sessions, selected ordinary and typed pages, draft banner, pointer and keyboard refusal, zero sends, later-draft isolation, native revision-bound navigation, axe, tooltips and no overflow; assertions at 1440 and screens at 1440 and 390). | Missing journey: a private preview opened as admin with contact sending disabled. The cited native preview journey checks banner and role refusals but does not try or inspect disabled sending. |
| `PUBLISH-003` | Owner-approved atomic publication | published | done | `tests/pane.test.mjs` — “PRESENT-001: five pages preview with a draft banner and publish without product branding”; `tests/pane.test.mjs` — “native owner sign-in and role sessions protect direct handlers” |  |
| `PUBLISH-004` | One-action rollback | published | done | `tests/pane.test.mjs` — “later change and rollback restore the exact immutable site with recorded decisions” |  |
| `INBOX-001` | Durable, escaped and idempotent contact submissions | published | done | `tests/pane.test.mjs` — “ACCESS-002: mutations require the canonical origin; accepted contact is durable and visits respect privacy”; `tests/pane.test.mjs` — “owner erasure removes personal data and prevents submission replay” |  |
| `VISIT-001` | Cookie-free aggregate visit counts | published | done | `scripts/traffic-journey.mjs` — “aggregatePrivacyJourney”: nonempty exact public increments, private preview and repeated DNT and GPC exclusion, all application tables and public browser storage inspected with distinct client-address, agent and URL sentinels at 1440 and 390; `tests/pane.test.mjs` — “traffic groups real public visit events without retaining raw referrers or unapproved identifiers and excludes privacy opt-outs” |  |
| `MOVEIN-001` | Reviewed static-site move-in with guarded undo | published | partial | `src/pane/imports.ts`; `tests/pane.test.mjs`; `docs/MOVE-IN.md` | Missing journey: undo after publication and after an intervening draft edit, each refused with unchanged state. The cited move-in journey checks fingerprints, inert apply, member refusal and successful unpublished undo. |
| `BACKUP-001` | Export and restore into an empty installation | published | partial | `scripts/pane-policy.mjs`; `tests/pane.test.mjs`; `docs/BACKUP-RESTORE.md` | Missing journey: archive round trip opened through the documented archive door with complete immutable history reconciliation and occupied-destination refusal. The cited restore journey reads live site and import-job count using the portability helper. |
| `ERASE-001` | Message erasure fenced against old backups | published | done | `tests/pane.test.mjs` — “owner erasure removes personal data and prevents submission replay”; `tests/pane.test.mjs` — “archive transport restores data into empty D1 and rejects an erased older backup” |  |
| `HEALTH-001` | Deployment health and unknown paths | published | done | `tests/search.test.mjs` — “health identifies the local deployment and unknown installed paths return 404” |  |
| `DEPLOY-001` | Install on the owner's Cloudflare account | published | partial | `scripts/deployment-journey.mjs` — “deployment identity, migrations and removal”: owner-account identity checked against the deployment receipt; applied migration names and SHA-256 values read from hosted D1; local and hosted “/health” deployment identity compared with that receipt; guarded removal and missing local record asserted. Runner: “rer deploy --environment test-pane --non-interactive”, then “node scripts/deployment-journey.mjs test-pane” (RunEditRun live sandbox receipt 2026-10-21, source dfc3ce80c9d4806c8c0e13363d786dee4e12cbb9, 16 migrations). `tests/search.test.mjs` — “health identifies the local deployment and unknown installed paths return 404”, loaded by “pnpm test” through “pnpm verify” in Verify's product journey job. `scripts/health-browser-journey.mjs` — “Health and unknown installed path browser journey”, run with “node scripts/health-browser-journey.mjs” at 1440 and 390. Provider acceptance is the live sandbox receipt, never the local fixture | Missing journey: provider-compatible deployment, migration and removal on this candidate. The cited deployment journey requires a live account receipt and is not part of candidate Verify; a dated earlier sandbox run is not exact-candidate proof. |
| `RUNSITE-001` | Public run site and documentation | published | partial | `tests/site.test.mjs`; `docs/site.json` | Missing journey: built homepage/run/docs navigation with an explicit check that installation sign-in links are absent. The cited site journey opens all linked guides and unknown-path refusal but never inspects that absence. |
| `LOBBY-001` | Shared Lobby, workspace and theme | published | done | `scripts/browser-journey.mjs` — “Shared Lobby and workspace theme” |  |
| `PRESENT-001` | Labeled previews and unbranded live pages | published | done | `tests/pane.test.mjs` — “PRESENT-001: five pages preview with a draft banner and publish without product branding”; `scripts/browser-journey.mjs` — “five-page prepare/preview/publish” |  |
| `PAGE-001` | Unlimited pages, folders and clean URLs | target | done | `scripts/pages-journey.mjs` — “Forty-page editor journey”; `tests/pane.test.mjs` — “page organization keeps stable identities, complete revisions, safe edits and chosen public home and not-found content”; `tests/search.test.mjs` — “published URL changes offer explicit redirects and each revision owns its exact status and target map” |  |
| `PAGE-002` | Visual section and block editor with layout controls | target | partial | `tests/pane.test.mjs` — “section drafts preserve validated layout and reading text through publication, conflict and rollback” (validated immutable geometry, semantic heading, shared CSS, search, conflict, publication and rollback); `scripts/components-code-journey.mjs` — “Reusable components and isolated custom code journey” (native canvas text, column placement, ratio, hex background and padding, reset, section drag and keyboard reorder, duplication and deletion, reopen, undo and redo, retained conflict copy and latest selection, native geometry and pixel parity, reversible raster image ratios and focal points, keyboard crop selection and retained original pixels at 1440 and 390) | A focused visual canvas extends the approved Pages editor without replacing its composition. Editors add, duplicate, delete and reorder text sections and text blocks, edit text in place, set twelve-column placement, row and overlap order, horizontal and vertical alignment, column ratios and gaps, hex backgrounds, minimum height and padding, and reset local layout overrides to the existing theme defaults. The canvas and live page import one section renderer. Immutable revisions retain stable identities and reading text; the existing autosave, undo, redo, retained conflict copy and explicit latest-version selection apply. Native text canvas and live block boxes match within two CSS pixels at 1440 and 390; the chrome-masked native content screenshots differ by no more than 0.5%. Native raster image blocks now support original, square, 4:3, 3:2, 16:9 and free aspect ratios, bounded focal points and reset without changing the retained pixels. Gap: media-library integration, image backgrounds and overlays, background video with loading, reduced-motion and data-saver stills need MEDIA-001 and MEDIA-003 or MEDIA-004. The native canvas now retains structured inline formats, nested lists, large and small paragraphs and justified text through the shared renderer. The full PAGE-014 catalog and destinations, all section presets, touch-gesture drag proof, STYLE-002 owner-configured site defaults and full media-page geometry and screenshot parity remain unproved. PAGE-002 stays partial. |
| `PAGE-003` | Navigation menus, header and footer | target | done | `scripts/navigation-journey.mjs` — “Navigation editor and published menus” |  |
| `PAGE-004` | Reusable sections and global components | target | done | `scripts/components-code-journey.mjs` — “Reusable components and isolated custom code journey”; `tests/pane.test.mjs` — “reusable section references propagate across five immutable pages and detached copies remain independent” |  |
| `PAGE-005` | Device previews and a separate mobile layout | target | done | `scripts/device-journey.mjs` — “Device canvas journey” |  |
| `PAGE-006` | Autosave, undo and safe concurrent editing | target | done | `scripts/editing-journey.mjs` — “PAGE-006 browser journey” |  |
| `PAGE-007` | Page status and review requests | target | partial | `tests/pane.test.mjs` — “page review binds the exact content and selective owner approval keeps other drafts and records an immutable revision” (two edited pages, review request, owner approval, unrelated draft retention, immutable history and stale and concurrent refusals); `scripts/pages-journey.mjs` — “Forty-page editor journey” (review, selected publication, retained other draft and revision history at 1440 and 390). | scheduled page publication, post states and review, delegated publishing and notification approval through ROLE-002 remain unimplemented. URL and shared organization changes still use explicit whole-site approval with reviewed redirects. |
| `PAGE-008` | Custom code, embeds and CSS | target | done | `scripts/components-code-journey.mjs` — “Reusable components and isolated custom code journey” |  |
| `PAGE-009` | Accessible output by default | target | partial | `scripts/accessibility-journey.mjs` — “Accessible output journey” (all seven current starter layouts and populated native canvas output, axe with zero serious or critical violations and keyboard passes at 1440 and 390; skip links, menu and FAQ disclosures, labeled contact fields, keyboard submission and visible focus; real raster upload, missing-alt publication warning, descriptive and decorative images, heading and contrast owner warnings, tooltips); `tests/pane.test.mjs` — “image drafts preserve explicit descriptions and publication refuses missing alt while warning about headings and contrast” (missing-alt refusal in both live stores and selected page approval, explicit decorative choice, descriptive alt, imported missing-alt preservation, invalid raster and metadata refusal); `scripts/device-journey.mjs` — “Device canvas journey” (responsive DOM reading order follows the arranged phone grid) | Missing journey: every target template and populated page with the shared accessibility-tree bar as well as the publication warnings. The cited accessibility journey exercises seven current starters, axe, keyboard and image warnings; the 40-template target and all required accessible states/live regions remain unproved. |
| `PAGE-010` | Duplicate pages and starter layouts | target | done | `scripts/pages-journey.mjs` — “Forty-page editor journey” |  |
| `PAGE-011` | Password-protected and member-only pages and site | target | done | `scripts/gates-journey.mjs` — “Gate browser journey”; `tests/pane.test.mjs` — “page and folder gates require passwords or explicitly admitted active native members without leaking through discovery”; `tests/pane.test.mjs` — “coming-soon and site password gates cover every live URL while previews and disabling restore the published site” |  |
| `PAGE-012` | Gallery blocks with grid, slideshow and lightbox | target | done | `scripts/components-code-journey.mjs` — “Gallery, brand and content checks”; `tests/pane.test.mjs` — “gallery publications resolve immutable library images and enforce the page gate and revocation for every rendition” |  |
| `PAGE-013` | Promotional pop-up and announcement bar | target | partial | `scripts/scheduling-journey.mjs` — “Business-local scheduling journey” (scheduled announcement bar appears and expires on time at 1440/390); `tests/pane.test.mjs` — “published promotions target selected pages while invalid settings and unauthorized changes stay fenced” (published targeting, draft and preview isolation, schedule validation and mutation refusals); `scripts/promotions-journey.mjs` — “Promotional popup journey” (owner settings and undo, ten-second delay on selected pages, scroll and desktop exit triggers, seven-day browser cap and repeat eligibility, focus containment, Escape and visible close, scheduled start and expiry, safe phone arrival and icon tooltips at 1440 and 390; exact-candidate timing receipt in the campaign report) | Offers and announcements have browser journeys; the disclosed newsletter signup, authorized Mango or Mailchimp audience, verification, outcome and suppression journey remains missing under LINK-003. RL-102 resolves the policy question without completing that integration. |
| `PAGE-014` | Block catalog, text formatting and links | target | partial | `tests/pane.test.mjs` — “rich section text keeps semantic formatting and nested lists through immutable publication and rollback” (semantic inline formats, nested lists, matching search text, publication, rollback and invalid-tree refusals); `scripts/components-code-journey.mjs` — “Reusable components and isolated custom code journey” (all paragraph styles, pointer and keyboard inline format controls, independent paragraph and list-item alignments, nested list authoring and inert styled paste, autosave and reopen, rich canvas and live geometry and pixel parity at 1440 and 390) | The shared native canvas retains structured text with Heading 1 to Heading 4, paragraph, large and small paragraph, quote and preformatted styles, bold, italic, underline and strikethrough, bulleted and numbered lists with one nested level, and four block alignments including justified text. Paragraphs and list items inside a mixed document also retain independent left, center, right or justified alignment. Semantic trees are validated at the immutable revision boundary and use the same canvas and live renderer; search reads their matching text. Literal Word and Google Docs text formatting and list markup can be pasted without executing scripts, loading media or retaining arbitrary attributes. Safe HTML paste now keeps supported links, headings, formatting and lists without loading remote media. CMS-004 proves captioned images, an attributed quote, a consented YouTube embed, a page button and stable post and PDF and telephone links in the native post body. Gap: the remaining block catalog, every remaining link and button destination, cross-page anchors, Markdown, complete Word and Google Docs paste fidelity and the full catalog keyboard and axe journey remain unproved. |
| `PAGE-018` | Rich text styles and pasted content | target | partial | `tests/pane.test.mjs` — “rich section text keeps semantic formatting and nested lists through immutable publication and rollback” (semantic inline formats, nested lists, matching search text, publication, rollback and invalid-tree refusals); `scripts/components-code-journey.mjs` — “Reusable components and isolated custom code journey” (all paragraph styles, pointer and keyboard inline format controls, independent paragraph and list-item alignments, nested list authoring and inert styled paste, autosave and reopen, rich canvas and live geometry and pixel parity at 1440 and 390) | The shared native canvas retains structured text with Heading 1 to Heading 4, paragraph, large and small paragraph, quote and preformatted styles, bold, italic, underline and strikethrough, bulleted and numbered lists with one nested level, and four block alignments including justified text. Paragraphs and list items inside a mixed document also retain independent left, center, right or justified alignment. Semantic trees are validated at the immutable revision boundary and use the same canvas and live renderer; search reads their matching text. Literal Word and Google Docs text formatting and list markup can be pasted without executing scripts, loading media or retaining arbitrary attributes. Safe HTML paste now keeps supported links, headings, formatting and lists without loading remote media. CMS-004 proves captioned images, an attributed quote, a consented YouTube embed, a page button and stable post and PDF and telephone links in the native post body. Gap: the remaining block catalog, every remaining link and button destination, cross-page anchors, Markdown, complete Word and Google Docs paste fidelity and the full catalog keyboard and axe journey remain unproved. |
| `PAGE-019` | Links and buttons that follow their destinations | target | partial | `tests/pane.test.mjs` — “rich section text keeps semantic formatting and nested lists through immutable publication and rollback” (semantic inline formats, nested lists, matching search text, publication, rollback and invalid-tree refusals); `scripts/components-code-journey.mjs` — “Reusable components and isolated custom code journey” (all paragraph styles, pointer and keyboard inline format controls, independent paragraph and list-item alignments, nested list authoring and inert styled paste, autosave and reopen, rich canvas and live geometry and pixel parity at 1440 and 390) | The shared native canvas retains structured text with Heading 1 to Heading 4, paragraph, large and small paragraph, quote and preformatted styles, bold, italic, underline and strikethrough, bulleted and numbered lists with one nested level, and four block alignments including justified text. Paragraphs and list items inside a mixed document also retain independent left, center, right or justified alignment. Semantic trees are validated at the immutable revision boundary and use the same canvas and live renderer; search reads their matching text. Literal Word and Google Docs text formatting and list markup can be pasted without executing scripts, loading media or retaining arbitrary attributes. Safe HTML paste now keeps supported links, headings, formatting and lists without loading remote media. CMS-004 proves captioned images, an attributed quote, a consented YouTube embed, a page button and stable post and PDF and telephone links in the native post body. Gap: the remaining block catalog, every remaining link and button destination, cross-page anchors, Markdown, complete Word and Google Docs paste fidelity and the full catalog keyboard and axe journey remain unproved. |
| `PAGE-015` | Trash and single page or post restore | target | partial | `src/pane/content.ts`; `tests/pane.test.mjs` | Native page, post and collection-item trash and selective history are implemented. Exact-candidate lifecycle clock proof and fresh completion judgment remain required. |
| `PAGE-016` | Paid membership access connection | target | missing | — | No paid-access connection to Stall or Nectar exists. PAGE-011 proves explicit native admission only; LINK-002 must supply the provider connection and every-request entitlement proof. Billing is never rebuilt in Pane. |
| `PAGE-017` | Third-party tag and pixel marketplace with per-tag consent categories | target | done | `scripts/privacy-journey.mjs` — “Privacy browser journey” |  |
| `STYLE-001` | Responsive templates for US local businesses | target | partial | `public/pane.css`; `src/pane/public-view.ts` | One fixed responsive layout; no template catalog. Every future template must provide the native CMS-001 starter collection pack. |
| `STYLE-002` | Site-wide brand styles | target | partial | `tests/pane.test.mjs` — “owner style drafts retain self-hosted fonts through preview, conflict, publication and rollback”; `scripts/browser-journey.mjs` — “siteStylesJourney”, implemented in `scripts/styles-journey.mjs` (native settings, built-in face loading, real WOFF2 and WOFF and TTF and OTF decoding, separate fonts, same-origin WOFF2, inherited and local section backgrounds, three-page preview and publication, canvas font loading, shared draft status, rollback, autosave, undo and redo, retained conflict copy, axe and no overflow at 1440 and 390). The route proof includes native owner and scoped credential refusal, exact font bytes, immutable snapshots, transactional activity and portable archive restoration. The same journeys cover owner-authorized Adobe configuration, uploaded and Adobe font pairing through a synthetic Adobe network edge, private three-page previews, publication, disconnect, undo and redo and rollback at both widths; no live Adobe receipt is claimed. | Authorized Adobe Fonts test web project ID or grant and the real uploaded and Adobe heading and body live-render receipt remain held. Native configuration and paired rendering are covered with a fake only at the Adobe network edge. Conservative default under the standing scope policy: native owner only, explicit Adobe authorization, separate publication approval; provider boundaries and scoped delegation remain held. |
| `STYLE-003` | Switch templates without rebuilding content | target | missing |  | No templates to switch between. |
| `STYLE-004` | Logo, favicon and brand kit | target | done | `scripts/components-code-journey.mjs` — “Gallery, brand and content checks” |  |
| `MEDIA-001` | Media library with alt text and usage | target | partial | `tests/pane.test.mjs` — "native media library uploads, organizes and reuses private assets while refusing used deletion and stale edits" and "gallery publications resolve immutable library images and enforce the page gate and revocation for every rendition"; `scripts/media-library-journey.mjs` — "mediaLibraryJourney", invoked by `scripts/components-code-journey.mjs`: native 50-image and three-PDF upload, search and type and folder filters, metadata and alternative text, three-page reuse and exact usage refusal, missing-alt publication refusal, private originals and immutable approval, reopen and conflict resolution, automatic metadata saves, five-step undo and redo, protected PDF delivery, keyboard and axe at 1440 and 390 | Official Unsplash search and import, photographer attribution and download-event proof require an owner-authorized Unsplash developer app and key not held. Live provider-storage qualification remains held with the shared Cloudflare family; MP4 and MOV transcoding and poster frames and other-file support remain unimplemented. Native owner-only image and PDF library uses existing whole-draft storage bounds. PAGE-002 and collection holds remain unchanged. |
| `MEDIA-002` | Responsive image optimization | target | done | `scripts/components-code-journey.mjs` — “Native canvas and reversible image journey”; `tests/pane.test.mjs` — “image drafts preserve explicit descriptions and publication refuses missing alt while warning about headings and contrast” |  |
| `MEDIA-003` | Basic image editing | target | done | `scripts/components-code-journey.mjs` — “Native canvas and reversible image journey”; `tests/pane.test.mjs` — “image drafts preserve explicit descriptions and publication refuses missing alt while warning about headings and contrast” |  |
| `MEDIA-004` | Video, map, social embeds and Instagram feed | target | partial | `scripts/privacy-journey.mjs` — owner-added YouTube URL embed waits for consent, keeps only its host in CSP and is suppressed under GPC | YouTube URL embed isolation is proved at both widths. Uploaded video, captions/renditions, actual playback, other named provider embeds and the official Instagram feed/refresh/revocation remain unproved. |
| `CMS-001` | Structured collections with typed fields | target | done | `scripts/collections-journey.mjs` — “Collections browser journey”; `tests/posts.test.mjs` — “typed service collections validate thirty items and publish rich descriptions with selective item restoration” |  |
| `CMS-002` | Collection template pages with item URLs | target | done | `scripts/collection-template-journey.mjs` — “Collection template browser journey”; `tests/posts.test.mjs` — “designed collection templates publish every item with exact metadata and prepared social images” |  |
| `CMS-003` | Collection lists and filters on any page | target | missing |  | Collection-list authoring, filtering and date-relative evaluation remain unimplemented. |
| `CMS-004` | Blog with categories, tags and authors | target | done | `scripts/posts-journey.mjs` — “Posts browser journey”; `tests/posts.test.mjs` — “authors submit two isolated blogs for exact owner approval and public semantic delivery” |  |
| `CMS-005` | Scheduled publishing and expiry | target | done | `tests/posts.test.mjs` — “reviewed posts, pages and items publish at Chicago nine with immutable approval, complete execution history and overdue unapproved refusal”; `scripts/scheduling-journey.mjs` — “Business-local scheduling journey” |  |
| `CMS-006` | RSS and podcast feeds and new-post notifications | target | partial | `tests/posts.test.mjs` — “authors submit two isolated blogs for exact owner approval and public semantic delivery” (six posts in two blogs, native author isolation, signed-out and foreign-origin refusal, native owner-only current-review approval, stale review and revision refusal, exact approving owner and transactional activity, immutable sources and unrelated live content, exact filtered post sets, isolated RSS, semantic body and stable destinations, approved PDF bytes and private-file refusal, click-only share URLs); `scripts/posts-journey.mjs` — “Posts browser journey” (native blog settings autosave with stale-save value retention and private PDF upload, author composition, both blog indices and isolated feeds, category and tag and author and month archive pages, excerpts and responsive featured images, pagination, full body composition and live semantic DOM, keyboard reading order and axe, two captioned raster images, attributed quote, consented YouTube, page button and post and PDF and telephone links, post rename without a redirect hop, semantic absolute-URL RSS, all five share actions with zero third-party requests before a click, five durable undo and redo steps, reopen and stale-tab retention, account and editor tooltips, native post-screen axe, 1440 and 390). The canvas shard in `scripts/browser-proof.mjs` always loads this journey. | Native blog RSS serves only the current approved posts of its own blog and carries the same semantic body with absolute destinations. Gap: W3C validator and Apple Podcasts validation, two audio episodes, collection feeds, Mango and Mailchimp consented campaign delivery and visible delivery state remain unproved. |
| `CMS-007` | Collection CSV import and export | target | missing |  | Only the static-site JSON move-in exists (`MOVEIN-001`). |
| `CMS-008` | Site search | target | partial | `src/pane/site-search.ts`; `src/pane/public.ts`; `src/pane/public-view.ts`; `tests/search.test.mjs`; `scripts/search-journey.mjs` | Visitors search current published pages with Unicode-normalized matching and result links. Drafts stay private and publishing or restoring a version updates results together. Posts, collection items and protected-page filtering still await CMS-001, CMS-002, CMS-004 and PAGE-011. |
| `CMS-009` | Events calendar with list and month views | target | missing |  | No events or calendar. PAGE-015 requires this future content door to retain deletion actor and time, at least 30-day trash availability, immutable source, original URL and menu place, draft-only single-item restoration and history without changing unrelated content, separate permission-checked publication that removes only its deletion redirect, and exact restore actor and time in activity. |
| `CMS-010` | Blog comments and moderation | target | partial | `tests/posts.test.mjs` — “native comment moderation protects notifications, threaded replies, closure and person erasure” (approval by default, honeypot refusal, six-link and blocked-word spam, native role and notification boundaries, notification-linked approval, author and authorized moderator replies, one-level public threads, per-post and timed closure, cookie-free counts, daily digest, metadata-only audit, person export, guarded erasure with both cross-store replay fences and old-archive refusal; matching private review links in plain-text and HTML immediate mail and daily digests); `scripts/comments-journey.mjs` — “Comments browser journey” (native comment settings autosave and durable reopen, selection-only bulk actions, visitor form, moderator notification review, author reply, approved thread, closed form, person export and erasure, axe and tooltips, screens at 1440 and 390). `tests/posts.test.mjs` — “owner WXR comment transfers preserve private reviewed metadata, explicit release and erasure fences” (exact imported names, addresses, bodies, UTC dates, states and parent identities; private staging; owner release; WXR parsing; native sign-in and role refusals; no outbound action; person export and erasure; replay refusal and attributed metadata audit). `scripts/comments-journey.mjs` — “Comments browser journey” also covers the native portability settings, import review, private queue, explicit release and WXR download at 1440 and 390. | Native push notification proof requires MOBILE-002 device and signing authority. Live Turnstile acceptance is not proved by the existing provider fixture. The owner-only WXR comment carrier preserves imported author, UTC date, approval state and one-level threading when explicitly mapped to an existing native post, with private staging, explicit owner release and fresh native sign-in for private export. Whole-site WXR and Squarespace import journeys and automatic native post mapping remain with IMPORT-001 and IMPORT-002; the remaining open-format export stays with EXPORT-001. |
| `CMS-011` | Post and collection item bodies in the block editor | target | partial | `tests/posts.test.mjs` — “authors submit two isolated blogs for exact owner approval and public semantic delivery” (six posts in two blogs, native author isolation, signed-out and foreign-origin refusal, native owner-only current-review approval, stale review and revision refusal, exact approving owner and transactional activity, immutable sources and unrelated live content, exact filtered post sets, isolated RSS, semantic body and stable destinations, approved PDF bytes and private-file refusal, click-only share URLs); `scripts/posts-journey.mjs` — “Posts browser journey” (native blog settings autosave with stale-save value retention and private PDF upload, author composition, both blog indices and isolated feeds, category and tag and author and month archive pages, excerpts and responsive featured images, pagination, full body composition and live semantic DOM, keyboard reading order and axe, two captioned raster images, attributed quote, consented YouTube, page button and post and PDF and telephone links, post rename without a redirect hop, semantic absolute-URL RSS, all five share actions with zero third-party requests before a click, five durable undo and redo steps, reopen and stale-tab retention, account and editor tooltips, native post-screen axe, 1440 and 390). The canvas shard in `scripts/browser-proof.mjs` always loads this journey.  `tests/posts.test.mjs` — “typed service collections validate thirty items and publish rich descriptions with selective item restoration” (ten typed fields, thirty retained items, native editor writes with private-post exclusion, required and wrong-type and reference and calendar refusal without mutation, starter collections, semantic heading and nested list and bold and inline raster and stable page and PDF and telephone destinations, USD value and team reference, native admin and editor publication refusal, exact selected native-owner publication, original URL and menu placement, unchanged unrelated live and draft work and immutable source hashes, metadata-only restore actor and server time, zero outbound action, 31-day exclusion and guessed expired restore refusal); `scripts/collections-journey.mjs` — “Collections browser journey” (native ten-field schema creation, thirty items, typed item editing, the shared visual rich description editor, five durable undo and redo steps, two-tab conflict comparison and retained copy, exact owner approval and public live link, semantic public DOM, keyboard reading order and focus, axe, tooltip hover and keyboard focus, schema and details and rich body and published item and history and trash and expired end states at 1440 and 390). The canvas shard in `scripts/browser-proof.mjs` always runs the journey. Its exact-candidate outside-Verify clock run is identified in the lane handoff. | The native post limb is proved by the CMS-004 route test and native browser journey: the complete acceptance post body, semantic live DOM, keyboard reading order, axe, linked-post rename without a redirect hop and absolute-URL semantic RSS. Gap: the remaining PAGE-014 catalog, destinations and Markdown, search indexing under CMS-008 and open post export under EXPORT-001 remain unproved. Future collection and event editors inherit the same shared semantic body, safe references, image-description and rendition custody, autosave, five-step undo and redo, conflict retention and transactional activity obligations before shipping. |
| `CMS-012` | Structured bodies in feeds, search and exports | target | partial | `tests/posts.test.mjs` — “authors submit two isolated blogs for exact owner approval and public semantic delivery” (six posts in two blogs, native author isolation, signed-out and foreign-origin refusal, native owner-only current-review approval, stale review and revision refusal, exact approving owner and transactional activity, immutable sources and unrelated live content, exact filtered post sets, isolated RSS, semantic body and stable destinations, approved PDF bytes and private-file refusal, click-only share URLs); `scripts/posts-journey.mjs` — “Posts browser journey” (native blog settings autosave with stale-save value retention and private PDF upload, author composition, both blog indices and isolated feeds, category and tag and author and month archive pages, excerpts and responsive featured images, pagination, full body composition and live semantic DOM, keyboard reading order and axe, two captioned raster images, attributed quote, consented YouTube, page button and post and PDF and telephone links, post rename without a redirect hop, semantic absolute-URL RSS, all five share actions with zero third-party requests before a click, five durable undo and redo steps, reopen and stale-tab retention, account and editor tooltips, native post-screen axe, 1440 and 390). The canvas shard in `scripts/browser-proof.mjs` always loads this journey.  `tests/posts.test.mjs` — “typed service collections validate thirty items and publish rich descriptions with selective item restoration” (ten typed fields, thirty retained items, native editor writes with private-post exclusion, required and wrong-type and reference and calendar refusal without mutation, starter collections, semantic heading and nested list and bold and inline raster and stable page and PDF and telephone destinations, USD value and team reference, native admin and editor publication refusal, exact selected native-owner publication, original URL and menu placement, unchanged unrelated live and draft work and immutable source hashes, metadata-only restore actor and server time, zero outbound action, 31-day exclusion and guessed expired restore refusal); `scripts/collections-journey.mjs` — “Collections browser journey” (native ten-field schema creation, thirty items, typed item editing, the shared visual rich description editor, five durable undo and redo steps, two-tab conflict comparison and retained copy, exact owner approval and public live link, semantic public DOM, keyboard reading order and focus, axe, tooltip hover and keyboard focus, schema and details and rich body and published item and history and trash and expired end states at 1440 and 390). The canvas shard in `scripts/browser-proof.mjs` always runs the journey. Its exact-candidate outside-Verify clock run is identified in the lane handoff. | The native post limb is proved by the CMS-004 route test and native browser journey: the complete acceptance post body, semantic live DOM, keyboard reading order, axe, linked-post rename without a redirect hop and absolute-URL semantic RSS. Gap: the remaining PAGE-014 catalog, destinations and Markdown, search indexing under CMS-008 and open post export under EXPORT-001 remain unproved. Future collection and event editors inherit the same shared semantic body, safe references, image-description and rendition custody, autosave, five-step undo and redo, conflict retention and transactional activity obligations before shipping. |
| `DOMAIN-001` | Connect a custom domain with apex and www | target | missing |  | The business site uses the installation's existing address; no custom-domain connection or alias domains. |
| `DOMAIN-002` | Managed HTTPS and certificate status | target | missing |  | No domain or certificate handling beyond the Worker's default hostname. |
| `DOMAIN-003` | DNS status that preserves business email | target | missing |  | No DNS reading or writing. |
| `DOMAIN-004` | Domain registration and transfer guidance | target | missing |  | No domain guidance. |
| `DOMAIN-005` | Registrar email forwarding carried over | target | missing |  | No DNS reading, forwarding detection or Email Routing setup. |
| `HOST-001` | The business site at the domain root, fast | target | partial | `src/pane/public.ts` | Live pages are delivered without an edge cache; the edge-delivery and performance-budget journeys remain missing. |
| `HOST-002` | The live site survives an admin outage | target | done | `scripts/outage-journey.mjs` — “Outage browser journey” |  |
| `HOST-003` | Updates without plugin maintenance | target | missing |  | No in-product update channel. |
| `HOST-004` | Transparent running cost in USD | target | missing |  | No usage or cost view. |
| `HOST-005` | Install from the browser with no terminal | target | missing |  | Installation runs through `rer deploy` or the `npx @runeditrun/rer` command line only; no browser install path. |
| `SEO-001` | Page titles and meta descriptions | target | partial | `src/pane/search.ts`; `src/pane/search-settings.ts`; `src/pane/search-view.ts`; `tests/search.test.mjs`; `scripts/search-journey.mjs` | Current pages have editable search titles and descriptions, defaults and a saved search preview. Posts and collection items still depend on CMS-001, CMS-002 and CMS-004. |
| `SEO-002` | Redirect manager and slug-change redirects | target | done | `scripts/redirects-journey.mjs` — “Redirect manager journey”; `tests/search.test.mjs` — “published URL changes offer explicit redirects and each revision owns its exact status and target map” |  |
| `SEO-003` | Automatic sitemap and robots.txt | target | partial | `src/pane/search.ts`; `src/pane/search-settings.ts`; `src/pane/search-view.ts`; `tests/search.test.mjs`; `scripts/search-journey.mjs` | Published revisions generate sitemap.xml with last-modified dates and noindex exclusions, and editable robots.txt; drafts never change either and rollback restores them. Hidden/protected pages and post/item URLs await PAGE-001, PAGE-011 and CMS-001 to CMS-004. |
| `SEO-004` | Canonical URLs and indexing controls | target | partial | `src/pane/search.ts`; `src/pane/search-settings.ts`; `src/pane/search-view.ts`; `tests/search.test.mjs`; `scripts/search-journey.mjs` | Current pages have canonical URLs, custom canonical overrides and noindex controls; draft previews and development-origin pages send noindex. Primary custom-domain routing and www/apex acceptance await DOMAIN-001. |
| `SEO-005` | Structured data for local businesses | target | missing |  | No structured data. |
| `SEO-006` | Social preview cards | target | missing |  | No social metadata. |
| `SEO-007` | Google Search Console and Bing Webmaster Tools | target | missing |  | No search console connection. |
| `SEO-008` | Google Business Profile consistency | target | missing |  | No Google Business Profile connection. |
| `SEO-009` | Per-page search checks | target | done | `scripts/search-journey.mjs` — “Search journey”; `scripts/components-code-journey.mjs` — “Gallery, brand and content checks” |  |
| `SEO-010` | Multilingual sites with per-language URLs | target | missing |  | No languages or translated pages. |
| `FORM-001` | Form builder with multiple forms | target | done | `scripts/forms-journey.mjs` — “Typed form browser journey”; `tests/pane.test.mjs` — “reusable typed forms preserve invalid answers, enforce every field type, accept a private five MB PDF and refuse unsafe files through public doors” |  |
| `FORM-002` | Spam protection | target | done | `tests/pane.test.mjs` — “form protection refuses and separately counts honeypot, per-form bursts and invalid provider proofs” |  |
| `FORM-003` | Enquiry email to named recipients and reply | target | partial | `src/pane/views.ts`; `src/pane/data.ts` | Enquiries appear in the workspace inbox only; no notification email or reply. |
| `FORM-004` | Automatic acknowledgment to the sender | target | done | `tests/pane.test.mjs` — “an approved form acknowledgment reaches the provider once with owner wording and durable independent status” |  |
| `FORM-005` | Lead routing to Orbit, HubSpot and signed webhooks | target | missing |  | Submissions are stored locally only. |
| `FORM-006` | Enquiry ownership, status and follow-up | target | done | `tests/pane.test.mjs` — “enquiries carry an owner, status and follow-up time; unanswered ones are reminded then escalated by business day and replied ones leave the queue” |  |
| `FORM-007` | Submission export and Google Sheets | target | partial | `tests/pane.test.mjs` — native submission CSV filters stable forms and inclusive UTC dates beyond the inbox limit without exposing erased or unauthorized records; composable Pane roles; private uploads join native archive restore and person export and erasure; durable typed intake; rejected PDFs remain absent until explicit rescue. `scripts/forms-journey.mjs` — native CSV downloads through Inquiries at 1440 and 390. | Google Sheet connection, append on submission, connector lifecycle and real provider proof remain unimplemented. Held: an owner-authorized Google user and Sheet, test-user access, OAuth scopes and callback registration on the real origin. Earlier flattened enquiries remain archive-only because their original form identity and structured values were not captured. |
| `FORM-008` | Consent capture for email and SMS | target | partial | `tests/pane.test.mjs` — marketing choices bind published wording to immutable enquiry receipts and travel through export, archives and erasure without subscription delivery; durable typed intake retains private upload chunks through workspace outage and drains once after recovery. `scripts/forms-journey.mjs` — native owner configuration, separate unchecked choices, keyboard and axe, inbox records and CSV at 1440 and 390. `scripts/custody-journey.mjs` — portable marketing records, person erasure and captured retry refusal at both widths. | Mango email-only propagation, Mailchimp subscription with marketing permission and member consent text, time and page while SMS consent remains absent, Orbit contact consent delivery and all real-provider proofs remain unimplemented. Held: authorized Mango and Orbit tenants and a Mailchimp test audience and key, none supplied for this run. |
| `LINK-001` | Booking through Dial, Calendly or Acuity | target | missing |  | No booking embeds; the previous contract excluded bookings. |
| `LINK-002` | Checkout through Stall, Stripe Payment Links or PayPal | target | missing |  | No checkout; the previous contract excluded payments. |
| `LINK-003` | Newsletter signup through Mango or Mailchimp | target | missing |  | No newsletter signup. |
| `LINK-004` | Zapier, Crank and outgoing webhooks | target | missing |  | No outgoing events. |
| `LINK-005` | Connection health panel | target | missing |  | No connections to show. |
| `API-001` | Agent command helper and API | target | partial | `tests/pane.test.mjs` — “the real helper uses an authorized admin private session file for status, prepare and import and refuses publication”; “scoped agent tokens intersect native authority and audit allowed, denied, expired and revoked calls without exposing credentials”; `scripts/pane.mjs`; `docs/AGENT.md` | Complete public-door proof of populated scoped collection reads through the helper remains required. AGENT-008 retains budgets and agent controls. |
| `STATS-001` | Traffic by page, source, device and campaign | target | done | `scripts/traffic-journey.mjs` — “Traffic browser journey”; `tests/pane.test.mjs` — “traffic groups real public visit events without retaining raw referrers or unapproved identifiers and excludes privacy opt-outs” |  |
| `STATS-002` | Conversion goals and click insights | target | done | `scripts/traffic-journey.mjs` — “Traffic browser journey” |  |
| `STATS-003` | Vane and Google Analytics 4 with consent | target | done | `scripts/analytics-journey.mjs` — “Analytics browser journey” |  |
| `STATS-004` | Monthly owner report | target | missing |  | No reports. |
| `STATS-005` | Meta Pixel and Google Ads conversion tracking | target | missing |  | No Meta Pixel, Google Ads connection, goal-to-event mapping or server-side conversions. |
| `ROLE-001` | Roles for editors, authors, moderators and reporting | target | partial | `tests/pane.test.mjs` — “composable Pane roles are invited natively and enforced across workspace, preview, search and every existing API action”; “explicit enquiry replies are retained, delivered once at the provider edge and erased with the parent enquiry”; `scripts/access-journey.mjs` — “Access browser journey” (owner, editor, inbox and reporting at 1440/390)  `tests/search.test.mjs` — “native page writers initiate private assistance within their current grant and retain actor-owned decisions”; “native authors write and submit only own posts and use assistance without exposing other content”; `scripts/ai-journey.mjs` — “editorInitiation”.  `tests/posts.test.mjs` — “authors submit two isolated blogs for exact owner approval and public semantic delivery”; `scripts/posts-journey.mjs` — “Posts browser journey” (native own-post visual authoring, review, owner approval and publication at 1440 and 390). | Composable grants extend native member invitations. Editors edit and preview page and search drafts; inbox users read, explicitly reply and manage enquiries; reporting users read aggregate reports. Inbox replies are explicit, idempotent sends that retain provider status and never retry automatically. Gap: the clause stays partial until every role is exercised: editor collection editing is now proved by CMS-001, and comment queue and notifications await CMS-010 (which must admit only owner, admin and comment moderators). Comment-moderator authority remains unavailable until those doors exist. |
| `ROLE-002` | Review requests and publish delegation | target | missing |  | Only the owner can publish. |
| `ROLE-003` | Designer-to-client handover | target | done | `scripts/custody-journey.mjs` — “Custody browser journey”; `tests/pane.test.mjs` — “ownership handover atomically grants the business owner, demotes the designer and permits immediate revocation” |  |
| `ROLE-004` | Two-step sign-in and passkeys for workspace users | target | partial | `src/modules/operator-auth/identity/email-link/index.mjs`; `src/modules/operator-auth/identity/oidc/index.mjs` | Email-link and OIDC sign-in exist; no passkeys, TOTP, recovery codes or owner-required two-step sign-in. |
| `AUDIT-001` | Activity log of every change | target | partial | `tests/pane.test.mjs` — “activity records successful existing changes atomically and exports ordered owner-only metadata”; “explicit person erasure preserves anonymous ordered activity through archive restore and revokes access” (erasure, journal refusal, restored anonymous history, ordered export and denied account and credential access); “native connection approval, callback, settings and unlink produce owner-attributed secret-free activity”; `scripts/access-journey.mjs` — “Access browser journey” (owner ordered log and export before and after actor erasure, access refusal and icon tooltips at 1440 and 390) | Missing journey: every promised content, connector, role and agent action read back through the metadata activity view and export. Cited journeys show current native writes and ordered export; unbuilt content, agent and connector doors are not exercised. |
| `IMPORT-001` | WXR publishing platform import | target | partial | `tests/pane-imports.test.mjs` — "documented WXR inventories 100 posts and 50 comments by state while applying only supported unpublished pages"; `fixtures/imports/README.md`; `tests/pane-imports.test.mjs` — "imported page bodies preserve semantic headings, nested lists, anchors and inline destinations while scripts, media and widgets stay inert"; `scripts/imports-journey.mjs` — exact-candidate WXR inventory and apply and undo and semantic page and readonly editor at 1440/390 | Documented synthetic WXR 1.0–1.2 reader imports supported pages as unpublished semantic snapshots with heading and list and inline-link and formatting and section-anchor fidelity and reports posts, comment state and parent and post metadata, authors, taxonomy, menus, shortcodes and media references as exceptions. The fixture inventories 100 posts and 50 threaded and approved and pending and spam comments; two supported pages are applied and reconciled, with no native post and comment success claimed. Gap: native posts and taxonomy and authors and menus and threaded comments, complete published-page capture and fidelity, original media delivery, editable rich bodies and every old-URL redirect await CMS-004, CMS-010 and CMS-011, PAGE-014, MEDIA-001 and MEDIA-002 and IMPORT-006. |
| `IMPORT-002` | XML-export site builder import | target | missing |  | No XML-export site builder import. |
| `IMPORT-003` | Crawl-only site builder import | target | partial | `tests/pane-imports.test.mjs` — "captured Wix sitemap and RSS preserve the source inventory and explicitly report unverified live crawl"; `scripts/imports-journey.mjs` — real helper DNS-controlled Wix capture, reviewed apply and undo and retained proof at 1440/390; `tests/pane-imports.test.mjs` — "a controlled published Wix crawl proves DNS ownership before capture and retains exact-source proof through reviewed apply and undo", "crawl consent and authority refuse unsafe origins, altered challenges, members and scoped tokens before outbound work", "controlled crawls refuse private DNS and source redirects without contacting another origin" | Controlled captures retain reviewed semantic page mappings and receipts. Missing journey: complete native blog and rich-body editing, full text and framing fidelity, original media delivery and every old-URL redirect across CMS-004, CMS-011, PAGE-014, PAGE-018, PAGE-019, MEDIA-001, MEDIA-002 and IMPORT-006. RL-101 resolves capture authority; synthetic DNS and source edges supply no live Wix receipt. |
| `IMPORT-004` | Visual and generated site builder import | target | partial | `tests/pane-imports.test.mjs` — "Webflow, Framer and Durable captures are reconciled separately with every collection CSV field retained as an exception"; `fixtures/imports/README.md`; `scripts/imports-journey.mjs` — separate DNS-controlled Webflow and Framer and Durable captures, CSV exceptions, reviewed apply and undo and retained proof at 1440/390 | Separate controlled captures retain semantic pages and collection values as explicit exceptions. Missing journey: native CMS CSV writes and rich bodies, full text and framing fidelity, original media delivery and every old-URL redirect across CMS-001, CMS-007, CMS-011, PAGE-014, PAGE-018, PAGE-019, MEDIA-001, MEDIA-002 and IMPORT-006. RL-101 resolves capture authority; synthetic edges supply no live Webflow, Framer or Durable receipt. Offline envelopes remain Pane interchange. |
| `IMPORT-005` | Migration report and URL map | target | done | `scripts/imports-journey.mjs` — “Import browser journey” |  |
| `IMPORT-006` | Verified cutover with the old site kept | target | missing |  | No cutover. |
| `IMPORT-007` | Enquiry and subscriber history import | target | missing |  | Only the static-site JSON move-in exists; no submission or subscriber import. |
| `EXPORT-001` | Open-format site export | target | partial | `scripts/pane-policy.mjs` | Only Pane's own installation archive exports. |
| `PRIV-001` | Consent for analytics and third-party embeds | target | partial | `tests/pane.test.mjs` — “connected Vane and Google Analytics 4 render only on live pages, widen the policy only for what is connected and stay absent for GPC and DNT visitors”; `scripts/analytics-journey.mjs` — “Analytics browser journey” (zero Google loads before consent, refusal, withdrawal and GPC); `scripts/privacy-journey.mjs` — “Privacy browser journey” (per-origin embeds, revocation and saved-consent GPC refusal at 1440/390) | Current GA4 and embed doors are consent-gated, revocable and suppressed under GPC, including saved grants. Gap: the explicit Meta and Google Ads and server-conversion journey requires STATS-005, while PAGE-008 now proves custom-code consent, privacy refusal and current-session withdrawal under its ct-approved default. The provider journey remains unproved. |
| `PRIV-002` | Person-level privacy requests | target | partial | `tests/pane.test.mjs` — “person privacy finds three enquiries, exports portable records, atomically erases and fences old account backups” (email lookup, portable export, guarded all-record erasure, other-person isolation, account/session refusal and old-backup fence); “person erasure includes pending durable enquiries and prevents their recovery delivery” (queued intake and replay fence); `scripts/custody-journey.mjs` — “Custody browser journey” (lookup/export/confirmation/erased inbox at 1440/390) | Owner-only email lookup/export covers current enquiries, replies, queued intake, account/role/external-identity records, credential-free access metadata and activity. Explicit erasure requires native fresh proof and atomically erases all matched records, anonymizes account/activity references and prevents erased data returning through replay, old archives or transfers. A concurrent new record aborts rather than permitting partial erasure. Pending durable enquiries are included and fenced before deletion; an owner account requires handover first. Existing single-account erasure now carries the same old-archive checkpoint. Browser-local consent choices have no email identifier; recorded acknowledgment mail services are listed for owner follow-up without automatic outbound erasure. Gap: real CRM delivery inventory/receipt proof awaits FORM-005. FORM-001 files, FORM-008 consents, CMS-010 comments and LINK-003 subscribers inherit lookup, export, erasure and backup fencing before shipping. |
| `PRIV-003` | Policy and accessibility statement starters | target | partial | `tests/pane.test.mjs` — “policy starters name actual services, remain editable drafts and require owner publication” (actual GA4/Vane/form/Turnstile inventory, all three labeled starters, editability, no overwrite and draft isolation); `scripts/custody-journey.mjs` — “Custody browser journey” (generate, edit and publish all three starter pages at 1440/390) | Privacy, terms and accessibility starters derive from the actual revision and are clearly labeled for owner review, not legal advice. GA4, Vane, connected embed origins, current form fields, Turnstile and applicable acknowledgment relay are named truthfully. Generation never overwrites an existing page and uses the normal immutable draft and owner publication path. Gap: the acceptance journey naming a real connected CRM still requires FORM-005 and an authorized CRM tenant. FORM-005, FORM-008, CMS-010, FORM-001 and LINK-003 must extend the real collection and connection inventory when they add a door. When AI assistance is connected, the actual-service inventory and privacy starter name OpenAI as the AI processor accessed through Base AI and describe the selected page and named image inputs sent only after the owner’s explicit request; pre-request consent copy makes the same disclosure. This addition does not certify provider terms, legal compliance or accessibility. |
| `PRIV-004` | Security headers on every page | target | done | `scripts/privacy-journey.mjs` — “Privacy browser journey”; `tests/search.test.mjs` — “PRIV-004: current Pane workspace, preview, live, search and not-found documents retain their security headers”; `tests/search.test.mjs` — “shared entry documents deny device permissions while native authentication and origin refusals remain intact”; `tests/search.test.mjs` — “only an approved page embed widens its frame policy and workspace previews stay inert” |  |
| `LOCALE-001` | US defaults | target | done | `scripts/scheduling-journey.mjs` — “Business-local scheduling journey” |  |
| `MOBILE-001` | Responsive owner workspace on a phone | target | partial | `scripts/browser-journey.mjs` | The current workspace is checked for overflow at 390 wide; the target editor, inbox replies and approvals on a phone are not built. |
| `MOBILE-002` | Native iOS and Android owner app | target | missing |  | No native app. |
| `AUTO-001` | Form-triggered automations | target | missing |  | No automations. |
| `AUTO-002` | Scheduled automations | target | done | `scripts/scheduling-journey.mjs` — “Business-local scheduling journey” |  |
| `AUTO-003` | Share new posts to social accounts | target | missing |  | No social connections. |
| `AUTO-004` | Site problem alerts | target | missing |  | No alerts. |
| `AI-001` | Draft a whole site from business facts | target | missing |  | Whole-site generation from verified business facts is not implemented; current owner assistance is scoped by AI-002 and AI-003. |
| `AI-002` | Writing, alt text and translation assist | target | partial | `scripts/ai-journey.mjs` — “AI-003 and AI-002 browser journey”; `scripts/ai-journey.mjs` — “editorInitiation” | The cited native editor and provider-fake journeys show the held functional workflow and retained input/history riders. Missing journey: the same AI-002 job through the shared agent registry under the all-autonomous and held company policies, without a hard-coded native-only decision gate. |
| `AI-003` | Search and content suggestions | target | partial | `scripts/ai-journey.mjs` — “AI-003 and AI-002 browser journey” | The cited native editor and provider-fake journeys show the held functional workflow and retained input/history riders. Missing journey: the same AI-003 job through the shared agent registry under the all-autonomous and held company policies, without a hard-coded native-only decision gate. |
| `AI-005` | Selected assistance inputs and disclosure | target | partial | `scripts/ai-riders.mjs` — “riderProof”; `tests/search.test.mjs` — “native page writers initiate private assistance within their current grant and retain actor-owned decisions”; `tests/search.test.mjs` — “native authors write and submit only own posts and use assistance without exposing other content” | The cited native editor and provider-fake journeys show the held functional workflow and retained input/history riders. Missing journey: the same AI-005 job through the shared agent registry under the all-autonomous and held company policies, without a hard-coded native-only decision gate. |
| `AI-006` | Assistance decisions and durable history | target | partial | `scripts/ai-journey.mjs` — “AI-003 and AI-002 browser journey”; `scripts/ai-journey.mjs` — “editorInitiation”; `scripts/ai-riders.mjs` — “riderProof” | The cited native editor and provider-fake journeys show the held functional workflow and retained input/history riders. Missing journey: the same AI-006 job through the shared agent registry under the all-autonomous and held company policies, without a hard-coded native-only decision gate. |
| `AI-004` | AI collection and bulk content operations | target | missing |  | No collection or bulk AI operations. |
| `AGENT-001` | Interview the owner and build from verified facts | push-further | missing |  | No agent; the interview, fact store and sourcing do not exist. |
| `AGENT-002` | Keep business facts current across the site | push-further | missing |  | No fact watching. |
| `AGENT-003` | Prove every enquiry reaches a person | push-further | missing |  | Enquiries reach the workspace inbox (`INBOX-001`) but nothing checks delivery; no agent. |
| `AGENT-004` | Recover lost search traffic and broken paths | push-further | missing |  | No search data or link checks. |
| `AGENT-005` | Measure changes against real leads and bookings | push-further | missing |  | Revisions and day counts exist but no conversion data or experiments. |
| `AGENT-006` | Move a business off its old platform | push-further | missing |  | Only the reviewed static JSON move-in exists (`MOVEIN-001`). |
| `AGENT-007` | Follow up unanswered enquiries by company policy | push-further | missing |  | No enquiry follow-up specialist journey under company policies is implemented; the holding wording and external replies still need their tool classes and policy decisions. |
| `AGENT-008` | Agent controls, budgets and recovery | push-further | missing |  | No agents run inside Pane; outside agents use the command helper (`API-001`). Every future agent door must enforce the existing API-001 native authority intersection, explicit scope, credential custody and transactional metadata audit. |
| `SURFACE-001` | The website specialist registry | target | missing |  | No MCP journey implements this Pane surface; the existing helper and scoped API do not prove this shared door or its company-policy matrix. |
| `SURFACE-002` | Content exposure and live-site classes | target | missing |  | No MCP journey implements this Pane surface; the existing helper and scoped API do not prove this shared door or its company-policy matrix. |
| `SURFACE-003` | Authority, provider and data classes | target | missing |  | No MCP journey implements this Pane surface; the existing helper and scoped API do not prove this shared door or its company-policy matrix. |
| `SURFACE-004` | A seeded week through the website door | target | missing |  | No MCP journey implements this Pane surface; the existing helper and scoped API do not prove this shared door or its company-policy matrix. |
