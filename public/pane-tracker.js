// Cookie-free aggregate events; only published, owner-approved campaign labels travel.
if (navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl) {
 const path = document.currentScript.dataset.page
 const approved = JSON.parse(document.currentScript.dataset.campaigns)
 const candidate = new URL(location.href).searchParams.get('utm_campaign')
 const campaign = approved.includes(candidate) ? candidate : ''
 let referrerHost = ''
 if (document.referrer) { try { referrerHost = new URL(document.referrer).hostname } catch {} }
 fetch('/site/visit', {method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({path,referrerHost,campaign})}).catch(()=>{})
}
