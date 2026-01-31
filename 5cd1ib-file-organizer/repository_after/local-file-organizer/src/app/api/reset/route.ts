import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ScanManager } from "@/lib/scanManager";

// Utility endpoint to clear DB for testing
export async function POST() {
  try {
    // Delete all tags first (due to relations)
    await prisma.tag.deleteMany({});
    // Delete all file records
    await prisma.fileRecord.deleteMany({});

    // Reset ScanManager state
    ScanManager.reset();

    return NextResponse.json({ 
      message: "Database and State cleared",
      cleared: {
        files: true,
        tags: true,
        scanState: true,
      }
    });
  } catch (e: any) {
    console.error("Reset failed:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
