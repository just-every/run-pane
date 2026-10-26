import {escape} from './ui/kit'
import type {Site} from './model'
export type Tag={provider:'plausible'|'meta';category:'analytics'|'advertising';account:string}
export const tagCatalog=[{id:'plausible',name:'Plausible Analytics',script:'https://plausible.io/js/script.js',connect:'https://plausible.io'},{id:'meta',name:'Meta Pixel',script:'https://connect.facebook.net/en_US/fbevents.js',connect:'https://www.facebook.com'}] as const
export function normalizeTags(text:string):string {
 let value:unknown;try{value=JSON.parse(text)}catch{throw Error('Choose valid marketplace tags.')}
 if(!Array.isArray(value)||value.length>2)throw Error('Choose at most two marketplace tags.')
 const seen=new Set<string>()
 return JSON.stringify(value.map(raw=>{
  if(!raw||typeof raw!=='object'||Object.keys(raw).some(key=>!['provider','category','account'].includes(key))||!tagCatalog.some(item=>item.id===raw.provider)||!['analytics','advertising'].includes(raw.category)||typeof raw.account!=='string'||!/^[a-zA-Z0-9.-]{1,120}$/.test(raw.account)||seen.has(raw.provider))throw Error('Choose a marketplace provider, category and valid public account identifier.')
  if(raw.provider==='meta'&&raw.category!=='advertising')throw Error('Meta Pixel requires advertising consent.')
  seen.add(raw.provider);return {provider:raw.provider,category:raw.category,account:raw.account}
 }))
}
export function tags(site:Site):Tag[]{return JSON.parse(site.customCode?.tags??'[]')}
export function tagSource(tag:Tag):string {
 const provider=tagCatalog.find(item=>item.id===tag.provider)!
 const policy=`default-src 'none'; script-src ${new URL(provider.script).origin} 'unsafe-inline'; connect-src ${provider.connect}; img-src ${provider.connect}; style-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`
 const initialize=tag.provider==='meta'?`window.fbq=function(){fbq.callMethod?fbq.callMethod.apply(fbq,arguments):fbq.queue.push(arguments)};fbq.queue=[];window._fbq=fbq;fbq.loaded=true;fbq.version='2.0';fbq('init',${JSON.stringify(tag.account)});fbq('track','PageView');`:''
 return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${escape(policy)}"><script>${initialize}</script><script defer src="${provider.script}"${tag.provider==='plausible'?` data-domain="${escape(tag.account)}"`:''}></script>`
}
export function tagSources(site:Site){
 const selected=tags(site).map(tag=>tagCatalog.find(item=>item.id===tag.provider)!)
 return {script:selected.map(item=>new URL(item.script).origin),connect:selected.map(item=>item.connect),image:selected.map(item=>item.connect)}
}
export function tagMarkup(site:Site,live:boolean,quiet:boolean):string {
 if(!tags(site).length)return ''
 if(!live)return '<p>Marketplace tags are disabled in workspace and draft previews.</p>'
 if(quiet)return '<p>Marketplace tags are off for this privacy choice.</p>'
 return `<section class="external-embed" data-marketplace aria-label="Tag consent choices"><h2>Privacy choices</h2>${['analytics','advertising'].filter(category=>tags(site).some(tag=>tag.category===category)).map(category=>`<div data-tag-category="${category}"><p>${category==='analytics'?'Analytics':'Advertising'} tags: ${tags(site).filter(tag=>tag.category===category).map(tag=>escape(tagCatalog.find(item=>item.id===tag.provider)!.name)).join(', ')}.</p><p role="status" data-tag-status>Off until you allow this category.</p><button type="button" data-tag-choice="allow">Allow ${category}</button> <button type="button" class="secondary" data-tag-choice="deny">Withdraw ${category}</button></div>`).join('')}${tags(site).map(tag=>`<template data-tag-provider="${tag.provider}" data-category="${tag.category}" data-source="${escape(tagSource(tag))}"></template>`).join('')}</section><script src="/pane-tags.js" defer></script>`
}
export function tagSettings(site:Site):string {
 return `<details><summary>Tag marketplace settings</summary><p>Choose a provider and its consent category. Tags run only on an approved live version in isolated frames. Public account identifiers are not credentials. Every change needs a new publication approval.</p>${tagCatalog.map(provider=>{
  const current=tags(site).find(tag=>tag.provider===provider.id)
  return `<fieldset><legend>${provider.name}</legend><label for="tag-${provider.id}-category">${provider.name} consent category</label><select id="tag-${provider.id}-category" name="tag.${provider.id}.category"><option value="off">Off</option>${(provider.id==='meta'?['advertising']:['analytics','advertising']).map(category=>`<option value="${category}"${current?.category===category?' selected':''}>${category==='analytics'?'Analytics':'Advertising'}</option>`).join('')}</select><label for="tag-${provider.id}-account">${provider.name} public account</label><input id="tag-${provider.id}-account" name="tag.${provider.id}.account" value="${escape(current?.account??'')}" maxlength="120"></fieldset>`
 }).join('')}</details>`
}
export function tagsFromForm(input:Record<string,unknown>,saved:string|undefined):string|undefined {
 if(!tagCatalog.some(provider=>input[`tag.${provider.id}.category`]!==undefined))return saved
 return normalizeTags(JSON.stringify(tagCatalog.flatMap(provider=>{
  const category=input[`tag.${provider.id}.category`]
  return category&&category!=='off'?[{provider:provider.id,category,account:input[`tag.${provider.id}.account`]}]:[]
 })))
}
