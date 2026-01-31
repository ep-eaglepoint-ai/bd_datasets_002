'use client';

import { useState } from 'react';
import { Section } from '@/types/survey';
import { 
  EditIcon, 
  TrashIcon, 
  GripVerticalIcon,
  FolderIcon
} from 'lucide-react';

interface SectionEditorProps {
  sections: Section[];
  onUpdate: (id: string, updates: Partial<Section>) => void;
  onDelete: (id: string) => void;
  onReorder: (sectionIds: string[]) => void;
}

export default function SectionEditor({ sections, onUpdate, onDelete, onReorder }: SectionEditorProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedItem(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      return;
    }

    const currentOrder = sections.map(s => s.id);
    const draggedIndex = currentOrder.indexOf(draggedItem);
    const targetIndex = currentOrder.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    onReorder(newOrder);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleSave = (section: Section, updates: { title: string; description: string }) => {
    onUpdate(section.id, updates);
    setEditingSection(null);
  };

  if (sections.length === 0) {
    return (
      <div className="card text-center py-12">
        <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No sections</h3>
        <p className="mt-1 text-sm text-gray-500">
          Sections help organize your questions into logical groups.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Sections ({sections.length})
      </h3>
      
      <div className="space-y-3">
        {sections
          .sort((a, b) => a.order - b.order)
          .map((section, index) => (
            <div
              key={section.id}
              draggable
              onDragStart={(e) => handleDragStart(e, section.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, section.id)}
              onDragEnd={handleDragEnd}
              className={`card hover:shadow-md transition-all cursor-move ${
                draggedItem === section.id ? 'opacity-50' : ''
              }`}
            >
              {editingSection === section.id ? (
                <SectionEditForm
                  section={section}
                  onSave={(updates) => handleSave(section, updates)}
                  onCancel={() => setEditingSection(null)}
                />
              ) : (
                <div className="flex items-start space-x-4">
                  {/* Drag Handle */}
                  <div className="drag-handle pt-1">
                    <GripVerticalIcon className="h-5 w-5 text-gray-400" />
                  </div>

                  {/* Section Number */}
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>

                  {/* Section Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-medium text-gray-900">
                      {section.title}
                    </h4>
                    
                    {section.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {section.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setEditingSection(section.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Section"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => onDelete(section.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Section"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

interface SectionEditFormProps {
  section: Section;
  onSave: (updates: { title: string; description: string }) => void;
  onCancel: () => void;
}

function SectionEditForm({ section, onSave, onCancel }: SectionEditFormProps) {
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave({ title: title.trim(), description: description.trim() });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Section Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          placeholder="Enter section title"
          required
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="textarea"
          rows={3}
          placeholder="Section description or instructions"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
        >
          Save Section
        </button>
      </div>
    </form>
  );
}