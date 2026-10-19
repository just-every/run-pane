# Pane fonts

Self-hosted Latin WOFF2 subsets from Google Fonts, licensed under the SIL Open
Font License 1.1. Each family includes its upstream `OFL.txt`. Pages load only
local files; no third-party font request is made at runtime.

- **Noto Serif Display:** variable weight 100–900 and width 62.5–100%. Set
  `font-stretch: 75%` and weight 800 for landing display type, 750 for app display
  type. The full width axis also supports the normal-width 700 wordmark.
- **Noto Serif:** variable weight, used at 400 and 700 for reading text.
- **Noto Sans:** variable weight, used at 400, 500 and 600 for UI text.
- **Noto Sans Mono:** normal 400 for revision metadata and JSON.
- **Figtree** (run site): variable weight 300–900. Weight 900 with tight
  tracking is the heavy rounded headline face of the approved run site; 400–700
  sets its body, cards and docs. `figtree/OFL.txt`.
- **JetBrains Mono** (run site): normal 400 for commands, paths and DNS values.
  `jetbrains-mono/OFL.txt`.

The root document links `/fonts/fonts.css` once and preloads the display and UI
Latin files. Native authentication and setup documents use the same head links.
Controls inherit the UI family. Edition styles choose reading/display/mono roles.

## Provenance

Downloaded 16 October 2026 using the Google Fonts CSS API's Latin subsets.
Keep the font files and their licences together when redistributing.


CSS source: https://fonts.googleapis.com/css2?family=Noto+Serif+Display:wdth,wght@62.5..100,100..900&display=swap

- `noto-serif-display/noto-serif-display-latin-wdth-wght-normal.woff2` (76372 bytes): https://fonts.gstatic.com/s/notoserifdisplay/v29/buErppa9f8_vkXaZLAgP0G5Wi6QmA1Qwda5M.woff2

Licence: https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifdisplay/OFL.txt

CSS source: https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400..700&display=swap

- `noto-serif/noto-serif-latin-wght-normal.woff2` (36756 bytes): https://fonts.gstatic.com/s/notoserif/v33/ga6daw1J5X9T9RW6j9bNVls-hfgvz8JcMofYTYf6D30.woff2

Licence: https://raw.githubusercontent.com/google/fonts/main/ofl/notoserif/OFL.txt

CSS source: https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400..600&display=swap

- `noto-sans/noto-sans-latin-wght-normal.woff2` (35820 bytes): https://fonts.gstatic.com/s/notosans/v42/o-0bIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5a7duw.woff2

Licence: https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/OFL.txt

CSS source: https://fonts.googleapis.com/css2?family=Noto+Sans+Mono:wght@400&display=swap

- `noto-sans-mono/noto-sans-mono-latin-400-normal.woff2` (10876 bytes): https://fonts.gstatic.com/s/notosansmono/v37/BngrUXNETWXI6LwhGYvaxZikqZqK6fBq6kPvUce2oAZcdthSBUsYck4-_FNJ093dVQ.woff2

Licence: https://raw.githubusercontent.com/google/fonts/main/ofl/notosansmono/OFL.txt

## Binary axis verification

The downloaded WOFF2 `fvar` tables contain these actual axes (minimum / default /
maximum), independent of the CSS face descriptors:

- Noto Serif Display: `wght` 100 / 400 / 900; `wdth` 62.5 / 100 / 100.
- Noto Serif: `wght` 100 / 400 / 900.
- Noto Sans: `wght` 100 / 400 / 900.
- Noto Sans Mono 400: static, without an `fvar` table.

Verified by parsing the WOFF2 table directory, decompressing its font stream with
the system Brotli CLI, and reading the binary OpenType `fvar` axis records. The
reading and UI CSS registrations limit selection to the weights used by Pane.

## Run site faces

Downloaded 19 October 2026 from the fontsource npm builds of the upstream OFL
projects (Latin subset, unchanged):

- `figtree/figtree-latin-wght-normal.woff2`: `@fontsource-variable/figtree@5.2.10`
  (upstream https://github.com/erikdkennedy/figtree, SIL OFL 1.1).
- `jetbrains-mono/jetbrains-mono-latin-400-normal.woff2`: `@fontsource/jetbrains-mono@5.2.8`
  (upstream https://github.com/JetBrains/JetBrainsMono, SIL OFL 1.1).
