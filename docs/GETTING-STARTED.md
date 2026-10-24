# Getting started

Run Pane on your own computer, confirm its owner, then prepare your first
five-page website. The public run site and your installed workspace are separate:
your workspace is at the address your terminal prints.

## Start Pane

This line installs rer, then starts Pane. It is the line on the
[Run page](https://run-pane.com/run):

```sh
curl -fsSL https://runeditrun.com/install.sh | sh -s -- dev just-every/run-pane
```

Git is required; rer brings Node and pnpm. The installer brings its own Node
when you have no Node 22 or later; if it prints a line that puts rer on your
PATH, run that line too. With Node 22 or later already installed, this line
does the same:

```sh
npx -y @runeditrun/rer dev just-every/run-pane
```

To start it again later, run the same line from the same folder, or
`cd run-pane && rer dev`.

Pane pins Node 22.20.0 and pnpm 10.12.4. rer selects those versions without
changing your global Node installation. Supported computers are macOS, Linux
and Windows with WSL2. A first launch installs and sets up the checkout; allow
ten minutes. If interrupted, repeat `rer dev` to resume.

The terminal prints `RER_READY` with the app address and a private `RER_OPEN`
link. Open the latter on the same computer to sign in as the local owner.
Review the owner name and email, confirm the checkbox and choose **Finish setup**.
Development sends no external email. Treat `RER_OPEN` as a credential.

For a local installation with your real mailbox, run `npx -y @runeditrun/rer setup just-every/run-pane`
in place of the one line and enter it at the prompt, then `cd run-pane && rer dev`.

## Add the five pages

Your workspace opens on **Pages**. Until the site has pages it shows **Start
your site**: enter your **Site name** and **Description**, then a **Page title**
and **Text** for each of the five pages (`/site`, `/site/about`,
`/site/services`, `/site/hours` and `/site/contact`).

Text is plain. A blank line starts a new paragraph, and HTML is displayed as
text. A name or title may have up to 120 characters, the description up to 500
and each page's text up to 20,000. Every title and text must contain something.
To start from an existing export instead, paste the
[complete example export](../fixtures/static-site.json) into **Moves**.

Choose **Prepare draft revision**. This saves a whole-site snapshot while the
live website stays unchanged. Follow **Preview draft** and inspect all five
pages. When ready, the owner chooses **Approve & publish**.

## Open the live website

Choose **Open live site** on **Sites** or in the site switcher. Your public website is served at
`/site` on your installation; the other pages use `/site/about`, `/site/services`,
`/site/hours` and `/site/contact`. These paths belong to your app, not the public
Pane documentation site.

Before the first publish, the public website says it is getting ready. The
Contact page accepts messages only on the live website; the preview form is
disabled. Messages appear in **Inquiries** in your workspace.

## Stop and return later

```sh
rer dev --stop
```

Run `rer dev` again from the same checkout when you return. Your saved local
site and inbox remain. A compatible repeated invocation reuses the running app.
Stop preview with `rer preview --stop` if you used it, before building,
verifying or transferring data.

Next: [Preview, publish and restore](PUBLISHING.md).
