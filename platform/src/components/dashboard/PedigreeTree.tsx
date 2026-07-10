import { useState, useMemo, useCallback } from "react";
import { GitBranch, ChevronDown, ChevronUp, ChevronRight, Search, Shield, Dna } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PedigreeData {
  sire?: string;
  dam?: string;
  dam_sire?: string;
  sire_sire?: string;
  sire_dam?: string;
  dam_dam?: string;
  sire_sire_sire?: string;
  sire_sire_dam?: string;
  sire_dam_sire?: string;
  sire_dam_dam?: string;
  dam_sire_sire?: string;
  dam_sire_dam?: string;
  dam_dam_sire?: string;
  dam_dam_dam?: string;
  generation_3?: string[];
  generation_4?: string[];
  generation_5?: string[];
}

interface PedigreeTreeProps {
  pedigree: PedigreeData;
  horseName: string;
  onAncestorClick?: (name: string) => void;
  confidenceScore?: number;
  inbreedingPatterns?: string[];
}

const sanitize = (v?: string | null) => {
  if (!v || v === "Data unavailable" || v === "N/A" || v === "Unknown" || v === "—") return "Unknown";
  return v.replace(/checked:\s*[^\n]+/gi, "").trim() || "Unknown";
};

// ═══ INBREEDING DETECTION ═══
function countAllAncestors(pedigree: PedigreeData): Map<string, number> {
  const counts = new Map<string, number>();
  const invalid = new Set(["unknown", "", "data unavailable", "n/a", "—"]);

  const add = (v?: string | null) => {
    const s = sanitize(v).toLowerCase();
    if (invalid.has(s)) return;
    counts.set(s, (counts.get(s) || 0) + 1);
  };

  add(pedigree.sire); add(pedigree.dam);
  add(pedigree.sire_sire); add(pedigree.sire_dam); add(pedigree.dam_sire); add(pedigree.dam_dam);
  add(pedigree.sire_sire_sire); add(pedigree.sire_sire_dam);
  add(pedigree.sire_dam_sire); add(pedigree.sire_dam_dam);
  add(pedigree.dam_sire_sire); add(pedigree.dam_sire_dam);
  add(pedigree.dam_dam_sire); add(pedigree.dam_dam_dam);
  (pedigree.generation_3 || []).forEach(add);
  (pedigree.generation_4 || []).forEach(add);
  (pedigree.generation_5 || []).forEach(add);

  return counts;
}

function getInbredMap(pedigree: PedigreeData): Map<string, number> {
  const counts = countAllAncestors(pedigree);
  const inbred = new Map<string, number>();
  counts.forEach((count, name) => { if (count > 1) inbred.set(name, count); });
  return inbred;
}

// ═══ TREE STRUCTURE ═══
interface TreeNode {
  name: string;
  sire?: TreeNode;
  dam?: TreeNode;
}

