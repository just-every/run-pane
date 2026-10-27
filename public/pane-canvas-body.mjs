import {normalizeBodyLink} from './pane-body-links.mjs'
export function canvasBody(form,{block,section,newBlock,commit,select,textSelection,record}){
 const input=name=>form.querySelector(`[data-body-${name}]`),status=input('status')
 const destination=()=>normalizeBodyLink({href:input('href').value,newTab:input('new-tab').checked})
 const add=item=>{item.row=Math.max(...section().blocks.map(block=>block.row))+1;section().blocks.push(item);select(item.id);commit()}
 function refresh(){
  const item=block(),link=item?.link
  if(['line','spacer','accordion','chart','shape','scrolling-text','social-links'].includes(item?.kind)){input('native-kind').value=item.kind;input('native-summary').value=item.summary??'';input('native-text').value=item.text;input('native-size').value=item.size??32;if(item.chart){input('chart-type').value=item.chart.type;input('chart-rows').value=item.chart.rows.map(row=>row.join(' | ')).join('\n')}if(item.shape){input('shape-form').value=item.shape.form;input('shape-color').value=item.shape.color;input('shape-outline').checked=item.shape.outlined}}
  input('caption').value=item?.caption??''
  input('attribution').disabled=!(item?.kind==='quote'||item?.format==='blockquote')
  input('attribution').value=item?.attribution??''
  if(item?.kind==='button')input('button-label').value=item.text
  if(link){input('href').value=link.href;input('new-tab').checked=link.newTab}
  if(item?.embed){input('video-title').value=item.embed.title;input('video-url').value=item.embed.url}
 }
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
    const link=destination()
    if(action==='button')add({...newBlock(),kind:'button',text,link})
    else{if(item?.kind!=='button')throw Error('Select a button first.');item.text=text;item.link=link;commit()}
   }
   if(action==='native'||action==='update-native'){
    const kind=input('native-kind').value,text=['line','spacer'].includes(kind)?'':kind==='social-links'?'Social links':input('native-text').value.trim(),summary=input('native-summary').value.trim(),size=Number(input('native-size').value)
    if(kind==='accordion'&&(!summary||!text))throw Error('Enter an accordion title and text.')
    if(kind==='spacer'&&(!Number.isInteger(size)||size<8||size>240))throw Error('Choose a spacer height from 8 to 240 pixels.')
    if(!['line','spacer'].includes(kind)&&!text)throw Error('Enter block text or a chart title.')
    const chart=kind==='chart'?{type:input('chart-type').value,rows:input('chart-rows').value.split(/\r?\n/).filter(line=>line.trim()).map(line=>{const parts=line.split('|');if(parts.length!==2||!parts[0].trim()||!parts[1].trim()||!Number.isFinite(Number(parts[1])))throw Error('Enter one label and numeric value per chart row.');return [parts[0].trim(),Number(parts[1])]})}:undefined
    const shape=kind==='shape'?{form:input('shape-form').value,color:input('shape-color').value,outlined:input('shape-outline').checked}:undefined
    const value={kind,text,...(chart?{chart}:{}),...(shape?{shape}:{}),...(kind==='accordion'?{summary}:{}),...(kind==='spacer'?{size}:{})}
    if(action==='native')add({...newBlock(),...value})
    else{if(!['line','spacer','accordion','chart','shape','scrolling-text','social-links'].includes(item?.kind))throw Error('Select a native block first.');delete item.summary;delete item.size;delete item.chart;delete item.shape;delete item.link;Object.assign(item,value);commit()}
   }
   if(action==='quote')add({...newBlock(),kind:'quote',text:'Quote',attribution:''})
   if(action==='video'||action==='update-video'){
    const title=input('video-title').value.trim(),url=new URL(input('video-url').value)
    if(!title||title.length>120||url.protocol!=='https:'||url.username||url.password||url.port||!['www.youtube.com','www.youtube-nocookie.com'].includes(url.hostname)||!/^\/embed\/[a-zA-Z0-9_-]+$/.test(url.pathname))throw Error('Enter a video title and a YouTube HTTPS embed URL.')
    url.hash='';const embed={title,url:url.href}
    if(action==='video')add({...newBlock(),kind:'video',text:title,embed})
    else{if(item?.kind!=='video')throw Error('Select a video block first.');item.embed=embed;item.text=title;commit()}
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
