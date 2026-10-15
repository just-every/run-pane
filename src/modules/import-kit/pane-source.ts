import { readFileSource } from './src/readers/file.ts'
import { sha256 } from './src/provenance/identity.ts'
import type { ImportMapping, SourceBundle } from './src/types.ts'
import { contentHash, normalizeSite } from '../../pane/content'

export const destination = 'pane-site'
export const namespace = 'static-site-json-v1'
export const mappingVersion = 'static-site-json-v1'
export const targetKind = 'site-revision'

/** One source artifact becomes one complete revision, including all five pages. */
export async function moveInSource(source: string, actor: string): Promise<{ source: SourceBundle; mapping: ImportMapping }> {
  if (typeof source !== 'string' || new TextEncoder().encode(source).byteLength > 512_000) {
    throw new Error('Move-in accepts a JSON file up to 512,000 bytes.')
  }
  if (!source.trimStart().startsWith('{')) throw new Error('Move-in expects one JSON site object.')
  const artifactHash = sha256(source)
  const sourceId = sha256(`${artifactHash}:${actor}`)
  const bundle = await readFileSource({
    namespace, name: 'static-site.json', bytes: new TextEncoder().encode(source), format: 'json',
    parse(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== 1) {
        throw new Error('Expected static-site-json-v1 with schemaVersion 1.')
      }
      return { kind: 'site', sourceId, payload: normalizeSite(value) }
    },
  }, { maxBytes: 512_000, maxRecords: 1, maxRecordBytes: 512_000 })
  const site = normalizeSite(bundle.records[0].payload)
  const hash = await contentHash(site)
  return {
    source: bundle,
    mapping: {
      version: mappingVersion,
      map: () => ({ effects: [{
        targetKind, targetId: `import-${sourceId}`,
        value: { site: JSON.stringify(site), hash, actor },
      }] }),
    },
  }
}
