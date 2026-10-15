# Source origins

Pane was composed from the committed Base foundation at
`a06bd065124c2b45fa879e62736fb5e1987efdaa` (runeditrun/base main at creation).
`composition.lock.json` records copied origins. CLI delivery was converted using
Base's `scripts/export-cli.mjs --to-package` to exact `@runeditrun/rer` 0.2.22.
Base and inherited runtime retain the MIT licence in LICENSE.

The following sibling source was read and adapted, without modifying siblings:

- Dial `de8b07eabe4f5ed9c74dc5a9af71c7b00db170e4`, `src/base/run-site.ts`
  and `src/core/features/public-site/docs/build/manifest.ts`: escaped static HTML
  and explicit ordered route manifests. Pane uses five fixed page routes and the
  Base document frame. The inherited run site remains separate from the business site.
- Pencil `5469766707a97e3fefd7b81057b8b26ab330923a`,
  `src/core/features/responses/service.ts`: immutable idempotent contact responses,
  honeypot and per-minute submission windows.
- Vane `519b22f57db6c7a8f1f0c007596e079ebb2198e8`, `src/vane/tracker.ts`:
  cookie-free path-only tracking and DNT/GPC handling. Pane stores aggregate
  day/path counts; it does not collect visitor or event identity.
- Slate `5b4f1042ce4aa8f75e6b62a5b7ebcbc6e3484afa`,
  `src/core/shared/knowledge/revisions.ts`: normalized revision hashes. Pane hashes
  the complete ordered site snapshot so rollback includes every page field.

Package-mode wiring and workflow examples were read from run-satchel, run-barrow,
run-lanyard and run-lamp. Pane's product implementation is edition-owned.
