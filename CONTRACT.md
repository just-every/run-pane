# Pane runtime contract

Native operator sessions authorize every private handler. Owners publish, roll back and erase messages; owners and admins prepare, preview and import; members read the workspace. Mutations require the canonical origin.

Revisions contain the complete five-page snapshot and its SHA-256. Publication atomically selects a revision and records approval. Public contact submissions are idempotent. Visits store only day/path aggregate counts. Erasure commits the portability fence with deletion. Static-site imports use Base import-kit, retain their journal and refuse unsafe reversal.

`/health` identifies the Worker deployment; unknown paths return 404. See ACCEPTANCE.md for the first release and README.md for public operations.

## Presentation and run site

The public run site is a static build of the picked Pane homepage, `/run`, and Markdown documentation. It contains no installation sign-in links. The installed `/` uses the shared Lobby; `/app` keeps its anchored workspace sections. The paper, cerulean and self-hosted Noto theme is shared with sign-in and setup. Previews use the public business site typography and an explicit draft banner; live business pages carry no Pane branding.
