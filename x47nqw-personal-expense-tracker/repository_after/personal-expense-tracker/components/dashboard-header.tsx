"use client";

import { User } from "next-auth";

interface DashboardHeaderProps {
  user: User | undefined;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mb-8">
      <h2 className="text-3xl font-bold text-foreground">
        Welcome back, {user?.name || "User"}!
      </h2>
      <p className="text-muted-foreground mt-2">{currentDate}</p>
    </div>
  );
}
