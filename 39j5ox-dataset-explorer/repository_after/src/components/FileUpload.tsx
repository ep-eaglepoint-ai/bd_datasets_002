'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CSVParser } from '../lib/parser';
import { useDatasetStore } from '../store/dataset-store';
import { Dataset, DatasetVersion } from '../types/dataset';
import { generateId, calculateChecksum } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';

export function FileUpload() {
  const { setCurrentDataset, setError } = useDatasetStore();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 100MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Detect file properties
      const encoding = await CSVParser.detectEncoding(file);
      
      // Read sample for delimiter detection
      const sample = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(file.slice(0, 1024), encoding);
      });
      
      const delimiter = CSVParser.detectDelimiter(sample);

      // Parse the file
      const parser = new CSVParser({
        delimiter,
        encoding,
        hasHeader: true,
        skipEmptyLines: true,
        trimWhitespace: true,
      });

      const result = await parser.parseFile(
        file,
        (progress) => setUploadProgress(progress),
      );

      if (result.errors.length > 0) {
        console.warn('Parse warnings:', result.errors);
        alert(`Parsed with ${result.errors.length} warnings. Check console for details.`);
      }

      // Create dataset
      const datasetId = generateId();
      const versionId = generateId();
      
      const initialVersion: DatasetVersion = {
        id: versionId,
        timestamp: new Date(),
        name: 'Initial Import',
        description: `Imported from ${file.name}`,
        columns: result.columns,
        rowCount: result.data.length,
        filters: [],
        transformations: [],
        checksum: calculateChecksum(result.data),
      };

      const dataset: Dataset = {
        id: datasetId,
        name: file.name.replace('.csv', ''),
        originalFileName: file.name,
        uploadedAt: new Date(),
        size: file.size,
        encoding: result.meta.encoding,
        delimiter: result.meta.delimiter,
        hasHeader: result.meta.hasHeader,
        currentVersion: versionId,
        versions: [initialVersion],
        rawData: result.data,
        processedData: result.data,
      };

      setCurrentDataset(dataset);
      
    } catch (error) {
      console.error('Upload error:', error);
      setError(`Failed to upload file: ${error}`);
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [setCurrentDataset, setError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/csv': ['.csv'],
    },
    multiple: false,
    disabled: isUploading,
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-8 h-full">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Dataset Explorer</h1>
        <p className="text-lg text-gray-600">
          Upload and explore your CSV datasets with powerful analytics and visualizations
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="space-y-4">
            <div className="text-4xl">📤</div>
            <div className="space-y-2">
              <p className="text-lg font-medium">Processing file...</p>
              <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
              <p className="text-sm text-gray-600">
                {Math.round(uploadProgress)}% complete
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-4xl">
              {isDragActive ? '📤' : '📄'}
            </div>
            
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop your CSV file here' : 'Upload your CSV dataset'}
              </p>
              <p className="text-sm text-gray-600">
                Drag and drop a CSV file, or click to browse
              </p>
            </div>

            <Button variant="outline" className="mt-4">
              Choose File
            </Button>
          </div>
        )}
      </div>

      <div className="my-8 space-y-4">
        <div className="flex items-start space-x-3 text-sm text-gray-600">
          <div className="text-lg">ℹ️</div>
          <div>
            <p className="font-medium">Supported features:</p>
            <ul className="mt-1 space-y-1 list-disc list-inside ml-4">
              <li>CSV files up to 100MB</li>
              <li>Automatic delimiter and encoding detection</li>
              <li>Handles quoted fields and embedded newlines</li>
              <li>Streaming parser for large files</li>
              <li>Offline processing - no data leaves your browser</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}