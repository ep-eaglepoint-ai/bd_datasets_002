'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSurveyStore } from '@/store/surveyStore';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

export default function NewSurveyPage() {
  const router = useRouter();
  const { createSurvey, isLoading, error, clearError } = useSurveyStore();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    description?: string;
  }>({});

  const validateForm = () => {
    const errors: typeof formErrors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Survey title is required';
    } else if (formData.title.trim().length < 3) {
      errors.title = 'Survey title must be at least 3 characters';
    }
    
    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const survey = await createSurvey(
        formData.title.trim(),
        formData.description.trim() || undefined
      );
      
      // Redirect to the survey editor
      router.push(`/surveys/${survey.id}/edit`);
    } catch (error) {
      console.error('Failed to create survey:', error);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear global error
    if (error) {
      clearError();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Surveys
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create New Survey
          </h1>
          <p className="text-gray-600">
            Start building your survey by giving it a title and description.
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onDismiss={clearError} />
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Survey Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={formErrors.title ? 'input-error' : 'input'}
                placeholder="Enter your survey title..."
                maxLength={200}
                disabled={isLoading}
              />
              {formErrors.title && (
                <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.title.length}/200 characters
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={formErrors.description ? 'input-error' : 'textarea'}
                placeholder="Describe what this survey is about..."
                rows={4}
                maxLength={500}
                disabled={isLoading}
              />
              {formErrors.description && (
                <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.description.length}/500 characters
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Link href="/" className="btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isLoading || !formData.title.trim()}
                className="btn-primary"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner />
                    <span className="ml-2">Creating...</span>
                  </>
                ) : (
                  'Create Survey'
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            What happens next?
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• You'll be taken to the survey editor</li>
            <li>• Add questions and organize them into sections</li>
            <li>• Preview your survey before publishing</li>
            <li>• Collect responses and analyze results</li>
          </ul>
        </div>
      </main>
    </div>
  );
}