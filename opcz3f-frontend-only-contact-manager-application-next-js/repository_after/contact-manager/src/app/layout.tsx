import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "sonner";
import { KeyboardShortcuts } from "@/components/ui/keyboard-shortcuts";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Contact Manager",
  description: "Offline-first contact manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased font-sans`}>
        <KeyboardShortcuts />
        <AppLayout>{children}</AppLayout>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
