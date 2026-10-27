import type {Site} from './model'
import type {Post} from './posts'
import type {MenuItem} from './navigation'

export type LifecycleTarget={kind:'page'|'post';id:string}
/** Supplied by the authenticated server, never by a visitor or implicit clock. */
export type LifecycleContext={actor:string;at:string}
export type LifecycleDeletionContext=LifecycleContext&{sourceRevision:string}
export type LifecyclePost=Post&{deleted?:boolean}
export type MenuFrame={item:Omit<MenuItem,'children'>;anchors:string[];index:number;before?:string;after?:string}
export type MenuPlacement={menu:'main'|'footer';parents:MenuFrame[];frame:MenuFrame}
export type TrashEntry=LifecycleTarget&{deletion:string;sourceRevision:string;actor:string;deletedAt:string;path:string;deletionTarget:string;placement:MenuPlacement[];restoredAt?:string;restoredBy?:string}
export type LifecycleSite=Omit<Site,'posts'>&{posts?:LifecyclePost[];trash?:TrashEntry[];postDeletions?:string[]}
/** Payloads intentionally contain neither content nor account contact details. */
export type LifecycleEvent=LifecycleTarget&LifecycleContext&{action:'content.delete'|'content.restore'|'content.restore-version';sourceDeletion?:string;sourceRevision?:string;requiresCodeApproval?:boolean}
export type LifecycleTransition={site:LifecycleSite;events:LifecycleEvent[]}
