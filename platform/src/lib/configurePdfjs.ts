import * as pdfjsLib from "pdfjs-dist";
// Bundled worker — CDN version mismatches cause "undefined is not a function" at runtime.
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let configured = false;

export function configurePdfjs() {
  if (configured) return pdfjsLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  configured = true;
  return pdfjsLib;
}

export { pdfjsLib, pdfWorker as pdfWorkerUrl };
