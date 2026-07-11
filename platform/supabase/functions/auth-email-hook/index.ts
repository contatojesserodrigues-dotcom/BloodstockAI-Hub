import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, webhook-id, webhook-signature, webhook-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

const SITE_NAME = 'BloodstockAI'
const FROM_ADDRESS = 'BloodstockAI <noreply@agentbloodstockai.com>'
const APP_URL = Deno.env.get('APP_URL') || 'https://www.agentbloodstockai.com'

type EmailData = {
  token: string
  token_hash: string
  redirect_to: string
  email_action_type: string
  site_url: string
  token_new: string
  token_hash_new: string
}

type HookUser = {
  email: string
  new_email?: string
}

function buildVerifyUrl(supabaseUrl: string, emailData: EmailData, tokenHash: string, actionType: string): string {
  const redirectTo = emailData.redirect_to || `${APP_URL}/auth`
  const params = new URLSearchParams({
    token: tokenHash,
    type: actionType,
    redirect_to: redirectTo,
  })
  return `${supabaseUrl.replace(/\/$/, '')}/auth/v1/verify?${params.toString()}`
}

async function sendWithResend(to: string, subject: string, html: string, text: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    throw new Error('RESEND_API_KEY not configured')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html, text }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error (${res.status}): ${body}`)
  }

  return res.json()
}

async function renderEmail(emailType: string, templateProps: Record<string, unknown>) {
  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    throw new Error(`Unknown email type: ${emailType}`)
  }

  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), { plainText: true })
  return { html, text }
}

async function sendAuthEmail(
  emailType: string,
  to: string,
  templateProps: Record<string, unknown>,
) {
  const { html, text } = await renderEmail(emailType, templateProps)
  const subject = EMAIL_SUBJECTS[emailType] || 'BloodstockAI notification'
  const result = await sendWithResend(to, subject, html, text)
  console.log('Auth email sent', { emailType, to, messageId: result?.id })
}

async function handleSupabaseHook(req: Request): Promise<Response> {
  const hookSecretRaw = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')

  if (!resendKey) {
    console.error('RESEND_API_KEY not configured')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!supabaseUrl) {
    console.error('SUPABASE_URL not configured')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const payloadText = await req.text()
  let user: HookUser
  let email_data: EmailData

  if (hookSecretRaw) {
    const hookSecret = hookSecretRaw.replace(/^v1,whsec_/, '')
    const wh = new Webhook(hookSecret)
    try {
      const verified = wh.verify(payloadText, Object.fromEntries(req.headers)) as {
        user: HookUser
        email_data: EmailData
      }
      user = verified.user
      email_data = verified.email_data
    } catch (error) {
      console.error('Invalid auth hook signature', error)
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } else {
    try {
      const parsed = JSON.parse(payloadText) as { user: HookUser; email_data: EmailData }
      user = parsed.user
      email_data = parsed.email_data
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const emailType = email_data.email_action_type
  console.log('Auth hook received', { emailType, email: user.email })

  if (emailType === 'email_change' && user.new_email && email_data.token_new && email_data.token_hash) {
    await sendAuthEmail('email_change', user.email, {
      siteName: SITE_NAME,
      siteUrl: APP_URL,
      email: user.email,
      newEmail: user.new_email,
      confirmationUrl: buildVerifyUrl(supabaseUrl, email_data, email_data.token_hash_new || email_data.token_hash, emailType),
      token: email_data.token,
    })
    await sendAuthEmail('email_change', user.new_email, {
      siteName: SITE_NAME,
      siteUrl: APP_URL,
      email: user.email,
      newEmail: user.new_email,
      confirmationUrl: buildVerifyUrl(supabaseUrl, email_data, email_data.token_hash, emailType),
      token: email_data.token_new,
    })
  } else {
    const confirmationUrl = buildVerifyUrl(
      supabaseUrl,
      email_data,
      email_data.token_hash,
      emailType,
    )

    await sendAuthEmail(emailType, user.email, {
      siteName: SITE_NAME,
      siteUrl: APP_URL,
      recipient: user.email,
      confirmationUrl,
      token: email_data.token,
      email: user.email,
      newEmail: user.new_email || user.email,
    })
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    return await handleSupabaseHook(req)
  } catch (error) {
    console.error('Auth email hook error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
