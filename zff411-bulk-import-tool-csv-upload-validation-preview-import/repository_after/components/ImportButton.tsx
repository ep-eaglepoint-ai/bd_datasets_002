'use client';

import { useState } from 'react';
import { ParsedRow } from '@/lib/schema';

interface ImportButtonProps {
  rows: ParsedRow[];
  disabled: boolean;
  onImportComplete: (result: {
    success: boolean;
    message: string;
    invalidRows?: Array<{ rowNumber: number; errors: Record<string, string> }>;
  }) => void;
}

export default function ImportButton({ rows, disabled, onImportComplete }: ImportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows: rows.map(r => ({
            rowNumber: r.rowNumber,
            data: r.data,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        onImportComplete({
          success: false,
          message: result.error || 'Import failed. Please try again.',
        });
        return;
      }

      const hasErrors = result.invalidRows && result.invalidRows.length > 0;
      
      onImportComplete({
        success: !hasErrors,
        message: `Successfully imported ${result.importedCount} row(s).${
          hasErrors ? ` ${result.invalidRows.length} row(s) failed validation.` : ''
        }`,
        invalidRows: result.invalidRows,
      });
    } catch (error) {
      onImportComplete({
        success: false,
        message: error instanceof Error ? error.message : 'Network error. Please check your connection and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validCount = rows.filter(r => r.isValid).length;

  return (
    <button
      id="import-button"
      className="btn btn-primary"
      onClick={handleImport}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <span className="spinner"></span>
          Importing...
        </>
      ) : (
        <>
          📥 Import {validCount} Valid Row{validCount !== 1 ? 's' : ''}
        </>
      )}
    </button>
  );
}
