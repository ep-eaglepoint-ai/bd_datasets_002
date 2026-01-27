import { SurveyResponse, DatasetSnapshot } from '@/lib/schemas/survey';
import { CleaningRule } from './dataCleaning';
import { Segment } from '@/lib/schemas/analytics';
import { storage } from '@/lib/storage/indexeddb';

export interface SnapshotComparison {
  snapshot1: DatasetSnapshot;
  snapshot2: DatasetSnapshot;
  differences: {
    responseCount: { before: number; after: number; change: number };
    cleaningRules: { added: CleaningRule[]; removed: CleaningRule[] };
    questions: { added: string[]; removed: string[] };
  };
}

/**
 * Creates an immutable snapshot of the current dataset state
 */
export async function createSnapshot(
  surveyId: string,
  responses: SurveyResponse[],
  metadata: {
    name: string;
    description?: string;
    cleaningRules?: CleaningRule[];
    segmentId?: string;
    annotationCount?: number;
    operation?: 'cleaning' | 'segmentation' | 'annotation' | 'filtering' | 'manual';
  }
): Promise<DatasetSnapshot> {
  const snapshot: DatasetSnapshot = {
    id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    surveyId,
    name: metadata.name,
    description: metadata.description || `Snapshot created: ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    responses: [...responses], // Deep copy to ensure immutability
    cleaningRules: metadata.cleaningRules || [],
    metadata: {
      operation: metadata.operation,
      segmentId: metadata.segmentId,
      annotationCount: metadata.annotationCount,
      responseCount: responses.length,
    },
  };

  await storage.saveSnapshot(snapshot);
  return snapshot;
}

/**
 * Automatically creates snapshot before cleaning operation
 */
export async function createSnapshotBeforeCleaning(
  surveyId: string,
  responses: SurveyResponse[],
  cleaningRules: CleaningRule[]
): Promise<DatasetSnapshot> {
  return createSnapshot(surveyId, responses, {
    name: `Before Cleaning: ${cleaningRules.map(r => r.type).join(', ')}`,
    description: `Snapshot before applying ${cleaningRules.length} cleaning rule(s)`,
    cleaningRules: [],
    operation: 'cleaning',
  });
}

/**
 * Automatically creates snapshot after cleaning operation
 */
export async function createSnapshotAfterCleaning(
  surveyId: string,
  responses: SurveyResponse[],
  cleaningRules: CleaningRule[],
  beforeSnapshotId?: string
): Promise<DatasetSnapshot> {
  return createSnapshot(surveyId, responses, {
    name: `After Cleaning: ${cleaningRules.map(r => r.type).join(', ')}`,
    description: `Snapshot after applying ${cleaningRules.length} cleaning rule(s)`,
    cleaningRules,
    operation: 'cleaning',
  });
}

/**
 * Creates snapshot when segmentation changes
 */
export async function createSnapshotForSegmentation(
  surveyId: string,
  responses: SurveyResponse[],
  segment: Segment
): Promise<DatasetSnapshot> {
  return createSnapshot(surveyId, responses, {
    name: `Segment: ${segment.name}`,
    description: `Snapshot for segment "${segment.name}"`,
    segmentId: segment.id,
    operation: 'segmentation',
  });
}

/**
 * Creates snapshot when annotation is added/updated
 */
export async function createSnapshotForAnnotation(
  surveyId: string,
  responses: SurveyResponse[],
  annotationCount: number
): Promise<DatasetSnapshot> {
  return createSnapshot(surveyId, responses, {
    name: `Annotation Update (${annotationCount} annotations)`,
    description: `Snapshot after annotation update`,
    annotationCount,
    operation: 'annotation',
  });
}

/**
 * Restores a snapshot (returns the responses from that snapshot)
 */
export async function restoreSnapshot(snapshotId: string): Promise<SurveyResponse[]> {
  const snapshot = await storage.getSnapshot(snapshotId);
  if (!snapshot) {
    throw new Error(`Snapshot ${snapshotId} not found`);
  }

  // Return a deep copy to ensure immutability
  return JSON.parse(JSON.stringify(snapshot.responses));
}

/**
 * Compares two snapshots
 */
export function compareSnapshots(
  snapshot1: DatasetSnapshot,
  snapshot2: DatasetSnapshot
): SnapshotComparison {
  const responseCount1 = snapshot1.responses.length;
  const responseCount2 = snapshot2.responses.length;

  // Compare cleaning rules
  const rules1 = new Set(snapshot1.cleaningRules.map(r => r.id));
  const rules2 = new Set(snapshot2.cleaningRules.map(r => r.id));
  const addedRules = snapshot2.cleaningRules.filter(r => !rules1.has(r.id));
  const removedRules = snapshot1.cleaningRules.filter(r => !rules2.has(r.id));

  // Compare question coverage (simplified - would need full question comparison)
  const questionIds1 = new Set(
    snapshot1.responses.flatMap(r => r.responses.map(res => res.questionId))
  );
  const questionIds2 = new Set(
    snapshot2.responses.flatMap(r => r.responses.map(res => res.questionId))
  );
  const addedQuestions = Array.from(questionIds2).filter(id => !questionIds1.has(id));
  const removedQuestions = Array.from(questionIds1).filter(id => !questionIds2.has(id));

  return {
    snapshot1,
    snapshot2,
    differences: {
      responseCount: {
        before: responseCount1,
        after: responseCount2,
        change: responseCount2 - responseCount1,
      },
      cleaningRules: {
        added: addedRules,
        removed: removedRules,
      },
      questions: {
        added: addedQuestions,
        removed: removedQuestions,
      },
    },
  };
}

/**
 * Gets snapshot history for a survey
 */
export async function getSnapshotHistory(surveyId: string): Promise<DatasetSnapshot[]> {
  const snapshots = await storage.getSnapshotsBySurvey(surveyId);
  return snapshots.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
