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

- **Build visually.** Unlimited pages with folders, clean URLs and an editable not-found page, a section and block editor with grid placement, column ratios, section backgrounds (image, color, video), spacing and image cropping, a separate phone layout, galleries with lightbox, menus with social icons, reusable components, pop-ups, autosave, page status and review, custom code, a coming-soon gate, accessible output, a trash with single page and post restore and a full block catalog whose text carries heading levels, formatting, lists and links to pages, anchors, files, URLs, email, phone and text messages (`PAGE-001` to `PAGE-015`), on responsive templates with site-wide brand styles that survive a template switch (`STYLE-001` to `STYLE-004`), with a media library that optimizes images and embeds video and maps (`MEDIA-001` to `MEDIA-004`).
- **Publish content.** CMS collections for services, team, projects, testimonials, locations, FAQs and menus with template pages, lists, a blog whose posts and rich-text fields use the same block editor as pages, moderated comments, an events calendar, scheduling, RSS and podcast feeds, CSV import and site search (`CMS-001` to `CMS-011`), always through immutable revisions, preview, approval and one-action rollback (`PUBLISH-001` to `PUBLISH-004`).
- **Be found.** A custom domain at apex and `www`, plus alias domains, with managed HTTPS that keeps the business's email working, mailboxes and registrar email forwarding alike, fast edge hosting that survives an admin outage, updates without plugin upkeep, a visible USD running cost and an install from the browser with no terminal (`DOMAIN-001` to `DOMAIN-005`, `HOST-001` to `HOST-005`); titles, descriptions, redirects, sitemap, canonical URLs, local-business structured data, social cards, Search Console, Bing, Google Business Profile and multilingual sites with `hreflang` (`SEO-001` to `SEO-010`).
- **Turn visitors into business.** Forms with spam protection, email notification and reply, acknowledgments, CRM routing to Orbit or HubSpot, enquiry ownership and follow-up, Google Sheets export and consent capture (`FORM-001` to `FORM-008`); booking, checkout, newsletter and automation connections with a health panel (`LINK-001` to `LINK-005`, `API-001`); traffic, conversion goals, Vane or GA4, Meta Pixel and Google Ads conversions on those goals and a monthly report (`STATS-001` to `STATS-005`); form-triggered and scheduled automations, social sharing and problem alerts (`AUTO-001` to `AUTO-004`).
- **Run it as a team, anywhere.** Owner, admin, editor, author, inbox and reporting roles, delegated publishing, designer handover, passkeys and two-step sign-in and a full activity log (`ACCESS-*`, `ROLE-001` to `ROLE-004`, `AUDIT-001`); a phone-ready workspace and native iOS and Android owner apps (`MOBILE-001`, `MOBILE-002`).
- **Move in and out.** Imports from WordPress.com, Squarespace, Wix, Webflow, Framer and Durable with a migration report, URL map, comments, events, enquiry and subscriber history and verified cutover (`MOVEIN-001`, `IMPORT-001` to `IMPORT-007`); open-format exports, backups, person-level privacy requests, US policy starters, security headers and US defaults (`BACKUP-001`, `ERASE-001`, `EXPORT-001`, `PRIV-001` to `PRIV-004`, `LOCALE-001`).
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

### How to read this contract

