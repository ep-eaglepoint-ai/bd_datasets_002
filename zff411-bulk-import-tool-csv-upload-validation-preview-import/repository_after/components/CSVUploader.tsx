'use client';

import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import { ParsedRow, RawRow, REQUIRED_HEADERS } from '@/lib/schema';
import { normalizeRow, validateRow, validateHeaders, isEmptyRow, formatErrorsForDisplay } from '@/lib/validation';
import SummaryDashboard from './SummaryDashboard';
import PreviewTable from './PreviewTable';
import ImportButton from './ImportButton';

interface ParseState {
  fileName: string | null;
  fileSize: number;
  headers: string[];
  rows: ParsedRow[];
  headerError: string | null;
  parseError: string | null;
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

const initialState: ParseState = {
  fileName: null,
  fileSize: 0,
  headers: [],
  rows: [],
  headerError: null,
  parseError: null,
  totalRows: 0,
  validRows: 0,
  invalidRows: 0,
};

export default function CSVUploader() {
  const [state, setState] = useState<ParseState>(initialState);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    invalidRows?: Array<{ rowNumber: number; errors: Record<string, string> }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setState(initialState);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const parseCSV = useCallback((file: File) => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setState({
        ...initialState,
        parseError: 'Please upload a valid CSV file. Only .csv files are accepted.',
      });
      return;
    }

    setImportResult(null);

    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: 'greedy', // Skip all empty lines including whitespace-only
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        const headers = results.meta.fields || [];
        
        // Validate headers
        const headerValidation = validateHeaders(headers);
        if (!headerValidation.valid) {
          setState({
            ...initialState,
            fileName: file.name,
            fileSize: file.size,
            headers,
            headerError: `Missing required headers: ${headerValidation.missing.join(', ')}`,
          });
          return;
        }

        // Process rows
        const parsedRows: ParsedRow[] = [];
        let validCount = 0;
        let invalidCount = 0;
        let rowNumber = 0;

        for (const row of results.data) {
          // Skip empty rows
          if (isEmptyRow(row)) {
            continue;
          }

          rowNumber++;
          const normalizedRow = normalizeRow(row);
          const validation = validateRow(normalizedRow);

          parsedRows.push({
            rowNumber,
            data: normalizedRow,
            isValid: validation.isValid,
            errors: validation.errors,
          });

          if (validation.isValid) {
            validCount++;
          } else {
            invalidCount++;
          }
        }

        setState({
          fileName: file.name,
          fileSize: file.size,
          headers: headers.map(h => h.trim().toLowerCase()),
          rows: parsedRows,
          headerError: null,
          parseError: null, // Don't show parse errors - let validation handle issues
          totalRows: parsedRows.length,
          validRows: validCount,
          invalidRows: invalidCount,
        });
      },
      error: (error) => {
        setState({
          ...initialState,
          parseError: `Failed to parse CSV: ${error.message}`,
        });
      },
    });
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseCSV(file);
    }
  }, [parseCSV]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      parseCSV(file);
    }
  }, [parseCSV]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleImportComplete = useCallback((result: {
    success: boolean;
    message: string;
    invalidRows?: Array<{ rowNumber: number; errors: Record<string, string> }>;
  }) => {
    setImportResult(result);
  }, []);

  const downloadErrorReport = useCallback(() => {
    if (!importResult?.invalidRows?.length) return;

    const lines = ['Row Number,Field,Error'];
    for (const row of importResult.invalidRows) {
      for (const [field, error] of Object.entries(row.errors)) {
        lines.push(`${row.rowNumber},"${field}","${error.replace(/"/g, '""')}"`);
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'error_report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [importResult]);

  const hasFile = state.fileName !== null;
  const hasValidData = state.totalRows > 0 && !state.headerError && !state.parseError;
  const canImport = hasValidData && state.validRows > 0;

  return (
    <div>
      {/* Upload Area */}
      <div className="card">
        <h2 className="card-title">📁 Upload CSV File</h2>
        
        <div
          className={`upload-area ${isDragOver ? 'dragover' : ''}`}
          onClick={handleUploadClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="upload-icon">📤</div>
          <p className="upload-text">
            {hasFile ? 'Click or drag to replace file' : 'Click or drag a CSV file here'}
          </p>
          <p className="upload-hint">Only .csv files are accepted • Required headers: {REQUIRED_HEADERS.join(', ')}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="file-input"
            id="csv-file-input"
          />
        </div>

        {/* File Info */}
        {hasFile && (
          <div className="file-info">
            <span className="file-icon">📄</span>
            <div className="file-details">
              <div className="file-name">{state.fileName}</div>
              <div className="file-size">{formatFileSize(state.fileSize)}</div>
            </div>
            <button className="file-remove" onClick={resetState} title="Remove file">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Error Alerts */}
      {state.parseError && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <div className="alert-title">Parse Error</div>
            <div>{state.parseError}</div>
          </div>
        </div>
      )}

      {state.headerError && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <div className="alert-title">Missing Required Headers</div>
            <div>{state.headerError}</div>
          </div>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className={`alert ${importResult.success ? 'alert-success' : 'alert-warning'}`}>
          <span className="alert-icon">{importResult.success ? '✅' : '⚠️'}</span>
          <div className="alert-content">
            <div className="alert-title">{importResult.success ? 'Import Complete' : 'Import Completed with Errors'}</div>
            <div>{importResult.message}</div>
            {importResult.invalidRows && importResult.invalidRows.length > 0 && (
              <button 
                className="btn btn-secondary" 
                onClick={downloadErrorReport}
                style={{ marginTop: '0.75rem' }}
              >
                📥 Download Error Report
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary Dashboard */}
      {hasValidData && (
        <SummaryDashboard
          totalRows={state.totalRows}
          validRows={state.validRows}
          invalidRows={state.invalidRows}
        />
      )}

      {/* Preview Table */}
      {hasValidData && (
        <PreviewTable rows={state.rows.slice(0, 20)} headers={state.headers} />
      )}

      {/* Action Buttons */}
      {hasFile && (
        <div className="btn-group">
          <ImportButton
            rows={state.rows}
            disabled={!canImport}
            onImportComplete={handleImportComplete}
          />
          <button className="btn btn-secondary" onClick={resetState}>
            🔄 Reset
          </button>
        </div>
      )}
    </div>
  );
}
