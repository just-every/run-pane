import {richText,richMarkup} from './pane-rich.mjs'
import {layoutRules,layoutMarkup} from './pane-layout.mjs'
const editor=document.querySelector('[data-layout-editor]'),form=editor.querySelector('form'),field=form.querySelector('[data-layout-state]'),canvas=editor.querySelector('[data-layout-canvas]'),content=canvas.querySelector('.public-content')
let sections=JSON.parse(field.value),sectionId=sections[0].id,blockId,dragged
const sectionFields=['kind','ratio','gap','paddingTop','paddingBottom','height','background'],numeric=['gap','paddingTop','paddingBottom','column','span','row','order']
const current=()=>sections.find(section=>section.id===sectionId)??sections[0]
const block=()=>current().blocks.find(block=>block.id===blockId)
const device=form.querySelector('[data-layout-device]')
const isPhone=()=>device.value==='390'
const mobileSectionFields=['paddingTop','paddingBottom','height']
const mobileBlockFields=['column','span','row','order','align','vertical']
const mobileBlock=(section,item)=>({column:1,span:12,row:section.blocks.indexOf(item)+1,order:item.order,align:item.align,vertical:item.vertical,...item.phone})
const identity=()=>crypto.randomUUID()
const newBlock=()=>({id:identity(),kind:'text',text:'New text',column:1,span:12,row:1,order:0,align:'left',vertical:'start'})
function settings(){
 for(const node of canvas.querySelectorAll('[data-selected]'))node.removeAttribute('data-selected')
 canvas.querySelector(blockId?`[data-block="${blockId}"]`:`[data-section="${sectionId}"]`)?.setAttribute('data-selected','')
 for(const input of form.querySelectorAll('[data-layout-field]')){
  const key=input.dataset.layoutField,target=key==='hidden'?(block()??current()):sectionFields.includes(key)?current():block()
  const phoneKey=key==='hidden'||(sectionFields.includes(key)?mobileSectionFields:mobileBlockFields).includes(key)
  input.disabled=!target||(key==='hidden'&&!isPhone())||(isPhone()&&!phoneKey)
  const value=isPhone()&&target&&phoneKey?(sectionFields.includes(key)?{...target,...target.phone}:key==='hidden'?{...target,...target.phone}:mobileBlock(current(),target))[key]:target?.[key]
  if(key==='hidden')input.checked=!!(block()??current()).phone?.hidden;else input.value=value??({height:'auto',background:'',format:'p'}[key]??'')
 }
 for(const item of sections){const node=canvas.querySelector(`[data-section="${item.id}"]`);node?.toggleAttribute('data-phone-override',!!item.phone);for(const text of item.blocks)canvas.querySelector(`[data-block="${text.id}"]`)?.toggleAttribute('data-phone-override',!!text.phone)}
 form.querySelector('[data-device-status]').textContent=isPhone()?'Phone settings are independent. Outlined selections with a phone override keep their layout when desktop changes.':'Desktop and tablet use desktop settings. Phone overrides are preserved.'
 form.querySelector('[data-layout-selection]').textContent=((block()??current()).phone?'Phone override · ':'')+(blockId?'Text block selected. Edit text on the page or change its layout.':'Section selected. Drag it or use Move earlier and Move later.')
}
function render(){
 const style=content.querySelector('style[data-pane-layout]'),sheet=style.sheet
 while(sheet.cssRules.length)sheet.deleteRule(0)
 for(const rule of layoutRules(sections))sheet.insertRule(rule,sheet.cssRules.length)
 for(const node of [...content.children])if(node!==style)node.remove()
 content.insertAdjacentHTML('beforeend',layoutMarkup(sections))
 for(const section of content.querySelectorAll('[data-section]')){section.draggable=true;section.tabIndex=0;section.setAttribute('aria-label','Section '+(sections.findIndex(item=>item.id===section.dataset.section)+1))}
 for(const node of content.querySelectorAll('[data-block]')){node.contentEditable='true';node.draggable=true;node.setAttribute('role','textbox');node.setAttribute('aria-label','Block text');node.setAttribute('aria-multiline','true')}
 settings()
}
function commit(redraw=true){field.value=JSON.stringify(sections);field.dispatchEvent(new Event('input',{bubbles:true}));if(redraw)render()}
canvas.addEventListener('click',event=>{const section=event.target.closest('[data-section]');if(!section)return;sectionId=section.dataset.section;blockId=event.target.closest('[data-block]')?.dataset.block;settings()})
canvas.addEventListener('focusin',event=>{const section=event.target.closest('[data-section]');if(!section)return;sectionId=section.dataset.section;blockId=event.target.closest('[data-block]')?.dataset.block;settings()})
// Only these semantic nodes cross the authoring boundary. Pasted scripts and
// active content are discarded, including their text; attributes never survive.
function readRich(root){
 const inline=new Set(['strong','em','u','s','br']),blocks=new Set(['p','p-large','p-small','h1','h2','h3','h4','blockquote','pre','ul','ol','li'])
 function read(node){
  if(node.nodeType===3)return [{tag:'text',text:node.textContent}]
  if(node.nodeType!==1)return []
  let tag=node.localName
  if(['script','style','iframe','object','embed','svg','math','img','video','audio','input'].includes(tag))return []
  tag=({b:'strong',i:'em',strike:'s',div:'p'}[tag]??tag)
  if(tag==='p'&&node.classList.contains('pane-p-large'))tag='p-large'
  if(tag==='p'&&node.classList.contains('pane-p-small'))tag='p-small'
  let children=[...node.childNodes].flatMap(read)
  if(tag==='ul'||tag==='ol'){
   const items=[]
   for(const child of children){
    if(child.tag==='li')items.push(child)
    else if(child.tag==='ul'||child.tag==='ol'){
     if(!items.length)items.push({tag:'li',children:[]})
     items.at(-1).children.push(child)
    }else if(child.tag!=='text'||child.text.trim())items.push({tag:'li',children:[child]})
   }
   children=items
  }
  if(tag==='li')children=children.flatMap(child=>['p','h1','h2','h3','h4','blockquote','pre'].includes(child.tag)?child.children:[child])
  if(tag==='span'){
   // CSP correctly prevents pasted inline CSS from taking effect. Read only
   // these literal formatting declarations, then discard every attribute.
   const styles=Object.fromEntries((node.getAttribute('style')??'').split(';').map(item=>{const at=item.indexOf(':');return [item.slice(0,at).trim().toLowerCase(),item.slice(at+1).trim().toLowerCase()]}))
   if(/^(bold|[6-9]00)$/.test(styles['font-weight']??''))children=[{tag:'strong',children}]
   if(styles['font-style']==='italic')children=[{tag:'em',children}]
   const decoration=styles['text-decoration']??styles['text-decoration-line']??''
   if(decoration.includes('underline'))children=[{tag:'u',children}]
   if(decoration.includes('line-through'))children=[{tag:'s',children}]
  }
  // Browsers can wrap a newly inserted list inside the current heading.
  // Lift block children out of inline-only containers into semantic siblings.
  if(tag!=='li'&&tag!=='ul'&&tag!=='ol'&&children.some(child=>blocks.has(child.tag))){
   return children.flatMap(child=>blocks.has(child.tag)?[child]:inline.has(tag)||blocks.has(tag)?[{tag,children:[child]}]:[child])
  }
  return inline.has(tag)||blocks.has(tag)?[{tag,children}]:children
 }
 return [...root.childNodes].flatMap(read)
}
function documentBlock(node){
 if(node.localName==='div')return node
 const selection=window.getSelection(),range=selection?.rangeCount?selection.getRangeAt(0):null
 const saved=range?{start:range.startContainer,startOffset:range.startOffset,end:range.endContainer,endOffset:range.endOffset}:null
 const replacement=document.createElement('div')
 for(const attribute of node.attributes)replacement.setAttribute(attribute.name,attribute.value)
 node.replaceWith(replacement);while(node.firstChild)replacement.append(node.firstChild)
 if(saved){const restored=document.createRange();restored.setStart(saved.start===node?replacement:saved.start,saved.startOffset);restored.setEnd(saved.end===node?replacement:saved.end,saved.endOffset);selection.removeAllRanges();selection.addRange(restored)}
 sections.flatMap(section=>section.blocks).find(block=>block.id===node.dataset.block).format='div'
 return replacement
}
function record(node){
 const target=sections.flatMap(section=>section.blocks).find(block=>block.id===node.dataset.block)
 const content=readRich(node)
 target.content=content;target.text=richText(content)
 if(content.some(node=>['p','h1','h2','h3','h4','blockquote','pre','ul','ol'].includes(node.tag)))target.format='div'
 commit(false)
}
canvas.addEventListener('input',event=>{const node=event.target.closest('[data-block]');if(node)record(node)})
canvas.addEventListener('paste',event=>{
 let node=event.target.closest('[data-block]');if(!node)return
 event.preventDefault()
 const html=event.clipboardData.getData('text/html')
 if(html){
  const pasted=document.createElement('template');pasted.innerHTML=html
  const safe=readRich(pasted.content);node=documentBlock(node)
  const markup=document.createElement('template');markup.innerHTML=richMarkup(safe)
  const selection=window.getSelection(),range=selection?.rangeCount?selection.getRangeAt(0):null
  if(range&&node.contains(range.commonAncestorContainer)){
   range.deleteContents();const last=markup.content.lastChild;range.insertNode(markup.content)
   if(last){range.setStartAfter(last);range.collapse(true);selection.removeAllRanges();selection.addRange(range)}
  }else node.append(markup.content)
 }
 else document.execCommand('insertText',false,event.clipboardData.getData('text/plain'))
 record(node)
 form.querySelector('[data-layout-selection]').textContent='Pasted text styles kept. Links and media are not supported yet.'
})
let selection
document.addEventListener('selectionchange',()=>{const current=window.getSelection();if(current?.rangeCount&&canvas.contains(current.getRangeAt(0).commonAncestorContainer))selection=current.getRangeAt(0).cloneRange()})
canvas.addEventListener('keyup',()=>{selection=window.getSelection()?.rangeCount?window.getSelection().getRangeAt(0).cloneRange():undefined})
canvas.addEventListener('mouseup',()=>{selection=window.getSelection()?.rangeCount?window.getSelection().getRangeAt(0).cloneRange():undefined})
form.addEventListener('click',event=>{
 const command=event.target.dataset.textCommand;if(!command||!block())return
 let node=canvas.querySelector(`[data-block="${blockId}"]`);node.focus()
 if(selection&&node.contains(selection.commonAncestorContainer)){const current=window.getSelection();current.removeAllRanges();current.addRange(selection)}
 if(['insertUnorderedList','insertOrderedList','indent','outdent'].includes(command))node=documentBlock(node)
 document.execCommand(command,false)
 record(node)
 selection=window.getSelection()?.rangeCount?window.getSelection().getRangeAt(0).cloneRange():undefined
})
form.addEventListener('input',event=>{
 const key=event.target.dataset.layoutField;if(!key)return
 let target=key==='hidden'?(block()??current()):sectionFields.includes(key)?current():block();if(!target)return
 if(isPhone()){if(key==='hidden'||sectionFields.includes(key)){target.phone??={};target=target.phone}else{target.phone=mobileBlock(current(),target);target=target.phone}}
 const value=event.target.value
 if(!event.target.checkValidity())return
 if(key==='format'&&target.format==='div'&&target.content){
  if(value==='div')return
  const node=canvas.querySelector(`[data-block="${blockId}"]`);node.focus()
  if(selection&&node.contains(selection.commonAncestorContainer)){const current=window.getSelection();current.removeAllRanges();current.addRange(selection)}
  document.execCommand('formatBlock',false,['p-large','p-small'].includes(value)?'p':value)
  if(['p-large','p-small'].includes(value)){
   const selected=window.getSelection()?.anchorNode,paragraph=(selected?.nodeType===1?selected:selected?.parentElement)?.closest('p')
   if(paragraph&&node.contains(paragraph))paragraph.className='pane-'+value
  }
  record(node);render();return
 }
 if(key==='background'&&!value)delete target.background;else target[key]=key==='hidden'?event.target.checked:numeric.includes(key)?Number(value):value
 if(key==='column')target.span=Math.min(target.span,13-target.column)
 if(key==='span')target.column=Math.min(target.column,13-target.span)
 if(key==='ratio'&&current().kind==='columns'){
  const spans={'1:1':[6,6],'1:2':[4,8],'2:1':[8,4],'1:1:1':[4,4,4]}[value]
  current().blocks.forEach((block,index)=>{const slot=index%spans.length;block.column=1+spans.slice(0,slot).reduce((a,b)=>a+b,0);block.span=spans[slot];block.row=1+Math.floor(index/spans.length)})
 }
 commit()
})
form.addEventListener('click',event=>{
 const action=event.target.dataset.layoutAction;if(!action)return
 let section=current(),selected=block(),items=selected?section.blocks:sections,index=items.indexOf(selected??section)
 if(action==='add-section'){const added={id:identity(),kind:'text',ratio:'1:1',gap:24,paddingTop:32,paddingBottom:32,blocks:[newBlock()]};sections.push(added);sectionId=added.id;blockId=undefined}
 if(action==='add-block'){const added=newBlock();added.row=Math.max(...section.blocks.map(block=>block.row))+1;section.blocks.push(added);blockId=added.id}
 if(action==='duplicate'){const copy=structuredClone(selected??section);copy.id=identity();if(selected)copy.row=Math.max(...section.blocks.map(block=>block.row))+1;if(!selected)copy.blocks=copy.blocks.map(block=>({...block,id:identity()}));items.splice(index+1,0,copy);if(selected)blockId=copy.id;else sectionId=copy.id}
 if(action==='delete'){if(items.length===1){form.querySelector('[data-layout-selection]').textContent='Keep at least one section and one text block.';return}items.splice(index,1);sectionId=sections[0].id;blockId=undefined}
 if(isPhone()&&(action==='up'||action==='down')){
  if(!selected){form.querySelector('[data-layout-selection]').textContent='Select a block to arrange its phone order.';return}
  const sorted=[...section.blocks].sort((a,b)=>mobileBlock(section,a).row-mobileBlock(section,b).row),at=sorted.indexOf(selected),destination=Math.max(0,Math.min(sorted.length-1,at+(action==='up'?-1:1)))
  sorted.splice(at,1);sorted.splice(destination,0,selected);sorted.forEach((item,index)=>item.phone={...mobileBlock(section,item),row:index+1});commit();return
 }
 if(action==='up'||action==='down'){const destination=Math.max(0,Math.min(items.length-1,index+(action==='up'?-1:1)));items.splice(index,1);items.splice(destination,0,selected??section);if(selected)items.forEach((block,index)=>block.row=index+1)}
 if(action==='reset'&&isPhone()){delete (selected??section).phone;commit();return}
 if(action==='reset'){if(selected)Object.assign(selected,{column:1,span:12,row:1,order:0,align:'left',vertical:'start'});else{Object.assign(section,{kind:'text',ratio:'1:1',gap:24,paddingTop:32,paddingBottom:32,height:'auto'});delete section.background}}
 commit()
})
canvas.addEventListener('dragstart',event=>{const section=event.target.closest('[data-section]');if(!section)return;dragged={section:section.dataset.section,block:event.target.closest('[data-block]')?.dataset.block};event.dataTransfer.setData('text/plain',JSON.stringify(dragged));event.stopPropagation()})
canvas.addEventListener('dragover',event=>{if(event.target.closest('[data-section]'))event.preventDefault()})
canvas.addEventListener('drop',event=>{
 event.preventDefault();const target=event.target.closest('[data-section]');if(!target||!dragged)return
 const from=sections.find(section=>section.id===dragged.section),to=sections.find(section=>section.id===target.dataset.section)
 if(isPhone()){
  const next=event.target.closest('[data-block]')?.dataset.block
  if(!dragged.block||from!==to||!next)return
  const sorted=[...to.blocks].sort((a,b)=>mobileBlock(to,a).row-mobileBlock(to,b).row),moved=sorted.find(item=>item.id===dragged.block),targetBlock=sorted.find(item=>item.id===next)
  if(moved===targetBlock)return
  sorted.splice(sorted.indexOf(moved),1);sorted.splice(sorted.indexOf(targetBlock),0,moved);sorted.forEach((item,index)=>item.phone={...mobileBlock(to,item),row:index+1});sectionId=to.id;blockId=moved.id;dragged=undefined;commit();return
 }
 if(dragged.block){if(from!==to&&from.blocks.length===1)return;const moved=from.blocks.find(block=>block.id===dragged.block),next=event.target.closest('[data-block]')?.dataset.block;if(next===moved.id)return;from.blocks.splice(from.blocks.indexOf(moved),1);const index=to.blocks.findIndex(block=>block.id===next);to.blocks.splice(index<0?to.blocks.length:index,0,moved);to.blocks.forEach((block,index)=>block.row=index+1);sectionId=to.id;blockId=moved.id}
 else{sections.splice(sections.indexOf(from),1);sections.splice(sections.indexOf(to),0,from);sectionId=from.id;blockId=undefined}
 dragged=undefined;commit()
})
form.addEventListener('draftrestore',()=>{sections=JSON.parse(field.value);if(!sections.some(section=>section.id===sectionId))sectionId=sections[0].id;if(!current().blocks.some(block=>block.id===blockId))blockId=undefined;render()})
device.addEventListener('change',()=>{const sheet=document.querySelector('[data-canvas-device-style]').sheet;while(sheet.cssRules.length)sheet.deleteRule(0);if(device.value!=='fit')sheet.insertRule(`[data-layout-canvas]{width:${Number(device.value)}px}`,0);settings()})
// Active links belong to the live page; the editing surface keeps selection local.
canvas.addEventListener('click',event=>{if(event.target.closest('a'))event.preventDefault()})
render()
