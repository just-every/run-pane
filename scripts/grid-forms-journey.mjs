import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'

export async function gridFormsJourney({page,live,owner,visitor,origin,data,call,capture,form,publish}){
 const saved=async()=>page.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.')
 await page.goto(origin+'/app/canvas?page=home');await page.getByText('Links and body blocks',{exact:true}).click();await page.getByLabel('Saved form',{exact:true}).selectOption(form.id);await page.getByRole('button',{name:'Add form',exact:true}).click();await saved()
 await page.locator('[data-block-type="form"]').focus();await page.getByRole('button',{name:'Duplicate selection',exact:true}).click();await saved();assert.equal(await page.locator('[data-block-type="form"]').count(),2)
 const current=(await data()).draft,site=structuredClone(current.site);site.forms.push({...form,id:'synthetic-pane-unplaced-form',name:'Private unplaced form'});await call('/api/pane/prepare',{site,base:current.id});await publish()
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await live.setViewportSize({width,height:1000});await page.goto(origin+'/app/canvas?page=home');await page.getByText('Links and body blocks',{exact:true}).click();await capture(page,'grid-form-editor',width)
  await live.goto(origin+'/site');const blocks=live.locator('[data-block-type="form"]');assert.equal(await blocks.count(),2)
  const identities=await live.locator('[id]').evaluateAll(nodes=>nodes.map(node=>node.id));assert.equal(new Set(identities).size,identities.length,'Duplicated form blocks keep unique field identities')
  const first=blocks.first(),second=blocks.last();await first.getByLabel('Your name (required)',{exact:true}).fill('Workshop visitor');await first.getByLabel('Email address (required)',{exact:true}).fill('invalid-email');await first.getByRole('button',{name:'Request quote',exact:true}).click();await first.getByText('Enter a valid email address.',{exact:true}).waitFor();assert.equal(await first.getByLabel('Your name (required)',{exact:true}).inputValue(),'Workshop visitor');assert.equal(await second.locator('[aria-invalid="true"]').count(),0,'Only the submitted form instance displays errors')
  await capture(live,'grid-form-errors',width)
  await first.getByLabel('Email address (required)',{exact:true}).fill('synthetic-pane-81@example.test');await first.getByLabel('US phone (required)',{exact:true}).fill('312 555 0123');await first.getByLabel('Project details (required)',{exact:true}).fill('Please repair the workshop chair.');await first.getByRole('button',{name:'Request quote',exact:true}).click();await live.waitForURL(url=>url.searchParams.has('sent'));await live.getByRole('status').filter({hasText:'Your workshop request has arrived.'}).waitFor();await capture(live,'grid-form-confirmation',width)
  assert.ok((await data()).messages.some(item=>item.email==='synthetic-pane-81@example.test'&&item.message.includes('Please repair the workshop chair.')),'A real grid form delivers to the native private inbox')
  const before=(await data()).messages.length,forged=await visitor.request.post(origin+'/site',{headers:{Origin:origin},multipart:{idempotency:crypto.randomUUID(),_pane_form:'synthetic-pane-unplaced-form',name:'Unplaced attempt',email:'synthetic-pane-82@example.test',phone:'3125550123',message:'Unplaced form must not accept.'}});assert.equal(forged.status(),400);assert.equal((await data()).messages.length,before,'An unplaced saved form grants no submission authority')
  await live.goto(origin+'/site');await live.evaluate(await readFile(resolve('node_modules/axe-core/axe.min.js'),'utf8'));assert.deepEqual((await live.evaluate(()=>axe.run(document))).violations.map(item=>item.id),[],'Grid form accessibility');await capture(live,'grid-form-live',width)
 }
 console.log('Grid form placement, duplication, instance errors, native inbox delivery and unplaced-form refusal passed at 1440 and 390.')
}