function buildTree(pedigree: PedigreeData, horseName: string): TreeNode {
  const g3 = pedigree.generation_3 || [];
  const g4 = pedigree.generation_4 || [];
  const g5 = pedigree.generation_5 || [];
  const n = (v?: string, fallback?: string) => sanitize(v || fallback);

  return {
    name: horseName,
    sire: {
      name: n(pedigree.sire),
      sire: {
        name: n(pedigree.sire_sire),
        sire: { name: n(pedigree.sire_sire_sire, g3[0]),
          sire: { name: n(g4[0]), sire: { name: n(g5[0]) }, dam: { name: n(g5[1]) } },
          dam: { name: n(g4[1]), sire: { name: n(g5[2]) }, dam: { name: n(g5[3]) } } },
        dam: { name: n(pedigree.sire_sire_dam, g3[1]),
          sire: { name: n(g4[2]), sire: { name: n(g5[4]) }, dam: { name: n(g5[5]) } },
          dam: { name: n(g4[3]), sire: { name: n(g5[6]) }, dam: { name: n(g5[7]) } } },
      },
      dam: {
        name: n(pedigree.sire_dam),
        sire: { name: n(pedigree.sire_dam_sire, g3[2]),
          sire: { name: n(g4[4]), sire: { name: n(g5[8]) }, dam: { name: n(g5[9]) } },
          dam: { name: n(g4[5]), sire: { name: n(g5[10]) }, dam: { name: n(g5[11]) } } },
        dam: { name: n(pedigree.sire_dam_dam, g3[3]),
          sire: { name: n(g4[6]), sire: { name: n(g5[12]) }, dam: { name: n(g5[13]) } },
          dam: { name: n(g4[7]), sire: { name: n(g5[14]) }, dam: { name: n(g5[15]) } } },
      },
    },
    dam: {
      name: n(pedigree.dam),
      sire: {
        name: n(pedigree.dam_sire),
        sire: { name: n(pedigree.dam_sire_sire, g3[4]),
          sire: { name: n(g4[8]), sire: { name: n(g5[16]) }, dam: { name: n(g5[17]) } },
          dam: { name: n(g4[9]), sire: { name: n(g5[18]) }, dam: { name: n(g5[19]) } } },
        dam: { name: n(pedigree.dam_sire_dam, g3[5]),
          sire: { name: n(g4[10]), sire: { name: n(g5[20]) }, dam: { name: n(g5[21]) } },
          dam: { name: n(g4[11]), sire: { name: n(g5[22]) }, dam: { name: n(g5[23]) } } },
      },
      dam: {
        name: n(pedigree.dam_dam),
        sire: { name: n(pedigree.dam_dam_sire, g3[6]),
          sire: { name: n(g4[12]), sire: { name: n(g5[24]) }, dam: { name: n(g5[25]) } },
          dam: { name: n(g4[13]), sire: { name: n(g5[26]) }, dam: { name: n(g5[27]) } } },
        dam: { name: n(pedigree.dam_dam_dam, g3[7]),
          sire: { name: n(g4[14]), sire: { name: n(g5[28]) }, dam: { name: n(g5[29]) } },
          dam: { name: n(g4[15]), sire: { name: n(g5[30]) }, dam: { name: n(g5[31]) } } },
      },
    },
  };
}

function findInbredGenerations(tree: TreeNode, inbredMap: Map<string, number>): Map<string, Set<number>> {
  const result = new Map<string, Set<number>>();
  const walk = (node: TreeNode, gen: number) => {
    const key = node.name.toLowerCase();
    if (inbredMap.has(key)) {
      if (!result.has(key)) result.set(key, new Set());
      result.get(key)!.add(gen);
    }
    if (node.sire) walk(node.sire, gen + 1);
    if (node.dam) walk(node.dam, gen + 1);
  };
  walk(tree, 1);
  return result;
}

// ═══ ANCESTOR CELL COMPONENT ═══
const AncestorCell = ({ name, isInbred, inbredCount, isSireSide, gen, onAncestorClick, isRoot }: {
  name: string; isInbred: boolean; inbredCount: number; isSireSide: boolean;
  gen: number; onAncestorClick?: (name: string) => void; isRoot?: boolean;
}) => {
  const isUnknown = name === "Unknown";
  const clickable = !isUnknown && onAncestorClick && !isRoot;

  if (isRoot) {
    return (
      <div className="flex items-center justify-center h-full px-2 rounded bg-[hsl(var(--navy-deep))] text-secondary font-bold text-sm border-2 border-secondary/40 shadow-[var(--shadow-gold)]">
        <span className="truncate">{name}</span>
      </div>
    );
  }

  // Sire-side accent: gold left border; Dam-side: rose
  const sideAccent = isSireSide
    ? "border-l-secondary/70"
    : "border-l-rose-400/60 dark:border-l-rose-500/40";

  const inbredStyle = isInbred
    ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
    : "";

  const genOpacity = gen <= 2 ? "text-foreground" : gen === 3 ? "text-foreground/90" : gen === 4 ? "text-muted-foreground" : "text-muted-foreground/70";
  const genFontSize = gen <= 1 ? "text-[12px] font-semibold" : gen === 2 ? "text-[11px] font-medium" : gen === 3 ? "text-[10px]" : "text-[9px]";
  const genBg = gen <= 1 ? "bg-card" : gen === 2 ? "bg-muted/60" : gen === 3 ? "bg-muted/35" : "bg-muted/20";

  return (
    <div
      className={`
        flex items-center gap-1 h-full px-1.5 rounded-sm border border-l-[3px]
        transition-all duration-150
        ${sideAccent} ${genBg} ${genOpacity} ${genFontSize}
        ${inbredStyle}
        ${isUnknown ? "italic opacity-40 border-transparent border-l-muted-foreground/20" : "border-border/60"}
        ${clickable ? "cursor-pointer hover:border-secondary hover:bg-secondary/5 hover:shadow-sm active:scale-[0.98]" : ""}
      `}
      onClick={clickable ? () => onAncestorClick(name) : undefined}
      title={clickable ? `Search ${name}` : ""}
    >
      {isInbred && <span className="text-amber-500 text-[9px] shrink-0 leading-none">★</span>}
      <span className={`truncate leading-tight ${isInbred ? "text-amber-700 dark:text-amber-400 font-semibold" : ""}`}>
        {name}
      </span>
      {isInbred && inbredCount > 1 && (
        <span className="text-[7px] font-bold text-amber-600 dark:text-amber-400 shrink-0 ml-auto bg-amber-100 dark:bg-amber-900/40 rounded px-0.5">
          {inbredCount}x
        </span>
      )}
      {clickable && !isInbred && (
        <Search className="h-2.5 w-2.5 text-muted-foreground/20 shrink-0 ml-auto" />
      )}
    </div>
  );
};

