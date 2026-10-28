export function canvasConnections(form,{block,add,commit}){
 const input=name=>form.querySelector('[data-connect-'+name+']'),calendar=name=>form.querySelector('[data-calendar-'+name+']'),status=form.querySelector('[data-body-status]')
 function fields(){const collection=JSON.parse(form.querySelector('[data-body-collections]').value).find(item=>item.id===calendar('collection').value);for(const name of ['start','end'])calendar(name).replaceChildren(new Option('Choose a date field',''),...(collection?.fields??[]).filter(field=>field.type==='date').map(field=>new Option(field.label,field.id)))}
 calendar('collection').addEventListener('change',fields)
 function refresh(){const item=block();if(item?.connection){input('kind').value=item.kind;input('title').value=item.text;for(const key of ['provider','url','label','description'])input(key).value=item.connection[key];input('price').value=(item.connection.cents??0)/100}if(item?.calendar){calendar('title').value=item.text;calendar('collection').value=item.calendar.collection;fields();for(const key of ['start','end','month'])calendar(key).value=item.calendar[key];calendar('view-setting').value=item.calendar.view}}
 form.addEventListener('click',event=>{
  const connected=event.target.dataset.connectAction,dated=event.target.dataset.calendarAction;if(!connected&&!dated)return
  try{
   const item=block(),text=(connected?input('title'):calendar('title')).value.trim();if(!text)throw Error('Enter a block title.')
   const kind=connected?input('kind').value:'calendar',connection=connected?{provider:input('provider').value,url:input('url').value.trim(),label:input('label').value.trim(),description:input('description').value.trim(),...(kind==='product'?{cents:Math.round(Number(input('price').value)*100)}:{})}:undefined
   const settings=dated?{collection:calendar('collection').value,start:calendar('start').value,end:calendar('end').value,month:calendar('month').value,view:calendar('view-setting').value}:undefined
   const value={kind,text,...(connection?{connection}:{}),...(settings?{calendar:settings}:{})}
   if((connected??dated)==='add')add(value)
   else{if(connected&&!item?.connection||dated&&!item?.calendar)throw Error('Select the matching block first.');Object.assign(item,value);commit()}
   status.textContent=''
  }catch(error){status.textContent=error.message}
 })
 return {refresh}
}
