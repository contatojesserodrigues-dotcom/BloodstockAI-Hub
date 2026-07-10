import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

export default function Privacy() {
  const sections = [
    {
      title: "1. WHO WE ARE",
      content: `BloodstockAI LTD is registered in England and Wales (Company No: 16857741). We are the data controller for your personal data.\n\nIRE Office: Naas Town Centre, Sallins Road, Naas, Kildare, Ireland, W91 KV4H.\nUSA Office: 217 SE 1st Avenue Suite 200, Ocala, FL 34471, United States.\n\nBloodstockAI operates globally and serves users in the UK, European Union, United States, Australia, New Zealand, and other jurisdictions. We comply with the UK GDPR, EU GDPR, the California Consumer Privacy Act (CCPA), the Australian Privacy Act 1988, and the New Zealand Privacy Act 2020.\n\nFor any privacy-related questions, contact us at: office@agentbloodstockai.com`
    },
    {
      title: "2. WHAT DATA WE COLLECT",
      subsections: [
        {
          subtitle: "Account Data",
          items: [
            "First name, last name and email address",
            "Company name and VAT number (Professional accounts)",
            "Password (stored encrypted, never readable)",
            "Account type (Personal or Professional)"
          ]
        },
        {
          subtitle: "Payment Data",
          items: [
            "Transaction ID and payment status via Revolut",
            "Billing country and VAT rate applied",
            "We do NOT store full card details — payments are processed securely by Revolut"
          ]
        },
        {
          subtitle: "Usage Data",
          items: [
            "Analyses performed and features used",
            "PDF reports generated and downloaded",
            "Login timestamps and session data",
            "Browser type, device type and IP address"
          ]
        },
        {
          subtitle: "Uploaded Content",
          items: [
            "PDF files uploaded for analysis (catalogs, pedigrees, race records)",
            "These are processed and then deleted within 30 days of upload"
          ]
        }
      ]
    },
    {
      title: "3. HOW WE USE YOUR DATA",
      items: [
        "Provide and improve the BloodstockAI platform",
        "Process payments and manage subscriptions",
        "Send transactional emails (receipts, reports)",
        "Send newsletter updates (only with your consent)",
        "Calculate and apply correct VAT rates",
        "Comply with legal and regulatory obligations",
        "Prevent fraud and ensure platform security"
      ]
    },
    {
      title: "4. LEGAL BASIS FOR PROCESSING",
      content: "We process your data under the following legal bases (UK GDPR & EU GDPR Article 6):",
      items: [
        "Contract: to provide the service you signed up for",
        "Legal obligation: for tax and VAT compliance",
        "Legitimate interest: for security and fraud prevention",
        "Consent: for marketing emails and newsletters"
      ],
      footer: "For users in the United States: We do not sell your personal information as defined under the CCPA. California residents may exercise their right to know, delete, and opt-out by contacting us. For users in Australia and New Zealand: We comply with the Australian Privacy Principles (APPs) and the New Zealand Information Privacy Principles (IPPs) respectively."
    },
    {
      title: "5. HOW LONG WE KEEP YOUR DATA",
      items: [
        "Account data: for the duration of your account plus 3 years after closure",
        "Payment records: 7 years (UK tax law requirement)",
        "Uploaded PDFs: deleted within 30 days of upload",
        "Analysis results: kept while your account is active",
        "Newsletter data: until you unsubscribe"
      ]
    },
    {
      title: "6. WHO WE SHARE YOUR DATA WITH",
      content: "We only share your data with:",
      items: [
        "Revolut: for payment processing",
        "Supabase: for secure database hosting",
        "AI Services: for analysis processing and research data retrieval",
        "Resend: for transactional email delivery"
      ],
      footer: "We do NOT sell your data to any third party. All processors are bound by strict data processing agreements."
    },
    {
      title: "7. YOUR RIGHTS",
      content: "Under UK GDPR, EU GDPR, CCPA, Australian Privacy Act, and NZ Privacy Act, you have the right to:",
      items: [
        "Access your personal data",
        "Correct inaccurate data",
        "Delete your data (\"right to be forgotten\")",
        "Restrict or object to processing",
        "Export your data (data portability)",
        "Withdraw consent at any time",
        "Opt-out of the sale of personal information (CCPA — though we do not sell data)",
        "Lodge a complaint with a supervisory authority in your jurisdiction"
      ],
      footer: "To exercise any of these rights, email: office@agentbloodstockai.com — We will respond within 30 days (or sooner where required by local law). UK/EU users may also contact the UK ICO (ico.org.uk) or their local EU Data Protection Authority. Australian users may contact the OAIC (oaic.gov.au). New Zealand users may contact the OPC (privacy.org.nz)."
    },
    {
      title: "8. COOKIES",
      content: "We use essential cookies to keep you logged in and remember your preferences. We do not use advertising or tracking cookies. You can disable cookies in your browser settings but this may affect platform functionality."
    },
    {
      title: "9. DATA SECURITY",
      content: "We protect your data using:",
      items: [
        "SSL/TLS encryption for all data in transit",
        "Encrypted storage for all data at rest",
        "Strict access controls and authentication",
        "Regular security reviews and monitoring"
      ]
    },
    {
      title: "10. ANALYSIS CONFIDENTIALITY & DATA RETENTION",
      content: "All analyses performed on the BloodstockAI platform — including auction catalogue analysis, breeze-up and conformation video analysis, pedigree reports, mating recommendations, stallion finder results, broodmare plans, and any other generated reports — are strictly confidential and exclusive to the user who commissioned them.\n\nBloodstockAI does not store, retain, log, or share the content of any analysis or report generated on the platform. Once a session ends, no analysis data, uploaded files, horse information, or generated reports are saved to our systems.\n\nSpecifically:",
      items: [
        "Uploaded PDFs, videos, images, and documents are processed in real time and are not stored after the analysis is complete.",
        "Generated reports are accessible only to the user during the active session and are not retained on our servers.",
        "Horse names, pedigree data, valuation information, and any other input provided by the user during an analysis are not logged, recorded, or accessible by BloodstockAI or any third party.",
        "No analysis content is used to train models, improve algorithms, or shared for any commercial purpose."
      ],
      footer: "Each analysis belongs entirely to the user who requested it. BloodstockAI operates as a processing tool — not a data warehouse. Your strategies, assessments, and decisions remain yours alone."
    },
    {
      title: "11. CHANGES TO THIS POLICY",
      content: "We may update this policy from time to time. We will notify you by email of any significant changes. Continued use of BloodstockAI after changes constitutes acceptance."
    },
    {
      title: "12. CONTACT US",
      content: "For any privacy questions or concerns:\nEmail: office@agentbloodstockai.com\nWebsite: agentbloodstockai.com\n\nIRE Office: Naas Town Centre, Sallins Road, Naas, Kildare, Ireland, W91 KV4H.\nUSA Office: 217 SE 1st Avenue Suite 200, Ocala, FL 34471, United States.\n\nSupervisory Authorities:\n• UK: Information Commissioner's Office — ico.org.uk | 0303 123 1113\n• EU: Your local Data Protection Authority\n• Australia: Office of the Australian Information Commissioner — oaic.gov.au\n• New Zealand: Office of the Privacy Commissioner — privacy.org.nz\n• USA (California): California Attorney General — oag.ca.gov"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Privacy Policy — BloodstockAI"
        description="How BloodstockAI collects, uses and safeguards your data across our thoroughbred analysis platform."
        path="/privacy"
      />
      <Header />
      <main className="flex-1 pt-16">
        <section className="py-20 px-4 sm:px-6">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-luxury">
              Privacy Policy
            </h1>
            <p className="text-sm text-secondary mb-2">Last updated: March 2026</p>
            <p className="text-xs text-muted-foreground/60 mb-1">Applicable jurisdictions: UK, EU, USA, Australia, New Zealand & International</p>
            <div className="w-16 h-px bg-gradient-to-r from-secondary to-transparent mb-8" />

            <p className="text-muted-foreground mb-8 leading-relaxed">
              BloodstockAI Ltd ("BloodstockAI", "we", "us", or "our") is committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform at agentbloodstockai.com.
            </p>
            <p className="text-muted-foreground mb-10 leading-relaxed">
              This policy complies with the UK General Data Protection Regulation (UK GDPR), the EU General Data Protection Regulation (EU GDPR), the California Consumer Privacy Act (CCPA), the Australian Privacy Act 1988, and the New Zealand Privacy Act 2020.
            </p>

            <div className="space-y-10">
              {sections.map((section, i) => (
                <div key={i}>
                  <h2 className="text-lg font-bold text-secondary mb-4 tracking-wide">{section.title}</h2>
                  {section.content && (
                    <p className="text-muted-foreground leading-relaxed mb-3 whitespace-pre-line">{section.content}</p>
                  )}
                  {section.subsections && section.subsections.map((sub, j) => (
                    <div key={j} className="mb-4">
                      <h3 className="text-sm font-semibold text-foreground mb-2">{sub.subtitle}</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                        {sub.items.map((item, k) => <li key={k}>{item}</li>)}
                      </ul>
                    </div>
                  ))}
                  {section.items && !section.subsections && (
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                      {section.items.map((item, k) => <li key={k}>{item}</li>)}
                    </ul>
                  )}
                  {section.footer && (
                    <p className="text-muted-foreground leading-relaxed mt-3 text-sm">{section.footer}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
