import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const AVATAR_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // 1. Verify caller is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller }, error: authError } = await userClient.auth.getUser()
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: '인증에 실패했습니다.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerProfile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || (callerProfile.role !== 'super_admin' && callerProfile.role !== 'site_admin')) {
      return new Response(JSON.stringify({ error: '관리자 권한이 필요합니다.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Parse request body
    const { users } = await req.json() as {
      users: Array<{
        name: string
        email: string
        password: string
        role: string
        department_id: string | null
      }>
    }

    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ error: '사용자 데이터가 필요합니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (users.length > 100) {
      return new Response(JSON.stringify({ error: '한 번에 최대 100명까지 등록 가능합니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Create users with service role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const results: Array<{ email: string; success: boolean; error?: string }> = []

    for (let i = 0; i < users.length; i++) {
      const u = users[i]

      try {
        // Validate
        if (!u.name || !u.email || !u.password) {
          results.push({ email: u.email || `행 ${i + 1}`, success: false, error: '필수 필드 누락' })
          continue
        }
        if (u.password.length < 6) {
          results.push({ email: u.email, success: false, error: '비밀번호 6자 이상 필요' })
          continue
        }
        if (!['super_admin', 'site_admin', 'dept_manager', 'dept_sub_manager', 'partner'].includes(u.role)) {
          results.push({ email: u.email, success: false, error: `잘못된 역할: ${u.role}` })
          continue
        }

        // Create auth user
        const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { name: u.name },
        })

        if (createError) {
          const msg = createError.message.includes('already been registered')
            ? '이미 등록된 이메일입니다.'
            : createError.message
          results.push({ email: u.email, success: false, error: msg })
          continue
        }

        // Create profile
        const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length]
        const { error: profileError } = await adminClient.from('profiles').upsert({
          id: authData.user.id,
          name: u.name,
          email: u.email,
          role: u.role,
          department_id: u.department_id || null,
          avatar_color: avatarColor,
        })

        if (profileError) {
          results.push({ email: u.email, success: false, error: `프로필 생성 실패: ${profileError.message}` })
          continue
        }

        results.push({ email: u.email, success: true })
      } catch (err) {
        results.push({ email: u.email || `행 ${i + 1}`, success: false, error: String(err) })
      }
    }

    const successCount = results.filter(r => r.success).length
    return new Response(
      JSON.stringify({ results, summary: { total: users.length, success: successCount, failed: users.length - successCount } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
