'use client'

import { useState, useEffect } from 'react'
import { TrackMetadata } from '@/lib/types/music'
import { useMusicStore } from '@/lib/store/music-store'
import { tagService } from '@/lib/services/tag-service'
import { X, Plus, Trash2, Star } from 'lucide-react'

interface EditTrackModalProps {
  isOpen: boolean
  onClose: () => void
  track: TrackMetadata | null
  tracks?: TrackMetadata[] // For bulk editing
  isBulkEdit?: boolean
}

export function EditTrackModal({ 
  isOpen, 
  onClose, 
  track, 
  tracks = [], 
  isBulkEdit = false 
}: EditTrackModalProps) {
  const { updateTrack, tracks: allTracks } = useMusicStore()
  
  // Form state
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [album, setAlbum] = useState('')
  const [genre, setGenre] = useState('')
  const [year, setYear] = useState<number | ''>('')
  const [trackNumber, setTrackNumber] = useState<number | ''>('')
  const [discNumber, setDiscNumber] = useState<number | ''>('')
  const [rating, setRating] = useState<number>(0)
  const [mood, setMood] = useState('')
  const [customTags, setCustomTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [showMoodSuggestions, setShowMoodSuggestions] = useState(false)
  
  // Bulk edit specific state
  const [bulkFields, setBulkFields] = useState({
    genre: false,
    year: false,
    rating: false,
    mood: false,
    customTags: false,
  })

  // Initialize form with track data
  useEffect(() => {
    if (track && !isBulkEdit) {
      setTitle(track.title)
      setArtist(track.artist)
      setAlbum(track.album)
      setGenre(track.genre || '')
      setYear(track.year || '')
      setTrackNumber(track.trackNumber || '')
      setDiscNumber(track.discNumber || '')
      setRating(track.rating || 0)
      setMood(track.mood || '')
      setCustomTags([...(track.customTags || [])])
    } else if (isBulkEdit) {
      // Reset form for bulk edit
      setTitle('')
      setArtist('')
      setAlbum('')
      setGenre('')
      setYear('')
      setTrackNumber('')
      setDiscNumber('')
      setRating(0)
      setMood('')
      setCustomTags([])
      setBulkFields({
        genre: false,
        year: false,
        rating: false,
        mood: false,
        customTags: false,
      })
    }
  }, [track, isBulkEdit, isOpen])

  const handleAddTag = () => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      const normalizedTags = tagService.normalizeTags([...customTags, newTag.trim()])
      setCustomTags(normalizedTags)
      setNewTag('')
      setShowTagSuggestions(false)
    }
  }

  const handleAddSuggestedTag = (tag: string) => {
    if (!customTags.includes(tag)) {
      setCustomTags([...customTags, tag])
    }
    setShowTagSuggestions(false)
  }

  const handleAddSuggestedMood = (mood: string) => {
    setMood(mood)
    setShowMoodSuggestions(false)
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isBulkEdit) {
      // Bulk update selected tracks
      for (const trackToUpdate of tracks) {
        const updatedTrack: TrackMetadata = {
          ...trackToUpdate,
          ...(bulkFields.genre && { genre }),
          ...(bulkFields.year && year && { year: Number(year) }),
          ...(bulkFields.rating && { rating }),
          ...(bulkFields.mood && { mood: mood ? tagService.normalizeMood(mood) : undefined }),
          ...(bulkFields.customTags && { 
            customTags: tagService.normalizeTags([...trackToUpdate.customTags, ...customTags])
          }),
        }
        await updateTrack(updatedTrack)
      }
    } else if (track) {
      // Single track update
      const updatedTrack: TrackMetadata = {
        ...track,
        title,
        artist,
        album,
        genre: genre || undefined,
        year: year ? Number(year) : undefined,
        trackNumber: trackNumber ? Number(trackNumber) : undefined,
        discNumber: discNumber ? Number(discNumber) : undefined,
        rating,
        mood: mood ? tagService.normalizeMood(mood) : undefined,
        customTags: tagService.normalizeTags(customTags),
      }
      await updateTrack(updatedTrack)
    }
    
    onClose()
  }

  const renderStarRating = () => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star === rating ? 0 : star)}
          className={`p-1 rounded transition-colors ${
            star <= rating 
              ? 'text-yellow-400 hover:text-yellow-300' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Star className={`w-5 h-5 ${star <= rating ? 'fill-current' : ''}`} />
        </button>
      ))}
      <span className="ml-2 text-sm text-gray-400">
        {rating > 0 ? `${rating}/5` : 'No rating'}
      </span>
    </div>
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {isBulkEdit 
              ? `Edit ${tracks.length} Tracks` 
              : `Edit Track: ${track?.title}`
            }
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isBulkEdit && (
            <>
              {/* Basic metadata fields for single track edit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Artist
                  </label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Album
                  </label>
                  <input
                    type="text"
                    value={album}
                    onChange={(e) => setAlbum(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Genre
                  </label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1900"
                    max="2100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Track #
                  </label>
                  <input
                    type="number"
                    value={trackNumber}
                    onChange={(e) => setTrackNumber(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Disc #
                  </label>
                  <input
                    type="number"
                    value={discNumber}
                    onChange={(e) => setDiscNumber(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
              </div>
            </>
          )}

          {/* Fields available for both single and bulk edit */}
          <div className="space-y-4 border-t border-gray-600 pt-4">
            <h3 className="text-lg font-medium text-white">
              {isBulkEdit ? 'Bulk Edit Fields' : 'Additional Metadata'}
            </h3>

            {/* Genre for bulk edit */}
            {isBulkEdit && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="bulk-genre"
                  checked={bulkFields.genre}
                  onChange={(e) => setBulkFields(prev => ({ ...prev, genre: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="bulk-genre" className="text-sm font-medium text-gray-300 flex-1">
                  Genre
                </label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  disabled={!bulkFields.genre}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter genre"
                />
              </div>
            )}

            {/* Year for bulk edit */}
            {isBulkEdit && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="bulk-year"
                  checked={bulkFields.year}
                  onChange={(e) => setBulkFields(prev => ({ ...prev, year: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="bulk-year" className="text-sm font-medium text-gray-300 flex-1">
                  Year
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
                  disabled={!bulkFields.year}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter year"
                  min="1900"
                  max="2100"
                />
              </div>
            )}

            {/* Rating */}
            <div className={isBulkEdit ? "flex items-center gap-3" : ""}>
              {isBulkEdit && (
                <>
                  <input
                    type="checkbox"
                    id="bulk-rating"
                    checked={bulkFields.rating}
                    onChange={(e) => setBulkFields(prev => ({ ...prev, rating: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="bulk-rating" className="text-sm font-medium text-gray-300 flex-1">
                    Rating
                  </label>
                </>
              )}
              {!isBulkEdit && (
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rating
                </label>
              )}
              <div className={isBulkEdit && !bulkFields.rating ? "opacity-50 pointer-events-none" : ""}>
                {renderStarRating()}
              </div>
            </div>

            {/* Mood */}
            <div className={isBulkEdit ? "flex items-center gap-3" : ""}>
              {isBulkEdit && (
                <>
                  <input
                    type="checkbox"
                    id="bulk-mood"
                    checked={bulkFields.mood}
                    onChange={(e) => setBulkFields(prev => ({ ...prev, mood: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="bulk-mood" className="text-sm font-medium text-gray-300 w-20">
                    Mood
                  </label>
                </>
              )}
              {!isBulkEdit && (
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Mood
                </label>
              )}
              <div className={`relative ${isBulkEdit ? 'flex-1' : 'w-full'}`}>
                <input
                  type="text"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  onFocus={() => setShowMoodSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowMoodSuggestions(false), 200)}
                  disabled={isBulkEdit && !bulkFields.mood}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="e.g., Happy, Melancholic, Energetic"
                />
                
                {/* Mood Suggestions */}
                {showMoodSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20 max-h-40 overflow-y-auto">
                    {/* Predefined moods */}
                    <div className="p-2 border-b border-gray-600">
                      <div className="text-xs text-gray-400 mb-1">Suggested</div>
                      <div className="flex flex-wrap gap-1">
                        {tagService.getPredefinedMoods().slice(0, 10).map((suggestedMood) => (
                          <button
                            key={suggestedMood}
                            type="button"
                            onClick={() => handleAddSuggestedMood(suggestedMood)}
                            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                          >
                            {suggestedMood}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Existing moods from library */}
                    {tagService.getMoodSuggestions(allTracks, mood, 5).length > 0 && (
                      <div className="p-2">
                        <div className="text-xs text-gray-400 mb-1">From your library</div>
                        {tagService.getMoodSuggestions(allTracks, mood, 5).map(({ mood: existingMood, count }) => (
                          <button
                            key={existingMood}
                            type="button"
                            onClick={() => handleAddSuggestedMood(existingMood)}
                            className="block w-full text-left px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                          >
                            {existingMood} <span className="text-gray-500">({count})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Tags */}
            <div className={isBulkEdit ? "flex items-start gap-3" : ""}>
              {isBulkEdit && (
                <>
                  <input
                    type="checkbox"
                    id="bulk-tags"
                    checked={bulkFields.customTags}
                    onChange={(e) => setBulkFields(prev => ({ ...prev, customTags: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 mt-2"
                  />
                  <label htmlFor="bulk-tags" className="text-sm font-medium text-gray-300 w-20 mt-2">
                    Add Tags
                  </label>
                </>
              )}
              <div className={`${isBulkEdit ? 'flex-1' : 'w-full'} ${isBulkEdit && !bulkFields.customTags ? "opacity-50 pointer-events-none" : ""}`}>
                {!isBulkEdit && (
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Custom Tags
                  </label>
                )}
                
                {/* Add new tag */}
                <div className="relative">
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onFocus={() => setShowTagSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a tag..."
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tag Suggestions */}
                  {showTagSuggestions && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20 max-h-40 overflow-y-auto">
                      {/* Predefined tags */}
                      <div className="p-2 border-b border-gray-600">
                        <div className="text-xs text-gray-400 mb-1">Suggested</div>
                        <div className="flex flex-wrap gap-1">
                          {tagService.getPredefinedTags().slice(0, 10).map((suggestedTag) => (
                            <button
                              key={suggestedTag}
                              type="button"
                              onClick={() => handleAddSuggestedTag(suggestedTag)}
                              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                            >
                              {suggestedTag}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Existing tags from library */}
                      {tagService.getTagSuggestions(allTracks, newTag, 5).length > 0 && (
                        <div className="p-2">
                          <div className="text-xs text-gray-400 mb-1">From your library</div>
                          {tagService.getTagSuggestions(allTracks, newTag, 5).map(({ tag, count }) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleAddSuggestedTag(tag)}
                              className="block w-full text-left px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                            >
                              {tag} <span className="text-gray-500">({count})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Existing tags */}
                <div className="flex flex-wrap gap-2">
                  {customTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-sm rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-blue-200 hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-600">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              {isBulkEdit ? `Update ${tracks.length} Tracks` : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}