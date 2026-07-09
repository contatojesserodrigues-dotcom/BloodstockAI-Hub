-- BloodstockAI Operations Hub — Full Supabase Migration
-- Run in Supabase SQL Editor

create extension if not exists "pgcrypto";

-- ─── Enums as check constraints via text columns ───

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  role text not null,
  department text not null,
  room text,
  bio text,
  status text not null default 'idle',
  current_task text,
  last_action text,
  tools jsonb not null default '[]'::jsonb,
  avatar_color text default '#8B1538',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade,
  agent_slug text not null,
  title text not null,
  description text,
  command text,
  status text not null default 'pending',
  priority text default 'medium',
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists agent_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete set null,
  agent_slug text not null,
  agent_name text not null,
  message text not null,
  level text not null default 'info',
  created_at timestamptz not null default now()
);

create table if not exists approval_cards (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete set null,
  agent_name text not null,
  action_type text not null default 'outreach_email',
  company text,
  contact text,
  country text,
  subject text,
  message_preview text,
  full_message text,
  source_urls jsonb default '[]'::jsonb,
  expected_value numeric default 0,
  risk_level text default 'medium',
  status text not null default 'pending',
  lead_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete set null,
  agent_slug text,
  role text not null,
  content text not null,
  command text,
  created_at timestamptz not null default now()
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  country text,
  city text,
  segment text,
  description text,
  source_urls jsonb default '[]'::jsonb,
  confidence_score numeric(5,4) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text,
  email text,
  phone text,
  title text,
  linkedin_url text,
  contact_page text,
  decision_makers text,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  country text,
  segment text,
  stage text not null default 'new_lead',
  value numeric default 0,
  source text default 'tavily',
  notes text,
  source_urls jsonb default '[]'::jsonb,
  auction_relevance text,
  confidence_score numeric(5,4) default 0,
  status text default 'researched',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft',
  sent int default 0,
  opened int default 0,
  replied int default 0,
  created_at timestamptz not null default now()
);

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  attendee text,
  datetime timestamptz not null,
  status text default 'scheduled',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists sales_pipeline (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  value numeric default 0,
  stage text not null default 'new_lead',
  lead_id uuid references leads(id) on delete set null,
  owner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  level text default 'info',
  read boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists agent_memory (
  id uuid primary key default gen_random_uuid(),
  agent_slug text not null,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agent_slug, key)
);

create table if not exists provider_configs (
  id uuid primary key default gen_random_uuid(),
  provider text unique not null,
  enabled boolean default false,
  model text,
  updated_at timestamptz not null default now()
);

create table if not exists tool_connections (
  id uuid primary key default gen_random_uuid(),
  provider text unique not null,
  label text not null,
  connected boolean default false,
  config jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_agents_slug on agents(slug);
create index if not exists idx_agent_logs_created on agent_logs(created_at desc);
create index if not exists idx_agent_tasks_status on agent_tasks(status);
create index if not exists idx_approval_cards_status on approval_cards(status);
create index if not exists idx_leads_stage on leads(stage);
create index if not exists idx_leads_created on leads(created_at desc);
create index if not exists idx_conversations_created on conversations(created_at desc);
create index if not exists idx_sales_pipeline_stage on sales_pipeline(stage);

-- Realtime (run after tables exist)
alter publication supabase_realtime add table agent_logs;
alter publication supabase_realtime add table approval_cards;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table agent_tasks;
