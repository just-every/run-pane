export type SearchSettings = { title?: string; description?: string; canonical?: string; noindex?: boolean }
export type Page = { id?: string; folder?: string; deleted?: boolean; kind?: 'contact'; searchBox?: boolean; links?: {label: string; url: string}[]; slug: string; title: string; body: string; hidden?: boolean; search?: SearchSettings; embed?: import('./embeds').Embed; acknowledgment?: import('./acknowledgment').Acknowledgment }
export type Site = { automations?: import('./schedules').Automations; name: string; description: string; pages: Page[]; home?: string; notFound?: string; folders?: string[]; redirects?: import('./redirects').Redirect[]; redirectOffers?: import('./redirects').RedirectOffer[]; navigation?: import('./navigation').Navigation; socials?: Partial<Record<import('./navigation').SocialNetwork, string>>; robots?: string; analyticsCampaigns?: string[]; goals?: import('./goals').Goal[] }
export type Revision = { id: string; site: Site; hash: string; created_at: string; actor: string }
export type Dashboard = {
 schedules?: import('./schedules').ScheduleOverview; name: string; role: string; draft: Revision | null; live: Revision | null;
 revisions: Revision[]; messages: {id:string;name:string;email:string;message:string;created_at:string; acknowledgment_status?:string; acknowledgment_provider?:string; acknowledgment_provider_id?:string}[];
 visits: {path:string;count:number}[]; traffic: import('./visit-data').TrafficBreakdowns; goals: import('./goal-data').GoalReport[]; approvals: {id:string;action:string;revision:string;actor:string;created_at:string}[];
 imports: {id:string;state:string;created_at:string}[]; people: Record<string,string>; team: {name:string;role:string}[]; notice?:string
}
