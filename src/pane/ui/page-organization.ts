import type { Site } from '../model'
import { escape } from './kit'

/** Fields inside the editor's existing autosave form; structure is its only named control. */
export function pageOrganization(site: Site): string {
 const prefix = `page-organization-${crypto.randomUUID()}`
 const pages = site.pages.map(page => ({
  id: page.id ?? page.slug, slug: page.slug, title: page.title,
  ...(page.folder ? { folder: page.folder } : {}),
  ...(page.hidden ? { hidden: true } : {}),
  ...(page.deleted ? { deleted: true } : {}),
 }))
 const reference = (slug: string | undefined) => pages.find(page => !page.deleted && page.slug === slug)?.id ?? ''
 const structure = {
  pages,
  home: reference(site.home) || pages.find(page => !page.deleted && page.slug === 'home')?.id || pages.find(page => !page.deleted)?.id || '',
  notFound: reference(site.notFound),
  folders: [...new Set([...(site.folders ?? []), ...pages.flatMap(page => page.folder ? [page.folder] : [])])],
 }
 return `<details class="page-organization" data-page-organization id="${prefix}">
 <summary>Pages and folders</summary>
 <div class="page-organization-content">
 <p class="help">Organize your draft pages here. Hidden pages stay available by address but leave menus. Deleted pages stay in this draft so you can restore them.</p>
 <p class="help">After renaming or deleting a published page, reload once the draft is saved to review redirect offers.</p>
 <p><a href="/app">Open saved pages</a></p>
 <textarea name="structure" data-page-structure hidden>${escape(JSON.stringify(structure))}</textarea>
 <div class="page-organization-roles">
 <label>Home page<select data-page-role="home" aria-label="Home page"></select></label>
 <label>Not-found page<select data-page-role="notFound" aria-label="Not-found page"></select></label>
 </div>
 <label class="page-organization-check"><input type="checkbox" data-show-deleted>Show deleted pages</label>
 <ol class="page-organization-list" data-page-list aria-label="Pages in display order"></ol>
 <fieldset class="page-organization-add">
 <legend>Add a page</legend>
 <label>New page title<input data-new-page-title maxlength="120" autocomplete="off"></label>
 <label>New page address<input data-new-page-slug maxlength="120" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="From the title"></label>
 <button type="button" class="secondary small" data-add-page>Add page</button>
 <p class="help">The new page starts with your title as its text. Save and reload to edit its text.</p>
 </fieldset>
 <fieldset class="page-organization-add">
 <legend>Folders</legend>
 <ul class="page-organization-folders" data-folder-list aria-label="Available folders"></ul>
 <datalist id="${prefix}-folders" data-folder-options></datalist>
 <label>New folder name<input data-new-folder maxlength="120" autocomplete="off"></label>
 <button type="button" class="secondary small" data-add-folder>Add folder</button>
 <p class="help">Choose or type a folder on any page. Leave it blank for no folder.</p>
 </fieldset>
 <p class="help" role="status" aria-live="polite" data-organization-status></p>
 <noscript><p>Enable JavaScript to organize pages and folders.</p></noscript>
 </div></details><script src="/pane-organization.js" defer></script>`
}
