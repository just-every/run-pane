# Work with your agent

Your agent can prepare a draft through Pane's authenticated command helper.
You preview the result and approve publication in the workspace.

## Give the helper a session

The helper uses the same native session and server permissions as the forms.
Store the session's Cookie header value in a private mode-0600 file outside
the checkout. Do not commit it or put it in command arguments. The helper does
not read browser cookies or print credentials.

Use the origin printed by `rer dev`; the port below is an example. Pass an
actual whole-site JSON file, including `name`, `description` and all five pages:

```sh
node scripts/pane.mjs status --origin http://127.0.0.1:8787 --session-file /private/path/session
node scripts/pane.mjs prepare --origin http://127.0.0.1:8787 --session-file /private/path/session --input /private/path/site.json
```

The [example site export](../fixtures/static-site.json) shows the whole-site
shape. An owner or admin may prepare; members cannot. The helper returns JSON
and a nonzero exit status when the request fails.

## Review the draft

`status` returns revision IDs. In your running app, a preview is at
`/preview/REVISION/home`, with the other four page slugs available through its
navigation. Open the preview as an owner or admin, inspect every page, then
return to the workspace and choose **Approve & publish** yourself.

## Other helper commands

Every command takes `--origin` and `--session-file`. These commands use the same
authorization and recorded approval paths as the app:

| Command | Additional arguments | Role |
| --- | --- | --- |
| `import-plan` | `--input FILE` | Owner or admin |
| `import-apply` | `--input FILE --fingerprint HASH` | Owner or admin |
| `import-undo` | `--job ID` | Owner or admin; the job's original operator |
| `publish` | `--revision ID` | Owner |
| `rollback` | `--revision ID` | Owner |
| `erase` | `--id ID` | Owner |

Use publication commands only with the owner's explicit approval of the exact
revision. The normal agent workflow ends at preparing a draft for a person to
review. Read [Move in a site](MOVE-IN.md) before applying or undoing imports.
