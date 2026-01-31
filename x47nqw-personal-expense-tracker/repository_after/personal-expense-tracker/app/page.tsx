import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, Shield } from "lucide-react";

export default function Home() {
  // Home page is public for unauthenticated users

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-2xl w-full space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground">
              Smart Expense <span className="text-primary">Tracking</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Monitor your spending habits, categorize expenses, and visualize your financial patterns with ease.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 my-12">
            <div className="bg-card border border-border/50 p-6 rounded-lg">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground">Track Spending</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Log all income and expenses effortlessly
              </p>
            </div>
            <div className="bg-card border border-border/50 p-6 rounded-lg">
              <BarChart3 className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground">Visualize Data</h3>
              <p className="text-sm text-muted-foreground mt-1">
                See spending patterns with charts
              </p>
            </div>
            <div className="bg-card border border-border/50 p-6 rounded-lg">
              <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground">Secure</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your data is private and protected
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="px-8 py-6 text-lg bg-transparent">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
