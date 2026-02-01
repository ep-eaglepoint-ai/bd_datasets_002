import { openDB, IDBPDatabase } from 'idb';
import { Survey, Response, SurveyAnalytics } from '@/types/survey';

class DatabaseService {
  private db: IDBPDatabase | null = null;
  private readonly DB_NAME = 'SurveyBuilderDB';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Surveys store
        const surveyStore = db.createObjectStore('surveys', { keyPath: 'id' });
        surveyStore.createIndex('by-created', 'createdAt');
        surveyStore.createIndex('by-updated', 'updatedAt');
        surveyStore.createIndex('by-published', 'published');

        // Responses store
        const responseStore = db.createObjectStore('responses', { keyPath: 'id' });
        responseStore.createIndex('by-survey', 'surveyId');
        responseStore.createIndex('by-completed', 'completedAt');
        responseStore.createIndex('by-survey-version', ['surveyId', 'surveyVersion']);
        responseStore.createIndex('by-completion-status', 'isComplete');

        // Analytics store
        const analyticsStore = db.createObjectStore('analytics', { keyPath: 'surveyId' });
        analyticsStore.createIndex('by-updated', 'lastUpdated');

        // Metadata store for app settings and cache
        db.createObjectStore('metadata', { keyPath: 'key' });
      },
    });
  }

  private async ensureDB(): Promise<IDBPDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  // Survey operations
  async saveSurvey(survey: Survey): Promise<void> {
    const db = await this.ensureDB();
    await db.put('surveys', survey);
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    const db = await this.ensureDB();
    return await db.get('surveys', id);
  }

  async getAllSurveys(): Promise<Survey[]> {
    const db = await this.ensureDB();
    return await db.getAll('surveys');
  }

  async deleteSurvey(id: string): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(['surveys', 'responses', 'analytics'], 'readwrite');
    
    // Delete survey
    await tx.objectStore('surveys').delete(id);
    
    // Delete all responses for this survey
    const responseIndex = tx.objectStore('responses').index('by-survey');
    const responses = await responseIndex.getAllKeys(id);
    for (const responseId of responses) {
      await tx.objectStore('responses').delete(responseId);
    }
    
    // Delete analytics
    await tx.objectStore('analytics').delete(id);
    
    await tx.done;
  }

  async getSurveysByPublishedStatus(published: boolean): Promise<Survey[]> {
    const db = await this.ensureDB();
    return await db.getAllFromIndex('surveys', 'by-published', published as any);
  }

  // Response operations
  async saveResponse(response: Response): Promise<void> {
    const db = await this.ensureDB();
    await db.put('responses', response);
  }

  async getResponse(id: string): Promise<Response | undefined> {
    const db = await this.ensureDB();
    return await db.get('responses', id);
  }

  async getResponsesBySurvey(surveyId: string): Promise<Response[]> {
    const db = await this.ensureDB();
    return await db.getAllFromIndex('responses', 'by-survey', surveyId);
  }

  async getResponsesBySurveyAndVersion(surveyId: string, version: number): Promise<Response[]> {
    const db = await this.ensureDB();
    return await db.getAllFromIndex('responses', 'by-survey-version', [surveyId, version]);
  }

  async getCompletedResponses(surveyId?: string): Promise<Response[]> {
    const db = await this.ensureDB();
    const allCompleted = await db.getAllFromIndex('responses', 'by-completion-status', true as any);
    
    if (surveyId) {
      return allCompleted.filter(response => response.surveyId === surveyId);
    }
    
    return allCompleted;
  }

  async deleteResponse(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('responses', id);
  }

  async getResponsesInDateRange(surveyId: string, startDate: Date, endDate: Date): Promise<Response[]> {
    const db = await this.ensureDB();
    const allResponses = await this.getResponsesBySurvey(surveyId);
    
    return allResponses.filter(response => {
      const responseDate = response.completedAt || response.startedAt;
      return responseDate >= startDate && responseDate <= endDate;
    });
  }

  // Analytics operations
  async saveAnalytics(analytics: SurveyAnalytics): Promise<void> {
    const db = await this.ensureDB();
    await db.put('analytics', analytics);
  }

  async getAnalytics(surveyId: string): Promise<SurveyAnalytics | undefined> {
    const db = await this.ensureDB();
    return await db.get('analytics', surveyId);
  }

  async getAllAnalytics(): Promise<SurveyAnalytics[]> {
    const db = await this.ensureDB();
    return await db.getAll('analytics');
  }

  async deleteAnalytics(surveyId: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('analytics', surveyId);
  }

  // Metadata operations
  async setMetadata(key: string, value: any): Promise<void> {
    const db = await this.ensureDB();
    await db.put('metadata', { key, value });
  }

  async getMetadata(key: string): Promise<any> {
    const db = await this.ensureDB();
    const result = await db.get('metadata', key);
    return result?.value;
  }

  // Utility operations
  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(['surveys', 'responses', 'analytics', 'metadata'], 'readwrite');
    
    await tx.objectStore('surveys').clear();
    await tx.objectStore('responses').clear();
    await tx.objectStore('analytics').clear();
    await tx.objectStore('metadata').clear();
    
    await tx.done;
  }

  async exportData(): Promise<{
    surveys: Survey[];
    responses: Response[];
    analytics: SurveyAnalytics[];
  }> {
    const db = await this.ensureDB();
    
    const [surveys, responses, analytics] = await Promise.all([
      db.getAll('surveys'),
      db.getAll('responses'),
      db.getAll('analytics'),
    ]);

    return { surveys, responses, analytics };
  }

  async importData(data: {
    surveys?: Survey[];
    responses?: Response[];
    analytics?: SurveyAnalytics[];
  }): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(['surveys', 'responses', 'analytics'], 'readwrite');

    if (data.surveys) {
      for (const survey of data.surveys) {
        await tx.objectStore('surveys').put(survey);
      }
    }

    if (data.responses) {
      for (const response of data.responses) {
        await tx.objectStore('responses').put(response);
      }
    }

    if (data.analytics) {
      for (const analytics of data.analytics) {
        await tx.objectStore('analytics').put(analytics);
      }
    }

    await tx.done;
  }

  // Performance optimization: batch operations
  async batchSaveResponses(responses: Response[]): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction('responses', 'readwrite');
    
    await Promise.all(responses.map(response => tx.store.put(response)));
    await tx.done;
  }

  async getResponseCount(surveyId?: string): Promise<number> {
    const db = await this.ensureDB();
    
    if (surveyId) {
      return await db.countFromIndex('responses', 'by-survey', surveyId);
    }
    
    return await db.count('responses');
  }

  async getSurveyCount(): Promise<number> {
    const db = await this.ensureDB();
    return await db.count('surveys');
  }
}

// Singleton instance
export const databaseService = new DatabaseService();