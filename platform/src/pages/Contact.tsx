import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Building2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("contact-inquiry", {
        body: {
          full_name: name.trim(),
          company_name: "Contact Form",
          email: email.trim(),
          plan_interest: "Contact Message",
          source: "contact-page",
        },
      });
      if (error) throw error;
      toast.success("Message sent! We'll get back to you shortly.");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      toast.error("Failed to send. Please email us directly at office@agentbloodstockai.com");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Contact BloodstockAI — Talk to Our Bloodstock Team"
        description="Reach the BloodstockAI team for bespoke analysis, catalogue consultancy and enterprise enquiries. UK & Ireland phone, email and form."
        path="/contact"
      />
      <Header />
      
      <main className="flex-1 pt-16">
        <section className="py-20 px-4 sm:px-6">
          <div className="container mx-auto max-w-6xl">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8 text-center">
              Contact Us
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">Get in Touch</h2>
                <p className="text-muted-foreground mb-8">
                  Have questions about BloodstockAI? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Mail className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <p className="font-semibold text-foreground">Email</p>
                      <a href="mailto:office@agentbloodstockai.com" className="text-muted-foreground hover:text-secondary transition-colors">
                        office@agentbloodstockai.com
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <Phone className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <p className="font-semibold text-foreground">Phone & Support</p>
                      <a href="tel:+447533314408" className="text-muted-foreground hover:text-secondary transition-colors">
                        +44 7533 314408
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <Building2 className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <p className="font-semibold text-foreground">Company</p>
                      <p className="text-muted-foreground">BloodstockAI LTD</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <MapPin className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <p className="font-semibold text-foreground">Address</p>
                      <div className="text-muted-foreground space-y-1">
                        <p><strong className="text-foreground/80">IRE:</strong> Naas Town Centre, Sallins Road, Naas, Kildare, Ireland, W91 KV4H</p>
                        <p><strong className="text-foreground/80">USA:</strong> 217 SE 1st Avenue Suite 200, Ocala, FL 34471, United States</p>
                        <p><strong className="text-foreground/80">UK:</strong> Floor 3, 50 - 60 Station Rd, Cambridge CB1 2JH, United Kingdom / Newmarket, Suffolk</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-card border border-border rounded-2xl p-8">
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                      Name
                    </label>
                    <Input id="name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                      Email
                    </label>
                    <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                      Message
                    </label>
                    <Textarea id="message" placeholder="How can we help you?" rows={5} value={message} onChange={e => setMessage(e.target.value)} />
                  </div>
                  
                  <Button variant="premium" className="w-full" size="lg" type="submit" disabled={sending}>
                    {sending ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}