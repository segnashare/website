import {revalidatePath} from 'next/cache'
import {NextRequest, NextResponse} from 'next/server'

type WebhookPayload = {
  _type?: string
  type?: string
}

const REVALIDATED_PATHS = ['/', '/newsroom', '/catalogue', '/aide'] as const

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  const expectedSecret = process.env.SANITY_REVALIDATE_SECRET

  if (!expectedSecret) {
    return NextResponse.json(
      {ok: false, message: 'Missing SANITY_REVALIDATE_SECRET on server.'},
      {status: 500}
    )
  }

  if (secret !== expectedSecret) {
    return NextResponse.json({ok: false, message: 'Invalid secret.'}, {status: 401})
  }

  let payload: WebhookPayload | null = null
  try {
    payload = (await request.json()) as WebhookPayload
  } catch {
    payload = null
  }

  for (const path of REVALIDATED_PATHS) {
    revalidatePath(path)
  }

  return NextResponse.json({
    ok: true,
    revalidated: REVALIDATED_PATHS,
    type: payload?._type ?? payload?.type ?? null,
    timestamp: new Date().toISOString(),
  })
}
