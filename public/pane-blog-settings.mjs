// Settings keep their own fields and menus mounted while immutable drafts save.
for(const form of document.querySelectorAll('[data-blog-settings]')){
 const fields=['title','prefix','pageSize'],selector=form.querySelector('[data-blog-selector]'),status=form.querySelector('[data-blog-save-status]'),screen=form.closest('.screen-sites')
 const values=()=>Object.fromEntries(fields.map(name=>[name,form.elements[name].value]))
 const signature=value=>JSON.stringify(fields.map(name=>value[name]))
 const entry=(id,value,isNew=false)=>({id,...value,isNew,saved:signature(value),dirty:false,failed:false,valid:true,status:isNew?'Enter a title and URL prefix.':'Saved'})
 const blogs=new Map([...selector.options].filter(option=>option.value).map(option=>[option.value,entry(option.value,{title:option.textContent,prefix:option.dataset.blogPrefix,pageSize:option.dataset.blogPageSize})]))
 let fresh=selector.value?undefined:entry(form.elements.id.value,values(),true),current=selector.value?blogs.get(selector.value):fresh,timer,pending=false
 if(fresh)blogs.set(fresh.id,fresh)
 function show(){form.elements.id.value=current.id;for(const name of fields)form.elements[name].value=current[name];status.textContent=current.status}
 function indicate(item,message){item.status=message;if(item===current)status.textContent=message}
 function option(select,blog){let node=[...select.options].find(option=>option.value===blog.id);if(!node){node=new Option(blog.title,blog.id);select.append(node)}else node.textContent=blog.title;return node}
 function adopt(revision,item){
  for(const base of screen.querySelectorAll('input[type="hidden"][name="base"]'))base.value=revision.id
  const blog=revision.site.blogs.find(blog=>blog.id===item.id)
  if(!blog)throw Error('The saved blog was not returned.')
  const node=option(selector,blog);node.dataset.blogPrefix=blog.prefix;node.dataset.blogPageSize=blog.pageSize
  if(item===current)selector.value=item.id
  for(const select of screen.querySelectorAll('form[action="/app/posts/save"] select[name="blog"]'))option(select,blog)
  item.isNew=false;if(fresh===item)fresh=undefined
 }
 async function save(){
  clearTimeout(timer);if(pending)return
  const item=[...blogs.values()].find(item=>item.dirty&&item.valid&&!item.failed);if(!item)return
  const sent=signature(item),body={base:form.elements.base.value,id:item.id,title:item.title,prefix:item.prefix,pageSize:Number(item.pageSize)}
  pending=true;let succeeded=false;indicate(item,'Saving…')
  try{
   const response=await fetch('/api/pane/blogs/save',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)}),result=await response.json()
   if(response.status===409)throw Error('Another editor saved changes. Your values are kept here.')
   if(!response.ok)throw Error(result.error??'Blog settings could not be saved. Your values are kept here.')
   adopt(result,item);item.saved=sent;item.dirty=signature(item)!==sent;succeeded=true
   indicate(item,item.dirty?'Unsaved changes.':'Saved')
  }catch(error){item.failed=true;indicate(item,error.message||'Blog settings could not be saved. Your values are kept here.')}
  finally{pending=false;if(succeeded&&[...blogs.values()].some(item=>item.dirty&&item.valid&&!item.failed))timer=setTimeout(save,600)}
 }
 selector.addEventListener('change',()=>{
  if(!selector.value){fresh??=entry(crypto.randomUUID(),{title:'',prefix:'',pageSize:'10'},true);blogs.set(fresh.id,fresh);current=fresh}
  else current=blogs.get(selector.value)
  show()
 })
 for(const name of fields)form.elements[name].addEventListener('input',()=>{
  Object.assign(current,values());current.dirty=signature(current)!==current.saved;current.failed=false
  current.valid=form.checkValidity()&&!!current.title.trim()&&/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(current.prefix)&&!['search','visit'].includes(current.prefix.split('/')[0])
  indicate(current,!current.dirty?(current.isNew?'Enter a title and URL prefix.':'Saved'):current.valid?'Unsaved changes.':'Complete the blog title, lowercase URL prefix and posts per page.')
  clearTimeout(timer);if(current.dirty&&current.valid)timer=setTimeout(save,600)
 })
 form.addEventListener('submit',event=>event.preventDefault())
 addEventListener('beforeunload',event=>{if([...blogs.values()].some(item=>item.dirty)){event.preventDefault();event.returnValue=''}})
}
