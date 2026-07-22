import {NextResponse} from 'next/server'

import {getSupabaseAuthAdminClient} from '@/lib/supabase/auth-admin-client'

type RequestBody = {
  email?: string
  mode?: 'member' | 'auth'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody
    const email = (body.email ?? '').trim().toLowerCase()
    const mode: 'member' | 'auth' = body.mode === 'member' ? 'member' : 'auth'

    if (!email) {
      return NextResponse.json({exists: false}, {status: 400})
    }

    const admin = getSupabaseAuthAdminClient()
    if (!admin) {
      return NextResponse.json({exists: false}, {status: 503})
    }

    if (mode === 'member') {
      const {data, error} = await admin.rpc('member_exists_by_email', {p_email: email})
      if (error) {
        return NextResponse.json({exists: false}, {status: 500})
      }
      return NextResponse.json({exists: Boolean(data)})
    }

    const {data: lookup, error: lookupError} = await admin.rpc('auth_user_login_lookup_by_email', {
      p_email: email,
    })
    if (lookupError) {
      console.error('[user-exists] auth_user_login_lookup_by_email', lookupError.message)
      return NextResponse.json({exists: false}, {status: 500})
    }

    const row = lookup as {
      exists?: boolean
      emailConfirmed?: boolean
      passwordSet?: boolean
      googleLinked?: boolean
    } | null
    if (!row || row.exists !== true) {
      return NextResponse.json({exists: false})
    }

    return NextResponse.json({
      exists: true,
      emailConfirmed: Boolean(row.emailConfirmed),
      passwordSet: Boolean(row.passwordSet),
      googleLinked: Boolean(row.googleLinked),
    })
  } catch {
    return NextResponse.json({exists: false}, {status: 500})
  }
}
