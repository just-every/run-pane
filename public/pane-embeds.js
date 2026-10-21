// Only a published page carries this script. Frames never inherit the workspace origin.
for (const block of document.querySelectorAll('[data-embed]')) {
 const origin = new URL(block.dataset.url).origin, key = 'pane:embed-consent:' + origin
 const status = block.querySelector('[data-embed-status]'), slot = block.querySelector('[data-embed-frame]')
 const allow = block.querySelector('[data-embed-allow]'), deny = block.querySelector('[data-embed-deny]')
 const blocked = block.dataset.gpc === '1' || navigator.globalPrivacyControl === true
 const remember = choice => { try { localStorage.setItem(key, choice) } catch {} }
 function activate() {
  if (blocked || slot.firstChild) return
  const frame = document.createElement('iframe')
  frame.title = block.dataset.title
  frame.setAttribute('sandbox', 'allow-scripts')
  frame.referrerPolicy = 'no-referrer'
  frame.setAttribute('allowfullscreen', '')
  frame.src = block.dataset.url
  slot.append(frame)
  allow.disabled = true
  status.textContent = 'External content from ' + origin + ' is enabled. You can turn it off below.'
 }
 allow.disabled = blocked
 allow.addEventListener('click', () => { if (!blocked) { remember('allow'); activate() } })
 deny.addEventListener('click', () => {
  remember('deny'); slot.replaceChildren(); allow.disabled = blocked
  status.textContent = blocked ? 'Global Privacy Control keeps external content off.' : 'External content is off. No provider is loaded.'
 })
 if (blocked) status.textContent = 'Global Privacy Control keeps external content off.'
 else { try { if (localStorage.getItem(key) === 'allow') activate() } catch {} }
}
