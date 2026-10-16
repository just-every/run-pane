# Back up and restore

A Pane archive saves your local site and inbox, with an integrity receipt.
Keep it private: it contains customer data. Export and import are local
operations; remote transfer is unsupported.

## Make a backup

Stop development or preview so nothing writes while you export:

```sh
rer dev --stop
rer preview --stop
rer export --output exports/pane.rer
```

Choose a new filename for each backup. `exports/` is protected from the app's
public listener. An absolute path outside the checkout is also accepted, such
as a private backup directory. Do not put archives in `public/`, source or
build folders. Copy a verified backup somewhere safe before deleting or
resetting your installation.

The archive includes site revisions, the live selection, messages, visits,
approvals, import records and durable owner records. Active sessions, local
development identities, secrets and transient runtime state are excluded.
Keep your source and dependencies available separately.

## Restore into an empty installation

Use a destination with the same code and dependencies and no existing local
data. Do not import over an installation you still need.

```sh
rer import --input /absolute/private/path/pane.rer --yes
rer dev
```

Import validates the archive and refuses a nonempty destination. `rer dev`
establishes any missing local setup and opens a fresh owner session. Open its
private `RER_OPEN` link and confirm the owner again if requested. Saved domain
and owner records are retained; active sessions and private local settings
are not restored.

To deliberately empty an existing destination, first stop it and export any
data you need. `rer reset --yes` deletes its declared local state and private
settings. It keeps source, dependencies and files in `exports/`. Never reset
the only copy of your site or inbox.

## Restore with erasure history

An archive made before a message was erased may still contain that message.
Supply a later archive from the same installation as an erasure journal:

```sh
rer import --input /private/path/older.rer --journal /private/path/later.rer --yes
```

If the older archive contains rows that the later journal marks erased, the
restore is refused. This is a refusal, not automatic removal from the archive.
A fresh destination cannot know about an erasure without that later journal.
Keep an up-to-date backup after erasing data, and manage older copies accordingly.

For all supported flags and the exact reset inventory, read the
[local command reference](../RUN-LOCALLY.md).
