# Pane acceptance

Every clause in [CONTRACT.md](CONTRACT.md) is accepted only when the journey below runs through a public door (a route, a command, the built site or a browser journey) and passes. Status is judged from the code and tests at commit `80f6943` (17 October 2026); `done` means the journey is exercised by the cited test, not that a hosted provider accepted it. Counts: 112 clauses: 11 done, 28 partial, 73 missing.

## First release

- An owner signs in, prepares and previews business pages, and approves publishing them; an admin can prepare but cannot publish. Approval history identifies the owner and revision. (`ACCESS-001`, `ACCESS-002`, `PUBLISH-001` to `PUBLISH-003`)
- A visitor reads the published pages, sends a contact message, and contributes only a cookie-free page-view count; the owner reads and erases messages. (`INBOX-001`, `VISIT-001`, `ERASE-001`)
- The owner previews a later change, publishes it and rolls back to an earlier immutable revision in one action, with each approval recorded. (`PUBLISH-004`)
- An owner or admin dry-runs the documented static-site JSON move-in kit, approves its fingerprint, imports an unpublished draft and undoes an unchanged, unpublished import with its journal retained. (`MOVEIN-001`)
- The owner exports installation data and restores it into an empty installation; erasure journals fence older backups. (`BACKUP-001`, `ERASE-001`)

The first release serves the public business site at `/site`; installing the Worker on an owner's Cloudflare account uses `rer deploy` (`DEPLOY-001`). The run site builds with `rer build --site`: its homepage opens `/run`, and `/docs` renders the repository Markdown guides (`RUNSITE-001`). The installed `/` remains the shared Lobby (`LOBBY-001`). Site deployment is gated off pending the domain. The first release needed no custom domain, shop, bookings, payments, email delivery, external provider calls or template marketplace; the target below adds each of them.


## Released guarantees

### Sign-in, roles and authority

- **ACCESS-001 — Server-side role authorization** (done). Sign in as owner, invite and confirm an admin and a member, then call `/api/pane` routes signed out, as each role and after deactivating the admin. Signed-out calls get 401, a member is refused prepare, an admin is refused publish, and the deactivated admin gets 401 with no write. Evidence: `src/pane/handler.ts`; `tests/pane.test.mjs`.
- **ACCESS-002 — Canonical-origin mutations** (partial). Post a prepare request and a contact message with a foreign `Origin` header and see 403 with no new revision or message. Evidence: `src/pane/handler.ts`; `src/pane/public.ts`; `tests/pane.test.mjs`.

### Revisions and publication

- **PUBLISH-001 — Immutable complete revisions** (done). Prepare two revisions, read them back through `/api/pane` and compare their snapshots and hashes; neither changes after a later prepare, publish or rollback. Evidence: `src/pane/content.ts`; `tests/pane.test.mjs`.
- **PUBLISH-002 — Private draft preview** (done). Open a revision's preview signed out (redirect to sign-in), as a member (403) and as an admin (the draft's pages with the banner). Evidence: `src/pane/handler.ts`; `src/pane/public-view.ts`; `tests/pane.test.mjs`.
- **PUBLISH-003 — Owner-approved atomic publication** (done). As owner, publish a prepared revision; every public page serves it and the approval record names the owner and revision. As admin, publishing is refused. Evidence: `src/pane/content.ts`; `tests/pane.test.mjs`; `scripts/browser-journey.mjs`.
- **PUBLISH-004 — One-action rollback** (done). Publish a change, roll back to the first revision, and see the public site lose the change and the approval record gain one rollback entry. Evidence: `src/pane/content.ts`; `tests/pane.test.mjs`; `scripts/browser-journey.mjs`.

### Contact inbox and visit counts

- **INBOX-001 — Durable, escaped and idempotent contact submissions** (done). Submit the same contact form twice with one key and see one inbox message; submit a name containing markup and see it escaped in `/app`. Evidence: `src/pane/public.ts`; `tests/pane.test.mjs`.
- **VISIT-001 — Cookie-free aggregate visit counts** (done). Post a visit with `DNT: 1` and one without; the page's count rises by exactly one and no visitor record exists. Evidence: `src/pane/public.ts`; `tests/pane.test.mjs`.

### Move-in, backup and erasure

