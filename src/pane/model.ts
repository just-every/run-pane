export type Page = { slug: string; title: string; body: string }
export type Site = { name: string; description: string; pages: Page[] }
export type Revision = { id: string; site: Site; hash: string; created_at: string; actor: string }
export type Dashboard = {
 name: string; role: string; draft: Revision | null; live: Revision | null;
 revisions: Revision[]; messages: {id:string;name:string;email:string;message:string;created_at:string}[];
 visits: {path:string;count:number}[]; approvals: {id:string;action:string;revision:string;actor:string;created_at:string}[];
 imports: {id:string;state:string;created_at:string}[]; notice?:string
}
