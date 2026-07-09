import { AGENT_CONFIG, mergeWithOfficialAgents } from "@/lib/agents/agent-config";
import { TERMINAL_LOGS } from "@/lib/terminal-logs";
import type { AgentRecord, AgentLogRecord, ApprovalCardRecord, LeadRecord } from "@/lib/supabase/types";

export const MOCK_DASHBOARD_METRICS = {
  activeAgents: AGENT_CONFIG.filter((a) => a.status !== "idle").length,
  pendingApprovals: 4,
  totalLeads: 50,
  pipelineValue: 742500,
} as const;

export function getStaticAgentRecords(): AgentRecord[] {
  return mergeWithOfficialAgents([]);
}

export function getMockTerminalLogs(): AgentLogRecord[] {
  return TERMINAL_LOGS.map((log, index) => ({
    id: `mock-log-${index}`,
    agent_slug: log.agent.toLowerCase().replace(/\s+/g, "-"),
    agent_name: log.agent,
    message: log.message,
    level: "info",
    created_at: new Date().toISOString(),
  }));
}

export function getMockApprovalCards(): ApprovalCardRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: "mock-approval-1",
      agent_name: "Sophia Bennett",
      action_type: "Email Draft",
      company: "Highclere Thoroughbred Racing",
      contact: "Sales Team",
      country: "UK",
      subject: "Auction outreach — 12 consignor leads",
      message_preview:
        "Dear [Name], I hope this finds you well ahead of the upcoming Tattersalls October Sale...",
      full_message:
        "Dear [Name],\n\nI hope this finds you well ahead of the upcoming Tattersalls October Sale. At BloodstockAI, we help consignors streamline lead research, CRM and personalized outreach.\n\nWould you be open to a brief call next week?\n\nBest regards,\nBloodstockAI Team",
      source_urls: [],
      expected_value: 25000,
      risk_level: "low",
      status: "pending",
      created_at: now,
    },
    {
      id: "mock-approval-2",
      agent_name: "Sophia Bennett",
      action_type: "Email Draft",
      company: "Opened-but-no-reply leads",
      contact: "Follow-up batch",
      country: "UK",
      subject: "Follow-up for opened-but-no-reply leads",
      message_preview: "Hi [Name], I wanted to follow up on my previous note regarding BloodstockAI...",
      full_message:
        "Hi [Name], I wanted to follow up on my previous note regarding BloodstockAI and how we support consignors ahead of auction season.",
      source_urls: [],
      expected_value: 15000,
      risk_level: "low",
      status: "pending",
      created_at: now,
    },
    {
      id: "mock-approval-3",
      agent_name: "Oliver Brooks",
      action_type: "CRM Update",
      company: "HubSpot Pipeline",
      contact: "Ethan Walker",
      country: "UK",
      subject: "Move 5 deals to Meeting Booked",
      message_preview: "Deals: Highclere Racing, Coolmore Outreach, Goffs Partnership...",
      full_message:
        "HubSpot pipeline update based on Ethan Walker warm lead flags — move 5 deals to Meeting Booked.",
      source_urls: [],
      expected_value: 75000,
      risk_level: "medium",
      status: "pending",
      created_at: now,
    },
    {
      id: "mock-approval-4",
      agent_name: "Victoria Green",
      action_type: "Partnership Message",
      company: "Australian stud farm partnership",
      contact: "Partnerships",
      country: "Australia",
      subject: "Australian stud farm partnership proposal",
      message_preview:
        "Dear [Name], BloodstockAI is exploring strategic partnerships with leading stud farms in Australia...",
      full_message:
        "Dear [Name], BloodstockAI is exploring strategic partnerships with leading stud farms in Australia ahead of the Magic Millions sale season.",
      source_urls: [],
      expected_value: 50000,
      risk_level: "medium",
      status: "pending",
      created_at: now,
    },
  ];
}

export function getMockLeads(): LeadRecord[] {
  const rows = [
    { company: "Highclere Thoroughbred Racing", contact: "James Henderson", country: "UK", segment: "Consignor", stage: "meeting_booked", value: 45000 },
    { company: "Coolmore Stud", contact: "Partnerships Desk", country: "Ireland", segment: "Stud Farm", stage: "replied", value: 62000 },
    { company: "Tattersalls", contact: "Commercial Team", country: "UK", segment: "Auction House", stage: "proposal_sent", value: 85000 },
    { company: "Goffs", contact: "Bloodstock Team", country: "Ireland", segment: "Auction House", stage: "contacted", value: 38000 },
    { company: "Darley Stud", contact: "Racing Office", country: "UK", segment: "Stud Farm", stage: "opened", value: 41000 },
    { company: "Keeneland Association", contact: "Sales Team", country: "USA", segment: "Auction House", stage: "researched", value: 52000 },
    { company: "Magic Millions", contact: "Partnerships", country: "Australia", segment: "Auction House", stage: "waiting_approval", value: 47000 },
    { company: "Fasig-Tipton", contact: "Consignor Relations", country: "USA", segment: "Consignor", stage: "new_lead", value: 29000 },
  ];

  return rows.map((row, index) => ({
    id: `mock-lead-${index + 1}`,
    company_name: row.company,
    contact_name: row.contact,
    email: `contact@${row.company.toLowerCase().replace(/\s+/g, "")}.com`,
    phone: null,
    website: `https://${row.company.toLowerCase().replace(/\s+/g, "")}.com`,
    country: row.country,
    segment: row.segment,
    stage: row.stage as LeadRecord["stage"],
    value: row.value,
    source: "mock",
    notes: "Premium mock lead — configure Supabase for live data.",
    created_at: new Date().toISOString(),
  }));
}

export const MOCK_PIPELINE_DATA = [
  { stage: "NEW_LEAD", count: 8, value: 120000 },
  { stage: "RESEARCHED", count: 7, value: 105000 },
  { stage: "CONTACT_DRAFTED", count: 6, value: 90000 },
  { stage: "CONTACTED", count: 6, value: 96000 },
  { stage: "OPENED", count: 5, value: 75000 },
  { stage: "REPLIED", count: 5, value: 110000 },
  { stage: "MEETING_BOOKED", count: 4, value: 120000 },
  { stage: "PROPOSAL_SENT", count: 4, value: 140000 },
  { stage: "WON", count: 5, value: 175000 },
] as const;
