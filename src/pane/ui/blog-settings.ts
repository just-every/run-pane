import type {Blog} from '../blogs'
import {escape,hidden,key} from './kit'

export function blogSettings(blogs:Blog[],base:string):string {
 const selected=blogs[0],id=selected?.id??crypto.randomUUID()
 return `<details><summary>Blog settings</summary><form class="edit-form" method="post" action="/app/blogs/save" data-blog-settings>${key()}${hidden('base',base)}${hidden('id',id)}<label>Choose blog<select data-blog-selector aria-label="Choose blog"><option value=""${selected?'':' selected'}>New blog</option>${blogs.map(blog=>`<option value="${escape(blog.id)}" data-blog-prefix="${escape(blog.prefix)}" data-blog-page-size="${blog.pageSize}"${blog===selected?' selected':''}>${escape(blog.title)}</option>`).join('')}</select></label><label>Blog title<input name="title" required maxlength="120" value="${escape(selected?.title??'')}"></label><label>URL prefix<input name="prefix" required maxlength="240" value="${escape(selected?.prefix??'')}"></label><label>Posts per page<input name="pageSize" type="number" value="${selected?.pageSize??10}" min="1" max="50" step="1" required></label><p data-blog-save-status role="status">${selected?'Saved':'Enter a title and URL prefix.'}</p></form><p>Visitor comments remain off until moderation is available.</p></details>`
}
