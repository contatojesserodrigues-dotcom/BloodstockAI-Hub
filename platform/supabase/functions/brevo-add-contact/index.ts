import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

interface Payload {
  name: string;
  email: string;
  reportModel: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, email, reportModel } = (await req.json()) as Payload;

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 200) {
      return new Response(JSON.stringify({ error: 'Invalid name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    const BREVO_LIST_ID = Deno.env.get('BREVO_LIST_ID');
    if (!BREVO_API_KEY || !BREVO_LIST_ID) {
      console.error('Missing BREVO_API_KEY or BREVO_LIST_ID');
      return new Response(JSON.stringify({ error: 'Brevo not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const listId = parseInt(BREVO_LIST_ID, 10);
    const trimmedName = name.trim();
    const firstName = trimmedName.split(' ')[0];
    const lastName = trimmedName.split(' ').slice(1).join(' ') || '';

    const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        attributes: {
          FIRSTNAME: firstName,
          LASTNAME: lastName,
          SOURCE: 'Report Model Download',
          REPORT_MODEL: reportModel || '',
        },
        listIds: [listId],
        updateEnabled: true,
      }),
    });

    if (!brevoRes.ok && brevoRes.status !== 204) {
      const errText = await brevoRes.text();
      console.error('Brevo error', brevoRes.status, errText);
      return new Response(JSON.stringify({ error: 'Brevo API error', detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('brevo-add-contact error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});