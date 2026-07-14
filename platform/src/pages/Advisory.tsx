import { useState, type FormEvent } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  MessageCircle,
  Phone,
  Calendar as CalendarIcon,
  Globe2,
  ShieldCheck,
  Brain,
  Compass,
  Network,
  Lock,
  LineChart,
  Sparkles,
  ArrowRight,
  MapPin,
  Loader2,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const EMAIL = "office@agentbloodstockai.com";
const PHONE = "+44 7533 314408";
const WHATSAPP_URL = "https://wa.me/447533314408";

const advisoryServices = [
  {
    title: "Purchase Advisory",
    desc: "Helping clients source exceptional horses worldwide.",
    items: [
      "Yearlings",
      "Breeze-Up Horses",
      "Horses in Training",
      "National Hunt Horses",
      "Broodmares",
      "Foals",
      "Stallion Prospects",
      "Private Purchases",
      "International Sourcing",
    ],
  },
  {
    title: "Sales Advisory",
    desc: "Helping vendors maximise commercial value.",
    items: [
      "Auction strategy",
      "Vendor advice",
      "Reserve recommendations",
      "Commercial positioning",
      "Marketing",
      "Buyer targeting",
      "Private negotiations",
    ],
  },
  {
    title: "Auction Representation",
    desc: "Complete representation before, during and after public auctions.",
    items: [
      "Inspection",
      "Shortlisting",
      "Bidding",
      "Negotiation",
      "Purchase management",
      "Vendor representation",
    ],
  },
  {
    title: "AI Performance Analysis",
    desc: "Powered by BloodstockAI.",
    items: [
      "Breeze-Up Analysis",
      "Training Analysis",
      "Performance Analysis",
      "Visual Analysis",
      "Sale Inspection",
      "Biomechanics",
      "Stride Analytics",
      "Commercial Valuation",
      "ROI Projections",
    ],
  },
  {
    title: "Sale Inspection",
    desc: "Professional inspection before purchase.",
    items: [
      "Conformation",
      "Commercial faults",
      "Movement analysis",
      "Biomechanics",
      "Market valuation",
      "Risk assessment",
      "Veterinary recommendations",
    ],
  },
  {
    title: "Stallion Advisory",
    desc: "Helping breeders select commercially competitive stallions.",
    items: [
      "Nick analysis",
      "Pedigree compatibility",
      "Commercial rankings",
      "ROI projections",
      "Genetic compatibility",
      "Breeding strategy",
    ],
  },
  {
    title: "Broodmare Advisory",
    desc: "Helping breeders build stronger broodmare families.",
    items: [
      "Broodmare evaluation",
      "Commercial planning",
      "Future breeding strategy",
      "Young broodmare selection",
      "Mating recommendations",
    ],
  },
  {
    title: "Mating Plans",
    desc: "AI-powered mating recommendations combining pedigree analysis, commercial trends and biomechanical compatibility.",
    items: [],
  },
  {
    title: "Bloodstock Investment Advisory",
    desc: "Helping owners and investors build successful bloodstock portfolios.",
    items: [
      "Investment strategy",
      "Portfolio diversification",
      "Risk analysis",
      "Commercial forecasting",
      "Private opportunities",
    ],
  },
  {
    title: "Private Sales",
    desc: "Confidential buying and selling worldwide.",
    items: [],
  },
  {
    title: "International Horse Sourcing",
    desc: "If your ideal horse is not publicly available, our worldwide network can source opportunities privately across leading racing jurisdictions.",
    items: [
      "Europe",
      "United Kingdom",
      "Ireland",
      "United States",
      "Australia",
      "Japan",
      "New Zealand",
      "South Africa",
      "Middle East",
      "South America",
    ],
  },
  {
    title: "Bloodstock Concierge",
    desc: "Exclusive personalised service.",
    items: [
      "Worldwide travel planning",
      "Auction attendance",
      "Veterinary coordination",
      "Radiographs & Endoscopy",
      "Shipping",
      "Insurance",
      "Export documentation",
      "Post-sale management",
      "Trainer introductions",
      "Stable visits",
      "Racehorse management",
    ],
  },
];

const auctionHouses = [
  "Tattersalls",
  "Goffs",
  "Arqana",
  "OBS",
  "Fasig-Tipton",
  "Keeneland",
  "Inglis",
  "Magic Millions",
  "New Zealand Bloodstock",
  "JRHA",
  "BBAG",
  "Cape Racing Sales",
];

const whyChoose = [
  { title: "Independent Advice", icon: ShieldCheck },
  { title: "Artificial Intelligence", icon: Brain },
  { title: "Commercial Expertise", icon: LineChart },
  { title: "Worldwide Representation", icon: Globe2 },
  { title: "Experienced Horsemen", icon: Compass },
  { title: "Global Network", icon: Network },
  { title: "Confidential Service", icon: Lock },
  { title: "Data-Driven Decisions", icon: Sparkles },
];

