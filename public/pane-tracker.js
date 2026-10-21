// Cookie-free aggregates: unknown tag text is discarded before sending.
if (navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl) {
 const script = document.currentScript, path = script.dataset.page
 const approved = JSON.parse(script.dataset.campaigns)
 const sources = JSON.parse(script.dataset.sources), mediums = JSON.parse(script.dataset.mediums)
 const params = new URL(location.href).searchParams
 const label = value => approved.find(item => item.toLowerCase() === (value ?? '').normalize('NFC').toLowerCase()) ?? ''
 const campaign = label(params.get('utm_campaign'))
 const source = params.get('utm_source') ?? '', medium = (params.get('utm_medium') ?? '').toLowerCase()
 const utm_source = label(source) || (Object.hasOwn(sources, source.toLowerCase()) ? sources[source.toLowerCase()] : '')
 const utm_medium = medium ? (Object.hasOwn(mediums, medium) ? mediums[medium] : 'other') : ''
 let referrerHost = ''
 if (document.referrer) { try { referrerHost = new URL(document.referrer).hostname } catch {} }
 fetch('/site/visit', {method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({path,referrerHost,campaign,campaignTagged:params.has('utm_campaign'),utm_source,utm_medium})}).catch(()=>{})
}
