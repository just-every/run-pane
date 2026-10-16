# Pane first release

- An owner signs in, prepares and previews five business pages, and approves publishing them; an admin can prepare but cannot publish. Approval history identifies the owner and revision.
- A visitor reads the published pages, sends a contact message, and contributes only a cookie-free page-view count; the owner reads and erases messages.
- The owner previews a later change, publishes it and rolls back to an earlier immutable revision in one action, with each approval recorded.
- An owner or admin dry-runs the documented static-site JSON move-in kit, approves its fingerprint, imports an unpublished draft and undoes an unchanged, unpublished import with its journal retained.
- The owner exports installation data and restores it into an empty installation; erasure journals fence older backups.

No custom domain purchase, shop, bookings, payments, email delivery, external provider calls or template marketplace is needed. The public business site is served at `/site`; installing the Worker on an owner's Cloudflare account uses `rer deploy`.

The run site builds with `rer build --site`: its homepage opens `/run`, and `/docs` renders the repository Markdown guides. The installed `/` remains the shared Lobby. Site deployment is gated off pending the domain.
