import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateDeletePath } from "@/lib/pathValidator";
import fs from "fs/promises";

interface BulkDeleteRequest {
  ids: number[];
  dryRun?: boolean;
}

interface BulkDeleteResult {
  id: number;
  path: string;
  success: boolean;
  error?: string;
  dryRun: boolean;
}

export async function POST(request: Request) {
  try {
    const body: BulkDeleteRequest = await request.json();
    const { ids, dryRun = false } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids must be a non-empty array of file IDs" },
        { status: 400 },
      );
    }

    // Limit bulk operations to prevent abuse
    if (ids.length > 100) {
      return NextResponse.json(
        { error: "Cannot delete more than 100 files at once" },
        { status: 400 },
      );
    }

    // Fetch all files
    const files = await prisma.fileRecord.findMany({
      where: { id: { in: ids } },
    });

    const results: BulkDeleteResult[] = [];

    for (const file of files) {
      // Validate path
      const validation = validateDeletePath(file.path);
      
      if (!validation.isValid) {
        results.push({
          id: file.id,
          path: file.path,
          success: false,
          error: validation.error,
          dryRun,
        });
        continue;
      }

      if (dryRun) {
        // Just validate, don't delete
        results.push({
          id: file.id,
          path: file.path,
          success: true,
          dryRun: true,
        });
        continue;
      }

      // Attempt actual deletion
      try {
        // First try to delete from disk
        try {
          await fs.unlink(file.path);
        } catch (fsError: any) {
          if (fsError.code !== "ENOENT") {
            // File exists but couldn't be deleted (locked, permissions, etc.)
            if (fsError.code === "EBUSY" || fsError.code === "EPERM" || fsError.code === "EACCES") {
              results.push({
                id: file.id,
                path: file.path,
                success: false,
                error: `File is locked or permission denied: ${fsError.message}`,
                dryRun: false,
              });
              continue;
            }
          }
          // ENOENT is fine - file already gone from disk
        }

        // Delete from database
        await prisma.fileRecord.delete({ where: { id: file.id } });

        results.push({
          id: file.id,
          path: file.path,
          success: true,
          dryRun: false,
        });
      } catch (error: any) {
        results.push({
          id: file.id,
          path: file.path,
          success: false,
          error: error.message || "Unknown error",
          dryRun: false,
        });
      }
    }

    // Add entries for IDs that weren't found
    const foundIds = new Set(files.map((f) => f.id));
    for (const id of ids) {
      if (!foundIds.has(id)) {
        results.push({
          id,
          path: "",
          success: false,
          error: "File not found in database",
          dryRun,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      results,
      summary: {
        total: ids.length,
        success: successCount,
        failed: failCount,
        dryRun,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 },
    );
  }
}
