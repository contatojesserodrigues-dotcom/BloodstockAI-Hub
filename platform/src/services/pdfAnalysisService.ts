import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

export interface CatalogHip {
  hipNumber: number;
  name?: string;
  sex: string;
  age: string;
  color?: string;
  sire: string;
  dam: string;
  damSire: string;
  consignor?: string;
  pedigreeText: string;
  performanceNotes?: string;
  rawText: string;
}

export interface PDFAnalysisResult {
  auctionName: string;
  auctionDate?: string;
  totalHips: number;
  hips: CatalogHip[];
  analysisNotes: string[];
}

export async function analyzeSalesCatalogPDF(
  pdfBase64: string,
  fileName: string
): Promise<PDFAnalysisResult> {
  const data = await invokeEdgeFunction<PDFAnalysisResult>("ai-analysis", {
    requireSession: true,
    body: {
      type: "pdf_catalog",
      payload: {
        pdfBase64,
        fileName,
        instructions: `Extract ALL horse entries from this sales catalog: ${fileName}

For each hip extract:
1. Hip number
2. Name (if named)
3. Sex and age
4. Color
5. Sire name (EXACT spelling — critical)
6. Dam name (EXACT spelling — critical)
7. Dam Sire (EXACT spelling — critical)
8. Consignor/vendor
9. Complete pedigree text
10. Any performance notes or stakes records

Return ONLY this JSON:
{
  "auctionName": "",
  "auctionDate": "",
  "totalHips": 0,
  "hips": [{
    "hipNumber": 1,
    "name": null,
    "sex": "",
    "age": "",
    "color": "",
    "sire": "",
    "dam": "",
    "damSire": "",
    "consignor": "",
    "pedigreeText": "",
    "performanceNotes": "",
    "rawText": ""
  }],
  "analysisNotes": []
}

Extract EVERY hip. Do not skip any. Be extremely precise with name spellings.`,
      },
    },
  });

  return data;
}

export async function comparePDFsAndGenerateReport(
  pdfs: Array<{ base64: string; fileName: string }>,
  comparisonGoal: string
): Promise<{ report: string; rankings: Array<{ hipNumber: number; fileName: string; score: number; reasoning: string }> }> {
  const data = await invokeEdgeFunction<{ report: string; rankings: Array<{ hipNumber: number; fileName: string; score: number; reasoning: string }> }>("ai-analysis", {
    requireSession: true,
    body: {
      type: "pdf_comparison",
      payload: {
        pdfs: pdfs.map(p => ({ fileName: p.fileName, base64: p.base64 })),
        comparisonGoal,
        instructions: `Compare these ${pdfs.length} sales catalog PDFs and generate a ranked report.
Goal: ${comparisonGoal}

For each horse across all catalogs: analyze pedigree quality, performance, commercial value.

Return JSON: { "report": "executive summary", "rankings": [{ "hipNumber": 0, "fileName": "", "score": 0, "reasoning": "" }] }`,
      },
    },
  });

  return data;
}
