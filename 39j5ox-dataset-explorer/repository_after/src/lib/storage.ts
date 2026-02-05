import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Dataset, DatasetSchema } from '../types/dataset';

interface DatasetDB extends DBSchema {
  datasets: {
    key: string;
    value: Dataset;
    indexes: { 'by-name': string; 'by-uploaded': Date };
  };
  chunks: {
    key: string;
    value: {
      id: string;
      datasetId: string;
      chunkIndex: number;
      data: any[];
    };
    indexes: { 'by-dataset': string };
  };
}

class StorageManager {
  private db: IDBPDatabase<DatasetDB> | null = null;
  private readonly DB_NAME = 'DatasetExplorer';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<DatasetDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Datasets store
          const datasetStore = db.createObjectStore('datasets', {
            keyPath: 'id',
          });
          datasetStore.createIndex('by-name', 'name');
          datasetStore.createIndex('by-uploaded', 'uploadedAt');

          // Chunks store for large datasets
          const chunkStore = db.createObjectStore('chunks', {
            keyPath: 'id',
          });
          chunkStore.createIndex('by-dataset', 'datasetId');
        },
      });
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw new Error('Storage initialization failed');
    }
  }

  async saveDataset(dataset: Dataset): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Validate dataset before saving
      const validatedDataset = DatasetSchema.parse(dataset);
      
      // Split large datasets into chunks
      const CHUNK_SIZE = 1000;
      const { rawData, processedData, ...datasetMeta } = validatedDataset;
      
      // Save metadata
      await this.db.put('datasets', {
        ...datasetMeta,
        rawData: [],
        processedData: [],
      });

      // Save raw data chunks
      if (rawData.length > 0) {
        await this.saveDataChunks(dataset.id, 'raw', rawData, CHUNK_SIZE);
      }

      // Save processed data chunks
      if (processedData.length > 0) {
        await this.saveDataChunks(dataset.id, 'processed', processedData, CHUNK_SIZE);
      }
    } catch (error) {
      console.error('Failed to save dataset:', error);
      throw new Error('Dataset save failed');
    }
  }

  private async saveDataChunks(
    datasetId: string,
    type: 'raw' | 'processed',
    data: any[],
    chunkSize: number
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Clear existing chunks
    const existingChunks = await this.db.getAllFromIndex('chunks', 'by-dataset', datasetId);
    for (const chunk of existingChunks) {
      if (chunk.id.includes(`-${type}-`)) {
        await this.db.delete('chunks', chunk.id);
      }
    }

    // Save new chunks
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkId = `${datasetId}-${type}-${Math.floor(i / chunkSize)}`;
      
      await this.db.put('chunks', {
        id: chunkId,
        datasetId,
        chunkIndex: Math.floor(i / chunkSize),
        data: chunk,
      });
    }
  }

  async loadDataset(id: string): Promise<Dataset | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const dataset = await this.db.get('datasets', id);
      if (!dataset) return null;

      // Load data chunks
      const rawData = await this.loadDataChunks(id, 'raw');
      const processedData = await this.loadDataChunks(id, 'processed');

      // Convert date strings back to Date objects
      return {
        ...dataset,
        uploadedAt: new Date(dataset.uploadedAt),
        versions: dataset.versions.map(version => ({
          ...version,
          timestamp: new Date(version.timestamp),
        })),
        rawData,
        processedData,
      };
    } catch (error) {
      console.error('Failed to load dataset:', error);
      return null;
    }
  }

  private async loadDataChunks(datasetId: string, type: 'raw' | 'processed'): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const chunks = await this.db.getAllFromIndex('chunks', 'by-dataset', datasetId);
    const typeChunks = chunks
      .filter(chunk => chunk.id.includes(`-${type}-`))
      .sort((a, b) => a.chunkIndex - b.chunkIndex);

    return typeChunks.flatMap(chunk => chunk.data);
  }

  async listDatasets(): Promise<Dataset[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const datasets = await this.db.getAll('datasets');
      // Convert date strings back to Date objects
      const datasetsWithDates = datasets.map(dataset => ({
        ...dataset,
        uploadedAt: new Date(dataset.uploadedAt),
        versions: dataset.versions.map(version => ({
          ...version,
          timestamp: new Date(version.timestamp),
        })),
      }));
      return datasetsWithDates.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    } catch (error) {
      console.error('Failed to list datasets:', error);
      return [];
    }
  }

  async deleteDataset(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Delete dataset metadata
      await this.db.delete('datasets', id);

      // Delete all chunks for this dataset
      const chunks = await this.db.getAllFromIndex('chunks', 'by-dataset', id);
      for (const chunk of chunks) {
        await this.db.delete('chunks', chunk.id);
      }
    } catch (error) {
      console.error('Failed to delete dataset:', error);
      throw new Error('Dataset deletion failed');
    }
  }

  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        };
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
      }
    }
    
    return { used: 0, quota: 0 };
  }

  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.clear('datasets');
      await this.db.clear('chunks');
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw new Error('Storage clear failed');
    }
  }
}

export const storageManager = new StorageManager();