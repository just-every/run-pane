// Drafts use the same native session, origin checks and immutable revisions as Prepare.
for (const form of document.querySelectorAll('form[data-autosave]')) {
 const fields = [...form.querySelectorAll('input:not([type=hidden]), textarea')]
 const state = () => Object.fromEntries(fields.map(field => [field.name, field.value]))
 const signature = value => JSON.stringify(value)
 const status = form.querySelector('[data-save-status]'), conflict = form.querySelector('[data-conflict]')
 const undo = form.querySelector('[data-undo]'), redo = form.querySelector('[data-redo]')
 let base = form.querySelector('[name=base]')
 if (!base) { base = document.createElement('input'); base.type = 'hidden'; base.name = 'base'; form.append(base) }
 let history = [state()], index = 0, saved = signature(state()), timer, pending, latest, blocked = false
 const buttons = () => { undo.disabled = index === 0; redo.disabled = index === history.length - 1 }
 function changed(record = true) {
  if (record && signature(state()) !== signature(history[index])) { history = history.slice(0, index + 1); history.push(state()); index++ }
  buttons(); clearTimeout(timer)
  const unchanged = !pending && signature(state()) === saved
  status.textContent = unchanged ? 'Draft saved. Not published.' : 'Unsaved changes.'
  if (!blocked && !unchanged) timer = setTimeout(save, 600)
 }
 function restore(value) { for (const field of fields) field.value = value[field.name] ?? ''; changed(false) }
 function adopt(revision) {
  base.value = revision.id
  // Publication and preview actions must follow the saved draft, never a stale revision.
  for (const field of document.querySelectorAll('form[action="/app/publish"] input[name=revision]')) field.value = revision.id
  for (const link of document.querySelectorAll('a[href^="/preview/"]')) link.pathname = link.pathname.replace(/^\/preview\/[^/]+/, '/preview/' + revision.id)
 }
 async function save() {
  clearTimeout(timer)
  if (pending) { await pending; if (!blocked && signature(state()) !== saved) return save(); return }
  if (blocked || signature(state()) === saved) return
  if (!form.checkValidity()) { status.textContent = 'Complete the required fields to save your draft.'; return }
  const sent = signature(state()), body = new FormData(form)
  status.textContent = 'Saving draft…'
  pending = (async () => {
   try {
    const response = await fetch('/app/autosave', {method: 'POST', body, headers: {Accept: 'application/json'}})
    const result = await response.json()
    if (response.status === 409) {
     blocked = true; latest = result.latest; conflict.hidden = false
     const slug = form.elements.slug?.value
     const other = latest?.site.pages.find(page => page.slug === slug)
     form.querySelector('[data-latest]').textContent = other ? [latest.site.name, latest.site.description, other.title, other.body].join('\n\n') : JSON.stringify(latest?.site, null, 2)
     status.textContent = 'Conflict: your changes have not replaced the newer draft. Compare both versions.'
     return
    }
    if (!response.ok) throw Error(result.error ?? 'Draft could not be saved.')
    adopt(result); saved = sent
    status.textContent = signature(state()) === sent ? 'Draft saved. Not published.' : 'Unsaved changes.'
   } catch { status.textContent = 'Draft not saved. Check your connection, then edit or prepare again.' }
  })()
  await pending; pending = null
  if (!blocked && signature(state()) !== sent) timer = setTimeout(save, 600)
 }
 for (const field of fields) field.addEventListener('input', () => changed())
 undo.addEventListener('click', () => { if (index) restore(history[--index]) })
 redo.addEventListener('click', () => { if (index < history.length - 1) restore(history[++index]) })
 form.querySelector('[data-copy]').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state(), null, 2)], {type: 'application/json'}))
  const link = document.createElement('a'); link.href = url; link.download = 'page-draft.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
 })
 form.querySelector('[data-merge]').addEventListener('click', () => {
  if (!latest) return
  adopt(latest); blocked = false; conflict.hidden = true; save()
 })
 form.querySelector('[data-load]').addEventListener('click', () => {
  // Explicitly discard only after the visitor has compared the retained edits.
  blocked = false; saved = signature(state()); location.reload()
 })
 form.addEventListener('submit', async event => {
  clearTimeout(timer)
  if (blocked) { event.preventDefault(); conflict.scrollIntoView({block: 'nearest'}); return }
  if (pending || signature(state()) !== saved) { event.preventDefault(); await save(); if (!blocked && signature(state()) === saved) form.requestSubmit() }
 })
 // Navigation waits for a durable draft. A failed save leaves the fields available.
 document.addEventListener('click', async event => {
  const link = event.target.closest('a[href]')
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download') || signature(state()) === saved) return
  event.preventDefault(); await save()
  if (!blocked && signature(state()) === saved) location.href = link.href
 })
 window.addEventListener('beforeunload', event => {
  if (signature(state()) !== saved) { event.preventDefault(); event.returnValue = '' }
 })
}
