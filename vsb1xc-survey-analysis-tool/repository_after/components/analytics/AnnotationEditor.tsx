'use client';

import React, { useState } from 'react';
import { Annotation } from '@/lib/schemas/analytics';
import { useSurveyStore } from '@/lib/store/surveyStore';
import { createSnapshotForAnnotation } from '@/lib/utils/snapshotManager';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';

interface AnnotationEditorProps {
  responseId: string;
  questionId: string;
  surveyId: string;
  responses: any[]; // SurveyResponse[]
  existingAnnotation?: Annotation;
  onClose: () => void;
}

export const AnnotationEditor: React.FC<AnnotationEditorProps> = ({
  responseId,
  questionId,
  surveyId,
  responses,
  existingAnnotation,
  onClose,
}) => {
  const { addAnnotation, updateAnnotation, annotations } = useSurveyStore();
  const [codes, setCodes] = useState<string[]>(
    existingAnnotation?.codes || []
  );
  const [themes, setThemes] = useState<string[]>(
    existingAnnotation?.themes || []
  );
  const [notes, setNotes] = useState(existingAnnotation?.notes || '');
  const [newCode, setNewCode] = useState('');
  const [newTheme, setNewTheme] = useState('');

  const handleSave = async () => {
    const annotation: Annotation = {
      id: existingAnnotation?.id || `annotation-${Date.now()}`,
      responseId,
      questionId,
      codes,
      themes,
      notes,
      createdAt: existingAnnotation?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingAnnotation) {
      await updateAnnotation(annotation);
    } else {
      await addAnnotation(annotation);
    }
    
    // Create snapshot for annotation update
    const annotationCount = annotations.filter(a => a.responseId === responseId).length + 1;
    await createSnapshotForAnnotation(surveyId, responses, annotationCount);
    
    onClose();
  };

  const addCode = () => {
    if (newCode.trim() && !codes.includes(newCode.trim())) {
      setCodes([...codes, newCode.trim()]);
      setNewCode('');
    }
  };

  const removeCode = (code: string) => {
    setCodes(codes.filter(c => c !== code));
  };

  const addTheme = () => {
    if (newTheme.trim() && !themes.includes(newTheme.trim())) {
      setThemes([...themes, newTheme.trim()]);
      setNewTheme('');
    }
  };

  const removeTheme = (theme: string) => {
    setThemes(themes.filter(t => t !== theme));
  };

  return (
    <Card title={existingAnnotation ? 'Edit Annotation' : 'Add Annotation'}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Codes
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCode())}
              placeholder="Enter code"
            />
            <Button onClick={addCode} variant="outline" size="sm">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {codes.map(code => (
              <span
                key={code}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
              >
                {code}
                <button
                  onClick={() => removeCode(code)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Themes
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newTheme}
              onChange={(e) => setNewTheme(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTheme())}
              placeholder="Enter theme"
            />
            <Button onClick={addTheme} variant="outline" size="sm">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {themes.map(theme => (
              <span
                key={theme}
                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm"
              >
                {theme}
                <button
                  onClick={() => removeTheme(theme)}
                  className="text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter notes about this response"
          rows={4}
        />

        <div className="flex gap-2">
          <Button onClick={handleSave} variant="primary">
            Save
          </Button>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
