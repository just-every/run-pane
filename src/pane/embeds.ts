import { escape } from './ui/kit'
export type Embed = { title: string; url: string }
const paths: Record<string, RegExp> = {
 'w.soundcloud.com': /^\/player\/?$/,
 'open.spotify.com': /^\/embed\/(?:track|album|playlist|episode|show)\/[a-zA-Z0-9]+$/,
 'www.youtube-nocookie.com': /^\/embed\/[a-zA-Z0-9_-]+$/,
 'www.youtube.com': /^\/embed\/[a-zA-Z0-9_-]+$/,
 'player.vimeo.com': /^\/video\/[0-9]+$/,
 'www.google.com': /^\/maps\/embed(?:\/|$)/,
 'www.instagram.com': /^\/p\/[a-zA-Z0-9_-]+\/embed\/?$/,
 'www.facebook.com': /^\/plugins\/(?:post|video)\.php$/,
}
export function normalizeEmbed(value: unknown): Embed | undefined {
 if (value === undefined) return undefined
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Provide an embed title and HTTPS embed URL.')
 const input = value as Record<string, unknown>
 if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 120 || typeof input.url !== 'string' || input.url.length > 4000) throw Error('Provide an embed title and HTTPS embed URL.')
 let url: URL
 try { url = new URL(input.url) } catch { throw Error('Provide an HTTPS embed URL.') }
 if (url.protocol !== 'https:' || url.username || url.password || url.port || !paths[url.hostname]?.test(url.pathname)) throw Error('Use a supported video, map, social or audio embed URL.')
 if(url.hostname==='w.soundcloud.com'){let target:URL;try{target=new URL(url.searchParams.get('url')??'')}catch{throw Error('Choose a public SoundCloud track.')}if(target.origin!=='https://api.soundcloud.com'||!/^\/tracks\/[0-9]+$/.test(target.pathname)||target.search||target.hash)throw Error('Choose a public SoundCloud track.');url.search='';url.searchParams.set('url',target.href)}
 if(url.hostname==='open.spotify.com')url.search=''
 url.hash = ''
 return {title: input.title.normalize('NFC').trim(), url: url.href}
}
export const embedOrigin = (embed: Embed) => new URL(embed.url).origin
export function embedMarkup(embed: Embed, live: boolean, gpc: boolean): string {
 const origin = embedOrigin(embed)
 if (!live) return `<section class="external-embed" aria-label="${escape(embed.title)}"><h2>${escape(embed.title)}</h2><p>External content from ${escape(origin)} is disabled in workspace and draft previews.</p></section>`
 return `<section class="external-embed" data-embed data-url="${escape(embed.url)}" data-title="${escape(embed.title)}" data-gpc="${gpc ? '1' : '0'}"><h2>${escape(embed.title)}</h2><div data-embed-frame></div><p data-embed-status role="status">External content from ${escape(origin)} stays off until you allow it. The provider may receive your IP address and set its own cookies.</p><div class="form-actions"><button type="button" data-embed-allow${gpc ? ' disabled' : ''}>Allow external content</button><button type="button" class="secondary" data-embed-deny>Keep external content off</button></div></section>`
}
/** The declared frame policy follows every consent-gated embed in this document. */
export function pageEmbedOrigins(page:import('./model').Page):string|undefined {
 const embeds=[...(page.embed?[page.embed]:[]),...(page.sections??[]).flatMap(section=>section.blocks.flatMap(block=>block.embed?[block.embed]:[]))]
 return [...new Set(embeds.map(embedOrigin))].join(' ')||undefined
}
