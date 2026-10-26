const element = (tag, text, className) => {
 const node = document.createElement(tag)
 if (text !== undefined) node.textContent = text
 if (className) node.className = className
 return node
}

for (const root of document.querySelectorAll('[data-ai-assist]')) {
 const requestForm = root.querySelector('[data-ai-propose]')
 const decisionForm = root.querySelector('[data-ai-decide]')
 const editor = root.closest('.edit-card').querySelector('form[data-autosave]')
 const status = root.querySelector('[data-ai-status]'), error = root.querySelector('[data-ai-error]')
 const latest = root.querySelector('[data-ai-latest]'), suggestions = root.querySelector('[data-ai-suggestions]')
 const history = root.querySelector('[data-ai-history]'), undo = root.querySelector('[data-ai-undo]')
 const mode = requestForm.elements.mode, selection = requestForm.elements.selection
 const storageKey = 'pane-ai:' + location.pathname + ':' + root.dataset.slug
 let proposal, lastBatch, busy = false, conflicted = false, needsReload = false

 function updateFields() {
  const selectedText = ['rewrite', 'shorten', 'tone'].includes(mode.value)
  root.querySelector('[data-ai-selection]').hidden = !selectedText
  root.querySelector('[data-ai-tone]').hidden = mode.value !== 'tone'
  root.querySelector('[data-ai-language]').hidden = mode.value !== 'translate'
  selection.required = selectedText
  requestForm.elements.tone.required = mode.value === 'tone'
  requestForm.elements.language.required = mode.value === 'translate'
 }

 function updateHistory() {
  history.hidden = !lastBatch
  if (!lastBatch) return
  undo.textContent = lastBatch.undone ? 'Redo accepted changes' : 'Undo accepted changes'
  root.querySelector('[data-ai-history-note]').textContent = lastBatch.undone
   ? 'The accepted batch was undone in a new private draft.'
   : 'Undo the last accepted batch in a new private draft. Publication stays separate.'
 }

 function lock(value) {
  busy = value
  root.setAttribute('aria-busy', String(value))
  editor.inert = value || needsReload
  for (const control of root.querySelectorAll('button, input, textarea, select')) control.disabled = value || needsReload
  decisionForm.querySelector('button').disabled = value || conflicted || needsReload
 }

 function savedBase() {
  const saved = editor.querySelector('[data-save-status]').textContent
  if (!['Changes save automatically as a draft.', 'Draft saved. Not published.'].includes(saved)) {
   throw Error('Wait until your page changes are saved, then try this action again.')
  }
  return editor.elements.base.value || root.dataset.base
 }

 function showConflict(result) {
  conflicted = true
  latest.replaceChildren(element('strong', 'A newer draft is available'))
  latest.append(element('p', 'Your review choices are kept. Compare the latest draft, then request fresh suggestions before saving decisions.'))
  const revision = result.latest
  const page = revision?.site?.pages?.find(page => page.slug === root.dataset.slug)
  if (page) latest.append(element('p', page.title), element('pre', page.body))
  if (typeof revision?.id === 'string') {
   const link = element('a', 'Open latest draft')
   link.href = '/preview/' + encodeURIComponent(revision.id) + '/' + root.dataset.slug.split('/').map(encodeURIComponent).join('/')
   link.target = '_blank'
   link.rel = 'noopener'
   latest.append(link)
  }
  latest.hidden = false
 }

 async function post(path, body) {
  const response = await fetch(path, {
   method: 'POST', credentials: 'same-origin',
   headers: {'Content-Type': 'application/json', Accept: 'application/json'},
   body: JSON.stringify(body),
  })
  let result
  try { result = await response.json() }
  catch { throw Error('The server response could not be read. Check revision history before trying again.') }
  if (!response.ok) {
   if (response.status === 409) showConflict(result)
   throw Error(typeof result.error === 'string' ? result.error : 'The request failed. No further request was sent.')
  }
  return result
 }

 async function run(message, action) {
  if (busy || needsReload) return
  error.hidden = true
  try {
   const base = savedBase()
   lock(true)
   status.textContent = message
   await action(base)
  } catch (failure) {
   status.textContent = ''
   error.textContent = failure.message || 'The request could not be completed.'
   error.hidden = false
  } finally { lock(false) }
 }

 function renderProposal(result) {
  if (typeof result.id !== 'string' || typeof result.base !== 'string' || result.slug !== root.dataset.slug || !Array.isArray(result.suggestions)) {
   throw Error('The proposal response is incomplete. No suggestions were applied.')
  }
  const ids = new Set(), rows = []
  for (const item of result.suggestions) {
   if (typeof item.id !== 'string' || ids.has(item.id) || typeof item.label !== 'string' || typeof item.after !== 'string') {
    throw Error('A suggestion response is incomplete. No suggestions were applied.')
   }
   ids.add(item.id)
   const row = element('article', undefined, 'ai-suggestion')
   row.append(element('strong', item.label))
   const comparison = element('dl')
   if (typeof item.before === 'string') comparison.append(element('dt', 'Before'), element('dd', item.before))
   if (typeof item.destination === 'string') comparison.append(element('dt', 'Destination'), element('dd', item.destination))
   comparison.append(element('dt', item.kind === 'finding' ? 'Finding' : 'Suggested'), element('dd', item.after))
   const label = element('label', 'Decision')
   const choice = element('select')
   choice.required = true
   choice.dataset.suggestionId = item.id
   choice.setAttribute('aria-label', 'Decision for ' + item.label)
   choice.append(new Option('Choose a decision', ''))
   if (item.kind !== 'finding') choice.append(new Option('Accept', 'accept'))
   choice.append(new Option(item.kind === 'finding' ? 'Dismiss finding' : 'Reject', 'reject'))
   label.append(choice)
   row.append(comparison, label)
   rows.push(row)
  }
  proposal = result
  conflicted = false
  latest.hidden = true
  suggestions.replaceChildren(...rows)
  decisionForm.hidden = rows.length === 0
  status.textContent = rows.length ? 'Suggestions are ready for review. Your draft has not changed.' : 'OpenAI returned no suggestions. Your draft has not changed.'
 }

 function completed(result, batch, message) {
  if (typeof result.revision?.id !== 'string') throw Error('The saved revision was not returned. Check revision history before continuing.')
  lastBatch = batch ? {...batch, base: result.revision.id} : lastBatch
  needsReload = true
  const link = element('a', 'Open updated page')
  link.href = '/app?page=' + encodeURIComponent(root.dataset.slug)
  status.replaceChildren(document.createTextNode(message + ' '), link)
  if (batch) {
   updateHistory()
   try { sessionStorage.setItem(storageKey, JSON.stringify(lastBatch)) }
   catch {
    status.prepend(document.createTextNode('This browser could not remember the Undo action. Revision history remains available. '))
    return
   }
  }
  location.assign(link.href)
 }

 requestForm.addEventListener('submit', event => {
  event.preventDefault()
  if (!requestForm.reportValidity()) return
  run('Sending the selected page to OpenAI…', async base => {
   const body = {base, slug: root.dataset.slug, mode: mode.value, consent: true}
   if (['rewrite', 'shorten', 'tone'].includes(mode.value)) body.selection = selection.value
   if (mode.value === 'tone') body.tone = requestForm.elements.tone.value
   if (mode.value === 'translate') body.language = requestForm.elements.language.value
   const result = await post('/api/pane/ai/propose', body)
   if (result.base !== base) throw Error('The proposal does not match the requested draft. Request fresh suggestions.')
   renderProposal(result)
  })
 })

 decisionForm.addEventListener('submit', event => {
  event.preventDefault()
  if (!proposal || conflicted || !decisionForm.reportValidity()) return
  run('Saving your decisions as a private draft…', async () => {
   const decisions = [...suggestions.querySelectorAll('select')].map(choice => ({id: choice.dataset.suggestionId, accept: choice.value === 'accept'}))
   const result = await post('/api/pane/ai/decide', {id: proposal.id, base: proposal.base, decisions})
   if (decisions.some(decision => decision.accept)) completed(result, {id: proposal.id, undone: false}, 'Accepted changes saved as a private draft.')
   else {
    proposal = undefined
    decisionForm.hidden = true
    status.textContent = 'All suggestions dismissed. Your page has not changed.'
   }
  })
 })

 undo.addEventListener('click', () => {
  if (!lastBatch) return
  run(lastBatch.undone ? 'Redoing accepted changes…' : 'Undoing accepted changes…', async () => {
   const result = await post('/api/pane/ai/undo', {id: lastBatch.id, base: lastBatch.base})
   completed(result, {id: lastBatch.id, undone: !lastBatch.undone}, lastBatch.undone ? 'Accepted changes restored in a private draft.' : 'Accepted changes undone in a private draft.')
  })
 })

 try {
  const stored = sessionStorage.getItem(storageKey)
  if (stored) {
   const value = JSON.parse(stored)
   if (typeof value.id === 'string' && typeof value.base === 'string' && typeof value.undone === 'boolean') lastBatch = value
  }
 } catch {
  status.textContent = 'This browser could not load the last Undo action. Use revision history to review earlier changes.'
 }
 mode.addEventListener('change', updateFields)
 updateFields()
 updateHistory()
 lock(false)
}
