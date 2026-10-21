export type SearchSettings = { title?: string; description?: string; canonical?: string; noindex?: boolean }
export type Page = { slug: string; title: string; body: string; search?: SearchSettings; embed?: import('./embeds').Embed; acknowledgment?: import('./acknowledgment').Acknowledgment }
export type Site = { name: string; description: string; pages: Page[]; robots?: string }
export type Revision = { id: string; site: Site; hash: string; created_at: string; actor: string }
export type Dashboard = {
 name: string; role: string; draft: Revision | null; live: Revision | null;
 revisions: Revision[]; messages: {id:string;name:string;email:string;message:string;created_at:string; acknowledgment_status?:string; acknowledgment_provider?:string; acknowledgment_provider_id?:string}[];
 visits: {path:string;count:number}[]; approvals: {id:string;action:string;revision:string;actor:string;created_at:string}[];
 imports: {id:string;state:string;created_at:string}[]; people: Record<string,string>; team: {name:string;role:string}[]; notice?:string
}
