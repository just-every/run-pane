// Inert, server-rendered form previews keep labels and described-by references
// unique when a saved form is placed more than once on the grid.
export function formPreview(form,id,instance,position){
 const template=[...form.querySelectorAll('[data-body-form-template]')].find(node=>node.dataset.bodyFormTemplate===id)
 if(!template)return ''
 const wrapper=document.createElement('div');wrapper.append(template.content.cloneNode(true))
 const region=wrapper.querySelector('section[aria-label]');if(region)region.setAttribute('aria-label',region.getAttribute('aria-label')+' form '+position)
 const identities=new Map()
 for(const node of wrapper.querySelectorAll('[id]')){const before=node.id;node.id=instance+'-'+before;identities.set(before,node.id)}
 for(const node of wrapper.querySelectorAll('[for],[aria-describedby]'))for(const attribute of ['for','aria-describedby'])if(node.hasAttribute(attribute))node.setAttribute(attribute,node.getAttribute(attribute).split(' ').map(value=>identities.get(value)??value).join(' '))
 return wrapper.innerHTML
}
