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
  Lock,
  ArrowRight,
  MapPin,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WorldPresenceMap } from "@/components/landing/WorldPresenceMap";

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
  { title: "Independent by design", detail: "Recommendations are built around your mandate, not inventory or vendor pressure." },
  { title: "Evidence before opinion", detail: "Pedigree, biomechanics, inspection and market context are reviewed as one decision." },
  { title: "Global execution", detail: "Representation across the major sales grounds and private markets worldwide." },
  { title: "Strictly confidential", detail: "Discreet sourcing, negotiation and portfolio strategy for every client." },
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
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col">
      <SEO
        title="Global Bloodstock Advisory — BloodstockAI"
        description="Independent worldwide bloodstock advisory powered by AI. Purchase, sales, auction representation, stallion and broodmare advisory across UK, Ireland, USA, Europe, Australia and beyond."
        path="/advisory"
      />
      <Header />
      <main className="flex-1 pt-16 md:pt-[76px]">
        <section className="border-b border-[#E5E7EB] bg-white px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
          <div className="container mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.12fr_0.88fr] lg:gap-20">
            <div>
              <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.22em] text-secondary">Independent global advisory</p>
              <h1 className="max-w-3xl text-[clamp(2.7rem,6vw,5.25rem)] font-bold leading-[0.98] tracking-[-0.055em] text-[#101827]">
                Better judgement for decisions that define a portfolio.
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-[#667085] sm:text-lg">
                Independent sourcing, inspection, valuation and representation — strengthened by BloodstockAI intelligence and executed by experienced horsemen.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="premium" size="lg"><a href="#schedule">Discuss your mandate <ArrowRight className="h-4 w-4" /></a></Button>
                <Button asChild variant="outline" size="lg"><a href="#services">Explore advisory services</a></Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[26px] border border-[#202A3A] bg-[#101827] text-white shadow-[0_28px_70px_rgba(15,23,42,0.16)]">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D8A53B]">Private Client Desk</span>
                <span className="text-[10px] uppercase tracking-wider text-white/40">Global · Confidential</span>
              </div>
              <div className="p-6 sm:p-8">
                <p className="text-2xl font-bold leading-tight text-white">One mandate. One integrated view of the horse, market and opportunity.</p>
                <div className="mt-8 space-y-0">
                  {[
                    ["01", "Define", "Objectives, budget and risk profile"],
                    ["02", "Source", "Public sales and private opportunities"],
                    ["03", "Evaluate", "Pedigree, physical, veterinary and value"],
                    ["04", "Execute", "Negotiation, bidding and post-sale"],
                  ].map(([number, title, text]) => (
                    <div key={number} className="grid grid-cols-[38px_74px_1fr] items-start gap-3 border-t border-white/10 py-4">
                      <span className="text-xs font-bold text-[#D8A53B]">{number}</span>
                      <span className="text-sm font-bold text-white">{title}</span>
                      <span className="text-xs leading-5 text-white/55">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#E5E7EB] bg-white">
          <div className="container mx-auto grid max-w-6xl grid-cols-2 divide-x divide-[#E5E7EB] px-4 sm:grid-cols-4 sm:px-6">
            {[["38+", "Countries"], ["12", "Advisory disciplines"], ["4", "International offices"], ["100%", "Independent"]].map(([value, label]) => (
              <div key={label} className="px-4 py-6 text-center">
                <p className="text-2xl font-bold tracking-tight text-[#101827]">{value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#98A2B3]">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="container mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">Our difference</p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] text-[#101827] sm:text-4xl">Advice built around the decision — not the transaction.</h2>
            </div>
            <div className="grid gap-8 text-base leading-7 text-[#667085] sm:grid-cols-2">
              <p>BloodstockAI brings pedigree research, biomechanics, conformation, commercial valuation and real-world horsemanship into one disciplined advisory process.</p>
              <p>We represent owners, breeders, trainers, consignors and investors across the world's major racing jurisdictions, with discretion at every stage.</p>
            </div>
          </div>
        </section>

        <section id="services" className="border-y border-[#E5E7EB] bg-white px-4 py-16 sm:px-6 sm:py-24">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-12 max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">Advisory capabilities</p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] text-[#101827] sm:text-4xl">Specialist expertise, organised around your objective.</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {advisoryServices.map((service, index) => (
                <article
                  key={service.title}
                  className={`group flex min-h-[250px] flex-col rounded-[22px] border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)] ${
                    index === 0 || index === 3 ? "border-[#202A3A] bg-[#101827] text-white" : "border-[#E5E7EB] bg-[#FAFAF9] text-[#101827]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold tracking-[0.18em] ${index === 0 || index === 3 ? "text-[#D8A53B]" : "text-[#98A2B3]"}`}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="h-px w-8 bg-[#D8A53B] transition-all group-hover:w-14" />
                  </div>
                  <h3 className={`mt-7 text-xl font-bold tracking-tight ${index === 0 || index === 3 ? "!text-white" : "text-[#101827]"}`}>{service.title}</h3>
                  <p className={`mt-2 text-sm leading-6 ${index === 0 || index === 3 ? "!text-white/55" : "text-[#667085]"}`}>{service.desc}</p>
                  {service.items.length > 0 && (
                    <p className={`mt-auto pt-6 text-xs leading-5 ${index === 0 || index === 3 ? "!text-white/45" : "text-[#98A2B3]"}`}>
                      {service.items.slice(0, 4).join(" · ")}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="container mx-auto max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">Decision principles</p>
                <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] text-[#101827] sm:text-4xl">The discipline behind every recommendation.</h2>
              </div>
              <div className="grid gap-x-8 sm:grid-cols-2">
                {whyChoose.map((item, index) => (
                  <div key={item.title} className="border-t border-[#D9DDE3] py-6">
                    <span className="text-[10px] font-bold text-secondary">0{index + 1}</span>
                    <h3 className="mt-3 text-lg font-bold text-[#101827]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#667085]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#E5E7EB] bg-white px-4 py-16 sm:px-6 sm:py-24">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">Global execution</p>
                <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] text-[#101827] sm:text-4xl">Present where the market moves.</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-[#667085]">Advisory and representation across leading auction markets and private channels.</p>
            </div>
            <div className="rounded-[24px] border border-[#E5E7EB] p-2"><WorldPresenceMap /></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {offices.map((office) => (
                <article key={office.country} className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAF9] p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[#101827]">{office.country}</h3>
                    <MapPin className="h-4 w-4 text-secondary" />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#667085]">{office.lines.join(" · ")}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 border-t border-[#E5E7EB] pt-6">
              {auctionHouses.map((name) => <span key={name} className="text-xs font-bold uppercase tracking-[0.1em] text-[#98A2B3]">{name}</span>)}
            </div>
          </div>
        </section>

        <section id="contact" className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="container mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-[28px] border border-[#D9DDE3] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:grid lg:grid-cols-[0.34fr_0.66fr]">
              <aside className="bg-[#101827] p-7 text-white sm:p-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D8A53B]">Start a conversation</p>
                <h2 className="mt-5 text-3xl font-bold leading-tight !text-white">Tell us what decision is in front of you.</h2>
                <p className="mt-4 text-sm leading-6 !text-white/55">Every enquiry is reviewed personally. Initial discussions are confidential and without obligation.</p>
                <div className="mt-10 space-y-5 border-t border-white/10 pt-7 text-sm">
                  <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="flex items-center gap-3 text-white/75 hover:text-white"><Phone className="h-4 w-4 text-[#D8A53B]" />{PHONE}</a>
                  <a href={`mailto:${EMAIL}`} className="flex items-center gap-3 text-white/75 hover:text-white"><Mail className="h-4 w-4 text-[#D8A53B]" />{EMAIL}</a>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/75 hover:text-white"><MessageCircle className="h-4 w-4 text-[#D8A53B]" />WhatsApp</a>
                </div>
              </aside>

              <form onSubmit={handleSubmit} id="schedule" className="scroll-mt-24 space-y-7 p-6 sm:p-10">
                <div>
                  <h3 className="text-xl font-bold text-[#101827]">Advisory brief</h3>
                  <p className="mt-1 text-sm text-[#667085]">Share enough context for our team to prepare a useful first conversation.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First Name *"><Input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} required /></Field>
                  <Field label="Last Name *"><Input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} required /></Field>
                  <Field label="Company"><Input value={form.company} onChange={(e) => update("company", e.target.value)} /></Field>
                  <Field label="Position"><Input value={form.position} onChange={(e) => update("position", e.target.value)} /></Field>
                  <Field label="Email *"><Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required /></Field>
                  <Field label="Telephone"><Input value={form.telephone} onChange={(e) => update("telephone", e.target.value)} /></Field>
                  <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} /></Field>
                  <Field label="Country"><Input value={form.country} onChange={(e) => update("country", e.target.value)} /></Field>
                  <Field label="Address" className="sm:col-span-2"><Input value={form.address} onChange={(e) => update("address", e.target.value)} /></Field>
                  <Field label="Preferred Contact">
                    <Select value={form.preferred_contact} onValueChange={(v) => update("preferred_contact", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CONTACT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                  </Field>
                  <Field label="Preferred Region">
                    <Select value={form.region} onValueChange={(v) => update("region", v)}><SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger><SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                  </Field>
                  <Field label="Estimated Budget"><Input value={form.budget} onChange={(e) => update("budget", e.target.value)} placeholder="e.g. €100,000 – €250,000" /></Field>
                  <Field label="Meeting Type">
                    <Select value={form.meeting_type} onValueChange={(v) => update("meeting_type", v)}><SelectTrigger><SelectValue placeholder="Schedule a consultation" /></SelectTrigger><SelectContent>{MEETING_TYPES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                  </Field>
                </div>
                <div>
                  <Label className="mb-3 block text-xs font-bold uppercase tracking-[0.12em] text-[#667085]">Services required</Label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_OPTIONS.map((service) => {
                      const checked = form.services.includes(service);
                      return (
                        <label key={service} className={`cursor-pointer rounded-full border px-3 py-2 text-xs transition-colors ${checked ? "border-secondary bg-secondary text-white" : "border-[#D9DDE3] text-[#667085] hover:border-secondary"}`}>
                          <Checkbox checked={checked} onCheckedChange={() => toggleService(service)} className="sr-only" />
                          {service}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <Field label="Message"><Textarea rows={5} value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Your objectives, timeline, horses or sales under consideration…" /></Field>
                <div className="flex flex-col items-start justify-between gap-4 border-t border-[#E5E7EB] pt-6 sm:flex-row sm:items-center">
                  <p className="flex max-w-md items-start gap-2 text-xs leading-5 text-[#667085]"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />Strictly confidential. Your information is never shared with third parties.</p>
                  <Button type="submit" variant="premium" size="lg" className="w-full sm:w-auto" disabled={submitting}>
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <>Send advisory brief <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </div>
                {submitted && <div className="rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-[#101827]">Thank you — your advisory request has been received. A member of our team will be in touch shortly.</div>}
              </form>
            </div>
          </div>
        </section>

        <section className="bg-[#101827] px-4 py-20 text-white sm:px-6 sm:py-24">
          <div className="container mx-auto max-w-4xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D8A53B]">Bloodstock decisions, considered properly</p>
            <h2 className="mt-5 text-3xl font-bold leading-tight !text-white sm:text-5xl">Move with evidence. Execute with confidence.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 !text-white/55">From a single inspection to an international portfolio mandate, our team brings clarity to the decisions where judgement matters most.</p>
            <Button asChild variant="premium" size="lg" className="mt-8"><a href="#schedule">Schedule a private consultation <CalendarIcon className="h-4 w-4" /></a></Button>
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