'use client'

import { useState, useRef } from 'react'
import { useMusicStore } from '@/lib/store/music-store'
import { metadataService } from '@/lib/services/metadata-service'
import { X, Upload, FileMusic, AlertCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function ImportModal() {
  const { 
    showImportModal, 
    toggleImportModal, 
    importProgress, 
    startImport, 
    updateImportProgress, 
    addTracks 
  } = useMusicStore()
  
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    const audioFiles = Array.from(files).filter(file => 
      metadataService.isSupportedAudioFile(file)
    )

    if (audioFiles.length === 0) {
      alert('No supported audio files found. Please select MP3, FLAC, WAV, M4A, AAC, OGG, WMA, OPUS, or WEBM files.')
      return
    }

    startImport()
    updateImportProgress({
      totalFiles: audioFiles.length,
      processedFiles: 0,
      currentFile: '',
      errors: [],
    })

    try {
      const trackMetadata = await metadataService.extractMetadataFromFiles(
        audioFiles,
        (processed, total, currentFile) => {
          updateImportProgress({
            processedFiles: processed,
            currentFile,
          })
        }
      )

      // Filter out any failed extractions and validate metadata
      const validTracks = trackMetadata
        .filter(track => track.id)
        .map(track => metadataService.validateAndCleanMetadata(track as any))
      
      if (validTracks.length > 0) {
        await addTracks(validTracks)
      }

      const failedCount = audioFiles.length - validTracks.length
      if (failedCount > 0) {
        updateImportProgress({
          errors: [`${failedCount} files could not be processed`],
        })
      }

      updateImportProgress({
        isImporting: false,
        currentFile: '',
      })

      // Close modal after successful import
      setTimeout(() => {
        toggleImportModal()
      }, 2000)

    } catch (error) {
      console.error('Import failed:', error)
      updateImportProgress({
        isImporting: false,
        errors: ['Import failed. Please try again.'],
      })
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  if (!showImportModal) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Import Music</h2>
          <button
            onClick={toggleImportModal}
            disabled={importProgress.isImporting}
            className="text-gray-400 hover:text-white disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        {importProgress.isImporting ? (
          <div className="text-center py-8">
            <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
            <p className="text-white mb-2">
              Processing {importProgress.processedFiles} of {importProgress.totalFiles} files
            </p>
            {importProgress.currentFile && (
              <p className="text-gray-400 text-sm truncate">
                {importProgress.currentFile}
              </p>
            )}
            <div className="w-full bg-gray-700 rounded-full h-2 mt-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(importProgress.processedFiles / importProgress.totalFiles) * 100}%`
                }}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <FileMusic className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-white mb-2">
                Drag and drop your music files here
              </p>
              <p className="text-gray-400 text-sm mb-4">
                or click to browse files
              </p>
              <button
                onClick={handleFileSelect}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Choose Files
              </button>
            </div>

            {/* Supported Formats */}
            <div className="mt-4 text-center">
              <p className="text-gray-400 text-sm">
                Supported formats: MP3, FLAC, WAV, M4A, AAC, OGG, WMA, OPUS, WEBM
              </p>
            </div>

            {/* Errors */}
            {importProgress.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">Import Errors</span>
                </div>
                <ul className="text-red-300 text-sm space-y-1">
                  {importProgress.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".mp3,.flac,.wav,.m4a,.aac,.ogg,.wma,.opus,.webm"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
    </div>
  )
}