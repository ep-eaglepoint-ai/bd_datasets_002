import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Survey, Question, Section, Response, SurveyAnalytics } from '@/types/survey';
import { databaseService } from '@/services/database';
import { generateId } from '@/utils/helpers';
import { toast } from '@/store/toastStore';

interface SurveyState {
  // Current survey being edited
  currentSurvey: Survey | null;
  
  // All surveys
  surveys: Survey[];
  
  // Current responses (for analytics)
  currentResponses: Response[];
  
  // Current analytics
  currentAnalytics: SurveyAnalytics | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  previewMode: boolean;
  
  // Actions
  loadSurveys: () => Promise<void>;
  createSurvey: (title: string, description?: string) => Promise<Survey>;
  loadSurvey: (id: string) => Promise<void>;
  saveSurvey: (survey: Survey) => Promise<void>;
  deleteSurvey: (id: string) => Promise<void>;
  publishSurvey: (id: string) => Promise<void>;
  unpublishSurvey: (id: string) => Promise<void>;
  
  // Question management
  addQuestion: (question: Omit<Question, 'id' | 'order'>) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  reorderQuestions: (questionIds: string[]) => void;
  
  // Section management
  addSection: (section: Omit<Section, 'id' | 'order'>) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  deleteSection: (id: string) => void;
  reorderSections: (sectionIds: string[]) => void;
  
  // Response management
  loadResponses: (surveyId: string) => Promise<void>;
  saveResponse: (response: Response) => Promise<void>;
  deleteResponse: (id: string) => Promise<void>;
  
  // Analytics
  loadAnalytics: (surveyId: string) => Promise<void>;
  refreshAnalytics: (surveyId: string) => Promise<void>;
  
  // UI actions
  setPreviewMode: (enabled: boolean) => void;
  clearError: () => void;
  setCurrentSurvey: (survey: Survey | null) => void;
}

