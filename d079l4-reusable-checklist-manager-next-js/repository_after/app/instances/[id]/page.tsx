import { notFound } from "next/navigation";
import { getInstance } from "@/app/actions";
import ChecklistInstanceView from "@/components/ChecklistInstanceView";

// This page displays checklist instance details with progress tracking
export default async function InstancePage({
  params,
}: {
  params: { id: string };
}) {
  const instance = await getInstance(params.id);

  if (!instance) {
    notFound();
  }

  // ChecklistInstanceView component shows progress percentage and completion status
  return <ChecklistInstanceView instance={instance} />;
}
