export default function UsagePage() {
  return (
    <article className="space-y-4 text-sm leading-relaxed text-bs-muted">
      <h1 className="text-3xl font-light text-bs-text">Usage Policy</h1>
      <p className="text-[12px]">Last updated: July 19, 2026</p>
      <p>
        This Usage Policy describes permitted and prohibited uses of Kuiper Agents Hub Center. Violations may
        result in suspension or termination.
      </p>
      <h2 className="text-lg font-medium text-bs-text">Allowed</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Legitimate business automation, research, drafting, and operations support</li>
        <li>Human-in-the-loop approvals for outbound communications</li>
        <li>Industry-specific agents (including equine/bloodstock) for lawful commercial use</li>
      </ul>
      <h2 className="text-lg font-medium text-bs-text">Prohibited</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Fraud, phishing, malware, or unauthorized access to systems</li>
        <li>Harassment, hate, exploitation of minors, or illegal content generation</li>
        <li>High-risk automated decisions without required human review where law demands it</li>
        <li>Scraping personal data without a lawful basis</li>
      </ul>
      <h2 className="text-lg font-medium text-bs-text">Fair use & rate limits</h2>
      <p>
        We may apply rate limits and fair-use controls to protect platform stability. Abuse of compute,
        webhooks, or bulk automation may be throttled.
      </p>
      <h2 className="text-lg font-medium text-bs-text">Reporting</h2>
      <p>Report abuse to hello@atomaiworks.com.</p>
    </article>
  );
}
