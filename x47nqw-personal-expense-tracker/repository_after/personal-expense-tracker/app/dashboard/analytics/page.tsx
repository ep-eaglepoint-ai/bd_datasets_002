import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { MonthlyAnalytics } from "@/components/monthly-analytics";
import { SpendingTrends } from "@/components/spending-trends";

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground">Analytics</h2>
        <p className="text-muted-foreground mt-2">
          Analyze your spending patterns and trends
        </p>
      </div>

      <div className="space-y-6">
        <MonthlyAnalytics />
        <SpendingTrends />
      </div>
    </DashboardLayout>
  );
}
