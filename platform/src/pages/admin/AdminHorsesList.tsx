import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MarketplaceListing, formatGBP } from "@/types/marketplace";
import AdminGuard from "@/components/marketplace/AdminGuard";
import { Plus, Pencil } from "lucide-react";

function Inner() {
  const [rows, setRows] = useState<(MarketplaceListing & { _offerCount: number; _highest: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("marketplace_listings").select("*").order("created_at", { ascending: false });
      const listings = (data ?? []) as MarketplaceListing[];
      const enriched = await Promise.all(listings.map(async (l) => {
        const { data: offers } = await supabase.from("marketplace_offers").select("amount").eq("listing_id", l.id);
        const arr = (offers ?? []) as { amount: number }[];
        return { ...l, _offerCount: arr.length, _highest: arr.reduce((m, o) => Math.max(m, o.amount), 0) };
      }));
      setRows(enriched);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Sales — Admin</h1>
              <p className="text-sm text-muted-foreground">Manage all marketplace listings</p>
            </div>
            <Button asChild variant="premium"><Link to="/admin/horses-for-sale/new"><Plus className="w-4 h-4" /> New Listing</Link></Button>
          </div>

          <Card className="bg-card border-border/50 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No listings yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Horse</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Guide</th>
                    <th className="text-right p-3">Offers</th>
                    <th className="text-right p-3">Highest</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border/30">
                      <td className="p-3 text-foreground">{r.horse_name}<div className="text-xs text-muted-foreground">{r.sire} × {r.dam}</div></td>
                      <td className="p-3"><Badge variant="outline" className="capitalize">{r.status}</Badge></td>
                      <td className="p-3 text-right">{formatGBP(r.guide_price)}</td>
                      <td className="p-3 text-right">{r._offerCount}</td>
                      <td className="p-3 text-right text-secondary font-medium">{r._highest ? formatGBP(r._highest) : "—"}</td>
                      <td className="p-3 text-right">
                        <Button asChild size="sm" variant="outline"><Link to={`/admin/horses-for-sale/${r.id}/edit`}><Pencil className="w-3 h-3" /> Edit</Link></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function AdminHorsesList() {
  return <AdminGuard><Inner /></AdminGuard>;
}