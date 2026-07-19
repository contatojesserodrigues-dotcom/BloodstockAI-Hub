import { Bell, Search } from "lucide-react";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="bs-heading truncate">{title}</h1>
        {subtitle && (
          <p className="bs-subheading mt-1 line-clamp-2 sm:line-clamp-none">{subtitle}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bs-muted" />
          <input className="bs-input w-48 pl-9 lg:w-64" placeholder="Search agents, leads..." />
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
