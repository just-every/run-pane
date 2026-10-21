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

export default withDemo<Bindings, ExportedHandler<Bindings>>({
  async fetch(request, env, execution) {
    const asset = await staticAssetResponse(request, env)
    if (asset) return asset
    const auth = await authResponse(request, env)
    if (auth) return auth
    const search = await searchResponse(request, env)
    if (search) return search
    const pane = await paneResponse(request, env)
    if (pane) return searchMetadata(request, pane, env)
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