const offices = [
  {
    flag: "🇮🇪",
    country: "Ireland",
    lines: ["Naas Town Centre", "Sallins Road", "Naas, County Kildare", "W91 KV4H"],
  },
  {
    flag: "🇺🇸",
    country: "United States",
    lines: ["217 SE 1st Avenue, Suite 200", "Ocala, Florida 34471"],
  },
  {
    flag: "🇬🇧",
    country: "United Kingdom",
    lines: ["Floor 3, 50–60 Station Road", "Cambridge CB1 2JH", "Newmarket, Suffolk"],
  },
  {
    flag: "🇦🇺",
    country: "Australia",
    lines: ["Level 1, 1–5 Link Road", "136 Epsom Road", "Zetland NSW 2017"],
  },
];

const SERVICE_OPTIONS = [
  "Purchase Advisory",
  "Sales Advisory",
  "Auction Representation",
  "Private Sales",
  "Private Purchase",
  "Yearling Selection",
  "Breeze-Up Selection",
  "National Hunt",
  "Broodmare Advisory",
  "Mating Plan",
  "Stallion Advisory",
  "AI Analysis",
  "Training Analysis",
  "Performance Analysis",
  "Visual Analysis",
  "Sale Inspection",
  "Commercial Valuation",
  "Investment Advisory",
  "International Horse Sourcing",
  "Bloodstock Concierge",
  "Other",
];

const REGIONS = [
  "Europe",
  "United Kingdom",
  "Ireland",
  "United States",
  "Australia",
  "Japan",
  "New Zealand",
  "South Africa",
  "Middle East",
  "South America",
];

const CONTACT_METHODS = ["Email", "Telephone", "WhatsApp", "Zoom", "Google Meet", "In Person"];

const MEETING_TYPES = [
  "30 Minute Consultation",
  "45 Minute Advisory Session",
  "60 Minute Bloodstock Strategy Meeting",
];

type FormState = {
  first_name: string;
  last_name: string;
  company: string;
  position: string;
  address: string;
  country: string;
  email: string;
  telephone: string;
  whatsapp: string;
  preferred_contact: string;
  budget: string;
  region: string;
  meeting_type: string;
  services: string[];
  message: string;
};

const initialState: FormState = {
  first_name: "",
  last_name: "",
  company: "",
  position: "",
  address: "",
  country: "",
  email: "",
  telephone: "",
  whatsapp: "",
  preferred_contact: "",
  budget: "",
  region: "",
  meeting_type: "",
  services: [],
  message: "",
};

function buildMessage(form: FormState): string {
  const lines = [
    `Position: ${form.position || "—"}`,
    `Company: ${form.company || "—"}`,
    `Address: ${form.address || "—"}`,
    `Country: ${form.country || "—"}`,
    `Telephone: ${form.telephone || "—"}`,
    `WhatsApp: ${form.whatsapp || "—"}`,
    `Preferred Contact: ${form.preferred_contact || "—"}`,
    `Preferred Region: ${form.region || "—"}`,
    `Estimated Budget: ${form.budget || "—"}`,
    `Meeting Type: ${form.meeting_type || "—"}`,
    `Services Required: ${form.services.length ? form.services.join(", ") : "—"}`,
    "",
    "Message:",
    form.message || "—",
  ];
  return lines.join("\n");
}

