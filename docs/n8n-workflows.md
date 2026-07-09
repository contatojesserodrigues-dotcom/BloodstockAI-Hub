# BloodstockAI n8n Workflows - Setup Guide

Instance: **https://bloodstockai.app.n8n.cloud/**  
HUB inbound logs: `POST {YOUR_HUB_URL}/api/n8n/webhook`

---

## Overview

Create **3 workflows** in n8n:

| # | Name | Webhook path | Purpose |
|---|------|--------------|---------|
| 1 | Agent Command Router | `/webhook/agent-command` | Routes chat commands to the right agent chain |
| 2 | Consignor Outreach | `/webhook/consignor-workflow` | Full UK/Ireland consignor pipeline |
| 3 | HUB Log Helper | (sub-workflow) | Sends activity back to the dashboard terminal |

---

## Workflow 1: Agent Command Router

**Trigger:** Webhook (POST)  
**Path:** `agent-command`  
**Authentication:** None (or Header Auth with shared secret)

### Expected payload from HUB

```json
{
  "workflow": "agent-command",
  "command": "James, find 100 consignors in Ireland",
  "agentSlug": "james-carter",
  "source": "bloodstockai-hub",
  "timestamp": "2026-07-09T12:00:00.000Z"
}
```

### Node flow

```
[1] Webhook
     |
[2] Set - Parse Command
     |
[3] Switch - Route by keyword
     |-- james/apollo/consignor/lead ----> [4a] Execute Workflow: Consignor Outreach
     |-- sophia/email/follow-up ---------> [4b] Execute Workflow: Email Draft Batch
     |-- oliver/hubspot/crm/deal --------> [4c] Execute Workflow: CRM Sync
     |-- evelyn/ceo/report --------------> [4d] Execute Workflow: CEO Report
     |-- victoria/partnership -----------> [4e] Execute Workflow: Partnerships
     |-- default ------------------------> [4f] HTTP - Log to HUB (Amelia Scott)
     |
[5] Respond to Webhook - { "ok": true, "routed": "{{ route }}" }
```

### Node 2: Set - Parse Command

| Field | Value |
|-------|-------|
| command | `{{ $json.body.command }}` |
| agentSlug | `{{ $json.body.agentSlug }}` |
| commandLower | `{{ $json.body.command.toLowerCase() }}` |

### Node 3: Switch rules

| Output | Condition |
|--------|-----------|
| consignor | `commandLower` contains `consignor` OR `apollo` OR `james` OR `lead` |
| email | contains `sophia` OR `email` OR `follow-up` OR `follow up` |
| crm | contains `oliver` OR `hubspot` OR `crm` OR `deal` |
| ceo | contains `evelyn` OR `ceo` OR `report` |
| partnership | contains `victoria` OR `partnership` |
| default | fallback |

---

## Workflow 2: Consignor Outreach (Main Pipeline)

**Trigger:** Webhook (POST)  
**Path:** `consignor-workflow`

This implements the first functional workflow from the HUB spec.

### Expected payload

```json
{
  "workflow": "consignor-outreach",
  "command": "Find 50 UK and Ireland consignors...",
  "agentSlug": "amelia-scott",
  "metadata": {
    "targetCountries": ["UK", "Ireland"],
    "targetCount": 50,
    "segment": "consignors"
  }
}
```

### Full node flow

```
[1] Webhook
     |
[2] Set - Workflow Context
     |
[3] HTTP - Log START (Amelia Scott)
     |
[4] HTTP - Log (James Carter - searching)
     |
[5] Apollo - Search People/Companies
     |  Filters: country UK OR Ireland, keywords: consignor, bloodstock, thoroughbred
     |
[6] IF - Results found?
     |-- No --> [6b] HTTP Log error --> Respond
     |
[7] Clay - Enrich leads (optional, if Clay connected)
     |
[8] HTTP - Log (James - found X leads)
     |
[9] HTTP - Log (Emma Collins - researching)
     |
[10] Loop Over Items (batch of 10)
      |
      [10a] Perplexity OR OpenAI - Research company
      [10b] Set - Build lead record
      |
[11] HTTP - Log (Emma - research complete)
     |
[12] HubSpot - Create/Update Contacts (batch)
     |
[13] HubSpot - Create/Update Companies (batch)
     |
[14] HTTP - Log (Oliver Brooks - CRM updated)
     |
[15] OpenAI OR Claude - Generate personalized emails (batch)
     |
[16] Set - Build approval payloads
     |
[17] HTTP POST - Send to HUB Approval Queue
     |  URL: {HUB_URL}/api/n8n/webhook
     |  Body: { agent, message, level: "approval", drafts: [...] }
     |
[18] HTTP - Log (Sophia Bennett - drafts pending approval)
     |
[19] Wait - Do NOT send Gmail yet (human approval required)
     |
[20] OpenAI OR Claude - CEO summary
     |
[21] HTTP - Log (Evelyn Stone - executive summary)
     |
[22] Respond to Webhook
```

