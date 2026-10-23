export { PaneLive } from './pane/outage'
import { liveCall } from './pane/outage'
import { activeBanners } from './pane/schedules'
import { apiIdentity, recordApi, type ApiIdentity } from './pane/api-tokens'
import { auditedDatabase } from './pane/audit'
import { operatorAuth } from './auth.server'
import { runSchedules } from './pane/schedules'
import { runFollowUps } from './pane/followups'
import { documentPermissions } from './pane/document-security'
import { withDemo } from './modules/demo/index.mjs'
import { searchResponse, searchMetadata } from './pane/search'
import { paneResponse } from './pane/handler'
import { publicResponse } from './pane/public'
import { rejectedResponse } from './base/rejected-response'
import { Hono } from 'hono'
import { staticAssetResponse } from './base/static-assets'
import { deploymentHealth } from './base/deployment-health'
import { lobbyResponse } from './base/lobby'
import { setupStateResponse } from './base/setup-state'
import { authResponse, runtimeBindings, type Bindings } from './auth.server'
import { identity } from './identity'
import { seedDemo } from './demo'

const api = new Hono<{ Bindings: Bindings }>()
api.get('/health', (context) => context.json({ status: 'ok', ...deploymentHealth(context.env) }))

// Base's link handlers refuse an input body over 8 KiB.
const linkInputLimit = 8192
/** A link callback body, read once and no further than the limit; a longer body keeps only what was read. */
async function linkCallbackBody(request: Request) {
  const reader = request.body?.getReader(), chunks: Uint8Array[] = []
  let length = 0
  while (reader && length <= linkInputLimit) { const next = await reader.read(); if (next.done) break; chunks.push(next.value); length += next.value.byteLength }
  if (length > linkInputLimit) await reader?.cancel()
  const body = new Uint8Array(length); let offset = 0
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
  return body
}

export default withDemo<Bindings, ExportedHandler<Bindings>>({
  async scheduled(controller, env) {
    const bindings={...runtimeBindings(env),DB:auditedDatabase(env.DB,null,'schedule.change')}
    // One failing sweep must not stop the other.
    const sweeps=await Promise.allSettled([runSchedules(bindings.DB,controller.scheduledTime),runFollowUps(bindings,controller.scheduledTime),...(env.PANE_LIVE?[liveCall(bindings,'/drain',{})]:[])])
    for(const sweep of sweeps) if(sweep.status==='rejected') throw sweep.reason
    if(env.PANE_LIVE){const row=await env.DB.prepare('SELECT live FROM pane_state WHERE id=1').first<{live:string}>();if(row)await liveCall(bindings,'/banners',{banners:await activeBanners(env.DB,row.live)})}
  },
  async fetch(request, env, execution) {
    const asset = await staticAssetResponse(request, env)
    if (asset) return asset
    // Resolve attribution using the unwrapped native store, then scope all writes.
    const path = new URL(request.url).pathname, isApi=path==='/api/pane'||path.startsWith('/api/pane/')
    let principal: ApiIdentity | null = null
    try { principal = isApi ? await apiIdentity(request,runtimeBindings(env)) : await operatorAuth(runtimeBindings(env)).getSession(request) } catch {}
    let actor=principal?.operator.id??null
    // A link callback acts on its persisted, transaction-fenced owner approval,
    // rather than on a provider cookie or caller-supplied person identity.
    if(path==='/.well-known/rer-link/callback'&&request.method==='POST'){
      // Base reads these same bytes, and refuses them as too large past its limit.
      const body=await linkCallbackBody(request)
      request=new Request(request,{body}) as typeof request
      if(body.byteLength<=linkInputLimit)try{
        const input=JSON.parse(new TextDecoder().decode(body)) as {interface?:string}
        const pending=await env.DB.prepare('SELECT approved_by FROM rer_dependency_pending WHERE interface=?').bind(input.interface??'oidc-provider@1').first<{approved_by:string}>()
        if(pending&&pending.approved_by!=='setup')actor=pending.approved_by
      }catch{}
    }
    env = {...env, DB: auditedDatabase(env.DB,actor,path.startsWith('/auth/') ? 'authentication.change' : path.startsWith('/app/search') ? 'settings.search' : 'workspace.change')}
    const auth = await authResponse(request, env)
    if (auth) return auth
    const search = await searchResponse(request, env)
    if (search) return search
    const pane = await paneResponse(request, env)
    if (pane) {
      if(isApi)await recordApi(env.DB,principal,request,pane.status)
      return searchMetadata(request, pane, env)
    }
    const website = await publicResponse(request, env)
    if (website) return searchMetadata(request, website, env)
    // The installed variant: the Lobby at / and the public claim state it reads.
    // Local dev serves the saved origin's data at its own port (RER_DEV_ORIGIN).
    const state = await setupStateResponse(request, runtimeBindings(env))
    if (state) return state
    const lobby = await lobbyResponse(request, runtimeBindings(env), identity)
    if (lobby) return documentPermissions(lobby)
    // Pane's documents are handled above. Hono owns health and the final 404;
    // an empty Start route tree otherwise answers unknown documents with 200.
    return rejectedResponse(request, await api.fetch(request, env, execution))
  },
} satisfies ExportedHandler<Bindings>, { seed: seedDemo })
