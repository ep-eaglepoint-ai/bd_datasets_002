import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    // Find all hashes that have duplicates
    const duplicateHashes = await prisma.fileRecord.groupBy({
      by: ["hash"],
      having: {
        hash: {
          _count: {
            gt: 1,
          },
        },
      },
      where: {
        hash: { not: null },
      },
      _count: {
        hash: true,
      },
    });

    const hashes = duplicateHashes
      .map((d) => d.hash)
      .filter((h): h is string => h !== null);

    const totalGroups = hashes.length;

    if (totalGroups === 0) {
      return NextResponse.json({
        groups: [],
        totalGroups: 0,
        displayedGroups: 0,
        pagination: {
          page,
          limit,
          totalPages: 0,
        },
        stats: {
          totalDuplicateFiles: 0,
          potentialSpaceSaved: "0",
        },
      });
    }

    // Paginate the groups
    const startIdx = (page - 1) * limit;
    const pagedHashes = hashes.slice(startIdx, startIdx + limit);

    // Fetch details for these hashes
    const files = await prisma.fileRecord.findMany({
      where: {
        hash: { in: pagedHashes },
      },
      orderBy: [{ hash: "asc" }, { createdAt: "asc" }],
      include: { tags: true },
    });

    // Group by hash
    const groups: Record<string, any[]> = {};
    let totalSize = BigInt(0);

    files.forEach((f) => {
      if (!f.hash) return;
      if (!groups[f.hash]) groups[f.hash] = [];
      groups[f.hash].push({
        ...f,
        size: f.size.toString(),
      });
      // Count potential space saved (all duplicates except one)
      if (groups[f.hash].length > 1) {
        totalSize += f.size;
      }
    });

    // Calculate total duplicate files across all groups
    const totalDuplicateFiles = await prisma.fileRecord.count({
      where: {
        hash: { in: hashes },
      },
    });

    return NextResponse.json({
      groups: Object.values(groups),
      totalGroups,
      displayedGroups: pagedHashes.length,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalGroups / limit),
      },
      stats: {
        totalDuplicateFiles,
        potentialSpaceSaved: totalSize.toString(),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch duplicates" },
      { status: 500 },
    );
  }
}