- **MOVEIN-001 — Reviewed static-site move-in with guarded undo** (done). Dry-run the fixture, apply with a wrong fingerprint (refused), apply with the reviewed one, confirm the live site is unchanged, undo as a member (refused) and as an admin (undone, journal kept). Evidence: `src/pane/imports.ts`; `tests/pane.test.mjs`; `docs/MOVE-IN.md`.
- **BACKUP-001 — Export and restore into an empty installation** (done). Export a populated installation, restore it into a fresh empty D1 and read the live revision and import jobs. Evidence: `scripts/pane-policy.mjs`; `tests/pane.test.mjs`; `docs/BACKUP-RESTORE.md`.
- **ERASE-001 — Message erasure fenced against old backups** (done). Erase a message as admin (refused) and as owner, replay its submission (not stored), then restore an older archive with the later journal and see it refused. Evidence: `src/pane/handler.ts`; `tests/pane.test.mjs`.

### Operation and presentation

- **HEALTH-001 — Deployment health and unknown paths** (partial). Read `/health` on a local and a deployed Worker and compare its deployment fields with the deploy record; request an unknown app path and an unknown site page and see 404. Evidence: `src/server.ts`; `src/pane/public.ts`.
- **DEPLOY-001 — Install on the owner's Cloudflare account** (partial). Run `rer deploy` against a test Cloudflare account, see migrations applied and `/health` match, then remove the deployment. Evidence: `deploy.json`; `wrangler.jsonc`.
- **RUNSITE-001 — Public run site and documentation** (done). Build with `rer build --site`, open `/`, `/run` and every linked `/docs` page (200) and an unknown path (404). Evidence: `tests/site.test.mjs`; `docs/site.json`.
- **LOBBY-001 — Shared Lobby, workspace and theme** (partial). Open `/`, `/signin`, `/setup` and `/app` at 1440 and 390 wide and see the shared theme, the workspace anchors and no horizontal overflow. Evidence: `src/server.ts`; `src/pane/views.ts`; `scripts/browser-journey.mjs`.
- **PRESENT-001 — Labelled previews and unbranded live pages** (partial). Open a preview and see the banner; open every live page and find no Pane name or mark in the HTML, including `<title>`. Evidence: `src/pane/public-view.ts`; `src/pane/views.ts`.

## Target

### Pages and the visual editor

- **PAGE-001 — Unlimited pages, folders and clean URLs** (partial). Create 40 pages in three folders through the editor, rename two slugs, delete one, publish, and open every URL; renamed and deleted pages answer 301 to the chosen targets, and the revision snapshot holds all 40. Evidence: `src/pane/content.ts`.
- **PAGE-002 — Visual section and block editor** (partial). On a phone and a desktop browser, build a services page by adding, reordering (drag and keyboard), duplicating and deleting sections, edit headings in place, preview, and publish; the live page matches the editor. Evidence: `src/pane/views.ts`; `src/pane/handler.ts`.
- **PAGE-003 — Navigation menus, header and footer** (partial). Build a menu with two dropdowns, an external link and a Book button, hide one page, publish, and use the menu with a mouse, keyboard and a 390-wide phone. Evidence: `src/pane/public-view.ts`.
- **PAGE-004 — Reusable sections and global components** (missing). Place one component on five pages, edit it once, preview all five changed, and detach one copy that then stays unchanged.
- **PAGE-005 — Device previews and responsive layout control** (partial). Preview a draft at 1440, 768 and 390 wide from the editor, hide a section on phones only, and see it absent at 390 and present at 1440 on the live site. Evidence: `src/pane/handler.ts`; `src/pane/public-view.ts`.
- **PAGE-006 — Autosave, undo and safe concurrent editing** (missing). Edit, close the tab and reopen to find the draft kept; undo and redo five steps; edit one page from two browsers and see the conflict surfaced, never lost.
- **PAGE-007 — Page status and review requests** (partial). Edit two pages, send one for review, approve and publish only that one, and see the other stay draft while the revision history records the publication. Evidence: `src/pane/content.ts`; `src/pane/handler.ts`.
- **PAGE-008 — Custom code, embeds and CSS** (missing). Add a custom CSS rule, an embed block and a header verification tag; see them live, see the policy list the embed's host, and see the embed unable to read workspace cookies or call `/api/pane`.
- **PAGE-009 — Accessible output by default** (partial). Run axe and a keyboard pass over every template and a populated site at 1440 and 390 wide with zero serious violations; try to publish an image without alt text and see the warning. Evidence: `src/pane/views.ts`; `src/pane/public-view.ts`; `scripts/browser-journey.mjs`.
- **PAGE-010 — Duplicate pages and starter layouts** (missing). Create a page from each starter layout and one duplicate, publish, and see each use the site's fonts and colors.
- **PAGE-011 — Password-protected and member-only pages** (missing). Protect a folder with a password and another with member sign-in; signed-out requests see the gate, the right password or member sees the page, and no cached response leaks it.

