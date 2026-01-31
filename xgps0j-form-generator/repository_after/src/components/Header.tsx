'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSurveyStore } from '@/store/surveyStore';
import { PlusIcon, BarChart3Icon, SettingsIcon, MenuIcon, XIcon } from 'lucide-react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const { createSurvey } = useSurveyStore();

  const handleCreateSurvey = async () => {
    try {
      const survey = await createSurvey('New Survey', 'Survey description');
      router.push(`/surveys/${survey.id}/edit`);
    } catch (error) {
      console.error('Failed to create survey:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <BarChart3Icon className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                Survey Builder
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
              >
                Surveys
              </Link>
              <Link
                href="/analytics"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
              >
                Analytics
              </Link>
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCreateSurvey}
              className="btn-primary hidden sm:inline-flex"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Survey
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              {isMenuOpen ? (
                <XIcon className="h-5 w-5" />
              ) : (
                <MenuIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-2">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Surveys
              </Link>
              <Link
                href="/analytics"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Analytics
              </Link>
              <button
                onClick={() => {
                  handleCreateSurvey();
                  setIsMenuOpen(false);
                }}
                className="btn-primary w-full mt-4"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Survey
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}