- **Published clauses** are the `- **ID — Title.**` bullets in [Released guarantees](#released-guarantees). The previous contract and ACCEPTANCE.md already promised them; this edition gives them IDs and keeps every guarantee, widening only where a target clause names the change.
- **Target clauses** are the `#### ID — Title.` headings in [Target clauses](#target-clauses), and **push-further clauses** are those in [Push further](#push-further). They are binding product requirements; each carries its status beside it.
- **Status** is judged from the code and tests at commit `4d8d9f91886016ca078a9f5d38625a04843c5c24` (21 October 2026). `done` means the behavior ships and a cited test or journey exercises it; `partial` means some of it ships, or it ships without a test; `missing` means there is no implementation. Status is a build-planning judgment, not acceptance.

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

- **LOBBY-001 — Shared Lobby, workspace and theme.** The installed `/` is the shared Lobby; `/app` keeps its anchored workspace sections; the fuchsia (`--pn-fuchsia: #f5026f`, with `--pn-action: #e8176e` actions) and self-hosted Figtree theme is shared across `/`, `/signin`, `/setup` and `/app`. **Acceptance evidence:** Open `/`, `/signin`, `/setup` and `/app` at 1440 and 390 wide and see the shared theme, the workspace anchors and no horizontal overflow.

- **PRESENT-001 — Labeled previews and unbranded live pages.** Previews use the business site's typography with an explicit draft banner. Live business pages carry the business's name only: no Pane branding in the page, title, footer or metadata. **Acceptance evidence:** Open a preview and see the banner; open every live page and find no Pane name or mark in the HTML, including `<title>`.

## Target clauses

The whole job a Squarespace, Wix or WordPress.com buyer needs on the day they switch. Each clause states the behavior, its acceptance evidence and its current status.

### Pages and the visual editor

#### PAGE-001 — Unlimited pages, folders and clean URLs.

An editor adds, renames, reorders, hides and deletes any number of pages, groups them in folders, and sets each page's clean URL slug. The home page is chosen, not fixed. Deleting or renaming a published page offers a redirect (`SEO-002`). The five-page ceiling is removed; the five starter pages become a template (`STYLE-001`). The not-found page is an ordinary editable page (heading, text, search box, links, any section) that the live site serves for every unknown URL with HTTP status 404.

**Acceptance evidence:** Create 40 pages in three folders through the editor, rename two slugs, delete one, publish, and open every URL; renamed and deleted pages answer 301 to the chosen targets, and the revision snapshot holds all 40. Edit the not-found page, publish, request an unknown URL and see the edited page with status 404.

*Status:* done. Stable page identities and immutable whole-site revisions support any page inventory, folders, clean nested URLs, ordering, hiding, chosen home and deletion. Deleted entries retain their content in the snapshot. Retired published URLs offer explicitly accepted redirects before publication. The chosen not-found page uses the ordinary page renderer for heading, text, search box, links and embeds, with HTTP 404; PAGE-002 and PAGE-014 inherit that renderer for future sections. The organizer uses PAGE-006 autosave, five-step undo/redo, durable reopen and explicit conflict comparison/copy/latest selection.

#### PAGE-002 — Visual section and block editor with layout controls.

Pages are built visually from sections (hero, text, image, gallery, columns, list, testimonials, pricing, FAQ, contact, map, call-to-action) and the blocks inside them, drawn from the block catalog of `PAGE-014`, whose text blocks carry the headings, formatting, lists and links that clause states. An editor adds, moves by drag or keyboard, duplicates and deletes sections and blocks, and edits text in place on the page as it will look. New sections and blocks start from the site's styles (`STYLE-002`), and the editor then controls the layout of each one: blocks are placed and resized on a 12-column grid (column span, row placement, overlap order) with left, center or right alignment and vertical alignment; a columns section sets its column ratio (for example 1:1, 1:2, 2:1 or 1:1:1) and gap; each section sets its background (a color from the palette or any hex color, an image with a focal point and overlay opacity, or a muted looping background video from the media library or a YouTube or Vimeo link, with a still image shown while it loads, under reduced motion and on data saver), its minimum height (auto, small, medium, large or full screen) and its top and bottom padding; and an image block is cropped to a chosen aspect ratio (original, 1:1, 4:3, 3:2, 16:9 or free) around its focal point (`MEDIA-003`). Every control is reachable by keyboard and every override can be reset to the style default.

**Acceptance evidence:** Build a services page with a 2:1 columns section, an image block cropped to 4:3, a block spanning columns 2 to 7 and right-aligned, a section with an image background and focal point, a section with a background video and a section with a hex background color and large padding, using drag and keyboard on a phone and a desktop browser; then publish. A browser test reads every block's bounding box in the editor canvas and on the live page at 1440 and 390 wide: each box matches in position and size within 2 CSS pixels, and a screenshot comparison of canvas and live page differs in no more than 0.5% of pixels (editor chrome masked). Under `prefers-reduced-motion` the video section shows its still image.

*Status:* partial. Content is edited as name, description and a pages JSON text field; no visual canvas, sections, blocks, grid placement, column ratios, section backgrounds, padding or image cropping.

#### PAGE-003 — Navigation menus, header and footer.

The owner edits the main menu (order, labels, dropdown groups, external links, a call-to-action button), a footer with business details and secondary links, and a mobile menu. Hidden pages stay out of menus. The header and footer can each show social icons linking to the business's Facebook, Instagram, LinkedIn, X, YouTube, TikTok, Yelp and Google Business Profile pages, entered once in the brand kit (`STYLE-004`), each with an accessible name.

**Acceptance evidence:** Build a menu with two dropdowns, an external link and a Book button, hide one page, add Instagram, Facebook and Yelp links to the brand kit with icons in header and footer, publish, and use the menu and icons with a mouse, keyboard and a 390-wide phone; each icon link has an accessible name and opens its profile.

*Status:* done. Revisioned menus support ordered labels, dropdown groups, external links and CTA buttons; footer details/secondary links and mobile disclosures share the published snapshot. Hidden pages leave every menu. Brand-kit social profiles are entered once and rendered as named icons in both header and footer; STYLE-004 image uploads and SEO-005 sameAs inherit these fields.

#### PAGE-004 — Reusable sections and global components.

An editor saves a section as a reusable component (an announcement bar, a contact block, a promotion). Changing it once updates every page that uses it, in the next revision, and the editor shows where it is used.

**Acceptance evidence:** Place one component on five pages, edit it once, preview all five changed, and detach one copy that then stays unchanged.

*Status:* missing. No components; pages are plain text.

#### PAGE-005 — Device previews and a separate mobile layout.

The editor and preview switch between desktop, tablet and phone widths. Pane derives a phone layout automatically by stacking each section's blocks in reading order; the editor can then arrange the phone layout separately (move, resize and reorder blocks on the phone grid, change a section's height and padding, hide a block or section on phones) without changing desktop, and changes on desktop never move an arranged phone block. The editor marks which blocks have phone overrides and can reset them.

**Acceptance evidence:** Preview a draft at 1440, 768 and 390 wide from the editor; in the phone view move a block above another, resize a block, reduce a section's padding and hide one section; publish. On the live page the section is absent at 390 and present at 1440, and a browser test reads block bounding boxes in the editor's phone view and on the live page at 390 wide (and the desktop view and live page at 1440) and finds each within 2 CSS pixels in position and size; the desktop layout is unchanged from before the phone edits.

*Status:* partial. One responsive preview; no width switcher, separate phone layout or per-device settings.

#### PAGE-006 — Autosave, undo and safe concurrent editing.

Edits save as a draft continuously, an editor can undo and redo within a session, and two editors on the same page never silently overwrite each other: the second sees the other's change and merges or keeps their own copy. Every future page or body editor introduced by `PAGE-001`, `PAGE-002` or `CMS-011` inherits these requirements before it ships.

**Acceptance evidence:** Edit, close the tab and reopen to find the draft kept; undo and redo five steps; edit one page from two browsers and see the conflict surfaced, never lost.

*Status:* done. The page editor automatically prepares immutable drafts, keeps a session undo/redo history, and compares the opened revision atomically before saving. Conflicts retain the current fields, show the newer version and offer a merged draft, a downloaded copy or the latest draft. New editor doors introduced by `PAGE-001`, `PAGE-002` and `CMS-011` inherit this obligation before they ship.

#### PAGE-007 — Page status and review requests.

Each page and post carries draft, needs review, scheduled or published status. An editor sends a page for review; the owner (or a delegated publisher, `ROLE-002`) approves it from the workspace or a notification. Publishing one page leaves other unfinished drafts unpublished, while every publication still creates an immutable whole-site revision (`PUBLISH-001`).

**Acceptance evidence:** Edit two pages, send one for review, approve and publish only that one, and see the other stay draft while the revision history records the publication.

*Status:* partial. Whole-site drafts and owner approval only; no per-page status or review request.

#### PAGE-008 — Custom code, embeds and CSS.

An owner adds custom CSS, an HTML embed block, site-wide header and footer code (for example a verification tag) and per-page header code on any page, including a form's or booking's thank-you page (for example a Google Ads conversion snippet). Custom code can subscribe to Pane's goal events (`STATS-002`) through a documented `pane:goal` browser event carrying the goal name and value, so a hand-written tag fires on a lead rather than a page view. Custom header code is marked third-party and waits for consent under `PRIV-001`. Embeds run sandboxed under a per-site content security policy the owner sees, and nothing they add can reach the workspace or a session.

**Acceptance evidence:** Add a custom CSS rule, an embed block, a site-wide header verification tag and per-page header code on a quote form's thank-you page; see the per-page code only on that page, see a listener on `pane:goal` receive the quote-form goal when the form is submitted, and see custom code not run before consent or under GPC; see them live, see the policy list the embed's host, and see the embed unable to read workspace cookies or call `/api/pane`.

*Status:* partial. A supported URL embed is revisioned, isolated and consent-gated with its exact host in the live page CSP. Custom CSS, arbitrary HTML, header/footer code and goal events remain unproved.

#### PAGE-009 — Accessible output by default.

Published pages meet WCAG 2.2 AA by default: images need alt text (or an explicit decorative mark) before publishing, headings are in order, colors in styles meet contrast, forms are labeled, everything works by keyboard, and a skip link is present. The editor warns before publishing a page that fails.

**Acceptance evidence:** Run axe and a keyboard pass over every template and a populated site at 1440 and 390 wide with zero serious violations; try to publish an image without alt text and see the warning.

*Status:* partial. Skip link and labeled contact fields exist; no alt-text, heading or contrast checks and no automated accessibility test.

#### PAGE-010 — Duplicate pages and starter layouts.

An editor duplicates a page or starts one from a starter layout (landing page, service detail, team, menu, pricing, FAQ, location) that already uses the site's styles.

**Acceptance evidence:** Create a page from each starter layout and one duplicate, publish, and see each use the site's fonts and colors.

*Status:* missing. No page creation.

#### PAGE-011 — Password-protected and member-only pages and site.

The owner protects a page or folder with a password, or limits it to signed-in site members. Paid membership is sold through Stall or Nectar (`LINK-002`); Pane checks access on every request and never serves the protected content in the public cache. Before launch, or during a rebuild, the owner can put the whole site behind a site-wide password or an editable coming-soon page (with an optional signup block, `LINK-003`); the gate answers `noindex`, and the workspace and preview links keep working.

**Acceptance evidence:** Protect a folder with a password and another with member sign-in; signed-out requests see the gate, the right password or member sees the page, and no cached response leaks it. Turn on the coming-soon page: every live URL shows it with `noindex`, the site password opens the site, preview still works, and turning it off restores the published site.

*Status:* missing. Every live page is public; no site-wide gate or coming-soon page.

#### PAGE-012 — Gallery blocks with grid, slideshow and lightbox.

A gallery block shows images from the media library as a grid (column count and gap set per device), masonry, a slideshow or a carousel, with captions, an optional click-to-enlarge lightbox (keyboard and swipe navigation, focus kept inside, Escape closes) and per-image links. Galleries reuse the image optimization of `MEDIA-002` and lazy-load beyond the first screen.

**Acceptance evidence:** Build one gallery of 24 images in each layout, open the lightbox and move through it by keyboard and swipe, set three columns on desktop and one on phones, and see each layout on the live site at 1440 and 390 wide with no layout shift and a passing accessibility run.

*Status:* missing. No images or galleries.

#### PAGE-013 — Promotional pop-up and announcement bar.

The owner shows a promotional pop-up (newsletter signup, offer or announcement) and an announcement bar. The pop-up opens after a delay, a scroll depth or exit intent on desktop, on chosen pages only, at most once per visitor per chosen number of days (remembered without cookies, in the visitor's browser storage), and never on the first screen of a phone visit in a way that hides content. It is an accessible dialog (focus trapped, Escape and a visible close button), and it can be scheduled (`CMS-005`).

**Acceptance evidence:** Configure a newsletter pop-up after 10 seconds on two pages with a seven-day frequency cap and exit intent on desktop; see it appear on those pages only, not again within seven days, and close by keyboard; on a 390-wide phone see no full-screen interstitial on arrival; schedule an announcement bar and see it appear and expire on time.

*Status:* partial. An owner-approved announcement bar appears and expires on schedule. Promotional pop-ups, triggers, targeting, frequency caps and dialog behavior remain missing.

#### PAGE-014 — Block catalog, text formatting and links.

The editor's block catalog is: text, heading, image, button, quote (with attribution), line (divider), spacer, list, accordion, social links (`STYLE-004`), audio (an uploaded MP3 or M4A from the library with a native player and download option, or a SoundCloud or Spotify embed), code (preformatted text), chart (bar, line or pie from an entered table, with the table available to screen readers), scrolling text (marquee, paused under `prefers-reduced-motion`), shape (a filled or outlined shape from a set, with a color and optional link), and the blocks other clauses define: HTML embed (`PAGE-008`), video, map and social-post embeds (`MEDIA-004`), form (`FORM-001`), newsletter signup (`LINK-003`), booking (`LINK-001`), product and buy button (`LINK-002`), summary and collection list (`CMS-003`), events calendar (`CMS-009`), site search (`CMS-008`) and gallery (`PAGE-012`). Every block in the catalog can be added to any section, placed on the grid of `PAGE-002`, duplicated and deleted. A text block offers the paragraph styles Heading 1 to Heading 4, paragraph, large paragraph, small paragraph, quote and preformatted, each rendered as its semantic element (`h1` to `h4`, `p`, `blockquote`, `pre`) and styled by `STYLE-002`; bold, italic, underline and strikethrough; bulleted and numbered lists with one level of nesting; and left, center, right or justified alignment per paragraph. Any selected text and any button links to: a page on the site (chosen from the page list, so it follows a slug change), a section anchor on the same or another page (each section has an editable anchor ID), an external URL with an optional open-in-new-tab setting, a media-library file (`MEDIA-001`, for example a PDF price list), a `mailto:` address with optional subject, a `tel:` number and an `sms:` number with optional message body. A button block has the same destinations plus a label and a primary, secondary or tertiary style from `STYLE-002`. Links to internal pages and anchors are stored by reference, so renaming a page or anchor updates every link, and a link whose target is deleted is listed in the editor before publishing. Markdown shortcuts (`#`, `**`, `-`, `1.`) and pasted HTML from Word or Google Docs map to the same styles, with unsupported markup stripped.

**Acceptance evidence:** Build one page holding every block in the catalog and one text block using every paragraph style, every inline format, both list types with a nested item, all four alignments and one link of each destination type (a page, an anchor on another page, an external URL with new tab on, a library PDF, `mailto:` with subject, `tel:` and `sms:`), plus a button of each destination type; publish it. A browser test on the live page finds every catalog block by its block type attribute; finds each heading as the `h1` to `h4` element chosen and each list as a `ul` or `ol` with its nested list; finds `strong`, `em`, `u` and `s` around the formatted words; checks each link's and button's `href` against its destination type (the page's live URL, `/<page>#<anchor>` that scrolls to the section, the external `https://` URL with `target="_blank"` and `rel="noopener"` only where new tab is on, the file's served URL, `mailto:` with the encoded subject, `tel:` and `sms:`); tabs through the page and reaches every link and button in reading order with a visible focus ring; and passes an axe accessibility run. Rename the linked page and the anchor, republish, and see both links follow. Delete the linked page and see the editor list the broken link before publishing. Paste a Google Docs fragment with headings, a list and a link and see them kept as styles.

*Status:* partial. Page bodies are plain text split into escaped paragraphs; no block catalog, headings inside a page, inline formatting, lists, alignment, links, buttons or anchors.

#### PAGE-015 — Trash and single page or post restore.

A deleted page, blog post, collection item or event goes to a trash and stays there for at least 30 days, with who deleted it and when; an editor restores any one of them, with its URL, menu place and body, without touching the rest of the site, and a restored published item goes live at its next publication with the redirect offered at deletion removed. Separately, the history of any one page, post or item lists its earlier published and draft versions, and an editor restores one version of that page, post or item alone as a new draft, keeping every later edit to every other page; the whole-site rollback of `PUBLISH-004` stays for undoing a whole publication. Restores are recorded in the activity log (`AUDIT-001`).

**Acceptance evidence:** Publish a site, then delete one page and one post and edit three other pages; restore the post from the trash and publish: the post answers 200 at its old URL, the earlier redirect is gone, and the three edited pages keep their edits. Restore an earlier version of one of the edited pages from its own history as a draft, publish, and see only that page change. See an item deleted 31 days ago gone from the trash and both restores in the activity log with actor and time.

*Status:* partial. Immutable whole-site revisions and whole-site rollback only; no trash, per-page history or single page, post or item restore.

### Templates and brand styles

#### STYLE-001 — Responsive templates for US local businesses.

A new site starts from a template catalog for common US small businesses (restaurant, salon and spa, trades and home services, professional services, clinic, studio, retail, nonprofit), each responsive and fully editable.

**Acceptance evidence:** See at least 40 templates in the catalog, at least four in each of the eight categories; start a site from each template, publish, and check every page at 1440 and 390 wide with no overflow and a passing accessibility run.

*Status:* partial. One fixed responsive layout; no template catalog.

#### STYLE-002 — Site-wide brand styles.

The owner sets fonts, colors, button shapes, spacing and section backgrounds once for the whole site, with live preview. Fonts come from a built-in catalog, from font files the owner uploads (WOFF2, WOFF, TTF or OTF, self-hosted on the site's origin with `font-display: swap`) or from an Adobe Fonts web project the owner connects by project ID. A change applies everywhere in the next revision.

**Acceptance evidence:** Change the heading font, primary color and button style, preview three pages showing the change, publish, and roll back to the earlier styles. Upload a WOFF2 font and connect a test Adobe Fonts project, set one as the heading and one as the body font, and see both render on the live site, the uploaded one served from the site's own origin.

*Status:* partial. Styles are fixed in source CSS; no owner style controls.

#### STYLE-003 — Switch templates without rebuilding content.

Changing template restyles the site and keeps every page, collection item, image and form. Anything the new template cannot place is listed before the switch. This answers the incumbent complaint that a template change means rebuilding.

**Acceptance evidence:** Switch a populated site between two templates, read the pre-switch list, publish, and see every page and item present; roll back to the previous template.

*Status:* missing. No templates to switch between.

#### STYLE-004 — Logo, favicon and brand kit.

The owner uploads a logo, favicon and social image once and enters the business's social profile links once; Pane sizes the images for the header, browser tab, home-screen icon and social cards (`SEO-006`), and uses the profile links for social icons (`PAGE-003`) and structured data `sameAs` (`SEO-005`).

**Acceptance evidence:** Upload a logo and favicon and see them in the header, browser tab and a social card preview; enter two social profile links and see them in the header icons and the LocalBusiness `sameAs`.

*Status:* missing. The live header shows the business name as text only.

### Media library

#### MEDIA-001 — Media library with alt text and usage.

Images, video files (MP4 and MOV, transcoded for the web with a poster frame), PDFs (menus, price lists) and other files upload once into a searchable library with folders, alt text, captions and a list of where each is used. Deleting a file in use is refused with its uses listed. The image picker also searches free stock photos from Unsplash through its official API; a chosen photo is copied into the library with its photographer credit and Unsplash link kept as attribution, and Unsplash's download event is triggered as its API terms require.

**Acceptance evidence:** Upload 50 images and three PDFs, search and filter them, set alt text, place one image on three pages, and try to delete it (refused, uses listed). Search Unsplash for plumber photos, add a photo to a page, and see it in the library with the photographer's name and link and the download event recorded by the Unsplash API.

*Status:* missing. No uploads or media storage.

#### MEDIA-002 — Responsive image optimization.

Pane serves every image in modern formats (AVIF or WebP with a fallback), at sizes matched to the screen (`srcset`), lazily below the fold and with dimensions set so the layout does not shift.

**Acceptance evidence:** Upload a 6000-pixel photo and see the live page serve a phone-sized WebP or AVIF at 390 wide, a larger one at 1440, with width and height attributes and lazy loading below the fold.

*Status:* missing. No images.

#### MEDIA-003 — Basic image editing.

An editor crops, rotates and sets a focal point on an image in the browser; the original is kept and edits are reversible.

**Acceptance evidence:** Crop and set a focal point, see the hero keep the subject at 390 and 1440 wide, then revert to the original.

*Status:* missing. No images.

#### MEDIA-004 — Video, map, social embeds and Instagram feed.

A video block plays an uploaded library video (`MEDIA-001`) in an accessible player with controls, captions from an uploaded WebVTT file, a poster frame, and optional autoplay-muted and loop, streamed at sizes matched to the screen; or it embeds YouTube and Vimeo videos. Blocks also embed a Google Maps location for each business address, and Instagram or Facebook posts. An Instagram feed block connects the business's Instagram professional account through Instagram's official API and shows its most recent posts (count and grid or carousel layout chosen by the editor) on the live site, refreshed automatically at least hourly, with images re-served through `MEDIA-002` and each tile linking to its post; the access token is an installation secret refreshed before it expires, and a broken connection shows in `LINK-005` while the block keeps the last posts it fetched. Third-party embeds load only after consent where `PRIV-001` requires it.

**Acceptance evidence:** Upload a 200 MB MOV and place it in a video block with a WebVTT caption file; see it play with controls and captions by keyboard on the live site at 1440 and 390 wide, start from its poster frame and stream a phone-sized rendition at 390. Add a YouTube video, a Vimeo video, a Google Map, an Instagram post and a Facebook post; see each on the live site, see them wait for consent where required, and see the CSP list only their hosts. Connect a test Instagram professional account, place a nine-post feed block, publish a new Instagram post and see it on the live site within an hour; revoke the token and see the connection fail in `LINK-005` while the block still shows the last nine posts.

*Status:* partial. The owner-added YouTube URL embed uses the page-only CSP and consent boundary. Uploaded video, other provider rendering and the Instagram feed remain unproved.

### Collections and blog

#### CMS-001 — Structured collections with typed fields.

The owner keeps structured collections such as services, team members, projects, testimonials, locations, FAQs and menu items, with typed fields (text, rich text, image, number, USD price, date, link, reference to another collection, option), each of which can be marked required with help text. A rich-text field is edited and rendered with the body editor of `CMS-011`: the `PAGE-014` paragraph styles, inline formats, lists, links and buttons, and inline blocks, never plain text or bold and italic alone. Starter collections come with each template.

**Acceptance evidence:** Create a services collection with ten fields including a USD price, a reference to team members and a required rich-text description, add 30 items, and edit an item; validation refuses wrong types and an empty required field. Give one item's description an H2, a bulleted list, bold text, an inline image and links to a page, a library PDF and a `tel:` number, publish, and see the item page render them as `PAGE-014` requires (`CMS-011`).

*Status:* missing. No collections.

#### CMS-002 — Collection template pages with item URLs.

Each collection can have a template page that renders every item at its own clean URL, with item-level title, description and social image for search (`SEO-001`).

**Acceptance evidence:** Design a service template page, publish, and open every service item's URL with its own title, description and structured data.

*Status:* missing. No collections.

#### CMS-003 — Collection lists and filters on any page.

Any page can show a list or grid of collection items, filtered, sorted, limited and optionally featured (for example the three newest projects or testimonials for one service). Date fields support relative filters evaluated at request time in the business's time zone (upcoming only, past only, today, the next N days), so a list of upcoming items stays correct without republishing.

**Acceptance evidence:** Place a filtered, sorted list of three featured projects on the home page and a full filterable list on a projects page; change an item and see both update in the next revision. Place an upcoming-only list of dated items, let the clock pass one item's date in America/Chicago, and see that item leave the list without a new publication.

*Status:* missing. No collections.

#### CMS-004 — Blog with categories, tags and authors.

One or more blogs (for example News and Recipes), each with its own URL prefix, index, RSS feed (`CMS-006`) and comment settings (`CMS-010`), holding posts with excerpts, featured images, categories, tags, author pages, archives and pagination. Each post's body is written in the block editor of `CMS-011`, so a post holds the same blocks, headings, formatting, lists, links and buttons as a page. Each post can show share buttons for Facebook, X, LinkedIn, Pinterest and email that open the network's share URL with the post's link and social card (`SEO-006`) and load no third-party script. Authors write and submit posts within their role (`ROLE-001`).

**Acceptance evidence:** Create two blogs, News and Recipes. As an author, write three posts in each with categories and tags, submit them for review, have the owner publish, and open each blog's index and feed, a category, a tag, an author page and each post; see each feed hold only its own blog's posts. One of the posts carries the `CMS-011` acceptance body, and its live DOM passes the `CMS-011` checks. Click each share button and see the network's share URL carry the post's URL, with no request to the network before the click.

*Status:* missing. No blog.

#### CMS-005 — Scheduled publishing and expiry.

Pages, posts, collection items and announcement sections can be scheduled to publish and to unpublish at a date and time in the business's US time zone, daylight saving included. The workspace shows what actually went live and flags a scheduled change that has not been approved by its time.

**Acceptance evidence:** Schedule a post for 9:00 America/Chicago and a promotion to expire across a daylight saving change; see each happen at the right local time and see an unapproved schedule flagged, not published.

*Status:* partial. Approved announcement sections now activate and expire in the business US time zone across daylight saving; Sites records actual events and flags overdue unapproved drafts without publishing them. Selective page, post and collection-item scheduling remains missing.

#### CMS-006 — RSS and podcast feeds and new-post notifications.

The blog and each collection with a template page publish an RSS feed. A blog whose posts carry an audio file can also publish a podcast feed with the Apple Podcasts (iTunes) tags (show title, author, artwork, category, explicit flag, episode duration and enclosure) for Apple Podcasts and Spotify. On publication, subscribers who opted in receive the new post through Mango or Mailchimp (`LINK-003`), whichever the owner connected, and the owner sees the send state.

**Acceptance evidence:** Validate the RSS feed and a podcast feed with two audio posts against the W3C feed validator and the Apple Podcasts feed requirements. With Mango connected, publish a post and see the Mango campaign queued with its delivery state in Pane; repeat with a Mailchimp test audience and see the Mailchimp campaign created and sent to the audience with its delivery state in Pane.

*Status:* missing. No feeds or subscribers.

#### CMS-007 — Collection CSV import and export.

Collections import from and export to CSV, matching Webflow's and Framer's CMS exports, with a field-mapping preview and a list of rows that could not be imported.

**Acceptance evidence:** Import a Webflow CMS CSV and a Framer CSV with images, review the mapping and rejected rows, apply, export the collection again and compare.

*Status:* missing. Only the static-site JSON move-in exists (`MOVEIN-001`).

#### CMS-008 — Site search.

Visitors search the site's pages, posts and collection items; results respect password and member-only pages (`PAGE-011`).

**Acceptance evidence:** Search for a service name, a post tag and a word on a protected page; the first two return results and the protected page does not for a signed-out visitor.

*Status:* partial. Visitors search the current published pages at `/site/search`, with Unicode-normalized matching and links to results. Drafts stay private and publication/rollback update results atomically. Posts, collection items and protected-page filtering still await CMS-001, CMS-002, CMS-004 and PAGE-011.

#### CMS-009 — Events calendar with list and month views.

An events collection holds each event's title, description, image, start and end date and time with its IANA time zone (all-day and multi-day events included), location (address with a map, `MEDIA-004`, or an online link), price in USD, capacity note and a register or buy action. Recurring events (weekly, monthly, custom dates) produce one item per occurrence. An events page shows them as a list or a month calendar (switchable by the visitor, keyboard-navigable), splits upcoming and past automatically at request time in the event's time zone, and each event has its own page (`CMS-002`) with add-to-calendar links (an ICS download and Google Calendar and Outlook links) and Event structured data (`SEO-005`). Calendar and summary blocks (`CMS-003`) put upcoming events on any page. The register or buy action hands off to Dial for a booked session (`LINK-001`), to Stall, a Stripe Payment Link or PayPal for a paid workshop or ticket (`LINK-002`), or to a Pane registration form (`FORM-001`), and a completed registration or purchase counts as a conversion on that event (`STATS-002`).

**Acceptance evidence:** Create a one-off workshop in America/New_York, a weekly class in America/Los_Angeles that crosses a daylight saving change and an all-day event; see the events page in list and month views, each occurrence at the right local time, and an upcoming-events block on the home page. Let one event's end time pass and see it move to past without a new publication. Download the ICS and import it into Google Calendar and Outlook with the right times, pass Google's Rich Results Test for the Event page, and complete a test-mode Stall purchase and a Dial booking from two events, each counted as a conversion on its event.

*Status:* missing. No events or calendar.

#### CMS-010 — Blog comments and moderation.

The owner turns comments on or off for the whole blog, per post and automatically after a chosen number of days. Visitors comment with a name and email (and optionally a website); comments can be threaded one level deep, and posts can show a simple like count kept without cookies. New comments are held for approval by default (or approved automatically for previously approved commenters, as the owner chooses), and a moderation queue lets an owner or comment moderator (`ROLE-001`) approve, mark as spam, delete, edit or reply as the post's author, singly or in bulk. Spam protection reuses the form protection of `FORM-002` (honeypot, rate limits and Turnstile) and holds comments with many links or blocked words. Moderators receive an email and push notification (`MOBILE-002`) for each new comment, or a daily digest. Commenter emails are never shown publicly, comments are included in person-level privacy requests (`PRIV-002`) and in the WXR export (`EXPORT-001`), and imported comments keep their author, date, approval state and threading (`IMPORT-001`, `IMPORT-002`).

**Acceptance evidence:** Enable comments with approval required; post three comments as visitors (one with a filled honeypot, one with six links), see the honeypot comment refused and the link-heavy one held as spam, approve one as a comment moderator from the notification, reply as the post's author and see the threaded reply live; close comments on one post and see the form gone; run a privacy request for a commenter's email and see their comments exported and erased.

*Status:* missing. No comments, moderation queue or moderator notifications.

#### CMS-011 — Post and collection item bodies in the block editor.

A blog post's body, and every rich-text field of a collection item (`CMS-001`) or event (`CMS-009`), is written in the same editor as a page (`PAGE-014`), shown as the post or item will look on the live site. It offers every `PAGE-014` paragraph style (Heading 1 to Heading 4 rendered as `h1` to `h4`, paragraph, large and small paragraph, quote and preformatted), every inline format (bold, italic, underline, strikethrough), bulleted and numbered lists with one level of nesting, alignment, and every link and button destination (a page, a post, a collection item, a section anchor, an external URL with an optional new tab, a media-library file, `mailto:`, `tel:` and `sms:`). Between paragraphs the author inserts at least the image (with caption, alt text and link), gallery (`PAGE-012`), video and social-post embed (`MEDIA-004`), quote, button, line, spacer, HTML embed (`PAGE-008`), audio, code, accordion, form (`FORM-001`), newsletter signup (`LINK-003`), booking (`LINK-001`), product (`LINK-002`) and summary (`CMS-003`) blocks; a post or item body can also hold a section with the `PAGE-002` grid when the author chooses a wide layout. Links to pages, posts, items and anchors are stored by reference, as in `PAGE-014`, so renaming or moving any of them updates every link in every post and item, and a link whose target is deleted is listed before publishing. Markdown shortcuts and pasted Word or Google Docs content map to the same styles. The body is stored as structured blocks, rendered to semantic HTML on the live post, included in the post's RSS item (`CMS-006`) with absolute URLs, indexed by site search (`CMS-008`) and exported with the post (`EXPORT-001`).

**Acceptance evidence:** As an author, write a post containing an H2 and an H3, a bulleted list with a nested item, bold and italic text, two inline images with captions, a quote with attribution, a YouTube embed, a button to a page, and links to another post, a library PDF and a `tel:` number; submit it, have the owner publish it, and read the live post DOM with the same checks as `PAGE-014`: each heading is the chosen `h2` or `h3`, the list is a `ul` holding a nested `ul`, `strong` and `em` wrap the formatted words, each image is a `figure` with its `figcaption` and alt text, the quote is a `blockquote` with its attribution, the video is the `MEDIA-004` embed, the button's `href` is the page's live URL, and each link's `href` is the other post's live URL, the PDF's served URL and the `tel:` number; tab through the post and reach every link and button in reading order; and pass an axe run. Rename the linked post's slug, republish, and see the link follow to the new URL with no redirect hop. Do the same in a services item's rich-text description and check its item page the same way. Read the blog's RSS feed and see the post's item carry the same headings, list, images and links with absolute URLs.

*Status:* missing. No blog posts or collection items exist; page bodies are escaped plain paragraphs, so no post or item body editor.

### Domains and hosting

#### DOMAIN-001 — Connect a custom domain with apex and www.

The owner connects a domain they own, at the apex and `www`, with one chosen as primary and the other redirecting to it. Pane creates the Cloudflare Workers custom domain in the owner's Cloudflare account, or shows the exact records to add at another DNS host (GoDaddy, Namecheap, Squarespace Domains, Google Cloud DNS, Network Solutions) and checks them. The owner can also connect any number of additional domains (a `.net`, a common misspelling, an old brand) as aliases, each at apex and `www` with HTTPS, that answer 301 to the same path on the primary domain.

**Acceptance evidence:** Connect a test domain held in Cloudflare and one at an external DNS host, see the status move from pending to live, and see `www` redirect to the apex with 301. Connect two alias domains and see `https://alias/services?x=1` and `http://www.alias/services` each answer 301 to `https://primary/services` with the path and query kept.

*Status:* missing. The business site is served only at `/site` on the Worker origin; no domain connection or alias domains.

#### DOMAIN-002 — Managed HTTPS and certificate status.

Every connected domain is served over HTTPS with an automatically issued and renewed certificate; HTTP redirects to HTTPS; the workspace shows certificate status and expiry, and alerts before a renewal problem (`AUTO-004`).

**Acceptance evidence:** Connect a domain, see the certificate issued and listed with its expiry, and see `http://` redirect to `https://`.

*Status:* missing. No domain or certificate handling beyond the Worker's default hostname.

#### DOMAIN-003 — DNS status that preserves business email.

Before cutover Pane reads the domain's existing DNS and keeps every record it does not own, especially MX, SPF, DKIM and DMARC for Google Workspace or Microsoft 365, so connecting the website never breaks the business's email. It shows each record as kept, added or needing action. Mail records that point at a registrar's or site builder's email forwarding service are flagged as forwarding, not mailboxes, and handled by `DOMAIN-005` before any nameserver or transfer change.

**Acceptance evidence:** Connect a domain that has Google Workspace MX, SPF and DKIM records; after connection the mail records are unchanged and mail still delivers, and the status screen lists them as kept. Connect a domain whose MX records point at Squarespace email forwarding and see them flagged as forwarding with the `DOMAIN-005` step required.

*Status:* missing. No DNS reading or writing.

#### DOMAIN-004 — Domain registration and transfer guidance.

An owner without a domain is guided to register one in their own Cloudflare Registrar account (at cost, in USD) or keep their current registrar; an owner leaving Squarespace Domains, Wix or WordPress.com gets the transfer or nameserver steps for that registrar. Before the owner closes the old account, Pane lists the services billed through it that will stop with it: email forwarding (`DOMAIN-005`), and a Google Workspace subscription bought through Squarespace or Wix, with the steps to move that subscription to direct billing with Google first so mailboxes are not interrupted. Pane never holds the registration.

**Acceptance evidence:** Follow the guided path for a new domain and for a domain at Squarespace Domains with Squarespace email forwarding and a Google Workspace subscription billed through Squarespace, ending with a connected domain in each case; the Squarespace path shows the forwarding and Workspace billing steps as required before account closure, and marks each done only when the owner confirms it.

*Status:* missing. No domain guidance.

#### DOMAIN-005 — Registrar email forwarding carried over.

Squarespace Domains, Wix, WordPress.com and GoDaddy include free email forwarding (aliases such as `info@` and a catch-all) that stops when the domain's nameservers move or it transfers. Before cutover Pane detects that forwarding from the domain's MX records and the registrar, asks the owner for the alias list and destinations (which the existing records do not reveal), and recreates every alias and the catch-all in Cloudflare Email Routing in the owner's Cloudflare account, including the destination-address verification Cloudflare requires. Pane then sends a test message to each alias and records it as arrived only when its unique token is confirmed at the destination (by the owner's confirmation link or a connected mailbox), and keeps the cutover (`IMPORT-006`) blocked until every alias has passed. After cutover it repeats the test and alerts (`AUTO-004`) if any alias stops delivering.

**Acceptance evidence:** Cut over a test domain using Squarespace email forwarding with a catch-all and two aliases: see the forwarding detected, enter the aliases, see them created in Cloudflare Email Routing with verified destinations, see cutover refused while one alias is unconfirmed, then confirm all three; after cutover, send mail from an outside account to each alias and to an unlisted address and see every message arrive at its destination, and see the post-cutover check pass.

*Status:* missing. No DNS reading, forwarding detection or Email Routing setup.

#### HOST-001 — The business site at the domain root, fast.

The live site is served at the root of its domain (not under `/site`), cached at Cloudflare's edge and purged on publication. Each template meets Core Web Vitals at the 75th percentile on a mid-range phone over 4G: Largest Contentful Paint 2.5 s or less, Interaction to Next Paint 200 ms or less, Cumulative Layout Shift 0.1 or less. Before a site has field data, the same budgets are checked in the lab: Lighthouse's default mobile profile (emulated Moto G Power, simulated throttling at 150 ms round trip, 1.6 Mbps down and 4x CPU slowdown) with Largest Contentful Paint 2.5 s or less, Total Blocking Time 200 ms or less and Cumulative Layout Shift 0.1 or less, median of five runs. A publication reaches the edge everywhere within 30 seconds.

**Acceptance evidence:** Publish a populated site on a connected domain and run Lighthouse with the stated mobile profile five times on every template's home, collection and blog pages; the medians meet the lab budgets. Where Vane (`STATS-003`) has 28 days of field data, its 75th percentiles meet the field budgets. Publish a change and request the changed page from probes in Virginia, California, Frankfurt, Singapore and Sydney every two seconds: every probe serves the new revision within 30 seconds of the publication.

*Status:* partial. Live pages are served at `/site` with `no-store`, reading D1 on every request; no edge cache or performance budget.

#### HOST-002 — The live site survives an admin outage.

Publishing writes a static snapshot of the live revision, so visitors keep getting the published site if the workspace, database or an integration is unavailable. Forms queue submissions and deliver them when service returns.

**Acceptance evidence:** Make the database unavailable on a deployed site; every live page still loads and a contact submission is accepted and appears in the inbox once the database returns.

*Status:* missing. Every public request reads D1.

#### HOST-003 — Updates without plugin maintenance.

Pane ships platform, security and template updates as signed releases, whose signature the installation verifies against the published release key before applying (an unsigned or tampered release is refused), that the owner applies in one action (or automatically, if they choose), with a preview of what changes and a rollback. There are no third-party plugins to keep updated.

**Acceptance evidence:** Apply a release to a running installation, see the change list, its signature verified against the published release key and a passing health check, then roll it back. Offer the installation a release with a tampered artifact and one with no signature, and see each refused with the reason shown and nothing changed.

*Status:* missing. No in-product update channel.

#### HOST-004 — Transparent running cost in USD.

The workspace shows the site's Cloudflare usage this month and the estimated cost in USD against the owner's plan, with no feature that is locked behind an upsell. This answers incumbent complaints about add-on pricing.

**Acceptance evidence:** Generate traffic and storage on a test account and see usage and the USD estimate match the Cloudflare dashboard within 5%.

*Status:* missing. No usage or cost view.

#### HOST-005 — Install from the browser with no terminal.

An owner who has never opened a terminal installs Pane from its run site in a browser: they sign up for or sign in to Cloudflare through Cloudflare's own authorization screen, grant a token limited to the account resources Pane needs, and Pane deploys the Worker, database and storage into that account, creates the first owner sign-in and opens the workspace, showing each step's progress and a plain-language error with a retry when a step fails. The same path upgrades an installation (`HOST-003`). `rer deploy` (`DEPLOY-001`) stays for technical owners and both produce the same installation.

**Acceptance evidence:** From a fresh Cloudflare account and a browser with no local tools, start the install on the run site, complete Cloudflare's authorization, and reach a signed-in Pane workspace on the account's `workers.dev` hostname with no command typed; the granted token holds only the listed scopes. Cancel authorization once and see the plain-language error and a working retry.

*Status:* missing. Installation runs through `rer deploy` or the `npx @runeditrun/rer` command line only; no browser install path.

### Search visibility

#### SEO-001 — Page titles and meta descriptions.

Every page, post and collection item has an editable search title and meta description, with sensible defaults and a search-result preview; the site name appears as the owner chooses.

**Acceptance evidence:** Set a title and description on a page and an item, see the preview, publish, and read them in each page's `<title>` and `<meta name="description">`.

*Status:* partial. Current pages have editable search titles and descriptions, defaults and a saved search preview. Posts and collection items still depend on CMS-001, CMS-002 and CMS-004.

#### SEO-002 — Redirect manager and slug-change redirects.

The owner manages 301 and 302 redirects one by one or by CSV import, and Pane offers a redirect automatically whenever a published URL changes or a page is deleted. Imported sites bring their old URL map (`IMPORT-005`).

**Acceptance evidence:** Rename a published slug and accept the offered redirect, import 200 redirects by CSV, and request each old URL to get the right status and target.

*Status:* done. Published revisions own exact 301/302 redirect maps, individual addition/retargeting/deletion and explicit offers for retired published URLs after slug changes or deletion. CSV import is an explicit undoable editor action supporting quoted fields and 200-row maps. Every imported source returns its chosen status and target; malformed input never partially saves, drafts do not change live routes, and rollback restores the map. IMPORT-005 and DOMAIN-001 inherit this map when adding imported and custom-domain public doors.

#### SEO-003 — Automatic sitemap and robots.txt.

Pane generates `sitemap.xml` (pages, posts, items, last-modified dates; excluding hidden, protected and noindex pages) and an editable `robots.txt`, updated on every publication.

**Acceptance evidence:** Publish a site with hidden, protected and noindex pages, validate the sitemap, and see only public indexable URLs listed; edit `robots.txt` and see it served.

*Status:* partial. Published revisions generate sitemap.xml with last-modified dates and noindex exclusions, and editable robots.txt; drafts never change either and rollback restores them. Hidden/protected pages and post/item URLs await PAGE-001, PAGE-011 and CMS-001 to CMS-004.

#### SEO-004 — Canonical URLs and indexing controls.

Every page carries a canonical URL on the primary domain; the owner can mark a page noindex or set a custom canonical, and preview and staging addresses are always noindex.

**Acceptance evidence:** Read canonical tags across `www` and apex, set one page noindex, and confirm previews send `noindex`.

*Status:* partial. Current pages have canonical URLs, custom canonical overrides and noindex controls; draft previews and development-origin pages send noindex. Primary custom-domain routing and www/apex acceptance await DOMAIN-001.

#### SEO-005 — Structured data for local businesses.

Pane emits JSON-LD from the site's business facts and collections: LocalBusiness (name, address, phone, opening hours, service area, price range, social profiles as `sameAs`), Service, Article, FAQPage, BreadcrumbList and Event, validated before publication.

**Acceptance evidence:** Publish a site with hours, services, FAQs and posts, and pass Google's Rich Results Test and the Schema.org validator on each page type.

*Status:* missing. No structured data.

#### SEO-006 — Social preview cards.

Every page has Open Graph and X card title, description and image, defaulting from the page and brand kit (`STYLE-004`), with a preview in the editor.

**Acceptance evidence:** Share a page URL into the Facebook Sharing Debugger and an X card validator and see the chosen title, description and image.

*Status:* missing. No social metadata.

#### SEO-007 — Google Search Console and Bing Webmaster Tools.

The owner connects Google Search Console and Bing Webmaster Tools: Pane verifies the domain, submits the sitemap, and shows queries, clicks, impressions and indexing problems per page in the workspace.

**Acceptance evidence:** Connect a test Google Search Console property and a test Bing Webmaster Tools site for the same domain; for each, see verification succeed and the sitemap submitted, and see per-page clicks and impressions imported for the last 28 days, labeled by search engine.

*Status:* missing. No search console connection.

#### SEO-008 — Google Business Profile consistency.

The owner connects their Google Business Profile. Pane compares its name, address, phone, hours and holiday hours with the site and shows differences; the owner chooses which is right and Pane updates the other with their approval.

**Acceptance evidence:** Connect a test profile whose holiday hours differ from the site, see the difference listed, approve the site's version and see the profile updated.

*Status:* missing. No Google Business Profile connection.

#### SEO-009 — Per-page search checks.

Before publication the editor lists search problems per page: missing or duplicate titles and descriptions, missing alt text, broken internal links, noindex mistakes and very large images. Title and description checks compare the effective metadata, including the site defaults, after Unicode NFKC normalization, whitespace folding and en-US lowercasing. A noindex setting is flagged for owner review, since excluding a page may be intentional; the check never changes that setting. Each future block, media and content capability inherits the corresponding checks before it ships (`PAGE-014`, `MEDIA-001`, `MEDIA-002`, `CMS-001` to `CMS-004`).

**Acceptance evidence:** Publish a draft with a duplicate title, a broken internal link and a missing alt text, and see each listed with a link to fix it.

*Status:* partial. Draft checks list missing or duplicate effective titles/descriptions and flag noindex for review, with links to the relevant settings from Search and Sites. Broken internal links, missing alt text and large-image checks await PAGE-014 and MEDIA-001/MEDIA-002.

#### SEO-010 — Multilingual sites with per-language URLs.

The owner adds languages to the site (Spanish first for US businesses). Each page, post, collection item, menu, form label and search title has a version per language, drafted by `AI-002` or written by hand and published only when approved; a missing translation is listed rather than falling back silently. Each language has its own URL prefix (for example `/es/servicios`), pages carry `hreflang` alternates and `x-default`, the sitemap lists every language version, and a language switcher in the header goes to the same page in the other language.

**Acceptance evidence:** Add Spanish to a five-page site, translate three pages and leave two untranslated; see the untranslated pages listed, publish, and open `/es/` pages through the switcher; read reciprocal `hreflang` and `x-default` tags on each translated page, see them in the sitemap, and see a crawl of the live site report no `hreflang` errors (missing return links, invalid language codes or alternates that do not answer 200).

*Status:* missing. No languages or translated pages.

### Forms and enquiries

#### FORM-001 — Form builder with multiple forms.

The owner builds any number of forms (contact, quote request, job application, event registration) with text, email, US phone, address, choice, date, file upload and consent fields, places them on any page, and sets each form's confirmation message or redirect. Each field has a label, optional help text shown under it, an optional placeholder and a required setting; required fields are marked visibly and with `required`/`aria-required`, and a submission with an empty required field or a badly formed email, phone or date is refused both in the browser and by the server, with a validation message beside each failing field, announced to screen readers and tied to it by `aria-describedby`, and the visitor's other answers kept. Uploaded files go to private storage with size and type limits.

**Acceptance evidence:** Build a quote form with a file upload and a US phone field, place it on two pages, submit it with a 5 MB PDF, and see the submission and file in the inbox; an oversized or wrong-type file is refused. Mark the phone field required with help text, then submit with it empty and with an invalid email, in the browser and by a direct POST: both are refused, the page shows each field's message linked by `aria-describedby`, the other answers stay filled, and the help text is the field's accessible description.

*Status:* partial. One fixed contact form (name, email, message) with browser `required` and length limits; no form builder, configurable required fields, help text, per-field validation messages or file upload.

#### FORM-002 — Spam protection.

Every form is protected by a hidden honeypot, per-form rate limits and Cloudflare Turnstile, without image puzzles for real visitors. Rejected spam is counted and can be reviewed, never silently mixed into the inbox.

**Acceptance evidence:** Submit with the honeypot filled, in a burst over the limit and with a failed Turnstile token; each is refused or quarantined and counted, while a normal submission arrives.

*Status:* partial. Honeypot and per-minute limits exist but no Turnstile, no spam review and no test that a filled honeypot or a burst is refused.

#### FORM-003 — Enquiry email to named recipients and reply.

Each form notifies named recipients by email (sent through the installation's mail relay or the business's Google Workspace or Microsoft 365 account) with the sender as Reply-To, so the owner replies from Gmail or Outlook. The workspace shows each notification's provider acceptance separately from the stored enquiry, and an owner can also reply from the inbox.

**Acceptance evidence:** Submit a form three times, sending its notification once through each of the installation relay, a Google Workspace test account and a Microsoft 365 test account, and see each notification accepted by its provider with Reply-To set; reply from the inbox and see the reply recorded on the enquiry; a failed send is shown as failed, with the enquiry kept.

*Status:* partial. Enquiries appear in the workspace inbox only; no notification email or reply.

#### FORM-004 — Automatic acknowledgment to the sender.

Each form can send the visitor an acknowledgment email with the owner's wording and expected response time.

The current Contact form defaults off. Its subject, wording and response time live in the immutable site revision and take effect only when the owner publishes it. The enquiry and its acknowledgment outcome are stored independently; one atomic send claim prevents replay, and uncertain provider outcomes are never automatically resent. Development and demo mail stays suppressed. FORM-001 inherits these optional per-form settings and durable provider outcomes for every form it adds.

**Acceptance evidence:** Enable an acknowledgment, submit, and see the sender's message accepted by the provider edge with the configured wording.

*Status:* done. An enabled, published acknowledgment reaches the configured shared mail provider with the owner’s wording and response time. Durable acceptance, refusal, uncertainty, suppression and replay/erasure fences are proved through the public form and workspace.

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

**Acceptance evidence:** With Mango connected, submit a form with email consent ticked and SMS consent unticked; see consent text, time and page recorded and only the email consent reach the Mango contact. Repeat with a Mailchimp test audience and see the contact subscribed with marketing permission and the consent text, time and page stored on the Mailchimp member, and the SMS consent absent. Repeat with Orbit and see the consent on the Orbit contact.

*Status:* missing. No consent fields.

### Bookings, checkout and connections

#### LINK-001 — Booking through Dial, Calendly or Acuity.

A booking block embeds Dial (first), Calendly or Acuity Scheduling (Squarespace Scheduling) inline or as a pop-up, passes the page and campaign as booking source (Calendly UTM parameters, Acuity URL parameters or intake field), and reports completed bookings back to Pane's conversion goals (`STATS-002`): from Dial's booking event, Calendly's `event_scheduled` embed event or webhook, and Acuity's appointment-scheduled webhook. An owner moving from Squarespace pastes their existing Acuity scheduling link or owner ID and keeps their Acuity account, appointment types and calendar. A restaurant adds a reservation block for Placemat (first), OpenTable or Tock and an online-ordering block for Toast or ChowNow by pasting its widget or ordering link; each embeds inline or opens as a button, and clicks through to it count as an outbound goal (`STATS-002`).

**Acceptance evidence:** On one service page, embed Dial, Calendly and Acuity Scheduling (a test Acuity account with one appointment type); complete a test booking in each from a UTM-tagged visit, and see each booking counted as a conversion for that page and campaign, with the Acuity booking confirmed by its webhook and carrying the page as its source; cancel the Acuity booking and see the conversion marked canceled. On a restaurant page, add OpenTable and Tock reservation widgets and Toast and ChowNow ordering buttons from test restaurant IDs; see each widget render on the live site after consent where `PRIV-001` requires it, and each click counted as an outbound goal for that page.

*Status:* missing. No booking embeds; the previous contract excluded bookings.

#### LINK-002 — Checkout through Stall, Stripe Payment Links or PayPal.

A buy or pay button and a product block hand visitors to Stall (first), a Stripe Payment Link or PayPal. Pane never handles card details; completed payments come back as conversions where the provider reports them. Sales tax is calculated by Stall or Stripe.

**Acceptance evidence:** Add a Stall product block, a Stripe Payment Link button and a PayPal button, complete a test-mode (PayPal sandbox) purchase through each, and see each counted as a conversion with no card data reaching Pane.

*Status:* missing. No checkout; the previous contract excluded payments.

#### LINK-003 — Newsletter signup through Mango or Mailchimp.

A signup block (inline, in the footer, on the coming-soon page or in a pop-up, `PAGE-011`, `PAGE-013`) adds consenting visitors to an audience in Mango (first) or Mailchimp, with double opt-in when the owner chooses, the signup's consent text, time and page sent with the contact (`FORM-008`), optional tags or groups, and CAN-SPAM details (business postal address) checked. A failed handoff keeps the signup and retries, with its state shown in `LINK-005`.

**Acceptance evidence:** With Mango connected, sign up through the block, confirm the double opt-in email and see the contact in the Mango audience with its consent record. With a Mailchimp test audience connected, sign up with double opt-in on: see the member created as pending, follow Mailchimp's confirmation email, and see the member subscribed with its tag and the consent text, time and page recorded; make the Mailchimp key invalid, sign up again and see the signup kept, retried and shown as failing in the health panel.

*Status:* missing. No newsletter signup.

#### LINK-004 — Zapier, Crank and outgoing webhooks.

Form submissions, publications and enquiry status changes are available as signed outgoing webhooks and as triggers in published Zapier and Crank apps.

**Acceptance evidence:** Connect a Zapier test zap and a Crank flow to form submission and publication triggers, fire each, and see the payload arrive signed.

*Status:* missing. No outgoing events.

#### LINK-005 — Connection health panel.

One panel lists every connected service (domain, mail, email forwarding, CRM, booking, checkout, newsletter, analytics, search consoles, Google Business Profile, Instagram feed, social accounts, webhooks) with its state, last success, last failure and how to fix it.

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

*Status:* partial. Public visits and the owner dashboard aggregate page, day, registrable referrer domain and channel, phone/tablet/desktop, country or US state, UTM medium/source and published owner-approved business campaign labels. GPC and DNT exclude visits before storage. Collection policy (ct 22 Oct 2026): `utm_campaign` is retained only when it matches, case-insensitively, a label approved in the published revision, stored as that label; other tagged visits count under 'Unapproved campaign tag' with no text kept; `utm_term`/`utm_content` are discarded. `utm_medium` maps to a fixed set (email, social, paid search, display, referral, affiliate, other); `utm_source` is kept only as an approved label or known source. Referrers keep only the registrable domain (no subdomain, path, query or port; IP literals, single-label, localhost and private hosts are Unknown), grouped into Search, AI assistants, Social, Local and review, Email and Other website. No cookies, raw URLs, IPs, user agents or visitor identifiers are stored. STATS-002, STATS-003 and STATS-005 inherit these collection boundaries and PRIV-001 consent obligations when their doors ship. The ct fix-round proof is implemented; status remains partial as directed by the ruling, pending ct's completion review.

#### STATS-002 — Conversion goals and click insights.

The owner sets goals (form submissions, bookings, checkouts, signups, phone-number and email clicks, outbound clicks) and sees conversions and conversion rate by page, source and campaign, plus a simple funnel from landing page to goal. Each goal can be mapped to a Meta standard event and a Google Ads conversion action (`STATS-005`) and is raised in the browser as a `pane:goal` event for custom code (`PAGE-008`).

**Acceptance evidence:** Define a quote-form goal and a phone-click goal, complete each from a tagged campaign, and see them counted by page and campaign with a funnel.

*Status:* missing. No goals.

#### STATS-003 — Vane and Google Analytics 4 with consent.

The owner connects Vane (first) or Google Analytics 4 by measurement ID through one Google tag that `STATS-005` reuses for Google Ads. Vane runs cookie-free; GA4 loads only after consent where `PRIV-001` requires it, and never under GPC.

**Acceptance evidence:** Connect Vane and see events arrive; connect GA4 and see it load only after consent and send page views and goals.

*Status:* missing. No analytics connections.

#### STATS-004 — Monthly owner report.

On the first business day of each month the owner receives a short report: visits, top pages, search clicks (`SEO-007`), enquiries and bookings by source, unanswered enquiries and open site problems.

**Acceptance evidence:** Advance the clock to a month boundary and see the report accepted by the mail provider with figures that match the dashboard.

*Status:* missing. No reports.

#### STATS-005 — Meta Pixel and Google Ads conversion tracking.

The owner connects the Meta Pixel by pixel ID and the Google tag for Google Ads by its `AW-` conversion ID from native connection panels, with no code. Page views go to both. Each `STATS-002` goal maps to a Meta standard event and to a Google Ads conversion action the owner picks from the connected account (or enters as a conversion label): by default a form submission sends `Lead`, a booking confirmed through `LINK-001` sends `Schedule`, a checkout confirmed through `LINK-002` sends `Purchase` with its USD value, a newsletter signup sends `CompleteRegistration` and a phone or email click sends `Contact`. Browser events fire when the goal completes, with an event ID. Optionally, Pane also sends the same event server-side from the stored submission through the Meta Conversions API and Google Ads enhanced conversions, with the visitor's email and phone normalized and SHA-256 hashed and the same event ID so the platform de-duplicates it. Everything waits for consent and nothing is sent under GPC (`PRIV-001`); the access tokens are installation secrets with their health in `LINK-005`.

**Acceptance evidence:** Connect a test Meta pixel and a test Google Ads account. From a visit tagged with `fbclid` and `gclid`, accept consent, then submit a quote form, complete a Dial booking and click a phone number. See `Lead`, `Schedule` and `Contact` in Meta Events Manager's Test Events with those names, see each mapped Google Ads conversion recorded through Tag Assistant, and with server-side sending on see the Conversions API events de-duplicated against the browser events by event ID and the enhanced conversion carrying only hashed identifiers. Repeat without consent and with GPC and see no request to Meta or Google, browser or server-side.

*Status:* missing. No Meta Pixel, Google Ads connection, goal-to-event mapping or server-side conversions.

### Team, roles and activity

#### ROLE-001 — Roles for editors, authors, moderators and reporting.

Beyond owner, admin and member, the owner assigns editor (edits pages and collections, cannot publish), author (writes and submits own posts only), comment moderator (approves, marks spam, deletes and replies to blog comments and receives comment notifications, `CMS-010`), inbox (reads and replies to enquiries) and reporting (reads analytics) roles. A person can hold several roles. Every role is enforced on the server (`ACCESS-001`).

**Acceptance evidence:** Invite one person per role and exercise every route as each; each sees and does only what its role allows, and only the owner, admins and comment moderators can act on the comment queue or receive comment notifications.

*Status:* partial. Owner, admin and member only; no editor, author, comment moderator, inbox or reporting role.

#### ROLE-002 — Review requests and publish delegation.

The owner can delegate publishing to named people, for all pages or one folder or collection. A review request notifies the publisher by email and push (`MOBILE-002`), and every delegated publication records who approved it.

**Acceptance evidence:** Delegate the blog to an admin, have an author submit a post, approve it as the admin from a notification, and see the approval recorded under the admin.

*Status:* missing. Only the owner can publish.

#### ROLE-003 — Designer-to-client handover.

A designer or agency builds a site, transfers ownership to the business owner, and keeps a contributor role the owner can revoke at any time.

**Acceptance evidence:** Build a site as a designer, transfer ownership to a new owner, see the designer drop to editor, and revoke them.

*Status:* missing. Ownership cannot be transferred in the product.

#### ROLE-004 — Two-step sign-in and passkeys for workspace users.

Every workspace person signs in through Base's native operator sign-in: an email sign-in link, or an identity provider (Auth, Google, Microsoft Entra ID or Okta) over OIDC. On top of that, each person can register passkeys (WebAuthn) and an authenticator-app one-time code (TOTP) with single-use recovery codes, and the owner can require two-step sign-in for every role or for owner and admin only; a person without it is sent to enroll before reaching the workspace. Signing in through an identity provider that reports multi-factor authentication satisfies the requirement. Losing a second factor is recovered by the owner, never by email alone, and every enrollment, removal and recovery is in the activity log (`AUDIT-001`).

**Acceptance evidence:** Require two-step sign-in for all roles; sign in as an editor with an email link and see the enrollment step before `/app`; register a passkey and sign in with it; register TOTP and see a wrong or reused code refused; use a recovery code once and see it refused the second time; sign in through an OIDC provider that reports MFA and reach `/app` without a second prompt; and read each event in the activity log.

*Status:* partial. Email-link and OIDC sign-in exist; no passkeys, TOTP, recovery codes or owner-required two-step sign-in.

#### AUDIT-001 — Activity log of every change.

One log records every edit, publication, rollback, setting change, connection change, import, erasure, role change and agent action (`AGENT-008`) with actor, time and subject. It is readable by the owner, exportable and survives erasure of the subject with the actor anonymized where required.

**Acceptance evidence:** Perform each kind of action, read the log in order, export it, erase a person and see their actor entries anonymized while the log remains.

*Status:* partial. Only publication and rollback approvals are recorded.

### Moving in from incumbents

#### IMPORT-001 — WordPress.com and WordPress import.

Pane imports a WordPress export (WXR XML) from WordPress.com or self-hosted WordPress: pages, posts, categories, tags, authors, featured images and media files fetched from their references, menus where present, comments (approved, pending and spam, with author name, email, URL, date and reply threading) into `CMS-010`, and every old URL mapped for redirects. Shortcodes and plugin blocks it cannot render are listed, not dropped silently.

**Acceptance evidence:** Import a real WordPress.com export with 100 posts, media and at least 50 comments including threaded replies and pending ones, review the plan and its exceptions (including the comment counts by state), apply as an unpublished draft, see every comment on its post with the same threading and state, and open every old URL on the new site through its redirect. The import passes only when: every source page, post, collection item, event and gallery image is present on the new site or listed in the `IMPORT-005` report with a reason; each page's, post's and item's visible text matches the source's after whitespace normalization; every source image is fetched and served through `MEDIA-002` or listed as unfetchable; every old URL from the source sitemap and crawl answers 301 to a new URL that answers 200; on each imported page, blog post, collection item and event (its body and every rich-text field, held in the `CMS-011` editor) every source link and button is present with the same destination (internal targets resolved through the URL map to the new URL, anchors to the matching section anchor, files to their `MEDIA-001` copy, and external, `mailto:`, `tel:` and `sms:` targets unchanged), each source heading has the same level, each source list is a list of the same type with the same items, and each inline image is in the same place in the body with its caption and alt text; and the applied counts per content type equal the report's counts.

*Status:* missing. Only the documented static-site JSON imports (`MOVEIN-001`).

#### IMPORT-002 — Squarespace import.

Pane imports a Squarespace site from its WordPress-format export plus a crawl of the published site for what the export omits, keeping the URL map. Each Squarespace blog page becomes its own blog (`CMS-004`) with its posts, feed URL and comments (`CMS-010`). Restaurant menu blocks become items in a menu-items collection (`CMS-001`) with section, name, description and USD price, shown through a collection list (`CMS-003`). Calendar (events) pages are imported into the events collection (`CMS-009`) with each event's title, description, image, start and end time in the site's time zone, location and its register or buy link, read from the calendar page's published event data, and old event URLs redirect to the new event pages. Gallery pages and gallery sections are rebuilt as gallery blocks (`PAGE-012`) with their images and captions, and other page layouts are rebuilt as sections from the crawl, with Squarespace blocks mapped to the `PAGE-014` catalog (text with its heading levels, formatting, lists and links; button, quote, line, spacer, accordion, social links, audio, code, chart, scrolling text and shape blocks) and every link and button target kept. Blog post bodies are mapped the same way into the `CMS-011` editor, keeping inline images with their captions, quotes, video embeds, buttons and links. Each Squarespace form block becomes a working `FORM-001` form on the same page with the same fields in the same order, each field's type, label, description and required setting, the submit label, the confirmation message or redirect, and the notification recipients (`FORM-003`); a field type with no equivalent is listed in the report. Products are written to a Stall product import file (or listed with their Stripe or PayPal replacements) because checkout belongs to Stall (`LINK-002`), and scheduling blocks keep their Acuity link (`LINK-001`). Whatever still cannot map is listed in the report (`IMPORT-005`), never left as an unexplained to-do.

**Acceptance evidence:** Import a test Squarespace site with two blog pages with comments, a calendar page of 12 events (past and upcoming, one with a product block), a gallery page, a menu block of 20 items and a scheduling block; review the report and apply. The import passes only when: every source page, post, collection item, event and gallery image is present on the new site or listed in the `IMPORT-005` report with a reason; each page's, post's and item's visible text matches the source's after whitespace normalization; every source image is fetched and served through `MEDIA-002` or listed as unfetchable; every old URL from the source sitemap and crawl answers 301 to a new URL that answers 200; on each imported page, blog post, collection item and event (its body and every rich-text field, held in the `CMS-011` editor) every source link and button is present with the same destination (internal targets resolved through the URL map to the new URL, anchors to the matching section anchor, files to their `MEDIA-001` copy, and external, `mailto:`, `tel:` and `sms:` targets unchanged), each source heading has the same level, each source list is a list of the same type with the same items, and each inline image is in the same place in the body with its caption and alt text; and the applied counts per content type equal the report's counts. In addition: each blog page is its own blog with its own feed and every comment on its post with threading and state; every event is in the events collection with correct local times, its old URL redirecting to it and the upcoming split right; the 20 menu items are in the menu-items collection with their prices; the scheduling block keeps its Acuity link; the product is in a Stall import file; a post holding headings, a list, two inline images with captions, a quote, a YouTube video, a button and links to a service page, another post and a PDF passes the link, heading, list and inline-image checks; and a contact form block with a required field and a field description becomes a `FORM-001` form that refuses the empty required field and delivers a test submission to the same recipient.

*Status:* missing. No Squarespace import.

#### IMPORT-003 — Wix import.

Because Wix offers no full site export, Pane imports a Wix site by crawling its published pages and blog (and the blog's RSS) with the owner's proof of domain control, rebuilding pages from the content and keeping the URL map.

**Acceptance evidence:** Import a published Wix test site with a blog by crawl, review the mapping and apply. The import passes only when: every source page, post, collection item, event and gallery image is present on the new site or listed in the `IMPORT-005` report with a reason; each page's, post's and item's visible text matches the source's after whitespace normalization; every source image is fetched and served through `MEDIA-002` or listed as unfetchable; every old URL from the source sitemap and crawl answers 301 to a new URL that answers 200; on each imported page, blog post, collection item and event (its body and every rich-text field, held in the `CMS-011` editor) every source link and button is present with the same destination (internal targets resolved through the URL map to the new URL, anchors to the matching section anchor, files to their `MEDIA-001` copy, and external, `mailto:`, `tel:` and `sms:` targets unchanged), each source heading has the same level, each source list is a list of the same type with the same items, and each inline image is in the same place in the body with its caption and alt text; and the applied counts per content type equal the report's counts. The source's page and post list is its published sitemap plus the crawl, and blog posts are checked against the blog's RSS.

*Status:* missing. No Wix import.

#### IMPORT-004 — Webflow, Framer and Durable import.

Pane imports Webflow and Framer CMS CSV exports (`CMS-007`) and their published pages by crawl, and Durable sites by crawl, with the same review, exceptions and URL map.

**Acceptance evidence:** Import a Webflow site with two collections, a Framer site with one collection and a published Durable site by crawl, review exceptions for each and apply. The import passes only when: every source page, post, collection item, event and gallery image is present on the new site or listed in the `IMPORT-005` report with a reason; each page's, post's and item's visible text matches the source's after whitespace normalization; every source image is fetched and served through `MEDIA-002` or listed as unfetchable; every old URL from the source sitemap and crawl answers 301 to a new URL that answers 200; on each imported page, blog post, collection item and event (its body and every rich-text field, held in the `CMS-011` editor) every source link and button is present with the same destination (internal targets resolved through the URL map to the new URL, anchors to the matching section anchor, files to their `MEDIA-001` copy, and external, `mailto:`, `tel:` and `sms:` targets unchanged), each source heading has the same level, each source list is a list of the same type with the same items, and each inline image is in the same place in the body with its caption and alt text; and the applied counts per content type equal the report's counts. The rule is applied to each of the three sites separately, and every CSV row of each Webflow and Framer collection is an item with each field's value equal to the CSV's.

*Status:* missing. No Webflow, Framer or Durable import.

#### IMPORT-005 — Migration report and URL map.

Every import shows, before anything is written, a report of what will map where, what will not (with reasons), counts per content type (pages, posts, comments by state, collection items, events, galleries, media, products handed to Stall), every old URL and its new target, media that could not be fetched, and each form's old destination. Apply needs the report's fingerprint; undo works while the draft is unpublished (`MOVEIN-001`). After apply, the report is re-checked against the new site with the import pass rule every incumbent import (`IMPORT-001` to `IMPORT-004`) states, including its link, button, heading, list and inline-image checks on every page, post, collection item and event, and any item that fails it (for example a link whose internal target did not import) is added to the report with its reason. The report also states plainly what stays behind with the old platform, including its traffic and sales analytics history.

**Acceptance evidence:** Run an import with unsupported content, comments, a post linking to a page the import skips and a broken image link; read the report, see the post's dangling link listed after apply, with its per-type counts, apply with its fingerprint, see the applied counts equal the report's, and undo.

*Status:* partial. A fingerprinted plan exists for the static JSON only; no URL map, media or form-destination report.

#### IMPORT-006 — Verified cutover with the old site kept.

Cutover is a checked step: Pane confirms the new site's pages, redirects, forms and lead routes work on a preview hostname, that mailbox records are kept (`DOMAIN-003`) and that every registrar email forwarding alias has been recreated and proven (`DOMAIN-005`), then switches the domain (`DOMAIN-001`) while the old site stays reachable until the owner closes it, and rolls the DNS back in one action if needed.

**Acceptance evidence:** Cut a test domain with Google Workspace MX records and Squarespace email forwarding over from an old host: see cutover refused until every forwarding alias is proven, see pre-cutover checks pass, then roll back and forward again with mailbox mail and every forwarded alias still delivering.

*Status:* missing. No cutover.

#### IMPORT-007 — Enquiry and subscriber history import.

An owner moving in brings their history: past form submissions exported from Squarespace (form storage and contacts), Wix (form submissions CSV) or WordPress.com (form responses CSV) import into the inbox with their original dates, form and fields, marked as imported and not re-notified; and the old platform's newsletter subscriber list imports into Mango or Mailchimp (`LINK-003`) with each subscriber's original consent date and source carried and unsubscribed or bounced contacts kept suppressed, never re-subscribed. Analytics history can come too: a monthly visits-by-page CSV exported from Squarespace Analytics (or Wix or WordPress.com stats) imports as a baseline that `STATS-001` charts before Pane's own counts begin, marked as imported; without one, the migration report (`IMPORT-005`) says that traffic and sales history stays with the old platform.

**Acceptance evidence:** Import a Squarespace form-submissions CSV of 200 rows and a subscriber list with 20 unsubscribed contacts; see the 200 enquiries in the inbox with original dates and no notifications sent, and see the subscribers in Mango and in a Mailchimp test audience with consent dates and source kept and the 20 unsubscribed contacts suppressed. Import a 12-month Squarespace Analytics visits-by-page CSV and see each month's visits per page in `STATS-001`, labeled imported, matching the CSV's totals.

*Status:* missing. Only the static-site JSON move-in exists; no submission or subscriber import.

### Portability, privacy and US norms

#### EXPORT-001 — Open-format site export.

Besides the installation archive (`BACKUP-001`), the owner exports content in open formats: WordPress WXR for pages and posts, CSV for each collection and form, a ZIP of original media, and a static HTML copy of the live site that runs on any host.

**Acceptance evidence:** Export a populated site in every format, import the WXR into WordPress, open the CSVs, and serve the static copy from a plain web server.

*Status:* partial. Only Pane's own installation archive exports.

#### PRIV-001 — Consent for analytics and third-party embeds.

Pane's own counting needs no consent. When the owner adds GA4, the Meta Pixel, the Google tag for Google Ads (`STATS-005`), custom header code (`PAGE-008`) or a third-party embed, a consent banner appears with US-appropriate choices, Global Privacy Control is honored as an opt-out of sale and sharing, and nothing third-party loads before the choice. Under GPC no advertising pixel or tag loads at all and no server-side conversion (`STATS-005`) is sent for that visit.

**Acceptance evidence:** Add GA4, the Meta Pixel, a Google Ads tag and a YouTube embed, visit with and without GPC, and see no third-party request before consent, and none at all under GPC for GA4, the Meta Pixel or the Google tag; submit a form under GPC and see no Conversions API or enhanced-conversion request sent.

*Status:* partial. Current external embeds require explicit per-origin consent and stay off under GPC, including saved grants. GA4, Meta, Google Ads, custom code and server-side conversion consent remain unproved.

#### PRIV-002 — Person-level privacy requests.

For a CCPA or similar request, the owner finds everything stored about one email address (enquiries, consents, files, blog comments, subscriber records and the CRM deliveries Pane made), exports it for the person and erases it in one action, with the erasure fenced against old backups (`ERASE-001`) and the downstream services listed for follow-up.

**Acceptance evidence:** Submit three forms as one person, run a request by email, export their data, erase it, and see every record gone, the fence in place and the CRM deliveries listed.

*Status:* partial. One message can be erased by ID; no lookup, export or erasure by person.

#### PRIV-003 — Policy and accessibility statement starters.

Pane offers starter privacy policy, terms and accessibility statement pages that list what this site actually collects and which services it connects, for the owner to review; they are clearly marked as starters, not legal advice.

**Acceptance evidence:** Connect GA4 and a CRM, generate the privacy policy starter, and see both services named; edit and publish it.

*Status:* missing. No policy pages.

#### PRIV-004 — Security headers on every page.

Workspace and live pages send a strict content security policy, frame protection, `nosniff`, a referrer policy and a permissions policy; the live site's policy widens only for embeds the owner added (`PAGE-008`).

The installation's shared Lobby (`/`), sign-in (`/signin` and `/auth/*` pages) and setup (`/setup`) documents are workspace pages for this clause: each sends the same permissions policy, `camera=(), microphone=(), geolocation=()`, as workspace and live pages, without changing their sign-in behavior or content security policy. That policy also applies to every frame inside a page and an embed's `allow` attribute cannot override it; the live site delegates one of these features only to a named embed's own origin, on the page holding it, after consent (`PRIV-001`), and only where a target clause names that need.

The current embed door stores a supported HTTPS provider URL in an immutable page revision. Only its published page lists that exact origin in frame-src; workspace and draft previews stay inert. Visitor consent is per provider origin and can be revoked; GPC keeps these embeds off even after saved consent. PAGE-008, MEDIA-004, PRIV-001, LINK-001, STATS-003 and STATS-005 inherit the same origin, consent and workspace boundaries when they add a door. No current embed delegates device permissions.

**Acceptance evidence:** Read the headers on every page type and see the policy; add an embed and see only its host added.

*Status:* done. Current first-party HTML page types carry their security policy. Native auth refusals are preserved, and owner-approved embeds widen only their published page’s frame policy after an inert draft, with explicit visitor consent and GPC suppression.

#### LOCALE-001 — US defaults.

The workspace and live site default to US English, the business's US time zone with daylight saving, US date and time formats, USD prices, US phone and address formats, and Sunday-start calendars; a business can change each.

**Acceptance evidence:** Set the time zone to America/Denver, and see workspace dates, scheduled times and opening hours in local US format with USD prices.

*Status:* partial. The owner can persist a US business time zone, used by schedule controls, execution and Sites schedule history with daylight saving. Other workspace timestamps still use the viewer zone; opening-hours, price and other locale settings remain missing.

### Owner mobile

#### MOBILE-001 — Responsive owner workspace on a phone.

Every workspace task works on a 390-wide phone browser: editing, previewing, approving, replying to enquiries and reading stats, with no horizontal scroll.

**Acceptance evidence:** Run the full browser journey at 390 wide, including the target editor, approvals and inbox replies, with no overflow and a passing accessibility run.

*Status:* partial. The current workspace is checked for overflow at 390 wide; the target editor, inbox replies and approvals on a phone are not built.

#### MOBILE-002 — Native iOS and Android owner app.

A native owner app sends push notifications for new enquiries, review requests and site problems, lets the owner reply, approve and publish, post to the blog with photos from the camera, and read stats. Its post editor writes `CMS-011` bodies with every paragraph style, inline format, list and link destination, and image (camera or library, with caption and alt text), gallery, quote, button, line and video embed blocks; any other block in a post is shown as a labeled placeholder and kept unchanged when the post is saved from the phone. It uses the installation's own sign-in and holds no content offline beyond what the owner opens.

**Acceptance evidence:** Install the app on iOS and Android test devices, receive a push for a new enquiry, reply, approve a review request and publish a photo post holding an H2, a bulleted list, a link to a page and two camera photos with captions; the live post passes the `CMS-011` DOM checks. Edit a desktop-written post containing a form block on the phone and see the form block unchanged after saving.

*Status:* missing. No native app.

### Automation and follow-up

#### AUTO-001 — Form-triggered automations.

The owner sets rules on form submission: acknowledge the sender, notify people, create a follow-up task, post to Nook, Slack or Microsoft Teams, route to a CRM or tag the enquiry, with conditions on form and field values.

**Acceptance evidence:** Create a rule that posts quote requests over $5,000 to a Nook channel, a Slack test channel and a Microsoft Teams test channel and tags them; submit two forms and see only the large one posted to all three and tagged.

*Status:* missing. No automations.

#### AUTO-002 — Scheduled automations.

Time-based rules run on the owner's schedule in their US time zone: holiday-hour banners, recurring reminders to review stale pages, and expiring promotions.

**Acceptance evidence:** Schedule a holiday banner for Thanksgiving and a quarterly page-review reminder, advance the clock, and see both happen at local time.

*Status:* done. Approved holiday/promotion windows and recurring stale-page reminders execute through the Worker cron in the business US time zone. Exact revision approval, durable execution history, review actions, replay refusal and daylight-saving behavior are proven; reminders remain in the workspace.

#### AUTO-003 — Share new posts to social accounts.

On publication a post can be shared to the business's connected Facebook Page, Instagram, LinkedIn Page or X account with owner-approved text.

**Acceptance evidence:** Connect a test Facebook Page, Instagram professional account, LinkedIn Page and X account, publish a post with sharing on, and see each of the four shares created with its link (the Instagram share with the post's featured image).

*Status:* missing. No social connections.

#### AUTO-004 — Site problem alerts.

Pane alerts the owner when a form delivery fails, a connection breaks, a certificate or domain is near expiry, a page returns errors or links break, and can hand external uptime checks to Uptime.

**Acceptance evidence:** Break a webhook, expire a test certificate and add a broken link; see one alert per problem by email and push, and see Uptime monitors created for the live site on request.

*Status:* missing. No alerts.

### AI site building

#### AI-001 — Draft a whole site from business facts.

From the owner's business facts (name, services, service area, hours, prices, team, tone, photos), Pane drafts a complete site: pages, sections, collections, copy, menus, search titles and structured data, using the owner's photos or clearly marked placeholders. The result is an unpublished draft the owner previews and edits; nothing is published without approval, and no reviews, credentials or prices are invented.

**Acceptance evidence:** Enter facts for a test plumbing business (six services with USD prices, two staff, weekly hours, two real reviews), receive a draft site within two minutes and preview every page. A check over the draft's text and structured data passes only when: every price, review, staff name, credential, phone number and opening hour in the draft equals an entered fact or is marked as a placeholder; every entered service has its own page or collection item; every entered staff member and review appears; and every image is an owner photo or a marked placeholder. Publish after edits.

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

*What the agent does:* With the owner's permission, sends clearly labeled test submissions through each form on a schedule and checks the whole path: stored, notification accepted, CRM record created (`FORM-005`), booking handoff working. On a failure it identifies the broken step, files a repair task to the right person and re-checks after repair; it also flags real enquiries that have no owner or reply (`FORM-006`).

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
- **Business email hosting.** Mailboxes stay with Google Workspace or Microsoft 365; Pane preserves their DNS records (`DOMAIN-003`), recreates registrar email forwarding in the owner's Cloudflare Email Routing (`DOMAIN-005`) and sends form mail through the installation relay or the owner's account.
- **Rebuilding neighboring products.** CRM, booking, store, memberships billing, email marketing, help desk, surveys, chat, uptime monitoring and observability stay with the sibling or incumbent named in [Neighboring products stay separate](#neighboring-products-stay-separate), each with its connection status visible.
- **WordPress plugins and lossless import of every site.** Pane does not run WordPress plugins or themes. Imports bring content, media and URLs with every exception listed (`IMPORT-005`); a site that depends on a specialist plugin keeps that service through an embed, a connection or WordPress hosting.
- **Rankings, legal compliance and invented claims.** Pane provides search controls and agents that report evidence, not guaranteed rankings. Policy starters and accessibility checks support, but do not replace, the owner's own legal review. Pane never publishes invented reviews, credentials, staff or prices.
- **US first.** Defaults are US English, US time zones, USD and US formats (`LOCALE-001`); other locales and currencies are settings, and translated pages are drafts the owner approves (`AI-002`). No HIPAA business associate agreement is offered; a clinic keeps patient intake in its practice system (for example Balm) and links to it.

## Retained safety rules

The released security, erasure, audit and portability rules continue under every target clause: server-side authorization on every handler (`ACCESS-001`), canonical-origin mutations (`ACCESS-002`), immutable revisions with recorded approvals (`PUBLISH-001`, `PUBLISH-003`), idempotent public submissions (`INBOX-001`), cookie-free counting (`VISIT-001`), erasure committed with the portability fence (`ERASE-001`), journaled import undo (`MOVEIN-001`) and restore only into an empty installation (`BACKUP-001`). `/health` identifies the deployment and unknown paths return 404 (`HEALTH-001`). See README.md for public operations and SEED-COMMAND-CONTRACT.md for the shared command contract.

## Presentation and run site

The public run site is a static build of the picked Pane homepage, `/run` and Markdown documentation, with no installation sign-in links (`RUNSITE-001`). The installed `/` uses the shared Lobby; `/app` keeps its anchored workspace sections; the fuchsia (`--pn-fuchsia: #f5026f`, with `--pn-action: #e8176e` actions) and self-hosted Figtree theme is shared across `/`, `/signin`, `/setup` and `/app` (`LOBBY-001`). Previews use the public business site typography and an explicit draft banner; live business pages carry no Pane branding (`PRESENT-001`). Owner-approved homepage, interface and behavior are unchanged by this edition.

## Scope list mapping

How the owner-approved scope for Pane (16 October 2026) maps to clauses:

| Scope item | Clauses |
| --- | --- |
| Remove the five-page ceiling: a visual section/block editor with unlimited pages, navigation, responsive templates and site-wide brand styles | `PAGE-001` to `PAGE-015`, `STYLE-001` to `STYLE-004` |
| Custom domain connection with apex routing, SSL and clear DNS status, plus fast global hosting | `DOMAIN-001` to `DOMAIN-005`, `HOST-001` to `HOST-005` |
| CMS collections and a blog (services, team, articles, testimonials, projects) with scheduling and RSS | `CMS-001` to `CMS-011` |
| SEO toolkit: titles, descriptions, clean URLs, sitemap, redirects, canonical and structured data, social cards and Search Console | `SEO-001` to `SEO-010`, `PAGE-001` |
| Forms with spam protection that route leads to Orbit/HubSpot and email, plus Dial booking, Stall checkout and Mango signup embeds; analytics via Vane | `FORM-001` to `FORM-008`, `LINK-001` to `LINK-005`, `STATS-001` to `STATS-005` |
| Media library with image optimization, and an AI site builder that drafts the site from business facts | `MEDIA-001` to `MEDIA-004`, `AI-001` to `AI-004` |
| Push further: an agent interviews the owner and builds the site from verified facts, then watches for outdated services, broken forms, lost search traffic and unanswered enquiries, proposing changes through preview and approval and measuring the leads and bookings they produce | `AGENT-001` to `AGENT-008` |

The category inventory's table-stakes features and integrations are each covered by a clause above: contributor permissions (`ROLE-001`), revision rollback (`PUBLISH-004`), content export (`EXPORT-001`), Google Maps, YouTube and Vimeo (`MEDIA-004`), Gmail and Google Workspace (`FORM-003`, `DOMAIN-003`), Google Drive and Sheets (`FORM-007`), Zapier (`LINK-004`), automatic platform updates (`HOST-003`) and form acknowledgments and staff tasks (`FORM-004`, `AUTO-001`).

## Homepage claims

No desk homepage claims file (`CLAIMS.md`) exists for Pane on 17 October 2026. When the desk publishes one, each claim maps to a clause in a table here; a claim without a clause becomes a clause.

## Status

Judged from the code and tests at commit `87642d31c272aeced3a71ac29f0519273bada446` (21 October 2026).

| Clauses | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Published | 16 | 0 | 0 | 16 |
| Target and push further | 7 | 32 | 70 | 109 |
| All | 23 | 32 | 70 | 125 |

| Clause | Title | Kind | Status | Evidence | Gap |
| --- | --- | --- | --- | --- | --- |
| `ACCESS-001` | Server-side role authorization | published | done | `src/pane/handler.ts`; `tests/pane.test.mjs` |  |
| `ACCESS-002` | Canonical-origin mutations | published | done | `src/pane/handler.ts`; `src/pane/public.ts`; `tests/pane.test.mjs` |  |
| `PUBLISH-001` | Immutable complete revisions | published | done | `src/pane/content.ts`; `tests/pane.test.mjs` |  |
| `PUBLISH-002` | Private draft preview | published | done | `src/pane/handler.ts`; `src/pane/public-view.ts`; `tests/pane.test.mjs` |  |
| `PUBLISH-003` | Owner-approved atomic publication | published | done | `src/pane/content.ts`; `tests/pane.test.mjs`; `scripts/browser-journey.mjs` |  |
| `PUBLISH-004` | One-action rollback | published | done | `src/pane/content.ts`; `tests/pane.test.mjs`; `scripts/browser-journey.mjs` |  |
| `INBOX-001` | Durable, escaped and idempotent contact submissions | published | done | `src/pane/public.ts`; `tests/pane.test.mjs` |  |
| `VISIT-001` | Cookie-free aggregate visit counts | published | done | `src/pane/public.ts`; `tests/pane.test.mjs` |  |
| `MOVEIN-001` | Reviewed static-site move-in with guarded undo | published | done | `src/pane/imports.ts`; `tests/pane.test.mjs`; `docs/MOVE-IN.md` |  |
| `BACKUP-001` | Export and restore into an empty installation | published | done | `scripts/pane-policy.mjs`; `tests/pane.test.mjs`; `docs/BACKUP-RESTORE.md` |  |
| `ERASE-001` | Message erasure fenced against old backups | published | done | `src/pane/handler.ts`; `tests/pane.test.mjs` |  |
| `HEALTH-001` | Deployment health and unknown paths | published | done | `tests/search.test.mjs` — health identifies the local deployment and unknown installed paths return 404; `scripts/deployment-journey.mjs` — deployment identity, migrations and removal (local and hosted identity against the deploy record, RunEditRun sandbox 2026-10-21, source dfc3ce80c9d4806c8c0e13363d786dee4e12cbb9); `scripts/health-browser-journey.mjs` — health and unknown installed path at 1440 and 390 |  |
| `DEPLOY-001` | Install on the owner's Cloudflare account | published | done | `scripts/deployment-journey.mjs` — deployment identity, migrations and removal: actual rer deploy, all 16 D1 migrations read back by filename and hash, local and deployed health matching the record, guarded removal with absence readback (RunEditRun sandbox 2026-10-21, source dfc3ce80c9d4806c8c0e13363d786dee4e12cbb9); `scripts/health-browser-journey.mjs` — deployed health and unknown installed path at 1440 and 390 |  |
| `RUNSITE-001` | Public run site and documentation | published | done | `tests/site.test.mjs`; `docs/site.json` |  |
| `LOBBY-001` | Shared Lobby, workspace and theme | published | done | `src/server.ts`; `src/pane/views.ts`; `public/site/theme.css`; `public/fonts/fonts.css`; `scripts/browser-journey.mjs` |  |
| `PRESENT-001` | Labeled previews and unbranded live pages | published | done | `src/pane/public-view.ts`; `src/pane/views.ts`; `tests/pane.test.mjs`; `scripts/browser-journey.mjs` |  |
| `PAGE-001` | Unlimited pages, folders and clean URLs | target | done | `tests/pane.test.mjs` — “page organization keeps stable identities, complete revisions, safe edits and chosen public home and not-found content” (identities, folders, chosen home, nested preview, deleted retention, edited 404/search/links, conflict refusal, publication/rollback); `tests/search.test.mjs` — “published URL changes offer explicit redirects and each revision owns its exact status and target map” (rename/deletion offers, chosen 301 targets); `scripts/pages-journey.mjs` — “Forty-page editor journey” (40 pages created through editor in three folders, order/hide/home, two renamed slugs and one deletion, all current/old URLs, complete 40-entry snapshot, edited 404, tab reopen, five undo/redo steps and structural conflicts at 1440/390; exact candidate heavy-slot run cited in campaign plan) | None. |
| `PAGE-002` | Visual section and block editor with layout controls | target | partial | `src/pane/views.ts`; `src/pane/handler.ts` | Content is edited as name, description and a pages JSON text field; no visual canvas, sections, blocks, grid placement, column ratios, section backgrounds, padding or image cropping. |
| `PAGE-003` | Navigation menus, header and footer | target | done | `tests/pane.test.mjs` — “published navigation keeps ordered dropdowns, links, CTA, footer and shared accessible social profiles with hidden pages excluded” (order, both dropdowns, external/CTA destinations, hidden exclusion, footer details/links, all eight named social profiles, draft isolation and rollback); `scripts/navigation-journey.mjs` — “Navigation editor and published menus” (editor controls, mouse/keyboard, 1440/390 mobile disclosure and Instagram/Facebook/Yelp destinations in header/footer) | None. |
| `PAGE-004` | Reusable sections and global components | target | missing |  | No components; pages are plain text. |
| `PAGE-005` | Device previews and a separate mobile layout | target | partial | `src/pane/handler.ts`; `src/pane/public-view.ts` | One responsive preview; no width switcher, separate phone layout or per-device settings. |
| `PAGE-006` | Autosave, undo and safe concurrent editing | target | done | `src/pane/content.ts`; `src/pane/handler.ts`; `src/pane/ui/editor.ts`; `public/pane-autosave.js`; `tests/pane.test.mjs`; `scripts/editing-journey.mjs` |  |
| `PAGE-007` | Page status and review requests | target | partial | `src/pane/content.ts`; `src/pane/handler.ts` | Whole-site drafts and owner approval only; no per-page status or review request. |
| `PAGE-008` | Custom code, embeds and CSS | target | partial | `tests/search.test.mjs` — only an approved page embed widens its frame policy and workspace previews stay inert; `scripts/privacy-journey.mjs` — published URL embed, consent and opaque sandbox | Supported URL embeds are revisioned, sandboxed, consent-gated and confined to their published page. Arbitrary HTML, custom CSS, site-wide header/footer code, per-page header code and pane:goal events remain unproved. |
| `PAGE-009` | Accessible output by default | target | partial | `src/pane/views.ts`; `src/pane/public-view.ts`; `scripts/browser-journey.mjs` | Skip link and labeled contact fields exist; no alt-text, heading or contrast checks and no automated accessibility test. |
| `PAGE-010` | Duplicate pages and starter layouts | target | missing |  | No page creation. |
| `PAGE-011` | Password-protected and member-only pages and site | target | missing |  | Every live page is public; no site-wide gate or coming-soon page. |
| `PAGE-012` | Gallery blocks with grid, slideshow and lightbox | target | missing |  | No images or galleries. |
| `PAGE-013` | Promotional pop-up and announcement bar | target | partial | `scripts/scheduling-journey.mjs` — “Business-local scheduling journey” (scheduled announcement bar appears and expires on time at 1440/390) | Promotional pop-ups, chosen-page targeting, delay/scroll/exit triggers, seven-day browser-storage frequency cap and accessible dialog behavior remain unimplemented. |
| `PAGE-014` | Block catalog, text formatting and links | target | partial | `src/pane/public-view.ts` | Page bodies are plain text split into escaped paragraphs; no block catalog, headings inside a page, inline formatting, lists, alignment, links, buttons or anchors. |
| `PAGE-015` | Trash and single page or post restore | target | partial | `src/pane/content.ts`; `tests/pane.test.mjs` | Immutable whole-site revisions and whole-site rollback only; no trash, per-page history or single page, post or item restore. |
| `STYLE-001` | Responsive templates for US local businesses | target | partial | `public/pane.css`; `src/pane/public-view.ts` | One fixed responsive layout; no template catalog. |
| `STYLE-002` | Site-wide brand styles | target | partial | `public/pane.css` | Styles are fixed in source CSS; no owner style controls. |
| `STYLE-003` | Switch templates without rebuilding content | target | missing |  | No templates to switch between. |
| `STYLE-004` | Logo, favicon and brand kit | target | missing |  | The live header shows the business name as text only. |
| `MEDIA-001` | Media library with alt text and usage | target | missing |  | No uploads or media storage. |
| `MEDIA-002` | Responsive image optimization | target | missing |  | No images. |
| `MEDIA-003` | Basic image editing | target | missing |  | No images. |
| `MEDIA-004` | Video, map, social embeds and Instagram feed | target | partial | `scripts/privacy-journey.mjs` — owner-added YouTube URL embed waits for consent, keeps only its host in CSP and is suppressed under GPC | YouTube URL embed isolation is proved at both widths. Uploaded video, captions/renditions, actual playback, other named provider embeds and the official Instagram feed/refresh/revocation remain unproved. |
| `CMS-001` | Structured collections with typed fields | target | missing |  | No collections. |
| `CMS-002` | Collection template pages with item URLs | target | missing |  | No collections. |
| `CMS-003` | Collection lists and filters on any page | target | missing |  | No collections. |
| `CMS-004` | Blog with categories, tags and authors | target | missing |  | No blog. |
| `CMS-005` | Scheduled publishing and expiry | target | partial | `tests/pane.test.mjs` — “approved business-local schedules drive banners and reminders while drafts, roles and invalid DST dates stay fenced” (Denver promotion expiry across spring DST and unapproved schedule refusal); `scripts/scheduling-journey.mjs` — “Business-local scheduling journey” (Chicago announcement activation/expiry across fall DST, actual event history and due unapproved draft flag at 1440/390) | The scheduled post at 09:00 America/Chicago and selective scheduling of pages, posts and collection items remain unimplemented. Announcement schedules are bound to the approved immutable revision; these future doors inherit that approval fence and actual execution history. |
| `CMS-006` | RSS and podcast feeds and new-post notifications | target | missing |  | No feeds or subscribers. |
| `CMS-007` | Collection CSV import and export | target | missing |  | Only the static-site JSON move-in exists (`MOVEIN-001`). |
| `CMS-008` | Site search | target | partial | `src/pane/site-search.ts`; `src/pane/public.ts`; `src/pane/public-view.ts`; `tests/search.test.mjs`; `scripts/search-journey.mjs` | Visitors search the current published pages at `/site/search`, with Unicode-normalized matching and links to results. Drafts stay private and publication/rollback update results atomically. Posts, collection items and protected-page filtering still await CMS-001, CMS-002, CMS-004 and PAGE-011. |
| `CMS-009` | Events calendar with list and month views | target | missing |  | No events or calendar. |
| `CMS-010` | Blog comments and moderation | target | missing |  | No comments, moderation queue or moderator notifications. |
| `CMS-011` | Post and collection item bodies in the block editor | target | missing |  | No blog posts or collection items exist; page bodies are escaped plain paragraphs, so no post or item body editor. |
| `DOMAIN-001` | Connect a custom domain with apex and www | target | missing |  | The business site is served only at `/site` on the Worker origin; no domain connection or alias domains. |
| `DOMAIN-002` | Managed HTTPS and certificate status | target | missing |  | No domain or certificate handling beyond the Worker's default hostname. |
| `DOMAIN-003` | DNS status that preserves business email | target | missing |  | No DNS reading or writing. |
| `DOMAIN-004` | Domain registration and transfer guidance | target | missing |  | No domain guidance. |
| `DOMAIN-005` | Registrar email forwarding carried over | target | missing |  | No DNS reading, forwarding detection or Email Routing setup. |
| `HOST-001` | The business site at the domain root, fast | target | partial | `src/pane/public.ts` | Live pages are served at `/site` with `no-store`, reading D1 on every request; no edge cache or performance budget. |
| `HOST-002` | The live site survives an admin outage | target | missing |  | Every public request reads D1. |
| `HOST-003` | Updates without plugin maintenance | target | missing |  | No in-product update channel. |
| `HOST-004` | Transparent running cost in USD | target | missing |  | No usage or cost view. |
| `HOST-005` | Install from the browser with no terminal | target | missing |  | Installation runs through `rer deploy` or the `npx @runeditrun/rer` command line only; no browser install path. |
| `SEO-001` | Page titles and meta descriptions | target | partial | `src/pane/search.ts`; `src/pane/search-settings.ts`; `src/pane/search-view.ts`; `tests/search.test.mjs`; `scripts/search-journey.mjs` | Current pages have editable search titles and descriptions, defaults and a saved search preview. Posts and collection items still depend on CMS-001, CMS-002 and CMS-004. |
| `SEO-002` | Redirect manager and slug-change redirects | target | done | `tests/search.test.mjs` — “published URL changes offer explicit redirects and each revision owns its exact status and target map” (rename/deletion offers, chosen 301/302 GET/HEAD targets, draft isolation, invalid/cyclic targets, atomic malformed-CSV refusal and rollback); `scripts/redirects-journey.mjs` — “Redirect manager journey” (accepted published-slug offer, individual 301/302 addition/retargeting/deletion, quoted 200-row CSV import with every status/target requested, import undo/redo, publication and rollback at 1440/390; exact candidate heavy-slot run cited in campaign plan) | None. |
| `SEO-003` | Automatic sitemap and robots.txt | target | partial | `src/pane/search.ts`; `src/pane/search-settings.ts`; `src/pane/search-view.ts`; `tests/search.test.mjs`; `scripts/search-journey.mjs` | Published revisions generate sitemap.xml with last-modified dates and noindex exclusions, and editable robots.txt; drafts never change either and rollback restores them. Hidden/protected pages and post/item URLs await PAGE-001, PAGE-011 and CMS-001 to CMS-004. |
| `SEO-004` | Canonical URLs and indexing controls | target | partial | `src/pane/search.ts`; `src/pane/search-settings.ts`; `src/pane/search-view.ts`; `tests/search.test.mjs`; `scripts/search-journey.mjs` | Current pages have canonical URLs, custom canonical overrides and noindex controls; draft previews and development-origin pages send noindex. Primary custom-domain routing and www/apex acceptance await DOMAIN-001. |
| `SEO-005` | Structured data for local businesses | target | missing |  | No structured data. |
| `SEO-006` | Social preview cards | target | missing |  | No social metadata. |
| `SEO-007` | Google Search Console and Bing Webmaster Tools | target | missing |  | No search console connection. |
| `SEO-008` | Google Business Profile consistency | target | missing |  | No Google Business Profile connection. |
| `SEO-009` | Per-page search checks | target | partial | `src/pane/search-checks.ts`; `src/pane/search-view.ts`; `src/pane/ui/sites.ts`; `tests/search.test.mjs`; `scripts/search-journey.mjs` | Draft checks list missing or duplicate effective titles/descriptions and flag noindex for review, with links to the relevant settings from Search and Sites. Broken internal links, missing alt text and large-image checks await PAGE-014 and MEDIA-001/MEDIA-002. |
| `SEO-010` | Multilingual sites with per-language URLs | target | missing |  | No languages or translated pages. |
| `FORM-001` | Form builder with multiple forms | target | partial | `src/pane/public-view.ts`; `src/pane/public.ts` | One fixed contact form (name, email, message) with browser `required` and length limits; no form builder, configurable required fields, help text, per-field validation messages or file upload. |
| `FORM-002` | Spam protection | target | partial | `src/pane/public.ts`; `src/pane/public-view.ts` | Honeypot and per-minute limits exist but no Turnstile, no spam review and no test that a filled honeypot or a burst is refused. |
| `FORM-003` | Enquiry email to named recipients and reply | target | partial | `src/pane/views.ts`; `src/pane/data.ts` | Enquiries appear in the workspace inbox only; no notification email or reply. |
| `FORM-004` | Automatic acknowledgment to the sender | target | done | `tests/pane.test.mjs` — an approved form acknowledgment reaches the provider once with owner wording and durable independent status (SendGrid network edge acceptance, configured recipient/text/time, one send, failure/uncertainty retained, replay/erasure and development suppression); `scripts/acknowledgment-journey.mjs` — saved wording, explicit enable, owner publication, durable inquiry, suppression and disable at 1440 and 390 |  |
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
| `STATS-001` | Traffic by page, source, device and campaign | target | partial | `tests/pane.test.mjs` — traffic groups real public visit events without retaining raw referrers or unapproved identifiers and excludes privacy opt-outs (page/day/device/trusted location; registrable domains and channel groups; fixed medium and approved/known source; canonical case-insensitive campaigns and separate unapproved counts; no discarded text in any table; GPC/DNT zero writes); `scripts/traffic-journey.mjs` — published label settings, actual tagged phone/desktop visits, Yelp/ChatGPT domain/channel dashboard output, IP refusal, safe source/medium and unapproved counts, GPC exclusion at 1440 and 390 | ct's 22 Oct collection-policy fix is implemented with public-door and browser proof; remains partial per the ruling pending ct completion review. Historical counts retain their totals but discarded attribution cannot be recovered. |
| `STATS-002` | Conversion goals and click insights | target | missing |  | No goals. |
| `STATS-003` | Vane and Google Analytics 4 with consent | target | missing |  | No analytics connections. |
| `STATS-004` | Monthly owner report | target | missing |  | No reports. |
| `STATS-005` | Meta Pixel and Google Ads conversion tracking | target | missing |  | No Meta Pixel, Google Ads connection, goal-to-event mapping or server-side conversions. |
| `ROLE-001` | Roles for editors, authors, moderators and reporting | target | partial | `src/pane/handler.ts`; `tests/pane.test.mjs` | Owner, admin and member only; no editor, author, comment moderator, inbox or reporting role. |
| `ROLE-002` | Review requests and publish delegation | target | missing |  | Only the owner can publish. |
| `ROLE-003` | Designer-to-client handover | target | missing |  | Ownership cannot be transferred in the product. |
| `ROLE-004` | Two-step sign-in and passkeys for workspace users | target | partial | `src/modules/operator-auth/identity/email-link/index.mjs`; `src/modules/operator-auth/identity/oidc/index.mjs` | Email-link and OIDC sign-in exist; no passkeys, TOTP, recovery codes or owner-required two-step sign-in. |
| `AUDIT-001` | Activity log of every change | target | partial | `src/pane/data.ts`; `src/pane/content.ts` | Only publication and rollback approvals are recorded. |
| `IMPORT-001` | WordPress.com and WordPress import | target | missing |  | Only the documented static-site JSON imports (`MOVEIN-001`). |
| `IMPORT-002` | Squarespace import | target | missing |  | No Squarespace import. |
| `IMPORT-003` | Wix import | target | missing |  | No Wix import. |
| `IMPORT-004` | Webflow, Framer and Durable import | target | missing |  | No Webflow, Framer or Durable import. |
| `IMPORT-005` | Migration report and URL map | target | partial | `src/pane/imports.ts`; `tests/pane.test.mjs` | A fingerprinted plan exists for the static JSON only; no URL map, media or form-destination report. |
| `IMPORT-006` | Verified cutover with the old site kept | target | missing |  | No cutover. |
| `IMPORT-007` | Enquiry and subscriber history import | target | missing |  | Only the static-site JSON move-in exists; no submission or subscriber import. |
| `EXPORT-001` | Open-format site export | target | partial | `scripts/pane-policy.mjs` | Only Pane's own installation archive exports. |
| `PRIV-001` | Consent for analytics and third-party embeds | target | partial | `tests/pane.test.mjs` — ACCESS-002: mutations require the canonical origin; accepted contact is durable and visits respect privacy; `scripts/privacy-journey.mjs` — zero embed loads before consent, revocation and GPC overriding saved consent | Current embeds wait for explicit per-origin consent and stay off under GPC. GA4, Meta, Google Ads, custom code and server-side conversion consent/suppression remain unproved as their clauses add those doors. |
| `PRIV-002` | Person-level privacy requests | target | partial | `src/pane/handler.ts`; `tests/pane.test.mjs` | One message can be erased by ID; no lookup, export or erasure by person. |
| `PRIV-003` | Policy and accessibility statement starters | target | missing |  | No policy pages. |
| `PRIV-004` | Security headers on every page | target | done | `tests/search.test.mjs` — PRIV-004: current Pane workspace, preview, live, search and not-found documents retain their security headers; shared entry documents deny device permissions while native authentication and origin refusals remain intact; only an approved page embed widens its frame policy and workspace previews stay inert; `scripts/privacy-journey.mjs` — owner approval, page-only CSP, consent, GPC, opaque sandbox and API refusal at 1440 and 390 |  |
| `LOCALE-001` | US defaults | target | partial | `tests/pane.test.mjs` — “approved business-local schedules drive banners and reminders while drafts, roles and invalid DST dates stay fenced” (persisted America/Denver schedule and DST execution); `scripts/scheduling-journey.mjs` — “Business-local scheduling journey” (owner-editable business zone, local schedule controls and schedule-history timestamps at 1440/390) | Other workspace dates still use the viewer zone. Opening-hours dates, configurable locale/currency/phone/address/Sunday-start calendar defaults and USD-priced content remain unimplemented. |
| `MOBILE-001` | Responsive owner workspace on a phone | target | partial | `scripts/browser-journey.mjs` | The current workspace is checked for overflow at 390 wide; the target editor, inbox replies and approvals on a phone are not built. |
| `MOBILE-002` | Native iOS and Android owner app | target | missing |  | No native app. |
| `AUTO-001` | Form-triggered automations | target | missing |  | No automations. |
| `AUTO-002` | Scheduled automations | target | done | `tests/pane.test.mjs` — “approved business-local schedules drive banners and reminders while drafts, roles and invalid DST dates stay fenced” (US business zone, spring DST expiry, duplicate/late cron, page review and approval fences); `scripts/scheduling-journey.mjs` — “Business-local scheduling journey” (Thanksgiving holiday banner and quarterly stale-page reminders at local time, fall DST promotion expiry and spring DST recurring reminders, unapproved schedules flagged without publication, durable editor reopen/undo and 1440/390 screens; exact-candidate timing run cited in campaign plan) | None. |
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
