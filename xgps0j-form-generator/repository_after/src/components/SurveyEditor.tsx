'use client';

import { useState } from 'react';
import { Survey, Question, Section } from '@/types/survey';
import { useSurveyStore } from '@/store/surveyStore';
import SurveySettings from './SurveySettings';
import QuestionEditor from './QuestionEditor';
import SectionEditor from './SectionEditor';
import QuestionList from './QuestionList';
import { PlusIcon, SettingsIcon, EyeIcon } from 'lucide-react';

interface SurveyEditorProps {
  survey: Survey;
  onChange: () => void;
}

export default function SurveyEditor({ survey, onChange }: SurveyEditorProps) {
  const [activeTab, setActiveTab] = useState<'questions' | 'sections' | 'settings'>('questions');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { 
    addQuestion, 
    updateQuestion, 
    deleteQuestion, 
    reorderQuestions,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    setPreviewMode,
    currentSurvey,
    setCurrentSurvey
  } = useSurveyStore();

  const handleAddQuestion = (type: Question['type']) => {
    const newQuestion = {
      type,
      title: 'New Question',
      description: '',
      required: false,
      sectionId: undefined,
    };
    
    addQuestion(newQuestion);
    onChange();
  };

  const handleUpdateQuestion = (id: string, updates: Partial<Question>) => {
    updateQuestion(id, updates);
    onChange();
  };

  const handleDeleteQuestion = (id: string) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      deleteQuestion(id);
      onChange();
    }
  };

  const handleReorderQuestions = (questionIds: string[]) => {
    reorderQuestions(questionIds);
    onChange();
  };

  const handleAddSection = () => {
    const newSection = {
      title: 'New Section',
      description: '',
    };
    
    addSection(newSection);
    onChange();
  };

  const handleUpdateSection = (id: string, updates: Partial<Section>) => {
    updateSection(id, updates);
    onChange();
  };

  const handleDeleteSection = (id: string) => {
    if (window.confirm('Are you sure you want to delete this section?')) {
      deleteSection(id);
      onChange();
    }
  };

  const handleReorderSections = (sectionIds: string[]) => {
    reorderSections(sectionIds);
    onChange();
  };

  const handlePreview = () => {
    setPreviewMode(true);
    window.open(`/surveys/${survey.id}/preview`, '_blank');
  };

  const handleSurveyUpdate = (field: string, value: any) => {
    if (!currentSurvey) return;
    
    const updatedSurvey = {
      ...currentSurvey,
      [field]: value,
      updatedAt: new Date(),
    };
    
    setCurrentSurvey(updatedSurvey);
    onChange();
  };

  return (
    <div className="space-y-6">
      {/* Survey Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <input
              type="text"
              value={survey.title}
              onChange={(e) => handleSurveyUpdate('title', e.target.value)}
              className="text-2xl font-bold bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-full"
              placeholder="Survey Title"
            />
            <textarea
              value={survey.description || ''}
              onChange={(e) => handleSurveyUpdate('description', e.target.value)}
              className="mt-2 text-gray-600 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-full resize-none"
              placeholder="Survey description (optional)"
              rows={2}
            />
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handlePreview}
              className="btn-ghost"
              title="Preview Survey"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn-ghost"
              title="Survey Settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showSettings && (
          <SurveySettings 
            survey={survey} 
            onChange={onChange}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('questions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'questions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Questions ({survey.questions.length})
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sections'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sections ({survey.sections.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Add Question Buttons */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Add Question
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => handleAddQuestion('short_text')}
                className="btn-secondary text-left"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Short Text
              </button>
              <button
                onClick={() => handleAddQuestion('long_text')}
                className="btn-secondary text-left"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Long Text
              </button>
              <button
                onClick={() => handleAddQuestion('single_choice')}
                className="btn-secondary text-left"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Single Choice
              </button>
              <button
                onClick={() => handleAddQuestion('multiple_choice')}
                className="btn-secondary text-left"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Multiple Choice
              </button>
              <button
                onClick={() => handleAddQuestion('rating_scale')}
                className="btn-secondary text-left"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Rating Scale
              </button>
              <button
                onClick={() => handleAddQuestion('numeric_input')}
                className="btn-secondary text-left"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Number
              </button>
              <button
                onClick={() => handleAddQuestion('boolean')}
                className="btn-secondary text-left"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Yes/No
              </button>
            </div>
          </div>

          {/* Questions List */}
          <QuestionList
            questions={survey.questions}
            sections={survey.sections}
            onEdit={setEditingQuestion}
            onDelete={handleDeleteQuestion}
            onReorder={handleReorderQuestions}
          />

          {/* Question Editor Modal */}
          {editingQuestion && (
            <QuestionEditor
              question={editingQuestion}
              sections={survey.sections}
              onSave={(updates) => {
                handleUpdateQuestion(editingQuestion.id, updates);
                setEditingQuestion(null);
              }}
              onCancel={() => setEditingQuestion(null)}
            />
          )}
        </div>
      )}

      {activeTab === 'sections' && (
        <div className="space-y-6">
          {/* Add Section Button */}
          <div className="card">
            <button
              onClick={handleAddSection}
              className="btn-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Section
            </button>
          </div>

          {/* Sections List */}
          <SectionEditor
            sections={survey.sections}
            onUpdate={handleUpdateSection}
            onDelete={handleDeleteSection}
            onReorder={handleReorderSections}
          />
        </div>
      )}
    </div>
  );
}