import { readFileSource } from '../modules/import-kit/src/readers/file.ts'
import { sha256 } from '../modules/import-kit/src/provenance/identity.ts'
import type { ImportMapping, SourceBundle } from '../modules/import-kit/src/types.ts'
import { contentHash } from './content'
import { parseImportDocument } from './import-formats'
import type { ImportDocument } from './import-report'

export const destination = 'pane-site'
export const namespace = 'static-site-json-v1'
export const mappingVersion = 'static-site-json-v1'
export const targetKind = 'site-revision'

/** Original bytes stay under Base custody. A snapshot, not outbound requests,
 * determines the reviewed operation and its deterministic source identity. */
export async function moveInSource(source: string, actor: string): Promise<{ source: SourceBundle; mapping: ImportMapping; document: ImportDocument; targetId: string }> {
 const document=parseImportDocument(source),artifactHash=sha256(source),sourceId=sha256(`${artifactHash}:${actor}`),targetId=`import-${sourceId}`
 const artifactName=document.format==='static-site-json-v1'?'static-site.json':document.format+'.export'
 const bundle=await readFileSource({namespace,name:artifactName,bytes:new TextEncoder().encode(JSON.stringify(source)),format:'json',
  parse:()=>document.historyRows?document.historyRows.map(row=>({kind:row.kind,sourceId:row.id,payload:row.value})):({kind:'site',sourceId,payload:document.site as any}),
 },{maxBytes:1100000,maxRecords:2000,maxRecordBytes:1100000})
 // Base validates hashes and byte retention at every boundary, including WXR.
 const { Buffer }=await import('node:buffer')
 bundle.artifacts=[{name:artifactName,sha256:artifactHash,size:new TextEncoder().encode(source).byteLength,original:{status:'available',base64:Buffer.from(source).toString('base64')}}]
 for(const record of bundle.records){record.artifactHash=artifactHash;record.location.artifact=artifactName}
 const hash=document.site?await contentHash(document.site):null
 return {source:bundle,document,targetId,mapping:{version:mappingVersion,map:(record)=>document.historyRows?({effects:[{targetKind:record.kind,targetId:record.sourceId,value:record.payload}]}):({effects:document.site?[{targetKind,targetId,value:{site:JSON.stringify(document.site),hash,actor}}]:[],unmapped:document.items.filter(item=>item.reason).map(item=>({field:item.id,reason:item.reason!}))})}}
}
