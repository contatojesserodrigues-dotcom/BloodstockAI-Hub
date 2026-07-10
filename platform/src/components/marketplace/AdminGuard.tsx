import { Navigate } from "react-router-dom";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isLoading } = useUserRole();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Checking access...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default AdminGuard;