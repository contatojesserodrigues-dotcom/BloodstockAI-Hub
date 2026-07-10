import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie_consent")) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-secondary/30 bg-background/95 backdrop-blur-sm px-4 py-4 sm:px-6">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          🍪 We use essential cookies to keep you logged in and improve your experience. We do not use advertising cookies.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link to="/privacy-policy">Privacy Policy</Link>
          </Button>
          <Button variant="secondary" size="sm" onClick={accept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