### Templates and brand styles

- **STYLE-001 — Responsive templates for US local businesses** (partial). Start a site from each template, publish, and check every page at 1440 and 390 wide with no overflow and a passing accessibility run. Evidence: `public/pane.css`; `src/pane/public-view.ts`.
- **STYLE-002 — Site-wide brand styles** (partial). Change the heading font, primary color and button style, preview three pages showing the change, publish, and roll back to the earlier styles. Evidence: `public/pane.css`.
- **STYLE-003 — Switch templates without rebuilding content** (missing). Switch a populated site between two templates, read the pre-switch list, publish, and see every page and item present; roll back to the previous template.
- **STYLE-004 — Logo, favicon and brand kit** (missing). Upload a logo and favicon and see them in the header, browser tab and a social card preview.

### Media library

- **MEDIA-001 — Media library with alt text and usage** (missing). Upload 50 images and three PDFs, search and filter them, set alt text, place one image on three pages, and try to delete it (refused, uses listed).
- **MEDIA-002 — Responsive image optimization** (missing). Upload a 6000-pixel photo and see the live page serve a phone-sized WebP or AVIF at 390 wide, a larger one at 1440, with width and height attributes and lazy loading below the fold.
- **MEDIA-003 — Basic image editing** (missing). Crop and set a focal point, see the hero keep the subject at 390 and 1440 wide, then revert to the original.
- **MEDIA-004 — Video, map and social embeds** (missing). Add a YouTube video, a Vimeo video, a Google Map and an Instagram post; see each on the live site, see them wait for consent where required, and see the CSP list only their hosts.

### Collections and blog

- **CMS-001 — Structured collections with typed fields** (missing). Create a services collection with ten fields including a USD price and a reference to team members, add 30 items, and edit an item; validation refuses wrong types.
- **CMS-002 — Collection template pages with item URLs** (missing). Design a service template page, publish, and open every service item's URL with its own title, description and structured data.
- **CMS-003 — Collection lists and filters on any page** (missing). Place a filtered, sorted list of three featured projects on the home page and a full filterable list on a projects page; change an item and see both update in the next revision.
- **CMS-004 — Blog with categories, tags and authors** (missing). As an author, write three posts with categories and tags, submit them for review, have the owner publish, and open the blog index, a category, a tag, an author page and each post.
- **CMS-005 — Scheduled publishing and expiry** (missing). Schedule a post for 9:00 America/Chicago and a promotion to expire across a daylight saving change; see each happen at the right local time and see an unapproved schedule flagged, not published.
- **CMS-006 — RSS feed and new-post notifications** (missing). Validate the RSS feed, publish a post and see the Mango or Mailchimp campaign queued with its delivery state in Pane.
- **CMS-007 — Collection CSV import and export** (missing). Import a Webflow CMS CSV and a Framer CSV with images, review the mapping and rejected rows, apply, export the collection again and compare.
- **CMS-008 — Site search** (missing). Search for a service name, a post tag and a word on a protected page; the first two return results and the protected page does not for a signed-out visitor.

### Domains and hosting

- **DOMAIN-001 — Connect a custom domain with apex and www** (missing). Connect a test domain held in Cloudflare and one at an external DNS host, see the status move from pending to live, and see `www` redirect to the apex with 301.
- **DOMAIN-002 — Managed HTTPS and certificate status** (missing). Connect a domain, see the certificate issued and listed with its expiry, and see `http://` redirect to `https://`.
- **DOMAIN-003 — DNS status that preserves business email** (missing). Connect a domain that has Google Workspace MX, SPF and DKIM records; after connection the mail records are unchanged and mail still delivers, and the status screen lists them as kept.
- **DOMAIN-004 — Domain registration and transfer guidance** (missing). Follow the guided path for a new domain and for a domain at Squarespace Domains, ending with a connected domain in each case.
- **HOST-001 — The business site at the domain root, fast** (partial). Publish a populated site on a connected domain, measure with Lighthouse mobile and field data from Vane (`STATS-003`), and see the budgets met; publish a change and see it served within 30 seconds worldwide. Evidence: `src/pane/public.ts`.
- **HOST-002 — The live site survives an admin outage** (missing). Make the database unavailable on a deployed site; every live page still loads and a contact submission is accepted and appears in the inbox once the database returns.
- **HOST-003 — Updates without plugin maintenance** (missing). Apply a release to a running installation, see the change list and a passing health check, then roll it back.
- **HOST-004 — Transparent running cost in USD** (missing). Generate traffic and storage on a test account and see usage and the USD estimate match the Cloudflare dashboard within 5%.