export const useSurveyStore = create<SurveyState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentSurvey: null,
        surveys: [],
        currentResponses: [],
        currentAnalytics: null,
        isLoading: false,
        error: null,
        previewMode: false,

        // Survey management
        loadSurveys: async () => {
          set({ isLoading: true, error: null });
          try {
            await databaseService.init();
            const surveys = await databaseService.getAllSurveys();
            set({ surveys, isLoading: false });
          } catch (error) {
            const errorMessage = 'Failed to load surveys';
            set({ error: errorMessage, isLoading: false });
            toast.error('Load Error', errorMessage);
          }
        },

        createSurvey: async (title: string, description?: string) => {
          set({ isLoading: true, error: null });
          try {
            const now = new Date();
            const survey: Survey = {
              id: generateId(),
              title,
              description,
              createdAt: now,
              updatedAt: now,
              version: 1,
              published: false,
              sections: [],
              questions: [],
              settings: {
                allowAnonymous: true,
                requireCompletion: false,
                showProgressBar: true,
                randomizeQuestions: false,
                collectTimestamps: true,
              },
            };

            await databaseService.saveSurvey(survey);
            
            const surveys = [...get().surveys, survey];
            set({ surveys, currentSurvey: survey, isLoading: false });
            
            toast.success('Survey Created', `"${title}" has been created successfully`);
            return survey;
          } catch (error) {
            const errorMessage = 'Failed to create survey';
            set({ error: errorMessage, isLoading: false });
            toast.error('Creation Error', errorMessage);
            throw error;
          }
        },

        loadSurvey: async (id: string) => {
          set({ isLoading: true, error: null });
          try {
            const survey = await databaseService.getSurvey(id);
            if (!survey) {
              throw new Error('Survey not found');
            }
            set({ currentSurvey: survey, isLoading: false });
          } catch (error) {
            const errorMessage = 'Failed to load survey';
            set({ error: errorMessage, isLoading: false });
            toast.error('Load Error', errorMessage);
          }
        },

        saveSurvey: async (survey: Survey) => {
          set({ isLoading: true, error: null });
          try {
            const updatedSurvey = {
              ...survey,
              updatedAt: new Date(),
            };

            await databaseService.saveSurvey(updatedSurvey);
            
            const surveys = get().surveys.map(s => 
              s.id === survey.id ? updatedSurvey : s
            );
            
            set({ 
              surveys, 
              currentSurvey: updatedSurvey, 
              isLoading: false 
            });
            
            toast.success('Survey Saved', 'Your changes have been saved successfully');
          } catch (error) {
            const errorMessage = 'Failed to save survey';
            set({ error: errorMessage, isLoading: false });
            toast.error('Save Error', errorMessage);
          }
        },

        deleteSurvey: async (id: string) => {
          set({ isLoading: true, error: null });
          try {
            await databaseService.deleteSurvey(id);
            
            const surveys = get().surveys.filter(s => s.id !== id);
            const currentSurvey = get().currentSurvey?.id === id ? null : get().currentSurvey;
            
            set({ surveys, currentSurvey, isLoading: false });
            toast.success('Survey Deleted', 'The survey has been permanently deleted');
          } catch (error) {
            const errorMessage = 'Failed to delete survey';
            set({ error: errorMessage, isLoading: false });
            toast.error('Delete Error', errorMessage);
          }
        },

        publishSurvey: async (id: string) => {
          const survey = get().surveys.find(s => s.id === id);
          if (!survey) return;

          const publishedSurvey = {
            ...survey,
            published: true,
            publishedAt: new Date(),
            updatedAt: new Date(),
          };

          await get().saveSurvey(publishedSurvey);
          toast.success('Survey Published', `"${survey.title}" is now live and accepting responses`);
        },

        unpublishSurvey: async (id: string) => {
          const survey = get().surveys.find(s => s.id === id);
          if (!survey) return;

          const unpublishedSurvey = {
            ...survey,
            published: false,
            publishedAt: undefined,
            updatedAt: new Date(),
          };

          await get().saveSurvey(unpublishedSurvey);
          toast.info('Survey Unpublished', `"${survey.title}" is no longer accepting responses`);
        },

        // Question management
        addQuestion: (question: Omit<Question, 'id' | 'order'>) => {
          const currentSurvey = get().currentSurvey;
          if (!currentSurvey) return;

          let newQuestion: Question;
          const baseQuestion = {
            id: generateId(),
            order: currentSurvey.questions.length,
            title: question.title,
            description: question.description,
            required: question.required,
            sectionId: question.sectionId,
          };

          // Create question with proper defaults based on type
          switch (question.type) {
            case 'short_text':
              newQuestion = {
                ...baseQuestion,
                type: 'short_text',
                maxLength: (question as any).maxLength,
                placeholder: (question as any).placeholder,
              };
              break;
            case 'long_text':
              newQuestion = {
                ...baseQuestion,
                type: 'long_text',
                maxLength: (question as any).maxLength,
                placeholder: (question as any).placeholder,
              };
              break;
            case 'single_choice':
              newQuestion = {
                ...baseQuestion,
                type: 'single_choice',
                options: (question as any).options || [
                  { id: generateId(), label: 'Option 1', value: 'option_1' },
                  { id: generateId(), label: 'Option 2', value: 'option_2' },
                ],
              };
              break;
            case 'multiple_choice':
              newQuestion = {
                ...baseQuestion,
                type: 'multiple_choice',
                options: (question as any).options || [
                  { id: generateId(), label: 'Option 1', value: 'option_1' },
                  { id: generateId(), label: 'Option 2', value: 'option_2' },
                ],
                minSelections: (question as any).minSelections,
                maxSelections: (question as any).maxSelections,
              };
              break;
            case 'rating_scale':
              newQuestion = {
                ...baseQuestion,
                type: 'rating_scale',
                minValue: (question as any).minValue || 1,
                maxValue: (question as any).maxValue || 5,
                minLabel: (question as any).minLabel,
                maxLabel: (question as any).maxLabel,
              };
              break;
            case 'numeric_input':
              newQuestion = {
                ...baseQuestion,
                type: 'numeric_input',
                minValue: (question as any).minValue,
                maxValue: (question as any).maxValue,
                allowDecimals: (question as any).allowDecimals || false,
                placeholder: (question as any).placeholder,
              };
              break;
            case 'boolean':
              newQuestion = {
                ...baseQuestion,
                type: 'boolean',
                trueLabel: (question as any).trueLabel || 'Yes',
                falseLabel: (question as any).falseLabel || 'No',
              };
              break;
            default:
              throw new Error(`Unknown question type: ${(question as any).type}`);
          }

          const updatedSurvey = {
            ...currentSurvey,
            questions: [...currentSurvey.questions, newQuestion],
            updatedAt: new Date(),
          };

          set({ currentSurvey: updatedSurvey });
          toast.success('Question Added', 'New question has been added to your survey');
        },

        updateQuestion: (id: string, updates: Partial<Question>) => {
          const currentSurvey = get().currentSurvey;
          if (!currentSurvey) return;

          const updatedQuestions = currentSurvey.questions.map(q =>
            q.id === id ? { ...q, ...updates } : q
          );

          const updatedSurvey = {
            ...currentSurvey,
            questions: updatedQuestions,
            updatedAt: new Date(),
          } as Survey;

          set({ currentSurvey: updatedSurvey });
          toast.success('Question Updated', 'Question has been updated successfully');
        },

        deleteQuestion: (id: string) => {
          const currentSurvey = get().currentSurvey;
          if (!currentSurvey) return;

          const filteredQuestions = currentSurvey.questions
            .filter(q => q.id !== id)
            .map((q, index) => ({ ...q, order: index }));

          const updatedSurvey = {
            ...currentSurvey,
            questions: filteredQuestions,
            updatedAt: new Date(),
          };

          set({ currentSurvey: updatedSurvey });
          toast.success('Question Deleted', 'Question has been removed from your survey');
        },

        reorderQuestions: (questionIds: string[]) => {
          const currentSurvey = get().currentSurvey;
          if (!currentSurvey) return;

          const questionMap = new Map(currentSurvey.questions.map(q => [q.id, q]));
          const reorderedQuestions = questionIds
            .map(id => questionMap.get(id))
            .filter(Boolean)
            .map((q, index) => ({ ...q!, order: index }));

          const updatedSurvey = {
            ...currentSurvey,
            questions: reorderedQuestions,
            updatedAt: new Date(),
          };

          set({ currentSurvey: updatedSurvey });
          toast.info('Questions Reordered', 'Question order has been updated');
        },

        // Section management
        addSection: (section: Omit<Section, 'id' | 'order'>) => {
          const currentSurvey = get().currentSurvey;
          if (!currentSurvey) return;

          const newSection: Section = {
            ...section,
            id: generateId(),
            order: currentSurvey.sections.length,
          };

          const updatedSurvey = {
            ...currentSurvey,
            sections: [...currentSurvey.sections, newSection],
            updatedAt: new Date(),
          };

          set({ currentSurvey: updatedSurvey });
          toast.success('Section Added', 'New section has been added to your survey');
        },

        updateSection: (id: string, updates: Partial<Section>) => {
          const currentSurvey = get().currentSurvey;
          if (!currentSurvey) return;

          const updatedSections = currentSurvey.sections.map(s =>
            s.id === id ? { ...s, ...updates } : s
          );

          const updatedSurvey = {
            ...currentSurvey,
            sections: updatedSections,
            updatedAt: new Date(),
          };

          set({ currentSurvey: updatedSurvey });
          toast.success('Section Updated', 'Section has been updated successfully');
        },

        deleteSection: (id: string) => {
          const currentSurvey = get().currentSurvey;
          if (!currentSurvey) return;

          const filteredSections = currentSurvey.sections
            .filter(s => s.id !== id)
            .map((s, index) => ({ ...s, order: index }));

          // Remove section reference from questions
          const updatedQuestions = currentSurvey.questions.map(q =>
            q.sectionId === id ? { ...q, sectionId: undefined } : q
          );

          const updatedSurvey = {
            ...currentSurvey,
            sections: filteredSections,
            questions: updatedQuestions,
            updatedAt: new Date(),
          };

          set({ currentSurvey: updatedSurvey });
          toast.success('Section Deleted', 'Section has been removed from your survey');
        },

        reorderSections: (sectionIds: string[]) => {
          const currentSurvey = get().currentSurvey;
          if (!currentSurvey) return;

          const sectionMap = new Map(currentSurvey.sections.map(s => [s.id, s]));
          const reorderedSections = sectionIds
            .map(id => sectionMap.get(id))
            .filter(Boolean)
            .map((s, index) => ({ ...s!, order: index }));

          const updatedSurvey = {
            ...currentSurvey,
            sections: reorderedSections,
            updatedAt: new Date(),
          };

          set({ currentSurvey: updatedSurvey });
          toast.info('Sections Reordered', 'Section order has been updated');
        },

        // Response management
        loadResponses: async (surveyId: string) => {
          set({ isLoading: true, error: null });
          try {
            const responses = await databaseService.getResponsesBySurvey(surveyId);
            set({ currentResponses: responses, isLoading: false });
          } catch (error) {
            const errorMessage = 'Failed to load responses';
            set({ error: errorMessage, isLoading: false });
            toast.error('Load Error', errorMessage);
          }
        },

        saveResponse: async (response: Response) => {
          try {
            await databaseService.saveResponse(response);
            
            // Update current responses if they're for the same survey
            const currentResponses = get().currentResponses;
            if (currentResponses.length > 0 && currentResponses[0]?.surveyId === response.surveyId) {
              const updatedResponses = currentResponses.some(r => r.id === response.id)
                ? currentResponses.map(r => r.id === response.id ? response : r)
                : [...currentResponses, response];
              
              set({ currentResponses: updatedResponses });
            }
            
            if (response.isComplete) {
              toast.success('Response Submitted', 'Thank you for completing the survey!');
            }
            //  else {
            //   toast.info('Progress Saved', 'Your progress has been saved');
            // }
          } catch (error) {
            const errorMessage = 'Failed to save response';
            set({ error: errorMessage });
            toast.error('Save Error', errorMessage);
          }
        },

        deleteResponse: async (id: string) => {
          try {
            await databaseService.deleteResponse(id);
            
            const currentResponses = get().currentResponses.filter(r => r.id !== id);
            set({ currentResponses });
            toast.success('Response Deleted', 'Response has been permanently removed');
          } catch (error) {
            const errorMessage = 'Failed to delete response';
            set({ error: errorMessage });
            toast.error('Delete Error', errorMessage);
          }
        },

        // Analytics
        loadAnalytics: async (surveyId: string) => {
          set({ isLoading: true, error: null });
          try {
            const analytics = await databaseService.getAnalytics(surveyId);
            set({ currentAnalytics: analytics || null, isLoading: false });
          } catch (error) {
            const errorMessage = 'Failed to load analytics';
            set({ error: errorMessage, isLoading: false });
            toast.error('Analytics Error', errorMessage);
          }
        },

        refreshAnalytics: async (surveyId: string) => {
          // This will be implemented in the analytics service
          await get().loadAnalytics(surveyId);
        },

        // UI actions
        setPreviewMode: (enabled: boolean) => {
          set({ previewMode: enabled });
        },

        clearError: () => {
          set({ error: null });
        },

        setCurrentSurvey: (survey: Survey | null) => {
          set({ currentSurvey: survey });
        },
      }),
      {
        name: 'survey-store',
        partialize: (state) => ({
          // Only persist UI preferences, not data
          previewMode: state.previewMode,
        }),
      }
    ),
    { name: 'survey-store' }
  )
);