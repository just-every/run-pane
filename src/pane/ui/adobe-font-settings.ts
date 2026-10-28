import type {AdobeProject} from '../adobe-fonts'
import {escape} from './kit'

export function adobeFontSettings(adobe?:AdobeProject):string{
 return `<details data-adobe-settings>
<summary>Adobe Fonts</summary>
<textarea name="styles.adobe" data-adobe-state hidden>${escape(JSON.stringify(adobe??null))}</textarea>
<p class="help" id="styles-adobe-help">Copy the project ID and CSS font-family names from your Adobe Web Projects. Connecting saves your current draft. Add this site's domains to the project in Adobe.</p>
<label for="styles-adobe-project">Web project ID</label>
<input id="styles-adobe-project" data-adobe-project value="${escape(adobe?.project??'')}" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="styles-adobe-help styles-adobe-status">
<label for="styles-adobe-families">Font families, separated by commas</label>
<input id="styles-adobe-families" data-adobe-families value="${escape(adobe?.families.join(', ')??'')}" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="styles-adobe-help styles-adobe-status">
<label for="styles-adobe-authorize"><input type="checkbox" id="styles-adobe-authorize" data-adobe-authorize aria-describedby="styles-adobe-hosting">I authorize this site to use my Adobe web project.</label>
<p class="help" id="styles-adobe-hosting">Selecting an Adobe font lets your browser request it directly from Adobe for the preview. Visitors request them from Adobe after you separately approve publication. Adobe receives browser information, including IP addresses, with these requests. Live loading depends on your Adobe account and web project.</p>
<div class="actions"><button type="button" class="small secondary" data-adobe-connect>${adobe?'Update configuration':'Connect project'}</button><button type="button" class="small secondary" data-adobe-disconnect${adobe?'':' disabled'}>Disconnect Adobe Fonts</button></div>
<p class="help">Disconnecting returns any selected Adobe fonts to Figtree.</p>
<p class="help" id="styles-adobe-status" data-adobe-status role="status">${adobe?'Adobe configuration saved in this draft. Review the preview before publishing.':'No Adobe project configured.'}</p>
</details>`
}
