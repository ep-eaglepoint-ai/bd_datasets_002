import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, List, Play } from "lucide-react";
import { getTemplates, getInstances } from "@/app/actions";

export default async function Dashboard() {
  const templates = await getTemplates();
  const instances = await getInstances();

  const recentInstances = instances.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-slate-500">
            Welcome back! Manage your checklists clearly.
          </p>
        </div>
        <Link href="/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create Template
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Templates
            </CardTitle>
            <List className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Checklists
            </CardTitle>
            <Play className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {instances.filter((i) => i.status === "ACTIVE").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Checklists</CardTitle>
            <CardDescription>Your latest checklist instances.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentInstances.length === 0 ? (
              <p className="text-sm text-slate-500">No checklists found.</p>
            ) : (
              <div className="space-y-4">
                {recentInstances.map((instance) => (
                  <div
                    key={instance.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <Link
                        href={`/instances/${instance.id}`}
                        className="font-medium hover:underline"
                      >
                        {instance.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {instance.template.title} •{" "}
                        {new Date(instance.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        instance.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : instance.status === "ARCHIVED"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {instance.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-2 border-t text-center">
              <Link href="/instances">
                <Button variant="link">View All Instances</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>
              Quickly start a new checklist from a template.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-sm text-slate-500">No templates found.</p>
            ) : (
              <div className="space-y-4">
                {templates.slice(0, 5).map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between"
                  >
                    <span className="font-medium">{template.title}</span>
                    <Link href={`/templates/${template.id}`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-2 border-t text-center">
              <Link href="/templates">
                <Button variant="link">View All Templates</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
