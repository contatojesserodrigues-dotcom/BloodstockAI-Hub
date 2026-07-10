import { Link } from "react-router-dom";
import { Linkedin, Instagram } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-[hsl(var(--navy-deep))] text-white border-t border-secondary/20">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Gold divider */}
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-secondary to-transparent mx-auto mb-8 sm:mb-12" />

        <div className="mb-6 grid grid-cols-1 gap-8 sm:mb-8 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
          <div className="col-span-1 flex items-center justify-center sm:col-span-2 md:col-span-1 md:justify-start">
            <div className="w-full max-w-[310px]" aria-label="BloodstockAI — AI Powered Bloodstock Analytics">
              <p className="whitespace-nowrap font-[Georgia] text-[clamp(18px,7vw,32px)] leading-none tracking-[0.07em] text-white">
                BLOODSTOCK<span className="text-secondary">.AI</span>
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-px flex-1 bg-secondary/80" />
                <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.12em] text-white/90">
                  AI Powered Bloodstock Analytics
                </span>
                <span className="h-px flex-1 bg-secondary/80" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-luxury text-xs sm:text-sm font-semibold mb-3 text-secondary uppercase tracking-wider">Product</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li><Link to="/pricing" className="text-white/75 hover:text-secondary transition-colors">Pricing</Link></li>
              <li><Link to="/reports" className="text-white/75 hover:text-secondary transition-colors">Market Reports</Link></li>
              <li><Link to="/horses-for-sale" className="text-white/75 hover:text-secondary transition-colors">Sales</Link></li>
              <li><Link to="/sales-catalogs" className="text-white/75 hover:text-secondary transition-colors">Sales Catalogs Analyzed</Link></li>
              <li><Link to="/advisory" className="text-white/75 hover:text-secondary transition-colors">Advisory</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-luxury text-xs sm:text-sm font-semibold mb-3 text-secondary uppercase tracking-wider">Company</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li><Link to="/about" className="text-white/75 hover:text-secondary transition-colors">About</Link></li>
              <li><Link to="/contact" className="text-white/75 hover:text-secondary transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-luxury text-xs sm:text-sm font-semibold mb-3 text-secondary uppercase tracking-wider">Legal</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li><Link to="/terms-of-service" className="text-white/75 hover:text-secondary transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy-policy" className="text-white/75 hover:text-secondary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Gold divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-secondary/20 to-transparent" />

        <div className="pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-[10px] sm:text-xs text-white/50 text-center md:text-left">
            © 2025 BloodstockAI® Ltd. All rights reserved.
          </p>
          
          <div className="flex items-center gap-4">
            <a href="https://www.linkedin.com/company/bloodstockai/" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-secondary transition-colors">
              <Linkedin className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
            <a href="https://x.com/aiBloodstock" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-secondary transition-colors">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://www.instagram.com/_bloodstock.ai/" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-secondary transition-colors">
              <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};