---

## Node-by-node configuration

### [5] Apollo - Search (HTTP Request node)

If you use HTTP Request instead of native Apollo node:

```
POST https://api.apollo.io/v1/mixed_people/search
Headers:
  Content-Type: application/json
  X-Api-Key: {{ $env.APOLLO_API_KEY }}

Body:
{
  "person_titles": ["Director", "Bloodstock Manager", "Consignor", "Sales Manager"],
  "organization_locations": ["United Kingdom", "Ireland"],
  "q_organization_keyword_tags": ["horse racing", "bloodstock", "thoroughbred"],
  "page": 1,
  "per_page": 50
}
```

### [7] Clay - Enrich (HTTP Request)

```
POST https://api.clay.com/v3/people/enrich
Authorization: Bearer {{ $env.CLAY_API_KEY }}
Body: map Apollo results to Clay format
```

### [10a] Research node (Perplexity example)

```
POST https://api.perplexity.ai/chat/completions
Body:
{
  "model": "sonar",
  "messages": [{
    "role": "user",
    "content": "Research {{ $json.company_name }} as a thoroughbred consignor. Include auction participation (Tattersalls, Goffs), key people, and sales relevance."
  }]
}
```

### [12] HubSpot - Create Contact

Native **HubSpot** node:
- Resource: Contact
- Operation: Create or Update (upsert)
- Email: `{{ $json.email }}`
- Properties:
  - firstname, lastname, company
  - country
  - hs_lead_status: NEW
  - lifecyclestage: lead
  - jobtitle

### [13] HubSpot - Create Company

- Resource: Company
- Operation: Upsert
- Name: `{{ $json.company }}`
- Domain: `{{ $json.domain }}`
- Country: `{{ $json.country }}`

### [15] Claude - Email draft (HTTP Request)

```
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: {{ $env.ANTHROPIC_API_KEY }}
  anthropic-version: 2023-06-01

Body:
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "messages": [{
    "role": "user",
    "content": "Write a short personalized outreach email for a UK/Ireland thoroughbred consignor.\nCompany: {{ $json.company }}\nContact: {{ $json.name }}\nContext: {{ $json.research }}\nTone: professional, BloodstockAI, auction season.\nDo NOT send - draft only."
  }]
}
```

### [17] Send approval to HUB

```
POST {{ $env.HUB_URL }}/api/n8n/webhook

Body:
{
  "agent": "Sophia Bennett",
  "message": "Created {{ $json.draftCount }} email drafts awaiting approval",
  "level": "approval",
  "workflowId": "consignor-outreach",
  "payload": {
    "drafts": "{{ $json.drafts }}",
    "requiresApproval": true
  }
}
```

Also create approval records via HUB API (future): `POST /api/approvals`

---

## Workflow 3: HUB Log Helper (Sub-workflow)

Reusable sub-workflow called from any step.

**Input fields:**
- `agent` (string) - e.g. "James Carter"
- `message` (string)
- `level` (string) - info | warning | approval | error

**Nodes:**

```
[1] Execute Workflow Trigger
     |
[2] HTTP Request
     POST {{ $env.HUB_URL }}/api/n8n/webhook
     Body: { agent, message, level, workflowId }
     |
[3] Return
```

---

## Workflow 4: Send Approved Actions (CONNECTED TO HUB)

