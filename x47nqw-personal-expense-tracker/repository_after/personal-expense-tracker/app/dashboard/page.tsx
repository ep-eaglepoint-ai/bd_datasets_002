import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DashboardHeader } from "@/components/dashboard-header";
import { StatsSummary } from "@/components/stats-summary";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";
import { ChartSection } from "@/components/chart-section";
import { SpendingTrends } from "@/components/spending-trends";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardLayout>
      <DashboardHeader user={session.user} />
      <div className="space-y-6">
        <StatsSummary />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TransactionForm />
            <TransactionList />
          </div>
          <div className="space-y-6">
            <ChartSection />
          </div>
        </div>
        <SpendingTrends />
      </div>
    </DashboardLayout>
  );
}
