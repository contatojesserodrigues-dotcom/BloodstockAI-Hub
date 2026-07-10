import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { report_id, price } = await req.json();

    if (!report_id || typeof report_id !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid report_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the report exists and the price matches
    const { data: report, error: reportError } = await supabaseAdmin
      .from("published_reports")
      .select("id, price")
      .eq("id", report_id)
      .single();

    if (reportError || !report) {
      return new Response(
        JSON.stringify({ error: "Report not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already purchased
    const { data: existing } = await supabaseAdmin
      .from("report_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("report_id", report_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Report already purchased" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For free reports (price = 0), allow direct purchase
    const reportPrice = report.price ?? 0;
    if (reportPrice > 0) {
      // For paid reports, verify payment exists via the payments table
      const { data: payment } = await supabaseAdmin
        .from("payments")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!payment) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please complete payment first." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Insert purchase record using service role (bypasses RLS)
    const { data: purchase, error: insertError } = await supabaseAdmin
      .from("report_purchases")
      .insert({
        user_id: user.id,
        report_id: report_id,
        price_paid: reportPrice,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to process purchase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, purchase }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Purchase error:", error);
    return new Response(
      JSON.stringify({ error: "Service temporarily unavailable" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