**Trigger:** Webhook POST `/webhook/send-approved-emails`  
**Import:** `n8n/workflow-send-approved.json`

This workflow is **automatically triggered** when Jesse clicks **Approve & Execute** in the HUB.

### Payload received from HUB

```json
{
  "workflow": "send-approved",
  "approvalId": "clx...",
  "type": "Email Draft",
  "title": "Auction outreach - 12 consignor leads",
  "approved": true,
  "approvedBy": "Jesse",
  "agentSlug": "sophia-bennett",
  "agentName": "Sophia Bennett",
  "email": {
    "draftId": "clx...",
    "subject": "BloodstockAI x Tattersalls October Sale",
    "body": "Dear [Name]...",
    "recipient": "contact@highclere-racing.co.uk"
  },
  "source": "bloodstockai-hub",
  "timestamp": "2026-07-09T12:00:00.000Z"
}
```

### Node flow

```
Webhook
  -> Route by Type (Email / CRM / Partnership)
  -> IF approved === true  (CRITICAL - never skip)
  -> Email: Gmail Send -> Log Sophia -> Log Oliver (HubSpot CONTACTED)
  -> CRM: HubSpot Update -> Log Oliver
  -> Partnership: Gmail Send -> Log Victoria
  -> Respond { ok: true }
```

### HUB .env

```
N8N_WEBHOOK_SEND_APPROVED=/webhook/send-approved-emails
```

---

## Workflow 5: Approved Email Send (legacy reference)

Merged into Workflow 4 above.


## Workflow 5: CEO Daily Report

**Trigger:** Cron (8am weekdays) OR Webhook `/webhook/ceo-report`

```
[1] Trigger
     |
[2] HubSpot - Get all deals by stage
     |
[3] HubSpot - Get meetings this week
     |
[4] Claude - Generate executive summary
     |
[5] HTTP - Log (Evelyn Stone - CEO report ready)
     |
[6] Gmail - Send to office@agentbloodstockai.com (optional)
     |
[7] Respond with summary JSON
```

---

## Environment variables in n8n Cloud

In n8n: **Settings > Variables** (or Credentials)

| Variable | Description |
|----------|-------------|
| `HUB_URL` | Your HUB URL e.g. `https://your-app.vercel.app` or `http://localhost:3000` |
| `APOLLO_API_KEY` | Apollo.io API key |
| `CLAY_API_KEY` | Clay API key |
| `ANTHROPIC_API_KEY` | Claude API |
| `OPENAI_API_KEY` | OpenAI (optional) |
| `PERPLEXITY_API_KEY` | Perplexity (optional) |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot private app token |

### Credentials to connect in n8n

1. **HubSpot** - OAuth2 or Private App Token
2. **Gmail** - Google OAuth2 (Google Cloud Console)
3. **Google Calendar** - same Google project
4. **Apollo** - API key credential
5. **Anthropic** - Header auth API key

---

## Security rules (CRITICAL)

```
NEVER connect Gmail Send or HubSpot Update BEFORE approval.

Flow must be:
  Draft -> HUB Approval Queue -> Jesse approves -> Webhook send-approved -> Gmail Send
```

Add an **IF** node before every Gmail Send:
```
{{ $json.approved === true AND $json.approvedBy !== undefined }}
```

---

## Quick start checklist

- [ ] Log in to https://bloodstockai.app.n8n.cloud/
- [ ] Set `HUB_URL` variable in n8n
- [ ] Import workflow JSON from `n8n/workflow-send-approved.json`
- [ ] Import workflow JSON from `n8n/workflow-agent-command.json`
- [ ] Connect HubSpot credential
- [ ] Connect Apollo API key
- [ ] Connect Anthropic (Claude) credential
- [ ] Activate both workflows
- [ ] Test: click **Run Workflow** in the HUB dashboard
- [ ] Verify logs appear in `/terminal`

---

## Test commands (from HUB chat)

```
James, find 100 consignors in Ireland
Sophia, write follow-up emails for leads that opened but did not reply
Evelyn, give me today's CEO report
Oliver, show me all HubSpot deals in Meeting Booked
Victoria, find partnership opportunities with stud farms in Australia
```

Each command hits `/webhook/agent-command` and routes to the correct workflow.
