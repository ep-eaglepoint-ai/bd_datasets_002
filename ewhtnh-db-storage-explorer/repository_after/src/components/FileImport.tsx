'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useStorageStore } from '@/store/storageStore'
import { StorageParser } from '@/utils/storageParser'
import { InspectionLog } from '@/types/storage'

interface FileImportProps {
  onFileLoad: (success: boolean) => void
}

export default function FileImport({ onFileLoad }: FileImportProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addSnapshot, addInspectionLog, setLoading, setError: setStoreError } = useStorageStore()

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true)
    setError(null)
    setLoading(true)
    setStoreError(null)

    try {
      // If JSON, prefer offloading parse to a Web Worker (optional optimization)
      let snapshot = null as any

      const isJSON = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')

      if (isJSON && typeof Worker !== 'undefined') {
        try {
          const text = await file.text()
          const worker = new Worker('/workers/jsonParserWorker.js')

          snapshot = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Worker timeout')), 15000)
            worker.onmessage = (e) => {
              clearTimeout(timeout)
              if (e.data.error) reject(new Error(e.data.error))
              else resolve(e.data.snapshot)
            }
            worker.onerror = (err) => {
              clearTimeout(timeout)
              reject(err)
            }
            worker.postMessage({ text, filename: file.name })
          })
        } catch (err) {
          // Worker failed; fallback to main-thread parsing
          console.warn('Worker parse failed, falling back to main parser:', err)
          snapshot = await StorageParser.parseFile(file)
        }
      } else {
        snapshot = await StorageParser.parseFile(file)
      }

      addSnapshot(snapshot)

      const log: InspectionLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        action: 'import',
        snapshotId: snapshot.id,
        details: {
          fileName: file.name,
          fileSize: file.size,
          totalPages: snapshot.metrics?.totalPages ?? 0,
          heapPages: snapshot.heapPages?.length ?? 0,
          indexPages: snapshot.indexPages?.length ?? 0,
          corruptedPages: snapshot.corruptedPages?.length ?? 0
        }
      }

      addInspectionLog(log)
      onFileLoad(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process file'
      setError(errorMessage)
      setStoreError(errorMessage)
      onFileLoad(false)
    } finally {
      setIsProcessing(false)
      setLoading(false)
    }
  }, [addSnapshot, addInspectionLog, setLoading, setStoreError, onFileLoad])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    const file = acceptedFiles[0]
    
    const validExtensions = ['.dump', '.bin', '.json', '.dat', '.pgd']
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    
    if (validExtensions.indexOf(fileExtension) === -1) {
      setError(`Invalid file type. Supported formats: ${validExtensions.join(', ')}`)
      return
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      setError('File too large. Maximum size is 100MB')
      return
    }
    
    processFile(file)
  }, [processFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.dump', '.bin', '.dat', '.pgd'],
      'application/json': ['.json'],
      'text/plain': ['.txt']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false
  })

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Import Database Storage Snapshot
        </h2>
        
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              {isProcessing ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              ) : (
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
            
            <div>
              {isProcessing ? (
                <p className="text-lg font-medium text-gray-900">Processing file...</p>
              ) : isDragActive ? (
                <p className="text-lg font-medium text-blue-600">Drop the file here...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Drag & drop a database dump file here, or click to select
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports PostgreSQL dumps, binary page files, and JSON formats
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Import Error
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Supported Formats:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• PostgreSQL binary dumps (.dump, .pgd)</li>
            <li>• Raw page files (.bin, .dat)</li>
            <li>• JSON storage snapshots (.json)</li>
            <li>• Maximum file size: 100MB</li>
          </ul>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Features:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Automatic format detection</li>
            <li>• Corruption handling with detailed error reporting</li>
            <li>• Deterministic parsing with validation</li>
            <li>• Storage metrics calculation</li>
            <li>• Page layout analysis</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
