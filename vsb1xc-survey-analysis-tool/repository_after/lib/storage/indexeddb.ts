import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Survey, SurveyResponse, DatasetSnapshot, Annotation, ResearchInsight, Segment } from '@/lib/schemas/survey';
import { SurveySchema, SurveyResponseSchema, DatasetSnapshotSchema } from '@/lib/schemas/survey';

interface SurveyDB extends DBSchema {
  surveys: {
    key: string;
    value: Survey;
    indexes: { 'by-updatedAt': string };
  };
  responses: {
    key: string;
    value: SurveyResponse;
    indexes: { 'by-surveyId': string; 'by-submittedAt': string };
  };
  snapshots: {
    key: string;
    value: DatasetSnapshot;
    indexes: { 'by-surveyId': string; 'by-createdAt': string };
  };
  annotations: {
    key: string;
    value: Annotation;
    indexes: { 'by-responseId': string; 'by-questionId': string };
  };
  insights: {
    key: string;
    value: ResearchInsight;
    indexes: { 'by-surveyId': string; 'by-questionId': string };
  };
  segments: {
    key: string;
    value: Segment;
    indexes: { 'by-surveyId': string };
  };
}

const DB_NAME = 'survey-analysis-db';
const DB_VERSION = 1;

class IndexedDBStorage {
  private db: IDBPDatabase<SurveyDB> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is not available in this environment');
    }

    try {
      this.db = await openDB<SurveyDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Surveys store
          if (!db.objectStoreNames.contains('surveys')) {
            const surveyStore = db.createObjectStore('surveys', { keyPath: 'id' });
            surveyStore.createIndex('by-updatedAt', 'updatedAt');
          }

          // Responses store
          if (!db.objectStoreNames.contains('responses')) {
            const responseStore = db.createObjectStore('responses', { keyPath: 'id' });
            responseStore.createIndex('by-surveyId', 'surveyId');
            responseStore.createIndex('by-submittedAt', 'submittedAt');
          }

          // Snapshots store
          if (!db.objectStoreNames.contains('snapshots')) {
            const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
            snapshotStore.createIndex('by-surveyId', 'surveyId');
            snapshotStore.createIndex('by-createdAt', 'createdAt');
          }

          // Annotations store
          if (!db.objectStoreNames.contains('annotations')) {
            const annotationStore = db.createObjectStore('annotations', { keyPath: 'id' });
            annotationStore.createIndex('by-responseId', 'responseId');
            annotationStore.createIndex('by-questionId', 'questionId');
          }

          // Insights store
          if (!db.objectStoreNames.contains('insights')) {
            const insightStore = db.createObjectStore('insights', { keyPath: 'id' });
            insightStore.createIndex('by-surveyId', 'surveyId');
            insightStore.createIndex('by-questionId', 'questionId');
          }

          // Segments store
          if (!db.objectStoreNames.contains('segments')) {
            const segmentStore = db.createObjectStore('segments', { keyPath: 'id' });
            segmentStore.createIndex('by-surveyId', 'surveyId');
          }
        },
        blocked() {
          // Database is blocked by another connection - wait and retry
          console.warn('Database is blocked by another connection');
        },
        blocking() {
          // This connection is blocking another - close it
          if (this.db) {
            this.db.close();
            this.db = null;
          }
        },
      });
    } catch (error) {
      // Handle database errors gracefully
      console.error('Failed to initialize database:', error);
      // In test environment, allow initialization to fail silently if it's a known issue
      if (process.env.NODE_ENV === 'test' && error instanceof Error && error.message.includes('AbortError')) {
        // This is likely a test environment issue with fake-indexeddb
        // Re-throw to let tests handle it
      }
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async ensureDB(): Promise<IDBPDatabase<SurveyDB>> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize database');
    }
    return this.db;
  }

  // Survey operations
  async saveSurvey(survey: Survey): Promise<void> {
    const db = await this.ensureDB();
    const validated = SurveySchema.parse(survey);
    await db.put('surveys', validated);
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    const db = await this.ensureDB();
    return db.get('surveys', id);
  }

  async getAllSurveys(): Promise<Survey[]> {
    const db = await this.ensureDB();
    return db.getAll('surveys');
  }

  async deleteSurvey(id: string): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(['surveys', 'responses', 'snapshots', 'insights', 'segments'], 'readwrite');
    
    await tx.objectStore('surveys').delete(id);
    
    // Delete related responses
    const responseIndex = tx.objectStore('responses').index('by-surveyId');
    let cursor = await responseIndex.openCursor(IDBKeyRange.only(id));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    // Delete related snapshots
    const snapshotIndex = tx.objectStore('snapshots').index('by-surveyId');
    cursor = await snapshotIndex.openCursor(IDBKeyRange.only(id));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    // Delete related insights
    const insightIndex = tx.objectStore('insights').index('by-surveyId');
    cursor = await insightIndex.openCursor(IDBKeyRange.only(id));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    // Delete related segments
    const segmentIndex = tx.objectStore('segments').index('by-surveyId');
    cursor = await segmentIndex.openCursor(IDBKeyRange.only(id));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    await tx.done;
  }

  // Response operations with transaction safety
  async saveResponse(response: SurveyResponse): Promise<void> {
    const db = await this.ensureDB();
    const validated = SurveyResponseSchema.parse(response);
    
    try {
      const tx = db.transaction('responses', 'readwrite');
      await tx.objectStore('responses').put(validated);
      await tx.done;
    } catch (error) {
      // If transaction is already aborted, don't try to abort again
      if (error instanceof Error && !error.message.includes('AbortError')) {
        throw new Error(`Failed to save response: ${error.message}`);
      }
      throw error;
    }
  }

  async saveResponses(responses: SurveyResponse[]): Promise<void> {
    const db = await this.ensureDB();
    
    try {
      const tx = db.transaction('responses', 'readwrite');
      const store = tx.objectStore('responses');
      
      for (const response of responses) {
        const validated = SurveyResponseSchema.parse(response);
        await store.put(validated);
      }
      await tx.done;
    } catch (error) {
      // If transaction is already aborted, don't try to abort again
      if (error instanceof Error && !error.message.includes('AbortError')) {
        throw new Error(`Failed to save responses: ${error.message}`);
      }
      throw error;
    }
  }

  async getResponse(id: string): Promise<SurveyResponse | undefined> {
    const db = await this.ensureDB();
    return db.get('responses', id);
  }

  async getResponsesBySurvey(surveyId: string): Promise<SurveyResponse[]> {
    const db = await this.ensureDB();
    const index = db.transaction('responses').store.index('by-surveyId');
    return index.getAll(surveyId);
  }

  async getAllResponses(): Promise<SurveyResponse[]> {
    const db = await this.ensureDB();
    return db.getAll('responses');
  }

  // Snapshot operations with transaction safety
  async saveSnapshot(snapshot: DatasetSnapshot): Promise<void> {
    const db = await this.ensureDB();
    const validated = DatasetSnapshotSchema.parse(snapshot);
    
    // Use transaction for atomic write
    try {
      const tx = db.transaction('snapshots', 'readwrite');
      await tx.objectStore('snapshots').put(validated);
      await tx.done;
    } catch (error) {
      // If transaction is already aborted, don't try to abort again
      if (error instanceof Error && !error.message.includes('AbortError')) {
        throw new Error(`Failed to save snapshot: ${error.message}`);
      }
      throw error;
    }
  }

  async getSnapshot(id: string): Promise<DatasetSnapshot | undefined> {
    const db = await this.ensureDB();
    return db.get('snapshots', id);
  }

  async getSnapshotsBySurvey(surveyId: string): Promise<DatasetSnapshot[]> {
    const db = await this.ensureDB();
    const index = db.transaction('snapshots').store.index('by-surveyId');
    return index.getAll(surveyId);
  }

  // Annotation operations
  async saveAnnotation(annotation: Annotation): Promise<void> {
    const db = await this.ensureDB();
    await db.put('annotations', annotation);
  }

  async getAllAnnotations(): Promise<Annotation[]> {
    const db = await this.ensureDB();
    return db.getAll('annotations');
  }

  async getAnnotationsByResponse(responseId: string): Promise<Annotation[]> {
    const db = await this.ensureDB();
    const index = db.transaction('annotations').store.index('by-responseId');
    return index.getAll(responseId);
  }

  async getAnnotationsByQuestion(questionId: string): Promise<Annotation[]> {
    const db = await this.ensureDB();
    const index = db.transaction('annotations').store.index('by-questionId');
    return index.getAll(questionId);
  }

  async deleteAnnotation(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('annotations', id);
  }

  // Insight operations
  async saveInsight(insight: ResearchInsight): Promise<void> {
    const db = await this.ensureDB();
    await db.put('insights', insight);
  }

  async getInsightsBySurvey(surveyId: string): Promise<ResearchInsight[]> {
    const db = await this.ensureDB();
    const index = db.transaction('insights').store.index('by-surveyId');
    return index.getAll(surveyId);
  }

  async deleteInsight(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('insights', id);
  }

  // Segment operations
  async saveSegment(segment: Segment): Promise<void> {
    const db = await this.ensureDB();
    await db.put('segments', segment);
  }

  async getSegmentsBySurvey(surveyId: string): Promise<Segment[]> {
    const db = await this.ensureDB();
    const index = db.transaction('segments').store.index('by-surveyId');
    return index.getAll(surveyId);
  }

  async deleteSegment(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('segments', id);
  }

  // Utility: Clear all data (use with caution)
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction([
      'surveys',
      'responses',
      'snapshots',
      'annotations',
      'insights',
      'segments',
    ], 'readwrite');

    await Promise.all([
      tx.objectStore('surveys').clear(),
      tx.objectStore('responses').clear(),
      tx.objectStore('snapshots').clear(),
      tx.objectStore('annotations').clear(),
      tx.objectStore('insights').clear(),
      tx.objectStore('segments').clear(),
    ]);

    await tx.done;
  }
}

export const storage = new IndexedDBStorage();
