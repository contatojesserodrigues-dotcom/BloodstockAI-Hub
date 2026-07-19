import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ZoomIn, ZoomOut, Maximize2, Download, X, ChevronLeft, ChevronRight,
  Pencil, Highlighter, Eraser, Undo2, Redo2, Save, FileText, Loader2, Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

type AnnotationsByPage = Record<number, string>; // page -> SVG paths JSON

type DrawingTool = "pen" | "highlighter" | "eraser" | "text" | "none";
type Point = { x: number; y: number };
type AnnotationStroke = {
  id: string;
  tool: "pen" | "highlighter";
  color: string;
  width: number;
  points: Point[];
};
type AnnotationText = {
  id: string;
  kind: "text";
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
};
type EditingText = { x: number; y: number; value: string };

const PEN_COLORS = ["#101A39", "#C9A84C", "#DC2626", "#16A34A", "#2563EB", "#000000"];
const ANNOTATION_WIDTH = 1000;

function parseAnnotation(raw?: string): { strokes: AnnotationStroke[]; texts: AnnotationText[] } {
  if (!raw) return { strokes: [], texts: [] };
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data?.strokes)) return { strokes: data.strokes, texts: Array.isArray(data?.texts) ? data.texts : [] };
    // Backward compatible with older react-sketch-canvas saved paths.
    if (Array.isArray(data)) {
      const strokes = data
        .filter((p) => Array.isArray(p?.paths) && p.paths.length > 0)
        .map((p, i) => ({
          id: p.id || `legacy-${i}-${Date.now()}`,
          tool: (p.strokeColor?.length > 7 ? "highlighter" : "pen") as "pen" | "highlighter",
          color: p.strokeColor || PEN_COLORS[0],
          width: Number(p.strokeWidth) || 3,
          points: p.paths.map((pt: any) => ({ x: Number(pt.x) || 0, y: Number(pt.y) || 0 })),
        }));
      return { strokes, texts: [] };
    }
  } catch {
    return { strokes: [], texts: [] };
  }
  return { strokes: [], texts: [] };
}

function stringifyAnnotation(strokes: AnnotationStroke[], texts: AnnotationText[]) {
  return JSON.stringify({ version: 3, strokes, texts });
}

function pointsToPath(points: Point[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const prev = points[index - 1];
    const midX = (prev.x + point.x) / 2;
    const midY = (prev.y + point.y) / 2;
    return `${path} Q ${prev.x} ${prev.y} ${midX} ${midY}`;
  }, "");
}

