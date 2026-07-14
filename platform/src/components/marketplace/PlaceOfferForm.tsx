import { useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { initialsFromName, formatGBP } from "@/types/marketplace";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
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
] as const;

const formatMoney = (n: number, code: string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(n);

export const PlaceOfferForm = ({
  listingId,
  minOffer,
  defaultCurrency = "GBP",
}: { listingId: string; minOffer: number; defaultCurrency?: string }) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [dialCode, setDialCode] = useState("+44");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [genuine, setGenuine] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ amount: number; currency: string } | null>(null);

  const reset = () => {
    setName(""); setContact(""); setEmail(""); setAmount(""); setMessage(""); setGenuine(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      name, dialCode, contact, email,
      amount: Number(amount), message,
      is_genuine: genuine as true,
    });
    if (!parsed.success) {
      toast({ variant: "destructive", title: "Please check your entries", description: "All required fields must be valid." });
      return;
    }
    const increment = Number(amount);
    if (increment <= 0) {
      toast({ variant: "destructive", title: "Invalid amount", description: "Enter an amount greater than zero to add on top of the current highest offer." });
      return;
    }
    const finalAmount = minOffer + increment;
    setSubmitting(true);
    const userMessage = message.trim();
    const composedMessage = `[Currency: ${currency}] ${userMessage}`.trim();
    const { error } = await supabase.from("marketplace_offers").insert({
      listing_id: listingId,
      offeror_name: name.trim(),
      offeror_initials: initialsFromName(name),
      contact_number: `${dialCode} ${contact.trim()}`,
      email: email.trim(),
      amount: finalAmount,
      message: composedMessage,
      is_genuine: true,
    });
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Submission failed", description: error.message });
      return;
    }
    setSuccess({ amount: finalAmount, currency });
    reset();
  };

  if (success !== null) {
    return (
      <div className="p-4 rounded-lg border border-secondary/40 bg-secondary/5">
        <p className="text-sm text-foreground">
          Your offer of <span className="text-secondary font-semibold">{formatMoney(success.amount, success.currency)}</span> has been submitted.
          The seller will be notified and may contact you directly.
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setSuccess(null)}>Submit another</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <h3 className="text-sm uppercase tracking-wider text-secondary font-semibold">Submit Your Offer</h3>
      <Input placeholder="Your Name *" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
      <div className="flex gap-2">
        <Select value={dialCode} onValueChange={setDialCode}>
          <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {dialCodes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="tel" placeholder="Contact Number *" value={contact} onChange={(e) => setContact(e.target.value)} required className="flex-1" />
      </div>
      <Input type="email" placeholder="Email Address *" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
      <div className="flex gap-2">
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          type="number"
          placeholder={`Add on top of current highest (${formatMoney(minOffer, currency)})`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={1}
          required
          className="flex-1"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Current highest offer: <span className="font-semibold text-foreground">{formatMoney(minOffer, currency)}</span>.
        Your new offer will be <span className="font-semibold text-foreground">{formatMoney(minOffer + (Number(amount) || 0), currency)}</span>.
      </p>
      <Textarea
        placeholder="Message to Seller (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={1000}
        rows={3}
      />
      <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
        <Checkbox checked={genuine} onCheckedChange={(v) => setGenuine(v === true)} className="mt-0.5" />
        <span>I confirm this is a genuine expression of interest.</span>
      </label>
      <Button type="submit" variant="premium" className="w-full" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Offer"}
      </Button>
    </form>
  );
};

export default PlaceOfferForm;