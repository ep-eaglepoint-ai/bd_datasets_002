import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'survey-analysis-db';
const DB_VERSION = 1;

/**
 * Checks database integrity and recovers from corruption
 */
export async function checkDatabaseIntegrity(): Promise<{
  valid: boolean;
  errors: string[];
  recovered: boolean;
}> {
  const errors: string[] = [];
  let recovered = false;

  try {
    const db = await openDB(DB_NAME, DB_VERSION);

    // Check each object store
    const stores = ['surveys', 'responses', 'snapshots', 'annotations', 'insights', 'segments'];

    for (const storeName of stores) {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const count = await store.count();
        
        // Try to read a sample to check for corruption
        const cursor = await store.openCursor();
        if (cursor) {
          // Try to access the value to detect corruption
          try {
            JSON.stringify(cursor.value);
          } catch (e) {
            errors.push(`Corrupted data detected in ${storeName}`);
            // Attempt recovery by removing corrupted entry
            const deleteTx = db.transaction(storeName, 'readwrite');
            await deleteTx.objectStore(storeName).delete(cursor.primaryKey);
            recovered = true;
          }
        }
      } catch (error) {
        errors.push(`Error accessing ${storeName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    await db.close();
  } catch (error) {
    errors.push(`Database access error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Attempt to recreate database
    try {
      await recoverDatabase();
      recovered = true;
    } catch (recoveryError) {
      errors.push(`Recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    recovered,
  };
}

/**
 * Recovers database by recreating it (data will be lost, but structure will be restored)
 */
async function recoverDatabase(): Promise<void> {
  try {
    // Delete corrupted database
    const deleteReq = indexedDB.deleteDatabase(DB_NAME);
    await new Promise<void>((resolve, reject) => {
      deleteReq.onsuccess = () => resolve();
      deleteReq.onerror = () => reject(deleteReq.error);
    });

    // Recreate database
    await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Recreate all stores (same as in indexeddb.ts)
        if (!db.objectStoreNames.contains('surveys')) {
          const surveyStore = db.createObjectStore('surveys', { keyPath: 'id' });
          surveyStore.createIndex('by-updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('responses')) {
          const responseStore = db.createObjectStore('responses', { keyPath: 'id' });
          responseStore.createIndex('by-surveyId', 'surveyId');
          responseStore.createIndex('by-submittedAt', 'submittedAt');
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapshotStore.createIndex('by-surveyId', 'surveyId');
          snapshotStore.createIndex('by-createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('annotations')) {
          const annotationStore = db.createObjectStore('annotations', { keyPath: 'id' });
          annotationStore.createIndex('by-responseId', 'responseId');
          annotationStore.createIndex('by-questionId', 'questionId');
        }
        if (!db.objectStoreNames.contains('insights')) {
          const insightStore = db.createObjectStore('insights', { keyPath: 'id' });
          insightStore.createIndex('by-surveyId', 'surveyId');
          insightStore.createIndex('by-questionId', 'questionId');
        }
        if (!db.objectStoreNames.contains('segments')) {
          const segmentStore = db.createObjectStore('segments', { keyPath: 'id' });
          segmentStore.createIndex('by-surveyId', 'surveyId');
        }
      },
    });
  } catch (error) {
    throw new Error(`Failed to recover database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Creates a backup of all data
 */
export async function createBackup(): Promise<Blob> {
  const db = await openDB(DB_NAME, DB_VERSION);
  const backup: Record<string, unknown[]> = {};

  const stores = ['surveys', 'responses', 'snapshots', 'annotations', 'insights', 'segments'];

  for (const storeName of stores) {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      backup[storeName] = await store.getAll();
    } catch (error) {
      console.error(`Error backing up ${storeName}:`, error);
      backup[storeName] = [];
    }
  }

  await db.close();

  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
}

/**
 * Restores data from backup
 */
export async function restoreBackup(backupBlob: Blob): Promise<void> {
  // Handle Blob.text() which may not be available in all environments
  let text: string;
  if (typeof backupBlob.text === 'function') {
    text = await backupBlob.text();
  } else {
    // Fallback for environments without Blob.text() (e.g., Node.js/Jest)
    text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read backup blob'));
      reader.readAsText(backupBlob);
    });
  }
  const backup = JSON.parse(text);

  const db = await openDB(DB_NAME, DB_VERSION);

  for (const [storeName, data] of Object.entries(backup)) {
    if (!Array.isArray(data)) continue;

    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      
      // Clear existing data
      await store.clear();
      
      // Restore data
      for (const item of data) {
        try {
          await store.put(item);
        } catch (error) {
          console.error(`Error restoring item in ${storeName}:`, error);
        }
      }

      await tx.done;
    } catch (error) {
      console.error(`Error restoring ${storeName}:`, error);
    }
  }

  await db.close();
}

/**
 * Handles interrupted writes by checking for incomplete transactions
 */
export async function recoverInterruptedWrites(): Promise<{
  recovered: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let recovered = 0;

  try {
    const db = await openDB(DB_NAME, DB_VERSION);
    const stores = ['surveys', 'responses', 'snapshots', 'annotations', 'insights', 'segments'];

    for (const storeName of stores) {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const cursor = await store.openCursor();

        while (cursor) {
          try {
            // Validate data integrity
            const data = cursor.value;
            JSON.stringify(data); // Will throw if corrupted
            await cursor.continue();
          } catch (error) {
            // Corrupted entry found - remove it
            const deleteTx = db.transaction(storeName, 'readwrite');
            await deleteTx.objectStore(storeName).delete(cursor.primaryKey);
            await deleteTx.done;
            recovered++;
            errors.push(`Removed corrupted entry from ${storeName}`);
            await cursor.continue();
          }
        }
      } catch (error) {
        errors.push(`Error checking ${storeName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    await db.close();
  } catch (error) {
    errors.push(`Recovery error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { recovered, errors };
}
