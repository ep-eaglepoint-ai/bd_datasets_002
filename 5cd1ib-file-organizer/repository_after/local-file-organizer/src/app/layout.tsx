import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local File Organizer",
  description: "Manage your files locally",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 flex flex-col md:flex-row h-screen text-gray-900 font-sans antialiased">
        <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 md:h-full z-10 shadow-sm">
          <div className="p-6 flex items-center gap-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
              F
            </div>
            <div className="text-xl font-bold tracking-tight text-gray-800">
              FileOrg
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors group"
            >
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link
              href="/files"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors group"
            >
              <span className="font-medium">All Files</span>
            </Link>
            <Link
              href="/duplicates"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors group"
            >
              <span className="font-medium">Duplicates</span>
            </Link>
          </nav>
          <div className="p-4 border-t border-gray-100">
            <div className="text-xs text-gray-400 text-center">
              Local File Organizer v1.0
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-auto bg-gray-50/50">
          <div className="max-w-7xl mx-auto p-4 md:p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
