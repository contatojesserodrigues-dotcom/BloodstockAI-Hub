import { Skeleton } from "@/components/ui/Skeleton";

export function PanelSkeleton({ className = "h-64" }: { className?: string }) {
  return <Skeleton className={`glass rounded-2xl ${className}`} />;
}

export function ChatSkeleton() {
  return <PanelSkeleton className="h-[600px]" />;
}

export function TerminalSkeleton() {
  return <PanelSkeleton className="h-[500px]" />;
}

export function WorkflowSkeleton() {
  return <PanelSkeleton className="h-28" />;
}

export function BadgeSkeleton() {
  return <Skeleton className="glass h-14 w-56 rounded-xl" />;
}
