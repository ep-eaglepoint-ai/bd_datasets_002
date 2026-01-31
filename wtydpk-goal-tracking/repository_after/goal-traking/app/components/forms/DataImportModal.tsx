'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Upload, FileText, AlertTriangle, CheckCircle2, Download, X } from 'lucide-react';
import { importGoalsFromCsv, importMilestonesFromCsv, generateGoalsCsvTemplate, generateMilestonesCsvTemplate, CsvError } from '@/lib/import';
import { useGoalStore } from '@/lib/store';

interface DataImportModalProps {
  onClose: () => void;
}

export function DataImportModal({ onClose }: DataImportModalProps) {
  const [activeTab, setActiveTab] = useState<'goals' | 'milestones'>('goals');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    count: number;
    errors: CsvError[];
    warnings: string[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createGoal, createMilestone, goals } = useGoalStore();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.type === 'text/csv')) {
      setFile(droppedFile);
      setResult(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleImport = async () => {
    if (!file) return;
    
    setImporting(true);
    try {
      const content = await file.text();
      
      if (activeTab === 'goals') {
        const parseResult = importGoalsFromCsv(content);
        
        if (parseResult.success && parseResult.data.length > 0) {
          for (const goal of parseResult.data) {
            await createGoal(goal);
          }
        }
        
        setResult({
          success: parseResult.success && parseResult.data.length > 0,
          count: parseResult.data.length,
          errors: parseResult.errors,
          warnings: parseResult.warnings,
        });
      } else {
        const existingGoalIds = goals.map(g => g.id);
        const parseResult = importMilestonesFromCsv(content, existingGoalIds);
        
        if (parseResult.success && parseResult.data.length > 0) {
          for (const milestone of parseResult.data) {
            await createMilestone(milestone);
          }
        }
        
        setResult({
          success: parseResult.success && parseResult.data.length > 0,
          count: parseResult.data.length,
          errors: parseResult.errors,
          warnings: parseResult.warnings,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        count: 0,
        errors: [{ row: 0, column: '', message: `Failed to read file: ${error}` }],
        warnings: [],
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const content = activeTab === 'goals' 
      ? generateGoalsCsvTemplate() 
      : generateMilestonesCsvTemplate();
    
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Import Data"
      description="Import goals or milestones from CSV files"
      size="lg"
    >
      {/* Tab Selection */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setActiveTab('goals'); resetForm(); }}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'goals'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary/30 text-muted-foreground hover:text-foreground'
          }`}
        >
          Import Goals
        </button>
        <button
          onClick={() => { setActiveTab('milestones'); resetForm(); }}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'milestones'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary/30 text-muted-foreground hover:text-foreground'
          }`}
        >
          Import Milestones
        </button>
      </div>

      {/* Template Download */}
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
          <Download className="h-4 w-4" />
          Download {activeTab === 'goals' ? 'Goals' : 'Milestones'} Template
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Download a sample CSV file with the correct column format.
        </p>
      </div>

      {/* File Drop Zone */}
      {!result && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            file 
              ? 'border-primary bg-primary/5' 
              : 'border-white/10 hover:border-white/20 hover:bg-white/5'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); resetForm(); }}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Drop CSV file here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports .csv files
              </p>
            </>
          )}
        </div>
      )}

      {/* Import Result */}
      {result && (
        <Card variant="glass" className="p-4">
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
            )}
            <div className="flex-1">
              <h4 className="font-semibold">
                {result.success ? 'Import Successful' : 'Import Failed'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {result.count} {activeTab} imported
              </p>
              
              {result.errors.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-destructive mb-2">Errors:</p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        Row {err.row}: {err.message}
                      </li>
                    ))}
                    {result.errors.length > 5 && (
                      <li className="text-xs text-muted-foreground">
                        ...and {result.errors.length - 5} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}
              
              {result.warnings.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-yellow-500 mb-2">Warnings:</p>
                  <ul className="space-y-1">
                    {result.warnings.map((warn, i) => (
                      <li key={i} className="text-xs text-muted-foreground">{warn}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
        {result ? (
          <>
            <Button variant="outline" onClick={resetForm} className="flex-1">
              Import Another
            </Button>
            <Button onClick={onClose} className="flex-1">
              Done
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!file || importing}
              loading={importing}
              className="flex-1"
            >
              Import {activeTab === 'goals' ? 'Goals' : 'Milestones'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
