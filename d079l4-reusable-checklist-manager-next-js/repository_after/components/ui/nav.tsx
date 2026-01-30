import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckSquare } from "lucide-react";

export function Nav() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <CheckSquare className="h-6 w-6 text-blue-600" />
            <span>CheckMate</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
            <Link href="/" className="text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
            <Link
              href="/templates"
              className="text-slate-600 hover:text-slate-900"
            >
              Templates
            </Link>
            <Link
              href="/instances"
              className="text-slate-600 hover:text-slate-900"
            >
              My Checklists
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {/* Placeholder for user menu if auth is added */}
        </div>
      </div>
    </header>
  );
}
