# Custom code and reusable components

In Pages, open **Save reusable section**, name the section, and save it. A page without structured sections offers its current text. Under **Reusable components**, choose **Linked component** on each destination page. The usage links show every current placement. Editing component text updates linked pages in the next immutable draft; **Detach copy** keeps that page's current section independent. Autosave, Undo, Redo and conflict comparison use the ordinary draft boundary. Preview the affected pages and approve the whole site to publish shared changes.

Only a natively signed-in owner can change **Custom code settings**. Site CSS, HTML, header and footer code apply on each published page; page header and HTML fields apply only on the selected page. Previews never execute these fields. Preparing a draft does not change the live site, and the owner must explicitly approve its immutable revision.

Custom code is third-party content. It stays off until the visitor allows it, using the same browser choice as analytics (`pane:consent:analytics`). Global Privacy Control and Do Not Track override a saved grant. **Keep custom code off** immediately removes the code frame, applied stylesheet and verification metadata and clears analytics cookies. Another open tab's changed choice also takes effect in this session.

Scripts and arbitrary HTML execute in an opaque sandbox with only `allow-scripts`. They cannot read the parent document or workspace cookies, call `/api/pane`, submit forms, create nested frames or load external scripts. A separate opaque relay frame permits only inline child documents, so custom code cannot navigate itself to workspace routes or bypass a provider embed choice. The parent policy authorizes the approved inline script and stylesheet hashes; the frame additionally denies outbound connections. The permissions policy denies camera, microphone and geolocation in every nested frame, and an iframe attribute cannot re-grant them.

CSS applies to the live page and the frame after consent. It uses local style rules; imports, resource functions and escapes are refused. Account for ordinary CSS specificity when overriding site styles. Inert header metadata whose `name` contains `verification`, such as `google-site-verification`, is also copied into the live document header after consent. Executable header and footer content stays in the sandbox. This conservative custom-code policy awaits ct approval; external custom loaders remain denied.

A script inside the sandbox can subscribe to the browser goal event:

```html
<script>
addEventListener('pane:goal', event => {
  const { name, value } = event.detail
  document.body.textContent = name + ': ' + value
})
</script>
```

`name` is the published goal name. `value` is the numeric occurrence count `1`, not revenue or an answer from a form. The bridge sends no email address, form answers, campaign text or workspace data. Phone, email and outbound goals arrive from the existing click door. A form goal arrives on its accepted thank-you view, including a configured local redirect, after the code frame loads. Its URL marker is removed so reloading does not notify the custom listener again. This browser notification is not a provider delivery receipt; server aggregates remain authoritative.
