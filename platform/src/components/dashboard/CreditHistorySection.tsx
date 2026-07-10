import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History } from "lucide-react";

export const CreditHistorySection = () => {
  const { user } = useAuth();

  const { data: history } = useQuery({
    queryKey: ["credit_history", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("usage_tracking")
        .select("action, page_used, credits_delta, balance_after, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const filteredHistory = (history ?? []).filter(
    (row) => row.action && row.action.length > 0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-5 h-5" />
          Credit History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredHistory.length === 0 ? (
          <p className="text-sm" style={{ color: '#6B7280' }}>No credit activity yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: '#0F172A' }}>
                  <TableHead className="text-white text-xs">Date & Time</TableHead>
                  <TableHead className="text-white text-xs">Action</TableHead>
                  <TableHead className="text-white text-xs">Page Used</TableHead>
                  <TableHead className="text-white text-xs text-right">Credits</TableHead>
                  <TableHead className="text-white text-xs text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((row, idx) => {
                  const date = new Date(row.created_at ?? "");
                  const isPositive = (row.credits_delta ?? 0) > 0;
                  return (
                    <TableRow
                      key={idx}
                      style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F5F6F7' }}
                    >
                      <TableCell className="text-xs" style={{ color: '#6B7280' }}>
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-xs font-semibold" style={{ color: '#111827' }}>
                        {row.action}
                      </TableCell>
                      <TableCell className="text-xs" style={{ color: '#6B7280' }}>
                        {row.page_used || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold" style={{ color: isPositive ? '#22863A' : '#E53E3E' }}>
                        {isPositive ? `+${row.credits_delta}` : row.credits_delta}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold" style={{ color: '#111827' }}>
                        {row.balance_after ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
