// One serialized structure participates in the existing autosave/undo history.
for (const organizer of document.querySelectorAll('[data-page-organization]')) {
 const structure = organizer.querySelector('[data-page-structure]')
 const list = organizer.querySelector('[data-page-list]')
 const status = organizer.querySelector('[data-organization-status]')
 const folderOptions = organizer.querySelector('[data-folder-options]')
 const folderList = organizer.querySelector('[data-folder-list]')
 const showDeleted = organizer.querySelector('[data-show-deleted]')
 let state = JSON.parse(structure.value)
 const form = organizer.closest('form')
 const savedSlugs = new Map(state.pages.map(page => [page.id, page.slug]))
 const text = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))
 const cleanSlug = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 120).replace(/^-+|-+$/g, '')
 const activePages = () => state.pages.filter(page => !page.deleted)
 const announce = message => { status.textContent = message }

 function choices() {
  for (const select of organizer.querySelectorAll('[data-page-role]')) {
   const role = select.dataset.pageRole
   select.innerHTML = `${role === 'notFound' ? '<option value="">Default not-found page</option>' : ''}${activePages().map(page => `<option value="${text(page.id)}">${text(page.title || page.slug || 'Untitled page')}</option>`).join('')}`
   select.value = state[role]
  }
 }

 function folders() {
  folderOptions.innerHTML = state.folders.map(folder => `<option value="${text(folder)}"></option>`).join('')
  folderList.innerHTML = state.folders.length ? state.folders.map(folder => `<li>${text(folder)}</li>`).join('') : '<li>No folders yet.</li>'
 }

 function validateSlugs() {
  for (const field of list.querySelectorAll('[data-page-field="slug"]')) {
   const id = field.closest('[data-page-id]').dataset.pageId
   const duplicate = state.pages.some(page => page.id !== id && page.slug === field.value)
   field.setCustomValidity(duplicate ? 'Choose a unique page address, including deleted pages.' : '')
  }
 }

 function commit() {
  const selected = state.pages.find(page => savedSlugs.get(page.id) === form.elements.slug?.value)
  if (selected) {
   const title = form.elements.namedItem(`page.${form.elements.slug.value}.title`)
   const hidden = form.elements.namedItem(`page.${form.elements.slug.value}.hidden`)
   if (title) title.value = selected.title
   if (hidden) hidden.value = selected.hidden ? 'yes' : 'no'
  }
  structure.value = JSON.stringify(state)
  structure.dispatchEvent(new Event('input', { bubbles: true }))
 }

 function render() {
  const active = activePages()
  const visible = state.pages.filter(page => !page.deleted || showDeleted.checked)
  list.innerHTML = visible.map(page => {
   const index = active.findIndex(item => item.id === page.id)
   const savedSlug = savedSlugs.get(page.id)
   const pageLabel = page.title || page.slug || 'Untitled page'
   return `<li class="page-organization-row${page.deleted ? ' is-deleted' : ''}" data-page-id="${text(page.id)}">
   <div class="page-organization-row-head"><strong>${text(pageLabel)}</strong>${page.deleted ? '<span class="page-organization-deleted">Deleted</span>' : ''}${savedSlug !== undefined && !page.deleted ? `<a href="/app?page=${encodeURIComponent(savedSlug)}">Open saved page</a>` : ''}</div>
   <div class="page-organization-fields">
   <label>Title<input data-page-field="title" value="${text(page.title)}" maxlength="120"${page.deleted ? ' disabled' : ' required'}></label>
   <label>Address<input data-page-field="slug" value="${text(page.slug)}" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="120" autocomplete="off" autocapitalize="none" spellcheck="false"${page.deleted ? ' disabled' : ' required'}></label>
   <label>Folder<input data-page-field="folder" value="${text(page.folder)}" list="${text(folderOptions.id)}" maxlength="120" autocomplete="off"${page.deleted ? ' disabled' : ''}></label>
   </div>
   <div class="page-organization-row-actions">${page.deleted ? `<button type="button" class="secondary small" data-page-action="restore" aria-label="Restore ${text(pageLabel)}">Restore page</button>` : `<label class="page-organization-check"><input type="checkbox" data-page-field="hidden"${page.hidden ? ' checked' : ''}>Hidden from menus</label>
   <button type="button" class="secondary small" data-page-action="up" aria-label="Move ${text(pageLabel)} up"${index === 0 ? ' disabled' : ''}>Move up</button>
   <button type="button" class="secondary small" data-page-action="down" aria-label="Move ${text(pageLabel)} down"${index === active.length - 1 ? ' disabled' : ''}>Move down</button>
   <button type="button" class="secondary small" data-page-action="delete" aria-label="Delete ${text(pageLabel)}">Delete page</button>`}</div></li>`
  }).join('') || '<li class="help">No pages to show.</li>'
  choices()
  folders()
  validateSlugs()
 }

 function addPage() {
  const titleField = organizer.querySelector('[data-new-page-title]')
  const slugField = organizer.querySelector('[data-new-page-slug]')
  const title = titleField.value.trim()
  const address = cleanSlug(slugField.value || title)
  if (!title) { announce('Enter a title for the new page.'); titleField.focus(); return }
  if (!address) { announce('Enter a page address using letters or numbers.'); slugField.focus(); return }
  let slug = address, suffix = 2
  while (state.pages.some(page => page.slug === slug)) {
   const ending = `-${suffix++}`
   slug = address.slice(0, 120 - ending.length).replace(/-+$/g, '') + ending
  }
  const page = { id: crypto.randomUUID(), slug, title }
  state.pages.push(page)
  if (!state.home) state.home = page.id
  titleField.value = ''; slugField.value = ''
  render(); commit()
  const row = [...list.querySelectorAll('[data-page-id]')].find(item => item.dataset.pageId === page.id)
  row.querySelector('[data-page-field="title"]').focus()
  announce(`Added ${title}. Save and reload to edit its text.`)
 }

 function addFolder() {
  const field = organizer.querySelector('[data-new-folder]')
  const folder = field.value.trim()
  if (!folder) { announce('Enter a folder name.'); field.focus(); return }
  if (state.folders.includes(folder)) { announce('That folder is already available.'); field.focus(); return }
  state.folders.push(folder)
  field.value = ''
  folders(); commit(); field.focus()
  announce(`Added folder ${folder}. Choose it on a page to move that page into it.`)
 }

 organizer.addEventListener('input', event => {
  const field = event.target
  if (field === showDeleted) { render(); return }
  if (field.matches('[data-page-role]')) {
   state[field.dataset.pageRole] = field.value
   commit(); return
  }
  if (!field.matches('[data-page-field]')) return
  const page = state.pages.find(item => item.id === field.closest('[data-page-id]').dataset.pageId)
  const name = field.dataset.pageField
  if (name === 'hidden') page.hidden = field.checked
  else page[name] = field.value
  const heading = field.closest('[data-page-id]').querySelector('.page-organization-row-head strong')
  heading.textContent = page.title || page.slug || 'Untitled page'
  choices(); validateSlugs(); commit()
 })

 organizer.addEventListener('change', event => {
  const field = event.target
  if (!field.matches('[data-page-field="slug"], [data-page-field="folder"]')) return
  const page = state.pages.find(item => item.id === field.closest('[data-page-id]').dataset.pageId)
  const name = field.dataset.pageField
  field.value = name === 'slug' ? cleanSlug(field.value) : field.value.trim()
  page[name] = field.value
  if (name === 'folder' && field.value && !state.folders.includes(field.value)) state.folders.push(field.value)
  folders(); validateSlugs(); commit()
 })

 organizer.addEventListener('click', event => {
  const button = event.target.closest('button')
  if (!button || !organizer.contains(button)) return
  if (button.matches('[data-add-page]')) { addPage(); return }
  if (button.matches('[data-add-folder]')) { addFolder(); return }
  const action = button.dataset.pageAction
  if (!action) return
  const page = state.pages.find(item => item.id === button.closest('[data-page-id]').dataset.pageId)
  if (action === 'delete') {
   page.deleted = true
   if (state.home === page.id) state.home = activePages()[0]?.id ?? ''
   if (state.notFound === page.id) state.notFound = ''
  } else if (action === 'restore') {
   delete page.deleted
   if (!state.home) state.home = page.id
  } else {
   const active = activePages()
   const next = active[active.indexOf(page) + (action === 'up' ? -1 : 1)]
   if (!next) return
   const index = state.pages.indexOf(page), nextIndex = state.pages.indexOf(next)
   ;[state.pages[index], state.pages[nextIndex]] = [state.pages[nextIndex], state.pages[index]]
  }
  render(); commit()
  const row = [...list.querySelectorAll('[data-page-id]')].find(item => item.dataset.pageId === page.id)
  const focus = row?.querySelector(`[data-page-action="${action === 'delete' ? 'restore' : action === 'restore' ? 'delete' : action}"]:not(:disabled)`)
  ;(focus ?? row?.querySelector('input:not(:disabled)') ?? showDeleted).focus()
  announce(action === 'delete' ? `Deleted ${page.title}. Show deleted pages to restore it.` : action === 'restore' ? `Restored ${page.title}.` : `Moved ${page.title} ${action}.`)
 })

 organizer.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.isComposing) return
  if (event.target.matches('[data-new-page-title], [data-new-page-slug]')) { event.preventDefault(); addPage() }
  else if (event.target.matches('[data-new-folder]')) { event.preventDefault(); addFolder() }
 })

 function restore() {
  try { state = JSON.parse(structure.value); render(); announce('Page organization restored.') }
  catch { announce('Page organization could not be restored. Reload the saved draft to continue.') }
 }
 form.addEventListener('input', event => {
  const selected = state.pages.find(page => savedSlugs.get(page.id) === form.elements.slug?.value)
  if (!selected) return
  if (event.target.name === `page.${form.elements.slug.value}.title`) selected.title = event.target.value
  else if (event.target.name === `page.${form.elements.slug.value}.hidden`) selected.hidden = event.target.value === 'yes'
  else return
  structure.value = JSON.stringify(state)
  render()
 }, true)
 structure.addEventListener('draftrestore', restore)
 organizer.closest('form')?.addEventListener('draftrestore', event => { if (event.target !== structure) restore() })
 render()
}
