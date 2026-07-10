import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartData {
  compatibilityRadar?: {
    labels: string[];
    values: number[];
  };
  roiWaterfall?: Array<{
    label: string;
    value: number;
    type: string;
  }>;
  dosageComparison?: {
    mare: { labels: string[]; values: number[] };
    stallion: { labels: string[]; values: number[] };
    projectedFoal: { labels: string[]; values: number[] };
  };
  probabilityBar?: {
    labels: string[];
    values: number[];
  };
}

interface HorseChartData {
  performanceRadar?: {
    labels: string[];
    values: number[];
  };
  dosageBar?: {
    labels: string[];
    values: number[];
  };
  earningsTimeline?: Array<{
    year: number;
    earnings: number;
    starts: number;
  }>;
}

export const CompatibilityRadarChart = ({ data }: { data: ChartData["compatibilityRadar"] }) => {
  if (!data?.labels?.length) return null;
  const radarData = data.labels.map((label, i) => ({
    metric: label,
    value: data.values[i] || 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Compatibility Radar</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
            <Radar
              name="Score"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const ROIWaterfallChart = ({ data }: { data: ChartData["roiWaterfall"] }) => {
  if (!data?.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">ROI Waterfall</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`$${Math.abs(value).toLocaleString()}`, ""]}
            />
            <Bar dataKey="value">
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.type === "cost" ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                  opacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const DosageComparisonChart = ({ data }: { data: ChartData["dosageComparison"] }) => {
  if (!data?.mare?.labels?.length) return null;

  const chartData = data.mare.labels.map((label, i) => ({
    category: label,
    Mare: data.mare.values[i] || 0,
    Stallion: data.stallion.values[i] || 0,
    "Projected Foal": data.projectedFoal.values[i] || 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Dosage Comparison (B-I-C-S-P)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <XAxis dataKey="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Bar dataKey="Mare" fill="hsl(var(--primary))" opacity={0.7} />
            <Bar dataKey="Stallion" fill="hsl(var(--secondary))" opacity={0.7} />
            <Bar dataKey="Projected Foal" fill="hsl(var(--accent-foreground))" opacity={0.9} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const ProbabilityBarChart = ({ data }: { data: ChartData["probabilityBar"] }) => {
  if (!data?.labels?.length) return null;

  const chartData = data.labels.map((label, i) => ({
    level: label,
    probability: data.values[i] || 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Black-Type Probability</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} />
            <YAxis type="category" dataKey="level" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={80} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value}%`, "Probability"]}
            />
            <Bar dataKey="probability" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const PerformanceRadarChart = ({ data }: { data: HorseChartData["performanceRadar"] }) => {
  if (!data?.labels?.length) return null;
  const radarData = data.labels.map((label, i) => ({
    metric: label,
    value: data.values[i] || 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Performance Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
            <Radar
              name="Score"
              dataKey="value"
              stroke="hsl(var(--secondary))"
              fill="hsl(var(--secondary))"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const DosageBarChart = ({ data }: { data: HorseChartData["dosageBar"] }) => {
  if (!data?.labels?.length) return null;

  const chartData = data.labels.map((label, i) => ({
    category: label,
    value: data.values[i] || 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Dosage Profile (B-I-C-S-P)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
