import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

export default function Terms() {
  const sections = [
    {
      title: "1. ABOUT BLOODSTOCKAI",
      content: "BloodstockAI Ltd (\"BloodstockAI\", \"we\", \"us\") operates an AI-powered bloodstock analysis platform at agentbloodstockai.com.\n\nRegistered in England and Wales — Company No: 16857741.\nIRE Office: Naas Town Centre, Sallins Road, Naas, Kildare, Ireland, W91 KV4H.\nUSA Office: 217 SE 1st Avenue Suite 200, Ocala, FL 34471, United States.\nContact: office@agentbloodstockai.com\n\nBloodstockAI operates globally and serves clients in the United Kingdom, European Union, United States, Australia, New Zealand, Japan, and other jurisdictions where thoroughbred racing and bloodstock commerce is conducted."
    },
    {
      title: "2. ACCEPTANCE OF TERMS",
      content: "By creating an account or purchasing any plan, regardless of your country of residence, you confirm that:",
      items: [
        "You are at least 18 years of age",
        "You have the legal capacity to enter contracts",
        "You agree to these Terms of Service in full",
        "You agree to our Privacy Policy",
        "You understand these Terms are governed by the laws of England and Wales, with additional protections afforded under the EU GDPR, US consumer protection laws, and the Australian Consumer Law where applicable"
      ]
    },
    {
      title: "3. OUR SERVICES",
      content: "BloodstockAI provides:",
      items: [
        "AI-powered horse pedigree analysis",
        "Mating and breeding recommendations",
        "Market value estimates and insights",
        "Auction catalog analysis",
        "Professional PDF report generation",
        "AI Assistant for bloodstock queries"
      ]
    },
    {
      title: "4. IMPORTANT DISCLAIMER — AI ANALYSIS",
      content: "BloodstockAI analyses are generated using artificial intelligence and are provided FOR INFORMATIONAL PURPOSES ONLY.",
      subsections: [
        {
          subtitle: "Our analyses are NOT:",
          items: [
            "Professional veterinary advice",
            "Financial investment advice",
            "Guaranteed predictions of performance",
            "A substitute for expert human opinion"
          ]
        }
      ],
      footer: "All investment and breeding decisions are made entirely at your own risk. BloodstockAI accepts no liability for decisions made based on our analysis. Market valuations are estimates only and may not reflect actual sale prices. Past performance data does not guarantee future results."
    },
    {
      title: "5. SUBSCRIPTION PLANS AND PAYMENTS",
      subsections: [
        {
          subtitle: "5.1 Plans and Pricing",
          items: [
            "Free Plan: 3 analyses (lifetime total)",
            "Extra Credits: $49 for 3 additional analyses",
            "Starter Plan: $99/month — 100 analyses",
            "Professional Plan: $399/month — 1,000 analyses, 2 catalogue uploads/month",
            "Enterprise: Custom pricing"
          ]
        },
        {
          subtitle: "5.2 Billing",
          items: [
            "Subscriptions are billed monthly in advance",
            "Payments are processed securely via Revolut",
            "VAT is applied based on your country of residence",
            "Business customers may apply VAT reverse charge with a valid VAT number"
          ]
        },
        {
          subtitle: "5.3 Cancellation",
          items: [
            "You may cancel your subscription at any time",
            "Cancellation takes effect at the end of the current billing period",
            "No partial refunds for unused analyses"
          ]
        },
        {
          subtitle: "5.4 Refund Policy",
          items: [
            "No refunds are available for any payments made, including single analyses, monthly subscriptions, or extra credit purchases",
            "Due to the nature of our service — which relies on significant internal costs including AI tokens, API infrastructure, and real-time data processing — all payments are final and non-refundable",
            "You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period and no further charges will be made",
            "For clients seeking more personalised, in-depth analysis beyond the platform's standard capabilities, BloodstockAI offers bespoke consultancy services with dedicated support — contact us at office@agentbloodstockai.com for tailored packages"
          ],
          footer: "By purchasing any plan or analysis, you acknowledge and accept that no refunds will be issued under any circumstances, except where required by mandatory consumer protection law in your jurisdiction."
        },
        {
          subtitle: "5.5 Analysis Limits",
          items: [
            "Unused analyses do not roll over to the next month",
            "Single Analysis access expires after 7 days",
            "We reserve the right to monitor usage for abuse of unlimited features"
          ]
        }
      ]
    },
    {
      title: "6. ACCEPTABLE USE",
      content: "You agree NOT to:",
      items: [
        "Use BloodstockAI for any unlawful purpose",
        "Attempt to reverse engineer our algorithms",
        "Scrape, copy or redistribute our data",
        "Share your account credentials with others",
        "Upload malicious files or content",
        "Attempt to circumvent usage limits",
        "Misrepresent our analysis as professional advice"
      ],
      footer: "We reserve the right to suspend or terminate accounts that violate these terms without refund."
    },
    {
      title: "7. INTELLECTUAL PROPERTY",
      content: "All content on BloodstockAI including algorithms, reports, designs and text is owned by BloodstockAI Ltd and protected by copyright law.\n\nReports generated for your account are licensed to you for personal or business use only. You may not resell or redistribute our reports without written permission."
    },
    {
      title: "8. THIRD PARTY SERVICES",
      content: "Our platform uses third-party services including Revolut (payments) and cloud infrastructure providers.\n\nWe are not responsible for the availability or accuracy of third-party data sources. Horse performance data is sourced from public databases and may not be complete."
    },
    {
      title: "9. LIMITATION OF LIABILITY",
      content: "To the maximum extent permitted by law:",
      items: [
        "BloodstockAI's total liability is limited to the amount you paid in the last 3 months",
        "We are not liable for indirect, consequential or incidental losses",
        "We are not liable for losses from breeding or investment decisions based on our analysis",
        "We are not liable for data loss caused by third-party service outages"
      ],
      footer: "Nothing in these terms excludes or limits liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded under applicable law, including mandatory consumer protections under UK, EU, US, Australian, or New Zealand law."
    },
    {
      title: "10. CHANGES TO THE SERVICE",
      content: "We reserve the right to:",
      items: [
        "Modify or discontinue features with notice",
        "Update pricing with 30 days advance notice",
        "Update these Terms with 14 days notice",
        "Terminate the service with 30 days notice"
      ]
    },
    {
      title: "11. BLOODSTOCK ADVISORY SERVICES",
      content: "BloodstockAI provides bloodstock advisory services including but not limited to single horse analysis reports, broodmare breeding plans, acquisition strategy, and market valuation. These services are provided on a consultancy basis.",
      subsections: [
        {
          subtitle: "Nature of advice",
          items: [
            "All analysis, reports, and recommendations produced by BloodstockAI are provided for informational purposes only and constitute expressions of professional opinion based on available data.",
            "They do not constitute financial, legal, or investment advice. BloodstockAI accepts no liability for decisions made by clients on the basis of its analysis."
          ]
        },
        {
          subtitle: "No guarantee of outcome",
          items: [
            "Past performance data and pedigree analysis do not guarantee future performance.",
            "Market valuations are estimates based on comparable sales data and are not binding appraisals."
          ]
        },
        {
          subtitle: "Report delivery",
          items: [
            "Single Horse Analysis reports and Broodmare Plans are delivered digitally as PDF documents.",
            "Delivery timelines are estimates only (typically 24–48 hours) and may vary.",
            "Reports are non-refundable once delivered."
          ]
        },
        {
          subtitle: "Jurisdiction",
          items: [
            "Advisory services are offered to clients globally. Nothing in these terms limits the statutory rights of consumers in their country of residence.",
            "Clients based in the European Union retain all rights afforded under EU consumer protection legislation, including Directive 2011/83/EU on consumer rights.",
            "Clients based in the United Kingdom are subject to the Consumer Rights Act 2015 and the Consumer Contracts Regulations 2013.",
            "Clients based in Australia are afforded protections under the Australian Consumer Law (Schedule 2, Competition and Consumer Act 2010).",
            "Clients based in the United States should note that BloodstockAI does not provide investment advice as defined under U.S. securities laws and no advisory relationship under U.S. law is created by the use of our services."
          ]
        }
      ]
    },
    {
      title: "12. SALES — PLATFORM TERMS",
      content: "The Sales section of the BloodstockAI platform (the \"Marketplace\") provides a listing service enabling prospective buyers to submit expressions of interest (\"offers\") on horses listed by BloodstockAI on behalf of vendors.",
      subsections: [
        {
          subtitle: "Listing fee and analysis report",
          items: [
            "Each horse listed on the Marketplace is subject to a listing and analysis fee of £270 per lot.",
            "This fee covers a complete AI-generated analysis report including full pedigree assessment, performance evaluation, and market valuation, prepared by BloodstockAI prior to or upon listing.",
            "This fee is payable by the vendor and is non-refundable once the report has been delivered and the listing published.",
            "Listing is subject to approval by BloodstockAI at its sole discretion."
          ]
        },
        {
          subtitle: "Commission on sale",
          items: [
            "In addition to the listing fee, BloodstockAI charges a commission of 3% of the gross sale price upon the successful completion of a sale facilitated through the Marketplace.",
            "This commission is payable by the vendor upon confirmation of sale.",
            "For the avoidance of doubt, no commission is payable if a sale is not completed."
          ]
        },
        {
          subtitle: "Nature of offers",
          items: [
            "Offers submitted through the Marketplace are non-binding expressions of interest and do not constitute a legally binding contract of sale.",
            "No contract of sale is formed until the vendor and buyer have entered into a separate written agreement.",
            "BloodstockAI is not a party to any transaction between vendor and buyer and accepts no liability for the failure of any transaction to complete."
          ]
        },
        {
          subtitle: "Vendor representations",
          items: [
            "The vendor is the legal owner of the horse or is duly authorised to offer it for sale.",
            "All information provided is accurate and not misleading.",
            "The horse is free from any undisclosed encumbrances, liens, or third-party claims."
          ]
        },
        {
          subtitle: "Buyer representations",
          items: [
            "By submitting an offer, the buyer confirms that the offer is a genuine expression of interest made in good faith."
          ]
        },
        {
          subtitle: "No auctioneer relationship",
          items: [
            "BloodstockAI does not hold a licence as an auctioneer in any jurisdiction.",
            "The Marketplace is a private treaty listing platform and does not constitute a public auction.",
            "BloodstockAI acts as a marketing intermediary only."
          ]
        },
        {
          subtitle: "International compliance",
          items: [
            "The Marketplace accepts listings and offers from vendors and buyers globally.",
            "Transactions between parties in different jurisdictions are subject to the laws of the country in which the vendor is resident unless otherwise agreed in writing between the parties.",
            "Vendors and buyers in the EU, UK, Australia, and United States are responsible for compliance with applicable local laws governing the private sale of animals, including veterinary certification, import/export regulations, and consumer protection obligations applicable in their jurisdiction.",
            "BloodstockAI accepts no responsibility for compliance with such requirements."
          ]
        },
        {
          subtitle: "Data and privacy",
          items: [
            "Contact details submitted through offer forms (name, telephone number, email address) are shared with the relevant vendor for the sole purpose of facilitating the transaction.",
            "By submitting an offer, buyers consent to this disclosure.",
            "BloodstockAI will not use buyer contact details for any other marketing purpose without express consent."
          ]
        }
      ]
    },
    {
      title: "13. GOVERNING LAW",
      content: "These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.\n\nHowever, if you are a consumer located in the European Union, you retain the benefit of any mandatory consumer protection provisions in your country of residence. If you are located in Australia or New Zealand, nothing in these terms excludes, restricts or modifies any consumer guarantee, right or remedy conferred under the Australian Consumer Law (Schedule 2 of the Competition and Consumer Act 2010) or the New Zealand Consumer Guarantees Act 1993. If you are located in the United States, you retain any non-waivable rights under applicable federal or state consumer protection laws."
    },
    {
      title: "14. CONTACT",
      content: "For any questions regarding these Terms:\nEmail: office@agentbloodstockai.com\nWebsite: agentbloodstockai.com\n\nIRE Office: Naas Town Centre, Sallins Road, Naas, Kildare, Ireland, W91 KV4H.\nUSA Office: 217 SE 1st Avenue Suite 200, Ocala, FL 34471, United States."
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Terms of Service — BloodstockAI"
        description="The legal terms governing use of the BloodstockAI thoroughbred analysis platform."
        path="/terms"
      />
      <Header />
      <main className="flex-1 pt-16">
        <section className="py-20 px-4 sm:px-6">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-luxury">
              Terms of Service
            </h1>
            <p className="text-sm text-secondary mb-2">Last updated: March 2026</p>
            <p className="text-xs text-muted-foreground/60 mb-1">Applicable jurisdictions: UK, EU, USA, Australia, New Zealand & International</p>
            <div className="w-16 h-px bg-gradient-to-r from-secondary to-transparent mb-8" />

            <p className="text-muted-foreground mb-10 leading-relaxed">
              Please read these Terms of Service carefully before using BloodstockAI. By accessing or using our platform, you agree to be bound by these terms.
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
