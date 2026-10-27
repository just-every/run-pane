import type {Section} from './sections'

export type CollectionFieldType='text'|'richText'|'image'|'number'|'price'|'date'|'link'|'reference'|'option'
export type CollectionField={id:string;label:string;type:CollectionFieldType;required?:boolean;help?:string;options?:string[];reference?:string}
export type CollectionRichText={body:string;sections?:Section[]}
export type CollectionItem={id:string;slug:string;title:string;values:Record<string,unknown>}
export type CollectionTemplate={fields:string[];titleField?:string;descriptionField?:string;imageField?:string}
export type Collection={id:string;prefix:string;title:string;fields:CollectionField[];items:CollectionItem[];template?:CollectionTemplate}
export type CollectionSchema=Omit<Collection,'items'>
