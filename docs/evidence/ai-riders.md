# AI rider proof extension

AI-003 is DONE. CT ruled AI-002 STAYS PARTIAL at reviewed commit `9c68cb4775d6668b3bd3424bd2d3c9946df87900` on 26 October 2026 at 22:30Z. This candidate closes those bounded proof gaps and marks AI-002 DONE for a fresh exact-candidate judgment. CMS-004 retains its separate public-blog and rich-body obligations. No acceptance point or role authority changes.

The existing “AI-003 and AI-002 browser journey” in `scripts/ai-journey.mjs` loads `riderProof` from `scripts/ai-riders.mjs`. `scripts/browser-proof.mjs` already loads that journey in the canvas shard. No test registration was added or removed. The same production Worker, native authentication, native D1 and real Base AI client run; only the paid provider edge is faked. No live model request was made in this fix round. The previous live-model record remains separately labeled.

| Rider | Discriminating assertion in the loaded extension |
| --- | --- |
| Consent before sending at 1440 and 390 | Required visible disclosure names OpenAI through Base AI, the selected page, selected content, named images, pending acceptance and separate publication. Every named input is visible and matches its raster source. No outbound call occurs while reviewing consent. |
| Native owner only | A real scoped owner token is created through the native API. Propose, decide, undo and history each refuse it; refusal makes zero provider calls. The token stays in memory. Existing owner, administrator, signed-out and origin assertions remain loaded. |
| Selected input only | `providerInput` in `tests/browser-ai-riders.mjs` checks every provider-body key, both messages, each content part, the full selected context, exact page values, local destination labels and identifiers, every named raster and the recursive output-schema allowlist. All eight excluded private-data classes have distinct records and sentinels. The full body, including system instructions, excludes every sentinel, the configured synthetic provider credential and the seeded unselected private signed image URL, across system instructions, user messages and every other field. |
| Weak page and pending review | Search checks contain actual weaknesses from the reviewed revision. Every control starts pending; each displayed Before value equals its reviewed source. Existing proposal assertions cover all five search kinds and two accepted edits. |
| Consent audit before transmission | Inside the provider edge, the activity API must already contain the click. `auditMetadata` checks complete event and detail key allowlists, actor, timestamp, operation, exact selected page, exact source revision, image identifiers, request linkage, provider, model and outcome. |
| Metadata only | Every request, proposal, mixed decision, rejection-only decision, undo, redo and failure event is checked. Each decision outcome has its own expected result revision; rejection-only has no result revision and creates no revision. Undo and redo each create a separate immutable revision with the exact expected site. Every outcome is required to occur exactly once before the full audit allowlist is applied. Decisions and source revision identifiers match the recorded choices and reviewed revision. Audit excludes source and output bodies, private sentinels, actual image bytes, stored private signed image URL, synthetic provider credential, scoped tokens and raw provider error. |
| Immutable private acceptance | Reread the complete source revision, including its hash, after acceptance. The public HTML and live revision remain unchanged. Each generation makes exactly one provider call. Every acceptance or rejection in every existing AI mode makes zero outbound calls. |
| Failure and connected disclosure | A provider error containing a synthetic raw-error sentinel is sanitized and creates no draft. The connected editable privacy starter names OpenAI through Base AI, explicit requests, selected text and named images, individual acceptance and separate publication; existing pages and the live revision are preserved. |

Local build, typecheck, all three targeted “Pane AI” tests in `tests/search.test.mjs` and the full AI browser journey passed at implementation commit `e19fd509eebdf364cba732ccabdb99c79c53c8f0`. The browser path includes tooltip hover and keyboard focus at both widths. The final candidate differs only in contract evidence and the regenerated source lock.

Seventeen deliberate source mutations were each built and run against the rider extension, then restored. Every mutation produced a nonzero journey exit at its corresponding assertion:

- Remove the disclosure; falsify the processor; falsify the selected page; falsify named image labels.
- Bypass both scoped-owner guards.
- Add an unapproved private provider field.
- Add a private prompt field to audit metadata.
- Send mail during acceptance.
- Start non-finding decisions as accepted.
- Inject each excluded private-data sentinel into system instructions: other page, unrelated unpublished material, revision history, visitor data, form submission, enquiry, account record and secret.

