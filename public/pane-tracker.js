// Cookie-free aggregates: unknown tag text is discarded before sending. Nothing
// is stored on the device; a goal is attributed to the page view it happens on.
if (navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl) {
 const script = document.currentScript, path = script.dataset.page
 const approved = JSON.parse(script.dataset.campaigns)
 const sources = JSON.parse(script.dataset.sources), mediums = JSON.parse(script.dataset.mediums)
 const goals = JSON.parse(script.dataset.goals ?? '[]')
 const params = new URL(location.href).searchParams
 const label = value => approved.find(item => item.toLowerCase() === (value ?? '').normalize('NFC').toLowerCase()) ?? ''
 const campaign = label(params.get('utm_campaign'))
 const source = params.get('utm_source') ?? '', medium = (params.get('utm_medium') ?? '').toLowerCase()
 const utm_source = label(source) || (Object.hasOwn(sources, source.toLowerCase()) ? sources[source.toLowerCase()] : '')
 const utm_medium = medium ? (Object.hasOwn(mediums, medium) ? mediums[medium] : 'other') : ''
 let referrerHost = ''
 if (document.referrer) { try { referrerHost = new URL(document.referrer).hostname } catch {} }
 const attribution = {referrerHost,campaign,campaignTagged:params.has('utm_campaign'),utm_source,utm_medium}
 const send = (url, body) => fetch(url, {method:'POST',credentials:'omit',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).catch(()=>{})
 const raise = goal => window.dispatchEvent(new CustomEvent('pane:goal', {detail:{name:goal.name}}))
 send('/site/visit', {path,...attribution})
 // A submitted contact form carries this view's attribution; the server counts the stored message.
 document.addEventListener('submit', event => {
  const field = event.target.elements?.attribution
  if (field) { field.value = JSON.stringify(attribution); goals.filter(goal => goal.type === 'form').forEach(raise) }
 })
 document.addEventListener('click', event => {
  const link = event.target.closest?.('a[href]')
  if (!link) return
  let url
  try { url = new URL(link.href, location.href) } catch { return }
  const web = url.protocol === 'http:' || url.protocol === 'https:'
  for (const goal of goals) {
   const hit = goal.type === 'phone' ? url.protocol === 'tel:' : goal.type === 'email' ? url.protocol === 'mailto:'
    : goal.type === 'outbound' && web && url.hostname !== location.hostname && (!goal.target || url.hostname === goal.target || url.hostname.endsWith('.' + goal.target))
   if (hit) { send('/site/visit/goal', {goal:goal.id,path,...attribution}); raise(goal) }
  }
 })
}
