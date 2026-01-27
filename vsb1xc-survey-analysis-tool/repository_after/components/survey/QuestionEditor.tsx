'use client';

import React, { useState } from 'react';
import { Question, QuestionType } from '@/lib/schemas/survey';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface QuestionEditorProps {
  question: Question;
  onChange: (question: Question) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const updateQuestion = (updates: Partial<Question>) => {
    onChange({ ...question, ...updates });
  };

  return (
    <Card className="mb-4">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <Input
            label="Question Title"
            value={question.title}
            onChange={(e) => updateQuestion({ title: e.target.value })}
            placeholder="Enter question title"
          />
        </div>
        <div className="ml-4 flex gap-2">
          {onMoveUp && (
            <Button variant="outline" size="sm" onClick={onMoveUp}>
              ↑
            </Button>
          )}
          {onMoveDown && (
            <Button variant="outline" size="sm" onClick={onMoveDown}>
              ↓
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>

      <Textarea
        label="Description (optional)"
        value={question.description || ''}
        onChange={(e) => updateQuestion({ description: e.target.value })}
        placeholder="Enter question description"
        rows={2}
      />

      <div className="mt-4 flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => updateQuestion({ required: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Required</span>
        </label>
      </div>

      {/* Type-specific configuration */}
      {question.type === 'multiple-choice' && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Options
          </label>
          {question.options.map((option, index) => (
            <div key={option.id} className="flex gap-2 mb-2">
              <Input
                value={option.label}
                onChange={(e) => {
                  const newOptions = [...question.options];
                  newOptions[index] = { ...option, label: e.target.value };
                  updateQuestion({ options: newOptions });
                }}
                placeholder="Option label"
              />
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  const newOptions = question.options.filter((_, i) => i !== index);
                  updateQuestion({ options: newOptions });
                }}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newOption = {
                id: `opt-${Date.now()}`,
                label: '',
                value: `option-${question.options.length + 1}`,
              };
              updateQuestion({ options: [...question.options, newOption] });
            }}
          >
            Add Option
          </Button>
          <div className="mt-2 flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={question.allowMultiple}
                onChange={(e) => updateQuestion({ allowMultiple: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Allow multiple selections</span>
            </label>
          </div>
        </div>
      )}

      {question.type === 'rating-scale' && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Input
            label="Minimum"
            type="number"
            value={question.scale.min}
            onChange={(e) =>
              updateQuestion({
                scale: { ...question.scale, min: parseInt(e.target.value, 10) },
              })
            }
          />
          <Input
            label="Maximum"
            type="number"
            value={question.scale.max}
            onChange={(e) =>
              updateQuestion({
                scale: { ...question.scale, max: parseInt(e.target.value, 10) },
              })
            }
          />
        </div>
      )}

      {question.type === 'numeric' && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Input
            label="Minimum (optional)"
            type="number"
            value={question.min?.toString() || ''}
            onChange={(e) =>
              updateQuestion({ min: e.target.value ? parseFloat(e.target.value) : undefined })
            }
          />
          <Input
            label="Maximum (optional)"
            type="number"
            value={question.max?.toString() || ''}
            onChange={(e) =>
              updateQuestion({ max: e.target.value ? parseFloat(e.target.value) : undefined })
            }
          />
        </div>
      )}

      {question.type === 'text' && (
        <div className="mt-4">
          <Input
            label="Max Length (optional)"
            type="number"
            value={question.maxLength?.toString() || ''}
            onChange={(e) =>
              updateQuestion({
                maxLength: e.target.value ? parseInt(e.target.value, 10) : undefined,
              })
            }
          />
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={question.multiline}
              onChange={(e) => updateQuestion({ multiline: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Allow multiline</span>
          </label>
        </div>
      )}

      {question.type === 'ranking' && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ranking Options
          </label>
          {question.ranking.options.map((option, index) => (
            <div key={option.id} className="flex gap-2 mb-2">
              <Input
                value={option.label}
                onChange={(e) => {
                  const newOptions = [...question.ranking.options];
                  newOptions[index] = { ...option, label: e.target.value };
                  updateQuestion({ ranking: { ...question.ranking, options: newOptions } });
                }}
                placeholder="Option label"
              />
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  const newOptions = question.ranking.options.filter((_, i) => i !== index);
                  updateQuestion({ ranking: { ...question.ranking, options: newOptions } });
                }}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newOption = {
                id: `opt-${Date.now()}`,
                label: '',
              };
              updateQuestion({
                ranking: {
                  ...question.ranking,
                  options: [...question.ranking.options, newOption],
                },
              });
            }}
          >
            Add Option
          </Button>
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={question.ranking.allowTies}
              onChange={(e) =>
                updateQuestion({
                  ranking: { ...question.ranking, allowTies: e.target.checked },
                })
              }
              className="rounded"
            />
            <span className="text-sm text-gray-700">Allow ties (same rank)</span>
          </label>
        </div>
      )}

      {question.type === 'matrix' && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Matrix Rows
            </label>
            {question.matrix.rows.map((row, index) => (
              <div key={row.id} className="flex gap-2 mb-2">
                <Input
                  value={row.label}
                  onChange={(e) => {
                    const newRows = [...question.matrix.rows];
                    newRows[index] = { ...row, label: e.target.value };
                    updateQuestion({ matrix: { ...question.matrix, rows: newRows } });
                  }}
                  placeholder="Row label"
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    const newRows = question.matrix.rows.filter((_, i) => i !== index);
                    updateQuestion({ matrix: { ...question.matrix, rows: newRows } });
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newRow = {
                  id: `row-${Date.now()}`,
                  label: '',
                };
                updateQuestion({
                  matrix: {
                    ...question.matrix,
                    rows: [...question.matrix.rows, newRow],
                  },
                });
              }}
            >
              Add Row
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Matrix Columns
            </label>
            {question.matrix.columns.map((column, index) => (
              <div key={column.id} className="flex gap-2 mb-2">
                <Input
                  value={column.label}
                  onChange={(e) => {
                    const newColumns = [...question.matrix.columns];
                    newColumns[index] = { ...column, label: e.target.value };
                    updateQuestion({ matrix: { ...question.matrix, columns: newColumns } });
                  }}
                  placeholder="Column label"
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    const newColumns = question.matrix.columns.filter((_, i) => i !== index);
                    updateQuestion({ matrix: { ...question.matrix, columns: newColumns } });
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newColumn = {
                  id: `col-${Date.now()}`,
                  label: '',
                };
                updateQuestion({
                  matrix: {
                    ...question.matrix,
                    columns: [...question.matrix.columns, newColumn],
                  },
                });
              }}
            >
              Add Column
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selection Type
            </label>
            <Select
              options={[
                { value: 'single', label: 'Single selection per row' },
                { value: 'multiple', label: 'Multiple selections per row' },
              ]}
              value={question.matrix.type}
              onChange={(e) =>
                updateQuestion({
                  matrix: { ...question.matrix, type: e.target.value as 'single' | 'multiple' },
                })
              }
            />
          </div>
        </div>
      )}
    </Card>
  );
};
