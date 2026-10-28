import { createHash } from 'node:crypto'
import type { FormField, SiteForm } from './forms'

export type MarketingConsent = {
 version:1; inquiryId:string; formId:string; page:string; pageId:string; revisionId:string; receivedAt:string;
 choices:{channel:'email'|'sms';fieldKey:string;granted:boolean;wording:string}[]
}
export const marketingField=(field:FormField)=>field.type==='email-consent'||field.type==='sms-consent'
export function consentLabel(field:FormField){
 return field.label+(field.type==='sms-consent'?` — ${field.business}. Message frequency: ${field.frequency}.`:'')
}
/** Bind a visitor's choice to the prompt actually served, refusing a stale form. */
export function consentSchema(form:SiteForm){
 return createHash('sha256').update(JSON.stringify(form.fields.filter(marketingField).map(field=>[field.key,field.type,consentLabel(field),field.help]))).digest('hex')
}
export function marketingConsent(form:SiteForm|undefined,values:Record<string,string>,source:Omit<MarketingConsent,'version'|'formId'|'choices'>):MarketingConsent|undefined{
 const fields=form?.fields.filter(marketingField)??[]
 if(!fields.length)return undefined
 return {version:1,...source,formId:form!.id,choices:fields.map(field=>({channel:field.type==='sms-consent'?'sms':'email',fieldKey:field.key,granted:values[field.key]==='yes',wording:consentLabel(field)+(field.help?'\n'+field.help:'')}))}
}
