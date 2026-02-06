import { notFound } from "next/navigation";
import { getTemplate } from "@/app/actions";
import TemplateEditor from "@/components/TemplateEditor";

export default async function EditTemplatePage({
  params,
}: {
  params: { id: string };
}) {
  const template = await getTemplate(params.id);

  if (!template) {
    notFound();
  }

  // Transform data to match Editor interface
  const editorData = {
    id: template.id,
    title: template.title,
    description: template.description || undefined,
    items: template.items.map((item) => ({
      text: item.text,
      description: item.description || undefined,
      required: item.required,
    })),
  };

  return <TemplateEditor initialData={editorData} />;
}
