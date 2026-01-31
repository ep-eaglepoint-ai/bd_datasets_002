'use client';

import { Survey } from '@/types/survey';
import { useSurveyStore } from '@/store/surveyStore';
import { XIcon } from 'lucide-react';

interface SurveySettingsProps {
  survey: Survey;
  onChange: () => void;
  onClose: () => void;
}

export default function SurveySettings({ survey, onChange, onClose }: SurveySettingsProps) {
  const { currentSurvey, setCurrentSurvey } = useSurveyStore();

  const updateSettings = (updates: Partial<Survey['settings']>) => {
    if (!currentSurvey) return;
    
    const updatedSurvey = {
      ...currentSurvey,
      settings: {
        ...currentSurvey.settings,
        ...updates,
      },
      updatedAt: new Date(),
    };
    
    setCurrentSurvey(updatedSurvey);
    onChange();
  };

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Survey Settings</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Response Collection</h4>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={survey.settings.allowAnonymous}
              onChange={(e) => updateSettings({ allowAnonymous: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Allow anonymous responses
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={survey.settings.requireCompletion}
              onChange={(e) => updateSettings({ requireCompletion: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Require completion before submission
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={survey.settings.collectTimestamps}
              onChange={(e) => updateSettings({ collectTimestamps: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Collect response timestamps
            </span>
          </label>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">User Experience</h4>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={survey.settings.showProgressBar}
              onChange={(e) => updateSettings({ showProgressBar: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Show progress bar
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={survey.settings.randomizeQuestions}
              onChange={(e) => updateSettings({ randomizeQuestions: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Randomize question order
            </span>
          </label>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Created:</span> {survey.createdAt.toLocaleDateString()}
          </div>
          <div>
            <span className="font-medium">Updated:</span> {survey.updatedAt.toLocaleDateString()}
          </div>
          <div>
            <span className="font-medium">Version:</span> {survey.version}
          </div>
          <div>
            <span className="font-medium">Status:</span> 
            <span className={`ml-1 ${survey.published ? 'text-green-600' : 'text-gray-500'}`}>
              {survey.published ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}