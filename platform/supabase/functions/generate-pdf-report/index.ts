import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { authenticateAndGetRole, hasMinRole, unauthorizedResponse, forbiddenResponse } from "../_shared/rbac.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReportRequest {
  report_id: string;
  report_type: "analysis" | "mating" | "broodmare";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // RBAC: Authenticate and require premium_user for PDF downloads
    const roleCheck = await authenticateAndGetRole(req);
    if (!roleCheck.authorized) {
      return unauthorizedResponse(corsHeaders);
    }
    // Allow all authenticated users (trial users with credits handled client-side)

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const userId = roleCheck.userId;

    const { report_id, report_type } = (await req.json()) as ReportRequest;

    console.log("Generating PDF report:", { report_id, report_type });

    let reportData: any;

    // Fetch report data based on type
    if (report_type === "analysis") {
      const { data, error } = await supabaseClient
        .from("analysis_reports")
        .select("*")
        .eq("id", report_id)
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      reportData = data;
    } else if (report_type === "mating") {
      const { data, error } = await supabaseClient
        .from("matings")
        .select("*, stallion:stallion_id(name, sire, dam), mare:mare_id(name, sire, dam)")
        .eq("id", report_id)
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      reportData = data;
    } else if (report_type === "broodmare") {
      const { data, error } = await supabaseClient
        .from("broodmare_plans")
        .select("*, mare:mare_id(name, sire, dam, year_of_birth)")
        .eq("id", report_id)
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      reportData = data;
    }

    // Generate professional HTML report
    const htmlContent = generateProfessionalHTML(reportData, report_type);

    // Use Puppeteer/Chrome via Deno Deploy or return HTML for client-side conversion
    // For now, we'll return the HTML which can be converted to PDF client-side
    return new Response(
      JSON.stringify({
        success: true,
        html: htmlContent,
        report_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-pdf-report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateProfessionalHTML(data: any, type: string): string {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (type === "mating") {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', -apple-system, sans-serif; 
      line-height: 1.6; 
      color: #1a1a1a;
      background: #ffffff;
    }
    .container { 
      max-width: 210mm; 
      margin: 0 auto; 
      padding: 20mm;
    }
    .header {
      border-bottom: 4px solid #0F172A;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 5px;
    }
    .tagline {
      font-size: 14px;
      color: #64748b;
      font-weight: 500;
    }
    .report-title {
      font-size: 28px;
      font-weight: 700;
      color: #0F172A;
      margin: 30px 0 10px 0;
    }
    .report-subtitle {
      font-size: 16px;
      color: #64748b;
      margin-bottom: 30px;
    }
    .mating-pair {
      background: linear-gradient(135deg, #0F172A 0%, #1e293b 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin: 30px 0;
    }
    .mating-pair h2 {
      font-size: 24px;
      margin-bottom: 20px;
      text-align: center;
    }
    .horses-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 20px;
      align-items: center;
    }
    .horse-card {
      background: rgba(255,255,255,0.1);
      padding: 20px;
      border-radius: 8px;
    }
    .horse-card h3 {
      font-size: 18px;
      margin-bottom: 10px;
    }
    .horse-card p {
      font-size: 13px;
      opacity: 0.9;
      margin: 5px 0;
    }
    .cross-icon {
      font-size: 36px;
      font-weight: 300;
      text-align: center;
    }
    .score-section {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
    }
    .score-header {
      text-align: center;
      margin-bottom: 25px;
    }
    .score-header h3 {
      font-size: 16px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .score-circle {
      width: 120px;
      height: 120px;
      margin: 0 auto;
      border-radius: 50%;
      background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 42px;
      font-weight: 700;
      color: white;
      box-shadow: 0 10px 30px rgba(212, 175, 55, 0.3);
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 25px;
    }
    .metric-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .metric-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #0F172A;
    }
    .metric-unit {
      font-size: 14px;
      color: #64748b;
    }
    .analysis-section {
      margin: 30px 0;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
    }
    .analysis-box {
      background: #f8fafc;
      border-left: 4px solid #D4AF37;
      padding: 20px;
      border-radius: 8px;
      margin: 15px 0;
    }
    .analysis-box h4 {
      font-size: 14px;
      font-weight: 600;
      color: #0F172A;
      margin-bottom: 10px;
    }
    .analysis-box ul {
      list-style: none;
      padding: 0;
    }
    .analysis-box li {
      padding: 8px 0;
      padding-left: 25px;
      position: relative;
      font-size: 14px;
      color: #475569;
    }
    .analysis-box li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #22c55e;
      font-weight: 700;
    }
    .recommendation-box {
      background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      margin: 30px 0;
    }
    .recommendation-box h3 {
      font-size: 18px;
      margin-bottom: 15px;
    }
    .recommendation-box p {
      font-size: 14px;
      line-height: 1.8;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    .chart-placeholder {
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      color: #64748b;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">BloodstockAI</div>
      <div class="tagline">Professional Bloodstock Analysis</div>
    </div>

    <div class="report-title">Genetic Compatibility Analysis</div>
    <div class="report-subtitle">Report Generated: ${currentDate}</div>

    <div class="mating-pair">
      <h2>Mating Pair Analysis</h2>
      <div class="horses-grid">
        <div class="horse-card">
          <h3>Stallion</h3>
          <p><strong>${data.stallion?.name || "N/A"}</strong></p>
          <p>Sire: ${data.stallion?.sire || "Unknown"}</p>
          <p>Dam: ${data.stallion?.dam || "Unknown"}</p>
        </div>
        <div class="cross-icon">×</div>
        <div class="horse-card">
          <h3>Mare</h3>
          <p><strong>${data.mare?.name || "N/A"}</strong></p>
          <p>Sire: ${data.mare?.sire || "Unknown"}</p>
          <p>Dam: ${data.mare?.dam || "Unknown"}</p>
        </div>
      </div>
    </div>

    <div class="score-section">
      <div class="score-header">
        <h3>OVERALL COMPATIBILITY SCORE</h3>
        <div class="score-circle">${data.compatibility_score || 0}%</div>
      </div>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Success Rate</div>
          <div class="metric-value">${data.success_probability || 0}<span class="metric-unit">%</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Est. Value</div>
          <div class="metric-value">€${((data.estimated_value || 0) / 1000).toFixed(0)}<span class="metric-unit">K</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Market Potential</div>
          <div class="metric-value">${data.compatibility_score >= 85 ? "High" : data.compatibility_score >= 70 ? "Medium" : "Moderate"}</div>
        </div>
      </div>
    </div>

    <div class="analysis-section">
      <div class="section-title">Genetic Analysis</div>
      
      ${data.genetic_analysis?.strengths && data.genetic_analysis.strengths.length > 0 ? `
      <div class="analysis-box">
        <h4>Genetic Strengths</h4>
        <ul>
          ${data.genetic_analysis.strengths.map((s: string) => `<li>${s}</li>`).join("")}
        </ul>
      </div>
      ` : ""}

      ${data.genetic_analysis?.concerns && data.genetic_analysis.concerns.length > 0 ? `
      <div class="analysis-box">
        <h4>Considerations</h4>
        <ul>
          ${data.genetic_analysis.concerns.map((c: string) => `<li>${c}</li>`).join("")}
        </ul>
      </div>
      ` : ""}

      ${data.genetic_analysis?.notable_ancestors && data.genetic_analysis.notable_ancestors.length > 0 ? `
      <div class="analysis-box">
        <h4>Notable Ancestors in Pedigree</h4>
        <ul>
          ${data.genetic_analysis.notable_ancestors.map((a: string) => `<li>${a}</li>`).join("")}
        </ul>
      </div>
      ` : ""}
    </div>

    ${data.recommendations && data.recommendations.length > 0 ? `
    <div class="recommendation-box">
      <h3>AI Recommendations</h3>
      ${data.recommendations.map((r: string) => `<p>${r}</p>`).join("")}
    </div>
    ` : ""}

    <div class="footer">
      <p><strong>BloodstockAI</strong> - Professional AI-Powered Bloodstock Analysis</p>
      <p>This report was generated using advanced artificial intelligence algorithms</p>
      <p>© ${new Date().getFullYear()} BloodstockAI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // Add more report types as needed
  return `<html><body><h1>Report not implemented for type: ${type}</h1></body></html>`;
}
