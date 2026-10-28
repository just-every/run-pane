const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function calendarMarkup(block,attributes,options){
 const settings=block.calendar,collection=options?.collections?.find(item=>item.id===settings.collection)
 if(!collection)return `<section ${attributes} data-catalog-block><h2>${escape(block.text)}</h2><p>Choose a dated collection in block settings.</p></section>`
 const locale=options?.locale??'en-US',weekStart=options?.weekStart??0
 const items=[...collection.items].sort((a,b)=>String(a.values[settings.start]).localeCompare(String(b.values[settings.start]))||a.title.localeCompare(b.title))
 const event=item=>`<a href="/site/${escape(collection.prefix)}/${escape(item.slug)}">${escape(item.title)}</a>`
 const date=value=>new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'))
 const [year,month]=settings.month.split('-').map(Number),offset=(new Date(Date.UTC(year,month-1,1)).getUTCDay()-weekStart+7)%7,days=new Date(Date.UTC(year,month,0)).getUTCDate()
 const label=new Intl.DateTimeFormat(locale,{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)))
 const weekdays=Array.from({length:7},(_,index)=>new Intl.DateTimeFormat(locale,{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2026,0,4+(index+weekStart)%7))))
 const cells=Array.from({length:Math.ceil((offset+days)/7)*7},(_,index)=>{const day=index-offset+1;if(day<1||day>days)return '<td></td>';const iso=settings.month+'-'+String(day).padStart(2,'0'),matches=items.filter(item=>item.values[settings.start]<=iso&&item.values[settings.end]>=iso);return `<td><time datetime="${iso}">${day}</time>${matches.length?`<ul>${matches.map(item=>`<li>${event(item)}</li>`).join('')}</ul>`:''}</td>`})
 return `<section ${attributes} data-catalog-block data-calendar><h2>${escape(block.text)}</h2><div class="form-actions"><button type="button" data-calendar-view="list" aria-pressed="${settings.view==='list'}">List view</button><button type="button" data-calendar-view="month" aria-pressed="${settings.view==='month'}">Month view</button></div><div data-calendar-panel="list"${settings.view==='list'?'':' hidden'}>${items.length?`<ul>${items.map(item=>`<li>${event(item)} <time datetime="${escape(item.values[settings.start])}">${escape(date(item.values[settings.start]))}</time>${item.values[settings.end]!==item.values[settings.start]?' – '+escape(date(item.values[settings.end])):''}</li>`).join('')}</ul>`:'<p>No published events.</p>'}</div><div data-calendar-panel="month"${settings.view==='month'?'':' hidden'}><table><caption>${escape(label)}</caption><thead><tr>${weekdays.map(day=>`<th scope="col">${escape(day)}</th>`).join('')}</tr></thead><tbody>${Array.from({length:cells.length/7},(_,row)=>`<tr>${cells.slice(row*7,row*7+7).join('')}</tr>`).join('')}</tbody></table></div></section>`
}
if(typeof document!=='undefined')for(const calendar of document.querySelectorAll('[data-calendar]'))for(const button of calendar.querySelectorAll('[data-calendar-view]'))button.addEventListener('click',()=>{
 for(const panel of calendar.querySelectorAll('[data-calendar-panel]'))panel.hidden=panel.dataset.calendarPanel!==button.dataset.calendarView
 for(const control of calendar.querySelectorAll('[data-calendar-view]'))control.setAttribute('aria-pressed',String(control===button))
})
