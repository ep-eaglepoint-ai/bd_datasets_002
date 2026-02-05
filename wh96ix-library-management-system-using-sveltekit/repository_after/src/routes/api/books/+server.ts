import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';

function requireAuth(locals: App.Locals) {
  if (!locals.user) throw error(401, 'Authentication required');
}

function requireAdmin(locals: App.Locals) {
  requireAuth(locals);
  if (locals.user?.role !== 'ADMIN') throw error(403, 'Admin only');
}

export const GET: RequestHandler = async ({ url, locals }) => {
  const { prisma } = locals;
  const q = url.searchParams.get('q')?.trim();
  const category = url.searchParams.get('category')?.trim();
  
  const where: any = {};
  
  if (q) {
    // SQLite doesn't support 'mode: insensitive', but SQLite is case-insensitive by default
    // However, Prisma requires explicit handling. We'll use contains which works case-insensitively in SQLite
    where.OR = [
      { title: { contains: q } },
      { author: { contains: q } },
      { isbn: { contains: q } }
    ];
  }
  
  if (category && category !== 'all') {
    where.category = category;
  }
  
  const books = await prisma.book.findMany({
    where,
    orderBy: { title: 'asc' }
  });
  
  return json(books);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  requireAdmin(locals);
  const { prisma } = locals;
  const data = await request.json().catch(() => null);
  if (!data) throw error(400, 'Invalid JSON');
  
  const {
    title,
    author,
    isbn,
    category,
    totalCopies,
    availableCopies,
    publicationYear
  } = data;
  
  // Validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw error(400, 'Title is required');
  }
  if (!author || typeof author !== 'string' || author.trim().length === 0) {
    throw error(400, 'Author is required');
  }
  if (!isbn || typeof isbn !== 'string' || isbn.trim().length === 0) {
    throw error(400, 'ISBN is required');
  }
  if (typeof totalCopies !== 'number' || totalCopies < 1) {
    throw error(400, 'Total copies must be at least 1');
  }
  
  // Check if ISBN already exists
  const existing = await prisma.book.findUnique({ where: { isbn: isbn.trim() } });
  if (existing) {
    throw error(409, 'Book with this ISBN already exists');
  }
  
  const avCopies = typeof availableCopies === 'number' 
    ? Math.min(Math.max(0, availableCopies), totalCopies)
    : totalCopies;
  
  const pubYear = publicationYear != null 
    ? (typeof publicationYear === 'number' && publicationYear > 0 ? publicationYear : null)
    : null;
  
  try {
    const book = await prisma.book.create({
      data: {
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim(),
        category: category?.trim() || null,
        totalCopies,
        availableCopies: avCopies,
        publicationYear: pubYear
      }
    });
    return json(book, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') {
      throw error(409, 'Book with this ISBN already exists');
    }
    throw error(500, 'Failed to create book');
  }
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  requireAdmin(locals);
  const { prisma } = locals;
  const data = await request.json().catch(() => null);
  if (!data || typeof data.id !== 'number') throw error(400, 'Book id required');

  const { id, title, author, isbn, category, totalCopies, availableCopies, publicationYear } = data;
  
  // Check if book exists
  const existing = await prisma.book.findUnique({ where: { id } });
  if (!existing) {
    throw error(404, 'Book not found');
  }
  
  // Validation
  const updateData: any = {};
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw error(400, 'Title cannot be empty');
    }
    updateData.title = title.trim();
  }
  if (author !== undefined) {
    if (typeof author !== 'string' || author.trim().length === 0) {
      throw error(400, 'Author cannot be empty');
    }
    updateData.author = author.trim();
  }
  if (isbn !== undefined) {
    if (typeof isbn !== 'string' || isbn.trim().length === 0) {
      throw error(400, 'ISBN cannot be empty');
    }
    // Check if ISBN is already used by another book
    const isbnExists = await prisma.book.findFirst({ 
      where: { isbn: isbn.trim(), id: { not: id } } 
    });
    if (isbnExists) {
      throw error(409, 'ISBN already exists');
    }
    updateData.isbn = isbn.trim();
  }
  if (category !== undefined) {
    updateData.category = category?.trim() || null;
  }
  if (totalCopies !== undefined) {
    if (typeof totalCopies !== 'number' || totalCopies < 1) {
      throw error(400, 'Total copies must be at least 1');
    }
    updateData.totalCopies = totalCopies;
    // Ensure available copies doesn't exceed total
    if (availableCopies === undefined && existing.availableCopies > totalCopies) {
      updateData.availableCopies = totalCopies;
    }
  }
  if (availableCopies !== undefined) {
    const maxAvail = totalCopies !== undefined ? totalCopies : existing.totalCopies;
    if (typeof availableCopies !== 'number' || availableCopies < 0 || availableCopies > maxAvail) {
      throw error(400, `Available copies must be between 0 and ${maxAvail}`);
    }
    updateData.availableCopies = availableCopies;
  }
  if (publicationYear !== undefined) {
    updateData.publicationYear = publicationYear != null 
      ? (typeof publicationYear === 'number' && publicationYear > 0 ? publicationYear : null)
      : null;
  }
  
  try {
    const book = await prisma.book.update({
      where: { id },
      data: updateData
    });
    return json(book);
  } catch (e: any) {
    if (e.code === 'P2025') {
      throw error(404, 'Book not found');
    }
    if (e.code === 'P2002') {
      throw error(409, 'ISBN already exists');
    }
    throw error(500, 'Failed to update book');
  }
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  requireAdmin(locals);
  const { prisma } = locals;
  const id = Number(url.searchParams.get('id'));
  if (!id || isNaN(id)) throw error(400, 'Valid book id required');
  
  // Check if book exists
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    throw error(404, 'Book not found');
  }
  
  // Check if there are active loans
  const activeLoans = await prisma.loan.count({
    where: { bookId: id, returnedAt: null }
  });
  if (activeLoans > 0) {
    throw error(400, `Cannot delete book: ${activeLoans} active loan(s) exist`);
  }
  
  try {
    // Delete related loans first (cascade)
    await prisma.loan.deleteMany({ where: { bookId: id } });
    await prisma.book.delete({ where: { id } });
    return json({ ok: true });
  } catch (e: any) {
    if (e.code === 'P2025') {
      throw error(404, 'Book not found');
    }
    throw error(500, 'Failed to delete book');
  }
};

