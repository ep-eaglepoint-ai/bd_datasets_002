import { NextRequest, NextResponse } from 'next/server';
import { RawRow } from '@/lib/schema';
import { normalizeRow, validateRow } from '@/lib/validation';

// In-memory database for demo purposes
// In production, this would be replaced with a real database
const importedData: Array<{
  id: number;
  name: string;
  email: string;
  age: number;
  importedAt: Date;
}> = [];

let nextId = 1;

interface ImportRequest {
  rows: Array<{
    rowNumber: number;
    data: RawRow;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportRequest = await request.json();

    if (!body.rows || !Array.isArray(body.rows)) {
      return NextResponse.json(
        { error: 'Invalid request: rows array is required' },
        { status: 400 }
      );
    }

    const validRows: Array<{
      rowNumber: number;
      name: string;
      email: string;
      age: number;
    }> = [];

    const invalidRows: Array<{
      rowNumber: number;
      errors: Record<string, string>;
    }> = [];

    // Re-validate ALL rows server-side to prevent client-side tampering
    for (const row of body.rows) {
      // Normalize values again on server
      const normalizedData = normalizeRow(row.data);
      
      // Validate using shared schema
      const validation = validateRow(normalizedData);

      if (validation.isValid && validation.data) {
        validRows.push({
          rowNumber: row.rowNumber,
          name: validation.data.name,
          email: validation.data.email,
          age: validation.data.age,
        });
      } else if (validation.errors) {
        invalidRows.push({
          rowNumber: row.rowNumber,
          errors: validation.errors,
        });
      }
    }

    // Import only valid rows to the "database"
    for (const row of validRows) {
      importedData.push({
        id: nextId++,
        name: row.name,
        email: row.email,
        age: row.age,
        importedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      importedCount: validRows.length,
      invalidRows: invalidRows,
      totalProcessed: body.rows.length,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to process import request' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve imported data (for verification)
export async function GET() {
  return NextResponse.json({
    data: importedData,
    count: importedData.length,
  });
}
