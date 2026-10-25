// Third-party analytics on a published page. Vane's own script is rendered by the
// server and is cookie-free; Google Analytics 4 loads here only after the visitor
// allows it, and never for Global Privacy Control or Do Not Track.
const script = document.currentScript, ga4 = script.dataset.ga4
const quiet = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1'
const key = 'pane:consent:analytics'
let loaded = false
const eventName = name => {
 const base = name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'goal'
 return (/^[a-z]/.test(base) ? base : 'goal_' + base).slice(0, 40)
}
// Google's tag sends queued events seconds later, and a form post replaces the page first, so a goal form's
// Google event is sent from the thank-you view (?sent) the stored message returns to. Vane gets it on submit.
const formGoals = JSON.parse(document.querySelector('script[data-goals]')?.dataset.goals ?? '[]').filter(goal => goal.type === 'form').map(goal => goal.name)
const toGoogle = name => { if (loaded && !window['ga-disable-' + ga4]) window.gtag('event', eventName(name), {goal_name: name}) }
addEventListener('pane:goal', event => {
 const name = event.detail.name
 try { window.vane?.(name) } catch {}
 if (!formGoals.includes(name)) toGoogle(name)
})
function thanks() {
 const params = new URLSearchParams(location.search)
 if (!params.has('sent')) return
 formGoals.forEach(toGoogle)
 params.delete('sent')
 history.replaceState(history.state, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash)
}
function clearCookies() {
 const parts = location.hostname.split('.')
 for (const pair of document.cookie.split('; ')) {
  const name = pair.split('=')[0]
  if (!/^_ga(?:_|$)/.test(name)) continue
  document.cookie = name + '=; Max-Age=0; path=/'
  for (let i = 0; i < parts.length - 1; i++) document.cookie = name + '=; Max-Age=0; path=/; domain=.' + parts.slice(i).join('.')
 }
}
function allow() {
 window['ga-disable-' + ga4] = false
 if (loaded) return window.gtag('consent', 'update', {analytics_storage: 'granted'})
 loaded = true
 window.dataLayer = window.dataLayer || []
 window.gtag = function () { window.dataLayer.push(arguments) }
 // Analytics only: advertising storage stays denied until an advertising tag is connected and consented.
 window.gtag('consent', 'default', {analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'})
 window.gtag('js', new Date())
 window.gtag('config', ga4, {allow_google_signals: false, allow_ad_personalization_signals: false})
 thanks()
 const tag = document.createElement('script')
 tag.async = true
 tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4)
 document.head.append(tag)
}
function deny() {
 window['ga-disable-' + ga4] = true
 if (loaded) window.gtag('consent', 'update', {analytics_storage: 'denied'})
 clearCookies()
}
const banner = document.querySelector('[data-analytics-consent]')
if (ga4 && banner && !quiet) {
 const status = banner.querySelector('[data-analytics-status]')
 const choose = (choice, remember) => {
  if (remember) { try { localStorage.setItem(key, choice) } catch {}; dispatchEvent(new CustomEvent('pane:consent',{detail:{choice,source:'analytics'}})) }
  banner.dataset.choice = choice
  if (choice === 'allow') { allow(); status.textContent = 'Google Analytics is on. You can turn it off below.' }
  else { deny(); status.textContent = 'Google Analytics is off. Nothing from Google loads on this website.' }
 }
 addEventListener('pane:consent',event=>{if(event.detail.source!=='analytics')choose(event.detail.choice,false)})
 banner.querySelector('[data-analytics-allow]').addEventListener('click', () => choose('allow', true))
 banner.querySelector('[data-analytics-deny]').addEventListener('click', () => choose('deny', true))
 let saved = null
 try { saved = localStorage.getItem(key) } catch {}
 if (saved === 'allow' || saved === 'deny') choose(saved, false)
 banner.hidden = false
}
