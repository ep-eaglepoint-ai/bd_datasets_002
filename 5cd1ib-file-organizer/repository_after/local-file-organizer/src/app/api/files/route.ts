import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Pagination
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  
  // Search
  const search = searchParams.get("search") || "";
  const searchCaseInsensitive = searchParams.get("caseInsensitive") === "true";
  
  // Filters
  const extension = searchParams.get("extension");
  const minSize = searchParams.get("minSize");
  const maxSize = searchParams.get("maxSize");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const tags = searchParams.get("tags"); // Comma-separated list
  const directory = searchParams.get("directory");
  const hasHash = searchParams.get("hasHash");
  
  // Sorting
  const sortBy = searchParams.get("sortBy") || "filename";
  const sortOrder = searchParams.get("sortOrder") || "asc";

  // Build where clause
  const where: Prisma.FileRecordWhereInput = {};
  const andConditions: Prisma.FileRecordWhereInput[] = [];

  // Text search
  if (search) {
    if (searchCaseInsensitive) {
      // SQLite doesn't have native case-insensitive contains, use mode
      andConditions.push({
        OR: [
          { filename: { contains: search } },
          { path: { contains: search } },
        ],
      });
    } else {
      andConditions.push({
        OR: [
          { filename: { contains: search } },
          { path: { contains: search } },
        ],
      });
    }
  }

  // Extension filter
  if (extension) {
    const ext = extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
    andConditions.push({ extension: ext });
  }

  // Size range filter
  if (minSize) {
    andConditions.push({ size: { gte: BigInt(minSize) } });
  }
  if (maxSize) {
    andConditions.push({ size: { lte: BigInt(maxSize) } });
  }

  // Date range filter
  if (fromDate) {
    andConditions.push({ updatedAt: { gte: new Date(fromDate) } });
  }
  if (toDate) {
    andConditions.push({ updatedAt: { lte: new Date(toDate) } });
  }

  // Directory filter
  if (directory) {
    andConditions.push({ path: { startsWith: directory } });
  }

  // Hash filter
  if (hasHash === "true") {
    andConditions.push({ hash: { not: null } });
  } else if (hasHash === "false") {
    andConditions.push({ hash: null });
  }

  // Tags filter
  if (tags) {
    const tagList = tags.split(",").map((t) => t.trim()).filter((t) => t);
    if (tagList.length > 0) {
      andConditions.push({
        tags: {
          some: {
            name: { in: tagList },
          },
        },
      });
    }
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  // Build orderBy
  const validSortFields = ["filename", "extension", "size", "createdAt", "updatedAt", "path"];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "filename";
  const order = sortOrder === "desc" ? "desc" : "asc";

  try {
    const [files, total] = await Promise.all([
      prisma.fileRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: order },
        include: { tags: true },
      }),
      prisma.fileRecord.count({ where }),
    ]);

    // Serialize BigInt
    const filesSerialized = files.map((f) => ({
      ...f,
      size: f.size.toString(),
    }));

    return NextResponse.json({
      data: filesSerialized,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        search,
        extension,
        minSize,
        maxSize,
        fromDate,
        toDate,
        tags,
        directory,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 },
    );
  }
}
