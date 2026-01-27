import { create } from 'zustand';
import { Survey, SurveyResponse, DatasetSnapshot } from '@/lib/schemas/survey';
import { storage } from '@/lib/storage/indexeddb';
import { Annotation, ResearchInsight, Segment } from '@/lib/schemas/analytics';
import {
  validateSurvey,
  validateSurveyResponse,
  validateSurveyResponses,
  validateSnapshot,
} from '@/lib/utils/validation';
import { stateQueue } from './asyncQueue';

interface SurveyState {
  // Surveys
  surveys: Survey[];
  currentSurvey: Survey | null;
  loading: boolean;
  error: string | null;

  // Responses
  responses: SurveyResponse[];
  currentSnapshot: DatasetSnapshot | null;
  snapshots: DatasetSnapshot[];

  // Analytics
  annotations: Annotation[];
  insights: ResearchInsight[];
  segments: Segment[];

  // Actions
  loadSurveys: () => Promise<void>;
  createSurvey: (survey: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Survey>;
  updateSurvey: (survey: Survey) => Promise<void>;
  deleteSurvey: (id: string) => Promise<void>;
  setCurrentSurvey: (survey: Survey | null) => void;

  loadResponses: (surveyId: string) => Promise<void>;
  addResponse: (response: SurveyResponse) => Promise<void>;
  addResponses: (responses: SurveyResponse[]) => Promise<void>;

  createSnapshot: (snapshot: Omit<DatasetSnapshot, 'id' | 'createdAt'>) => Promise<DatasetSnapshot>;
  loadSnapshots: (surveyId: string) => Promise<void>;
  setCurrentSnapshot: (snapshot: DatasetSnapshot | null) => void;

  loadAnnotations: (responseId?: string, questionId?: string) => Promise<void>;
  addAnnotation: (annotation: Annotation) => Promise<void>;
  updateAnnotation: (annotation: Annotation) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;

  loadInsights: (surveyId: string) => Promise<void>;
  addInsight: (insight: ResearchInsight) => Promise<void>;
  updateInsight: (insight: ResearchInsight) => Promise<void>;
  deleteInsight: (id: string) => Promise<void>;

  loadSegments: (surveyId: string) => Promise<void>;
  addSegment: (segment: Segment) => Promise<void>;
  updateSegment: (segment: Segment) => Promise<void>;
  deleteSegment: (id: string) => Promise<void>;

  setError: (error: string | null) => void;
  clearError: () => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useSurveyStore = create<SurveyState>((set, get) => ({
  surveys: [],
  currentSurvey: null,
  loading: false,
  error: null,
  responses: [],
  currentSnapshot: null,
  snapshots: [],
  annotations: [],
  insights: [],
  segments: [],

  loadSurveys: async () => {
    return stateQueue.enqueue(async () => {
      set({ loading: true, error: null });
      try {
        await storage.init();
        const surveys = await storage.getAllSurveys();
        set({ surveys, loading: false });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to load surveys', loading: false });
      }
    });
  },

  createSurvey: async (surveyData) => {
    set({ loading: true, error: null });
    try {
      // Validate survey data before creating
      const validation = validateSurvey({
        ...surveyData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (!validation.success) {
        const errorMsg = validation.errorMessage || 'Survey validation failed';
        set({ error: errorMsg, loading: false });
        throw new Error(errorMsg);
      }

      if (!validation.data) {
        throw new Error('Validation succeeded but no data returned');
      }

      await storage.init();
      await storage.saveSurvey(validation.data);
      const surveys = await storage.getAllSurveys();
      set({ surveys, currentSurvey: validation.data, loading: false });
      return validation.data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create survey';
      set({ error: errorMsg, loading: false });
      throw error;
    }
  },

  updateSurvey: async (survey) => {
    return stateQueue.enqueue(async () => {
      set({ loading: true, error: null });
      try {
        // Validate survey before updating
        const validation = validateSurvey({
          ...survey,
          updatedAt: new Date().toISOString(),
        });

        if (!validation.success) {
          const errorMsg = validation.errorMessage || 'Survey validation failed';
          set({ error: errorMsg, loading: false });
          return;
        }

        if (!validation.data) {
          set({ error: 'Validation succeeded but no data returned', loading: false });
          return;
        }

        await storage.init();
        await storage.saveSurvey(validation.data);
        const surveys = await storage.getAllSurveys();
        set({ 
          surveys, 
          currentSurvey: get().currentSurvey?.id === survey.id ? validation.data : get().currentSurvey,
          loading: false 
        });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update survey', loading: false });
      }
    });
  },

  deleteSurvey: async (id) => {
    set({ loading: true, error: null });
    try {
      await storage.init();
      await storage.deleteSurvey(id);
      const surveys = await storage.getAllSurveys();
      set({ 
        surveys, 
        currentSurvey: get().currentSurvey?.id === id ? null : get().currentSurvey,
        loading: false 
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete survey', loading: false });
    }
  },

  setCurrentSurvey: (survey) => {
    set({ currentSurvey: survey });
    if (survey) {
      get().loadResponses(survey.id);
      get().loadSnapshots(survey.id);
      get().loadInsights(survey.id);
      get().loadSegments(survey.id);
    }
  },

  loadResponses: async (surveyId) => {
    return stateQueue.enqueue(async () => {
      set({ loading: true, error: null });
      try {
        await storage.init();
        const responses = await storage.getResponsesBySurvey(surveyId);
        // Validate all loaded responses
        const validation = validateSurveyResponses(responses);
        if (validation.invalid.length > 0) {
          console.warn(`${validation.invalid.length} invalid responses detected and filtered`);
        }
        set({ responses: validation.valid, loading: false });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to load responses', loading: false });
      }
    });
  },

  addResponse: async (response) => {
    set({ loading: true, error: null });
    try {
      // Validate response before adding
      const validation = validateSurveyResponse(response);
      if (!validation.success) {
        const errorMsg = validation.errorMessage || 'Response validation failed';
        set({ error: errorMsg, loading: false });
        return;
      }

      if (!validation.data) {
        set({ error: 'Validation succeeded but no data returned', loading: false });
        return;
      }

      await storage.init();
      await storage.saveResponse(validation.data);
      const responses = await storage.getResponsesBySurvey(validation.data.surveyId);
      set({ responses, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add response', loading: false });
    }
  },

  addResponses: async (responses) => {
    return stateQueue.enqueue(async () => {
      set({ loading: true, error: null });
      try {
        // Validate all responses, filter out invalid ones
        const validation = validateSurveyResponses(responses);
        
        if (validation.valid.length === 0) {
          set({ 
            error: `All ${responses.length} responses failed validation. Please check the data.`, 
            loading: false 
          });
          return;
        }

        if (validation.invalid.length > 0) {
          const errorMsg = `${validation.invalid.length} of ${responses.length} responses failed validation and were skipped.`;
          set({ error: errorMsg, loading: false });
          // Continue with valid responses
        }

        await storage.init();
        await storage.saveResponses(validation.valid);
        if (validation.valid.length > 0) {
          const allResponses = await storage.getResponsesBySurvey(validation.valid[0].surveyId);
          // Re-validate loaded responses
          const loadedValidation = validateSurveyResponses(allResponses);
          set({ responses: loadedValidation.valid, loading: false });
        }
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to add responses', loading: false });
      }
    });
  },

  createSnapshot: async (snapshotData) => {
    set({ loading: true, error: null });
    try {
      // Validate snapshot before creating
      const snapshotToValidate: DatasetSnapshot = {
        ...snapshotData,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };

      const validation = validateSnapshot(snapshotToValidate);
      if (!validation.success) {
        const errorMsg = validation.errorMessage || 'Snapshot validation failed';
        set({ error: errorMsg, loading: false });
        throw new Error(errorMsg);
      }

      if (!validation.data) {
        throw new Error('Validation succeeded but no data returned');
      }

      await storage.init();
      await storage.saveSnapshot(validation.data);
      const snapshots = await storage.getSnapshotsBySurvey(validation.data.surveyId);
      set({ snapshots, currentSnapshot: validation.data, loading: false });
      return validation.data;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create snapshot', loading: false });
      throw error;
    }
  },

  loadSnapshots: async (surveyId) => {
    set({ loading: true, error: null });
    try {
      await storage.init();
      const snapshots = await storage.getSnapshotsBySurvey(surveyId);
      set({ snapshots, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load snapshots', loading: false });
    }
  },

  setCurrentSnapshot: (snapshot) => {
    set({ currentSnapshot: snapshot });
  },

  loadAnnotations: async (responseId, questionId) => {
    set({ loading: true, error: null });
    try {
      await storage.init();
      let annotations: Annotation[] = [];
      if (responseId) {
        annotations = await storage.getAnnotationsByResponse(responseId);
      } else if (questionId) {
        annotations = await storage.getAnnotationsByQuestion(questionId);
      } else {
        // Load all annotations if no filter specified
        annotations = await storage.getAllAnnotations();
      }
      set({ annotations, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load annotations', loading: false });
    }
  },

  addAnnotation: async (annotation) => {
    set({ loading: true, error: null });
    try {
      await storage.init();
      await storage.saveAnnotation(annotation);
      await get().loadAnnotations(annotation.responseId, annotation.questionId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add annotation', loading: false });
    }
  },

  updateAnnotation: async (annotation) => {
    set({ loading: true, error: null });
    try {
      await storage.init();
      const updated = { ...annotation, updatedAt: new Date().toISOString() };
      await storage.saveAnnotation(updated);
      await get().loadAnnotations(annotation.responseId, annotation.questionId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update annotation', loading: false });
    }
  },

  deleteAnnotation: async (id) => {
    set({ loading: true, error: null });
    try {
      await storage.init();
      await storage.deleteAnnotation(id);
      const annotations = get().annotations.filter(a => a.id !== id);
      set({ annotations, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete annotation', loading: false });
    }
  },

  loadInsights: async (surveyId) => {
    set({ loading: true, error: null });
    try {
      await storage.init();
      const insights = await storage.getInsightsBySurvey(surveyId);
      set({ insights, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load insights', loading: false });
    }
  },

  addInsight: async (insight) => {
    set({ loading: true, error: null });
    try {
      await storage.init();
      await storage.saveInsight(insight);
      await get().loadInsights(insight.surveyId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add insight', loading: false });
    }
  },

  updateInsight: async (insight) => {
    set({ loading: true, error: null });
    try {
      await storage.init();
      const updated = { ...insight, updatedAt: new Date().toISOString() };
      await storage.saveInsight(updated);
      await get().loadInsights(insight.surveyId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update insight', loading: false });
    }
  },

  deleteInsight: async (id) => {
    set({ loading: true, error: null });
    try {
      await storage.init();
      await storage.deleteInsight(id);
      const insights = get().insights.filter(i => i.id !== id);
      set({ insights, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete insight', loading: false });
    }
  },

  loadSegments: async (surveyId) => {
    set({ loading: true, error: null });
    try {
      await storage.init();
      const segments = await storage.getSegmentsBySurvey(surveyId);
      set({ segments, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load segments', loading: false });
    }
  },

  addSegment: async (segment) => {
    set({ loading: true, error: null });
    try {
      await storage.init();
      await storage.saveSegment(segment);
      await get().loadSegments(segment.surveyId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add segment', loading: false });
    }
  },

  updateSegment: async (segment) => {
    set({ loading: true, error: null });
    try {
      await storage.init();
      await storage.saveSegment(segment);
      await get().loadSegments(segment.surveyId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update segment', loading: false });
    }
  },

  deleteSegment: async (id) => {
    set({ loading: true, error: null });
    try {
      await storage.init();
      await storage.deleteSegment(id);
      const segments = get().segments.filter(s => s.id !== id);
      set({ segments, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete segment', loading: false });
    }
  },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
