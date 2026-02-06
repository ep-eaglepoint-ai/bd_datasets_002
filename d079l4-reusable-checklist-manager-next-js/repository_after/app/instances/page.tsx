import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getInstances } from "@/app/actions";

export default async function InstancesPage() {
  const instances = await getInstances();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Checklists</h1>
          <p className="text-slate-500">
            Track your active and completed work.
          </p>
        </div>
        <Link href="/templates">
          <Button>Start New Checklist</Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {instances.map((instance) => (
          <Link key={instance.id} href={`/instances/${instance.id}`}>
            <Card className="hover:bg-slate-50 transition-colors">
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold">{instance.title}</h3>
                    <Badge
                      variant={
                        instance.status === "COMPLETED"
                          ? "success"
                          : instance.status === "ARCHIVED"
                            ? "secondary"
                            : "default"
                      }
                    >
                      {instance.status}
                    </Badge>
                  </div>
                  <p className="text-slate-500 text-sm">
                    Template:{" "}
                    <span className="font-medium">
                      {instance.template.title}
                    </span>{" "}
                    • Started:{" "}
                    {new Date(instance.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-8 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-lg">
                      {instance.items.filter((i) => i.completed).length}/
                      {instance.items.length}
                    </div>
                    <div className="text-slate-500 text-xs">Tasks Done</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {instances.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-lg border border-dashed text-slate-500">
            No checklists found. Go to Templates to start one.
          </div>
        )}
      </div>
    </div>
  );
}
