import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateDeletePath } from "@/lib/pathValidator";
import fs from "fs/promises";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);

  try {
    const file = await prisma.fileRecord.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...file,
      size: file.size.toString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);
  
  // Check for dry run
  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") === "true";

  try {
    const file = await prisma.fileRecord.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Validate against protected paths
    const validation = validateDeletePath(file.path);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error, protected: true },
        { status: 403 },
      );
    }

    // Check if file exists on disk
    let existsOnDisk = false;
    try {
      await fs.access(file.path);
      existsOnDisk = true;
    } catch {
      existsOnDisk = false;
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        wouldDelete: true,
        fileExistsOnDisk: existsOnDisk,
        path: file.path,
        filename: file.filename,
        size: file.size.toString(),
      });
    }

    // Attempt disk deletion
    if (existsOnDisk) {
      try {
        await fs.unlink(file.path);
      } catch (fsError: any) {
        if (fsError.code === "EBUSY") {
          return NextResponse.json(
            { error: "File is currently in use and cannot be deleted" },
            { status: 423 }, // Locked
          );
        }
        if (fsError.code === "EPERM" || fsError.code === "EACCES") {
          return NextResponse.json(
            { error: "Permission denied - cannot delete file" },
            { status: 403 },
          );
        }
        // Log but continue - file might have been deleted by another process
        console.warn(`Could not delete file from disk: ${file.path}`, fsError);
      }
    }

    // Delete from database
    await prisma.fileRecord.delete({ where: { id } });

    return NextResponse.json({
      message: "File deleted successfully",
      deletedFromDisk: existsOnDisk,
      path: file.path,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH for tagging
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);
  const body = await request.json();
  const { tags } = body; // Array of strings

  if (!Array.isArray(tags)) {
    return NextResponse.json(
      { error: "Tags must be an array" },
      { status: 400 },
    );
  }

  // Validate and sanitize tags
  const sanitizedTags = tags
    .map((t: any) => (typeof t === "string" ? t.trim() : ""))
    .filter((t: string) => t.length > 0 && t.length <= 50);
  
  // Check for duplicate tags
  const uniqueTags = [...new Set(sanitizedTags)];

  if (sanitizedTags.length !== tags.length) {
    console.warn(`Some tags were sanitized or removed: ${tags.length} -> ${sanitizedTags.length}`);
  }

  try {
    const file = await prisma.fileRecord.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await prisma.fileRecord.update({
      where: { id },
      data: {
        tags: {
          set: [], // Clear current tags
          connectOrCreate: uniqueTags.map((t) => ({
            where: { name: t },
            create: { name: t },
          })),
        },
      },
    });

    // Fetch updated file
    const updatedFile = await prisma.fileRecord.findUnique({
      where: { id },
      include: { tags: true },
    });

    return NextResponse.json({
      message: "Tags updated",
      tags: updatedFile?.tags || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
