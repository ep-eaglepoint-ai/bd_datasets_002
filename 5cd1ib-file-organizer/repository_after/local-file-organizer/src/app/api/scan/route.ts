import { NextResponse } from "next/server";
import { ScanManager } from "@/lib/scanManager";
import fs from "fs/promises";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { path: scanPath } = body;

    if (!scanPath) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    try {
      const stat = await fs.stat(scanPath);
      if (!stat.isDirectory()) {
        return NextResponse.json(
          { error: "Path is not a directory" },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid path or permission denied" },
        { status: 400 },
      );
    }

    const result = await ScanManager.startScan(scanPath);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }
    
    return NextResponse.json({ message: "Scan started" });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Internal Error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(ScanManager.getStatus());
}

export async function DELETE() {
  // Cancel current scan
  const cancelled = ScanManager.cancelCurrentScan();
  if (cancelled) {
    return NextResponse.json({ message: "Scan cancellation requested" });
  }
  return NextResponse.json(
    { error: "No scan in progress" },
    { status: 400 },
  );
}
