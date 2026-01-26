// IndexedDB Persistence Layer for Goal Tracking Application
// Uses the 'idb' library for a promise-based API

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Goal,
  Milestone,
  ProgressUpdate,
  Dependency,
  DecisionRecord,
  VersionSnapshot,
  VelocityMetrics,
  EstimationAccuracy,
  OutcomeQualityScore,
  TrendAnalysis,
} from './types';

// ============================================================================
// Database Schema Definition
// ============================================================================

interface GoalTrackingDB extends DBSchema {
  goals: {
    key: string;
    value: Goal;
    indexes: {
      'by-state': string;
      'by-priority': string;
      'by-createdAt': string;
      'by-targetDate': string;
    };
  };
  milestones: {
    key: string;
    value: Milestone;
    indexes: {
      'by-goalId': string;
      'by-parentMilestoneId': string;
      'by-state': string;
    };
  };
  progressUpdates: {
    key: string;
    value: ProgressUpdate;
    indexes: {
      'by-entityId': string;
      'by-createdAt': string;
    };
  };
  dependencies: {
    key: string;
    value: Dependency;
    indexes: {
      'by-sourceId': string;
      'by-targetId': string;
    };
  };
  decisionRecords: {
    key: string;
    value: DecisionRecord;
    indexes: {
      'by-goalId': string;
    };
  };
  versionHistory: {
    key: string;
    value: VersionSnapshot;
    indexes: {
      'by-entityId': string;
      'by-createdAt': string;
    };
  };
  velocityMetrics: {
    key: string;
    value: VelocityMetrics;
    indexes: {
      'by-entityId': string;
    };
  };
  estimationAccuracy: {
    key: string;
    value: EstimationAccuracy;
    indexes: {
      'by-entityId': string;
    };
  };
  outcomeQuality: {
    key: string;
    value: OutcomeQualityScore;
    indexes: {
      'by-entityId': string;
    };
  };
  trendAnalysis: {
    key: string;
    value: TrendAnalysis;
  };
}

const DB_NAME = 'goal-tracking-db';
const DB_VERSION = 1;

// ============================================================================
// Database Initialization
// ============================================================================

