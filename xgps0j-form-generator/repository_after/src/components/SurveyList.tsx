'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Survey } from '@/types/survey';
import { useSurveyStore } from '@/store/surveyStore';
import { formatDate } from '@/utils/helpers';
import { 
  EditIcon, 
  BarChart3Icon, 
  PlayIcon, 
  TrashIcon, 
  MoreVerticalIcon,
  PlusIcon,
  EyeIcon,
  CopyIcon
} from 'lucide-react';

interface SurveyListProps {
  surveys: Survey[];
}

export default function SurveyList({ surveys }: SurveyListProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { deleteSurvey, publishSurvey, unpublishSurvey, createSurvey } = useSurveyStore();

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this survey? This action cannot be undone.')) {
      await deleteSurvey(id);
    }
  };

  const handleTogglePublish = async (survey: Survey) => {
    if (survey.published) {
      await unpublishSurvey(survey.id);
    } else {
      await publishSurvey(survey.id);
    }
    setActiveDropdown(null);
  };

  const handleDuplicate = async (survey: Survey) => {
    try {
      await createSurvey(`${survey.title} (Copy)`, survey.description);
      setActiveDropdown(null);
    } catch (error) {
      console.error('Failed to duplicate survey:', error);
    }
  };

  if (surveys.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3Icon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No surveys</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first survey.
        </p>
        <div className="mt-6">
          <Link href="/surveys/new" className="btn-primary">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Survey
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">
          Your Surveys ({surveys.length})
        </h2>
        <Link href="/surveys/new" className="btn-primary">
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Survey
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {surveys.map((survey) => (
          <div key={survey.id} className="card hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {survey.title}
                </h3>
                {survey.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {survey.description}
                  </p>
                )}
              </div>
              
              <div className="relative ml-4">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === survey.id ? null : survey.id)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <MoreVerticalIcon className="h-4 w-4" />
                </button>
                
                {activeDropdown === survey.id && (
                  <div className="dropdown">
                    <button
                      onClick={() => handleTogglePublish(survey)}
                      className="dropdown-item"
                    >
                      {survey.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => handleDuplicate(survey)}
                      className="dropdown-item"
                    >
                      <CopyIcon className="h-4 w-4 mr-2" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleDelete(survey.id)}
                      className="dropdown-item text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>Created {formatDate(survey.createdAt)}</span>
              <div className="flex items-center space-x-2">
                <span className={`badge ${survey.published ? 'badge-success' : 'badge-gray'}`}>
                  {survey.published ? 'Published' : 'Draft'}
                </span>
                <span className="badge badge-primary">
                  v{survey.version}
                </span>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              <div className="flex justify-between">
                <span>Questions: {survey.questions.length}</span>
                <span>Sections: {survey.sections.length}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <Link
                href={`/surveys/${survey.id}/edit`}
                className="btn-secondary flex-1 text-center"
              >
                <EditIcon className="h-4 w-4 mr-2" />
                Edit
              </Link>
              
              {survey.published && (
                <Link
                  href={`/surveys/${survey.id}/respond`}
                  className="btn-ghost"
                  title="Take Survey"
                >
                  <PlayIcon className="h-4 w-4" />
                </Link>
              )}
              
              <Link
                href={`/surveys/${survey.id}/preview`}
                className="btn-ghost"
                title="Preview"
              >
                <EyeIcon className="h-4 w-4" />
              </Link>
              
              <Link
                href={`/surveys/${survey.id}/analytics`}
                className="btn-ghost"
                title="Analytics"
              >
                <BarChart3Icon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}