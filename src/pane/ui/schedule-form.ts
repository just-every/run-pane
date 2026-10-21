import type { Site } from '../model'
/** Named schedule controls share the existing immutable autosave/undo form. */
export function schedulesFromForm(input:Record<string,unknown>,base:Site):Pick<Site,'automations'> {
 if(input['automation.timeZone']===undefined)return {automations:base.automations}
 const text=(name:string)=>String(input['automation.'+name]??'').trim()
 return {automations:{timeZone:text('timeZone'),banners:['holiday','promotion'].filter(id=>text(id+'.text')).map(id=>({id,text:text(id+'.text'),start:text(id+'.start'),end:text(id+'.end')})),...(text('review.start')?{review:{start:text('review.start'),months:3}}:{})}}
}
