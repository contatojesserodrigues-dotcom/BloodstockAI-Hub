export default function LicensePage() {
  return (
    <article className="space-y-4 text-sm leading-relaxed text-bs-muted">
      <h1 className="text-3xl font-light text-bs-text">License Terms</h1>
      <p className="text-[12px]">Last updated: July 19, 2026</p>
      <p>
        Atom AI Works grants you a limited, non-exclusive, non-transferable, revocable license to access
        Kuiper Agents Hub Center for your internal business or personal use during an active subscription.
      </p>
      <h2 className="text-lg font-medium text-bs-text">1. What you may do</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Configure and run AI agents within your organization workspace</li>
        <li>Connect approved integrations you are authorized to use</li>
        <li>Export your own content and outputs where the product allows</li>
      </ul>
      <h2 className="text-lg font-medium text-bs-text">2. What you may not do</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Resell, sublicense, or white-label Kuiper without a written agreement</li>
        <li>Reverse engineer, scrape, or circumvent access controls</li>
        <li>Remove proprietary notices or misuse Atom AI Works / Kuiper branding</li>
      </ul>
      <h2 className="text-lg font-medium text-bs-text">3. Ownership</h2>
      <p>
        The Platform, software, models orchestration layer, and brand assets remain property of Atom AI Works
        and its licensors. Customer content remains yours, subject to the Privacy Policy and necessary processing rights.
      </p>
      <h2 className="text-lg font-medium text-bs-text">4. Third-party models & tools</h2>
      <p>
        LLM providers and integrations (e.g. OpenAI, Anthropic, HubSpot, n8n) are licensed under their own terms.
        Your use of those services must comply with their agreements.
      </p>
    </article>
  );
}
