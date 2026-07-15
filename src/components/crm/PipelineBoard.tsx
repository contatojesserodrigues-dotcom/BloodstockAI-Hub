import { PIPELINE_STAGES } from "@/lib/pipeline";
import { formatCurrency } from "@/lib/utils";

interface StageData {
  stage: string;
  count: number;
  value: number;
}

export function PipelineBoard({ data }: { data: StageData[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-3">
        {PIPELINE_STAGES.map((stage) => {
          const stageData = data.find((d) => d.stage === stage.key) || { count: 0, value: 0 };
          return (
            <div key={stage.key} className="glass w-44 shrink-0 rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-medium text-white/70">{stage.label}</p>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px]">{stageData.count}</span>
              </div>
              <div className="mb-2 h-1 rounded-full bg-white/5">
                <div
                  className="h-1 rounded-full bg-bs-accent transition-all"
                  style={{ width: `${(stageData.count / maxCount) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-bs-muted">{formatCurrency(stageData.value)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
