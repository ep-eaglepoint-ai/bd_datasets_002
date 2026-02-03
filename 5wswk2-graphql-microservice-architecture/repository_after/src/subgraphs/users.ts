import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { json } from 'body-parser';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type User @key(fields: "id") {
    id: ID!
    username: String! @shareable
    email: String!
  }

  type Query {
    me: User
    user(id: ID!): User
  }
`;

const resolvers = {
  User: {
    __resolveReference(user: any) {
      return { id: user.id, username: `user_${user.id}`, email: `user${user.id}@example.com` };
    },
  },
  Query: {
    me() {
      return { id: "1", username: "me", email: "me@example.com" };
    },
    user(_: any, { id }: any) {
      return { id, username: `user_${id}`, email: `user${id}@example.com` };
    }
  },
};

export async function startUsersSubgraph(port: number) {
  const app = express();
  const httpServer = http.createServer(app);
  const server = new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs, resolvers }),
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();
  app.use(cors(), json(), expressMiddleware(server));

  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
  const url = `http://localhost:${port}`;
  console.log(`🚀 Users subgraph ready at ${url}`);
  
  return { 
    url, 
    stop: async () => {
      await server.stop();
      httpServer.close();
    } 
  };
}
