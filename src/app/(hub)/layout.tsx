import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bs-bg">
      <Sidebar />
      <main className="pl-60">
        <div className="bs-container py-8">{children}</div>
      </main>
    </div>
  );
}
