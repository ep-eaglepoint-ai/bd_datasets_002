'use client'

import { useState, useEffect } from 'react'
import { useMusicStore } from '@/lib/store/music-store'
import { tagService, TagSuggestion, MoodSuggestion } from '@/lib/services/tag-service'
import { X, Trash2, Edit, Merge } from 'lucide-react'

interface TagManagementModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TagManagementModal({ isOpen, onClose }: TagManagementModalProps) {
  const { tracks, updateTrack } = useMusicStore()
  const [activeTab, setActiveTab] = useState<'tags' | 'moods' | 'cleanup'>('tags')
  const [allTags, setAllTags] = useState<TagSuggestion[]>([])
  const [allMoods, setAllMoods] = useState<MoodSuggestion[]>([])
  const [similarTags, setSimilarTags] = useState<Array<{ original: string; similar: string[]; count: number }>>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState('')

  useEffect(() => {
    if (isOpen) {
      setAllTags(tagService.getAllTags(tracks))
      setAllMoods(tagService.getAllMoods(tracks))
      setSimilarTags(tagService.findSimilarTags(tracks))
    }
  }, [isOpen, tracks])

  const handleDeleteTag = async (tagToDelete: string) => {
    if (!confirm(`Are you sure you want to delete the tag "${tagToDelete}" from all tracks?`)) {
      return
    }

    const tracksWithTag = tracks.filter(track => track.customTags.includes(tagToDelete))
    
    for (const track of tracksWithTag) {
      const updatedTrack = {
        ...track,
        customTags: track.customTags.filter(tag => tag !== tagToDelete)
      }
      await updateTrack(updatedTrack)
    }

    // Refresh data
    setAllTags(tagService.getAllTags(tracks))
  }

  const handleRenameTag = async (oldTag: string, newTag: string) => {
    if (!newTag.trim() || oldTag === newTag) return

    const normalizedNewTag = tagService.normalizeTags([newTag])[0]
    const tracksWithTag = tracks.filter(track => track.customTags.includes(oldTag))
    
    for (const track of tracksWithTag) {
      const updatedTags = track.customTags.map(tag => tag === oldTag ? normalizedNewTag : tag)
      const updatedTrack = {
        ...track,
        customTags: tagService.normalizeTags(updatedTags)
      }
      await updateTrack(updatedTrack)
    }

    setEditingTag(null)
    setNewTagName('')
    setAllTags(tagService.getAllTags(tracks))
  }

  const handleMergeTags = async (originalTag: string, tagsToMerge: string[]) => {
    if (!confirm(`Merge ${tagsToMerge.length} similar tags into "${originalTag}"?`)) {
      return
    }

    const allTagsToMerge = [originalTag, ...tagsToMerge]
    const tracksToUpdate = tracks.filter(track => 
      track.customTags.some(tag => allTagsToMerge.includes(tag))
    )

    for (const track of tracksToUpdate) {
      const updatedTags = track.customTags.filter(tag => !allTagsToMerge.includes(tag))
      updatedTags.push(originalTag)
      
      const updatedTrack = {
        ...track,
        customTags: tagService.normalizeTags(updatedTags)
      }
      await updateTrack(updatedTrack)
    }

    // Refresh data
    setAllTags(tagService.getAllTags(tracks))
    setSimilarTags(tagService.findSimilarTags(tracks))
  }

  const handleBulkDeleteTags = async () => {
    if (selectedTags.length === 0) return
    
    if (!confirm(`Delete ${selectedTags.length} selected tags from all tracks?`)) {
      return
    }

    const tracksToUpdate = tracks.filter(track => 
      track.customTags.some(tag => selectedTags.includes(tag))
    )

    for (const track of tracksToUpdate) {
      const updatedTrack = {
        ...track,
        customTags: track.customTags.filter(tag => !selectedTags.includes(tag))
      }
      await updateTrack(updatedTrack)
    }

    setSelectedTags([])
    setAllTags(tagService.getAllTags(tracks))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Tag Management</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-600 mb-6">
          <button
            onClick={() => setActiveTab('tags')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'tags'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tags ({allTags.length})
          </button>
          <button
            onClick={() => setActiveTab('moods')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'moods'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Moods ({allMoods.length})
          </button>
          <button
            onClick={() => setActiveTab('cleanup')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'cleanup'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Cleanup ({similarTags.length})
          </button>
        </div>

        {/* Tags Tab */}
        {activeTab === 'tags' && (
          <div className="space-y-4">
            {selectedTags.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-600 rounded-lg">
                <span className="text-white">
                  {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={handleBulkDeleteTags}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                >
                  Delete Selected
                </button>
              </div>
            )}

            <div className="grid gap-2 max-h-96 overflow-y-auto">
              {allTags.map(({ tag, count }) => (
                <div
                  key={tag}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tag])
                        } else {
                          setSelectedTags(selectedTags.filter(t => t !== tag))
                        }
                      }}
                      className="rounded border-gray-600 bg-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    {editingTag === tag ? (
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameTag(tag, newTagName)
                          } else if (e.key === 'Escape') {
                            setEditingTag(null)
                            setNewTagName('')
                          }
                        }}
                        onBlur={() => handleRenameTag(tag, newTagName)}
                        className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span className="text-white font-medium">{tag}</span>
                    )}
                    <span className="text-gray-400 text-sm">({count} tracks)</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingTag(tag)
                        setNewTagName(tag)
                      }}
                      className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                      title="Rename tag"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete tag"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Moods Tab */}
        {activeTab === 'moods' && (
          <div className="space-y-4">
            <div className="grid gap-2 max-h-96 overflow-y-auto">
              {allMoods.map(({ mood, count }) => (
                <div
                  key={mood}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{mood}</span>
                    <span className="text-gray-400 text-sm">({count} tracks)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cleanup Tab */}
        {activeTab === 'cleanup' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Similar tags that might be duplicates or variations of the same concept.
            </p>
            
            <div className="grid gap-4 max-h-96 overflow-y-auto">
              {similarTags.map(({ original, similar, count }) => (
                <div
                  key={original}
                  className="p-4 bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-white font-medium">{original}</span>
                      <span className="text-gray-400 text-sm ml-2">({count} tracks)</span>
                    </div>
                    <button
                      onClick={() => handleMergeTags(original, similar)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                    >
                      <Merge className="w-3 h-3" />
                      Merge All
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-400">Similar tags:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {similar.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-600 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              
              {similarTags.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No similar tags found. Your tags are well organized!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Close button */}
        <div className="flex justify-end pt-4 border-t border-gray-600 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}