import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        <CheckCircle className="w-16 h-16 text-primary mx-auto" />
        <h1 className="text-3xl font-bold text-foreground">Payment Confirmed!</h1>
        <p className="text-muted-foreground text-lg">Your plan has been activated. You're all set to start using BloodstockAI.</p>
        <Button asChild size="lg">
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
