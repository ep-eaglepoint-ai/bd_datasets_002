import * as db from '@/lib/db';
import { recoverDatabase, resetDbInstance } from '@/lib/db';
import { openDB, deleteDB } from 'idb';

// Mock IDB
jest.mock('idb', () => ({
  openDB: jest.fn(),
  deleteDB: jest.fn(),
}));

describe('Database Persistence & Recovery', () => {
  const mockExportData = {
    version: '1.0.0',
    exportedAt: '2023-01-01',
    goals: [],
    milestones: [],
    progressUpdates: [],
    dependencies: [],
    decisionRecords: [],
    versionHistory: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetDbInstance();
  });

  test('should attempt to export data before resetting', async () => {
    // Setup mock DB object
    const mockDb = {
      getAll: jest.fn().mockResolvedValue([]),
      transaction: jest.fn().mockReturnValue({
        objectStore: jest.fn().mockReturnValue({
            put: jest.fn(),
            delete: jest.fn(),
            clear: jest.fn(),
        }),
        done: Promise.resolve(),
      }),
      close: jest.fn(),
    };

    // Configure openDB to return our mockDb
    (openDB as jest.Mock).mockResolvedValue(mockDb);
    
    // We mock importData because it is called by recoverDatabase and does significant logic
    // we don't want to test (or we can assert it was called).
    // importData is an exported function, but recoverDatabase calls it directly?
    // Same internal call issue applies to importData!
    // recoverDatabase calls: await importData(backup);
    // Since we cannot mock internal call, checking 'importSpy' won't work if we assume spyOn works.
    // However, importData uses initDB -> openDB. So it will run against our mockDb.
    // We can verify "importData" happened by checking if `put` was called on objectStore.
    // exportAllData calls getAll. importData calls put.
    
    // Actually we can just spy on db.importData if we accept that maybe internal calls are tricky 
    // OR we just verify side effects (put).
    
    // Wait, TypeScript transpilation often preserves export structure or references.
    // Let's try to verify via side effects on mockDb.

    const result = await recoverDatabase();

    expect(mockDb.getAll).toHaveBeenCalled(); // Proves exportAllData ran
    expect(deleteDB).toHaveBeenCalled();      // Proves deleteDB ran
    expect(mockDb.transaction).toHaveBeenCalled(); // Proves importData ran (it starts tx)
    expect(result.success).toBe(true);
  });

  test('should still reset if export fails', async () => {
    const mockDb = {
      // Make getAll fail to simulate export failure
      getAll: jest.fn().mockRejectedValue(new Error('Export Failed')),
      close: jest.fn(),
      transaction: jest.fn(),
    };
    
    (openDB as jest.Mock).mockResolvedValue(mockDb);

    const result = await recoverDatabase();

    expect(mockDb.getAll).toHaveBeenCalled();
    expect(deleteDB).toHaveBeenCalled();
    expect(result.success).toBe(true);
    // backup undefined -> importData not called -> transaction not called for import
    expect(mockDb.transaction).not.toHaveBeenCalled(); 
  });
});
