import { notFound } from "next/navigation";
import { getInstance } from "@/app/actions";
import ChecklistInstanceView from "@/components/ChecklistInstanceView";

export default async function InstancePage({
  params,
}: {
  params: { id: string };
}) {
  const instance = await getInstance(params.id);

  if (!instance) {
    notFound();
  }

  return <ChecklistInstanceView instance={instance} />;
}
