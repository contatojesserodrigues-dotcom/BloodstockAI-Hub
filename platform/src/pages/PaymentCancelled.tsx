import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentCancelled() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        <XCircle className="w-16 h-16 text-destructive mx-auto" />
        <h1 className="text-3xl font-bold text-foreground">Payment Cancelled</h1>
        <p className="text-muted-foreground text-lg">Your payment was not completed. You can try again anytime.</p>
        <Button asChild variant="outline" size="lg">
          <Link to="/pricing">Back to Plans</Link>
        </Button>
      </div>
    </div>
  );
}
