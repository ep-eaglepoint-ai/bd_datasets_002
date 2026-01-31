'use client';

import { useState } from 'react';
import { Question, Section } from '@/types/survey';
import { 
  EditIcon, 
  TrashIcon, 
  GripVerticalIcon, 
  TypeIcon
} from 'lucide-react';

interface QuestionListProps {
  questions: Question[];
  sections: Section[];
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
  onReorder: (questionIds: string[]) => void;
}

export default function QuestionList({ 
  questions, 
  sections, 
  onEdit, 
  onDelete, 
  onReorder 
}: QuestionListProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const getSectionName = (sectionId?: string) => {
    if (!sectionId) return 'No Section';
    const section = sections.find(s => s.id === sectionId);
    return section?.title || 'Unknown Section';
  };

  const getQuestionTypeLabel = (type: Question['type']) => {
    const labels = {
      short_text: 'Short Text',
      long_text: 'Long Text',
      single_choice: 'Single Choice',
      multiple_choice: 'Multiple Choice',
      rating_scale: 'Rating Scale',
      numeric_input: 'Number',
      boolean: 'Yes/No',
    };
    return labels[type];
  };

  const handleDragStart = (e: React.DragEvent, questionId: string) => {
    setDraggedItem(questionId);
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

    const currentOrder = questions.map(q => q.id);
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

  if (questions.length === 0) {
    return (
      <div className="card text-center py-12">
        <TypeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No questions</h3>
        <p className="mt-1 text-sm text-gray-500">
          Add your first question to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Questions ({questions.length})
      </h3>
      
      <div className="space-y-3">
        {questions
          .sort((a, b) => a.order - b.order)
          .map((question, index) => (
            <div
              key={question.id}
              draggable
              onDragStart={(e) => handleDragStart(e, question.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, question.id)}
              onDragEnd={handleDragEnd}
              className={`card hover:shadow-md transition-all cursor-move ${
                draggedItem === question.id ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start space-x-4">
                {/* Drag Handle */}
                <div className="drag-handle pt-1">
                  <GripVerticalIcon className="h-5 w-5 text-gray-400" />
                </div>

                {/* Question Number */}
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>

                {/* Question Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-base font-medium text-gray-900 truncate">
                        {question.title}
                        {question.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </h4>
                      
                      {question.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {question.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className="badge badge-gray">
                          {getQuestionTypeLabel(question.type)}
                        </span>
                        
                        <span>
                          Section: {getSectionName(question.sectionId)}
                        </span>
                        
                        {question.required && (
                          <span className="badge badge-error">
                            Required
                          </span>
                        )}
                      </div>

                      {/* Question-specific details */}
                      {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                        <div className="mt-2 text-xs text-gray-500">
                          {question.options.length} options
                        </div>
                      )}
                      
                      {question.type === 'rating_scale' && (
                        <div className="mt-2 text-xs text-gray-500">
                          Scale: {question.minValue} - {question.maxValue}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => onEdit(question)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Question"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => onDelete(question.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Question"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}