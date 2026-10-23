# Inbox and visits

Visitors read your live website and send messages from its Contact page. You
read those messages and the page visit totals in the Pane workspace.

## Read contact messages

Open **Inquiries**. Each message shows the sender's name, email address,
message and receipt time, newest first. The workspace displays the latest 100
messages. **Visits by page** is on **Sites**.

Messages are stored in your installation's database. Pane does not forward
them by email, send new-message notifications or provide a reply button. If you
want to respond, use the sender's email address in your usual mail application.

The live Contact form asks for a name, email address and message. A message
may contain up to 5,000 characters. The draft preview disables this form, so
send a message from the live Contact page when checking your inbox.

## Erase a message

Only the owner can erase contact messages. Open **Erase personal data** on the
message, read the explanation, then choose **Permanently erase message**.
This deletes the message and the sender's personal details from the active
installation. It cannot be undone.

Pane retains a replay fence so the erased message cannot be submitted again
with the same identifier. Old backup files are separate copies: protect or
retire them, and use a later erasure journal when restoring an older archive.
See [Back up and restore](BACKUP-RESTORE.md#restore-with-erasure-history).

## Understand visit totals

**Visits by page** on **Sites** shows recorded views for each page, by its title
and `/site` path, in the same order as the page bricks. Pane records aggregate counts per page
and day, without cookies or visitor IDs. It does not store an IP address, user
agent or referrer with a visit. Requests with Do Not Track or Global Privacy
Control enabled are excluded. Draft previews are excluded too.

Counts are approximate: reloads can count, bots can count, and blocked scripts
or rate limiting can omit views. A visit is a page view, not a unique person.

## Connect Vane or Google Analytics

Owners and admins can connect analytics under **Site name and description** on the
home page: the address and site ID of your Vane installation, a Google Analytics 4
measurement ID, or both. Publish to turn them on; drafts and previews never load
them. Vane is cookie-free and counts page views and conversion goals. Google
Analytics shows visitors a choice, loads only after they choose **Allow
analytics**, and sends page views and goals. Visitors who send Global Privacy
Control or Do Not Track get neither. Clear a field and publish to disconnect.
