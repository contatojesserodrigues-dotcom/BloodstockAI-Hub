import { supabase } from "@/integrations/supabase/client";

export interface DownloadPDFResult {
  success: boolean;
  fallbackJson?: unknown;
  errorMessage?: string;
  errorCode?: string;
}

export const downloadPDFReport = async (
  reportId: string,
  reportType: "analysis" | "mating" | "broodmare",
  fileName: string
): Promise<DownloadPDFResult> => {
  // 1) Try server-side HTML generation.
  try {
    const { data, error } = await supabase.functions.invoke("generate-pdf-report", {
      body: { report_id: reportId, report_type: reportType },
    });
    if (error) throw error;
    if (!data?.html || typeof data.html !== "string") {
      throw new Error("PDF generator returned an empty response.");
    }

    const htmlContent = data.html as string;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    } else {
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    return { success: true };
  } catch (error) {
    console.error("Error downloading PDF, falling back to JSON:", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error ?? "Unknown error generating PDF");

    // 2) Fallback: pull the structured report JSON so the user can still view / save it.
    let fallbackJson: unknown = null;
    try {
      const table =
        reportType === "mating"
          ? "matings"
          : reportType === "broodmare"
          ? "broodmare_plans"
          : "analysis_reports";
      const { data: row, error: rowErr } = await supabase
        .from(table as any)
        .select("*")
        .eq("id", reportId)
        .maybeSingle();
      if (!rowErr && row) fallbackJson = row;
    } catch (jsonErr) {
      console.warn("Fallback JSON fetch failed:", jsonErr);
    }

    // 3) If we have JSON, offer it as a download so nothing is lost.
    if (fallbackJson) {
      try {
        const blob = new Blob([JSON.stringify(fallbackJson, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (dlErr) {
        console.warn("Fallback JSON download failed:", dlErr);
      }
    }

    return {
      success: false,
      fallbackJson: fallbackJson ?? undefined,
      errorMessage,
      errorCode: "PDF_GENERATION_FAILED",
    };
  }
};
