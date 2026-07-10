import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import AdminGuard from "@/components/marketplace/AdminGuard";
import AdminListingForm from "@/components/marketplace/AdminListingForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceListing } from "@/types/marketplace";

function Inner() {
  const { id } = useParams();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("marketplace_listings").select("*").eq("id", id).maybeSingle();
      setListing((data ?? null) as MarketplaceListing | null);
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <Button asChild variant="ghost" size="sm" className="mb-4 text-muted-foreground">
            <Link to="/admin/horses-for-sale"><ArrowLeft className="w-4 h-4" /> Back</Link>
          </Button>
          <h1 className="text-3xl font-semibold text-foreground mb-6">Edit Listing</h1>
          {loading ? <div className="text-muted-foreground">Loading...</div> : listing ? <AdminListingForm existing={listing} /> : <div className="text-muted-foreground">Listing not found.</div>}
        </div>
      </main>
    </div>
  );
}

export default function AdminHorseEdit() {
  return <AdminGuard><Inner /></AdminGuard>;
}