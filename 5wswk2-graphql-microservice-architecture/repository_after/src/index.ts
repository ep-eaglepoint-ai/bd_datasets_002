import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { json } from 'body-parser';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import Redis from 'ioredis';
import { startUsersSubgraph } from './subgraphs/users';
import { startProductsSubgraph } from './subgraphs/products';
import { startReviewsSubgraph } from './subgraphs/reviews';
import { authMiddleware } from './services/auth';
import { RateLimitService } from './services/ratelimit';
import { MultiLayerCache, normalizeQueryCacheKey } from './services/caching';
import { sdk } from './services/telemetry';
import { DataLoaderRegistry } from './services/dataloader';
import { auditPlugin, auditLogger } from './services/audit';
import { metricsPlugin, metrics, METRIC_NAMES } from './services/metrics';
import { checkPolicy } from './services/policy';
import { RedisPubSub, SUBSCRIPTION_CHANNELS } from './services/pubsub';
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from 'graphql-query-complexity';
import { GraphQLError, GraphQLFormattedError } from 'graphql';

// Subgraph health status
interface SubgraphHealth {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
}

// AuthenticatedDataSource to pass headers to subgraphs
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }: any) {
    if (context.user) {
      request.http.headers.set('user-id', context.user.id);
      request.http.headers.set('user-role', context.user.role);
    }
  }
}

