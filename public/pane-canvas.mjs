import {effectiveSection,inheritedSectionFields} from './pane-section-styles.mjs'
import {canvasBody} from './pane-canvas-body.mjs'
import {safeBodyHref} from './pane-body-links.mjs'
import {galleryEditor} from './pane-gallery-editor.mjs'
import {syncReadingOrder} from './pane-reading-order.mjs'
import {readImage,prepareImage} from './pane-image.mjs'
import {richText,richMarkup} from './pane-rich.mjs'
import {layoutRules,layoutMarkup} from './pane-layout.mjs'
const editor=document.querySelector('[data-layout-editor]'),form=editor.querySelector('form'),field=form.querySelector('[data-layout-state]'),canvas=editor.querySelector('[data-layout-canvas]'),content=canvas.querySelector('.public-content')
let sections=JSON.parse(field.value),sectionId=sections[0].id,blockId,dragged,selection
const sectionFields=['anchor','kind','ratio','gap','paddingTop','paddingBottom','height','background'],numeric=['gap','paddingTop','paddingBottom','column','span','row','order']
const siteStyles=JSON.parse(form.querySelector('[data-site-styles]').value)
const current=()=>sections.find(section=>section.id===sectionId)??sections[0]
const block=()=>current().blocks.find(block=>block.id===blockId)
const device=form.querySelector('[data-layout-device]')
const isPhone=()=>device.value==='390'
const mobileSectionFields=['gap','paddingTop','paddingBottom','height']
const mobileBlockFields=['column','span','row','order','align','vertical']
function arrangeSection(section){section.phone={gap:section.gap,paddingTop:section.paddingTop,paddingBottom:section.paddingBottom,height:section.height??'auto',...section.phone}}
const mobileBlock=(section,item)=>({column:1,span:12,row:section.blocks.indexOf(item)+1,order:item.order,align:item.align,vertical:item.vertical,...item.phone})
const identity=()=>crypto.randomUUID()
const newBlock=()=>({id:identity(),kind:'text',text:'New text',column:1,span:12,row:1,order:0,align:'left',vertical:'start'})
function selectedParagraph(node){
 const range=selection&&node?.contains(selection.commonAncestorContainer)?selection:null
 const anchor=range?.startContainer,element=anchor?.nodeType===1?anchor:anchor?.parentElement
 const paragraph=element?.closest('p,h1,h2,h3,h4,blockquote,pre,li')
 return paragraph&&paragraph!==node&&node.contains(paragraph)?paragraph:null
}
let galleries,bodyControls
function settings(){
 galleries?.refresh();bodyControls?.refresh()
 const sectionPicker=form.querySelector('[data-layout-section]');sectionPicker.replaceChildren(...sections.map((section,index)=>new Option('Section '+(index+1),section.id)));sectionPicker.value=sectionId;sectionPicker.disabled=!block()
 const image=block()?.image,panel=form.querySelector('[data-image-settings]');panel.hidden=!image
 if(image){form.querySelector('[data-image-alt]').value=image.alt??'';form.querySelector('[data-image-decorative]').checked=image.decorative;form.querySelector('[data-image-alt]').disabled=image.decorative;form.querySelector('[data-image-status]').textContent=!image.decorative&&!image.alt?.trim()?'Add alternative text or mark this image decorative before publishing.':'Image description is ready.'}
 if(image){form.querySelector('[data-image-rotation]').value=image.rotation??0;const crop=image.crop??{ratio:'original',width:4,height:3,x:50,y:50};for(const input of form.querySelectorAll('[data-image-crop]')){const key=input.dataset.imageCrop;input.value=crop[key];input.disabled=['width','height'].includes(key)&&crop.ratio!=='free'}}
 for(const node of canvas.querySelectorAll('[data-selected]'))node.removeAttribute('data-selected')
 canvas.querySelector(blockId?`[data-block="${blockId}"]`:`[data-section="${sectionId}"]`)?.setAttribute('data-selected','')
 for(const input of form.querySelectorAll('[data-layout-field]')){
  const key=input.dataset.layoutField,target=key==='hidden'?(block()??current()):sectionFields.includes(key)?current():block()
  const phoneKey=key==='hidden'||(sectionFields.includes(key)?mobileSectionFields:mobileBlockFields).includes(key)
  input.disabled=!target||(key==='format'&&target?.kind!=='text')||(key==='hidden'&&!isPhone())||(isPhone()&&!phoneKey)
  const effective=target===current()?effectiveSection(target,siteStyles):target
  const value=isPhone()&&target&&phoneKey?(sectionFields.includes(key)?{...target,...target.phone}:key==='hidden'?{...target,...target.phone}:mobileBlock(current(),target))[key]:effective?.[key]
  if(key==='hidden')input.checked=!!(block()??current()).phone?.hidden;else input.value=(key==='align'&&block()?.format==='div'?selectedParagraph(canvas.querySelector(`[data-block="${blockId}"]`))?.dataset.textAlign:undefined)??value??({height:'auto',background:'',format:'p'}[key]??'')
 }
 for(const button of form.querySelectorAll('[data-text-command]'))button.disabled=!['text','quote'].includes(block()?.kind)
 for(const item of sections){const node=canvas.querySelector(`[data-section="${item.id}"]`);node?.toggleAttribute('data-phone-override',!!item.phone);for(const text of item.blocks)canvas.querySelector(`[data-block="${text.id}"]`)?.toggleAttribute('data-phone-override',!!text.phone)}
 form.querySelector('[data-device-status]').textContent=isPhone()?'Phone settings are independent. Outlined selections with a phone override keep their layout when desktop changes.':'Desktop and tablet use desktop settings. Phone overrides are preserved.'
 form.querySelector('[data-layout-selection]').textContent=((block()??current()).phone?'Phone override · ':'')+(blockId?(block()?.format==='div'?'Text block selected. Place the caret in a paragraph to align it independently.':'Text block selected. Edit text on the page or change its layout.'):'Section selected. Drag it or use Move earlier and Move later.')
}
function render(){
 const style=content.querySelector('style[data-pane-layout]'),sheet=style.sheet
 while(sheet.cssRules.length)sheet.deleteRule(0)
 for(const rule of layoutRules(sections,siteStyles))sheet.insertRule(rule,sheet.cssRules.length)
 for(const node of [...content.children])if(node!==style)node.remove()
 content.insertAdjacentHTML('beforeend',layoutMarkup(sections,undefined,galleries?.media()??JSON.parse(form.querySelector('[data-media-state]').value),{collections:JSON.parse(form.querySelector('[data-body-collections]').value)}))
 for(const section of content.querySelectorAll('[data-section]')){section.draggable=true;section.tabIndex=0;section.setAttribute('aria-label','Section '+(sections.findIndex(item=>item.id===section.dataset.section)+1))}
 for(const node of content.querySelectorAll('[data-image-block],[data-gallery],[data-video-block],[data-button-block],[data-quote-block]')){node.tabIndex=0;node.setAttribute('aria-label',node.hasAttribute('data-gallery')?'Gallery block':'Image block')}
 for(const node of content.querySelectorAll('[data-block]:not([data-catalog-block]):not([data-image-block]):not([data-gallery]):not([data-video-block]):not([data-button-block]):not([data-quote-block]),[data-block-text]')){node.contentEditable='true';node.draggable=true;node.setAttribute('role','textbox');node.setAttribute('aria-label','Block text');node.setAttribute('aria-multiline','true')}
 for(const node of content.querySelectorAll('[data-block]'))node.draggable=true
 for(const node of content.querySelectorAll('[data-catalog-block]')){node.tabIndex=0;node.removeAttribute('aria-hidden');node.setAttribute('aria-label',node.dataset.blockType+' block')}
 for(const button of content.querySelectorAll('[data-gallery-open]')){button.removeAttribute('data-gallery-open');button.dataset.tip='Select image';button.setAttribute('aria-label','Select '+button.getAttribute('aria-label').replace(/^Enlarge /,''))}
 syncReadingOrder(content);settings()
}
function commit(redraw=true){field.value=JSON.stringify(sections);field.dispatchEvent(new Event('input',{bubbles:true}));if(redraw)render()}
canvas.addEventListener('click',event=>{const section=event.target.closest('[data-section]');if(!section)return;sectionId=section.dataset.section;blockId=event.target.closest('[data-block]')?.dataset.block;const item=event.target.closest('[data-gallery-index]');if(item)galleries?.select(Number(item.dataset.galleryIndex));settings()})
canvas.addEventListener('focusin',event=>{const section=event.target.closest('[data-section]');if(!section)return;sectionId=section.dataset.section;blockId=event.target.closest('[data-block]')?.dataset.block;settings()})
// Word stores list markers in presentation spans rather than semantic lists.
// Convert only that explicit list structure, retaining one supported nested level.
function preparePasted(root){
 for(const parent of [root,...root.querySelectorAll('*')]){
  let top,nested,listId,type
  for(const node of [...parent.children]){
   const style=node.getAttribute('style')??'',match=/mso-list\s*:\s*(l\d+)\s+level(\d+)/i.exec(style)
   if(!match){top=nested=listId=type=undefined;continue}
   const marker=[...node.querySelectorAll('span')].find(span=>/mso-list\s*:\s*ignore/i.test(span.getAttribute('style')??''))
   const nextType=/^[\dA-Za-z]+[.)]/.test(marker?.textContent.trim()??'')?'ol':'ul'
   marker?.remove()
   if(!top||listId!==match[1]||Number(match[2])===1&&type!==nextType){top=document.createElement(nextType);node.before(top);listId=match[1];type=nextType;nested=undefined}
   const li=document.createElement('li');while(node.firstChild)li.append(node.firstChild)
   if(Number(match[2])>1){if(!top.lastElementChild)top.append(document.createElement('li'));if(!nested||nested.localName!==nextType){nested=document.createElement(nextType);top.lastElementChild.append(nested)}nested.append(li)}
   else{top.append(li);nested=undefined}
   node.remove()
  }
 }
}
// Only these semantic nodes cross the authoring boundary. Pasted scripts and
// active content are discarded, including their text; attributes never survive.
function readRich(root){
 const inline=new Set(['a','strong','em','u','s','br']),blocks=new Set(['p','p-large','p-small','h1','h2','h3','h4','blockquote','pre','ul','ol','li'])
 function read(node){
  if(node.nodeType===3)return [{tag:'text',text:node.textContent}]
  if(node.nodeType!==1)return []
  let tag=node.localName
  if(['script','style','iframe','object','embed','svg','math','img','video','audio','input'].includes(tag))return []
  if(tag==='p'){const heading=/\bMsoHeading([1-4])\b/i.exec(node.className);if(heading)tag='h'+heading[1];else if(/\bMsoQuote\b/i.test(node.className))tag='blockquote'}
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
  if(tag!=='a'){
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
  if(tag==='a'){const href=safeBodyHref(node.dataset.bodyHref??node.getAttribute('href'));return href?[{tag:'a',href,newTab:node.target==='_blank',children}]:children}
  const pastedAlign=/(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)(?:\s*;|\s*$)/i.exec(node.getAttribute('style')??'')?.[1]?.toLowerCase()
  const align=node.dataset?.textAlign??pastedAlign
  return inline.has(tag)||blocks.has(tag)?[{tag,children,...(['p','p-large','p-small','h1','h2','h3','h4','blockquote','pre','li'].includes(tag)&&['left','center','right','justify'].includes(align)?{align}:{})}]:children
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
 const target=sections.flatMap(section=>section.blocks).find(block=>block.id===(node.closest('[data-block]')?.dataset.block))
 if(!target||!['text','quote'].includes(target.kind))return
 node=node.querySelector('[data-block-text]')??node
 const content=readRich(node)
 target.content=content;target.text=richText(content)
 if(content.some(node=>['p','h1','h2','h3','h4','blockquote','pre','ul','ol'].includes(node.tag)))target.format='div'
 commit(false)
}
// Markdown edits use the same semantic tree and draft history as toolbar edits.
function endCaret(node){const range=document.createRange();range.selectNodeContents(node);range.collapse(false);const selection=getSelection();selection.removeAllRanges();selection.addRange(range)}
canvas.addEventListener('keydown',event=>{
 if(event.key!==' '||event.ctrlKey||event.metaKey||event.altKey)return
 let node=event.target.closest('[data-block]');if(!node||block()?.kind!=='text')return
 const marker=node.textContent,heading=/^(#{1,4})$/.exec(marker)
 if(!heading&&!['-','1.'].includes(marker))return
 event.preventDefault();node=documentBlock(node)
 node.innerHTML=heading?`<h${heading[1].length}><br></h${heading[1].length}>`:marker==='-'?'<ul><li><br></li></ul>':'<ol><li><br></li></ol>'
 endCaret(node.querySelector('h1,h2,h3,h4,li'));selection=getSelection().getRangeAt(0).cloneRange()
})
canvas.addEventListener('input',event=>{
 const node=event.target.closest('[data-block]');if(!node)return
 const selected=getSelection(),text=selected?.anchorNode,offset=selected?.anchorOffset
 if(block()?.kind==='text'&&text?.nodeType===3&&node.contains(text)&&!text.parentElement.closest('strong')){
  const match=/\*\*([^*\n]+)\*\*$/.exec(text.textContent.slice(0,offset))
  if(match){const range=document.createRange();range.setStart(text,offset-match[0].length);range.setEnd(text,offset);range.deleteContents();const strong=document.createElement('strong');strong.textContent=match[1];range.insertNode(strong);range.setStartAfter(strong);range.collapse(true);selected.removeAllRanges();selected.addRange(range)}
 }
 record(node)
})
canvas.addEventListener('paste',event=>{
 let node=event.target.closest('[data-block]');if(!node||!['text','quote'].includes(block()?.kind))return
 if(node.hasAttribute('data-quote-block')){event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));record(node);return}
 event.preventDefault()
 const html=event.clipboardData.getData('text/html')
 if(html){
  const pasted=document.createElement('template');pasted.innerHTML=html
  preparePasted(pasted.content);const safe=readRich(pasted.content);node=documentBlock(node)
  const markup=document.createElement('template');markup.innerHTML=richMarkup(safe)
  const selection=window.getSelection(),range=selection?.rangeCount?selection.getRangeAt(0):null
  if(range&&node.contains(range.commonAncestorContainer)){
   range.deleteContents();const last=markup.content.lastChild;range.insertNode(markup.content)
   if(last){range.setStartAfter(last);range.collapse(true);selection.removeAllRanges();selection.addRange(range)}
  }else node.append(markup.content)
 }
 else document.execCommand('insertText',false,event.clipboardData.getData('text/plain'))
 record(node)
 form.querySelector('[data-layout-selection]').textContent='Pasted text styles and safe links kept.'
})
// Pointer activation must not replace the selected text with a toolbar caret.
// Keyboard activation restores the same saved range after focusing its block.
form.addEventListener('pointerdown',event=>{
 if(event.target.closest('[data-text-command]'))event.preventDefault()
})
function rememberSelection(){
 const current=window.getSelection()
 if(!current?.rangeCount||!canvas.contains(current.getRangeAt(0).commonAncestorContainer))return
 selection=current.getRangeAt(0).cloneRange()
 const node=canvas.querySelector(`[data-block="${blockId}"]`),paragraph=selectedParagraph(node)
 if(paragraph&&!isPhone())form.querySelector('[data-layout-field="align"]').value=paragraph.dataset.textAlign??block()?.align??'left'
}
document.addEventListener('selectionchange',rememberSelection)
canvas.addEventListener('keyup',rememberSelection)
canvas.addEventListener('mouseup',rememberSelection)
form.addEventListener('click',event=>{
 const command=event.target.dataset.textCommand;if(!command||!block()||!['text','quote'].includes(block().kind))return
 let node=canvas.querySelector(`[data-block="${blockId}"]`);node=node.querySelector('[data-block-text]')??node
 const range=selection&&node.contains(selection.commonAncestorContainer)?selection.cloneRange():null
 node.focus()
 if(range){const current=window.getSelection();current.removeAllRanges();current.addRange(range)}
 if(block().kind==='quote'&&['insertUnorderedList','insertOrderedList','indent','outdent'].includes(command))return
 if(['insertUnorderedList','insertOrderedList','indent','outdent'].includes(command))node=documentBlock(node)
 document.execCommand(command,false)
 record(node)
 selection=window.getSelection()?.rangeCount?window.getSelection().getRangeAt(0).cloneRange():undefined
})
form.addEventListener('input',event=>{
 const key=event.target.dataset.layoutField;if(!key)return
 let target=key==='hidden'?(block()??current()):sectionFields.includes(key)?current():block();if(!target)return
 if(isPhone()){arrangeSection(current());if(key==='hidden'||sectionFields.includes(key)){target.phone??={};target=target.phone}else{target.phone=mobileBlock(current(),target);target=target.phone}}
 const value=event.target.value
 if(!event.target.checkValidity())return
 if(key==='align'&&!isPhone()&&target.format==='div'){
  const node=canvas.querySelector(`[data-block="${blockId}"]`),paragraph=selectedParagraph(node)
  if(paragraph){paragraph.dataset.textAlign=value;record(node);settings();return}
 }
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
 if(!isPhone()&&target===current()&&inheritedSectionFields.includes(key))target.defaults=(target.defaults??[]).filter(field=>field!==key)
 if(key==='format'&&target.kind==='text'&&value!=='blockquote')delete target.attribution
 if((key==='background'||key==='anchor')&&!value)delete target.background;else target[key]=key==='hidden'?event.target.checked:numeric.includes(key)?Number(value):value
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
 if(action==='add-section'){const added={id:identity(),defaults:[...inheritedSectionFields],kind:'text',ratio:'1:1',gap:24,paddingTop:32,paddingBottom:32,blocks:[newBlock()]};sections.push(added);sectionId=added.id;blockId=undefined}
 if(action==='add-block'){const added=newBlock();added.row=Math.max(...section.blocks.map(block=>block.row))+1;section.blocks.push(added);blockId=added.id}
 if(action==='duplicate'){const copy=structuredClone(selected??section);copy.id=identity();if(selected)copy.row=Math.max(...section.blocks.map(block=>block.row))+1;if(!selected)delete copy.anchor;if(!selected)copy.blocks=copy.blocks.map(block=>({...block,id:identity()}));items.splice(index+1,0,copy);if(selected)blockId=copy.id;else sectionId=copy.id}
 if(action==='delete'){if(items.length===1){form.querySelector('[data-layout-selection]').textContent='Keep at least one section and one text block.';return}items.splice(index,1);sectionId=sections[0].id;blockId=undefined}
 if(isPhone()&&(action==='up'||action==='down')){
  if(!selected){form.querySelector('[data-layout-selection]').textContent='Select a block to arrange its phone order.';return}
  arrangeSection(section);const sorted=[...section.blocks].sort((a,b)=>mobileBlock(section,a).row-mobileBlock(section,b).row),at=sorted.indexOf(selected),destination=Math.max(0,Math.min(sorted.length-1,at+(action==='up'?-1:1)))
  sorted.splice(at,1);sorted.splice(destination,0,selected);sorted.forEach((item,index)=>item.phone={...mobileBlock(section,item),row:index+1});commit();return
 }
 if(action==='up'||action==='down'){const destination=Math.max(0,Math.min(items.length-1,index+(action==='up'?-1:1)));items.splice(index,1);items.splice(destination,0,selected??section);if(selected)items.forEach((block,index)=>block.row=index+1)}
 if(action==='reset'&&isPhone()){delete (selected??section).phone;commit();return}
 if(action==='reset'&&selected?.image)delete selected.image.crop
 if(action==='reset'){if(selected)Object.assign(selected,{column:1,span:12,row:1,order:0,align:'left',vertical:'start'});else{Object.assign(section,{defaults:[...inheritedSectionFields],kind:'text',ratio:'1:1',gap:24,paddingTop:32,paddingBottom:32,height:'auto'});delete section.background}}
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
  arrangeSection(to);const sorted=[...to.blocks].sort((a,b)=>mobileBlock(to,a).row-mobileBlock(to,b).row),moved=sorted.find(item=>item.id===dragged.block),targetBlock=sorted.find(item=>item.id===next)
  if(moved===targetBlock)return
  sorted.splice(sorted.indexOf(moved),1);sorted.splice(sorted.indexOf(targetBlock),0,moved);sorted.forEach((item,index)=>item.phone={...mobileBlock(to,item),row:index+1});sectionId=to.id;blockId=moved.id;dragged=undefined;commit();return
 }
 if(dragged.block){if(from!==to&&from.blocks.length===1)return;const moved=from.blocks.find(block=>block.id===dragged.block),next=event.target.closest('[data-block]')?.dataset.block;if(next===moved.id)return;from.blocks.splice(from.blocks.indexOf(moved),1);const index=to.blocks.findIndex(block=>block.id===next);to.blocks.splice(index<0?to.blocks.length:index,0,moved);to.blocks.forEach((block,index)=>block.row=index+1);sectionId=to.id;blockId=moved.id}
 else{sections.splice(sections.indexOf(from),1);sections.splice(sections.indexOf(to),0,from);sectionId=from.id;blockId=undefined}
 dragged=undefined;commit()
})
form.querySelector('[data-layout-section]').addEventListener('change',event=>{
 const from=current(),item=block(),to=sections.find(section=>section.id===event.target.value)
 if(!item||!to||from===to)return
 if(from.blocks.length===1){form.querySelector('[data-layout-selection]').textContent='Keep at least one block in each section.';settings();return}
 from.blocks.splice(from.blocks.indexOf(item),1);item.row=Math.min(100,Math.max(...to.blocks.map(block=>block.row))+1);to.blocks.push(item);sectionId=to.id;commit()
})
form.addEventListener('draftrestore',()=>{sections=JSON.parse(field.value);if(!sections.some(section=>section.id===sectionId))sectionId=sections[0].id;if(!current().blocks.some(block=>block.id===blockId))blockId=undefined;render()})
form.querySelector('[data-image-upload]').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return
 try{const image=await readImage(file),added={...newBlock(),kind:'image',image,text:'',row:Math.max(...current().blocks.map(item=>item.row))+1};current().blocks.push(added);blockId=added.id;commit()}
 catch(error){form.querySelector('[data-layout-selection]').textContent=error.message}
 event.target.value=''
})
for(const input of form.querySelectorAll('[data-image-crop]'))input.addEventListener('input',()=>{
 const image=block()?.image;if(!image||!input.checkValidity())return
 image.crop??={ratio:'original',width:4,height:3,x:50,y:50}
 image.crop[input.dataset.imageCrop]=input.dataset.imageCrop==='ratio'?input.value:Number(input.value)
 commit()
})
let preparingImage=false
async function rotateImage(rotation,reset=false){
 const selected=block(),image=selected?.image;if(!image||preparingImage)return
 preparingImage=true
 form.querySelector('[data-save-status]').textContent='Preparing image…'
 const before=field.value
 try{
  const prepared=await prepareImage(image.original??image.src,rotation)
  if(field.value!==before){settings();return}
  Object.assign(image,{original:image.original??prepared.original,src:prepared.src,renditions:prepared.renditions,width:prepared.width,height:prepared.height,rotation})
  if(reset)delete image.crop
  commit()
 }catch(error){form.querySelector('[data-image-status]').textContent=error.message}
 finally{preparingImage=false}
}
form.querySelector('[data-image-rotation]').addEventListener('change',event=>rotateImage(Number(event.target.value)))
form.querySelector('[data-image-reset]').addEventListener('click',()=>rotateImage(0,true))
for(const input of form.querySelectorAll('[data-image-alt],[data-image-decorative]'))input.addEventListener('input',()=>{
 const selected=block();if(!selected?.image)return
 const image=selected.image
 image.decorative=form.querySelector('[data-image-decorative]').checked
 image.alt=image.decorative?'':form.querySelector('[data-image-alt]').value
 selected.text=image.alt;commit()
})
device.addEventListener('change',()=>{const sheet=document.querySelector('style[data-pane-layout]').sheet;while(sheet.cssRules.length)sheet.deleteRule(0);if(device.value!=='fit')sheet.insertRule(`[data-layout-canvas]{width:${Number(device.value)}px}`,0);syncReadingOrder(content);settings()})
// Active links belong to the live page; the editing surface keeps selection local.
canvas.addEventListener('click',event=>{if(event.target.closest('a'))event.preventDefault()})
bodyControls=canvasBody(form,{block,section:current,newBlock,commit,select:id=>{blockId=id},record,textSelection:()=>{
 if(!['text','quote'].includes(block()?.kind))return null
 let node=canvas.querySelector(`[data-block="${blockId}"]`);node=node.querySelector('[data-block-text]')??node
 if(!selection||!node.contains(selection.commonAncestorContainer))return null
 node.focus();const current=window.getSelection();current.removeAllRanges();current.addRange(selection.cloneRange());return node
}})
galleries=galleryEditor(form,{block,section:current,newBlock,commit:id=>{if(id)blockId=id;commit()}})
render()
