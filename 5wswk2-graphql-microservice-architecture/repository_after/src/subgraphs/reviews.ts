import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { json } from 'body-parser';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import DataLoader from 'dataloader';

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Review @key(fields: "id") {
    id: ID!
    body: String!
    author: User!
    product: Product!
  }

  type User @key(fields: "id") {
    id: ID!
    reviews: [Review!]!
  }

  type Product @key(fields: "id") {
    id: ID!
    reviews: [Review!]!
  }

  type Query {
    review(id: ID!): Review
  }
`;

// Mock Data
const reviewsData = [
    { id: "101", body: "Great product!", authorId: "1", productId: "1" },
    { id: "102", body: "Not bad", authorId: "2", productId: "1" },
    { id: "201", body: "Loved it", authorId: "1", productId: "2" }
];

// DataLoader Setup
// Batch resolver to fetch reviews for multiple User IDs or Product IDs
const reviewsByUserIdLoader = new DataLoader<string, any[]>(async (userIds) => {
    // In a real DB, this would be: SELECT * FROM reviews WHERE authorId IN (userIds)
    const reviews = userIds.map(uid => reviewsData.filter(r => r.authorId === uid));
    return reviews;
});

const reviewsByProductIdLoader = new DataLoader<string, any[]>(async (productIds) => {
    const reviews = productIds.map(pid => reviewsData.filter(r => r.productId === pid));
    return reviews;
});

const resolvers = {
  Review: {
    __resolveReference(review: any) {
      const found = reviewsData.find(r => r.id === review.id);
      return found ? { ...found } : null;
    },
    author(review: any) {
      return { __typename: "User", id: review.authorId };
    },
    product(review: any) {
      return { __typename: "Product", id: review.productId };
    }
  },
  User: {
    reviews(user: any, _: any, context: any) {
      return context.loaders.reviewsByUserId.load(user.id);
    }
  },
  Product: {
    reviews(product: any, _: any, context: any) {
      return context.loaders.reviewsByProductId.load(product.id);
    }
  },
  Query: {
    review(_: any, { id }: any) {
      const found = reviewsData.find(r => r.id === id);
      return found ? { ...found } : null;
    }
  },
};

export async function startReviewsSubgraph(port: number) {
  const app = express();
  const httpServer = http.createServer(app);
  const server = new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs, resolvers }),
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();
  
  app.use(cors(), json(), expressMiddleware(server, {
      context: async () => ({
          loaders: {
              reviewsByUserId: reviewsByUserIdLoader,
              reviewsByProductId: reviewsByProductIdLoader
          }
      })
  }));

  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
  const url = `http://localhost:${port}`;
  console.log(`🚀 Reviews subgraph ready at ${url}`);

  return { 
    url, 
    stop: async () => {
      await server.stop();
      httpServer.close();
    } 
  };
}
