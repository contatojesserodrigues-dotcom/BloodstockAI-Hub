import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

export default function About() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="About BloodstockAI — Built for the Auction Ring"
        description="How BloodstockAI brings institutional-grade research to every thoroughbred professional, from Tattersalls to Keeneland."
        path="/about"
      />
      <Header />
      
      <main className="flex-1 pt-16">
        <section className="py-20 px-4 sm:px-6">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
              About BloodstockAI®
            </h1>
            
            <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
              <p className="text-xl font-semibold text-foreground">
                The bloodstock industry moves fast. The best horses don't wait.
              </p>
              
              <p>
                Every year, thousands of thoroughbreds pass through the ring at Tattersalls, Arqana, Keeneland, Magic Millions and Karaka. Behind every successful purchase is hours — sometimes days — of preparation. Catalogue analysis. Pedigree research. Conformation assessment. Comparable pricing. And for most professionals in the industry, that preparation is still done manually, across multiple databases, under time pressure, often from the other side of the world.
              </p>
              <p>We built BloodstockAI because we saw that gap clearly.</p>

              <h2 className="text-2xl font-bold text-foreground mt-12 mb-4">Where It Started</h2>
              <p>
                BloodstockAI was born between Ireland and the United States — at the heart of the world's largest thoroughbred racing operations. Working alongside experienced bloodstock agents, a dedicated team of data analysts, and veterinary professionals, we built what is now the most advanced AI-powered analysis platform in the thoroughbred industry.
              </p>
              <p>
                The idea came from a simple observation: the most sophisticated buyers in the world — the Yoshidas, the Coolmores, the Godolphins — arrive at every sale with a research team behind them. Everyone else arrives with instinct, experience, and not enough hours in the day.
              </p>
              <p>That asymmetry isn't fair. And it isn't necessary.</p>
              <p>
                The data exists. The technology exists. What was missing was a platform built specifically for how bloodstock professionals actually work — moving between sales, catalogues, time zones and decisions at speed.
              </p>
              <p>
                So we built one. And in doing so, we built something the industry had never seen before.
              </p>
              <p>
                Drawing on real-world expertise from operations across Newbridge, Ocala, Newmarket, and beyond — and combining that with cutting-edge artificial intelligence, machine learning, and proprietary data pipelines — we created a platform that delivers institutional-grade research to every professional in the bloodstock world, regardless of the size of their operation.
              </p>
              <p>
                BloodstockAI is the first platform in the world to integrate artificial intelligence directly into the thoroughbred bloodstock research process. Not a database. Not a spreadsheet tool. Not a pedigree lookup with a modern interface. A fully integrated AI research engine — built from the ground up for the auction ring, the breeze-up strip, and the breeding barn.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-12 mb-4">What BloodstockAI Does</h2>
              <p>
                BloodstockAI is a thoroughbred research intelligence platform. Upload a single lot or an entire auction catalogue, and within minutes you have a complete analysis — pedigree cross performance, dam-line form, conformation assessment, and comparable market pricing from recent sales cycles.
              </p>
              <p>But we didn't stop at the catalogue.</p>
              <p>
                Our visual conformation analysis reads stride length, limb extension, and movement quality directly from video — including breeze-up footage — so you can assess a horse's physical potential before you've set foot on the grounds. All of it runs on your phone, from wherever you are in the world.
              </p>
              <p>
                The result is a level of preparation previously reserved for operations with dedicated research teams, now available to any professional who needs it. For the first time.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-12 mb-4">Who It's For</h2>
              
              <p>
                <strong className="text-foreground">Bloodstock Agents</strong> — Build your shortlist before the catalogue drops. Arrive at Newmarket, Deauville or Ocala with every lot already analysed. Give your clients the depth of research they expect, in a fraction of the time.
              </p>
              <p>
                <strong className="text-foreground">Trainers</strong> — Stop guessing on conformation. Our visual AI analysis flags stride mechanics, limb alignment and physical markers that matter for performance — from video, before the vet. Back your eye with data your clients can see.
              </p>
              <p>
                <strong className="text-foreground">Breeders</strong> — Understand where your stock sits in the current market before you commit to a reserve. Analyse comparable sales, track nick performance across recent cycles, and make mating decisions grounded in real commercial intelligence.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-12 mb-4">The Principle Behind It</h2>
              <p className="text-xl font-semibold text-foreground">
                BloodstockAI doesn't replace experience. It respects it.
              </p>
              <p>
                The judgment you bring to the stable gate — reading a horse's presence, understanding a family, knowing when a price feels right — that cannot be automated, and we have no interest in trying.
              </p>
              <p>
                What we eliminate is the groundwork that shouldn't require your best hours. The catalogue browsing at midnight. The database cross-referencing before a morning session. The uncertainty about where a horse sits in the current market.
              </p>
              <p>
                Before BloodstockAI, this level of research required a team, a budget, and days of preparation. Now it takes minutes.
              </p>
              <p className="text-foreground font-medium">
                You arrive informed. You inspect with focus. You bid with conviction.
              </p>
              <p className="text-foreground font-semibold">
                That's what BloodstockAI is for. And nobody else is doing it.
              </p>
              <p className="mt-8 text-foreground">
                Ready to see it in action? <a href="/contact" className="text-secondary hover:underline">Book a live demo</a> on any lot from any current catalogue. No preparation required on your side.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}