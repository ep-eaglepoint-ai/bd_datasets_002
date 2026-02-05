'use client';

import React, { useState, useRef } from 'react';
import { Survey } from '@/lib/schemas/survey';
import { useSurveyStore } from '@/lib/store/surveyStore';
import { importCSV, importJSON, ImportResult } from '@/lib/utils/csvImport';
import { streamCSVImport, processInBatches } from '@/lib/utils/streaming';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface DataImporterProps {
  survey: Survey;
}

export const DataImporter: React.FC<DataImporterProps> = ({ survey }) => {
  const { addResponses } = useSurveyStore();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      let importResult: ImportResult;
      
      // Use streaming for large CSV files (> 10MB)
      if (file.name.endsWith('.csv') && file.size > 10 * 1024 * 1024) {
        // Stream processing for large files
        const responses: any[] = [];
        let totalRows = 0;
        let errors = 0;
        
        for await (const batch of streamCSVImport(file, 1000)) {
          totalRows += batch.length;
          // Validate batch
          const valid = batch.filter(r => {
            try {
              // Basic validation
              return r.id && r.surveyId;
            } catch {
              errors++;
              return false;
            }
          });
          responses.push(...valid);
          
          // Update progress
          setResult({
            success: true,
            responses: [],
            errors: [],
            warnings: [],
            stats: { totalRows, imported: responses.length, skipped: 0, errors },
          });
        }
        
        importResult = {
          success: true,
          responses,
          errors: [],
          warnings: [],
          stats: { totalRows, imported: responses.length, skipped: 0, errors },
        };
      } else if (file.name.endsWith('.csv')) {
        importResult = await importCSV(file, survey);
      } else if (file.name.endsWith('.json')) {
        importResult = await importJSON(file, survey);
      } else {
        setResult({
          success: false,
          responses: [],
          errors: [{ row: 0, message: 'Unsupported file type. Please use CSV or JSON.' }],
          warnings: [],
          stats: { totalRows: 0, imported: 0, skipped: 0, errors: 1 },
        });
        setImporting(false);
        return;
      }

      setResult(importResult);

      if (importResult.success && importResult.responses.length > 0) {
        // Process in batches for large imports
        if (importResult.responses.length > 5000) {
          await processInBatches(
            importResult.responses,
            1000,
            async (batch) => {
              await addResponses(batch);
              return batch;
            }
          );
        } else {
          await addResponses(importResult.responses);
        }
      }
    } catch (error) {
      setResult({
        success: false,
        responses: [],
        errors: [
          {
            row: 0,
            message: error instanceof Error ? error.message : 'Unknown error occurred',
          },
        ],
        warnings: [],
        stats: { totalRows: 0, imported: 0, skipped: 0, errors: 1 },
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card title="Import Responses" description="Import survey responses from CSV or JSON files">
      <div className="space-y-4">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input">
            <div>
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                isLoading={importing}
              >
                {importing ? 'Importing...' : 'Select File'}
              </Button>
            </div>
          </label>
        </div>

        {result && (
          <div className="mt-4">
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <h3 className="font-semibold mb-2">
                {result.success ? 'Import Successful' : 'Import Completed with Errors'}
              </h3>
              <div className="text-sm space-y-1">
                <p>Total Rows: {result.stats.totalRows}</p>
                <p className="text-green-700">Imported: {result.stats.imported}</p>
                {result.stats.errors > 0 && (
                  <p className="text-red-700">Errors: {result.stats.errors}</p>
                )}
                {result.stats.skipped > 0 && (
                  <p className="text-yellow-700">Skipped: {result.stats.skipped}</p>
                )}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4 max-h-60 overflow-y-auto">
                <h4 className="font-semibold text-sm mb-2">Errors:</h4>
                <ul className="text-sm space-y-1">
                  {result.errors.slice(0, 10).map((error, index) => (
                    <li key={index} className="text-red-600">
                      Row {error.row}: {error.message}
                    </li>
                  ))}
                  {result.errors.length > 10 && (
                    <li className="text-gray-500">
                      ... and {result.errors.length - 10} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
