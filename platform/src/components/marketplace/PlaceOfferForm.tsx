import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { initialsFromName, type LocalCurrency } from "@/types/marketplace";
import { useToast } from "@/hooks/use-toast";
import { Building2, RefreshCw, ShieldCheck } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(160),
  dialCode: z.string().min(2).max(5),
  contact: z.string().trim().min(5).max(30),
  email: z.string().trim().email().max(255),
  amount: z.number().int().positive(),
  message: z.string().max(1000).optional(),
  is_genuine: z.literal(true),
});

const dialCodes = ["+44", "+353", "+33", "+1", "+61", "+971"];

const currencies = [
  { code: "GBP", symbol: "£", label: "GBP £" },
  { code: "EUR", symbol: "€", label: "EUR €" },
  { code: "USD", symbol: "$", label: "USD $" },
  { code: "AUD", symbol: "A$", label: "AUD A$" },
  { code: "NZD", symbol: "NZ$", label: "NZD NZ$" },
] as const;

const formatMoney = (n: number, code: string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(n);

const GBP_REFERENCE_RATES: Record<LocalCurrency, number> = {
  GBP: 1,
  EUR: 1.18,
  USD: 1.37,
  AUD: 2.07,
  NZD: 2.25,
};

const fallbackRate = (base: LocalCurrency, quote: LocalCurrency) =>
  GBP_REFERENCE_RATES[quote] / GBP_REFERENCE_RATES[base];

export const PlaceOfferForm = ({
  listingId,
  minOffer,
  defaultCurrency = "GBP",
}: { listingId: string; minOffer: number; defaultCurrency?: string }) => {
  const { toast } = useToast();
  const baseCurrency = (currencies.some(({ code }) => code === defaultCurrency)
    ? defaultCurrency
    : "GBP") as LocalCurrency;
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [dialCode, setDialCode] = useState("+44");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState<LocalCurrency>(baseCurrency);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [genuine, setGenuine] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fxLoading, setFxLoading] = useState(true);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [rateTimestamp, setRateTimestamp] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    submittedAmount: number;
    submittedCurrency: LocalCurrency;
    baseAmount: number;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const targetCurrencies = currencies.map(({ code }) => code).filter((code) => code !== baseCurrency);
    setFxLoading(true);
    fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}&to=${targetCurrencies.join(",")}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("FX service unavailable");
        return response.json();
      })
      .then((data: { rates?: Record<string, number>; date?: string }) => {
        setRates({ [baseCurrency]: 1, ...(data.rates ?? {}) });
        setRateTimestamp(data.date ?? new Date().toISOString().slice(0, 10));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRates(
          Object.fromEntries(
            currencies.map(({ code }) => [code, fallbackRate(baseCurrency, code as LocalCurrency)]),
          ),
        );
        setRateTimestamp(null);
      })
      .finally(() => setFxLoading(false));
    return () => controller.abort();
  }, [baseCurrency]);

  const rate = rates[currency] ?? fallbackRate(baseCurrency, currency);
  const minimumInSelectedCurrency = Math.ceil(minOffer * rate);
  const submittedAmount = Number(amount) || 0;
  const convertedBaseAmount = Math.round(submittedAmount / rate);
  const offerIsHighEnough = convertedBaseAmount > minOffer;
  const rateLabel = useMemo(
    () => `1 ${baseCurrency} = ${rate.toFixed(rate >= 10 ? 2 : 4)} ${currency}`,
    [baseCurrency, currency, rate],
  );

  const reset = () => {
    setName(""); setCompany(""); setContact(""); setEmail(""); setAmount(""); setMessage(""); setGenuine(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      name, company, dialCode, contact, email,
      amount: Number(amount), message,
      is_genuine: genuine as true,
    });
    if (!parsed.success) {
      toast({ variant: "destructive", title: "Please check your entries", description: "All required fields must be valid." });
      return;
    }
    if (!offerIsHighEnough) {
      toast({
        variant: "destructive",
        title: "Offer below the current minimum",
        description: `Enter more than ${formatMoney(minimumInSelectedCurrency, currency)}.`,
      });
      return;
    }
    setSubmitting(true);
    const userMessage = message.trim();
    const composedMessage = [
      `[Offer Currency: ${currency}]`,
      `[Submitted Amount: ${submittedAmount}]`,
      `[Base Currency: ${baseCurrency}]`,
      `[Converted Base Amount: ${convertedBaseAmount}]`,
      `[FX Rate: ${rate}]`,
      `Company: ${company.trim()}`,
      userMessage,
    ].filter(Boolean).join(" ");
    const { error } = await supabase.from("marketplace_offers").insert({
      listing_id: listingId,
      offeror_name: name.trim(),
      offeror_initials: initialsFromName(name),
      contact_number: `${dialCode} ${contact.trim()}`,
      email: email.trim(),
      amount: convertedBaseAmount,
      message: composedMessage,
      is_genuine: true,
    });
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Submission failed", description: error.message });
      return;
    }
    setSuccess({
      submittedAmount,
      submittedCurrency: currency,
      baseAmount: convertedBaseAmount,
    });
    reset();
  };

  if (success !== null) {
    return (
      <div className="rounded-xl border border-secondary/40 bg-secondary/5 p-5">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/15 text-secondary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h3 className="font-bold text-foreground">Offer submitted securely</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your offer of <span className="font-bold text-secondary">{formatMoney(success.submittedAmount, success.submittedCurrency)}</span> has been registered
          {success.submittedCurrency !== baseCurrency && (
            <> as <span className="font-semibold text-foreground">{formatMoney(success.baseAmount, baseCurrency)}</span> in the sale currency</>
          )}. The seller will be notified and may contact you directly.
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setSuccess(null)}>Submit another</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-foreground">Submit a confidential offer</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Your contact details remain private and are shared only with the BloodstockAI sales team.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Full name *" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Company *" value={company} onChange={(e) => setCompany(e.target.value)} required maxLength={160} />
        </div>
      </div>
      <div className="flex gap-2">
        <Select value={dialCode} onValueChange={setDialCode}>
          <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {dialCodes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="tel" placeholder="Telephone / WhatsApp *" value={contact} onChange={(e) => setContact(e.target.value)} required className="min-w-0 flex-1" />
      </div>
      <Input type="email" placeholder="Email Address *" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor={`offer-${listingId}`} className="text-xs font-bold uppercase tracking-[0.12em] text-foreground">Your offer</label>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {fxLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {rateTimestamp ? `ECB reference · ${rateTimestamp}` : "Reference FX rate"}
          </span>
        </div>
        <div className="flex gap-2">
          <Select
            value={currency}
            onValueChange={(value) => {
              setCurrency(value as LocalCurrency);
              setAmount("");
            }}
          >
          <SelectTrigger className="w-[118px] shrink-0 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            {currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
          </SelectContent>
          </Select>
          <Input
            id={`offer-${listingId}`}
            type="number"
            inputMode="numeric"
            placeholder={formatMoney(minimumInSelectedCurrency + 1, currency)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={minimumInSelectedCurrency + 1}
            step={100}
            required
            className="min-w-0 flex-1 bg-background text-base font-bold"
          />
        </div>
        <div className="mt-2.5 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Minimum: <strong className="text-foreground">{formatMoney(minimumInSelectedCurrency + 1, currency)}</strong></span>
          <span>{rateLabel}</span>
        </div>
        {submittedAmount > 0 && currency !== baseCurrency && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${offerIsHighEnough ? "bg-background text-muted-foreground" : "bg-destructive/10 text-destructive"}`}>
            Sale-currency equivalent: <strong className="text-foreground">{formatMoney(convertedBaseAmount, baseCurrency)}</strong>
          </div>
        )}
      </div>
      <Textarea
        placeholder="Message to the sales team (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={1000}
        rows={3}
      />
      <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
        <Checkbox checked={genuine} onCheckedChange={(v) => setGenuine(v === true)} className="mt-0.5" />
        <span>I confirm this is a genuine expression of interest and understand that final terms remain subject to seller acceptance and contract.</span>
      </label>
      <Button type="submit" variant="premium" className="w-full" disabled={submitting}>
        {submitting ? "Submitting securely..." : "Submit Confidential Offer"}
      </Button>
    </form>
  );
};

export default PlaceOfferForm;