import { Bell, Search } from "lucide-react";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="bs-heading">{title}</h1>
        {subtitle && <p className="bs-subheading mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input className="bs-input w-64 pl-9" placeholder="Search agents, leads..." />
        </div>
        <button type="button" className="relative rounded-xl border border-bs-border p-2.5 text-bs-muted transition hover:text-bs-text">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-bs-accent animate-pulse-dot" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bs-accent text-xs font-medium">
          JS
        </div>
      </div>
    </header>
  );
}
