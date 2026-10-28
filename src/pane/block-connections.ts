/** Provider handoffs hold public destinations only; Pane never receives payment details. */
export type BlockConnection = {provider:'dial'|'calendly'|'acuity'|'stall'|'stripe'|'paypal';url:string;label:string;description:string;cents?:number}
export function normalizeBlockConnection(value:unknown,kind:string):BlockConnection {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Choose a provider and its public destination.')
 const input=value as Record<string,unknown>
 if(Object.keys(input).some(key=>!['provider','url','label','description','cents'].includes(key)))throw Error('Unsupported provider setting.')
 const providers=kind==='booking'?['dial','calendly','acuity']:['stall','stripe','paypal']
 if(!providers.includes(String(input.provider)))throw Error('Choose a supported provider for this block.')
 let url:URL;try{url=new URL(String(input.url))}catch{throw Error('Enter the provider’s public HTTPS link.')}
 if(url.protocol!=='https:'||url.username||url.password||url.port||!url.hostname.includes('.')||url.hostname==='localhost'||/^\d|:/.test(url.hostname)||url.hash)throw Error('Enter the provider’s public HTTPS link without credentials.')
 const provider=String(input.provider)
 if(provider==='calendly'&&url.hostname!=='calendly.com'||provider==='acuity'&&!['app.acuityscheduling.com','acuityscheduling.com'].includes(url.hostname)||provider==='stripe'&&url.hostname!=='buy.stripe.com'||provider==='paypal'&&!['www.paypal.com','www.sandbox.paypal.com','paypal.me'].includes(url.hostname))throw Error('The link must belong to the selected provider.')
 const text=(key:string,max:number)=>{const value=input[key];if(typeof value!=='string'||value.length>max||/[\u0000-\u001f]/.test(value))throw Error('Enter a plain provider label and description.');return value.normalize('NFC').trim()}
 const label=text('label',120),description=text('description',1000)
 if(!label)throw Error('Enter a handoff button label.')
 if(kind==='product'&&(!Number.isSafeInteger(input.cents)||Number(input.cents)<0||Number(input.cents)>100000000))throw Error('Enter a nonnegative USD price.')
 if(kind!=='product'&&input.cents!==undefined)throw Error('A displayed price belongs to a product block.')
 return {provider:provider as BlockConnection['provider'],url:url.href,label,description,...(kind==='product'?{cents:Number(input.cents)}:{})}
}
