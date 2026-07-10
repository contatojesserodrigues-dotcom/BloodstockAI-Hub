import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, Shield } from "lucide-react";

interface DataConfidenceBadgeProps {
  confidence?: number;
  className?: string;
}

export const DataConfidenceBadge = ({
  confidence,
  className = "",
}: DataConfidenceBadgeProps) => {
  const confidencePercent = confidence != null ? Math.round(confidence * 100) : null;
  const isLowConfidence = confidencePercent != null && confidencePercent < 75;

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs ${className}`}>
      {confidencePercent != null && (
        <Badge
          variant={isLowConfidence ? "destructive" : "outline"}
          className={`gap-1 ${
            isLowConfidence
              ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30 dark:text-yellow-400"
              : "text-green-600 border-green-500/30 dark:text-green-400"
          }`}
        >
          {isLowConfidence ? (
            <AlertTriangle className="w-3 h-3" />
          ) : (
            <Shield className="w-3 h-3" />
          )}
          {confidencePercent}% confidence
        </Badge>
      )}

      {isLowConfidence && (
        <span className="text-yellow-600 dark:text-yellow-400 font-medium">
          ⚠ Low confidence — verify manually
        </span>
      )}
    </div>
  );
};

interface DataQualityCardProps {
  overallScore: number;
  pedigreeComplete: boolean;
  performanceVerified: boolean;
  missingFields: string[];
  lastUpdated?: string;
}

export const DataQualityCard = ({
  overallScore,
  pedigreeComplete,
  performanceVerified,
  missingFields,
  lastUpdated,
}: DataQualityCardProps) => {
  const scoreColor =
    overallScore >= 70
      ? "text-green-600 dark:text-green-400"
      : overallScore >= 50
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-red-600 dark:text-red-400";

  const scoreBg =
    overallScore >= 70
      ? "bg-green-500/10 border-green-500/20"
      : overallScore >= 50
      ? "bg-yellow-500/10 border-yellow-500/20"
      : "bg-red-500/10 border-red-500/20";

  return (
    <div className={`p-4 rounded-xl border-2 ${scoreBg} space-y-3`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Data Quality Score
        </h4>
        <div className={`text-2xl font-bold ${scoreColor}`}>
          {overallScore}/100
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          {pedigreeComplete ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
          )}
          <span>Pedigree {pedigreeComplete ? "Complete" : "Incomplete"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {performanceVerified ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
          )}
          <span>Performance {performanceVerified ? "Verified" : "Unverified"}</span>
        </div>
      </div>

      {missingFields.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
            Missing Fields
          </p>
          <div className="flex flex-wrap gap-1">
            {missingFields.map((field, i) => (
              <Badge key={i} variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-600 dark:text-yellow-400">
                {field}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {lastUpdated && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Last updated: {new Date(lastUpdated).toLocaleString("en-GB")}
        </p>
      )}
    </div>
  );
};
