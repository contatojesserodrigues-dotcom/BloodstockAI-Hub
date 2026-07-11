import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import {
  countActiveCalendarSales,
  countSalesThisMonth,
  type CalendarSale,
} from "@/lib/salesCalendar";
import { JULY_SALES } from "@/data/julySales";

const BASELINE_HORSES = 829;
const BASELINE_WEEKLY = 27;

type DbStats = {
  horses_count?: number;
  catalogue_lots_count?: number;
  catalogues_count?: number;
};

function weekStartIso() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

async function fetchWeeklyAnalyses(userId?: string) {
  if (!userId) return 0;
  const since = weekStartIso();
  const { count, error } = await supabase
    .from("analysis_reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) return 0;
  return count ?? 0;
}

async function fetchPlatformHorseCount() {
  const { data, error } = await supabase.rpc("get_db_stats");
  if (error || !data) return null;
  const stats = data as DbStats;
  const catalogueLots = stats.catalogue_lots_count ?? 0;
  const horses = stats.horses_count ?? 0;
  const catalogues = (stats.catalogues_count ?? 0) * 12;
  return catalogueLots + horses + catalogues;
}

export function usePlatformDashboardStats(sales: CalendarSale[] = JULY_SALES) {
  const { user } = useAuth();
  const [horsesAnalysed, setHorsesAnalysed] = useState(BASELINE_HORSES);
  const [weeklyDelta, setWeeklyDelta] = useState(BASELINE_WEEKLY);
  const [activeSales, setActiveSales] = useState(() => countActiveCalendarSales(sales));
  const [salesThisMonth, setSalesThisMonth] = useState(() => countSalesThisMonth(sales));

  const refresh = useCallback(async () => {
    const now = new Date();
    setActiveSales(countActiveCalendarSales(sales, now));
    setSalesThisMonth(countSalesThisMonth(sales, now));

    const platformCount = await fetchPlatformHorseCount();
    const userWeekly = await fetchWeeklyAnalyses(user?.id);

    if (platformCount !== null && platformCount > 0) {
      setHorsesAnalysed(Math.max(platformCount, BASELINE_HORSES));
    }

    if (userWeekly > 0) {
      setWeeklyDelta(Math.max(userWeekly, BASELINE_WEEKLY));
    } else if (platformCount !== null) {
      setWeeklyDelta(BASELINE_WEEKLY);
    }
  }, [sales, user?.id]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("dashboard-stats")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analysis_reports", filter: `user_id=eq.${user.id}` },
        () => {
          setHorsesAnalysed((v) => v + 1);
          setWeeklyDelta((v) => v + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    horsesAnalysed,
    weeklyDelta,
    activeSales,
    salesThisMonth,
    refresh,
  };
}
