import { Header } from "@/components/layout/Header";
import { getLiveAgents } from "@/lib/agent-service";
import {
  AGENT_MONTHLY_USD,
  INTEGRATION_SETUP_FEE_USD,
  PREMIUM_SUPPORT_MONTHLY_USD,
  estimateMonthlyBill,
} from "@/lib/pricing";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const agents = await getLiveAgents();
  const bill = estimateMonthlyBill({
    agentCount: agents.length,
    connectedIntegrations: [],
    premiumSupport: false,
  });

  return (
    <>
      <Header
        title="Pricing & Billing"
        subtitle={`$${AGENT_MONTHLY_USD}/agent/mo + $${INTEGRATION_SETUP_FEE_USD} one-time integration · premium support optional`}
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6">
          <p className="text-[11px] uppercase tracking-wider text-bs-muted">Per agent</p>
          <p className="mt-2 text-4xl font-light text-bs-accent">${AGENT_MONTHLY_USD}</p>
          <p className="mt-1 text-sm text-bs-muted">/month · basic support included</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <p className="text-[11px] uppercase tracking-wider text-bs-muted">Integration setup</p>
          <p className="mt-2 text-4xl font-light text-bs-accent">${INTEGRATION_SETUP_FEE_USD}</p>
          <p className="mt-1 text-sm text-bs-muted">one-time systems connection fee</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <p className="text-[11px] uppercase tracking-wider text-bs-muted">Premium support</p>
          <p className="mt-2 text-4xl font-light text-bs-accent">${PREMIUM_SUPPORT_MONTHLY_USD}</p>
          <p className="mt-1 text-sm text-bs-muted">/month · monitoring & priority support</p>
        </div>
      </div>

      <div className="glass mb-8 max-w-xl rounded-2xl p-6">
        <p className="text-sm font-medium">Current workspace estimate</p>
        <p className="mt-2 text-3xl font-light">
          ${bill.total.toFixed(2)}
          <span className="text-base text-bs-muted">/mo</span>
        </p>
        <ul className="mt-4 space-y-2">
          {bill.lines.map((line) => (
            <li key={line.label} className="flex justify-between text-sm text-bs-muted">
              <span>{line.label}</span>
              <span className="text-bs-text">${line.amount.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-bs-muted">
          Plus one-time ${INTEGRATION_SETUP_FEE_USD} when systems are connected at signup/setup.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/agents" className="bs-btn-primary">
          Manage agents
        </Link>
        <Link href="/signup" className="bs-btn-ghost">
          Create new hub
        </Link>
      </div>
    </>
  );
}
