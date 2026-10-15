// Adapted from Vane: no cookies, storage, visitor ids, raw URLs or referrers.
if (navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl) {
 const path = location.pathname === '/site' ? 'home' : location.pathname.split('/').pop();
 fetch('/site/visit', {method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({path})}).catch(()=>{});
}
