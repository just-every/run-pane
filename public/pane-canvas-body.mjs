import {canvasConnections} from './pane-canvas-connections.mjs'
import {normalizeBodyLink} from './pane-body-links.mjs'
export function canvasBody(form,{block,section,newBlock,commit,select,textSelection,record}){
 const input=name=>form.querySelector(`[data-body-${name}]`),status=input('status')
 const destination=()=>normalizeBodyLink({href:input('href').value,newTab:input('new-tab').checked})
 const add=item=>{item.row=Math.max(...section().blocks.map(block=>block.row))+1;section().blocks.push(item);select(item.id);commit()}
 const connections=canvasConnections(form,{block,add:value=>add({...newBlock(),...value}),commit})
 function listFields(){
  const collection=JSON.parse(input('collections').value).find(collection=>collection.id===input('list-collection').value)
  const fields=(collection?.fields??[]).filter(field=>['text','number','price','date','option'].includes(field.type))
  for(const name of ['list-sort','list-filter']){const select=input(name);select.replaceChildren(new Option(name==='list-sort'?'Title':'All items',name==='list-sort'?'title':''),...fields.map(field=>new Option(field.label,field.id)))}
 }
 input('list-collection').addEventListener('change',listFields)
 function refresh(){
  connections.refresh()
  const item=block(),link=item?.link
  if(['line','spacer','accordion','chart','shape','scrolling-text','social-links','search','form','summary','collection-list','html'].includes(item?.kind)){input('native-kind').value=item.kind;input('native-summary').value=item.summary??'';input('native-text').value=item.text;input('native-size').value=item.size??32;if(item.chart){input('chart-type').value=item.chart.type;input('chart-rows').value=item.chart.rows.map(row=>row.join(' | ')).join('\n')}if(item.shape){input('shape-form').value=item.shape.form;input('shape-color').value=item.shape.color;input('shape-outline').checked=item.shape.outlined}}
  if(item?.listing){input('list-collection').value=item.listing.collection;listFields();input('list-layout').value=item.listing.layout;input('list-limit').value=item.listing.limit;input('list-sort').value=item.listing.sort;input('list-descending').checked=item.listing.descending;input('list-filter').value=item.listing.filter?.field??'';input('list-value').value=item.listing.filter?.value??''}
  input('caption').value=item?.caption??''
  input('attribution').disabled=!(item?.kind==='quote'||item?.format==='blockquote')
  input('attribution').value=item?.attribution??''
  if(item?.kind==='button'){input('button-label').value=item.text;input('button-style').value=item.buttonStyle??'primary'}
  if(item?.kind==='audio'){input('audio-title').value=item.text;input('audio-file').value=item.audio.file??'';input('audio-url').value=item.embed?.url??'';input('audio-download').checked=item.audio.download}
  if(link){input('href').value=link.href;input('new-tab').checked=link.newTab}
  if(['video','map','social-post'].includes(item?.kind)){input('embed-kind').value=item.kind}
  if(item?.embed){input('video-title').value=item.embed.title;input('video-url').value=item.embed.url}
 }
 input('audio-upload').addEventListener('change',async()=>{
  const file=input('audio-upload').files[0];if(!file)return
  try{if(form.hasAttribute('data-post-editor')||form.hasAttribute('data-collection-editor'))throw Error('Upload audio in the owner page library first.')
   if(form.querySelector('[data-save-status]')?.textContent!=='Draft saved. Not published.')throw Error('Wait for the current draft to save before uploading.')
   const data=new FormData();data.set('base',form.elements.base.value);data.set('file',file)
   const response=await fetch('/api/pane/library/upload',{method:'POST',body:data}),result=await response.json();if(!response.ok)throw Error(result.error??'Audio upload failed.')
   location.reload()
  }catch(error){status.textContent=error.message}
 })
 input('reference').addEventListener('change',event=>{if(event.target.value)input('href').value=event.target.value})
 for(const field of ['caption','attribution'])input(field).addEventListener('input',()=>{
  const item=block();if(!item||field==='caption'&&item.kind!=='image'||field==='attribution'&&item.kind!=='quote'&&item.format!=='blockquote')return
  if(field==='attribution'&&item.kind==='text'){item.kind='quote';delete item.format}
  item[field]=input(field).value;commit()
 })
 form.addEventListener('pointerdown',event=>{if(['link','unlink'].includes(event.target.dataset.bodyAction))event.preventDefault()})
 form.addEventListener('click',event=>{
  const action=event.target.dataset.bodyAction;if(!action)return
  try{
   const item=block()
   if(action==='button'||action==='update-button'){
    const text=input('button-label').value.trim();if(!text)throw Error('Enter a button label.')
    const link=destination(),buttonStyle=input('button-style').value
    if(action==='button')add({...newBlock(),kind:'button',text,link,buttonStyle})
    else{if(item?.kind!=='button')throw Error('Select a button first.');item.text=text;item.link=link;item.buttonStyle=buttonStyle;commit()}
   }
   if(action==='native'||action==='update-native'){
    const kind=input('native-kind').value,text=['line','spacer'].includes(kind)?'':kind==='social-links'?'Social links':input('native-text').value.trim(),summary=input('native-summary').value.trim(),size=Number(input('native-size').value)
    if(kind==='accordion'&&(!summary||!text))throw Error('Enter an accordion title and text.')
    if(kind==='spacer'&&(!Number.isInteger(size)||size<8||size>240))throw Error('Choose a spacer height from 8 to 240 pixels.')
    if(!['line','spacer'].includes(kind)&&!text)throw Error('Enter block text or a chart title.')
    const chart=kind==='chart'?{type:input('chart-type').value,rows:input('chart-rows').value.split(/\r?\n/).filter(line=>line.trim()).map(line=>{const parts=line.split('|');if(parts.length!==2||!parts[0].trim()||!parts[1].trim()||!Number.isFinite(Number(parts[1])))throw Error('Enter one label and numeric value per chart row.');return [parts[0].trim(),Number(parts[1])]})}:undefined
    const shape=kind==='shape'?{form:input('shape-form').value,color:input('shape-color').value,outlined:input('shape-outline').checked}:undefined
    const listing=['summary','collection-list'].includes(kind)?{collection:input('list-collection').value,layout:input('list-layout').value,limit:Number(input('list-limit').value),sort:input('list-sort').value,descending:input('list-descending').checked,...(input('list-filter').value?{filter:{field:input('list-filter').value,value:input('list-value').value}}:{})}:undefined
    const value={kind,text,...(listing?{listing}:{}),...(chart?{chart}:{}),...(shape?{shape}:{}),...(kind==='accordion'?{summary}:{}),...(kind==='spacer'?{size}:{})}
    if(action==='native')add({...newBlock(),...value})
    else{if(!['line','spacer','accordion','chart','shape','scrolling-text','social-links','search','form','summary','collection-list','html'].includes(item?.kind))throw Error('Select a native block first.');delete item.listing;delete item.summary;delete item.size;delete item.chart;delete item.shape;if(kind!=='shape')delete item.link;Object.assign(item,value);commit()}
   }
   if(action==='audio'||action==='update-audio'){
    const text=input('audio-title').value.trim(),file=input('audio-file').value,download=input('audio-download').checked
    if(!text)throw Error('Enter an audio title.')
    let embed
    if(!file){const url=new URL(input('audio-url').value);if(url.protocol!=='https:'||url.username||url.password||url.port||!['w.soundcloud.com','open.spotify.com'].includes(url.hostname))throw Error('Choose a SoundCloud or Spotify HTTPS embed URL.');embed={title:text,url:url.href}}
    const audio={...(file?{file}:{}),download}
    if(action==='audio')add({...newBlock(),kind:'audio',text,audio,...(embed?{embed}:{})})
    else{if(item?.kind!=='audio')throw Error('Select an audio block first.');item.text=text;item.audio=audio;delete item.embed;if(embed)item.embed=embed;commit()}
   }
   if(action==='quote')add({...newBlock(),kind:'quote',text:'Quote',attribution:''})
   if(action==='video'||action==='update-video'){
    const kind=input('embed-kind').value,title=input('video-title').value.trim(),url=new URL(input('video-url').value)
    if(!title||title.length>120||url.protocol!=='https:'||url.username||url.password||url.port||!(kind==='video'?['www.youtube.com','www.youtube-nocookie.com','player.vimeo.com']:kind==='map'?['www.google.com']:['www.instagram.com','www.facebook.com']).includes(url.hostname))throw Error('Enter a title and a supported HTTPS embed URL.')
    url.hash='';const embed={title,url:url.href}
    if(action==='video')add({...newBlock(),kind,text:title,embed})
    else{if(!['video','map','social-post'].includes(item?.kind))throw Error('Select an embed block first.');item.kind=kind;item.embed=embed;item.text=title;commit()}
   }
   if(action==='destination'||action==='remove-destination'){
    if(!['image','button','shape'].includes(item?.kind))throw Error('Select an image or button first.')
    if(action==='destination')item.link=destination()
    else{if(item.kind==='button')throw Error('Buttons need a destination.');delete item.link}
    commit()
   }
   if(action==='link'||action==='unlink'){
    const node=textSelection();if(!node)throw Error('Select some text in a text block first.')
    if(action==='unlink')document.execCommand('unlink',false)
    else{
     const link=destination();document.execCommand('createLink',false,link.href)
     for(const anchor of node.querySelectorAll('a'))if(anchor.getAttribute('href')===link.href){anchor.dataset.bodyHref=link.href;if(link.newTab){anchor.target='_blank';anchor.rel='noopener noreferrer'}else{anchor.removeAttribute('target');anchor.removeAttribute('rel')}}
    }
    record(node)
   }
   status.textContent='Body updated.'
  }catch(error){status.textContent=error.message}
 })
 return {refresh}
}