### Search visibility

- **SEO-001 — Page titles and meta descriptions** (partial). Set a title and description on a page and an item, see the preview, publish, and read them in each page's `<title>` and `<meta name="description">`. Evidence: `src/pane/content.ts`; `src/pane/views.ts`.
- **SEO-002 — Redirect manager and slug-change redirects** (missing). Rename a published slug and accept the offered redirect, import 200 redirects by CSV, and request each old URL to get the right status and target.
- **SEO-003 — Automatic sitemap and robots.txt** (missing). Publish a site with hidden, protected and noindex pages, validate the sitemap, and see only public indexable URLs listed; edit `robots.txt` and see it served.
- **SEO-004 — Canonical URLs and indexing controls** (missing). Read canonical tags across `www` and apex, set one page noindex, and confirm previews send `noindex`.
- **SEO-005 — Structured data for local businesses** (missing). Publish a site with hours, services, FAQs and posts, and pass Google's Rich Results Test and the Schema.org validator on each page type.
- **SEO-006 — Social preview cards** (missing). Share a page URL into the Facebook Sharing Debugger and an X card validator and see the chosen title, description and image.
- **SEO-007 — Google Search Console and Bing Webmaster Tools** (missing). Connect a test property, see verification succeed and the sitemap submitted, and see per-page clicks and impressions imported for the last 28 days.
- **SEO-008 — Google Business Profile consistency** (missing). Connect a test profile whose holiday hours differ from the site, see the difference listed, approve the site's version and see the profile updated.
- **SEO-009 — Per-page search checks** (missing). Publish a draft with a duplicate title, a broken internal link and a missing alt text, and see each listed with a link to fix it.

### Forms and enquiries

- **FORM-001 — Form builder with multiple forms** (partial). Build a quote form with a file upload and a US phone field, place it on two pages, submit it with a 5 MB PDF, and see the submission and file in the inbox; an oversized or wrong-type file is refused. Evidence: `src/pane/public-view.ts`; `src/pane/public.ts`.
- **FORM-002 — Spam protection** (partial). Submit with the honeypot filled, in a burst over the limit and with a failed Turnstile token; each is refused or quarantined and counted, while a normal submission arrives. Evidence: `src/pane/public.ts`; `src/pane/public-view.ts`.
- **FORM-003 — Enquiry email to named recipients and reply** (partial). Submit a form and see the notification accepted by the provider edge with Reply-To set; reply from the inbox and see the reply recorded on the enquiry; a failed send is shown as failed, with the enquiry kept. Evidence: `src/pane/views.ts`; `src/pane/data.ts`.
- **FORM-004 — Automatic acknowledgement to the sender** (missing). Enable an acknowledgement, submit, and see the sender's message accepted by the provider edge with the configured wording.
- **FORM-005 — Lead routing to Orbit, HubSpot and signed webhooks** (missing). Route a form to Orbit and to HubSpot test accounts and to a webhook that fails twice then succeeds; see the contact created in each CRM, the webhook signature verify, and the delivery state per submission.
- **FORM-006 — Enquiry ownership, status and follow-up** (missing). Assign an enquiry, leave another unanswered past the window, and see the reminder and escalation; mark one replied and see it leave the queue.
- **FORM-007 — Submission export and Google Sheets** (missing). Export a form's submissions to CSV, connect a Google Sheet, submit, and see the row appended.
- **FORM-008 — Consent capture for email and SMS** (missing). Submit a form with email consent ticked and SMS consent unticked; see consent text, time and page recorded and only the email consent reach Mango or Mailchimp.

### Bookings, checkout and connections

