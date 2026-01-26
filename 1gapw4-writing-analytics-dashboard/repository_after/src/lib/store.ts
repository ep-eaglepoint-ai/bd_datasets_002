import { create } from 'zustand';
import { Document, AnalyticsResult, Annotation } from './types';
import * as storage from './storage';
import * as analysis from './textAnalysis';

interface AppState {
  documents: Document[];
  currentDocument: Document | null;
  analytics: Map<string, AnalyticsResult>;
  annotations: Map<string, Annotation[]>;
  loading: boolean;
  error: string | null;

  loadDocuments: () => Promise<void>;
  addDocument: (doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  setCurrentDocument: (doc: Document | null) => void;
  analyzeDocument: (documentId: string) => Promise<void>;
  addAnnotation: (documentId: string, content: string) => Promise<void>;
  exportData: () => Promise<string>;
}

export const useStore = create<AppState>((set, get) => ({
  documents: [],
  currentDocument: null,
  analytics: new Map(),
  annotations: new Map(),
  loading: false,
  error: null,

  loadDocuments: async () => {
    set({ loading: true, error: null });
    try {
      const docs = await storage.getAllDocuments();
      const analyticsData = await storage.getAllAnalytics();
      
      const analyticsMap = new Map<string, AnalyticsResult>();
      analyticsData.forEach(a => analyticsMap.set(a.documentId, a));

      set({ documents: docs, analytics: analyticsMap, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addDocument: async (docData) => {
    set({ loading: true, error: null });
    try {
      const now = Date.now();
      const doc: Document = {
        ...docData,
        id: `doc-${now}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
        tags: docData.tags || [],
      };

      await storage.saveDocument(doc);
      
      // Add document to state FIRST, before analyzing
      set(state => ({
        documents: [...state.documents, doc],
        loading: false,
      }));

      // Now analyze the document (it exists in state now)
      await get().analyzeDocument(doc.id);
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateDocument: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const existing = get().documents.find(d => d.id === id);
      if (!existing) throw new Error('Document not found');

      const updated = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      };

      await storage.saveDocument(updated);
      
      if (updates.content) {
        await get().analyzeDocument(id);
      }

      set(state => ({
        documents: state.documents.map(d => d.id === id ? updated : d),
        currentDocument: state.currentDocument?.id === id ? updated : state.currentDocument,
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteDocument: async (id) => {
    set({ loading: true, error: null });
    try {
      await storage.deleteDocument(id);
      
      set(state => ({
        documents: state.documents.filter(d => d.id !== id),
        currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  setCurrentDocument: (doc) => {
    set({ currentDocument: doc });
  },

  analyzeDocument: async (documentId) => {
    try {
      const doc = get().documents.find(d => d.id === documentId);
      if (!doc) throw new Error('Document not found');

      const basicMetrics = analysis.countBasicMetrics(doc.content);
      const sentiment = analysis.analyzeSentiment(doc.content);
      const readability = analysis.calculateReadability(doc.content);
      const lexicalRichness = analysis.calculateLexicalRichness(doc.content);
      const styleMetrics = analysis.analyzeStyleMetrics(doc.content);

      const analyticsResult: AnalyticsResult = {
        documentId,
        timestamp: Date.now(),
        ...basicMetrics,
        sentiment,
        readability,
        lexicalRichness,
        styleMetrics,
      };

      await storage.saveAnalytics(analyticsResult);

      set(state => {
        const newAnalytics = new Map(state.analytics);
        newAnalytics.set(documentId, analyticsResult);
        return { analytics: newAnalytics };
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  addAnnotation: async (documentId, content) => {
    try {
      const annotation: Annotation = {
        id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        documentId,
        content,
        timestamp: Date.now(),
      };

      await storage.saveAnnotation(annotation);

      set(state => {
        const newAnnotations = new Map(state.annotations);
        const existing = newAnnotations.get(documentId) || [];
        newAnnotations.set(documentId, [...existing, annotation]);
        return { annotations: newAnnotations };
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  exportData: async () => {
    try {
      const data = await storage.exportAllData();
      return JSON.stringify(data, null, 2);
    } catch (error) {
      throw new Error(`Export failed: ${(error as Error).message}`);
    }
  },
}));
