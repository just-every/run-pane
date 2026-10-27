const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function htmlBlockPreview(block){
 const title=escape(block.text)
 return `<section class="external-embed html-block"><h2>${title}</h2><p>HTML code stays inert in workspace and draft previews.</p></section>`
}