- **LINK-001 — Booking through Dial, Calendly or Acuity** (missing). Embed Dial and Calendly on a service page, complete a test booking in each, and see the booking counted as a conversion for that page.
- **LINK-002 — Checkout through Stall, Stripe Payment Links or PayPal** (missing). Add a Stall product block and a Stripe Payment Link button, complete test-mode purchases, and see each counted as a conversion with no card data reaching Pane.
- **LINK-003 — Newsletter signup through Mango or Mailchimp** (missing). Sign up through the block, confirm the double opt-in email, and see the contact in the Mango or Mailchimp audience with its consent record.
- **LINK-004 — Zapier, Crank and outgoing webhooks** (missing). Connect a Zapier test zap and a Crank flow to form submission and publication triggers, fire each, and see the payload arrive signed.
- **LINK-005 — Connection health panel** (missing). Break a CRM credential and a webhook endpoint and see both shown as failing with their last success and a fix action; repair them and see them recover.
- **API-001 — Agent command helper and API** (partial). Run the helper's status, prepare and import commands as an admin with a private session file; see publish refused for the admin; create a scoped token and see a call outside its scope refused and logged. Evidence: `scripts/pane.mjs`; `docs/AGENT.md`.

### Analytics and reporting

- **STATS-001 — Traffic by page, source, device and campaign** (partial). Visit pages from a phone and a desktop with UTM tags and a referrer, then read the dashboard by page, source, device and campaign; a GPC visit is not counted. Evidence: `src/pane/public.ts`; `tests/pane.test.mjs`.
- **STATS-002 — Conversion goals and click insights** (missing). Define a quote-form goal and a phone-click goal, complete each from a tagged campaign, and see them counted by page and campaign with a funnel.
- **STATS-003 — Vane and Google Analytics 4 with consent** (missing). Connect Vane and see events arrive; connect GA4 and see it load only after consent and send page views and goals.
- **STATS-004 — Monthly owner report** (missing). Advance the clock to a month boundary and see the report accepted by the mail provider with figures that match the dashboard.

### Team, roles and activity

- **ROLE-001 — Roles for editors, authors and reporting** (partial). Invite one person per role and exercise every route as each; each sees and does only what its role allows. Evidence: `src/pane/handler.ts`; `tests/pane.test.mjs`.
- **ROLE-002 — Review requests and publish delegation** (missing). Delegate the blog to an admin, have an author submit a post, approve it as the admin from a notification, and see the approval recorded under the admin.
- **ROLE-003 — Designer-to-client handover** (missing). Build a site as a designer, transfer ownership to a new owner, see the designer drop to editor, and revoke them.
- **AUDIT-001 — Activity log of every change** (partial). Perform each kind of action, read the log in order, export it, erase a person and see their actor entries anonymized while the log remains. Evidence: `src/pane/data.ts`; `src/pane/content.ts`.

### Moving in from incumbents

- **IMPORT-001 — WordPress.com and WordPress import** (missing). Import a real WordPress.com export with 100 posts and media, review the plan and its exceptions, apply as an unpublished draft, and open every old URL on the new site through its redirect.
- **IMPORT-002 — Squarespace import** (missing). Import a test Squarespace site's export and crawl, review the listed omissions, apply, and check pages, blog posts, images and redirects.
- **IMPORT-003 — Wix import** (missing). Import a published Wix test site by crawl, review the mapping, apply, and compare page text, images, blog posts and redirects with the source.
- **IMPORT-004 — Webflow, Framer and Durable import** (missing). Import a Webflow site with two collections and a Framer site, review exceptions, apply, and check items, pages and redirects.
- **IMPORT-005 — Migration report and URL map** (partial). Run an import with unsupported content and a broken image link; read the report, apply with its fingerprint, and undo. Evidence: `src/pane/imports.ts`; `tests/pane.test.mjs`.
- **IMPORT-006 — Verified cutover with the old site kept** (missing). Cut a test domain over from an old host, see pre-cutover checks pass, then roll back and forward again with mail unaffected.

### Portability, privacy and US norms