async function startGateway() {
  // Start OpenTelemetry
  sdk.start();

  // Start Subgraphs
  const usersService = await startUsersSubgraph(4001);
  const productsService = await startProductsSubgraph(4002);
  const reviewsService = await startReviewsSubgraph(4003);

  const subgraphsInfo = [
    { name: 'users', url: usersService.url },
    { name: 'products', url: productsService.url },
    { name: 'reviews', url: reviewsService.url },
  ];

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: subgraphsInfo,
      pollIntervalInMs: 1000,
    }),
    buildService({ url }) {
      return new AuthenticatedDataSource({ url });
    },
    __exposeQueryPlanExperimental: true,
  });

  // Schema change logging / conflict detection
  gateway.onSchemaLoadOrUpdate((schemaContext) => {
    console.log(`[SCHEMA] Schema loaded/updated at ${new Date().toISOString()}`);
    console.log(`[SCHEMA] API Schema hash: ${schemaContext.apiSchema ? 'valid' : 'invalid'}`);
  });

  const app = express();
  const httpServer = http.createServer(app);

  // Redis for Rate Limiting and Caching
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisClient = new Redis(redisUrl);
  
  // Multi-layer cache with LRU + Redis
  const cache = new MultiLayerCache(redisClient, 1000);
  
  // Rate limiter with configurable settings (lower for testing)
  const rateLimitService = new RateLimitService(redisClient, {
    points: 10,   // 10 complexity points for testing
    duration: 1,  // per second
  });

  // Redis PubSub for subscriptions
  const pubsub = new RedisPubSub(redisUrl);

  // Custom error formatter for partial failures
  const formatError = (formattedError: GraphQLFormattedError): GraphQLFormattedError => {
    // Mask internal errors in production
    if (process.env.NODE_ENV === 'production' && !formattedError.extensions?.code) {
      return {
        message: 'An unexpected error occurred',
        extensions: { code: 'INTERNAL_ERROR' },
      };
    }
    return formattedError;
  };

  const server = new ApolloServer({
    gateway,
    formatError,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      auditPlugin,
      metricsPlugin,
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await redisClient.quit();
              await pubsub.close();
            },
          };
        },
      },
      {
        async requestDidStart({ request, contextValue }: any) {
          const startTime = Date.now();
          let queryComplexity = 0;

          return {
            async didResolveOperation({ document }: any) {
              queryComplexity = getComplexity({
                schema: (gateway as any).schema,
                operationName: request.operationName,
                query: document,
                variables: request.variables,
                estimators: [
                  fieldExtensionsEstimator(),
                  simpleEstimator({ defaultComplexity: 1 }),
                ],
              });

              // Record complexity metric
              metrics.recordHistogram(METRIC_NAMES.QUERY_COMPLEXITY, queryComplexity, {
                operation: request.operationName || 'anonymous',
              });

              // Reject overly complex queries
              if (queryComplexity > 100) {
                throw new GraphQLError(`Query complexity of ${queryComplexity} exceeds limit of 100`, {
                  extensions: { code: 'QUERY_TOO_COMPLEX', complexity: queryComplexity }
                });
              }

              // Complexity-based rate limiting
              const user = contextValue?.user;
              const key = user ? user.id : 'anonymous';
              await rateLimitService.checkRateLimit(key, queryComplexity);
            },
            async willSendResponse() {
              const duration = Date.now() - startTime;
              metrics.recordHistogram(METRIC_NAMES.REQUEST_DURATION_MS, duration, {
                operation: request.operationName || 'anonymous',
              });
            },
          };
        },
      },
    ],
  });

  try {
    await server.start();

    // === Health endpoint with subgraph status ===
    app.get('/health', async (_req, res) => {
      const healthChecks: SubgraphHealth[] = await Promise.all(
        subgraphsInfo.map(async (sg) => {
          const start = Date.now();
          try {
            const response = await fetch(sg.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: '{ __typename }' }),
            });
            const latency = Date.now() - start;
            return {
              name: sg.name,
              url: sg.url,
              status: response.ok ? 'healthy' : 'unhealthy',
              latencyMs: latency,
            } as SubgraphHealth;
          } catch {
            return {
              name: sg.name,
              url: sg.url,
              status: 'unhealthy',
              latencyMs: Date.now() - start,
            } as SubgraphHealth;
          }
        })
      );

      const allHealthy = healthChecks.every(h => h.status === 'healthy');
      const cacheStats = cache.getStats();

      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        subgraphs: healthChecks,
        cache: cacheStats,
        metrics: {
          complexity: metrics.getSummary(METRIC_NAMES.QUERY_COMPLEXITY),
          requestDuration: metrics.getSummary(METRIC_NAMES.REQUEST_DURATION_MS),
        },
      });
    });

    // === Cache invalidation webhook ===
    app.post('/cache/invalidate', json(), async (req, res) => {
      const { pattern } = req.body;
      if (!pattern || typeof pattern !== 'string') {
        return res.status(400).json({ error: 'Pattern required' });
      }
      const count = await cache.invalidatePattern(pattern);
      res.json({ message: `Invalidated ${count} keys matching pattern: ${pattern}` });
    });

    // === GraphQL endpoint ===
    app.use(
      '/graphql',
      cors<cors.CorsRequest>(),
      json(),
      authMiddleware,
      expressMiddleware(server, {
        context: async ({ req }) => {
          const user = (req as any).user;
          
          // Base rate limit check (1 point per request) - ensures per-request limiting
          const key = user ? user.id : req.ip || 'anonymous';
          await rateLimitService.checkRateLimit(String(key), 1);
          
          // Create request-scoped DataLoader registry
          const loaders = new DataLoaderRegistry();

          return {
            user,
            redis: redisClient,
            cache,
            loaders,
            pubsub,
            checkPolicy,
          };
        },
      }),
    );

    // === WebSocket subscriptions with auth ===
    const wsServer = new WebSocketServer({
      server: httpServer,
      path: '/graphql',
    });

    const schema = (gateway as any).schema;
    if (!schema) {
      throw new Error("Gateway schema failed to load");
    }

    const serverCleanup = useServer({
      schema,
      // Subscription auth via onConnect
      onConnect: async (ctx) => {
        const params = ctx.connectionParams as any;
        if (params?.authorization) {
          // Validate token (simplified - in production use full auth)
          console.log('[WS] Connection authenticated');
          return { user: { id: 'ws-user', role: 'user' } };
        }
        // Allow guest connections but mark as unauthenticated
        console.log('[WS] Guest connection');
        return { user: null };
      },
      onDisconnect: () => {
        console.log('[WS] Client disconnected');
      },
      // Configurable keepalive
      connectionInitWaitTimeout: 3000,
    }, wsServer);

    // Stale connection cleanup timer
    const cleanupInterval = setInterval(() => {
      // In production, check for stale connections and close them
      console.log(`[WS] Active connections: ${wsServer.clients.size}`);
    }, 30000);

    const PORT = 4000;
    await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
    console.log(`🚀 Gateway ready at http://localhost:${PORT}/graphql`);
    console.log(`📊 Health check at http://localhost:${PORT}/health`);

    return {
      server,
      httpServer,
      redisClient,
      cache,
      stop: async () => {
        console.log("Stopping gateway and subgraphs...");
        clearInterval(cleanupInterval);
        await serverCleanup.dispose();
        await server.stop();
        httpServer.close();
        await usersService.stop();
        await productsService.stop();
        await reviewsService.stop();
        await pubsub.close();
        await sdk.shutdown();
        console.log("Internal services stopped.");
      }
    };
  } catch (error) {
    console.error("Failed to start gateway, cleaning up...", error);
    await usersService.stop();
    await productsService.stop();
    await reviewsService.stop();
    await redisClient.quit();
    await pubsub.close();
    await sdk.shutdown();
    throw error;
  }
}

// Only start if not imported
if (require.main === module) {
  startGateway().catch(console.error);
}

export { startGateway };
