import dynamic from "next/dynamic";
import { BadgeSkeleton, ChatSkeleton, TerminalSkeleton, WorkflowSkeleton } from "@/components/ui/loading-skeletons";

export const ChatInterface = dynamic(
  () => import("@/components/chat/ChatInterface").then((mod) => mod.ChatInterface),
  { loading: () => <ChatSkeleton /> }
);

export const TerminalFeed = dynamic(
  () => import("@/components/terminal/TerminalFeed").then((mod) => mod.TerminalFeed),
  { loading: () => <TerminalSkeleton /> }
);

export const WorkflowTrigger = dynamic(
  () => import("@/components/workflow/WorkflowTrigger").then((mod) => mod.WorkflowTrigger),
  { loading: () => <WorkflowSkeleton /> }
);

export const N8nStatusBadge = dynamic(
  () => import("@/components/integrations/N8nStatusBadge").then((mod) => mod.N8nStatusBadge),
  { loading: () => <BadgeSkeleton /> }
);
