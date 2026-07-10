import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type Verifiable<T = string> = { value: T; verified?: boolean; sources?: string[] };

export interface PedigreeResearch {
  sire?: {
    name?: string;
    race_record?: Verifiable;
    stud_record?: Verifiable;
    best_progeny?: string[];
    black_type_winners?: Verifiable;
    sale_averages?: Verifiable;
    surface?: Verifiable;
    distance?: Verifiable;
    commercial?: Verifiable;
  };
  dam?: {
    name?: string;
    race_record?: Verifiable;
    produce_record?: Verifiable;
    black_type_progeny?: Verifiable;
    sales_history?: Verifiable;
    best_runners?: string[];
    broodmare_value?: Verifiable;
    family_strength?: Verifiable;
  };
  damsire?: {
    name?: string;
    influence?: Verifiable;
    black_type?: Verifiable;
    commercial?: Verifiable;
    distance_surface?: Verifiable;
  };
  siblings?: Array<{
    name?: string; year?: string; sex?: string; sire?: string;
    record?: string; earnings?: string; rating?: string;
    black_type?: string; sale_price?: string; buyer?: string;
    trainer?: string; status?: string; verified?: boolean;
  }>;
  black_type_family?: {
    winners?: string[]; placed?: string[];
    side?: string; sire_line?: string; female_family?: string;
    notes?: string;
  };
  notes?: string;
  sources?: string[];
}

function Verified({ v }: { v?: { verified?: boolean } }) {
  if (!v) return null;
  return v.verified
    ? <Badge variant="outline" className="ml-2 text-[10px] gap-1 text-emerald-600 border-emerald-500/30"><CheckCircle2 className="w-3 h-3" />Verified</Badge>
    : <Badge variant="outline" className="ml-2 text-[10px] gap-1 text-amber-600 border-amber-500/30"><AlertCircle className="w-3 h-3" />Not verified</Badge>;
}

function Row({ label, v }: { label: string; v?: Verifiable }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0 text-sm">
      <div className="text-muted-foreground shrink-0 w-1/3">{label}</div>
      <div className="text-right flex-1 min-w-0">
        <span>{v?.value || <span className="text-muted-foreground italic">Not verified</span>}</span>
        <Verified v={v} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm font-semibold mb-2 text-secondary">{title}</div>
      {children}
    </div>
  );
}

export function PedigreeIntelligencePanel({ data }: { data?: PedigreeResearch | null }) {
  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground text-center">
        Run pedigree research to populate sire, dam, sibling and black-type intelligence.
      </div>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {data.sire && (
        <Section title={`Sire — ${data.sire.name || ""}`}>
          <Row label="Race record"      v={data.sire.race_record} />
          <Row label="Stud record"      v={data.sire.stud_record} />
          <Row label="Black-type winners" v={data.sire.black_type_winners} />
          <Row label="Sale averages"    v={data.sire.sale_averages} />
          <Row label="Surface"          v={data.sire.surface} />
          <Row label="Distance"         v={data.sire.distance} />
          <Row label="Commercial"       v={data.sire.commercial} />
          {data.sire.best_progeny?.length ? (
            <div className="mt-2 text-xs">
              <div className="text-muted-foreground mb-1">Best progeny</div>
              <div className="flex flex-wrap gap-1">{data.sire.best_progeny.map(p => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}</div>
            </div>
          ) : null}
        </Section>
      )}
      {data.dam && (
        <Section title={`Dam — ${data.dam.name || ""}`}>
          <Row label="Race record"        v={data.dam.race_record} />
          <Row label="Produce record"     v={data.dam.produce_record} />
          <Row label="Black-type progeny" v={data.dam.black_type_progeny} />
          <Row label="Sales history"      v={data.dam.sales_history} />
          <Row label="Broodmare value"    v={data.dam.broodmare_value} />
          <Row label="Family strength"    v={data.dam.family_strength} />
          {data.dam.best_runners?.length ? (
            <div className="mt-2 text-xs">
              <div className="text-muted-foreground mb-1">Best runners</div>
              <div className="flex flex-wrap gap-1">{data.dam.best_runners.map(p => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}</div>
            </div>
          ) : null}
        </Section>
      )}
      {data.damsire && (
        <Section title={`Damsire — ${data.damsire.name || ""}`}>
          <Row label="Influence"         v={data.damsire.influence} />
          <Row label="Black-type"        v={data.damsire.black_type} />
          <Row label="Commercial"        v={data.damsire.commercial} />
          <Row label="Distance/Surface"  v={data.damsire.distance_surface} />
        </Section>
      )}
      {data.black_type_family && (
        <Section title="Black-Type Family">
          <div className="text-xs space-y-2">
            {data.black_type_family.side && <div><span className="text-muted-foreground">Side: </span>{data.black_type_family.side}</div>}
            {data.black_type_family.sire_line && <div><span className="text-muted-foreground">Sire line: </span>{data.black_type_family.sire_line}</div>}
            {data.black_type_family.female_family && <div><span className="text-muted-foreground">Female family: </span>{data.black_type_family.female_family}</div>}
            {data.black_type_family.winners?.length ? (
              <div>
                <div className="text-muted-foreground mb-1">Winners</div>
                <div className="flex flex-wrap gap-1">{data.black_type_family.winners.map(w => <Badge key={w} className="text-[10px]" variant="secondary">{w}</Badge>)}</div>
              </div>
            ) : null}
            {data.black_type_family.placed?.length ? (
              <div>
                <div className="text-muted-foreground mb-1">Placed</div>
                <div className="flex flex-wrap gap-1">{data.black_type_family.placed.map(w => <Badge key={w} variant="outline" className="text-[10px]">{w}</Badge>)}</div>
              </div>
            ) : null}
            {data.black_type_family.notes && <p className="text-muted-foreground italic">{data.black_type_family.notes}</p>}
          </div>
        </Section>
      )}
      {data.siblings?.length ? (
        <div className="md:col-span-2">
          <Section title={`Siblings (${data.siblings.length})`}>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-xs min-w-[640px]">
                <thead className="text-muted-foreground">
                  <tr className="text-left">
                    <th className="py-1.5 pr-2">Name</th><th className="pr-2">YOB</th><th className="pr-2">Sex</th>
                    <th className="pr-2">Sire</th><th className="pr-2">Record</th><th className="pr-2">Rating</th>
                    <th className="pr-2">BT</th><th className="pr-2">Sale</th><th className="pr-2">Buyer</th>
                  </tr>
                </thead>
                <tbody>
                  {data.siblings.map((s, i) => (
                    <tr key={i} className="border-t border-border/40">
                      <td className="py-1.5 pr-2 font-medium">{s.name || "—"}</td>
                      <td className="pr-2">{s.year || "—"}</td>
                      <td className="pr-2">{s.sex || "—"}</td>
                      <td className="pr-2">{s.sire || "—"}</td>
                      <td className="pr-2">{s.record || "—"}</td>
                      <td className="pr-2">{s.rating || "—"}</td>
                      <td className="pr-2">{s.black_type || "—"}</td>
                      <td className="pr-2">{s.sale_price || "—"}</td>
                      <td className="pr-2">{s.buyer || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      ) : null}
      {data.sources?.length ? (
        <div className="md:col-span-2 text-[11px] text-muted-foreground">
          <div className="font-semibold mb-1">Sources</div>
          <ul className="space-y-0.5">
            {data.sources.slice(0, 10).map((s) => (
              <li key={s} className="truncate">
                <a href={s} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                  <ExternalLink className="w-3 h-3" />{s}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default PedigreeIntelligencePanel;