let dbInstance: IDBPDatabase<GoalTrackingDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<GoalTrackingDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await openDB<GoalTrackingDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Goals store
        if (!db.objectStoreNames.contains('goals')) {
          const goalsStore = db.createObjectStore('goals', { keyPath: 'id' });
          goalsStore.createIndex('by-state', 'state');
          goalsStore.createIndex('by-priority', 'priority');
          goalsStore.createIndex('by-createdAt', 'createdAt');
          goalsStore.createIndex('by-targetDate', 'targetDate');
        }

        // Milestones store
        if (!db.objectStoreNames.contains('milestones')) {
          const milestonesStore = db.createObjectStore('milestones', { keyPath: 'id' });
          milestonesStore.createIndex('by-goalId', 'goalId');
          milestonesStore.createIndex('by-parentMilestoneId', 'parentMilestoneId');
          milestonesStore.createIndex('by-state', 'state');
        }

        // Progress Updates store
        if (!db.objectStoreNames.contains('progressUpdates')) {
          const progressStore = db.createObjectStore('progressUpdates', { keyPath: 'id' });
          progressStore.createIndex('by-entityId', 'entityId');
          progressStore.createIndex('by-createdAt', 'createdAt');
        }

        // Dependencies store
        if (!db.objectStoreNames.contains('dependencies')) {
          const depsStore = db.createObjectStore('dependencies', { keyPath: 'id' });
          depsStore.createIndex('by-sourceId', 'sourceId');
          depsStore.createIndex('by-targetId', 'targetId');
        }

        // Decision Records store
        if (!db.objectStoreNames.contains('decisionRecords')) {
          const decisionsStore = db.createObjectStore('decisionRecords', { keyPath: 'id' });
          decisionsStore.createIndex('by-goalId', 'goalId');
        }

        // Version History store
        if (!db.objectStoreNames.contains('versionHistory')) {
          const versionStore = db.createObjectStore('versionHistory', { keyPath: 'id' });
          versionStore.createIndex('by-entityId', 'entityId');
          versionStore.createIndex('by-createdAt', 'createdAt');
        }

        // Analytics stores
        if (!db.objectStoreNames.contains('velocityMetrics')) {
          const velocityStore = db.createObjectStore('velocityMetrics', { keyPath: 'entityId' });
          velocityStore.createIndex('by-entityId', 'entityId');
        }

        if (!db.objectStoreNames.contains('estimationAccuracy')) {
          const accuracyStore = db.createObjectStore('estimationAccuracy', { keyPath: 'entityId' });
          accuracyStore.createIndex('by-entityId', 'entityId');
        }

        if (!db.objectStoreNames.contains('outcomeQuality')) {
          const qualityStore = db.createObjectStore('outcomeQuality', { keyPath: 'entityId' });
          qualityStore.createIndex('by-entityId', 'entityId');
        }

        if (!db.objectStoreNames.contains('trendAnalysis')) {
          db.createObjectStore('trendAnalysis', { keyPath: 'userId' });
        }
      },
      blocked(currentVersion, blockedVersion, event) {
        console.warn('Database upgrade blocked. Please close other tabs with this app.');
      },
      blocking(currentVersion, blockedVersion, event) {
        // Close the database to allow upgrade
        dbInstance?.close();
        dbInstance = null;
      },
      terminated() {
        console.error('Database connection terminated unexpectedly');
        dbInstance = null;
      },
    });

    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error}`);
  }
}

// ============================================================================
// Goal Operations
// ============================================================================

export async function getAllGoals(): Promise<Goal[]> {
  const db = await initDB();
  return db.getAll('goals');
}

export async function getGoalById(id: string): Promise<Goal | undefined> {
  const db = await initDB();
  return db.get('goals', id);
}

export async function saveGoal(goal: Goal): Promise<void> {
  const db = await initDB();
  await db.put('goals', goal);
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(['goals', 'milestones', 'progressUpdates', 'dependencies', 'decisionRecords'], 'readwrite');
  
  // Delete the goal
  await tx.objectStore('goals').delete(id);
  
  // Delete associated milestones
  const milestones = await tx.objectStore('milestones').index('by-goalId').getAll(id);
  for (const milestone of milestones) {
    await tx.objectStore('milestones').delete(milestone.id);
  }
  
  // Delete associated progress updates
  const progressUpdates = await tx.objectStore('progressUpdates').index('by-entityId').getAll(id);
  for (const update of progressUpdates) {
    await tx.objectStore('progressUpdates').delete(update.id);
  }
  
  // Delete associated dependencies (where this goal is source or target)
  const sourceDeps = await tx.objectStore('dependencies').index('by-sourceId').getAll(id);
  const targetDeps = await tx.objectStore('dependencies').index('by-targetId').getAll(id);
  for (const dep of [...sourceDeps, ...targetDeps]) {
    await tx.objectStore('dependencies').delete(dep.id);
  }
  
  // Delete associated decision records
  const decisions = await tx.objectStore('decisionRecords').index('by-goalId').getAll(id);
  for (const decision of decisions) {
    await tx.objectStore('decisionRecords').delete(decision.id);
  }
  
  await tx.done;
}

export async function getGoalsByState(state: string): Promise<Goal[]> {
  const db = await initDB();
  return db.getAllFromIndex('goals', 'by-state', state);
}

// ============================================================================
// Milestone Operations
// ============================================================================

export async function getAllMilestones(): Promise<Milestone[]> {
  const db = await initDB();
  return db.getAll('milestones');
}

export async function getMilestoneById(id: string): Promise<Milestone | undefined> {
  const db = await initDB();
  return db.get('milestones', id);
}

export async function getMilestonesByGoalId(goalId: string): Promise<Milestone[]> {
  const db = await initDB();
  return db.getAllFromIndex('milestones', 'by-goalId', goalId);
}

export async function getChildMilestones(parentId: string): Promise<Milestone[]> {
  const db = await initDB();
  return db.getAllFromIndex('milestones', 'by-parentMilestoneId', parentId);
}

export async function saveMilestone(milestone: Milestone): Promise<void> {
  const db = await initDB();
  await db.put('milestones', milestone);
}

export async function deleteMilestone(id: string): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(['milestones', 'progressUpdates', 'dependencies'], 'readwrite');
  
  // Delete the milestone
  await tx.objectStore('milestones').delete(id);
  
  // Delete child milestones recursively
  const children = await tx.objectStore('milestones').index('by-parentMilestoneId').getAll(id);
  for (const child of children) {
    await tx.objectStore('milestones').delete(child.id);
  }
  
  // Delete associated progress updates
  const progressUpdates = await tx.objectStore('progressUpdates').index('by-entityId').getAll(id);
  for (const update of progressUpdates) {
    await tx.objectStore('progressUpdates').delete(update.id);
  }
  
  // Delete associated dependencies
  const sourceDeps = await tx.objectStore('dependencies').index('by-sourceId').getAll(id);
  const targetDeps = await tx.objectStore('dependencies').index('by-targetId').getAll(id);
  for (const dep of [...sourceDeps, ...targetDeps]) {
    await tx.objectStore('dependencies').delete(dep.id);
  }
  
  await tx.done;
}

// ============================================================================
// Progress Update Operations
// ============================================================================

export async function getAllProgressUpdates(): Promise<ProgressUpdate[]> {
  const db = await initDB();
  return db.getAll('progressUpdates');
}

export async function getProgressUpdatesByEntityId(entityId: string): Promise<ProgressUpdate[]> {
  const db = await initDB();
  return db.getAllFromIndex('progressUpdates', 'by-entityId', entityId);
}

export async function saveProgressUpdate(update: ProgressUpdate): Promise<void> {
  const db = await initDB();
  await db.put('progressUpdates', update);
}

export async function deleteProgressUpdate(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('progressUpdates', id);
}

// ============================================================================
// Dependency Operations
// ============================================================================

export async function getAllDependencies(): Promise<Dependency[]> {
  const db = await initDB();
  return db.getAll('dependencies');
}

export async function getDependenciesBySourceId(sourceId: string): Promise<Dependency[]> {
  const db = await initDB();
  return db.getAllFromIndex('dependencies', 'by-sourceId', sourceId);
}

export async function getDependenciesByTargetId(targetId: string): Promise<Dependency[]> {
  const db = await initDB();
  return db.getAllFromIndex('dependencies', 'by-targetId', targetId);
}

export async function saveDependency(dependency: Dependency): Promise<void> {
  const db = await initDB();
  await db.put('dependencies', dependency);
}

export async function deleteDependency(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('dependencies', id);
}

// ============================================================================
// Decision Record Operations
// ============================================================================

export async function getDecisionRecordsByGoalId(goalId: string): Promise<DecisionRecord[]> {
  const db = await initDB();
  return db.getAllFromIndex('decisionRecords', 'by-goalId', goalId);
}

export async function saveDecisionRecord(record: DecisionRecord): Promise<void> {
  const db = await initDB();
  await db.put('decisionRecords', record);
}

export async function deleteDecisionRecord(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('decisionRecords', id);
}

// ============================================================================
// Version History Operations
// ============================================================================

export async function getVersionHistoryByEntityId(entityId: string): Promise<VersionSnapshot[]> {
  const db = await initDB();
  const snapshots = await db.getAllFromIndex('versionHistory', 'by-entityId', entityId);
  return snapshots.sort((a, b) => b.version - a.version);
}

export async function saveVersionSnapshot(snapshot: VersionSnapshot): Promise<void> {
  const db = await initDB();
  await db.put('versionHistory', snapshot);
}

export async function getLatestVersion(entityId: string): Promise<number> {
  const snapshots = await getVersionHistoryByEntityId(entityId);
  if (snapshots.length === 0) return 0;
  return Math.max(...snapshots.map(s => s.version));
}

// ============================================================================
// Analytics Operations
// ============================================================================

export async function saveVelocityMetrics(metrics: VelocityMetrics): Promise<void> {
  const db = await initDB();
  await db.put('velocityMetrics', metrics);
}

export async function getVelocityMetrics(entityId: string): Promise<VelocityMetrics | undefined> {
  const db = await initDB();
  return db.get('velocityMetrics', entityId);
}

export async function saveEstimationAccuracy(accuracy: EstimationAccuracy): Promise<void> {
  const db = await initDB();
  await db.put('estimationAccuracy', accuracy);
}

export async function getEstimationAccuracy(entityId: string): Promise<EstimationAccuracy | undefined> {
  const db = await initDB();
  return db.get('estimationAccuracy', entityId);
}

export async function saveOutcomeQuality(quality: OutcomeQualityScore): Promise<void> {
  const db = await initDB();
  await db.put('outcomeQuality', quality);
}

export async function getOutcomeQuality(entityId: string): Promise<OutcomeQualityScore | undefined> {
  const db = await initDB();
  return db.get('outcomeQuality', entityId);
}

export async function saveTrendAnalysis(trend: TrendAnalysis): Promise<void> {
  const db = await initDB();
  await db.put('trendAnalysis', trend);
}

export async function getTrendAnalysis(userId: string = 'default'): Promise<TrendAnalysis | undefined> {
  const db = await initDB();
  return db.get('trendAnalysis', userId);
}

// ============================================================================
// Bulk Operations & Export
// ============================================================================

export interface ExportData {
  exportedAt: string;
  version: string;
  goals: Goal[];
  milestones: Milestone[];
  progressUpdates: ProgressUpdate[];
  dependencies: Dependency[];
  decisionRecords: DecisionRecord[];
  versionHistory: VersionSnapshot[];
}

export async function exportAllData(): Promise<ExportData> {
  const db = await initDB();
  
  const [goals, milestones, progressUpdates, dependencies, decisionRecords, versionHistory] = await Promise.all([
    db.getAll('goals'),
    db.getAll('milestones'),
    db.getAll('progressUpdates'),
    db.getAll('dependencies'),
    db.getAll('decisionRecords'),
    db.getAll('versionHistory'),
  ]);
  
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    goals,
    milestones,
    progressUpdates,
    dependencies,
    decisionRecords,
    versionHistory,
  };
}

export async function importData(data: ExportData): Promise<void> {
  const db = await initDB();
  
  const tx = db.transaction(
    ['goals', 'milestones', 'progressUpdates', 'dependencies', 'decisionRecords', 'versionHistory'],
    'readwrite'
  );
  
  // Import all data
  for (const goal of data.goals) {
    await tx.objectStore('goals').put(goal);
  }
  for (const milestone of data.milestones) {
    await tx.objectStore('milestones').put(milestone);
  }
  for (const update of data.progressUpdates) {
    await tx.objectStore('progressUpdates').put(update);
  }
  for (const dep of data.dependencies) {
    await tx.objectStore('dependencies').put(dep);
  }
  for (const decision of data.decisionRecords) {
    await tx.objectStore('decisionRecords').put(decision);
  }
  for (const version of data.versionHistory) {
    await tx.objectStore('versionHistory').put(version);
  }
  
  await tx.done;
}

export async function clearAllData(): Promise<void> {
  const db = await initDB();
  
  const tx = db.transaction(
    ['goals', 'milestones', 'progressUpdates', 'dependencies', 'decisionRecords', 'versionHistory', 
     'velocityMetrics', 'estimationAccuracy', 'outcomeQuality', 'trendAnalysis'],
    'readwrite'
  );
  
  await Promise.all([
    tx.objectStore('goals').clear(),
    tx.objectStore('milestones').clear(),
    tx.objectStore('progressUpdates').clear(),
    tx.objectStore('dependencies').clear(),
    tx.objectStore('decisionRecords').clear(),
    tx.objectStore('versionHistory').clear(),
    tx.objectStore('velocityMetrics').clear(),
    tx.objectStore('estimationAccuracy').clear(),
    tx.objectStore('outcomeQuality').clear(),
    tx.objectStore('trendAnalysis').clear(),
  ]);
  
  await tx.done;
}

// ============================================================================
// Recovery & Health Check
// ============================================================================

export interface DBHealthStatus {
  isHealthy: boolean;
  storeStatus: Record<string, { count: number; error?: string }>;
  errors: string[];
}

export async function checkDatabaseHealth(): Promise<DBHealthStatus> {
  const status: DBHealthStatus = {
    isHealthy: true,
    storeStatus: {},
    errors: [],
  };
  
  try {
    const db = await initDB();
    
    const stores = [
      'goals', 'milestones', 'progressUpdates', 'dependencies',
      'decisionRecords', 'versionHistory', 'velocityMetrics',
      'estimationAccuracy', 'outcomeQuality', 'trendAnalysis'
    ] as const;
    
    for (const store of stores) {
      try {
        const count = await db.count(store);
        status.storeStatus[store] = { count };
      } catch (error) {
        status.isHealthy = false;
        status.storeStatus[store] = { count: 0, error: String(error) };
        status.errors.push(`Store '${store}' error: ${error}`);
      }
    }
  } catch (error) {
    status.isHealthy = false;
    status.errors.push(`Database connection error: ${error}`);
  }
  
  return status;
}
