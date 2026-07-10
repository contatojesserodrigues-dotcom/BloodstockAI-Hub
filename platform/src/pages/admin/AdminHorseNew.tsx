import { Header } from "@/components/Header";
import AdminGuard from "@/components/marketplace/AdminGuard";
import AdminListingForm from "@/components/marketplace/AdminListingForm";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminHorseNew() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-28 pb-16">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <Button asChild variant="ghost" size="sm" className="mb-4 text-muted-foreground">
              <Link to="/admin/horses-for-sale"><ArrowLeft className="w-4 h-4" /> Back</Link>
            </Button>
            <h1 className="text-3xl font-semibold text-foreground mb-6">New Horse Listing</h1>
            <AdminListingForm />
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}