function pointToSegmentDistance(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function strokeNearPoint(stroke: AnnotationStroke, point: Point) {
  if (stroke.points.length === 1) return Math.hypot(stroke.points[0].x - point.x, stroke.points[0].y - point.y) <= stroke.width + 10;
  return stroke.points.some((p, i) => i > 0 && pointToSegmentDistance(point, stroke.points[i - 1], p) <= stroke.width + 10);
}

export interface PedigreePdfViewerProps {
  url: string | null;
  fileName?: string | null;
  annotations?: AnnotationsByPage | null;
  onSaveAnnotations?: (next: AnnotationsByPage) => Promise<void> | void;
}

/** Thumbnail preview card + full-screen viewer with annotation toolbar. */
export function PedigreePdfViewer({ url, fileName, annotations, onSaveAnnotations }: PedigreePdfViewerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNum, setPageNum] = useState<number>(1);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [fetchingPdf, setFetchingPdf] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [viewerError, setViewerError] = useState(false);
  const [tool, setTool] = useState<DrawingTool>("none");
  const [color, setColor] = useState<string>(PEN_COLORS[0]);
  const [stroke, setStroke] = useState<number>(3);
  const [pageWidth, setPageWidth] = useState<number>(900);
  const [pageHeight, setPageHeight] = useState<number>(1200);
  const [saving, setSaving] = useState(false);
  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [texts, setTexts] = useState<AnnotationText[]>([]);
  const [editingText, setEditingTextState] = useState<EditingText | null>(null);
  const [currentStroke, setCurrentStroke] = useState<AnnotationStroke | null>(null);
  const [redoStack, setRedoStack] = useState<{ strokes: AnnotationStroke[]; texts: AnnotationText[] }[]>([]);
  const strokesRef = useRef<AnnotationStroke[]>([]);
  const textsRef = useRef<AnnotationText[]>([]);
  const editingTextRef = useRef<EditingText | null>(null);
  const localAnnotationsRef = useRef<AnnotationsByPage>(annotations || {});
  const pendingAnnotationsRef = useRef<AnnotationsByPage>(annotations || {});
  const hasLocalPendingRef = useRef(false);
  const currentStrokeRef = useRef<AnnotationStroke | null>(null);
  const pointerRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveVersionRef = useRef(0);

  useEffect(() => {
    if (open || hasLocalPendingRef.current) return;
    const next = annotations || {};
    localAnnotationsRef.current = next;
    pendingAnnotationsRef.current = next;
  }, [annotations, open]);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { textsRef.current = texts; }, [texts]);
  useEffect(() => () => {
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
  }, []);

  // Signed storage URLs can fail inside pdf.js range requests on some browsers.
  // Fetch once as a Blob and render the local object URL, falling back to the direct URL/open button.
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setFetchingPdf(true);
    setPdfObjectUrl(null);
    setPreviewError(false);
    setViewerError(false);
    setNumPages(0);
    setPageNum(1);

    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`PDF unavailable (${res.status})`);
        const blob = await res.blob();
        if (!blob.size) throw new Error("PDF file is empty");
        objectUrl = URL.createObjectURL(blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" }));
        if (!cancelled) setPdfObjectUrl(objectUrl);
      })
      .catch((e) => {
        console.error("Pedigree PDF load failed", e);
        if (!cancelled) {
          setPdfObjectUrl(null);
          setPreviewError(true);
          setViewerError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setFetchingPdf(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  // Recompute responsive page width when modal opens or window resizes
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const w = containerRef.current?.clientWidth ?? 900;
      setPageWidth(Math.min(w - 16, 1100));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  // Load annotations for current page into the drawing layer
  useEffect(() => {
    if (!open) return;
    setCurrentStroke(null);
    currentStrokeRef.current = null;
    setRedoStack([]);
    setEditingText(null);
    const parsed = parseAnnotation(localAnnotationsRef.current[pageNum]);
    strokesRef.current = parsed.strokes;
    textsRef.current = parsed.texts;
    setStrokes(parsed.strokes);
    setTexts(parsed.texts);
  }, [pageNum, open]);

  if (!url) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-xs text-muted-foreground">
        <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
        No pedigree PDF uploaded yet.
      </div>
    );
  }

  function scheduleAutosave(next: AnnotationsByPage) {
    if (!onSaveAnnotations) return;
    hasLocalPendingRef.current = true;
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    const version = ++autosaveVersionRef.current;
    autosaveTimerRef.current = window.setTimeout(async () => {
      setSaving(true);
      let saved = false;
      try {
        await onSaveAnnotations(pendingAnnotationsRef.current);
        saved = true;
      } catch (e: any) {
        toast({ title: "Annotation autosave failed", description: e?.message || "Please tap Save.", variant: "destructive" });
      } finally {
        if (version === autosaveVersionRef.current) {
          if (saved) hasLocalPendingRef.current = false;
          setSaving(false);
        }
      }
    }, 650);
  }

  function setEditingText(next: EditingText | null) {
    editingTextRef.current = next;
    setEditingTextState(next);
  }

  function updatePageAnnotations(nextStrokes: AnnotationStroke[], nextTexts: AnnotationText[], autoSave = true) {
    strokesRef.current = nextStrokes;
    textsRef.current = nextTexts;
    setStrokes(nextStrokes);
    setTexts(nextTexts);
    const next = { ...localAnnotationsRef.current, [pageNum]: stringifyAnnotation(nextStrokes, nextTexts) };
    localAnnotationsRef.current = next;
    pendingAnnotationsRef.current = next;
    if (autoSave) scheduleAutosave(next);
    return next;
  }

  function snapshotWithEditingText() {
    let pageStrokes = currentStrokeRef.current ? [...strokesRef.current, currentStrokeRef.current] : strokesRef.current;
    let pageTexts = textsRef.current;
    const activeEditingText = editingTextRef.current;
    if (activeEditingText) {
      const value = activeEditingText.value.trim();
      setEditingText(null);
      if (value) {
        pageTexts = [...pageTexts, {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          kind: "text" as const,
          x: activeEditingText.x,
          y: activeEditingText.y,
          text: value,
          color,
          fontSize: Math.max(stroke * 4, 16),
        }];
      }
    }
    currentStrokeRef.current = null;
    setCurrentStroke(null);
    return { pageStrokes, pageTexts };
  }

  async function persistCurrentPage(autoSave = false) {
    const { pageStrokes, pageTexts } = snapshotWithEditingText();
    return updatePageAnnotations(pageStrokes, pageTexts, autoSave);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      const next = await persistCurrentPage(false);
      hasLocalPendingRef.current = true;
      await onSaveAnnotations?.(next);
      hasLocalPendingRef.current = false;
      toast({ title: "Annotations saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally { setSaving(false); }
  }

  function setActiveTool(next: typeof tool) {
    setTool(next);
    setCurrentStroke(null);
    currentStrokeRef.current = null;
    setEditingText(null);
  }

  function getSvgPoint(e: PointerEvent<SVGSVGElement>): Point {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const annotationHeight = Math.max(1, (pageHeight / pageWidth) * ANNOTATION_WIDTH);
    return {
      x: Math.max(0, Math.min(ANNOTATION_WIDTH, ((e.clientX - rect.left) / rect.width) * ANNOTATION_WIDTH)),
      y: Math.max(0, Math.min(annotationHeight, ((e.clientY - rect.top) / rect.height) * annotationHeight)),
    };
  }

  function handlePointerDown(e: PointerEvent<SVGSVGElement>) {
    if (tool === "none") return;
    e.preventDefault();
    e.stopPropagation();
    const point = getSvgPoint(e);

    if (tool === "text") {
      if (editingTextRef.current) {
        const { pageStrokes, pageTexts } = snapshotWithEditingText();
        updatePageAnnotations(pageStrokes, pageTexts, true);
      }
      setEditingText({ x: point.x, y: point.y, value: "" });
      return;
    }

    pointerRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (tool === "eraser") {
      // Try to erase a text first (hit area ~ text bbox)
      const textHit = [...textsRef.current].reverse().findIndex((t) =>
        Math.abs(point.x - t.x) < t.text.length * t.fontSize * 0.35 && Math.abs(point.y - t.y) < t.fontSize
      );
      if (textHit >= 0) {
        const idx = textsRef.current.length - 1 - textHit;
        setRedoStack((prev) => [...prev, { strokes: strokesRef.current, texts: textsRef.current }]);
        updatePageAnnotations(strokesRef.current, textsRef.current.filter((_, i) => i !== idx), true);
        return;
      }
      const hitIndex = [...strokesRef.current].reverse().findIndex((item) => strokeNearPoint(item, point));
      if (hitIndex >= 0) {
        const index = strokesRef.current.length - 1 - hitIndex;
        setRedoStack((prev) => [...prev, { strokes: strokesRef.current, texts: textsRef.current }]);
        updatePageAnnotations(strokesRef.current.filter((_, i) => i !== index), textsRef.current, true);
      }
      return;
    }

    const nextStroke: AnnotationStroke = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      tool,
      color: tool === "highlighter" ? color : color,
      width: tool === "highlighter" ? Math.max(stroke * 4, 14) : stroke,
      points: [point],
    };
    setRedoStack([]);
    currentStrokeRef.current = nextStroke;
    setCurrentStroke(nextStroke);
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!currentStrokeRef.current || pointerRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    const point = getSvgPoint(e);
    const nextStroke = { ...currentStrokeRef.current, points: [...currentStrokeRef.current.points, point] };
    currentStrokeRef.current = nextStroke;
    setCurrentStroke(nextStroke);
  }

  function finishStroke(e?: PointerEvent<SVGSVGElement>) {
    if (e && pointerRef.current !== e.pointerId) return;
    if (currentStrokeRef.current) {
      const finished = currentStrokeRef.current;
      updatePageAnnotations([...strokesRef.current, finished], textsRef.current, true);
      setCurrentStroke(null);
      currentStrokeRef.current = null;
    }
    if (e) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    pointerRef.current = null;
  }

  function undoStroke() {
    // Undo most recent action between strokes and texts
    if (texts.length && (!strokes.length || (textsRef.current[textsRef.current.length - 1]?.id ?? "") > (strokesRef.current[strokesRef.current.length - 1]?.id ?? ""))) {
      setRedoStack((redo) => [...redo, { strokes: strokesRef.current, texts: textsRef.current }]);
      updatePageAnnotations(strokesRef.current, textsRef.current.slice(0, -1), true);
      return;
    }
    if (strokes.length) {
      setRedoStack((redo) => [...redo, { strokes: strokesRef.current, texts: textsRef.current }]);
      updatePageAnnotations(strokesRef.current.slice(0, -1), textsRef.current, true);
    }
  }

  function redoStroke() {
    setRedoStack((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      updatePageAnnotations(last.strokes, last.texts, true);
      return prev.slice(0, -1);
    });
  }

  function commitEditingText() {
    const activeEditingText = editingTextRef.current;
    if (!activeEditingText) return;
    const value = activeEditingText.value.trim();
    setEditingText(null);
    if (value) {
      setRedoStack((prev) => [...prev, { strokes: strokesRef.current, texts: textsRef.current }]);
      updatePageAnnotations(strokesRef.current, [...textsRef.current, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind: "text",
        x: activeEditingText.x,
        y: activeEditingText.y,
        text: value,
        color,
        fontSize: Math.max(stroke * 4, 16),
      }], true);
    }
  }

  const isDrawing = tool !== "none";
  const renderUrl = pdfObjectUrl || url;
  const visibleStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
  const annotationHeight = Math.max(1, (pageHeight / pageWidth) * ANNOTATION_WIDTH);

  const drawingLayer = (
    <div
      className={cn("absolute inset-0 z-30", isDrawing && "cursor-crosshair")}
      style={{ pointerEvents: isDrawing ? "auto" : "none", touchAction: isDrawing ? "none" : "auto" }}
    >
      <svg
        ref={svgRef}
        className="h-full w-full select-none"
        viewBox={`0 0 ${ANNOTATION_WIDTH} ${annotationHeight}`}
        preserveAspectRatio="none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        onPointerLeave={finishStroke}
      >
        {visibleStrokes.map((item) => (
          <path
            key={item.id}
            d={pointsToPath(item.points)}
            fill="none"
            stroke={item.color}
            strokeWidth={item.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={item.tool === "highlighter" ? 0.35 : 1}
            style={{ mixBlendMode: item.tool === "highlighter" ? "multiply" : "normal" }}
          />
        ))}
        {texts.map((t) => (
          <text
            key={t.id}
            x={t.x}
            y={t.y}
            fill={t.color}
            fontSize={t.fontSize}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontWeight={600}
            dominantBaseline="hanging"
          >{t.text}</text>
        ))}
      </svg>
      {editingText && (
        <input
          autoFocus
          value={editingText.value}
          onChange={(e) => setEditingText({ ...editingText, value: e.target.value })}
          onBlur={commitEditingText}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commitEditingText(); }
            if (e.key === "Escape") { e.preventDefault(); setEditingText(null); }
          }}
          placeholder="Type…"
          className="absolute bg-white/90 border border-secondary rounded px-1.5 py-0.5 text-sm outline-none shadow"
          style={{
            left: `${(editingText.x / ANNOTATION_WIDTH) * 100}%`,
            top: `${(editingText.y / annotationHeight) * 100}%`,
            color,
            fontSize: Math.max(stroke * 4, 16),
            minWidth: 120,
          }}
        />
      )}
    </div>
  );

  const pdfFallback = (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4 text-center bg-muted/20">
      <FileText className="w-7 h-7 text-muted-foreground" />
      <div>
        <div className="text-sm font-semibold">PDF disponível</div>
        <div className="text-xs text-muted-foreground">Tap to open in full screen.</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Thumbnail card */}
      <button
        onClick={() => setOpen(true)}
        className="group relative w-full rounded-lg border bg-card text-left overflow-hidden hover:shadow-md transition"
      >
        <div className="aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden">
          {fetchingPdf ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : previewError ? (
            pdfFallback
          ) : (
            <Document
              file={renderUrl}
              loading={<Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
              onLoadError={(e) => { console.error("PDF preview render failed", e); setPreviewError(true); setViewerError(true); }}
            >
              <Page pageNumber={1} width={260} renderAnnotationLayer={false} renderTextLayer={false} />
            </Document>
          )}
        </div>
        <div className="p-2.5 flex items-center justify-between gap-2 border-t bg-background">
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">{fileName || "Pedigree PDF"}</div>
            <div className="text-[10px] text-muted-foreground">Tap to open, zoom & annotate</div>
          </div>
          <Maximize2 className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) void persistCurrentPage(true);
          setOpen(nextOpen);
        }}
      >
        <DialogContent className="max-w-[100vw] sm:max-w-[96vw] w-[100vw] sm:w-[96vw] h-[100vh] sm:h-[94vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">Pedigree PDF Viewer</DialogTitle>
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-secondary shrink-0" />
              <div className="text-sm font-semibold truncate">{fileName || "Pedigree PDF"}</div>
            </div>
            <div className="flex items-center gap-1">
              <a href={url} target="_blank" rel="noreferrer" download>
                <Button variant="ghost" size="icon" title="Download"><Download className="w-4 h-4" /></Button>
              </a>
              <Button variant="ghost" size="icon" onClick={() => { void persistCurrentPage(true); setOpen(false); }} title="Close"><X className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Annotation toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b bg-muted/40">
            <Button variant={tool === "text" ? "default" : "outline"} size="sm" onClick={() => setActiveTool(tool === "text" ? "none" : "text")} title="Text">
              <Type className="w-4 h-4" />
            </Button>
            <Button variant={tool === "pen" ? "default" : "outline"} size="sm" onClick={() => setActiveTool(tool === "pen" ? "none" : "pen")} title="Pen">
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant={tool === "highlighter" ? "default" : "outline"} size="sm" onClick={() => setActiveTool(tool === "highlighter" ? "none" : "highlighter")} title="Highlighter">
              <Highlighter className="w-4 h-4" />
            </Button>
            <Button variant={tool === "eraser" ? "default" : "outline"} size="sm" onClick={() => setActiveTool(tool === "eraser" ? "none" : "eraser")} title="Eraser">
              <Eraser className="w-4 h-4" />
            </Button>
            <div className="mx-1 h-5 w-px bg-border" />
            <div className="flex items-center gap-1">
              {PEN_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className={cn("w-5 h-5 rounded-full border", color === c && "ring-2 ring-offset-1 ring-secondary")} style={{ backgroundColor: c }} aria-label="Colour" />
              ))}
            </div>
            <div className="mx-1 h-5 w-px bg-border" />
            <input type="range" min={1} max={12} value={stroke} onChange={(e) => setStroke(Number(e.target.value))} className="w-20" title="Stroke" />
            <div className="mx-1 h-5 w-px bg-border" />
            <Button variant="ghost" size="icon" onClick={undoStroke} title="Undo"><Undo2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={redoStroke} title="Redo"><Redo2 className="w-4 h-4" /></Button>
            <div className="ml-auto flex items-center gap-1.5">
              <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                Save
              </Button>
            </div>
          </div>

          {/* PDF + zoom + annotation canvas */}
          <div ref={containerRef} className="flex-1 min-h-0 overflow-auto bg-muted/30 flex justify-center items-start p-2">
            <TransformWrapper
              minScale={0.5}
              maxScale={4}
              doubleClick={{ disabled: true }}
              panning={{ disabled: isDrawing }}
              pinch={{ disabled: false }}
              wheel={{ step: 0.15 }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="absolute bottom-3 right-3 z-40 flex flex-col gap-1.5">
                    <Button variant="secondary" size="icon" onClick={() => zoomIn()} title="Zoom in"><ZoomIn className="w-4 h-4" /></Button>
                    <Button variant="secondary" size="icon" onClick={() => zoomOut()} title="Zoom out"><ZoomOut className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => resetTransform()} title="Reset" className="bg-background/80"><Maximize2 className="w-4 h-4" /></Button>
                  </div>
                  <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%" }}>
                    {viewerError ? (
                      <div className="relative mx-auto h-[78vh] max-h-full overflow-hidden rounded-md border bg-background" style={{ width: pageWidth }}>
                        <iframe src={url} title={fileName || "Pedigree PDF"} className="w-full h-full" />
                        {drawingLayer}
                      </div>
                    ) : (
                      <div className="relative mx-auto" style={{ width: pageWidth, height: pageHeight }}>
                        <Document
                          file={renderUrl}
                          onLoadSuccess={(p) => { setNumPages(p.numPages); setViewerError(false); }}
                          onLoadError={(e) => { console.error("PDF viewer render failed", e); setViewerError(true); }}
                          loading={<Loader2 className="w-6 h-6 animate-spin" />}
                        >
                          <Page
                            pageNumber={pageNum}
                            width={pageWidth}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                            onLoadSuccess={(p) => setPageHeight((pageWidth * p.height) / p.width)}
                          />
                        </Document>
                        {drawingLayer}
                      </div>
                    )}
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>

          {/* Page nav */}
          {numPages > 1 && (
            <div className="flex items-center justify-center gap-3 px-3 py-2 border-t bg-background">
              <Button
                variant="outline" size="sm"
                onClick={async () => { await persistCurrentPage(true); setPageNum(p => Math.max(1, p - 1)); }}
                disabled={pageNum <= 1}
              ><ChevronLeft className="w-4 h-4" /> Prev</Button>
              <span className="text-xs text-muted-foreground tabular-nums">Page {pageNum} / {numPages}</span>
              <Button
                variant="outline" size="sm"
                onClick={async () => { await persistCurrentPage(true); setPageNum(p => Math.min(numPages, p + 1)); }}
                disabled={pageNum >= numPages}
              >Next <ChevronRight className="w-4 h-4" /></Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PedigreePdfViewer;