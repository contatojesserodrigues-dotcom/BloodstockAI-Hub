import { Header } from "@/components/layout/Header";
import { WorkflowStudio } from "@/components/workflows/WorkflowStudio";

export default function WorkflowsPage() {
  return (
    <>
      <Header
        title="Workflow Studio"
        subtitle="Build automations on-platform — n8n is optional if you already use it"
      />
      <WorkflowStudio />
    </>
  );
}
