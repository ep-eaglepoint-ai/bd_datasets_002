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
import { RedisCache } from './services/caching';
import { sdk } from './services/telemetry';
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from 'graphql-query-complexity';
import { GraphQLError } from 'graphql';

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

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: 'users', url: usersService.url },
        { name: 'products', url: productsService.url },
        { name: 'reviews', url: reviewsService.url },
      ],
      pollIntervalInMs: 1000, 
    }),
    buildService({ url }) {
      return new AuthenticatedDataSource({ url });
    },
  });

  const app = express();
  const httpServer = http.createServer(app);

  // Redis for Rate Limiting and Caching
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisClient = new Redis(redisUrl);
  const rateLimitService = new RateLimitService(redisClient);

  const server = new ApolloServer({
    gateway,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await redisClient.quit();
            },
          };
        },
      },
      {
        async requestDidStart() {
          return {
            async didResolveOperation({ request, document }) {
              const complexity = getComplexity({
                schema: (gateway as any).schema,
                operationName: request.operationName,
                query: document,
                variables: request.variables,
                estimators: [
                  fieldExtensionsEstimator(),
                  simpleEstimator({ defaultComplexity: 1 }),
                ],
              });

              if (complexity > 20) { // Limit max complexity
                 throw new GraphQLError(`Query complexity of ${complexity} exceeds limit of 20`, {
                     extensions: { code: 'QUERY_TOO_COMPLEX' }
                 });
              }
              
              // Rate limit based on complexity
              // We attach the cost for the rate limiter to use later or consume here
              // For strictness, let's consume against the rate limiter here
              const key = (request as any).context?.user ? (request as any).context.user.id : (request as any).http?.headers.get('x-forwarded-for') || 'ip';
              // Note: context is not fully available here as `contextValue` in apollo 4 
              // but we handle rate limit in the express middleware context function usually. 
              // However, complexity is only known HERE.
              // So we will just validate complexity limit here.
            },
          };
        },
      },
    ],
  });

  try {
      await server.start();

      app.use(
        '/graphql',
        cors<cors.CorsRequest>(),
        json(),
        authMiddleware,
        expressMiddleware(server, {
          context: async ({ req }) => {
            const user = (req as any).user;
            const key = user ? user.id : req.ip;
            
            // Basic Rate Limit Check (consume 1 point for connection)
            // Real complexity-based rate limiting would happen inside the plugin 
            // or we would pass the limiter to the plugin.
            // For now, we enforce a base rate limit here.
            try {
                await rateLimitService.checkRateLimit(String(key), 1);
            } catch (e) {
                throw e; 
            }

            return {
              user,
              redis: redisClient,
            };
          },
        }),
      );

      const wsServer = new WebSocketServer({
        server: httpServer,
        path: '/graphql',
      });
      
      const schema = (gateway as any).schema;
      if (!schema) {
          throw new Error("Gateway schema failed to load");
      }
      
      const serverCleanup = useServer({ schema }, wsServer);

      const PORT = 4000;
      await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
      console.log(`🚀 Gateway ready at http://localhost:${PORT}/graphql`);

      return { 
        server, 
        httpServer, 
        redisClient,
        stop: async () => {
            console.log("Stopping gateway and subgraphs...");
            await serverCleanup.dispose();
            await server.stop();
            httpServer.close();
            await usersService.stop();
            await productsService.stop();
            await reviewsService.stop();
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
      await sdk.shutdown();
      throw error;
  }
}

// Only start if not imported
if (require.main === module) {
  startGateway().catch(console.error);
}

export { startGateway };
