# Forms and access settings

Open Sites, then Form settings or Access settings. Only the native owner changes these settings. Saving prepares a draft; publish the whole site to apply shared settings. Existing theme and homepage content stay unchanged.

## Private pages

Protect an individual page or a named folder with a password or admitted native members. Folder and page requirements compose: passing one does not bypass the other. Invite a native member in Account and team, then explicitly admit that person in Access settings. Deactivating or revoking the native account removes access on the next request. An owner account is not automatically a site member.

Passwords need 12 to 200 characters. Pane stores salted PBKDF2 digests; the browser receives an HttpOnly, same-site proof lasting one hour. Rotating a password invalidates previous proofs. Protected responses are private and never stored in the public cache; protected pages are excluded from public search and the sitemap. A site gate also covers unknown live paths and search, answers noindex, and leaves authenticated draft previews available. The site password passes the site gate while page and folder rules still apply.

Paid entitlements remain a future Stall or Nectar connection. Pane neither sells memberships nor infers a paid grant from a native account. RL-5 records ct’s 25 October native-member admission decision; it grants no paid entitlement.

## Reusable forms

Create a form in Form settings. Add fields with text, email, US phone, address, choice, date, PDF or consent types. Set each label, help text, placeholder, required flag and optional validation message. Choice options are entered one per line. Set the submit label and a confirmation message or a local site redirect. In each page editor, choose the saved form under Form placement. The same form can appear on multiple pages.

Both browser and server validate answers. Errors appear beside fields and are linked as accessible descriptions; other textual answers remain filled. For security, choose an upload again after an error. Each form permits one PDF of at most 5 MB. Pane checks its declared type, file extension and PDF signature; download is forced as an attachment with nosniff and a sandbox policy. This is a format check, not a malware-scanning claim.

Accepted files are stored privately in bounded chunks in the existing D1 database and durable intake, never in public assets. Permitted inbox readers download them from the enquiry. Files join person export, explicit erasure, replay fencing and native installation archives. The existing archive limitation for pending durable intake still applies: drain pending enquiries before taking an installation archive. Keep the current erasure journal when restoring an older archive into a fresh destination.

All placements retain the existing honeypot, quota and Turnstile checks. Rejected upload bytes are discarded; owner-opted-in rejected-answer review and rescue retain textual answers and file metadata. Rescue never restores discarded file bytes or sends an automatic reply. This conservative rejected-file policy remains partial pending ct approval. Consent fields record the submitted wording and choice in the enquiry; they do not create a newsletter or SMS connection.
