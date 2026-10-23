export type SearchSettings = { title?: string; description?: string; canonical?: string; noindex?: boolean }
export type Page = { importedHtml?: string; id?: string; folder?: string; deleted?: boolean; kind?: 'contact'; searchBox?: boolean; links?: {label: string; url: string}[]; slug: string; title: string; body: string; hidden?: boolean; search?: SearchSettings; embed?: import('./embeds').Embed; acknowledgment?: import('./acknowledgment').Acknowledgment }
export type Site = { automations?: import('./schedules').Automations; name: string; description: string; pages: Page[]; home?: string; notFound?: string; folders?: string[]; redirects?: import('./redirects').Redirect[]; redirectOffers?: import('./redirects').RedirectOffer[]; navigation?: import('./navigation').Navigation; socials?: Partial<Record<import('./navigation').SocialNetwork, string>>; robots?: string; analyticsCampaigns?: string[]; analytics?: import('./analytics').Analytics; goals?: import('./goals').Goal[]; responseDays?: number }
export type Revision = { id: string; site: Site; hash: string; created_at: string; actor: string }
export type Dashboard = {
 replies: {id:string;message_id:string;subject:string;body:string;status:string;created_at:string}[];
 timeZone?: string;
 roleLabel?: string;
 capabilities?: import('./roles').Capability[];
 activity?: import('./audit').Activity[];
 schedules?: import('./schedules').ScheduleOverview; name: string; role: string; draft: Revision | null; live: Revision | null;
 revisions: Revision[]; messages: {id:string;name:string;email:string;message:string;created_at:string; acknowledgment_status?:string; status?:string; assignee?:string|null; follow_up_at?:number|null; reminded_at?:number|null; reminder_to?:string|null; reminder_status?:string|null; escalated_at?:number|null; escalated_to?:string|null; escalation_status?:string|null; acknowledgment_provider?:string; acknowledgment_provider_id?:string}[];
 visits: {path:string;count:number}[]; traffic: import('./visit-data').TrafficBreakdowns; goals: import('./goal-data').GoalReport[]; approvals: {id:string;action:string;revision:string;actor:string;created_at:string}[];
 imports: {id:string;state:string;created_at:string}[]; people: Record<string,string>; assignees: {id:string;name:string;role:string}[]; replyWindow: {zone:string;days:number}; team: {name:string;role:string}[]; notice?:string
}
