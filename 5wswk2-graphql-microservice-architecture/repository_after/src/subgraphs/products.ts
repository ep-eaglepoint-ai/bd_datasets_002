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

  type Product @key(fields: "id") {
    id: ID!
    name: String!
    price: Float!
  }

  type Query {
    product(id: ID!): Product
    products: [Product!]!
  }
`;

const resolvers = {
  Product: {
    __resolveReference(product: any) {
      return { id: product.id, name: `Product ${product.id}`, price: 10.99 };
    },
  },
  Query: {
    product(_: any, { id }: any) {
      return { id, name: `Product ${id}`, price: 10.99 };
    },
    products() {
      return [
        { id: "1", name: "Product 1", price: 10.99 },
        { id: "2", name: "Product 2", price: 20.99 }
      ];
    }
  },
};

export async function startProductsSubgraph(port: number) {
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
  console.log(`🚀 Products subgraph ready at ${url}`);

  return { 
    url, 
    stop: async () => {
      await server.stop();
      httpServer.close();
    } 
  };
}