- **EXPORT-001 — Open-format site export** (partial). Export a populated site in every format, import the WXR into WordPress, open the CSVs, and serve the static copy from a plain web server. Evidence: `scripts/pane-policy.mjs`.
- **PRIV-001 — Consent for analytics and third-party embeds** (partial). Add GA4 and a YouTube embed, visit with and without GPC, and see no third-party request before consent and none at all under GPC for GA4. Evidence: `src/pane/public.ts`; `tests/pane.test.mjs`.
- **PRIV-002 — Person-level privacy requests** (partial). Submit three forms as one person, run a request by email, export their data, erase it, and see every record gone, the fence in place and the CRM deliveries listed. Evidence: `src/pane/handler.ts`; `tests/pane.test.mjs`.
- **PRIV-003 — Policy and accessibility statement starters** (missing). Connect GA4 and a CRM, generate the privacy policy starter, and see both services named; edit and publish it.
- **PRIV-004 — Security headers on every page** (partial). Read the headers on every page type and see the policy; add an embed and see only its host added. Evidence: `src/pane/views.ts`.
- **LOCALE-001 — US defaults** (missing). Set the time zone to America/Denver, and see workspace dates, scheduled times and opening hours in local US format with USD prices.

### Owner mobile

- **MOBILE-001 — Responsive owner workspace on a phone** (partial). Run the full browser journey at 390 wide, including the target editor, approvals and inbox replies, with no overflow and a passing accessibility run. Evidence: `scripts/browser-journey.mjs`.
- **MOBILE-002 — Native iOS and Android owner app** (missing). Install the app on iOS and Android test devices, receive a push for a new enquiry, reply, approve a review request and publish a photo post.

### Automation and follow-up

- **AUTO-001 — Form-triggered automations** (missing). Create a rule that posts quote requests over $5,000 to a Nook channel and tags them; submit two forms and see only the large one posted and tagged.
- **AUTO-002 — Scheduled automations** (missing). Schedule a holiday banner for Thanksgiving and a quarterly page-review reminder, advance the clock, and see both happen at local time.
- **AUTO-003 — Share new posts to social accounts** (missing). Connect a test Facebook Page and LinkedIn Page, publish a post with sharing on, and see each share created with its link.
- **AUTO-004 — Site problem alerts** (missing). Break a webhook, expire a test certificate and add a broken link; see one alert per problem by email and push, and see Uptime monitors created for the live site on request.

### AI site building

- **AI-001 — Draft a whole site from business facts** (missing). Enter facts for a test plumbing business, receive a draft site within two minutes, preview every page, find no invented reviews or prices, and publish after edits.
- **AI-002 — Writing, alt text and translation assist** (missing). Rewrite a paragraph, draft alt text for five images and translate the home page to Spanish; accept some suggestions and reject others, and see only accepted text in the draft.
- **AI-003 — Search and content suggestions with approval** (missing). Run the review on a weak page, see proposed titles, descriptions and links, accept two and publish.
- **AI-004 — AI collection and bulk content operations** (missing). Paste a price list, see a services collection proposed and filled, then ask for a bulk change and approve the diff.

## Push further

### Agents that build and keep the site true

- **AGENT-001 — Interview the owner and build from verified facts** (missing). Run the interview for a test business with a connected Google Business Profile that disagrees with one answer; see the conflict raised, each published claim traced to a source, and nothing live before the owner approves.
- **AGENT-002 — Keep business facts current across the site** (missing). Change a service price in Orbit and holiday hours in the profile; see one draft that changes only the affected page, item and structured data, with sources, waiting for approval.
- **AGENT-003 — Prove every enquiry reaches a person** (missing). Break the HubSpot connection; the next scheduled test finds it, names the failing step, notifies the owner, and passes after repair, with no test record left in reports.
- **AGENT-004 — Recover lost search traffic and broken paths** (missing). Delete a page that receives search clicks without a redirect; the agent reports the 404s with the lost clicks and drafts the redirect; approve it and see the 404s stop.
- **AGENT-005 — Measure changes against real leads and bookings** (missing). Approve an A/B test of two contact-page headlines; see traffic split as approved, conversions counted from real form submissions, and a final report with confidence and a recommended winner the owner can publish.
- **AGENT-006 — Move a business off its old platform** (missing). Migrate a test Squarespace site; see the mapping, the rebuilt pages, a redirect test with every old URL passing, form routes tested, and a cutover the owner approves and then rolls back once.
- **AGENT-007 — Follow up unanswered enquiries under an approved policy** (missing). Approve a holding-reply policy, leave a quote request unanswered past the window, and see the holding reply sent within policy while a draft full reply waits for the owner.
- **AGENT-008 — Agent controls, budgets and audit** (missing). Turn on two agents with a $5 budget, let one reach the budget, and see it stop with a notice; undo an agent's approved change and see the log record both.
