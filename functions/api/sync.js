const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestGet({ request, env }) {
  const code = new URL(request.url).searchParams.get('team')?.toUpperCase().trim()
  if (!code) return new Response('missing team', { status: 400, headers: CORS })

  const data = await env.LINEUP_SYNC.get(code)
  if (!data) return new Response('{}', { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })

  return new Response(data, { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

export async function onRequestPost({ request, env }) {
  const code = new URL(request.url).searchParams.get('team')?.toUpperCase().trim()
  if (!code) return new Response('missing team', { status: 400, headers: CORS })

  const body = await request.text()
  await env.LINEUP_SYNC.put(code, body, { expirationTtl: 60 * 60 * 24 * 365 })

  return new Response('ok', { status: 200, headers: CORS })
}
