// A site-wide browser-local cap, independent of revision and page. No cookies or outbound requests.
const dialog = document.querySelector('[data-promotion]')
if (dialog) {
 const config = JSON.parse(dialog.dataset.promotion), key = 'pane-promotion-last-shown'
 let triggered = false, shown = false, previousFocus, timer
 const phone = () => matchMedia('(max-width: 767px)').matches
 const inWindow = () => (!config.start || Date.now() >= config.start) && (!config.end || Date.now() < config.end)
 const close = () => { dialog.close(); previousFocus?.focus() }
 const eligible = () => {
  try {
   const stored = localStorage.getItem(key), last = Number(stored)
   return stored === null || (Number.isFinite(last) && last > 0 && Date.now() - last >= config.days * 86400000)
  } catch { return false }
 }
 function show() {
  if (shown || !triggered || !inWindow() || !eligible() || document.visibilityState !== 'visible' || (phone() && scrollY < innerHeight)) return
  // Do not compete with another modal or overwrite its focus.
  if (document.querySelector('dialog[open]')) return
  try { localStorage.setItem(key, String(Date.now())) } catch { return }
  previousFocus = document.activeElement
  dialog.showModal(); shown = true
  dialog.querySelector('[data-promotion-close]').focus()
 }
 const trigger = () => { triggered = true; show() }
 if (config.delay) setTimeout(trigger, config.delay * 1000)
 addEventListener('scroll', () => {
  const range = document.documentElement.scrollHeight - innerHeight
  if (config.scroll && range > 0 && scrollY / range * 100 >= config.scroll) triggered = true
  show()
 }, {passive:true})
 document.addEventListener('mouseout', event => { if (config.exit && !phone() && event.relatedTarget === null && event.clientY <= 0) trigger() })
 document.addEventListener('visibilitychange', show)
 dialog.querySelector('[data-promotion-close]').addEventListener('click', close)
 dialog.addEventListener('cancel', event => { event.preventDefault(); close() })
 // Keep Tab and reverse Tab on actual dialog controls, including the browser's edge cases.
 dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return
  const controls = [...dialog.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(control => !control.disabled)
  const first = controls[0], last = controls.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
 })
 function schedule() {
  const now = Date.now()
  if (config.end && now >= config.end) { if (dialog.open) close(); clearTimeout(timer); return }
  show()
  const next = config.start && now < config.start ? config.start : config.end
  if (next && next > now) timer = setTimeout(schedule, Math.min(next - now, 2147483647))
 }
 schedule()
}
