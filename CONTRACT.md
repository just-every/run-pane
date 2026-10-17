# CONTRACT.md — Pane

Target edition: 16 October 2026. Pane is the owned website builder and CMS a US small business uses instead of Squarespace, Wix or WordPress.com: a visual editor with unlimited pages, responsive templates and brand styles, a media library, CMS collections and a blog, custom domains on fast hosting, a full search toolkit, forms that route leads to a person and a CRM, and booking, checkout and newsletter blocks handed to the products that own those jobs. Agents build the site from verified business facts and keep it current, discoverable and converting.

This is a target contract: it describes the product Pane is being built towards and marks how close the current code is. Every clause has a stable ID, states the behavior a buyer gets and names the acceptance evidence that proves it through a public door (a route, a command, the built site or a browser journey). The [Status](#status) table judges each clause `done`, `partial` or `missing` from the code and tests at one commit. A clause is not accepted until its acceptance evidence runs; code presence is not acceptance. [ACCEPTANCE.md](ACCEPTANCE.md) lists every clause's acceptance journey with its status.

This documentation round changes no homepage, interface or runtime behavior. Missing implementation never reduces this target: provider apps, native mobile apps, domain and DNS automation and third-party connectors are engineering work recorded as clauses.

## Product target — 16 October 2026

| | |
| --- | --- |
| Category | Small-business website builder and CMS |
| Incumbents a buyer switches from | Squarespace, Wix, WordPress.com |
| Up-and-comers it must also beat | Framer, Webflow, Durable |
| First buyer | The owner or marketing generalist of a 1 to 50 person US local or professional-service business (a restaurant, salon, trade, clinic, studio or practice) moving a Squarespace, Wix or WordPress.com site; costs in USD on the buyer's own Cloudflare account, with no per-feature upsells |
| What switching means | Their pages, posts, collections, media and old URLs arrive with an explicit list of what did not map; their domain moves without breaking their email; every daily job (editing, publishing, blogging, answering enquiries, taking bookings, reading results) has a Pane equivalent; their CRM, booking, checkout, newsletter, analytics and search accounts plug in; and they can leave with open-format exports |

A buyer replacing an incumbent needs the whole job, so the target is the whole job:

- **Build visually.** Unlimited pages with folders and clean URLs, a section and block editor, menus, reusable components, device previews, autosave, page status and review, custom code and accessible output (`PAGE-001` to `PAGE-011`), on responsive templates with site-wide brand styles that survive a template switch (`STYLE-001` to `STYLE-004`), with a media library that optimizes images and embeds video and maps (`MEDIA-001` to `MEDIA-004`).
- **Publish content.** CMS collections for services, team, projects, testimonials, locations, FAQs and menus with template pages, lists, a blog, scheduling, RSS, CSV import and site search (`CMS-001` to `CMS-008`), always through immutable revisions, preview, approval and one-action rollback (`PUBLISH-001` to `PUBLISH-004`).
- **Be found.** A custom domain at apex and `www` with managed HTTPS that keeps the business's email working, fast edge hosting that survives an admin outage, updates without plugin upkeep and a visible USD running cost (`DOMAIN-001` to `DOMAIN-004`, `HOST-001` to `HOST-004`); titles, descriptions, redirects, sitemap, canonical URLs, local-business structured data, social cards, Search Console, Bing and Google Business Profile (`SEO-001` to `SEO-009`).
- **Turn visitors into business.** Forms with spam protection, email notification and reply, acknowledgements, CRM routing to Orbit or HubSpot, enquiry ownership and follow-up, Google Sheets export and consent capture (`FORM-001` to `FORM-008`); booking, checkout, newsletter and automation connections with a health panel (`LINK-001` to `LINK-005`, `API-001`); traffic, conversion goals, Vane or GA4 and a monthly report (`STATS-001` to `STATS-004`); form-triggered and scheduled automations, social sharing and problem alerts (`AUTO-001` to `AUTO-004`).
- **Run it as a team, anywhere.** Owner, admin, editor, author, inbox and reporting roles, delegated publishing, designer handover and a full activity log (`ACCESS-*`, `ROLE-001` to `ROLE-003`, `AUDIT-001`); a phone-ready workspace and native iOS and Android owner apps (`MOBILE-001`, `MOBILE-002`).
- **Move in and out.** Imports from WordPress.com, Squarespace, Wix, Webflow, Framer and Durable with a migration report, URL map and verified cutover (`MOVEIN-001`, `IMPORT-001` to `IMPORT-006`); open-format exports, backups, person-level privacy requests, US policy starters, security headers and US defaults (`BACKUP-001`, `ERASE-001`, `EXPORT-001`, `PRIV-001` to `PRIV-004`, `LOCALE-001`).
- **Let AI and agents do the work.** AI drafts a whole site from business facts, assists writing, alt text and translation, suggests search fixes and edits collections in bulk (`AI-001` to `AI-004`); agents interview the owner, keep facts current, prove enquiries reach a person, recover lost search traffic, measure changes against real leads, migrate platforms and follow up enquiries, all under owner control and a USD budget (`AGENT-001` to `AGENT-008`).

### Neighbouring products stay separate

Pane is one product: the website. Where the market sells a neighbouring product separately, Pane connects to it and does not rebuild it; when the neighbour is a Run Edit Run sibling, Pane links to that sibling first and to the US incumbent second.

| Job | Owned by | How Pane meets it |
| --- | --- | --- |
| CRM, contacts and sales pipeline | [Orbit](https://github.com/just-every/run-orbit) (or HubSpot, Pipedrive) | Lead routing from forms with delivery state (`FORM-005`); facts for agents (`AGENT-001`, `AGENT-002`) |
| Appointment booking | [Dial](https://github.com/just-every/run-dial) (or Calendly, Acuity Scheduling) | Booking blocks and booking conversions (`LINK-001`) |
| Online store, cart and checkout | [Stall](https://github.com/just-every/run-stall) (or Squarespace Commerce, Shopify, Stripe Payment Links, PayPal) | Product blocks and buy buttons that hand off checkout (`LINK-002`) |
| Paid memberships and subscriptions | [Nectar](https://github.com/just-every/run-nectar) or Stall (or Stripe Billing) | Member-only pages check access (`PAGE-011`); billing stays with the provider |
| Email marketing and newsletters | [Mango](https://github.com/just-every/run-mango) (or Mailchimp, Kit) | Signup blocks, consent and new-post sends (`LINK-003`, `FORM-008`, `CMS-006`) |
| Web analytics | [Vane](https://github.com/just-every/run-vane) (or Google Analytics 4) | Built-in counts and goals plus a connection (`STATS-001` to `STATS-003`) |
| Standalone forms and surveys | [Pencil](https://github.com/just-every/run-pencil) (or Typeform, Jotform) | Pane builds site forms (`FORM-001`); multi-step surveys and quizzes embed from Pencil |
| Help desk and live chat | [HappyToHelp](https://github.com/just-every/run-happytohelp) (or Zendesk, Intercom) | Enquiry follow-up only (`FORM-006`, `AGENT-007`); support queues and chat widgets embed from HappyToHelp |
| Workflow automation across apps | [Crank](https://github.com/just-every/run-crank) (or Zapier, Make) | Signed webhooks and published triggers (`LINK-004`) |
| Uptime monitoring | [Uptime](https://github.com/just-every/run-uptime) (or UptimeRobot) | Problem alerts hand external checks to Uptime (`AUTO-004`) |
| Team chat | [Nook](https://github.com/just-every/run-nook) (or Slack, Microsoft Teams) | Enquiry and review notifications (`AUTO-001`) |
| Restaurant reservations | [Placemat](https://github.com/just-every/run-placemat) (or OpenTable, Resy) | Embedded through the booking and custom embed blocks (`LINK-001`, `PAGE-008`) |
| Class schedules for studios | [Strap](https://github.com/just-every/run-strap) (or Mindbody) | Embedded through the booking and custom embed blocks |
| File storage | [Chest](https://github.com/just-every/run-chest) (or Google Drive) | Media is Pane's own (`MEDIA-001`); shared drives stay in Chest |
| Workforce sign-in | [Auth](https://github.com/just-every/run-auth) (or Okta, Microsoft Entra ID) | Optional identity provider for the workspace through Base's native sign-in |

A business phone system has no sibling; Pane links phone numbers for click-to-call and counts the clicks (`STATS-002`) and does not route calls.

### How to read this contract

- **Published clauses** are the `- **ID — Title.**` bullets in [Released guarantees](#released-guarantees). The previous contract and ACCEPTANCE.md already promised them; this edition gives them IDs and keeps every guarantee, widening only where a target clause names the change.
- **Target clauses** are the `#### ID — Title.` headings in [Target clauses](#target-clauses), and **push-further clauses** are those in [Push further](#push-further). They are binding product requirements; each carries its status beside it.
- **Status** is judged from the code and tests at commit `80f6943` (17 October 2026). `done` means the behavior ships and a cited test or journey exercises it; `partial` means some of it ships, or it ships without a test; `missing` means there is no implementation. Status is a build-planning judgement, not acceptance.

## Target amendment — 16 October 2026

The owner directed on 16 October 2026 that every seed's contract describe a genuine competitor to its category's incumbents. This amendment records how the target changes the released promises. It removes no guarantee and renames nothing.

- **The five-page ceiling goes.** The released contract fixed "the complete five-page snapshot"; revisions now hold the whole site, whatever it contains (`PUBLISH-001`, `PAGE-001`).
- **The business site moves to its own domain root.** It stays served at `/site` on the installation origin until `DOMAIN-001` and `HOST-001` are met; then `/site` redirects to the primary domain.
- **The released exclusions become targets.** The first release excluded custom domains, a shop, bookings, payments, email delivery, external provider calls and a template marketplace. Each is now a target clause: domains (`DOMAIN-*`), checkout and bookings handed to Stall and Dial (`LINK-001`, `LINK-002`), email delivery (`FORM-003`, `FORM-004`), provider connections (`FORM-005`, `LINK-*`, `SEO-007`, `SEO-008`, `STATS-003`) and templates (`STYLE-001`). Pane still never holds card details or registers domains itself (see [Honest boundaries](#honest-boundaries)).
- **Publishing can be delegated.** Owner approval stays the default; the owner may delegate publishing to named people under `ROLE-002`, and every approval is still recorded (`PUBLISH-003`).
- **Erasure widens from one message to one person** (`ERASE-001` → `PRIV-002`), keeping the backup fence.

Security consequences:

- **Third-party code on the live site** (embeds, custom code, analytics) is confined to the live site's origin and policy; it never runs on workspace pages, and the workspace never shares cookies with it (`PAGE-008`, `PRIV-004`).
- **Provider credentials** (Cloudflare API tokens, CRM and booking keys, Search Console and Google Business Profile grants, mail relay keys, webhook signing secrets) are installation secrets: stored server-side only, never sent to the browser, excluded from exports and restored archives, and rotated from the connection panel (`LINK-005`).
- **Uploaded media and form files** are untrusted. They are stored privately, served with a download disposition unless they are images Pane has re-encoded, and size and type limited (`MEDIA-001`, `FORM-001`).
- **Agents** act only through the same server permissions as people, under budgets, and every action is logged (`AGENT-008`, `AUDIT-001`).

## Released guarantees

These clauses restate what the previous contract and first-release acceptance promised. They still hold; where the target widens one, the clause names the target clause.

### Sign-in, roles and authority

- **ACCESS-001 — Server-side role authorization.** Native operator sessions authorize every private handler, including direct API and command-helper calls, never only a route guard. Owners publish, roll back and erase messages; owners and admins prepare, preview and import; members read the workspace. A deactivated operator loses access at the next request. Target roles (`ROLE-001`) extend this table; none of them bypasses the server check. **Acceptance evidence:** Sign in as owner, invite and confirm an admin and a member, then call `/api/pane` routes signed out, as each role and after deactivating the admin. Signed-out calls get 401, a member is refused prepare, an admin is refused publish, and the deactivated admin gets 401 with no write.

- **ACCESS-002 — Canonical-origin mutations.** Every private mutation and every public form or visit post requires the installation's canonical origin; a cross-origin request is refused before any write. **Acceptance evidence:** Post a prepare request and a contact message with a foreign `Origin` header and see 403 with no new revision or message.

### Revisions and publication

- **PUBLISH-001 — Immutable complete revisions.** A revision holds the complete site snapshot and its SHA-256. It is never edited after it is created. As the target editor, collections, navigation, styles and media arrive (`PAGE-*`, `CMS-*`, `STYLE-*`, `MEDIA-*`), the snapshot grows to hold all of them, so a revision always reproduces the whole public site. **Acceptance evidence:** Prepare two revisions, read them back through `/api/pane` and compare their snapshots and hashes; neither changes after a later prepare, publish or rollback.

- **PUBLISH-002 — Private draft preview.** An owner or admin previews any revision before it is live, at its own private URL, with an explicit draft banner and contact sending disabled. Signed-out visitors are sent to sign in and members are refused. **Acceptance evidence:** Open a revision's preview signed out (redirect to sign-in), as a member (403) and as an admin (the draft's pages with the banner).

- **PUBLISH-003 — Owner-approved atomic publication.** Publication selects one revision as live and records the owner's approval (actor, revision, time) in one atomic write. An admin can prepare but cannot publish unless the owner delegates that right under `ROLE-002`. **Acceptance evidence:** As owner, publish a prepared revision; every public page serves it and the approval record names the owner and revision. As admin, publishing is refused.

- **PUBLISH-004 — One-action rollback.** The owner restores any earlier immutable revision as the live site in one action, and the rollback is recorded like a publication. **Acceptance evidence:** Publish a change, roll back to the first revision, and see the public site lose the change and the approval record gain one rollback entry.

### Contact inbox and visit counts

- **INBOX-001 — Durable, escaped and idempotent contact submissions.** A visitor's contact message is stored once per submission key, so a retried post never creates a duplicate, and it is shown escaped in the workspace. An erased submission key cannot be replayed into the inbox. **Acceptance evidence:** Submit the same contact form twice with one key and see one inbox message; submit a name containing markup and see it escaped in `/app`.

- **VISIT-001 — Cookie-free aggregate visit counts.** Live page views store only a day and path count. No cookie, identifier or address is stored, previews are not counted, and a browser sending Do Not Track or Global Privacy Control is not counted. **Acceptance evidence:** Post a visit with `DNT: 1` and one without; the page's count rises by exactly one and no visitor record exists.

### Move-in, backup and erasure

- **MOVEIN-001 — Reviewed static-site move-in with guarded undo.** An owner or admin dry-runs the documented static-site JSON through Base's import kit, approves the plan's fingerprint and imports an unpublished draft. Undo reverses an unchanged, unpublished import and keeps its journal; undoing a published import is refused. **Acceptance evidence:** Dry-run the fixture, apply with a wrong fingerprint (refused), apply with the reviewed one, confirm the live site is unchanged, undo as a member (refused) and as an admin (undone, journal kept).

- **BACKUP-001 — Export and restore into an empty installation.** The owner exports installation data and restores it into an empty installation; the live revision, history and import journals come back. **Acceptance evidence:** Export a populated installation, restore it into a fresh empty D1 and read the live revision and import jobs.

- **ERASE-001 — Message erasure fenced against old backups.** The owner erases a contact message. The erasure commits with the portability fence in one batch, so a backup taken before the erasure cannot restore the message and the same submission cannot be replayed. **Acceptance evidence:** Erase a message as admin (refused) and as owner, replay its submission (not stored), then restore an older archive with the later journal and see it refused.

### Operation and presentation

- **HEALTH-001 — Deployment health and unknown paths.** `/health` identifies the Worker deployment (source, fingerprint, version) and unknown paths return 404. **Acceptance evidence:** Read `/health` on a local and a deployed Worker and compare its deployment fields with the deploy record; request an unknown app path and an unknown site page and see 404.

- **DEPLOY-001 — Install on the owner's Cloudflare account.** `rer deploy` installs the Worker, D1 database and migrations on the owner's own Cloudflare account and checks health; the owner pays Cloudflare directly in USD. **Acceptance evidence:** Run `rer deploy` against a test Cloudflare account, see migrations applied and `/health` match, then remove the deployment.

- **RUNSITE-001 — Public run site and documentation.** The public run site is a static build of the picked Pane homepage, `/run` and the Markdown guides, with no installation sign-in links. **Acceptance evidence:** Build with `rer build --site`, open `/`, `/run` and every linked `/docs` page (200) and an unknown path (404).

- **LOBBY-001 — Shared Lobby, workspace and theme.** The installed `/` is the shared Lobby; `/app` keeps its anchored workspace sections; the paper, cerulean and self-hosted Noto theme is shared with sign-in and setup. **Acceptance evidence:** Open `/`, `/signin`, `/setup` and `/app` at 1440 and 390 wide and see the shared theme, the workspace anchors and no horizontal overflow.

- **PRESENT-001 — Labelled previews and unbranded live pages.** Previews use the business site's typography with an explicit draft banner. Live business pages carry the business's name only: no Pane branding in the page, title, footer or metadata. **Acceptance evidence:** Open a preview and see the banner; open every live page and find no Pane name or mark in the HTML, including `<title>`.

## Target clauses

The whole job a Squarespace, Wix or WordPress.com buyer needs on the day they switch. Each clause states the behavior, its acceptance evidence and its current status.

### Pages and the visual editor

#### PAGE-001 — Unlimited pages, folders and clean URLs.

An editor adds, renames, reorders, hides and deletes any number of pages, groups them in folders, and sets each page's clean URL slug. The home page is chosen, not fixed. Deleting or renaming a published page offers a redirect (`SEO-002`). The five-page ceiling is removed; the five starter pages become a template (`STYLE-001`).

**Acceptance evidence:** Create 40 pages in three folders through the editor, rename two slugs, delete one, publish, and open every URL; renamed and deleted pages answer 301 to the chosen targets, and the revision snapshot holds all 40.

*Status:* partial. Exactly five fixed slugs (home, about, services, hours, contact); no page creation, folders or slug editing.

#### PAGE-002 — Visual section and block editor.

Pages are built visually from sections (hero, text, image, gallery, columns, list, testimonials, pricing, FAQ, contact, map, call-to-action) and blocks inside them. An editor adds, moves by drag or keyboard, duplicates and deletes sections and blocks, and edits text in place on the page as it will look. Every layout comes from the site's styles, so pages stay consistent.

**Acceptance evidence:** On a phone and a desktop browser, build a services page by adding, reordering (drag and keyboard), duplicating and deleting sections, edit headings in place, preview, and publish; the live page matches the editor.

*Status:* partial. Content is edited as name, description and a pages JSON text field; no visual canvas, sections or blocks.

#### PAGE-003 — Navigation menus, header and footer.

The owner edits the main menu (order, labels, dropdown groups, external links, a call-to-action button), a footer with business details and secondary links, and a mobile menu. Hidden pages stay out of menus.

**Acceptance evidence:** Build a menu with two dropdowns, an external link and a Book button, hide one page, publish, and use the menu with a mouse, keyboard and a 390-wide phone.

*Status:* partial. Navigation lists the five fixed pages; no menu editing, dropdowns, buttons or footer links.

#### PAGE-004 — Reusable sections and global components.

An editor saves a section as a reusable component (an announcement bar, a contact block, a promotion). Changing it once updates every page that uses it, in the next revision, and the editor shows where it is used.

**Acceptance evidence:** Place one component on five pages, edit it once, preview all five changed, and detach one copy that then stays unchanged.

*Status:* missing. No components; pages are plain text.

#### PAGE-005 — Device previews and responsive layout control.

The editor and preview switch between desktop, tablet and phone widths. An editor can hide a section on phones or reorder columns for small screens without affecting desktop.

**Acceptance evidence:** Preview a draft at 1440, 768 and 390 wide from the editor, hide a section on phones only, and see it absent at 390 and present at 1440 on the live site.

*Status:* partial. One responsive preview; no width switcher or per-device layout settings.

#### PAGE-006 — Autosave, undo and safe concurrent editing.

Edits save as a draft continuously, an editor can undo and redo within a session, and two editors on the same page never silently overwrite each other: the second sees the other's change and merges or keeps their own copy.

**Acceptance evidence:** Edit, close the tab and reopen to find the draft kept; undo and redo five steps; edit one page from two browsers and see the conflict surfaced, never lost.

*Status:* missing. Drafts are created only by an explicit whole-site prepare; no autosave, undo or conflict detection.

#### PAGE-007 — Page status and review requests.

Each page and post carries draft, needs review, scheduled or published status. An editor sends a page for review; the owner (or a delegated publisher, `ROLE-002`) approves it from the workspace or a notification. Publishing one page leaves other unfinished drafts unpublished, while every publication still creates an immutable whole-site revision (`PUBLISH-001`).

**Acceptance evidence:** Edit two pages, send one for review, approve and publish only that one, and see the other stay draft while the revision history records the publication.

*Status:* partial. Whole-site drafts and owner approval only; no per-page status or review request.

#### PAGE-008 — Custom code, embeds and CSS.

An owner adds custom CSS, an HTML embed block and site-wide header code (for example a verification tag). Embeds run sandboxed under a per-site content security policy the owner sees, and nothing they add can reach the workspace or a session.

**Acceptance evidence:** Add a custom CSS rule, an embed block and a header verification tag; see them live, see the policy list the embed's host, and see the embed unable to read workspace cookies or call `/api/pane`.

*Status:* missing. No custom code or embed support; the public CSP allows only same-origin scripts.

#### PAGE-009 — Accessible output by default.

Published pages meet WCAG 2.2 AA by default: images need alt text (or an explicit decorative mark) before publishing, headings are in order, colors in styles meet contrast, forms are labelled, everything works by keyboard, and a skip link is present. The editor warns before publishing a page that fails.

**Acceptance evidence:** Run axe and a keyboard pass over every template and a populated site at 1440 and 390 wide with zero serious violations; try to publish an image without alt text and see the warning.

*Status:* partial. Skip link and labelled contact fields exist; no alt-text, heading or contrast checks and no automated accessibility test.

#### PAGE-010 — Duplicate pages and starter layouts.

An editor duplicates a page or starts one from a starter layout (landing page, service detail, team, menu, pricing, FAQ, location) that already uses the site's styles.

**Acceptance evidence:** Create a page from each starter layout and one duplicate, publish, and see each use the site's fonts and colors.

*Status:* missing. No page creation.

#### PAGE-011 — Password-protected and member-only pages.

The owner protects a page or folder with a password, or limits it to signed-in site members. Paid membership is sold through Stall or Nectar (`LINK-002`); Pane checks access on every request and never serves the protected content in the public cache.

**Acceptance evidence:** Protect a folder with a password and another with member sign-in; signed-out requests see the gate, the right password or member sees the page, and no cached response leaks it.

*Status:* missing. Every live page is public.

### Templates and brand styles

#### STYLE-001 — Responsive templates for US local businesses.

A new site starts from a template catalogue for common US small businesses (restaurant, salon and spa, trades and home services, professional services, clinic, studio, retail, nonprofit), each responsive and fully editable.

**Acceptance evidence:** Start a site from each template, publish, and check every page at 1440 and 390 wide with no overflow and a passing accessibility run.

*Status:* partial. One fixed responsive layout; no template catalogue.

#### STYLE-002 — Site-wide brand styles.

The owner sets fonts, colors, button shapes, spacing and section backgrounds once for the whole site, with live preview. A change applies everywhere in the next revision.

**Acceptance evidence:** Change the heading font, primary color and button style, preview three pages showing the change, publish, and roll back to the earlier styles.

*Status:* partial. Styles are fixed in source CSS; no owner style controls.

#### STYLE-003 — Switch templates without rebuilding content.

Changing template restyles the site and keeps every page, collection item, image and form. Anything the new template cannot place is listed before the switch. This answers the incumbent complaint that a template change means rebuilding.

**Acceptance evidence:** Switch a populated site between two templates, read the pre-switch list, publish, and see every page and item present; roll back to the previous template.

*Status:* missing. No templates to switch between.

#### STYLE-004 — Logo, favicon and brand kit.

The owner uploads a logo, favicon and social image once; Pane sizes them for the header, browser tab, home-screen icon and social cards (`SEO-006`).

**Acceptance evidence:** Upload a logo and favicon and see them in the header, browser tab and a social card preview.

*Status:* missing. The live header shows the business name as text only.

### Media library

#### MEDIA-001 — Media library with alt text and usage.

Images, PDFs (menus, price lists) and other files upload once into a searchable library with folders, alt text, captions and a list of where each is used. Deleting a file in use is refused with its uses listed.

**Acceptance evidence:** Upload 50 images and three PDFs, search and filter them, set alt text, place one image on three pages, and try to delete it (refused, uses listed).

*Status:* missing. No uploads or media storage.

#### MEDIA-002 — Responsive image optimization.

Pane serves every image in modern formats (AVIF or WebP with a fallback), at sizes matched to the screen (`srcset`), lazily below the fold and with dimensions set so the layout does not shift.

**Acceptance evidence:** Upload a 6000-pixel photo and see the live page serve a phone-sized WebP or AVIF at 390 wide, a larger one at 1440, with width and height attributes and lazy loading below the fold.

*Status:* missing. No images.

#### MEDIA-003 — Basic image editing.

An editor crops, rotates and sets a focal point on an image in the browser; the original is kept and edits are reversible.

**Acceptance evidence:** Crop and set a focal point, see the hero keep the subject at 390 and 1440 wide, then revert to the original.

*Status:* missing. No images.

#### MEDIA-004 — Video, map and social embeds.

Blocks embed YouTube and Vimeo videos, a Google Maps location for each business address, and Instagram or Facebook posts. Third-party embeds load only after consent where `PRIV-001` requires it.

**Acceptance evidence:** Add a YouTube video, a Vimeo video, a Google Map and an Instagram post; see each on the live site, see them wait for consent where required, and see the CSP list only their hosts.

*Status:* missing. No embeds.

### Collections and blog

#### CMS-001 — Structured collections with typed fields.

The owner keeps structured collections such as services, team members, projects, testimonials, locations, FAQs and menu items, with typed fields (text, rich text, image, number, USD price, date, link, reference to another collection, option). Starter collections come with each template.

**Acceptance evidence:** Create a services collection with ten fields including a USD price and a reference to team members, add 30 items, and edit an item; validation refuses wrong types.

*Status:* missing. No collections.

#### CMS-002 — Collection template pages with item URLs.

Each collection can have a template page that renders every item at its own clean URL, with item-level title, description and social image for search (`SEO-001`).

**Acceptance evidence:** Design a service template page, publish, and open every service item's URL with its own title, description and structured data.

*Status:* missing. No collections.

#### CMS-003 — Collection lists and filters on any page.

Any page can show a list or grid of collection items, filtered, sorted, limited and optionally featured (for example the three newest projects or testimonials for one service).

**Acceptance evidence:** Place a filtered, sorted list of three featured projects on the home page and a full filterable list on a projects page; change an item and see both update in the next revision.

*Status:* missing. No collections.

#### CMS-004 — Blog with categories, tags and authors.

A blog with posts, excerpts, featured images, categories, tags, author pages, archives and pagination. Authors write and submit posts within their role (`ROLE-001`).

**Acceptance evidence:** As an author, write three posts with categories and tags, submit them for review, have the owner publish, and open the blog index, a category, a tag, an author page and each post.

*Status:* missing. No blog.

#### CMS-005 — Scheduled publishing and expiry.

Pages, posts, collection items and announcement sections can be scheduled to publish and to unpublish at a date and time in the business's US time zone, daylight saving included. The workspace shows what actually went live and flags a scheduled change that has not been approved by its time.

**Acceptance evidence:** Schedule a post for 9:00 America/Chicago and a promotion to expire across a daylight saving change; see each happen at the right local time and see an unapproved schedule flagged, not published.

*Status:* missing. Publication is immediate only.

#### CMS-006 — RSS feed and new-post notifications.

The blog and each collection with a template page publish an RSS feed. On publication, subscribers who opted in receive the new post through Mango or Mailchimp (`LINK-003`), and the owner sees the send state.

**Acceptance evidence:** Validate the RSS feed, publish a post and see the Mango or Mailchimp campaign queued with its delivery state in Pane.

*Status:* missing. No feeds or subscribers.

#### CMS-007 — Collection CSV import and export.

Collections import from and export to CSV, matching Webflow's and Framer's CMS exports, with a field-mapping preview and a list of rows that could not be imported.

**Acceptance evidence:** Import a Webflow CMS CSV and a Framer CSV with images, review the mapping and rejected rows, apply, export the collection again and compare.

*Status:* missing. Only the static-site JSON move-in exists (`MOVEIN-001`).

#### CMS-008 — Site search.

Visitors search the site's pages, posts and collection items; results respect password and member-only pages (`PAGE-011`).

**Acceptance evidence:** Search for a service name, a post tag and a word on a protected page; the first two return results and the protected page does not for a signed-out visitor.

*Status:* missing. No site search.

### Domains and hosting

#### DOMAIN-001 — Connect a custom domain with apex and www.

The owner connects a domain they own, at the apex and `www`, with one chosen as primary and the other redirecting to it. Pane creates the Cloudflare Workers custom domain in the owner's Cloudflare account, or shows the exact records to add at another DNS host (GoDaddy, Namecheap, Squarespace Domains, Google Cloud DNS, Network Solutions) and checks them.

**Acceptance evidence:** Connect a test domain held in Cloudflare and one at an external DNS host, see the status move from pending to live, and see `www` redirect to the apex with 301.

*Status:* missing. The business site is served only at `/site` on the Worker origin; no domain connection.

#### DOMAIN-002 — Managed HTTPS and certificate status.

Every connected domain is served over HTTPS with an automatically issued and renewed certificate; HTTP redirects to HTTPS; the workspace shows certificate status and expiry, and alerts before a renewal problem (`AUTO-004`).

**Acceptance evidence:** Connect a domain, see the certificate issued and listed with its expiry, and see `http://` redirect to `https://`.

*Status:* missing. No domain or certificate handling beyond the Worker's default hostname.

#### DOMAIN-003 — DNS status that preserves business email.

Before cutover Pane reads the domain's existing DNS and keeps every record it does not own, especially MX, SPF, DKIM and DMARC for Google Workspace or Microsoft 365, so connecting the website never breaks the business's email. It shows each record as kept, added or needing action.

**Acceptance evidence:** Connect a domain that has Google Workspace MX, SPF and DKIM records; after connection the mail records are unchanged and mail still delivers, and the status screen lists them as kept.

*Status:* missing. No DNS reading or writing.

#### DOMAIN-004 — Domain registration and transfer guidance.

An owner without a domain is guided to register one in their own Cloudflare Registrar account (at cost, in USD) or keep their current registrar; an owner leaving Squarespace Domains, Wix or WordPress.com gets the transfer or nameserver steps for that registrar. Pane never holds the registration.

**Acceptance evidence:** Follow the guided path for a new domain and for a domain at Squarespace Domains, ending with a connected domain in each case.

*Status:* missing. No domain guidance.

#### HOST-001 — The business site at the domain root, fast.

The live site is served at the root of its domain (not under `/site`), cached at Cloudflare's edge and purged on publication. Each template meets Core Web Vitals at the 75th percentile on a mid-range phone over 4G: Largest Contentful Paint 2.5 s or less, Interaction to Next Paint 200 ms or less, Cumulative Layout Shift 0.1 or less.

**Acceptance evidence:** Publish a populated site on a connected domain, measure with Lighthouse mobile and field data from Vane (`STATS-003`), and see the budgets met; publish a change and see it served within 30 seconds worldwide.

*Status:* partial. Live pages are served at `/site` with `no-store`, reading D1 on every request; no edge cache or performance budget.

#### HOST-002 — The live site survives an admin outage.

Publishing writes a static snapshot of the live revision, so visitors keep getting the published site if the workspace, database or an integration is unavailable. Forms queue submissions and deliver them when service returns.

**Acceptance evidence:** Make the database unavailable on a deployed site; every live page still loads and a contact submission is accepted and appears in the inbox once the database returns.

*Status:* missing. Every public request reads D1.

#### HOST-003 — Updates without plugin maintenance.

Pane ships platform, security and template updates as signed releases the owner applies in one action (or automatically, if they choose), with a preview of what changes and a rollback. There are no third-party plugins to keep updated.

**Acceptance evidence:** Apply a release to a running installation, see the change list and a passing health check, then roll it back.

*Status:* missing. No in-product update channel.

#### HOST-004 — Transparent running cost in USD.

The workspace shows the site's Cloudflare usage this month and the estimated cost in USD against the owner's plan, with no feature that is locked behind an upsell. This answers incumbent complaints about add-on pricing.

**Acceptance evidence:** Generate traffic and storage on a test account and see usage and the USD estimate match the Cloudflare dashboard within 5%.

*Status:* missing. No usage or cost view.

### Search visibility

#### SEO-001 — Page titles and meta descriptions.

Every page, post and collection item has an editable search title and meta description, with sensible defaults and a search-result preview; the site name appears as the owner chooses.

**Acceptance evidence:** Set a title and description on a page and an item, see the preview, publish, and read them in each page's `<title>` and `<meta name="description">`.

*Status:* partial. Page headings and a site description are editable; the document title is the site name plus Pane, and there are no per-page meta descriptions.

#### SEO-002 — Redirect manager and slug-change redirects.

The owner manages 301 and 302 redirects one by one or by CSV import, and Pane offers a redirect automatically whenever a published URL changes or a page is deleted. Imported sites bring their old URL map (`IMPORT-005`).

**Acceptance evidence:** Rename a published slug and accept the offered redirect, import 200 redirects by CSV, and request each old URL to get the right status and target.

*Status:* missing. No redirects.

#### SEO-003 — Automatic sitemap and robots.txt.

Pane generates `sitemap.xml` (pages, posts, items, last-modified dates; excluding hidden, protected and noindex pages) and an editable `robots.txt`, updated on every publication.

**Acceptance evidence:** Publish a site with hidden, protected and noindex pages, validate the sitemap, and see only public indexable URLs listed; edit `robots.txt` and see it served.

*Status:* missing. No sitemap or robots.txt.

#### SEO-004 — Canonical URLs and indexing controls.

Every page carries a canonical URL on the primary domain; the owner can mark a page noindex or set a custom canonical, and preview and staging addresses are always noindex.

**Acceptance evidence:** Read canonical tags across `www` and apex, set one page noindex, and confirm previews send `noindex`.

*Status:* missing. No canonical or robots meta.

#### SEO-005 — Structured data for local businesses.

Pane emits JSON-LD from the site's business facts and collections: LocalBusiness (name, address, phone, opening hours, service area, price range), Service, Article, FAQPage, BreadcrumbList and Event, validated before publication.

**Acceptance evidence:** Publish a site with hours, services, FAQs and posts, and pass Google's Rich Results Test and the Schema.org validator on each page type.

*Status:* missing. No structured data.

#### SEO-006 — Social preview cards.

Every page has Open Graph and X card title, description and image, defaulting from the page and brand kit (`STYLE-004`), with a preview in the editor.

**Acceptance evidence:** Share a page URL into the Facebook Sharing Debugger and an X card validator and see the chosen title, description and image.

*Status:* missing. No social metadata.

#### SEO-007 — Google Search Console and Bing Webmaster Tools.

The owner connects Google Search Console and Bing Webmaster Tools: Pane verifies the domain, submits the sitemap, and shows queries, clicks, impressions and indexing problems per page in the workspace.

**Acceptance evidence:** Connect a test property, see verification succeed and the sitemap submitted, and see per-page clicks and impressions imported for the last 28 days.

*Status:* missing. No search console connection.

#### SEO-008 — Google Business Profile consistency.

The owner connects their Google Business Profile. Pane compares its name, address, phone, hours and holiday hours with the site and shows differences; the owner chooses which is right and Pane updates the other with their approval.

**Acceptance evidence:** Connect a test profile whose holiday hours differ from the site, see the difference listed, approve the site's version and see the profile updated.

*Status:* missing. No Google Business Profile connection.

#### SEO-009 — Per-page search checks.

Before publication the editor lists search problems per page: missing or duplicate titles and descriptions, missing alt text, broken internal links, noindex mistakes and very large images.

**Acceptance evidence:** Publish a draft with a duplicate title, a broken internal link and a missing alt text, and see each listed with a link to fix it.

*Status:* missing. No search checks.

### Forms and enquiries

#### FORM-001 — Form builder with multiple forms.

The owner builds any number of forms (contact, quote request, job application, event registration) with text, email, US phone, address, choice, date, file upload and consent fields, places them on any page, and sets each form's confirmation message or redirect. Uploaded files go to private storage with size and type limits.

**Acceptance evidence:** Build a quote form with a file upload and a US phone field, place it on two pages, submit it with a 5 MB PDF, and see the submission and file in the inbox; an oversized or wrong-type file is refused.

*Status:* partial. One fixed contact form (name, email, message); no form builder or file upload.

#### FORM-002 — Spam protection.

Every form is protected by a hidden honeypot, per-form rate limits and Cloudflare Turnstile, without image puzzles for real visitors. Rejected spam is counted and can be reviewed, never silently mixed into the inbox.

**Acceptance evidence:** Submit with the honeypot filled, in a burst over the limit and with a failed Turnstile token; each is refused or quarantined and counted, while a normal submission arrives.

*Status:* partial. Honeypot and per-minute limits exist but no Turnstile, no spam review and no test that a filled honeypot or a burst is refused.

#### FORM-003 — Enquiry email to named recipients and reply.

Each form notifies named recipients by email (sent through the installation's mail relay or the business's Google Workspace or Microsoft 365 account) with the sender as Reply-To, so the owner replies from Gmail or Outlook. The workspace shows each notification's provider acceptance separately from the stored enquiry, and an owner can also reply from the inbox.

**Acceptance evidence:** Submit a form and see the notification accepted by the provider edge with Reply-To set; reply from the inbox and see the reply recorded on the enquiry; a failed send is shown as failed, with the enquiry kept.

*Status:* partial. Enquiries appear in the workspace inbox only; no notification email or reply.

#### FORM-004 — Automatic acknowledgement to the sender.

Each form can send the visitor an acknowledgement email with the owner's wording and expected response time.

**Acceptance evidence:** Enable an acknowledgement, submit, and see the sender's message accepted by the provider edge with the configured wording.

*Status:* missing. No outbound email from forms.

#### FORM-005 — Lead routing to Orbit, HubSpot and signed webhooks.

Each form routes submissions to Orbit, HubSpot or a signed HTTPS webhook (Zapier, Crank or the buyer's own endpoint), with field mapping, retries with backoff, and a visible per-submission delivery state (delivered, retrying, failed) that never hides the stored inbox copy.

**Acceptance evidence:** Route a form to Orbit and to HubSpot test accounts and to a webhook that fails twice then succeeds; see the contact created in each CRM, the webhook signature verify, and the delivery state per submission.

*Status:* missing. Submissions are stored locally only.

#### FORM-006 — Enquiry ownership, status and follow-up.

Each enquiry has an owner, a status (new, replied, booked, closed, spam) and a follow-up time. An enquiry with no reply after the owner's response window (default one business day in the business's time zone) is escalated to its owner and then the site owner.

**Acceptance evidence:** Assign an enquiry, leave another unanswered past the window, and see the reminder and escalation; mark one replied and see it leave the queue.

*Status:* missing. Enquiries have no owner or status.

#### FORM-007 — Submission export and Google Sheets.

Submissions export to CSV per form and date range, and a form can append each submission to a Google Sheet in the owner's Google Drive.

**Acceptance evidence:** Export a form's submissions to CSV, connect a Google Sheet, submit, and see the row appended.

*Status:* missing. No submission export beyond the installation archive.

#### FORM-008 — Consent capture for email and SMS.

A form can ask for marketing consent with the owner's wording, record the exact text, time and page, and pass it with the contact to Mango, Mailchimp or Orbit. SMS consent follows TCPA practice: a separate unchecked box naming the business and message frequency. Consent records are kept with the enquiry and travel in exports.

**Acceptance evidence:** Submit a form with email consent ticked and SMS consent unticked; see consent text, time and page recorded and only the email consent reach Mango or Mailchimp.

*Status:* missing. No consent fields.

### Bookings, checkout and connections

#### LINK-001 — Booking through Dial, Calendly or Acuity.

A booking block embeds Dial (first), Calendly or Acuity Scheduling inline or as a pop-up, passes the page and campaign as booking source, and reports completed bookings back to Pane's conversion goals (`STATS-002`) where the provider sends them.

**Acceptance evidence:** Embed Dial and Calendly on a service page, complete a test booking in each, and see the booking counted as a conversion for that page.

*Status:* missing. No booking embeds; the previous contract excluded bookings.

#### LINK-002 — Checkout through Stall, Stripe Payment Links or PayPal.

A buy or pay button and a product block hand visitors to Stall (first), a Stripe Payment Link or PayPal. Pane never handles card details; completed payments come back as conversions where the provider reports them. Sales tax is calculated by Stall or Stripe.

**Acceptance evidence:** Add a Stall product block and a Stripe Payment Link button, complete test-mode purchases, and see each counted as a conversion with no card data reaching Pane.

*Status:* missing. No checkout; the previous contract excluded payments.

#### LINK-003 — Newsletter signup through Mango or Mailchimp.

A signup block adds consenting visitors to an audience in Mango (first) or Mailchimp, with double opt-in when the owner chooses and CAN-SPAM details (business postal address) checked.

**Acceptance evidence:** Sign up through the block, confirm the double opt-in email, and see the contact in the Mango or Mailchimp audience with its consent record.

*Status:* missing. No newsletter signup.

#### LINK-004 — Zapier, Crank and outgoing webhooks.

Form submissions, publications and enquiry status changes are available as signed outgoing webhooks and as triggers in published Zapier and Crank apps.

**Acceptance evidence:** Connect a Zapier test zap and a Crank flow to form submission and publication triggers, fire each, and see the payload arrive signed.

*Status:* missing. No outgoing events.

#### LINK-005 — Connection health panel.

One panel lists every connected service (domain, mail, CRM, booking, checkout, analytics, search console, Google Business Profile, webhooks) with its state, last success, last failure and how to fix it.

**Acceptance evidence:** Break a CRM credential and a webhook endpoint and see both shown as failing with their last success and a fix action; repair them and see them recover.

*Status:* missing. No connections to show.

#### API-001 — Agent command helper and API.

Agents and scripts act through an authenticated helper and API with the same server permissions as the workspace: read status, prepare drafts, run imports and, for the owner, publish and roll back. Target: scoped API tokens per agent or integration, a read API for pages and collections, and every call recorded in the activity log (`AUDIT-001`).

**Acceptance evidence:** Run the helper's status, prepare and import commands as an admin with a private session file; see publish refused for the admin; create a scoped token and see a call outside its scope refused and logged.

*Status:* partial. The helper uses a copied session cookie and has no test; there are no scoped tokens and no read API.

### Analytics and reporting

#### STATS-001 — Traffic by page, source, device and campaign.

The workspace shows visits by page, day, referrer, device type, country or US state and UTM campaign, still without cookies or personal identifiers, and still not counting browsers that send Global Privacy Control or Do Not Track.

**Acceptance evidence:** Visit pages from a phone and a desktop with UTM tags and a referrer, then read the dashboard by page, source, device and campaign; a GPC visit is not counted.

*Status:* partial. Day and path counts only; no source, device, location or campaign.

#### STATS-002 — Conversion goals and click insights.

The owner sets goals (form submissions, bookings, checkouts, signups, phone-number and email clicks, outbound clicks) and sees conversions and conversion rate by page, source and campaign, plus a simple funnel from landing page to goal.

**Acceptance evidence:** Define a quote-form goal and a phone-click goal, complete each from a tagged campaign, and see them counted by page and campaign with a funnel.

*Status:* missing. No goals.

#### STATS-003 — Vane and Google Analytics 4 with consent.

The owner connects Vane (first) or Google Analytics 4. Vane runs cookie-free; GA4 loads only after consent where `PRIV-001` requires it.

**Acceptance evidence:** Connect Vane and see events arrive; connect GA4 and see it load only after consent and send page views and goals.

*Status:* missing. No analytics connections.

#### STATS-004 — Monthly owner report.

On the first business day of each month the owner receives a short report: visits, top pages, search clicks (`SEO-007`), enquiries and bookings by source, unanswered enquiries and open site problems.

**Acceptance evidence:** Advance the clock to a month boundary and see the report accepted by the mail provider with figures that match the dashboard.

*Status:* missing. No reports.

### Team, roles and activity

#### ROLE-001 — Roles for editors, authors and reporting.

Beyond owner, admin and member, the owner assigns editor (edits pages and collections, cannot publish), author (writes and submits own posts only), inbox (reads and replies to enquiries) and reporting (reads analytics) roles. Every role is enforced on the server (`ACCESS-001`).

**Acceptance evidence:** Invite one person per role and exercise every route as each; each sees and does only what its role allows.

*Status:* partial. Owner, admin and member only; no editor, author, inbox or reporting role.

#### ROLE-002 — Review requests and publish delegation.

The owner can delegate publishing to named people, for all pages or one folder or collection. A review request notifies the publisher by email and push (`MOBILE-002`), and every delegated publication records who approved it.

**Acceptance evidence:** Delegate the blog to an admin, have an author submit a post, approve it as the admin from a notification, and see the approval recorded under the admin.

*Status:* missing. Only the owner can publish.

#### ROLE-003 — Designer-to-client handover.

A designer or agency builds a site, transfers ownership to the business owner, and keeps a contributor role the owner can revoke at any time.

**Acceptance evidence:** Build a site as a designer, transfer ownership to a new owner, see the designer drop to editor, and revoke them.

*Status:* missing. Ownership cannot be transferred in the product.

#### AUDIT-001 — Activity log of every change.

One log records every edit, publication, rollback, setting change, connection change, import, erasure, role change and agent action (`AGENT-008`) with actor, time and subject. It is readable by the owner, exportable and survives erasure of the subject with the actor anonymized where required.

**Acceptance evidence:** Perform each kind of action, read the log in order, export it, erase a person and see their actor entries anonymized while the log remains.

*Status:* partial. Only publication and rollback approvals are recorded.

### Moving in from incumbents

#### IMPORT-001 — WordPress.com and WordPress import.

Pane imports a WordPress export (WXR XML) from WordPress.com or self-hosted WordPress: pages, posts, categories, tags, authors, featured images and media files fetched from their references, menus where present, and every old URL mapped for redirects. Shortcodes and plugin blocks it cannot render are listed, not dropped silently.

**Acceptance evidence:** Import a real WordPress.com export with 100 posts and media, review the plan and its exceptions, apply as an unpublished draft, and open every old URL on the new site through its redirect.

*Status:* missing. Only the documented static-site JSON imports (`MOVEIN-001`).

#### IMPORT-002 — Squarespace import.

Pane imports a Squarespace site from its WordPress-format export plus a crawl of the published site for content the export omits (most page layouts, galleries, products and events are listed for review), keeping the URL map.

**Acceptance evidence:** Import a test Squarespace site's export and crawl, review the listed omissions, apply, and check pages, blog posts, images and redirects.

*Status:* missing. No Squarespace import.

#### IMPORT-003 — Wix import.

Because Wix offers no full site export, Pane imports a Wix site by crawling its published pages and blog (and the blog's RSS) with the owner's proof of domain control, rebuilding pages from the content and keeping the URL map.

**Acceptance evidence:** Import a published Wix test site by crawl, review the mapping, apply, and compare page text, images, blog posts and redirects with the source.

*Status:* missing. No Wix import.

#### IMPORT-004 — Webflow, Framer and Durable import.

Pane imports Webflow and Framer CMS CSV exports (`CMS-007`) and their published pages by crawl, and Durable sites by crawl, with the same review, exceptions and URL map.

**Acceptance evidence:** Import a Webflow site with two collections and a Framer site, review exceptions, apply, and check items, pages and redirects.

*Status:* missing. No Webflow, Framer or Durable import.

#### IMPORT-005 — Migration report and URL map.

Every import shows, before anything is written, a report of what will map where, what will not (with reasons), every old URL and its new target, media that could not be fetched, and each form's old destination. Apply needs the report's fingerprint; undo works while the draft is unpublished (`MOVEIN-001`).

**Acceptance evidence:** Run an import with unsupported content and a broken image link; read the report, apply with its fingerprint, and undo.

*Status:* partial. A fingerprinted plan exists for the static JSON only; no URL map, media or form-destination report.

#### IMPORT-006 — Verified cutover with the old site kept.

Cutover is a checked step: Pane confirms the new site's pages, redirects, forms and lead routes work on a preview hostname, then switches the domain (`DOMAIN-001`) while the old site stays reachable until the owner closes it, and rolls the DNS back in one action if needed.

**Acceptance evidence:** Cut a test domain over from an old host, see pre-cutover checks pass, then roll back and forward again with mail unaffected.

*Status:* missing. No cutover.

### Portability, privacy and US norms

#### EXPORT-001 — Open-format site export.

Besides the installation archive (`BACKUP-001`), the owner exports content in open formats: WordPress WXR for pages and posts, CSV for each collection and form, a ZIP of original media, and a static HTML copy of the live site that runs on any host.

**Acceptance evidence:** Export a populated site in every format, import the WXR into WordPress, open the CSVs, and serve the static copy from a plain web server.

*Status:* partial. Only Pane's own installation archive exports.

#### PRIV-001 — Consent for analytics and third-party embeds.

Pane's own counting needs no consent. When the owner adds GA4, a pixel or a third-party embed, a consent banner appears with US-appropriate choices, Global Privacy Control is honored as an opt-out of sale and sharing, and nothing third-party loads before the choice.

**Acceptance evidence:** Add GA4 and a YouTube embed, visit with and without GPC, and see no third-party request before consent and none at all under GPC for GA4.

*Status:* partial. DNT and GPC are honored for Pane's own counts; there is no consent banner because there are no third-party embeds yet.

#### PRIV-002 — Person-level privacy requests.

For a CCPA or similar request, the owner finds everything stored about one email address (enquiries, consents, files, subscriber records and the CRM deliveries Pane made), exports it for the person and erases it in one action, with the erasure fenced against old backups (`ERASE-001`) and the downstream services listed for follow-up.

**Acceptance evidence:** Submit three forms as one person, run a request by email, export their data, erase it, and see every record gone, the fence in place and the CRM deliveries listed.

*Status:* partial. One message can be erased by ID; no lookup, export or erasure by person.

#### PRIV-003 — Policy and accessibility statement starters.

Pane offers starter privacy policy, terms and accessibility statement pages that list what this site actually collects and which services it connects, for the owner to review; they are clearly marked as starters, not legal advice.

**Acceptance evidence:** Connect GA4 and a CRM, generate the privacy policy starter, and see both services named; edit and publish it.

*Status:* missing. No policy pages.

#### PRIV-004 — Security headers on every page.

Workspace and live pages send a strict content security policy, frame protection, `nosniff`, a referrer policy and a permissions policy; the live site's policy widens only for embeds the owner added (`PAGE-008`).

**Acceptance evidence:** Read the headers on every page type and see the policy; add an embed and see only its host added.

*Status:* partial. Headers are set on every document but no test asserts them.

#### LOCALE-001 — US defaults.

The workspace and live site default to US English, the business's US time zone with daylight saving, US date and time formats, USD prices, US phone and address formats, and Sunday-start calendars; a business can change each.

**Acceptance evidence:** Set the time zone to America/Denver, and see workspace dates, scheduled times and opening hours in local US format with USD prices.

*Status:* missing. Workspace dates are formatted en-AU in UTC; there is no time zone setting.

### Owner mobile

#### MOBILE-001 — Responsive owner workspace on a phone.

Every workspace task works on a 390-wide phone browser: editing, previewing, approving, replying to enquiries and reading stats, with no horizontal scroll.

**Acceptance evidence:** Run the full browser journey at 390 wide, including the target editor, approvals and inbox replies, with no overflow and a passing accessibility run.

*Status:* partial. The current workspace is checked for overflow at 390 wide; the target editor, inbox replies and approvals on a phone are not built.

#### MOBILE-002 — Native iOS and Android owner app.

A native owner app sends push notifications for new enquiries, review requests and site problems, lets the owner reply, approve and publish, post to the blog with photos from the camera, and read stats. It uses the installation's own sign-in and holds no content offline beyond what the owner opens.

**Acceptance evidence:** Install the app on iOS and Android test devices, receive a push for a new enquiry, reply, approve a review request and publish a photo post.

*Status:* missing. No native app.

### Automation and follow-up

#### AUTO-001 — Form-triggered automations.

The owner sets rules on form submission: acknowledge the sender, notify people, create a follow-up task, post to Nook, Slack or Microsoft Teams, route to a CRM or tag the enquiry, with conditions on form and field values.

**Acceptance evidence:** Create a rule that posts quote requests over $5,000 to a Nook channel and tags them; submit two forms and see only the large one posted and tagged.

*Status:* missing. No automations.

#### AUTO-002 — Scheduled automations.

Time-based rules run on the owner's schedule in their US time zone: holiday-hour banners, recurring reminders to review stale pages, and expiring promotions.

**Acceptance evidence:** Schedule a holiday banner for Thanksgiving and a quarterly page-review reminder, advance the clock, and see both happen at local time.

*Status:* missing. No scheduler.

#### AUTO-003 — Share new posts to social accounts.

On publication a post can be shared to the business's connected Facebook Page, Instagram, LinkedIn Page or X account with owner-approved text.

**Acceptance evidence:** Connect a test Facebook Page and LinkedIn Page, publish a post with sharing on, and see each share created with its link.

*Status:* missing. No social connections.

#### AUTO-004 — Site problem alerts.

Pane alerts the owner when a form delivery fails, a connection breaks, a certificate or domain is near expiry, a page returns errors or links break, and can hand external uptime checks to Uptime.

**Acceptance evidence:** Break a webhook, expire a test certificate and add a broken link; see one alert per problem by email and push, and see Uptime monitors created for the live site on request.

*Status:* missing. No alerts.

### AI site building

#### AI-001 — Draft a whole site from business facts.

From the owner's business facts (name, services, service area, hours, prices, team, tone, photos), Pane drafts a complete site: pages, sections, collections, copy, menus, search titles and structured data, using the owner's photos or clearly marked placeholders. The result is an unpublished draft the owner previews and edits; nothing is published without approval, and no reviews, credentials or prices are invented.

**Acceptance evidence:** Enter facts for a test plumbing business, receive a draft site within two minutes, preview every page, find no invented reviews or prices, and publish after edits.

*Status:* missing. Base's AI module is present but not wired to any Pane feature.

#### AI-002 — Writing, alt text and translation assist.

In the editor, AI rewrites, shortens and adjusts the tone of selected text, drafts alt text for images, and translates pages into Spanish or other languages as separate draft pages; every suggestion is accepted or rejected by the editor.

**Acceptance evidence:** Rewrite a paragraph, draft alt text for five images and translate the home page to Spanish; accept some suggestions and reject others, and see only accepted text in the draft.

*Status:* missing. No AI features.

#### AI-003 — Search and content suggestions with approval.

AI reviews pages for search and clarity (titles, descriptions, headings, internal links, structured data gaps) and proposes edits as a draft the owner approves.

**Acceptance evidence:** Run the review on a weak page, see proposed titles, descriptions and links, accept two and publish.

*Status:* missing. No AI features.

#### AI-004 — AI collection and bulk content operations.

AI creates a collection schema from a description or a pasted list, fills items from source text the owner provides, and makes bulk edits (for example update every service's price range) as one reviewable draft.

**Acceptance evidence:** Paste a price list, see a services collection proposed and filled, then ask for a bulk change and approve the diff.

*Status:* missing. No AI features.

## Push further

Agents run the website for the owner, beyond what Framer, Webflow and Durable ship today: they build from verified facts, keep the site true, and measure its results in real enquiries and bookings. Each clause names what the agent does, on which data, and under what human control. No agent publishes, spends or contacts anyone outside the owner's grants.

### Agents that build and keep the site true

#### AGENT-001 — Interview the owner and build from verified facts.

*What the agent does:* Interviews the owner by chat or voice (on the web or the phone app) about the business, then checks each fact against sources the owner names: their Google Business Profile, existing website, Orbit services and Dial availability. It builds the draft site (`AI-001`) only from confirmed facts, marks each claim with its source, and asks about anything it could not confirm instead of guessing.

*Data:* The interview, the owner's connected profiles and existing site, and the business's own records in Orbit and Dial when connected.

*Human control:* The owner confirms every fact, offer, price and staff name, and approves the preview before publication. The agent cannot publish, invent reviews, credentials or prices, or contact anyone.

**Acceptance evidence:** Run the interview for a test business with a connected Google Business Profile that disagrees with one answer; see the conflict raised, each published claim traced to a source, and nothing live before the owner approves.

*Status:* missing. No agent; the interview, fact store and sourcing do not exist.

#### AGENT-002 — Keep business facts current across the site.

*What the agent does:* Watches for facts going stale: hours and holiday hours that differ from Google Business Profile, services or prices changed in Orbit, staff who left, seasonal promotions past their date, and pages not reviewed in six months. It drafts only the affected pages, items and redirects as one revision.

*Data:* Site revisions, collections, Google Business Profile (`SEO-008`), Orbit and Dial records, schedules (`CMS-005`).

*Human control:* Each change arrives as a draft with its reason and source; the owner previews and approves. Price and offer changes always need the owner, even when publishing is delegated.

**Acceptance evidence:** Change a service price in Orbit and holiday hours in the profile; see one draft that changes only the affected page, item and structured data, with sources, waiting for approval.

*Status:* missing. No fact watching.

#### AGENT-003 — Prove every enquiry reaches a person.

*What the agent does:* With the owner's permission, sends clearly labelled test submissions through each form on a schedule and checks the whole path: stored, notification accepted, CRM record created (`FORM-005`), booking handoff working. On a failure it identifies the broken step, files a repair task to the right person and re-checks after repair; it also flags real enquiries that have no owner or reply (`FORM-006`).

*Data:* Forms, delivery states, CRM and booking connection states, enquiry status.

*Human control:* The owner turns test submissions on, sets their schedule and label, and they are excluded from stats and CRM pipelines. The agent cannot pose as a customer to anyone outside the business or change a route without approval.

**Acceptance evidence:** Break the HubSpot connection; the next scheduled test finds it, names the failing step, notifies the owner, and passes after repair, with no test record left in reports.

*Status:* missing. Enquiries reach the workspace inbox (`INBOX-001`) but nothing checks delivery; no agent.

#### AGENT-004 — Recover lost search traffic and broken paths.

*What the agent does:* Watches Search Console clicks (`SEO-007`), 404s from old URLs, broken links and slow pages. When traffic to a page drops or an old URL starts failing, it explains the likely cause with evidence and drafts the fix: a redirect, a restored page, a better title or a smaller image.

*Data:* Search Console data, server 404 counts, link checks, Core Web Vitals (`HOST-001`), revision history.

*Human control:* Fixes are drafts the owner approves. The agent never promises rankings and reports uncertainty with each diagnosis.

**Acceptance evidence:** Delete a page that receives search clicks without a redirect; the agent reports the 404s with the lost clicks and drafts the redirect; approve it and see the 404s stop.

*Status:* missing. No search data or link checks.

#### AGENT-005 — Measure changes against real leads and bookings.

*What the agent does:* Joins page revisions with conversions (`STATS-002`): enquiries, bookings and purchases confirmed by Orbit, Dial, Stall or Stripe. It proposes a limited change (headline, form length, call-to-action) with a stated hypothesis, runs it as a before-and-after comparison or an A/B split, and reports the result with its confidence.

*Data:* Revisions, conversion goals, CRM and booking outcomes, traffic by source.

*Human control:* The owner approves each experiment, its traffic split and duration, and every live claim. The agent reports uncertainty, never treats clicks as revenue and ends an experiment the owner stops.

**Acceptance evidence:** Approve an A/B test of two contact-page headlines; see traffic split as approved, conversions counted from real form submissions, and a final report with confidence and a recommended winner the owner can publish.

*Status:* missing. Revisions and day counts exist but no conversion data or experiments.

#### AGENT-006 — Move a business off its old platform.

*What the agent does:* Reads the old site (`IMPORT-001` to `IMPORT-004`), proposes the page and collection mapping, rebuilds layouts it cannot import directly, tests every old URL's redirect and every form's lead route on a preview hostname, and prepares the cutover plan (`IMPORT-006`).

*Data:* The old site's export and published pages, its URL list, its form destinations and DNS records.

*Human control:* The owner reviews the migration report and every listed loss, proves domain control and chooses when to cut over and roll back. The old site stays live until the owner closes it.

**Acceptance evidence:** Migrate a test Squarespace site; see the mapping, the rebuilt pages, a redirect test with every old URL passing, form routes tested, and a cutover the owner approves and then rolls back once.

*Status:* missing. Only the reviewed static JSON move-in exists (`MOVEIN-001`).

#### AGENT-007 — Follow up unanswered enquiries under an approved policy.

*What the agent does:* Drafts replies to new enquiries from the site's facts and the owner's past replies, and sends the owner's approved holding reply when an enquiry passes the response window (`FORM-006`). Full help-desk work stays in HappyToHelp.

*Data:* Enquiries, the site's published facts, the owner's sent replies, booking availability from Dial.

*Human control:* The owner approves a response policy (which enquiries, what wording, when). Anything outside it is a draft for the owner. The agent never quotes a price, promises availability or sends marketing.

**Acceptance evidence:** Approve a holding-reply policy, leave a quote request unanswered past the window, and see the holding reply sent within policy while a draft full reply waits for the owner.

*Status:* missing. No reply drafting or sending.

#### AGENT-008 — Agent controls, budgets and audit.

*What the agent does:* Governs every agent above: each proposal arrives as a draft revision or a queued action with its reason and evidence, every action is recorded in the activity log (`AUDIT-001`), and each agent runs within a monthly USD budget for model and provider costs.

*Data:* The agents' proposals, actions and costs.

*Human control:* The owner turns each agent on or off, sets its budget and its permissions, and can undo any agent change in one action. When the budget is reached the agent stops and says so.

**Acceptance evidence:** Turn on two agents with a $5 budget, let one reach the budget, and see it stop with a notice; undo an agent's approved change and see the log record both.

*Status:* missing. No agents run inside Pane; outside agents use the command helper (`API-001`).

## Honest boundaries

- **Card processing, money movement and a full store.** Pane hands checkout to Stall, Stripe Payment Links or PayPal (`LINK-002`) and never holds card details or funds. Sales tax, refunds and inventory live there.
- **Domain registration, certificate authority and the delivery network.** The owner registers domains in their own Cloudflare Registrar account or keeps their registrar; Cloudflare issues certificates and serves traffic in the owner's account (`DOMAIN-001` to `DOMAIN-004`). Pane operates them for the owner and never holds a registration.
- **Business email hosting.** Mailboxes stay with Google Workspace or Microsoft 365; Pane preserves their DNS records (`DOMAIN-003`) and sends form mail through the installation relay or the owner's account.
- **Rebuilding neighbouring products.** CRM, booking, store, memberships billing, email marketing, help desk, surveys, chat and monitoring stay with the sibling or incumbent named in [Neighbouring products stay separate](#neighbouring-products-stay-separate), each with its connection status visible.
- **WordPress plugins and lossless import of every site.** Pane does not run WordPress plugins or themes. Imports bring content, media and URLs with every exception listed (`IMPORT-005`); a site that depends on a specialist plugin keeps that service through an embed, a connection or WordPress hosting.
- **Rankings, legal compliance and invented claims.** Pane provides search controls and agents that report evidence, not guaranteed rankings. Policy starters and accessibility checks support, but do not replace, the owner's own legal review. Pane never publishes invented reviews, credentials, staff or prices.
- **US first.** Defaults are US English, US time zones, USD and US formats (`LOCALE-001`); other locales and currencies are settings, and translated pages are drafts the owner approves (`AI-002`). No HIPAA business associate agreement is offered; a clinic keeps patient intake in its practice system (for example Balm) and links to it.

## Retained safety rules

The released security, erasure, audit and portability rules continue under every target clause: server-side authorization on every handler (`ACCESS-001`), canonical-origin mutations (`ACCESS-002`), immutable revisions with recorded approvals (`PUBLISH-001`, `PUBLISH-003`), idempotent public submissions (`INBOX-001`), cookie-free counting (`VISIT-001`), erasure committed with the portability fence (`ERASE-001`), journaled import undo (`MOVEIN-001`) and restore only into an empty installation (`BACKUP-001`). `/health` identifies the deployment and unknown paths return 404 (`HEALTH-001`). See README.md for public operations and SEED-COMMAND-CONTRACT.md for the shared command contract.

## Presentation and run site

The public run site is a static build of the picked Pane homepage, `/run` and Markdown documentation, with no installation sign-in links (`RUNSITE-001`). The installed `/` uses the shared Lobby; `/app` keeps its anchored workspace sections; the paper, cerulean and self-hosted Noto theme is shared with sign-in and setup (`LOBBY-001`). Previews use the public business site typography and an explicit draft banner; live business pages carry no Pane branding (`PRESENT-001`). Owner-approved homepage, interface and behavior are unchanged by this edition.

## Scope list mapping

How the owner-approved scope for Pane (16 October 2026) maps to clauses:

| Scope item | Clauses |
| --- | --- |
| Remove the five-page ceiling: a visual section/block editor with unlimited pages, navigation, responsive templates and site-wide brand styles | `PAGE-001` to `PAGE-011`, `STYLE-001` to `STYLE-004` |
| Custom domain connection with apex routing, SSL and clear DNS status, plus fast global hosting | `DOMAIN-001` to `DOMAIN-004`, `HOST-001` to `HOST-004` |
| CMS collections and a blog (services, team, articles, testimonials, projects) with scheduling and RSS | `CMS-001` to `CMS-008` |
| SEO toolkit: titles, descriptions, clean URLs, sitemap, redirects, canonical and structured data, social cards and Search Console | `SEO-001` to `SEO-009`, `PAGE-001` |
| Forms with spam protection that route leads to Orbit/HubSpot and email, plus Dial booking, Stall checkout and Mango signup embeds; analytics via Vane | `FORM-001` to `FORM-008`, `LINK-001` to `LINK-005`, `STATS-001` to `STATS-004` |
| Media library with image optimization, and an AI site builder that drafts the site from business facts | `MEDIA-001` to `MEDIA-004`, `AI-001` to `AI-004` |
| Push further: an agent interviews the owner and builds the site from verified facts, then watches for outdated services, broken forms, lost search traffic and unanswered enquiries, proposing changes through preview and approval and measuring the leads and bookings they produce | `AGENT-001` to `AGENT-008` |

The category inventory's table-stakes features and integrations are each covered by a clause above: contributor permissions (`ROLE-001`), revision rollback (`PUBLISH-004`), content export (`EXPORT-001`), Google Maps, YouTube and Vimeo (`MEDIA-004`), Gmail and Google Workspace (`FORM-003`, `DOMAIN-003`), Google Drive and Sheets (`FORM-007`), Zapier (`LINK-004`), automatic platform updates (`HOST-003`) and form acknowledgements and staff tasks (`FORM-004`, `AUTO-001`).

## Homepage claims

No desk homepage claims file (`CLAIMS.md`) exists for Pane on 17 October 2026. When the desk publishes one, each claim maps to a clause in a table here; a claim without a clause becomes a clause.

## Status

Judged from the code and tests at commit `80f6943012240b0240eafd9e5763b992bb327578` (17 October 2026).

| Clauses | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Published | 11 | 5 | 0 | 16 |
| Target and push further | 0 | 23 | 73 | 96 |
| All | 11 | 28 | 73 | 112 |

| Clause | Title | Kind | Status | Evidence | Gap |
| --- | --- | --- | --- | --- | --- |
| `ACCESS-001` | Server-side role authorization | published | done | `src/pane/handler.ts`; `tests/pane.test.mjs` |  |
| `ACCESS-002` | Canonical-origin mutations | published | partial | `src/pane/handler.ts`; `src/pane/public.ts`; `tests/pane.test.mjs` | Only a cross-origin private prepare is tested; no test posts a cross-origin contact message or visit. |
| `PUBLISH-001` | Immutable complete revisions | published | done | `src/pane/content.ts`; `tests/pane.test.mjs` |  |
| `PUBLISH-002` | Private draft preview | published | done | `src/pane/handler.ts`; `src/pane/public-view.ts`; `tests/pane.test.mjs` |  |
| `PUBLISH-003` | Owner-approved atomic publication | published | done | `src/pane/content.ts`; `tests/pane.test.mjs`; `scripts/browser-journey.mjs` |  |
| `PUBLISH-004` | One-action rollback | published | done | `src/pane/content.ts`; `tests/pane.test.mjs`; `scripts/browser-journey.mjs` |  |
| `INBOX-001` | Durable, escaped and idempotent contact submissions | published | done | `src/pane/public.ts`; `tests/pane.test.mjs` |  |
| `VISIT-001` | Cookie-free aggregate visit counts | published | done | `src/pane/public.ts`; `tests/pane.test.mjs` |  |
| `MOVEIN-001` | Reviewed static-site move-in with guarded undo | published | done | `src/pane/imports.ts`; `tests/pane.test.mjs`; `docs/MOVE-IN.md` |  |
| `BACKUP-001` | Export and restore into an empty installation | published | done | `scripts/pane-policy.mjs`; `tests/pane.test.mjs`; `docs/BACKUP-RESTORE.md` |  |
| `ERASE-001` | Message erasure fenced against old backups | published | done | `src/pane/handler.ts`; `tests/pane.test.mjs` |  |
| `HEALTH-001` | Deployment health and unknown paths | published | partial | `src/server.ts`; `src/pane/public.ts` | No Pane test reads `/health` or an unknown installed path; only the run-site 404 is tested. |
| `DEPLOY-001` | Install on the owner's Cloudflare account | published | partial | `deploy.json`; `wrangler.jsonc` | No recorded owner-account deploy acceptance; only local build and dry-run validation. |
| `RUNSITE-001` | Public run site and documentation | published | done | `tests/site.test.mjs`; `docs/site.json` |  |
| `LOBBY-001` | Shared Lobby, workspace and theme | published | partial | `src/server.ts`; `src/pane/views.ts`; `scripts/browser-journey.mjs` | The browser journey covers sign-in, setup and `/app` but no Pane test opens the installed `/` Lobby. |
| `PRESENT-001` | Labelled previews and unbranded live pages | published | partial | `src/pane/public-view.ts`; `src/pane/views.ts` | Live pages append the Pane name to the document title. |
| `PAGE-001` | Unlimited pages, folders and clean URLs | target | partial | `src/pane/content.ts` | Exactly five fixed slugs (home, about, services, hours, contact); no page creation, folders or slug editing. |
| `PAGE-002` | Visual section and block editor | target | partial | `src/pane/views.ts`; `src/pane/handler.ts` | Content is edited as name, description and a pages JSON text field; no visual canvas, sections or blocks. |
| `PAGE-003` | Navigation menus, header and footer | target | partial | `src/pane/public-view.ts` | Navigation lists the five fixed pages; no menu editing, dropdowns, buttons or footer links. |
| `PAGE-004` | Reusable sections and global components | target | missing |  | No components; pages are plain text. |
| `PAGE-005` | Device previews and responsive layout control | target | partial | `src/pane/handler.ts`; `src/pane/public-view.ts` | One responsive preview; no width switcher or per-device layout settings. |
| `PAGE-006` | Autosave, undo and safe concurrent editing | target | missing |  | Drafts are created only by an explicit whole-site prepare; no autosave, undo or conflict detection. |
| `PAGE-007` | Page status and review requests | target | partial | `src/pane/content.ts`; `src/pane/handler.ts` | Whole-site drafts and owner approval only; no per-page status or review request. |
| `PAGE-008` | Custom code, embeds and CSS | target | missing |  | No custom code or embed support; the public CSP allows only same-origin scripts. |
| `PAGE-009` | Accessible output by default | target | partial | `src/pane/views.ts`; `src/pane/public-view.ts`; `scripts/browser-journey.mjs` | Skip link and labelled contact fields exist; no alt-text, heading or contrast checks and no automated accessibility test. |
| `PAGE-010` | Duplicate pages and starter layouts | target | missing |  | No page creation. |
| `PAGE-011` | Password-protected and member-only pages | target | missing |  | Every live page is public. |
| `STYLE-001` | Responsive templates for US local businesses | target | partial | `public/pane.css`; `src/pane/public-view.ts` | One fixed responsive layout; no template catalogue. |
| `STYLE-002` | Site-wide brand styles | target | partial | `public/pane.css` | Styles are fixed in source CSS; no owner style controls. |
| `STYLE-003` | Switch templates without rebuilding content | target | missing |  | No templates to switch between. |
| `STYLE-004` | Logo, favicon and brand kit | target | missing |  | The live header shows the business name as text only. |
| `MEDIA-001` | Media library with alt text and usage | target | missing |  | No uploads or media storage. |
| `MEDIA-002` | Responsive image optimization | target | missing |  | No images. |
| `MEDIA-003` | Basic image editing | target | missing |  | No images. |
| `MEDIA-004` | Video, map and social embeds | target | missing |  | No embeds. |
| `CMS-001` | Structured collections with typed fields | target | missing |  | No collections. |
| `CMS-002` | Collection template pages with item URLs | target | missing |  | No collections. |
| `CMS-003` | Collection lists and filters on any page | target | missing |  | No collections. |
| `CMS-004` | Blog with categories, tags and authors | target | missing |  | No blog. |
| `CMS-005` | Scheduled publishing and expiry | target | missing |  | Publication is immediate only. |
| `CMS-006` | RSS feed and new-post notifications | target | missing |  | No feeds or subscribers. |
| `CMS-007` | Collection CSV import and export | target | missing |  | Only the static-site JSON move-in exists (`MOVEIN-001`). |
| `CMS-008` | Site search | target | missing |  | No site search. |
| `DOMAIN-001` | Connect a custom domain with apex and www | target | missing |  | The business site is served only at `/site` on the Worker origin; no domain connection. |
| `DOMAIN-002` | Managed HTTPS and certificate status | target | missing |  | No domain or certificate handling beyond the Worker's default hostname. |
| `DOMAIN-003` | DNS status that preserves business email | target | missing |  | No DNS reading or writing. |
| `DOMAIN-004` | Domain registration and transfer guidance | target | missing |  | No domain guidance. |
| `HOST-001` | The business site at the domain root, fast | target | partial | `src/pane/public.ts` | Live pages are served at `/site` with `no-store`, reading D1 on every request; no edge cache or performance budget. |
| `HOST-002` | The live site survives an admin outage | target | missing |  | Every public request reads D1. |
| `HOST-003` | Updates without plugin maintenance | target | missing |  | No in-product update channel. |
| `HOST-004` | Transparent running cost in USD | target | missing |  | No usage or cost view. |
| `SEO-001` | Page titles and meta descriptions | target | partial | `src/pane/content.ts`; `src/pane/views.ts` | Page headings and a site description are editable; the document title is the site name plus Pane, and there are no per-page meta descriptions. |
| `SEO-002` | Redirect manager and slug-change redirects | target | missing |  | No redirects. |
| `SEO-003` | Automatic sitemap and robots.txt | target | missing |  | No sitemap or robots.txt. |
| `SEO-004` | Canonical URLs and indexing controls | target | missing |  | No canonical or robots meta. |
| `SEO-005` | Structured data for local businesses | target | missing |  | No structured data. |
| `SEO-006` | Social preview cards | target | missing |  | No social metadata. |
| `SEO-007` | Google Search Console and Bing Webmaster Tools | target | missing |  | No search console connection. |
| `SEO-008` | Google Business Profile consistency | target | missing |  | No Google Business Profile connection. |
| `SEO-009` | Per-page search checks | target | missing |  | No search checks. |
| `FORM-001` | Form builder with multiple forms | target | partial | `src/pane/public-view.ts`; `src/pane/public.ts` | One fixed contact form (name, email, message); no form builder or file upload. |
| `FORM-002` | Spam protection | target | partial | `src/pane/public.ts`; `src/pane/public-view.ts` | Honeypot and per-minute limits exist but no Turnstile, no spam review and no test that a filled honeypot or a burst is refused. |
| `FORM-003` | Enquiry email to named recipients and reply | target | partial | `src/pane/views.ts`; `src/pane/data.ts` | Enquiries appear in the workspace inbox only; no notification email or reply. |
| `FORM-004` | Automatic acknowledgement to the sender | target | missing |  | No outbound email from forms. |
| `FORM-005` | Lead routing to Orbit, HubSpot and signed webhooks | target | missing |  | Submissions are stored locally only. |
| `FORM-006` | Enquiry ownership, status and follow-up | target | missing |  | Enquiries have no owner or status. |
| `FORM-007` | Submission export and Google Sheets | target | missing |  | No submission export beyond the installation archive. |
| `FORM-008` | Consent capture for email and SMS | target | missing |  | No consent fields. |
| `LINK-001` | Booking through Dial, Calendly or Acuity | target | missing |  | No booking embeds; the previous contract excluded bookings. |
| `LINK-002` | Checkout through Stall, Stripe Payment Links or PayPal | target | missing |  | No checkout; the previous contract excluded payments. |
| `LINK-003` | Newsletter signup through Mango or Mailchimp | target | missing |  | No newsletter signup. |
| `LINK-004` | Zapier, Crank and outgoing webhooks | target | missing |  | No outgoing events. |
| `LINK-005` | Connection health panel | target | missing |  | No connections to show. |
| `API-001` | Agent command helper and API | target | partial | `scripts/pane.mjs`; `docs/AGENT.md` | The helper uses a copied session cookie and has no test; there are no scoped tokens and no read API. |
| `STATS-001` | Traffic by page, source, device and campaign | target | partial | `src/pane/public.ts`; `tests/pane.test.mjs` | Day and path counts only; no source, device, location or campaign. |
| `STATS-002` | Conversion goals and click insights | target | missing |  | No goals. |
| `STATS-003` | Vane and Google Analytics 4 with consent | target | missing |  | No analytics connections. |
| `STATS-004` | Monthly owner report | target | missing |  | No reports. |
| `ROLE-001` | Roles for editors, authors and reporting | target | partial | `src/pane/handler.ts`; `tests/pane.test.mjs` | Owner, admin and member only; no editor, author, inbox or reporting role. |
| `ROLE-002` | Review requests and publish delegation | target | missing |  | Only the owner can publish. |
| `ROLE-003` | Designer-to-client handover | target | missing |  | Ownership cannot be transferred in the product. |
| `AUDIT-001` | Activity log of every change | target | partial | `src/pane/data.ts`; `src/pane/content.ts` | Only publication and rollback approvals are recorded. |
| `IMPORT-001` | WordPress.com and WordPress import | target | missing |  | Only the documented static-site JSON imports (`MOVEIN-001`). |
| `IMPORT-002` | Squarespace import | target | missing |  | No Squarespace import. |
| `IMPORT-003` | Wix import | target | missing |  | No Wix import. |
| `IMPORT-004` | Webflow, Framer and Durable import | target | missing |  | No Webflow, Framer or Durable import. |
| `IMPORT-005` | Migration report and URL map | target | partial | `src/pane/imports.ts`; `tests/pane.test.mjs` | A fingerprinted plan exists for the static JSON only; no URL map, media or form-destination report. |
| `IMPORT-006` | Verified cutover with the old site kept | target | missing |  | No cutover. |
| `EXPORT-001` | Open-format site export | target | partial | `scripts/pane-policy.mjs` | Only Pane's own installation archive exports. |
| `PRIV-001` | Consent for analytics and third-party embeds | target | partial | `src/pane/public.ts`; `tests/pane.test.mjs` | DNT and GPC are honored for Pane's own counts; there is no consent banner because there are no third-party embeds yet. |
| `PRIV-002` | Person-level privacy requests | target | partial | `src/pane/handler.ts`; `tests/pane.test.mjs` | One message can be erased by ID; no lookup, export or erasure by person. |
| `PRIV-003` | Policy and accessibility statement starters | target | missing |  | No policy pages. |
| `PRIV-004` | Security headers on every page | target | partial | `src/pane/views.ts` | Headers are set on every document but no test asserts them. |
| `LOCALE-001` | US defaults | target | missing |  | Workspace dates are formatted en-AU in UTC; there is no time zone setting. |
| `MOBILE-001` | Responsive owner workspace on a phone | target | partial | `scripts/browser-journey.mjs` | The current workspace is checked for overflow at 390 wide; the target editor, inbox replies and approvals on a phone are not built. |
| `MOBILE-002` | Native iOS and Android owner app | target | missing |  | No native app. |
| `AUTO-001` | Form-triggered automations | target | missing |  | No automations. |
| `AUTO-002` | Scheduled automations | target | missing |  | No scheduler. |
| `AUTO-003` | Share new posts to social accounts | target | missing |  | No social connections. |
| `AUTO-004` | Site problem alerts | target | missing |  | No alerts. |
| `AI-001` | Draft a whole site from business facts | target | missing |  | Base's AI module is present but not wired to any Pane feature. |
| `AI-002` | Writing, alt text and translation assist | target | missing |  | No AI features. |
| `AI-003` | Search and content suggestions with approval | target | missing |  | No AI features. |
| `AI-004` | AI collection and bulk content operations | target | missing |  | No AI features. |
| `AGENT-001` | Interview the owner and build from verified facts | push-further | missing |  | No agent; the interview, fact store and sourcing do not exist. |
| `AGENT-002` | Keep business facts current across the site | push-further | missing |  | No fact watching. |
| `AGENT-003` | Prove every enquiry reaches a person | push-further | missing |  | Enquiries reach the workspace inbox (`INBOX-001`) but nothing checks delivery; no agent. |
| `AGENT-004` | Recover lost search traffic and broken paths | push-further | missing |  | No search data or link checks. |
| `AGENT-005` | Measure changes against real leads and bookings | push-further | missing |  | Revisions and day counts exist but no conversion data or experiments. |
| `AGENT-006` | Move a business off its old platform | push-further | missing |  | Only the reviewed static JSON move-in exists (`MOVEIN-001`). |
| `AGENT-007` | Follow up unanswered enquiries under an approved policy | push-further | missing |  | No reply drafting or sending. |
| `AGENT-008` | Agent controls, budgets and audit | push-further | missing |  | No agents run inside Pane; outside agents use the command helper (`API-001`). |
