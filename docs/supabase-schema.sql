-- BloodstockAI Hub — Supabase schema for Tavily lead intelligence
-- Run in Supabase SQL Editor: https://supabase.com/dashboard

create extension if not exists "pgcrypto";

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  country text,
  city text,
  segment text,
  description text,
  source_urls jsonb default '[]'::jsonb,
  confidence_score numeric(4,3) default 0,
  created_at timestamptz default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text,
  email text,
  phone text,
  linkedin_url text,
  contact_page text,
  decision_makers text,
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  company_name text not null,
  country text,
  segment text,
  email text,
  phone text,
  website text,
  status text default 'researched',
  confidence_score numeric(4,3) default 0,
  source_urls jsonb default '[]'::jsonb,
  auction_relevance text,
  created_at timestamptz default now()
);

create table if not exists agent_logs (
  id uuid primary key default gen_random_uuid(),
  agent_slug text not null,
  agent_name text not null,
  message text not null,
  level text default 'info',
  created_at timestamptz default now()
);

create table if not exists approval_cards (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  action_type text not null default 'outreach_email',
  company text not null,
  contact text,
  country text,
  subject text,
  message_preview text,
  full_message text,
  source_urls jsonb default '[]'::jsonb,
  expected_value numeric default 0,
  risk_level text default 'medium',
  status text default 'pending',
  created_at timestamptz default now()
);

create index if not exists idx_leads_company_name on leads(company_name);
create index if not exists idx_agent_logs_created_at on agent_logs(created_at desc);
create index if not exists idx_approval_cards_status on approval_cards(status);
