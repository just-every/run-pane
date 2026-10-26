import type {Page} from './model'
export const aiModes=['search','rewrite','shorten','tone','alt','translate'] as const
export type AiMode=typeof aiModes[number]
export type Suggestion={id:string;kind:'search-title'|'search-description'|'heading'|'link'|'finding'|'text'|'alt'|'translation';label:string;before?:string;after:string;target:string;destination?:string;page?:Page;media?:import('./gallery').MediaImage[]}
export type Proposal={id:string;base:string;slug:string;mode:AiMode;suggestions:Suggestion[]}
export type AiBindings={AI_ENABLED?:string;AI_API_KEY?:string;AI_MODEL?:string}
