/**
 * BloodstockAI Design System — Reusable Components
 *
 * Import from here to ensure consistent design language:
 *   import { PremiumCard, ReportSection, PremiumModal, ... } from "@/components/ui/design-system";
 */

// Cards
export { PremiumCard, premiumCardVariants, type PremiumCardProps } from "./premium-card";

// Pedigree
export { PedigreeNode, PedigreeConnector, pedigreeNodeVariants, type PedigreeNodeProps } from "./pedigree-node";

// AI Report sections
export { ReportSection, ReportDataRow, ReportScore, reportSectionVariants, type ReportSectionProps } from "./report-section";

// Notifications
export { Notification, notificationVariants, type NotificationProps } from "./notification";

// Premium modal
export { PremiumModal, type PremiumModalProps } from "./premium-modal";

// Chart theming
export { CHART_COLORS, CHART_SEQUENTIAL, getScoreColor, CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_TOOLTIP_STYLE } from "./chart-theme";

// Premium table
export { PremiumTable, type PremiumTableColumn, type PremiumTableProps } from "./premium-table";

// Re-export core primitives for convenience
export { Button, buttonVariants } from "./button";
export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "./card";
