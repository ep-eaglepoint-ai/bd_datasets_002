'use client';

import { useState, useEffect } from 'react';
import { Question, Section } from '@/types/survey';
import { QuestionSchema } from '@/types/survey';
import { XIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { generateId } from '@/utils/helpers';

interface QuestionEditorProps {
  question: Question;
  sections: Section[];
  onSave: (updates: Partial<Question>) => void;
  onCancel: () => void;
}

export default function QuestionEditor({ question, sections, onSave, onCancel }: QuestionEditorProps) {
  const [formData, setFormData] = useState<Question>(question);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(question);
  }, [question]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate with Zod
      QuestionSchema.parse(formData);
      onSave(formData);
      setErrors({});
    } catch (error: any) {
      if (error.errors) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      }
    }
  };

  const updateFormData = (updates: Partial<Question>) => {
    setFormData(prev => ({ ...prev, ...updates } as Question));
  };

  const addOption = () => {
    if (formData.type === 'single_choice' || formData.type === 'multiple_choice') {
      const currentOptions = (formData as any).options || [];
      const newOption = {
        id: generateId(),
        label: `Option ${currentOptions.length + 1}`,
        value: `option_${currentOptions.length + 1}`,
      };
      
      updateFormData({
        options: [...currentOptions, newOption],
      });
    }
  };

  const updateOption = (index: number, updates: { label?: string; value?: string }) => {
    if (formData.type === 'single_choice' || formData.type === 'multiple_choice') {
      const currentOptions = (formData as any).options || [];
      const updatedOptions = currentOptions.map((option: any, i: number) =>
        i === index ? { ...option, ...updates } : option
      );
      updateFormData({ options: updatedOptions });
    }
  };

  const removeOption = (index: number) => {
    if (formData.type === 'single_choice' || formData.type === 'multiple_choice') {
      const currentOptions = (formData as any).options || [];
      const updatedOptions = currentOptions.filter((_: any, i: number) => i !== index);
      updateFormData({ options: updatedOptions });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <form onSubmit={handleSubmit} className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Question
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <XIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormData({ title: e.target.value })}
                  className={`input ${errors.title ? 'input-error' : ''}`}
                  placeholder="Enter your question"
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  className="textarea"
                  rows={3}
                  placeholder="Additional context or instructions"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section
                  </label>
                  <select
                    value={formData.sectionId || ''}
                    onChange={(e) => updateFormData({ sectionId: e.target.value || undefined })}
                    className="select"
                  >
                    <option value="">No Section</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>
                        {section.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.required}
                      onChange={(e) => updateFormData({ required: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Required</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Question Type Specific Settings */}
            {(formData.type === 'short_text' || formData.type === 'long_text') && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Text Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Length
                    </label>
                    <input
                      type="number"
                      value={(formData as any).maxLength || ''}
                      onChange={(e) => updateFormData({ 
                        maxLength: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      className="input"
                      min="1"
                      placeholder="No limit"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Placeholder
                    </label>
                    <input
                      type="text"
                      value={(formData as any).placeholder || ''}
                      onChange={(e) => updateFormData({ placeholder: e.target.value })}
                      className="input"
                      placeholder="Enter placeholder text"
                    />
                  </div>
                </div>
              </div>
            )}

            {(formData.type === 'single_choice' || formData.type === 'multiple_choice') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Options</h3>
                  <button
                    type="button"
                    onClick={addOption}
                    className="btn-secondary"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Option
                  </button>
                </div>

                <div className="space-y-3">
                  {((formData as any).options || []).map((option: any, index: number) => (
                    <div key={option.id} className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500 w-8">
                        {index + 1}.
                      </span>
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) => updateOption(index, { label: e.target.value })}
                        className="input flex-1"
                        placeholder="Option text"
                      />
                      <input
                        type="text"
                        value={option.value}
                        onChange={(e) => updateOption(index, { value: e.target.value })}
                        className="input w-32"
                        placeholder="Value"
                      />
                      {((formData as any).options || []).length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {formData.type === 'multiple_choice' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Selections
                      </label>
                      <input
                        type="number"
                        value={(formData as any).minSelections || ''}
                        onChange={(e) => updateFormData({ 
                          minSelections: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        className="input"
                        min="0"
                        max={((formData as any).options || []).length}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Selections
                      </label>
                      <input
                        type="number"
                        value={(formData as any).maxSelections || ''}
                        onChange={(e) => updateFormData({ 
                          maxSelections: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        className="input"
                        min="1"
                        max={((formData as any).options || []).length}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {formData.type === 'rating_scale' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Rating Scale Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Value
                    </label>
                    <input
                      type="number"
                      value={(formData as any).minValue || 1}
                      onChange={(e) => updateFormData({ minValue: parseInt(e.target.value) })}
                      className="input"
                      min="1"
                      max="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Value
                    </label>
                    <input
                      type="number"
                      value={(formData as any).maxValue || 5}
                      onChange={(e) => updateFormData({ maxValue: parseInt(e.target.value) })}
                      className="input"
                      min="2"
                      max="10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={(formData as any).minLabel || ''}
                      onChange={(e) => updateFormData({ minLabel: e.target.value })}
                      className="input"
                      placeholder="e.g., Poor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={(formData as any).maxLabel || ''}
                      onChange={(e) => updateFormData({ maxLabel: e.target.value })}
                      className="input"
                      placeholder="e.g., Excellent"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.type === 'numeric_input' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Number Settings</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Value
                    </label>
                    <input
                      type="number"
                      value={(formData as any).minValue || ''}
                      onChange={(e) => updateFormData({ 
                        minValue: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                      className="input"
                      step={(formData as any).allowDecimals ? "0.01" : "1"}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Value
                    </label>
                    <input
                      type="number"
                      value={(formData as any).maxValue || ''}
                      onChange={(e) => updateFormData({ 
                        maxValue: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                      className="input"
                      step={(formData as any).allowDecimals ? "0.01" : "1"}
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={(formData as any).allowDecimals || false}
                        onChange={(e) => updateFormData({ allowDecimals: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Allow Decimals</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    value={(formData as any).placeholder || ''}
                    onChange={(e) => updateFormData({ placeholder: e.target.value })}
                    className="input"
                    placeholder="Enter placeholder text"
                  />
                </div>
              </div>
            )}

            {formData.type === 'boolean' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Yes/No Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      True Label
                    </label>
                    <input
                      type="text"
                      value={(formData as any).trueLabel || 'Yes'}
                      onChange={(e) => updateFormData({ trueLabel: e.target.value })}
                      className="input"
                      placeholder="Yes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      False Label
                    </label>
                    <input
                      type="text"
                      value={(formData as any).falseLabel || 'No'}
                      onChange={(e) => updateFormData({ falseLabel: e.target.value })}
                      className="input"
                      placeholder="No"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
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
              Save Question
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}