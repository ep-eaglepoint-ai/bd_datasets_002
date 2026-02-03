import DataLoader from 'dataloader';

/**
 * Gateway-level DataLoader for batching entity fetches.
 * This is used to batch requests to subgraphs when resolving entities.
 */

interface EntityKey {
  __typename: string;
  id: string;
}

type BatchLoadFn = (keys: readonly EntityKey[]) => Promise<any[]>;

/**
 * Creates a DataLoader for batching entity resolution at the Gateway level.
 * @param fetcher Function that fetches entities from subgraphs
 */
export function createEntityLoader(fetcher: BatchLoadFn): DataLoader<EntityKey, any> {
  return new DataLoader(fetcher, {
    cacheKeyFn: (key: EntityKey) => `${key.__typename}:${key.id}`,
    maxBatchSize: 100,
  });
}

/**
 * Context factory for creating request-scoped DataLoaders.
 */
export class DataLoaderRegistry {
  private loaders: Map<string, DataLoader<any, any>> = new Map();

  getLoader<K, V>(name: string, batchFn: (keys: readonly K[]) => Promise<V[]>): DataLoader<K, V> {
    if (!this.loaders.has(name)) {
      this.loaders.set(name, new DataLoader(batchFn));
    }
    return this.loaders.get(name) as DataLoader<K, V>;
  }

  clearAll(): void {
    this.loaders.forEach(loader => loader.clearAll());
  }
}
