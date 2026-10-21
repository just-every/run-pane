export const permissionsPolicy = 'camera=(), microphone=(), geolocation=()'

/** Apply only at Pane-owned seams; preserve authentication, cookies and CSP. */
export function documentPermissions(response: Response): Response {
 if (!response.headers.get('content-type')?.toLowerCase().includes('text/html')) return response
 const headers = new Headers(response.headers)
 headers.set('permissions-policy', permissionsPolicy)
 return new Response(response.body, {status: response.status, statusText: response.statusText, headers})
}
