# Preview, publish and restore

Each revision contains your complete five-page site. Preparing a revision
leaves the live site as it is. Publishing makes the selected revision live.

## Make a change

1. Choose **Pages** in your workspace, then the page's brick along the bottom
   (on Home, **Site name and description** opens those two fields too).
2. In **Edit this page**, change the **Page title** or **Text**. A blank line
   starts a new paragraph. The other four pages stay as they are.
3. Choose **Prepare draft revision**. The phone marks each changed paragraph,
   the brick says **Changed**, and **Not live yet** says what publishing changes.
4. Follow **Preview this page** or **Preview draft**. Use the preview navigation
   to read every page.
5. Return to the workspace. The owner chooses **Approve & publish** on the
   draft they have reviewed.

The preview banner identifies the revision as **Draft preview**. It is a saved
snapshot; editing again creates another revision. Make sure the revision you
approve is the one you reviewed. Preview routes require an owner or admin
session. A preview does not accept contact messages or count visits.

After publishing, choose **Open live site** to check the result. The public
website at `/site` now serves that revision.

## Restore an earlier version

Open **History**. Each row identifies the business, revision, preparation time
and the operator who prepared it. **Live** marks the current website.

Preview the earlier revision, then have the owner choose **Restore live** beside
it. That complete snapshot becomes the live site in one action. Restoring does
not erase later revisions or change your inquiries.

The workspace lists the most recent 50 revisions. Saved revisions remain in
the database; the current history display is limited to those 50 rows.

## Who can do what

| Role | Access |
| --- | --- |
| Owner | Prepare and preview drafts, import, publish, restore live and erase messages |
| Admin | Prepare and preview drafts, import and read the workspace |
| Member | Read the workspace |

Use the installed app's operator settings to invite people. Local
`rer dev --as admin` and `rer dev --as member` let you inspect these roles on
your computer; they do not grant access on a hosted installation.

## Publication record

**Approvals** shows each publication or restoration, its exact revision, the
approving operator and the time. A restoration is recorded as `rollback`;
publication is recorded as `publish`.

For a first site from an export, see [Move in a site](MOVE-IN.md).
