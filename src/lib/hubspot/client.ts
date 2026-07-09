export interface HubSpotConfig {
  configured: boolean;
  token: string | null;
  warning?: string;
}

export function getHubSpotConfig(): HubSpotConfig {
  const token =
    process.env.HUBSPOT_ACCESS_TOKEN?.trim() ||
    process.env.HUBSPOT_API_KEY?.trim() ||
    null;

  if (!token) {
    return {
      configured: false,
      token: null,
      warning: "HUBSPOT_ACCESS_TOKEN is not set. CRM sync will be skipped.",
    };
  }

  return { configured: true, token };
}

async function hubspotFetch(path: string, method: string, body?: unknown) {
  const config = getHubSpotConfig();
  if (!config.configured || !config.token) {
    return { ok: false, error: config.warning, skipped: true };
  }

  const res = await fetch(`https://api.hubapi.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    return { ok: false, error: await res.text(), skipped: false };
  }

  const data = await res.json().catch(() => ({}));
  return { ok: true, data, skipped: false };
}

export interface HubSpotLeadInput {
  companyName: string;
  website?: string | null;
  country?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  segment?: string | null;
  description?: string | null;
  sourceUrls?: string[];
  expectedValue?: number;
}

export async function syncLeadToHubSpot(lead: HubSpotLeadInput) {
  const config = getHubSpotConfig();
  if (!config.configured) {
    return {
      ok: false,
      skipped: true,
      warning: config.warning,
      companyId: null,
      contactId: null,
      dealId: null,
    };
  }

  const companyRes = await hubspotFetch("/crm/v3/objects/companies", "POST", {
    properties: {
      name: lead.companyName,
      domain: lead.website?.replace(/^https?:\/\//, "").replace(/^www\./, "") || undefined,
      country: lead.country || undefined,
      description: lead.description || undefined,
      industry: lead.segment || "bloodstock",
    },
  });

  if (!companyRes.ok) {
    return { ok: false, skipped: false, error: companyRes.error, companyId: null, contactId: null, dealId: null };
  }

  const companyId = companyRes.data?.id as string | undefined;
  let contactId: string | null = null;

  if (lead.email || lead.contactName) {
    const contactRes = await hubspotFetch("/crm/v3/objects/contacts", "POST", {
      properties: {
        email: lead.email || undefined,
        firstname: lead.contactName?.split(" ")[0] || lead.companyName,
        lastname: lead.contactName?.split(" ").slice(1).join(" ") || undefined,
        phone: lead.phone || undefined,
        company: lead.companyName,
      },
    });
    if (contactRes.ok) contactId = contactRes.data?.id || null;
  }

  const dealRes = await hubspotFetch("/crm/v3/objects/deals", "POST", {
    properties: {
      dealname: `${lead.companyName} — Bloodstock outreach`,
      dealstage: "appointmentscheduled",
      amount: String(lead.expectedValue || 25000),
      pipeline: "default",
    },
  });

  const dealId = dealRes.ok ? dealRes.data?.id || null : null;

  if (companyId && dealId) {
    await hubspotFetch(`/crm/v3/objects/deals/${dealId}/associations/companies/${companyId}/deal_to_company`, "PUT");
  }
  if (contactId && companyId) {
    await hubspotFetch(`/crm/v3/objects/contacts/${contactId}/associations/companies/${companyId}/contact_to_company`, "PUT");
  }

  const noteBody = [
    lead.description,
    lead.sourceUrls?.length ? `Sources:\n${lead.sourceUrls.join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (noteBody && companyId) {
    await hubspotFetch("/crm/v3/objects/notes", "POST", {
      properties: { hs_note_body: noteBody, hs_timestamp: Date.now().toString() },
      associations: [
        {
          to: { id: companyId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 190 }],
        },
      ],
    });
  }

  if (companyId) {
    await hubspotFetch("/crm/v3/objects/tasks", "POST", {
      properties: {
        hs_task_subject: `Review outreach draft — ${lead.companyName}`,
        hs_task_body: "Approval required before sending cold outreach email.",
        hs_task_status: "NOT_STARTED",
        hs_task_priority: "MEDIUM",
        hs_timestamp: Date.now().toString(),
      },
    });
  }

  return { ok: true, skipped: false, companyId, contactId, dealId };
}