// ═══ DESKTOP TREE — CSS Grid approach ═══
function DesktopTree({ pedigree, horseName, onAncestorClick, inbredMap }: {
  pedigree: PedigreeData; horseName: string; onAncestorClick?: (name: string) => void; inbredMap: Map<string, number>;
}) {
  const [showGen5, setShowGen5] = useState(false);
  const tree = useMemo(() => buildTree(pedigree, horseName), [pedigree, horseName]);
  const maxGen = showGen5 ? 5 : 4;
  const totalRows = Math.pow(2, maxGen);
  const cellH = showGen5 ? 22 : 30;

  type CellData = { name: string; rowSpan: number; startRow: number; col: number; isSireSide: boolean };

  const cells = useMemo(() => {
    const result: CellData[] = [];
    const addCells = (node: TreeNode, gen: number, startRow: number, rowSpan: number, isSireSide: boolean) => {
      result.push({ name: node.name, rowSpan, startRow, col: gen, isSireSide });
      if (gen < maxGen && node.sire && node.dam) {
        const half = rowSpan / 2;
        addCells(node.sire, gen + 1, startRow, half, isSireSide);
        addCells(node.dam, gen + 1, startRow + half, half, isSireSide);
      }
    };
    // Root
    result.push({ name: horseName, rowSpan: totalRows, startRow: 0, col: 0, isSireSide: true });
    if (tree.sire && tree.dam) {
      const half = totalRows / 2;
      addCells(tree.sire, 1, 0, half, true);
      addCells(tree.dam, 1, half, half, false);
    }
    return result;
  }, [tree, horseName, maxGen, totalRows]);

  const isInbred = useCallback((name: string) => {
    const key = name.toLowerCase();
    return key !== "unknown" && inbredMap.has(key);
  }, [inbredMap]);

  const inbredCount = useCallback((name: string) => inbredMap.get(name.toLowerCase()) || 0, [inbredMap]);

  const genLabels = ["Horse", "Parents", "Grandparents", "Gr-Grandparents", "4th Gen"];
  if (showGen5) genLabels.push("5th Gen");

  const totalH = totalRows * cellH;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto scrollbar-thin" style={{ WebkitOverflowScrolling: "touch" }}>
        <div style={{ minWidth: showGen5 ? "1050px" : "780px" }}>
          {/* Generation headers */}
          <div className="grid gap-[2px] mb-[2px]" style={{ gridTemplateColumns: `repeat(${maxGen + 1}, 1fr)` }}>
            {genLabels.map((label, i) => (
              <div key={i} className="text-[10px] text-muted-foreground font-semibold text-center py-1.5 bg-muted/50 rounded-t-md uppercase tracking-wider">
                {label}
              </div>
            ))}
          </div>

          {/* Tree grid */}
          <div className="relative rounded-b-md overflow-hidden" style={{ height: totalH }}>
            {/* Background alternating rows for readability */}
            {Array.from({ length: totalRows }).map((_, i) => (
              <div
                key={`bg-${i}`}
                className={i % 2 === 0 ? "bg-transparent" : "bg-muted/15"}
                style={{ position: "absolute", top: i * cellH, left: 0, right: 0, height: cellH }}
              />
            ))}

            {/* SVG connector lines — drawn UNDER cells */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full" style={{ zIndex: 1 }}>
              {/* Root connector */}
              {(() => {
                const root = cells[0];
                if (!root) return null;
                const midY = root.startRow * cellH + (root.rowSpan * cellH) / 2;
                const half = root.rowSpan / 2;
                const sireY = (half * cellH) / 2;
                const damY = half * cellH + (half * cellH) / 2;
                const xPct = (1 / (maxGen + 1)) * 100;
                return (
                  <g>
                    <line x1={`${xPct}%`} y1={midY} x2={`${xPct}%`} y2={sireY}
                      stroke="hsl(var(--secondary))" strokeWidth="1.5" strokeOpacity="0.5" />
                    <line x1={`${xPct}%`} y1={midY} x2={`${xPct}%`} y2={damY}
                      stroke="hsl(330 50% 70%)" strokeWidth="1.5" strokeOpacity="0.5" />
                  </g>
                );
              })()}
              {cells.filter(c => c.col > 0 && c.col < maxGen).map((cell, idx) => {
                const parentMidY = cell.startRow * cellH + (cell.rowSpan * cellH) / 2;
                const halfSpan = cell.rowSpan / 2;
                const sireY = cell.startRow * cellH + (halfSpan * cellH) / 2;
                const damY = (cell.startRow + halfSpan) * cellH + (halfSpan * cellH) / 2;
                const xPct = ((cell.col + 1) / (maxGen + 1)) * 100;
                const lineColor = cell.isSireSide ? "hsl(var(--secondary))" : "hsl(330 50% 70%)";
                const opacity = cell.col >= 3 ? "0.3" : "0.45";
                return (
                  <g key={`line-${idx}`}>
                    <line x1={`${xPct}%`} y1={parentMidY} x2={`${xPct}%`} y2={sireY}
                      stroke={lineColor} strokeWidth="1" strokeOpacity={opacity} />
                    <line x1={`${xPct}%`} y1={parentMidY} x2={`${xPct}%`} y2={damY}
                      stroke={lineColor} strokeWidth="1" strokeOpacity={opacity} />
                  </g>
                );
              })}
            </svg>

            {/* Cell nodes */}
            {cells.map((cell, idx) => {
              const top = cell.startRow * cellH;
              const height = cell.rowSpan * cellH;
              const left = `${(cell.col / (maxGen + 1)) * 100}%`;
              const width = `${(1 / (maxGen + 1)) * 100}%`;
              const isRoot = idx === 0;

              return (
                <div
                  key={idx}
                  className="absolute"
                  style={{
                    top: `${top + 1}px`,
                    left,
                    width: `calc(${width} - 3px)`,
                    height: `${height - 2}px`,
                    marginLeft: "1.5px",
                    zIndex: 2,
                  }}
                >
                  <AncestorCell
                    name={cell.name}
                    isInbred={isInbred(cell.name)}
                    inbredCount={inbredCount(cell.name)}
                    isSireSide={cell.isSireSide}
                    gen={cell.col}
                    onAncestorClick={isRoot ? undefined : onAncestorClick}
                    isRoot={isRoot}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend + toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-[2px] bg-secondary/60 inline-block rounded" /> Sire line
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-[2px] inline-block rounded" style={{ backgroundColor: "hsl(330 50% 70%)" }} /> Dam line
          </span>
          {inbredMap.size > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-amber-500">★</span> Inbred ancestor
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowGen5(!showGen5)}
          className="text-xs text-muted-foreground gap-1 h-7"
        >
          {showGen5 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showGen5 ? "Show 4 Generations" : "Show 5th Generation"}
        </Button>
      </div>
    </div>
  );
}

// ═══ MOBILE TREE ═══
function MobileTree({ pedigree, horseName, onAncestorClick, inbredMap }: {
  pedigree: PedigreeData; horseName: string; onAncestorClick?: (name: string) => void; inbredMap: Map<string, number>;
}) {
  const [expanded, setExpanded] = useState(0);

  const isInbred = (name: string) => {
    const key = sanitize(name).toLowerCase();
    return key !== "unknown" && inbredMap.has(key);
  };
  const count = (name: string) => inbredMap.get(sanitize(name).toLowerCase()) || 0;

  const renderName = (name?: string, label?: string) => {
    const display = sanitize(name);
    const inbred = isInbred(display);
    const isUnknown = display === "Unknown";
    const cnt = count(display);

    return (
      <div className="flex items-center gap-1.5">
        {label && <span className="text-[9px] text-muted-foreground/60 w-5 shrink-0 uppercase font-mono">{label}</span>}
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] border transition-colors ${
            inbred
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-400/70 text-amber-700 dark:text-amber-400 font-semibold"
              : "bg-muted/40 border-border/50 text-foreground"
          } ${!isUnknown && onAncestorClick ? "cursor-pointer hover:border-secondary active:scale-[0.98]" : ""} ${isUnknown ? "italic text-muted-foreground/40 border-transparent" : ""}`}
          onClick={!isUnknown && onAncestorClick ? () => onAncestorClick(display) : undefined}
        >
          {inbred && <span className="text-amber-500 text-[9px]">★</span>}
          {display}
          {inbred && cnt > 1 && <span className="text-[8px] text-amber-600 ml-0.5">{cnt}x</span>}
        </span>
      </div>
    );
  };

  const g3 = pedigree.generation_3 || [];
  const gens = [
    { label: "Parents", items: [
      { name: pedigree.sire, label: "S" },
      { name: pedigree.dam, label: "D" },
    ]},
    { label: "Grandparents", items: [
      { name: pedigree.sire_sire, label: "SS" }, { name: pedigree.sire_dam, label: "SD" },
      { name: pedigree.dam_sire, label: "DS" }, { name: pedigree.dam_dam, label: "DD" },
    ]},
    { label: "Great-Grandparents", items: [
      { name: pedigree.sire_sire_sire || g3[0], label: "SSS" }, { name: pedigree.sire_sire_dam || g3[1], label: "SSD" },
      { name: pedigree.sire_dam_sire || g3[2], label: "SDS" }, { name: pedigree.sire_dam_dam || g3[3], label: "SDD" },
      { name: pedigree.dam_sire_sire || g3[4], label: "DSS" }, { name: pedigree.dam_sire_dam || g3[5], label: "DSD" },
      { name: pedigree.dam_dam_sire || g3[6], label: "DDS" }, { name: pedigree.dam_dam_dam || g3[7], label: "DDD" },
    ]},
    { label: "4th Generation", items: (pedigree.generation_4 || []).map((n, i) => ({ name: n, label: `${i+1}` })) },
    { label: "5th Generation", items: (pedigree.generation_5 || []).map((n, i) => ({ name: n, label: `${i+1}` })) },
  ];

  return (
    <div className="space-y-1">
      {/* Root */}
      <div className="bg-[hsl(var(--navy-deep))] rounded-lg px-4 py-2.5 text-secondary font-bold text-sm shadow-[var(--shadow-gold)]">
        {horseName}
      </div>

      {gens.map((gen, gi) => {
        const knownCount = gen.items.filter(n => sanitize(n.name) !== "Unknown").length;
        if (gen.items.length === 0) return null;
        return (
          <div key={gi} className="border border-border/40 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === gi ? -1 : gi)}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground w-full px-3 py-2 hover:bg-muted/30 transition-colors"
            >
              {expanded === gi ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span className="uppercase tracking-wider">{gen.label}</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 ml-auto">
                {knownCount}/{gen.items.length}
              </Badge>
            </button>
            {expanded === gi && (
              <div className="grid gap-1 px-3 pb-3">
                {gen.items.map((item, i) => (
                  <div key={i}>{renderName(item.name, item.label)}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══ INBREEDING SUMMARY ═══
function InbreedingSummary({ inbredMap, tree, inbreedingPatterns, coefficient, assessment }: {
  inbredMap: Map<string, number>;
  tree: TreeNode;
  inbreedingPatterns?: string[];
  coefficient?: string | null;
  assessment?: string | null;
}) {
  if (inbredMap.size === 0 && !coefficient && (!inbreedingPatterns || inbreedingPatterns.length === 0)) return null;

  const genMap = findInbredGenerations(tree, inbredMap);

  const assessmentIcon = !assessment ? "🟢" :
    /excessive|high|cautionary/i.test(assessment) ? "🔴" :
    /moderate/i.test(assessment) ? "🟡" : "🟢";

  return (
    <div className="mt-4 rounded-lg border border-amber-300/40 bg-gradient-to-br from-amber-50/60 to-amber-50/20 dark:from-amber-950/20 dark:to-transparent p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
        <Dna className="h-4 w-4" />
        Inbreeding Patterns
      </div>

      {inbredMap.size > 0 && (
        <div className="space-y-1.5">
          {Array.from(inbredMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => {
              const gens = genMap.get(name);
              const genStr = gens ? Array.from(gens).sort().map(g => `G${g}`).join(", ") : "";
              return (
                <div key={name} className="flex items-center gap-2 text-xs">
                  <span className="text-amber-500">★</span>
                  <span className="font-semibold capitalize text-amber-800 dark:text-amber-300">{name}</span>
                  <span className="text-muted-foreground">— appears {count}x</span>
                  {genStr && <span className="text-muted-foreground/60 text-[10px]">({genStr})</span>}
                </div>
              );
            })}
        </div>
      )}

      {inbreedingPatterns && inbreedingPatterns.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {inbreedingPatterns.map((p, i) => (
            <Badge key={i} className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300/50">
              {p}
            </Badge>
          ))}
        </div>
      )}

      {coefficient && (
        <div className="flex items-center justify-between text-xs pt-2 border-t border-amber-200/40">
          <span className="text-muted-foreground">Inbreeding Coefficient</span>
          <span className="font-bold text-foreground">{coefficient}</span>
        </div>
      )}

      {assessment && (
        <div className="flex items-center gap-1.5 text-xs">
          <span>Assessment:</span>
          <span>{assessmentIcon}</span>
          <span className="font-medium text-foreground">{assessment}</span>
        </div>
      )}
    </div>
  );
}

// ═══ COMPLETENESS SCORE ═══
function calcCompleteness(pedigree: PedigreeData): number {
  let total = 0, filled = 0;
  const check = (v?: string | null) => {
    total++;
    if (sanitize(v) !== "Unknown") filled++;
  };
  check(pedigree.sire); check(pedigree.dam);
  check(pedigree.sire_sire); check(pedigree.sire_dam); check(pedigree.dam_sire); check(pedigree.dam_dam);
  const g3 = pedigree.generation_3 || [];
  [pedigree.sire_sire_sire || g3[0], pedigree.sire_sire_dam || g3[1], pedigree.sire_dam_sire || g3[2], pedigree.sire_dam_dam || g3[3],
   pedigree.dam_sire_sire || g3[4], pedigree.dam_sire_dam || g3[5], pedigree.dam_dam_sire || g3[6], pedigree.dam_dam_dam || g3[7]].forEach(check);
  (pedigree.generation_4 || []).forEach(check);
  if ((pedigree.generation_4 || []).length === 0) { for (let i = 0; i < 16; i++) total++; }
  (pedigree.generation_5 || []).forEach(check);
  if ((pedigree.generation_5 || []).length === 0) { for (let i = 0; i < 32; i++) total++; }
  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

// ═══ MAIN EXPORT ═══
export const PedigreeTree = ({ pedigree, horseName, onAncestorClick, confidenceScore, inbreedingPatterns }: PedigreeTreeProps) => {
  const inbredMap = useMemo(() => pedigree ? getInbredMap(pedigree) : new Map<string, number>(), [pedigree]);
  const tree = useMemo(() => pedigree ? buildTree(pedigree, horseName) : null, [pedigree, horseName]);
  const completeness = confidenceScore ?? (pedigree ? calcCompleteness(pedigree) : 0);

  if (!pedigree || !tree) return null;

  const complColor = completeness >= 80
    ? "text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200"
    : completeness >= 50
    ? "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200"
    : "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200";

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-secondary" />
            Pedigree Tree
          </CardTitle>
          <div className="flex items-center gap-2">
            {inbredMap.size > 0 && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400/50 bg-amber-50 dark:bg-amber-950/20 gap-1">
                ★ {inbredMap.size} inbred {inbredMap.size === 1 ? "ancestor" : "ancestors"}
              </Badge>
            )}
            <Badge variant="outline" className={`${complColor} text-[10px] gap-1`}>
              <Shield className="h-3 w-3" />
              {completeness}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="hidden md:block">
          <DesktopTree pedigree={pedigree} horseName={horseName} onAncestorClick={onAncestorClick} inbredMap={inbredMap} />
        </div>
        <div className="block md:hidden">
          <MobileTree pedigree={pedigree} horseName={horseName} onAncestorClick={onAncestorClick} inbredMap={inbredMap} />
        </div>
        <InbreedingSummary
          inbredMap={inbredMap}
          tree={tree}
          inbreedingPatterns={inbreedingPatterns}
        />
      </CardContent>
    </Card>
  );
};
