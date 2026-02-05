import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { CONFIG } from '$lib/server/config';

function requireAuth(locals: App.Locals) {
  if (!locals.user) throw error(401, 'Authentication required');
}

export const GET: RequestHandler = async ({ locals, url }) => {
  requireAuth(locals);
  const { prisma, user } = locals;
  const view = url.searchParams.get('view') ?? 'mine';

  const where =
    view === 'all' && user?.role === 'ADMIN'
      ? {}
      : {
          userId: user!.id
        };

  const loans = await prisma.loan.findMany({
    where,
    include: { book: true, user: true },
    orderBy: { borrowedAt: 'desc' }
  });

  const now = new Date();
  const extended = loans.map((loan) => {
    const isOverdue = !loan.returnedAt && loan.dueDate < now;
    const daysOverdue = isOverdue
      ? Math.ceil((now.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const fineCents = loan.returnedAt
      ? loan.fineCents
      : isOverdue
      ? daysOverdue * CONFIG.FINE_PER_DAY_CENTS
      : 0;
    return { ...loan, isOverdue, daysOverdue, fineCents };
  });

  return json(extended);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  requireAuth(locals);
  const { prisma, user } = locals;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.bookId !== 'number' || body.bookId <= 0) {
    throw error(400, 'Valid bookId is required');
  }
  
  const book = await prisma.book.findUnique({ where: { id: body.bookId } });
  if (!book) throw error(404, 'Book not found');
  if (book.availableCopies <= 0) {
    throw error(400, 'No available copies of this book');
  }

  // Check if user already has an active loan for this book
  const existingLoan = await prisma.loan.findFirst({
    where: {
      userId: user!.id,
      bookId: book.id,
      returnedAt: null
    }
  });
  if (existingLoan) {
    throw error(400, 'You already have an active loan for this book');
  }

  const borrowedAt = new Date();
  const dueDate = new Date(borrowedAt);
  const days = typeof body.days === 'number' && body.days > 0 ? body.days : CONFIG.LOAN_DURATION_DAYS;
  dueDate.setDate(dueDate.getDate() + days);

  try {
    const loan = await prisma.$transaction(async (tx) => {
      const updated = await tx.book.update({
        where: { id: book.id },
        data: { availableCopies: { decrement: 1 } }
      });
      if (updated.availableCopies < 0) {
        throw error(400, 'No available copies');
      }
      return tx.loan.create({
        data: {
          userId: user!.id,
          bookId: book.id,
          borrowedAt,
          dueDate
        },
        include: { book: true }
      });
    });

    return json(loan, { status: 201 });
  } catch (e: any) {
    if (e.status) throw e; // Re-throw HTTP errors
    throw error(500, 'Failed to create loan');
  }
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  requireAuth(locals);
  const { prisma, user } = locals;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.loanId !== 'number' || body.loanId <= 0) {
    throw error(400, 'Valid loanId is required');
  }

  const loan = await prisma.loan.findUnique({ 
    where: { id: body.loanId },
    include: { book: true }
  });
  if (!loan) throw error(404, 'Loan not found');
  
  if (loan.userId !== user!.id && user!.role !== 'ADMIN') {
    throw error(403, 'You are not authorized to return this loan');
  }
  
  if (loan.returnedAt) {
    return json({ ...loan, isOverdue: false, fineCents: loan.fineCents });
  }

  const now = new Date();
  const isOverdue = now > loan.dueDate;
  const daysOverdue = isOverdue
    ? Math.ceil((now.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const fineCents = isOverdue ? daysOverdue * CONFIG.FINE_PER_DAY_CENTS : 0;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: { id: loan.bookId },
        data: { availableCopies: { increment: 1 } }
      });
      return tx.loan.update({
        where: { id: loan.id },
        data: { returnedAt: now, fineCents }
      });
    });

    return json({ ...updated, isOverdue, fineCents });
  } catch (e: any) {
    throw error(500, 'Failed to return book');
  }
};

