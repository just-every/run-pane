// Times in the viewer's own zone (the server writes UTC), and one open popover at a time.
const formats = {
  full: { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' },
  short: { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' },
  day: { weekday: 'short', month: 'short', day: 'numeric' },
  time: { hour: 'numeric', minute: '2-digit' },
}
const thisYear = new Date().getFullYear()
for (const element of document.querySelectorAll('time[data-format]')) {
  const value = new Date(element.dateTime), options = { ...formats[element.dataset.format] }
  if (Number.isNaN(value.getTime()) || !options) continue
  if (element.dataset.format !== 'time' && element.dataset.format !== 'full' && value.getFullYear() !== thisYear) options.year = 'numeric'
  element.textContent = value.toLocaleString('en-US', options).replace(/^(\w{3}), /, '$1 ')
}
const popovers = [...document.querySelectorAll('details.switcher, details.account')]
const close = except => { for (const item of popovers) if (item !== except) item.open = false }
for (const item of popovers) item.addEventListener('toggle', () => { if (item.open) close(item) })
document.addEventListener('click', event => { if (!event.target.closest('details.switcher, details.account')) close() })
document.addEventListener('keydown', event => { if (event.key === 'Escape') { const open = popovers.find(item => item.open); if (open) { open.open = false; open.querySelector('summary').focus() } } })
