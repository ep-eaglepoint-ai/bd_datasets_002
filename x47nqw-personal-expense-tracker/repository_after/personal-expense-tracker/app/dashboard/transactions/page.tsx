import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { TransactionList } from "@/components/transaction-list";

export default async function TransactionsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground">Transactions</h2>
        <p className="text-muted-foreground mt-2">View and manage all your transactions</p>
      </div>

      <TransactionList />
    </DashboardLayout>
  );
}

