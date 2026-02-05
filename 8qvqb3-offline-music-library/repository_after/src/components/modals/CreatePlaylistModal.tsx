'use client'

import { useState } from 'react'
import { useMusicStore } from '@/lib/store/music-store'
import { X } from 'lucide-react'

interface CreatePlaylistModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreatePlaylistModal({ isOpen, onClose }: CreatePlaylistModalProps) {
  const { createPlaylist } = useMusicStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'manual' | 'smart'>('manual')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return

    try {
      await createPlaylist({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        rules: [],
        trackIds: [],
        sortBy: 'dateAdded',
        sortOrder: 'desc',
      })
      
      // Reset form and close modal
      setName('')
      setDescription('')
      setType('manual')
      onClose()
    } catch (error) {
      console.error('Failed to create playlist:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Create Playlist</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Playlist Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter playlist name"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter playlist description"
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Playlist Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="manual"
                  checked={type === 'manual'}
                  onChange={(e) => setType(e.target.value as 'manual')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-white">Manual Playlist</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="smart"
                  checked={type === 'smart'}
                  onChange={(e) => setType(e.target.value as 'smart')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-white">Smart Playlist</span>
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {type === 'smart' 
                ? 'Automatically updates based on rules you define'
                : 'Manually add and remove tracks'
              }
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
            >
              Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}