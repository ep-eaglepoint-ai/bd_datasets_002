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
import { PubSub, withFilter } from 'graphql-subscriptions';

// Local PubSub for subscriptions (in production, use Redis PubSub)
const pubsub = new PubSub();

const REVIEW_ADDED = 'REVIEW_ADDED';

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  directive @auth(requires: Role = USER) on FIELD_DEFINITION | OBJECT

  enum Role {
    ADMIN
    USER
    GUEST
  }

  type Review @key(fields: "id") {
    id: ID!
    body: String!
    author: User!
    product: Product!
    rating: Int
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
    """
    Admin-only: Get all reviews
    """
    allReviews: [Review!]! @auth(requires: ADMIN)
  }

  type Mutation {
    """
    Create a new review (requires authentication)
    """
    createReview(productId: ID!, body: String!, rating: Int): Review @auth(requires: USER)
  }

  type Subscription {
    """
    Subscribe to new reviews, optionally filtered by product ID
    """
    reviewAdded(productId: ID): Review
  }
`;

// Mock Data
const reviewsData = [
  { id: "101", body: "Great product!", authorId: "1", productId: "1", rating: 5 },
  { id: "102", body: "Not bad", authorId: "2", productId: "1", rating: 3 },
  { id: "201", body: "Loved it", authorId: "1", productId: "2", rating: 5 }
];

let nextReviewId = 300;

// DataLoader factories (request-scoped)
function createLoaders() {
  return {
    reviewsByUserId: new DataLoader<string, any[]>(async (userIds) => {
      return userIds.map(uid => reviewsData.filter(r => r.authorId === uid));
    }),
    reviewsByProductId: new DataLoader<string, any[]>(async (productIds) => {
      return productIds.map(pid => reviewsData.filter(r => r.productId === pid));
    }),
  };
}

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
    },
    allReviews(_: any, __: any, context: any) {
      // @auth directive check (simplified - real impl uses directive transformer)
      const user = context.user;
      if (!user || user.role !== 'admin') {
        throw new Error('Forbidden: Admin access required');
      }
      return reviewsData;
    }
  },
  Mutation: {
    createReview(_: any, { productId, body, rating }: any, context: any) {
      // @auth directive check
      const user = context.user;
      if (!user) {
        throw new Error('Unauthorized: Must be logged in');
      }

      const newReview = {
        id: String(nextReviewId++),
        body,
        authorId: user.id,
        productId,
        rating: rating || 0,
      };

      reviewsData.push(newReview);

      // Publish to subscription
      pubsub.publish(REVIEW_ADDED, { reviewAdded: newReview, productId });

      return newReview;
    }
  },
  Subscription: {
    reviewAdded: {
      // withFilter for subscription filtering by productId
      subscribe: withFilter(
        () => pubsub.asyncIterator([REVIEW_ADDED]),
        (payload, variables) => {
          // If productId filter is provided, only send matching reviews
          if (variables.productId) {
            return payload.productId === variables.productId;
          }
          return true;
        }
      ),
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
    context: async ({ req }) => {
      // Get user from headers (passed by Gateway)
      const userId = req.headers['user-id'] as string;
      const userRole = req.headers['user-role'] as string;

      return {
        user: userId ? { id: userId, role: userRole } : null,
        loaders: createLoaders(),
      };
    }
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
