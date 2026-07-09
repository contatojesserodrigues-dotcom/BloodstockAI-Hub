export const PIPELINE_STAGES = [
  { key: "NEW_LEAD", label: "New Lead" },
  { key: "RESEARCHED", label: "Researched" },
  { key: "CONTACT_DRAFTED", label: "Contact Drafted" },
  { key: "CONTACT_APPROVED", label: "Contact Approved" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "OPENED", label: "Opened" },
  { key: "REPLIED", label: "Replied" },
  { key: "MEETING_BOOKED", label: "Meeting Booked" },
  { key: "PROPOSAL_SENT", label: "Proposal Sent" },
  { key: "NEGOTIATION", label: "Negotiation" },
  { key: "WON", label: "Won" },
  { key: "LOST", label: "Lost" },
] as const;
