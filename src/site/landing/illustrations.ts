const brand = '<span class="lp-brand"><img src="/brand/mark.svg" width="28" height="28" alt="">Pane</span>'

export function heroDrawing(): string {
  return `<div class="lp-window lp-steps" role="group" aria-label="Pane in three steps: make a change, preview it, publish">
    <div class="lp-glass"><div class="lp-step lp-card">
      <div class="lp-step-title"><span class="lp-number">1</span><span>Make a change</span></div>
      <div class="lp-inner lp-hours"><strong>Hours</strong><p>Saturday: 9 am to 1 pm</p><span class="lp-pill">Draft</span></div>
    </div></div>
    <div class="lp-glass"><div class="lp-step lp-card">
      <div class="lp-step-title"><span class="lp-number">2</span><span>Preview it</span></div>
      <div class="lp-inner lp-browser"><div class="lp-browser-bar"><span>Draft preview</span><span class="lp-browser-dots" aria-hidden="true">● ● ●</span></div>
        <div class="lp-mini-nav"><span>Home</span><span>About</span><span>Services</span><span>Hours</span><span>Contact</span></div>
        <div class="lp-mini-body"><strong>Hours</strong><p>Saturday: 9 am to 1 pm</p></div>
      </div>
    </div></div>
    <div class="lp-glass"><div class="lp-step lp-card">
      <div class="lp-step-title"><span class="lp-number">3</span><span>Publish</span></div>
      <div class="lp-inner lp-live"><strong><span class="lp-live-dot" aria-hidden="true"></span>Live now</strong><p>Cedar Street Studio</p></div>
    </div></div>
  </div>`
}

function framed(name: string, content: string): string {
  return `<div class="lp-window lp-feature-window lp-${name}" role="group" aria-label="${name === 'free' ? 'MIT licensed Pane' : name === 'versions' ? 'Saved website revisions' : name === 'messages' ? 'A message in your site inbox' : name === 'visits' ? 'Page visit counts' : 'A draft ready for your approval'}"><div class="lp-glass"><div class="lp-card lp-feature-card">${content}</div></div></div>`
}

export const featureDrawings = {
  free: framed('free', `<h3>MIT License</h3><div class="lp-license-brand">${brand}</div>`),
  versions: framed('versions', `<h3>Every revision, kept</h3><div class="lp-revision"><span>Cedar Street Studio</span><span class="lp-pill">Live</span></div><div class="lp-revision"><span>Cedar Street Studio</span><span class="lp-demo-button lp-demo-outline">Restore live</span></div>`),
  messages: framed('messages', `<h3>Messages from your site</h3><div class="lp-message"><span class="lp-message-dot" aria-hidden="true"></span><div><strong>Priya Nair</strong><p>Could you repair a dining chair?</p></div></div>`),
  visits: framed('visits', `<h3>Visits by page</h3><dl class="lp-visit-table"><div><dt>/home</dt><dd>214</dd></div><div><dt>/hours</dt><dd>96</dd></div><div><dt>/contact</dt><dd>41</dd></div></dl>`),
  agent: framed('agent', `<p class="lp-draft-eyebrow">Draft · awaiting approval</p><h3>Cedar Street Studio</h3><div class="lp-draft-actions"><span class="lp-demo-button lp-demo-outline">Preview draft ↗</span><span class="lp-demo-button lp-demo-primary">Approve &amp; publish</span></div>`),
}

export function closingDrawing(): string {
  return '<div class="lp-window lp-closing-window" aria-hidden="true"><div class="lp-glass"></div><div class="lp-glass"></div><div class="lp-glass"></div></div>'
}
