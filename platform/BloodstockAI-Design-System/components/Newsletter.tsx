import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const emailSchema = z.string().trim().email("Please enter a valid email").max(255);

export const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast({ title: "Invalid email", description: result.error.errors[0]?.message || "Please enter a valid email.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("contact-inquiry", {
        body: { email: result.data, type: "newsletter", _hp: honeypot },
      });
      if (error) throw error;
      toast({ title: "Subscription successful.", description: "You'll receive our latest insights and updates." });
      setEmail("");
    } catch {
      toast({ title: "Subscription failed", description: "Please try again later.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-10 sm:py-14 md:py-20 bg-background relative overflow-hidden">
      {/* Top gold line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-secondary/20 to-transparent" />
      
      {/* Subtle gold glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-[radial-gradient(ellipse_at_center,_hsl(43_76%_52%_/_0.04),_transparent_70%)]" />
      
      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center space-y-4 sm:space-y-6">
          <Mail className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-secondary/70" />
          <h2 className="text-xl sm:text-2xl md:text-3xl font-luxury font-bold text-foreground uppercase tracking-wider">
            Join Our Newsletter
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground font-body">
            Stay ahead of the bloodstock market with exclusive insights and analysis.
          </p>
          
          <form onSubmit={handleSubscribe} className="mx-auto flex w-full max-w-lg flex-col gap-3 pt-2 md:flex-row md:pt-4">
            <div className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true">
              <input name="fax_number" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
            </div>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-card border-border text-foreground placeholder:text-muted-foreground/50 focus:border-secondary text-sm md:flex-1"
            />
            <Button type="submit" variant="premium" size="default" className="w-full whitespace-nowrap uppercase tracking-wider text-sm md:w-auto" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Subscribe
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};