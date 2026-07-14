import { supabase } from "@/integrations/supabase/client";

const PAID_PLANS = ["starter", "pro", "enterprise"];

/** Poll profile until Revolut webhook activates the paid plan. */
export async function waitForActivatedPlan(userId: string, maxAttempts = 15) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, analyses_remaining, analyses_limit")
      .eq("user_id", userId)
      .maybeSingle();

    const plan = profile?.plan ?? "free";
    if (PAID_PLANS.includes(plan)) {
      return profile;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return null;
}
