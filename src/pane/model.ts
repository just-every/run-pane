export type SearchSettings = { title?: string; description?: string; canonical?: string; noindex?: boolean }
export type Page = { customCode?: import('./custom-code').CustomCode; sections?: import('./sections').Section[]; formId?: string; access?: import('./access').AccessRule; policyStarter?: import('./policies').PolicyKind; business?: import('./locale').BusinessContent; layout?: import('./pages').StarterLayout; importedHtml?: string; id?: string; folder?: string; deleted?: boolean; kind?: 'contact'; searchBox?: boolean; links?: {label: string; url: string}[]; slug: string; title: string; body: string; hidden?: boolean; search?: SearchSettings; embed?: import('./embeds').Embed; acknowledgment?: import('./acknowledgment').Acknowledgment }
export type Site = { template?: string; collections?: import('./collection-types').Collection[]; trash?: import('./lifecycle').TrashEntry[]; postDeletions?:string[]; libraryFiles?: import('./library-files').LibraryFile[]; blogs?: import('./blogs').Blog[]; blogPosts?: import('./blogs').PublishedPost[]; posts?: import('./posts').Post[]; brand?: import('./brand').Brand; media?: import('./gallery').MediaImage[]; customCode?: import('./custom-code').CustomCode; components?: import('./components').Component[]; forms?: import('./forms').SiteForm[]; access?: import('./access').SiteAccess; promotion?: import('./promotions').Promotion; locale?: import('./locale').LocaleSettings; automations?: import('./schedules').Automations; name: string; description: string; pages: Page[]; home?: string; notFound?: string; folders?: string[]; redirects?: import('./redirects').Redirect[]; redirectOffers?: import('./redirects').RedirectOffer[]; navigation?: import('./navigation').Navigation; socials?: Partial<Record<import('./navigation').SocialNetwork, string>>; robots?: string; analyticsCampaigns?: string[]; analytics?: import('./analytics').Analytics; goals?: import('./goals').Goal[]; responseDays?: number }
export type Revision = { id: string; site: Site; hash: string; created_at: string; actor: string }
export type Dashboard = {
 submissionForms?:{id:string;name:string}[];
 postDestinations?:{id:string;slug:string;title:string}[];
 rejectedContent?: import('./rejected-content').RejectedContent[];
 spamRetention?: boolean;
 pageRequests?: import('./page-review').PageRequest[];
 privacyRequest?: import('./privacy').PersonPrivacy;
 ownershipPeople?: {id:string;name:string;email:string}[];
 formRejectionCount?: number;
 formRejections?: import('./form-protection').FormRejection[];
 replies: {id:string;message_id:string;subject:string;body:string;status:string;created_at:string}[];
 locale?: string;
 timeZone?: string;
 roleLabel?: string;
 capabilities?: import('./roles').Capability[];
 activity?: import('./audit').Activity[];
 schedules?: import('./schedules').ScheduleOverview; name: string; role: string; draft: Revision | null; live: Revision | null;
 revisions: Revision[]; messages: {imported_from?:string|null;form_id?:string|null;submission?:string|null;id:string;name:string;email:string;message:string;created_at:string; files?:{id:string;name:string;size:number}[]; acknowledgment_status?:string; status?:string; assignee?:string|null; follow_up_at?:number|null; reminded_at?:number|null; reminder_to?:string|null; reminder_status?:string|null; escalated_at?:number|null; escalated_to?:string|null; escalation_status?:string|null; acknowledgment_provider?:string; acknowledgment_provider_id?:string}[];
 visits: {path:string;count:number}[]; traffic: import('./visit-data').TrafficBreakdowns; goals: import('./goal-data').GoalReport[]; approvals: {id:string;action:string;revision:string;actor:string;created_at:string}[];
 imports: {id:string;state:string;created_at:string}[]; people: Record<string,string>; assignees: {id:string;name:string;role:string}[]; replyWindow: {zone:string;days:number}; team: {name:string;role:string}[]; notice?:string
}
