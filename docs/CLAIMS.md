# Pane clause claims

Generated from [CONTRACT.md](../CONTRACT.md). These are implementation statuses, subject to exact-commit verification and guarded landing. Provider and field-proof boundaries remain in the source contract. 127 clauses: 51 done, 33 partial, 43 missing.

| Clause | Status | Title |
| --- | --- | --- |
| ACCESS-001 | done | Server-side role authorization |
| ACCESS-002 | done | Canonical-origin mutations |
| PUBLISH-001 | done | Immutable complete revisions |
| PUBLISH-002 | done | Private draft preview |
| PUBLISH-003 | done | Owner-approved atomic publication |
| PUBLISH-004 | done | One-action rollback |
| INBOX-001 | done | Durable, escaped and idempotent contact submissions |
| VISIT-001 | done | Cookie-free aggregate visit counts |
| MOVEIN-001 | done | Reviewed static-site move-in with guarded undo |
| BACKUP-001 | done | Export and restore into an empty installation |
| ERASE-001 | done | Message erasure fenced against old backups |
| HEALTH-001 | done | Deployment health and unknown paths |
| DEPLOY-001 | done | Install on the owner's Cloudflare account |
| RUNSITE-001 | done | Public run site and documentation |
| LOBBY-001 | done | Shared Lobby, workspace and theme |
| PRESENT-001 | done | Labeled previews and unbranded live pages |
| PAGE-001 | done | Unlimited pages, folders and clean URLs |
| PAGE-002 | partial | Visual section and block editor with layout controls |
| PAGE-003 | done | Navigation menus, header and footer |
| PAGE-004 | done | Reusable sections and global components |
| PAGE-005 | done | Device previews and a separate mobile layout |
| PAGE-006 | done | Autosave, undo and safe concurrent editing |
| PAGE-007 | partial | Page status and review requests |
| PAGE-008 | done | Custom code, embeds and CSS |
| PAGE-009 | done | Accessible output by default |
| PAGE-010 | done | Duplicate pages and starter layouts |
| PAGE-011 | done | Password-protected and member-only pages and site |
| PAGE-012 | done | Gallery blocks with grid, slideshow and lightbox |
| PAGE-013 | partial | Promotional pop-up and announcement bar |
| PAGE-014 | partial | Block catalog, text formatting and links |
| PAGE-015 | partial | Trash and single page or post restore |
| PAGE-016 | missing | Paid membership access connection |
| PAGE-017 | done | Third-party tag and pixel marketplace with per-tag consent categories |
| STYLE-001 | partial | Responsive templates for US local businesses |
| STYLE-002 | partial | Site-wide brand styles |
| STYLE-003 | missing | Switch templates without rebuilding content |
| STYLE-004 | done | Logo, favicon and brand kit |
| MEDIA-001 | partial | Media library with alt text and usage |
| MEDIA-002 | done | Responsive image optimization |
| MEDIA-003 | done | Basic image editing |
| MEDIA-004 | partial | Video, map, social embeds and Instagram feed |
| CMS-001 | done | Structured collections with typed fields |
| CMS-002 | done | Collection template pages with item URLs |
| CMS-003 | missing | Collection lists and filters on any page |
| CMS-004 | done | Blog with categories, tags and authors |
| CMS-005 | partial | Scheduled publishing and expiry |
| CMS-006 | partial | RSS and podcast feeds and new-post notifications |
| CMS-007 | missing | Collection CSV import and export |
| CMS-008 | partial | Site search |
| CMS-009 | missing | Events calendar with list and month views |
| CMS-010 | partial | Blog comments and moderation |
| CMS-011 | partial | Post and collection item bodies in the block editor |
| DOMAIN-001 | missing | Connect a custom domain with apex and www |
| DOMAIN-002 | missing | Managed HTTPS and certificate status |
| DOMAIN-003 | missing | DNS status that preserves business email |
| DOMAIN-004 | missing | Domain registration and transfer guidance |
| DOMAIN-005 | missing | Registrar email forwarding carried over |
| HOST-001 | partial | The business site at the domain root, fast |
| HOST-002 | done | The live site survives an admin outage |
| HOST-003 | missing | Updates without plugin maintenance |
| HOST-004 | missing | Transparent running cost in USD |
| HOST-005 | missing | Install from the browser with no terminal |
| SEO-001 | partial | Page titles and meta descriptions |
| SEO-002 | done | Redirect manager and slug-change redirects |
| SEO-003 | partial | Automatic sitemap and robots.txt |
| SEO-004 | partial | Canonical URLs and indexing controls |
| SEO-005 | missing | Structured data for local businesses |
| SEO-006 | missing | Social preview cards |
| SEO-007 | missing | Google Search Console and Bing Webmaster Tools |
| SEO-008 | missing | Google Business Profile consistency |
| SEO-009 | done | Per-page search checks |
| SEO-010 | missing | Multilingual sites with per-language URLs |
| FORM-001 | done | Form builder with multiple forms |
| FORM-002 | done | Spam protection |
| FORM-003 | partial | Enquiry email to named recipients and reply |
| FORM-004 | done | Automatic acknowledgment to the sender |
| FORM-005 | missing | Lead routing to Orbit, HubSpot and signed webhooks |
| FORM-006 | done | Enquiry ownership, status and follow-up |
| FORM-007 | partial | Submission export and Google Sheets |
| FORM-008 | partial | Consent capture for email and SMS |
| LINK-001 | missing | Booking through Dial, Calendly or Acuity |
| LINK-002 | missing | Checkout through Stall, Stripe Payment Links or PayPal |
| LINK-003 | missing | Newsletter signup through Mango or Mailchimp |
| LINK-004 | missing | Zapier, Crank and outgoing webhooks |
| LINK-005 | missing | Connection health panel |
| API-001 | partial | Agent command helper and API |
| STATS-001 | done | Traffic by page, source, device and campaign |
| STATS-002 | done | Conversion goals and click insights |
| STATS-003 | done | Vane and Google Analytics 4 with consent |
| STATS-004 | missing | Monthly owner report |
| STATS-005 | missing | Meta Pixel and Google Ads conversion tracking |
| ROLE-001 | partial | Roles for editors, authors, moderators and reporting |
| ROLE-002 | missing | Review requests and publish delegation |
| ROLE-003 | done | Designer-to-client handover |
| ROLE-004 | partial | Two-step sign-in and passkeys for workspace users |
| AUDIT-001 | done | Activity log of every change |
| IMPORT-001 | partial | WXR publishing platform import |
| IMPORT-002 | missing | XML-export site builder import |
| IMPORT-003 | partial | Crawl-only site builder import |
| IMPORT-004 | partial | Visual and generated site builder import |
| IMPORT-005 | done | Migration report and URL map |
| IMPORT-006 | missing | Verified cutover with the old site kept |
| IMPORT-007 | partial | Enquiry and subscriber history import |
| EXPORT-001 | partial | Open-format site export |
| PRIV-001 | partial | Consent for analytics and third-party embeds |
| PRIV-002 | partial | Person-level privacy requests |
| PRIV-003 | partial | Policy and accessibility statement starters |
| PRIV-004 | done | Security headers on every page |
| LOCALE-001 | done | US defaults |
| MOBILE-001 | partial | Responsive owner workspace on a phone |
| MOBILE-002 | missing | Native iOS and Android owner app |
| AUTO-001 | missing | Form-triggered automations |
| AUTO-002 | done | Scheduled automations |
| AUTO-003 | missing | Share new posts to social accounts |
| AUTO-004 | missing | Site problem alerts |
| AI-001 | missing | Draft a whole site from business facts |
| AI-002 | done | Writing, alt text and translation assist |
| AI-003 | done | Search and content suggestions with approval |
| AI-004 | missing | AI collection and bulk content operations |
| AGENT-001 | missing | Interview the owner and build from verified facts |
| AGENT-002 | missing | Keep business facts current across the site |
| AGENT-003 | missing | Prove every enquiry reaches a person |
| AGENT-004 | missing | Recover lost search traffic and broken paths |
| AGENT-005 | missing | Measure changes against real leads and bookings |
| AGENT-006 | missing | Move a business off its old platform |
| AGENT-007 | missing | Follow up unanswered enquiries under an approved policy |
| AGENT-008 | missing | Agent controls, budgets and audit |
