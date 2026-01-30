import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Plus, Edit, FilePlus, Trash2 } from "lucide-react";
import { getTemplates, deleteTemplate } from "@/app/actions";
import { StartChecklistButton } from "@/components/StartChecklistButton";
import { revalidatePath } from "next/cache";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-slate-500">Manage your checklist definitions.</p>
        </div>
        <Link href="/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create Template
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="truncate" title={template.title}>
                {template.title}
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-[2.5em]">
                {template.description || "No description provided."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="text-sm text-slate-500">
                {/* Accessing aggregated count from findMany/include */}
                {(template as any)._count.instances} Instances Created
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-4 bg-slate-50/50">
              <Link href={`/templates/${template.id}`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-3 w-3" /> Edit
                </Button>
              </Link>
              <div className="flex gap-2">
                <form
                  action={async () => {
                    "use server";
                    // Inline server action to create instance quickly
                    // In a real app we might redirect to a setup page, but here we can just auto-create or use a dialog.
                    // For now, let's link to a "create instance" flow or just let users do it from Dashboard.
                  }}
                >
                  {/* Simplified flow: Link to create instance page? Or open modal. The requirement says "create instance from template". */}
                  <StartChecklistButton
                    templateId={template.id}
                    templateTitle={template.title}
                  />
                </form>
                {/* Let's actually implement a delete button properly with form action */}
                <form
                  action={async () => {
                    "use server";
                    await deleteTemplate(template.id);
                  }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardFooter>
          </Card>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-20 bg-slate-50 rounded-lg border border-dashed text-slate-500">
            You haven't created any templates yet.
          </div>
        )}
      </div>
    </div>
  );
}
