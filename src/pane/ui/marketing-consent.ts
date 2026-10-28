import type { MarketingConsent } from '../marketing-consent'
import { escape } from './kit'

export function consentDetails(value?:string|null){
 if(!value)return ''
 const consent=JSON.parse(value) as MarketingConsent
 return `<details><summary>Marketing consent records</summary><p>Received ${escape(consent.receivedAt)} on ${escape('/site/'+consent.page)}. These choices are recorded locally; no subscription delivery was started.</p><ul>${consent.choices.map(choice=>`<li><strong>${choice.channel==='sms'?'SMS':'Email'}: ${choice.granted?'Consented':'Not consented'}</strong><p class="plain-text">${escape(choice.wording)}</p></li>`).join('')}</ul><p>Enquiry ${escape(consent.inquiryId)} · Form ${escape(consent.formId)}</p></details>`
}
