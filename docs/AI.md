# Writing and search assistance

The native owner opens **AI help** in the page editor. Choose a task and click
**Send to OpenAI** to send the saved page text, or the first five native raster
images for image descriptions. Each suggestion needs an explicit decision.
Accepting changes creates a private, immutable draft. Publishing is a separate
owner approval. Rejected suggestions do not enter the site.

Search review uses Pane's selected-page search checks and existing native link destinations. It sends no other page content or destination-page titles, and never fetches linked targets.
Structured-data gaps are findings for owner review; this feature does not create
a structured-data schema. Translation creates a separate hidden page draft,
retaining the source page. Spanish is the starting language; another language
can be entered in the same control.

Accepted batches have a durable Undo and Redo history that survives reopening the editor. At least five consecutive batches are retained.
A newer save causes a conflict and keeps that newer content. Review the latest
page and request fresh suggestions before applying a stale result. No automatic
retry or publication occurs, including after an uncertain model response.

AI is off by default. Configure the Worker's private bindings `AI_ENABLED=true`,
`AI_API_KEY` with an OpenAI project key, and optionally `AI_MODEL` (the default is
`gpt-4.1-mini`). Keep the key in the installation's private configuration or
Worker secrets, never in site content or source control. This adapter uses
Base's AI client, with one request, a 90-second deadline, structured JSON output
and provider response storage disabled. It supports OpenAI directly.

The owner explicitly sends page text and selected raster bytes to OpenAI. Code,
form submissions, customer lists and credentials are not included. Confirm the
provider's actual retention practices before sending sensitive content. Generated
privacy-policy starters name OpenAI whenever AI is enabled. Proposals are private
to the initiating owner and excluded from installation archives; accepted text
is ordinary revision content. Activity records contain only actor, time, operation, page and image identifiers, source and resulting revisions, provider and model, proposal and request identifiers, decisions and sanitized outcomes. Generation clicks are recorded before sending; prompt and output bodies are excluded from activity.
