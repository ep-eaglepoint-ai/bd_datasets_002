import { create } from 'zustand';
import { Document, AnalyticsResult, Annotation, Snapshot } from './types';
import * as storage from './storage';
import * as analysis from './textAnalysis';

// Analytics cache for memoization
const analyticsCache = new Map<string, { content: string; result: AnalyticsResult }>();

// Batch queue for operations
let batchQueue: Array<() => Promise<void>> = [];
let batchTimeout: NodeJS.Timeout | null = null;
const BATCH_DELAY = 100; // ms

interface AppState {
  documents: Document[];
  currentDocument: Document | null;
  analytics: Map<string, AnalyticsResult>;
  annotations: Map<string, Annotation[]>;
  snapshots: Map<string, Snapshot[]>;
  loading: boolean;
  error: string | null;

  loadDocuments: () => Promise<void>;
  addDocument: (doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  setCurrentDocument: (doc: Document | null) => void;
  analyzeDocument: (documentId: string, force?: boolean) => Promise<void>;
  addAnnotation: (documentId: string, content: string) => Promise<void>;
  createSnapshot: (documentId: string) => Promise<void>;
  loadSnapshots: (documentId: string) => Promise<void>;
  exportData: () => Promise<string>;
  batchOperation: (operation: () => Promise<void>) => void;
  flushBatch: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  documents: [],
  currentDocument: null,
  analytics: new Map(),
  annotations: new Map(),
  snapshots: new Map(),
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
      
      // Automatically create snapshot on import
      await get().createSnapshot(doc.id);
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
      
      // Create snapshot before updating content
      if (updates.content && existing.content !== updates.content) {
        await get().createSnapshot(id);
      }
      
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

  analyzeDocument: async (documentId, force = false) => {
    try {
      const doc = get().documents.find(d => d.id === documentId);
      if (!doc) throw new Error('Document not found');

      // Check cache for memoized analytics (incremental recalculation)
      const cached = analyticsCache.get(documentId);
      if (!force && cached && cached.content === doc.content) {
        // Use cached result
        set(state => {
          const newAnalytics = new Map(state.analytics);
          newAnalytics.set(documentId, cached.result);
          return { analytics: newAnalytics };
        });
        return;
      }

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

      // Cache the result
      analyticsCache.set(documentId, { content: doc.content, result: analyticsResult });

      await storage.saveAnalytics(analyticsResult);

      set(state => {
        const newAnalytics = new Map(state.analytics);
        newAnalytics.set(documentId, analyticsResult);
        return { analytics: newAnalytics };
      });
      
      // Automatically create snapshot after analytics recalculation
      await get().createSnapshot(documentId);
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

  createSnapshot: async (documentId) => {
    try {
      const doc = get().documents.find(d => d.id === documentId);
      const analyticsResult = get().analytics.get(documentId);
      
      if (!doc || !analyticsResult) return;

      const snapshot: Snapshot = {
        id: `snap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        documentId,
        content: doc.content,
        analytics: analyticsResult,
        timestamp: Date.now(),
      };

      await storage.saveSnapshot(snapshot);

      set(state => {
        const newSnapshots = new Map(state.snapshots);
        const existing = newSnapshots.get(documentId) || [];
        newSnapshots.set(documentId, [...existing, snapshot]);
        return { snapshots: newSnapshots };
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  loadSnapshots: async (documentId) => {
    try {
      const snapshots = await storage.getSnapshotsByDocument(documentId);
      set(state => {
        const newSnapshots = new Map(state.snapshots);
        newSnapshots.set(documentId, snapshots);
        return { snapshots: newSnapshots };
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  batchOperation: (operation) => {
    batchQueue.push(operation);
    
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }
    
    batchTimeout = setTimeout(() => {
      get().flushBatch();
    }, BATCH_DELAY);
  },

  flushBatch: async () => {
    const operations = [...batchQueue];
    batchQueue = [];
    
    if (batchTimeout) {
      clearTimeout(batchTimeout);
      batchTimeout = null;
    }
    
    await Promise.all(operations.map(op => op()));
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
