// Individual controls write the same CSV field that native draft autosave uses.
// The server validates the full map, including targets, collisions and cycles.
function rowsFromCsv(text) {
 const rows = []
 let row = [], field = '', quoted = false, closed = false
 const cell = () => { row.push(field); field = ''; closed = false }
 const line = () => { cell(); if (row.some(value => value.trim())) rows.push(row); row = [] }
 text = text.replace(/^\uFEFF/, '')
 for (let i = 0; i < text.length; i++) {
  const character = text[i]
  if (quoted) {
   if (character !== '"') field += character
   else if (text[i + 1] === '"') { field += '"'; i++ }
   else { quoted = false; closed = true }
  } else if (character === ',') cell()
  else if (character === '\r' || character === '\n') { line(); if (character === '\r' && text[i + 1] === '\n') i++ }
  else if (closed) { if (character !== ' ' && character !== '\t') throw Error('CSV has text after a closing quote.') }
  else if (character === '"') { if (field) throw Error('CSV quotes must surround the entire field.'); quoted = true }
  else field += character
 }
 if (quoted) throw Error('CSV has an unclosed quoted field.')
 line()
 if (!rows.length) return []
 const header = rows.shift()
 if (header.length !== 3 || header.some((value, index) => value.trim().toLowerCase() !== ['from', 'to', 'status'][index])) throw Error('CSV must start with from,to,status.')
 const sources = new Set()
 for (const row of rows) {
  if (row.length !== 3 || !row[0].trim() || !row[1].trim() || !['301', '302'].includes(row[2].trim())) throw Error('Each CSV row needs a source, target and status 301 or 302.')
  for (let i = 0; i < row.length; i++) row[i] = row[i].trim()
  if (sources.has(row[0])) throw Error(`Duplicate redirect source: ${row[0]}.`)
  sources.add(row[0])
 }
 return rows
}

function encodeCsv(rows) {
 const quote = value => /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
 return ['from,to,status', ...rows.map(row => row.map(quote).join(','))].join('\n')
}

for (const settings of document.querySelectorAll('[data-redirect-settings]')) {
 const csv = settings.querySelector('[data-redirect-csv]'), imported = settings.querySelector('[data-redirect-import]')
 const message = settings.querySelector('[data-redirect-message]'), form = settings.closest('form')
 function update(rows) {
  const bySource = new Map(rowsFromCsv(csv.value).map(row => [row[0], row]))
  for (const row of rows) bySource.set(row[0], row)
  csv.value = encodeCsv([...bySource.values()])
  csv.setCustomValidity('')
  csv.dispatchEvent(new Event('input', { bubbles: true }))
  message.textContent = 'Redirect map updated. Publish the draft to apply it.'
 }
 const attempt = action => {
  try { action(); return true } catch (error) { message.textContent = error.message; return false }
 }
 settings.querySelector('[data-redirect-add]').addEventListener('click', () => {
  const fields = settings.querySelector('[data-redirect-add-fields]')
  const from = fields.querySelector('[data-redirect-from]'), to = fields.querySelector('[data-redirect-to]')
  if (!from.value.trim() || !to.value.trim()) { message.textContent = 'Enter both the source and target.'; (!from.value.trim() ? from : to).focus(); return }
  attempt(() => update([[from.value.trim(), to.value.trim(), fields.querySelector('[data-redirect-status]').value]]))
 })
 settings.querySelector('[data-redirect-import-button]').addEventListener('click', () => {
  attempt(() => {
   const rows = rowsFromCsv(imported.value)
   // Clear before dispatch so autosave records the complete import as one edit.
   const previous = imported.value
   imported.value = ''
   try { update(rows) } catch (error) { imported.value = previous; throw error }
  })
 })
 // Capture before per-field autosave listeners, keeping map and acceptance in
 // the same history entry. Stable source keys survive removal of earlier offers.
 function accept(event) {
  const offer = event.target.closest('[data-redirect-offer]')
  if (!offer || offer.querySelector('[data-redirect-accept]').value !== 'yes') return
  const valid = attempt(() => update([[offer.dataset.redirectSource, offer.querySelector('[data-redirect-target]').value.trim(), offer.querySelector('[data-redirect-status]').value]]))
  if (!valid) csv.setCustomValidity('Fix the redirect CSV before adding this suggestion.')
 }
 settings.addEventListener('input', accept, true)
 settings.addEventListener('change', accept, true)
 csv.addEventListener('input', () => csv.setCustomValidity(''))
 form?.addEventListener('draftrestore', () => {
  csv.setCustomValidity('')
  message.textContent = ''
  for (const field of settings.querySelectorAll('[data-redirect-add-fields] input')) field.value = ''
 })
}