The first provider-field experiment failed through the product’s sanitized error response; the browser adapter was corrected to surface the original paid-edge assertion to the driver. The first pending-choice mutation also changed findings and was caught by the existing finding guard; it was narrowed to non-findings so the new pending-control assertion itself discriminates it. Neither experiment weakened a product assertion.

The one-off mutation driver, per-mutation logs, results, browser captures and local command output are retained under the run’s mapped evidence and reports directories with tag `sx-pane-c-i872-fix1`. The mutation driver runs only this journey with `PANE_AI_RIDER_ONLY=1`; ordinary canvas Verify runs the entire journey. All mutations are restored; no product source or Base pin is changed.


## Fix round 2: provider fake

The only unproved points in the 26 October CT judgment were whole-body exclusion of the configured provider credential and unselected private signed image URL, and metadata-only audit after rejection-only, undo and redo. The loaded rider now checks both at 1440 and 390. No acceptance point, UI, product behavior, Base pin or permanent test registration changes.

Four named mutations were built against the real Worker. For each, the old loaded rider was run first and the strengthened loaded rider second, with the identical mutated build and `PANE_AI_RIDER_ONLY=1`. This is a provider fake at the paid network edge, not a live OpenAI run.

| Mutation | Before: old proof output | After: strengthened proof output |
| --- | --- | --- |
| `system-credential`: append the configured fixture credential to system instructions | exit 0; AI-003 and AI-002 browser journey passed | exit 1; AssertionError: Entire provider body excludes private values |
| `system-private-signed-image`: append the seeded unselected private signed image URL to system instructions | exit 0; AI-003 and AI-002 browser journey passed | exit 1; AssertionError: Entire provider body excludes private values |
| `undo-raw-provider-error`: add rawError only to an undo event returned by the activity API | exit 0; AI-003 and AI-002 browser journey passed | exit 1; AssertionError: Audit metadata allowlist |
| `undo-private-body`: add privateBody only to an undo event returned by the activity API | exit 0; AI-003 and AI-002 browser journey passed | exit 1; AssertionError: Audit metadata allowlist |

All four mutations were restored. The normal full AI journey, three targeted AI route tests and typecheck pass with the strengthened proof. Captures cover the existing consent, rejection-only, undo and redo screens at both widths, and the normal journey checks icon tooltip hover and keyboard focus. The one-off driver, exact before and after command output and mutation results are retained in the mapped reports directory for `sx-pane-c-i893-fix2`. These runtime mutation experiments add no permanent test and make no claim about provider handling or model quality.


## Native author fix round: provider fake

The existing author test in `tests/search.test.mjs` now loads `postProvider` from `tests/ai-post-proof.mjs` at the paid edge. It compares the full selected context, image parts and exact output schema and excludes private values across the entire body, including system instructions. Every explicit generation has exactly one OpenAI POST; acceptance, rejection, undo and redo have zero outbound calls. Complete audit allowlists run before transmission and after each outcome, including sanitized provider failure. The existing publication tests in `tests/pane.test.mjs` compare the approving owner exactly and reread both immutable snapshots and hashes after later prepare, publication and rollback.

All five counterexamples named by CT were applied individually to production source, built and exercised through the real public routes. `author-system-private-post`, `author-undo-raw-error`, `author-decision-mail`, `altered-published-source-hash` and `misattributed-approving-owner` each exited 1 at its intended new assertion. Sources were restored after every experiment. The restored five targeted AI route tests, four publication route tests and full AI browser journey passed, including native editor controls and tooltips at 1440 and 390. No test registration was added or deleted. This is provider-fake evidence; no live-model request or quality certification is claimed.

The experiment and normal-proof source is `d75c79105cd7bcf366ed77b8c0e4d83b78586b1c`; its product, tests, public assets and journey files are byte-identical to implementation `237b60b36007d368545bf06d4d18b11aa8bec399`. The landing candidate changes only status, evidence, provenance and the regenerated source lock after that proof. Exact-candidate Verify loads these same assertions and browser journey before landing.