export default function Advisory() {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  const toggleService = (service: string) => {
    setForm((s) => ({
      ...s,
      services: s.services.includes(service)
        ? s.services.filter((x) => x !== service)
        : [...s.services, service],
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email) {
      toast({ title: "Missing information", description: "Please complete name and email.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const fullName = `${form.first_name} ${form.last_name}`.trim();
      const planInterest =
        form.services.length > 0 ? form.services.join(", ") : "Bloodstock Advisory";
      const { error } = await supabase.functions.invoke("contact-inquiry", {
        body: {
          full_name: fullName,
          company_name: form.company || "N/A",
          email: form.email,
          plan_interest: planInterest,
          message: buildMessage(form),
          source: "advisory-page",
        },
      });
      if (error) throw error;
      setSubmitted(true);
      setForm(initialState);
      toast({ title: "Request received", description: "Our advisory team will contact you shortly." });
    } catch (err: any) {
      toast({
        title: "Unable to submit",
        description: err?.message || "Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Global Bloodstock Advisory — BloodstockAI"
        description="Independent worldwide bloodstock advisory powered by AI. Purchase, sales, auction representation, stallion and broodmare advisory across UK, Ireland, USA, Europe, Australia and beyond."
        path="/advisory"
      />
      <Header />
      <main className="flex-1 pt-16">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-secondary/10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 pointer-events-none" />
          <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-20 sm:py-28 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-secondary/30 bg-secondary/5 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-secondary mb-6">
              <Globe2 className="w-3 h-3" /> Worldwide Bloodstock Advisory
            </div>
            <h1 className="font-luxury text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight mb-5">
              Global Bloodstock <span className="text-secondary">Advisory</span>
            </h1>
            <p className="text-base sm:text-lg text-secondary/90 mb-6 font-medium">
              Independent advice. Global Representation.
            </p>
            <div className="space-y-4 text-muted-foreground leading-relaxed max-w-3xl">
              <p>
                BloodstockAI combines decades of practical bloodstock experience with advanced artificial
                intelligence to provide independent advisory services for owners, breeders, trainers, consignors
                and investors worldwide.
              </p>
              <p>
                From purchasing your next champion to planning matings, managing auction strategies or sourcing
                bloodstock internationally, our advisory team delivers data-driven decisions with complete
                independence and confidentiality.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Button asChild variant="premium" size="lg">
                <a href="#schedule"><CalendarIcon className="w-4 h-4" /> Schedule Consultation</a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#contact"><Mail className="w-4 h-4" /> Contact an Advisor</a>
              </Button>
            </div>
          </div>
        </section>

        {/* PREMIUM INTRODUCTION */}
        <section className="py-16 sm:py-20 px-4 sm:px-6">
          <div className="container mx-auto max-w-4xl">
            <h2 className="font-luxury text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Independent Worldwide Bloodstock Advisory
            </h2>
            <div className="w-16 h-px bg-gradient-to-r from-secondary to-transparent mb-6" />
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Unlike traditional bloodstock agencies, BloodstockAI combines artificial intelligence,
                biomechanical analysis, pedigree research, commercial valuation and real-world bloodstock
                expertise to help clients make informed decisions across every stage of the horse's career.
              </p>
              <p>
                We work independently with clients around the world and regularly assist purchases, sales and
                inspections across Europe, the United Kingdom, Ireland, the United States, Australia and other
                leading racing jurisdictions.
              </p>
            </div>
          </div>
        </section>

        {/* SERVICES GRID */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-secondary/5 border-y border-secondary/10">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary mb-3">What We Offer</p>
              <h2 className="font-luxury text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                Our Advisory Services
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {advisoryServices.map((s, idx) => (
                <article
                  key={s.title}
                  className="group relative bg-background border border-secondary/15 rounded-xl p-5 sm:p-6 hover:border-secondary/40 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-[10px] font-mono text-secondary/60">{String(idx + 1).padStart(2, "0")}</span>
                    <ArrowRight className="w-4 h-4 text-secondary/40 group-hover:text-secondary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="font-luxury text-lg sm:text-xl font-bold text-secondary mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.desc}</p>
                  {s.items.length > 0 && (
                    <ul className="space-y-1.5 border-t border-secondary/10 pt-3">
                      {s.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/80">
                          <Check className="w-3.5 h-3.5 text-secondary mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* AUCTION HOUSES */}
        <section className="py-16 sm:py-20 px-4 sm:px-6">
          <div className="container mx-auto max-w-5xl text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary mb-3">Global Coverage</p>
            <h2 className="font-luxury text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-10">
              Working Across The World's Leading Sales Companies
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {auctionHouses.map((name) => (
                <div
                  key={name}
                  className="border border-secondary/15 rounded-lg py-4 px-3 text-sm font-medium text-foreground hover:border-secondary/40 hover:bg-secondary/5 transition-colors"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHY CHOOSE */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-secondary/5 border-y border-secondary/10">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary mb-3">Why BloodstockAI</p>
              <h2 className="font-luxury text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                Why Choose BloodstockAI
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {whyChoose.map(({ title, icon: Icon }) => (
                <div
                  key={title}
                  className="bg-background border border-secondary/15 rounded-xl p-5 text-center hover:border-secondary/40 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary mx-auto mb-3 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WORLDWIDE OFFICES */}
        <section className="py-16 sm:py-20 px-4 sm:px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary mb-3">Global Presence</p>
              <h2 className="font-luxury text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                Worldwide Offices
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {offices.map((o) => (
                <div
                  key={o.country}
                  className="border border-secondary/15 rounded-xl p-5 bg-background hover:border-secondary/40 hover:shadow-md transition-all"
                >
                  <div className="text-3xl mb-3" aria-hidden>{o.flag}</div>
                  <h3 className="font-luxury text-lg font-bold text-secondary mb-2 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> {o.country}
                  </h3>
                  <ul className="space-y-0.5 text-sm text-muted-foreground">
                    {o.lines.map((l) => <li key={l}>{l}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT + FORM */}
        <section id="contact" className="py-16 sm:py-20 px-4 sm:px-6 bg-secondary/5 border-y border-secondary/10">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary mb-3">Get in Touch</p>
              <h2 className="font-luxury text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
                Contact an Advisor
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center items-center text-sm">
                <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="flex items-center gap-2 text-foreground hover:text-secondary transition-colors">
                  <Phone className="w-4 h-4 text-secondary" /> {PHONE}
                </a>
                <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 text-foreground hover:text-secondary transition-colors">
                  <Mail className="w-4 h-4 text-secondary" /> {EMAIL}
                </a>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground hover:text-secondary transition-colors">
                  <MessageCircle className="w-4 h-4 text-secondary" /> WhatsApp
                </a>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              id="schedule"
              className="bg-background border border-secondary/15 rounded-2xl p-5 sm:p-8 shadow-sm space-y-6"
            >
              <div>
                <h3 className="font-luxury text-xl font-bold text-secondary mb-1">Advisory Request</h3>
                <p className="text-sm text-muted-foreground">All enquiries are reviewed personally by our advisory team.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name *">
                  <Input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} required />
                </Field>
                <Field label="Last Name *">
                  <Input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} required />
                </Field>
                <Field label="Company">
                  <Input value={form.company} onChange={(e) => update("company", e.target.value)} />
                </Field>
                <Field label="Position">
                  <Input value={form.position} onChange={(e) => update("position", e.target.value)} />
                </Field>
                <Field label="Address" className="sm:col-span-2">
                  <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
                </Field>
                <Field label="Country">
                  <Input value={form.country} onChange={(e) => update("country", e.target.value)} />
                </Field>
                <Field label="Email *">
                  <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
                </Field>
                <Field label="Telephone">
                  <Input value={form.telephone} onChange={(e) => update("telephone", e.target.value)} />
                </Field>
                <Field label="WhatsApp">
                  <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
                </Field>
                <Field label="Preferred Contact Method">
                  <Select value={form.preferred_contact} onValueChange={(v) => update("preferred_contact", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {CONTACT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Preferred Region">
                  <Select value={form.region} onValueChange={(v) => update("region", v)}>
                    <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Estimated Budget (optional)">
                  <Input value={form.budget} onChange={(e) => update("budget", e.target.value)} placeholder="e.g. €100,000 – €250,000" />
                </Field>
                <Field label="Meeting Type">
                  <Select value={form.meeting_type} onValueChange={(v) => update("meeting_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Schedule a consultation" /></SelectTrigger>
                    <SelectContent>
                      {MEETING_TYPES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div>
                <Label className="text-sm font-semibold text-foreground mb-3 block">Services Required</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {SERVICE_OPTIONS.map((service) => {
                    const checked = form.services.includes(service);
                    return (
                      <label
                        key={service}
                        className={`flex items-center gap-2 border rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${
                          checked
                            ? "border-secondary bg-secondary/10 text-foreground"
                            : "border-secondary/15 hover:border-secondary/40 text-muted-foreground"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleService(service)}
                          className="data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                        />
                        <span>{service}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <Field label="Message">
                <Textarea
                  rows={5}
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  placeholder="Tell us about your goals, timeline and any horses or sales you have in mind…"
                />
              </Field>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground flex items-start gap-2 max-w-md">
                  <Lock className="w-3.5 h-3.5 text-secondary mt-0.5 flex-shrink-0" />
                  Your information is transmitted using secure encrypted connections. All enquiries remain
                  strictly confidential and are never shared with third parties.
                </p>
                <Button type="submit" variant="premium" size="lg" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : (
                    <>Send Request <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
              </div>

              {submitted && (
                <div className="rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-foreground">
                  Thank you — your advisory request has been received. A member of our team will be in touch shortly.
                </div>
              )}
            </form>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-20 sm:py-24 px-4 sm:px-6 bg-primary text-primary-foreground">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="font-luxury text-3xl sm:text-4xl md:text-5xl font-bold mb-5 text-secondary">
              Ready to Make Better Bloodstock Decisions?
            </h2>
            <p className="text-base sm:text-lg text-primary-foreground/80 leading-relaxed mb-8">
              Whether you are purchasing your next racehorse, planning a mating, investing in bloodstock or
              preparing for an international auction, BloodstockAI combines independent expertise with
              artificial intelligence to help you achieve better results.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="premium" size="lg">
                <a href="#schedule"><CalendarIcon className="w-4 h-4" /> Schedule Consultation</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-secondary text-secondary hover:bg-secondary/10">
                <a href="#contact"><Mail className="w-4 h-4" /> Speak with an Advisor</a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}