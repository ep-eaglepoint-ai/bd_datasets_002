# Trajectory

1.  **Requirements & Input Analysis**
    I started by analyzing the request to build a unified GraphQL Gateway using Apollo Federation v2. The core requirement was to compose a supergraph from multiple microservices (Users, Products, Reviews) while ensuring robust cross-cutting concerns like authentication, rate limiting, and observability. I identified that the Gateway acts as the central orchestrator, so it needed to handle strict query planning and security enforcement before requests ever reached the subgraphs.
    *   [Apollo Federation v2](https://www.apollographql.com/docs/federation/)
    *   [Apollo Gateway](https://www.apollographql.com/docs/apollo-server/using-federation/api/apollo-gateway/)

2.  **Generation Constraints**
    I established the performance and environment constraints early: the solution had to run on Node.js 20+, use Redis for distributed state (caching/rate limiting), and implement strict type safety with TypeScript. I decided to use `dataloader` within the subgraphs to prevent N+1 query issues during federated entity resolution, ensuring the system remains performant under load. I also chose `rate-limiter-flexible` for its efficient Redis-backed token bucket implementation to handle high-throughput traffic.
    *   [Node.js Rate Limiter Flexible](https://github.com/animir/node-rate-limiter-flexible)
    *   [DataLoader](https://github.com/graphql/dataloader)

3.  **Domain Model Scaffolding**
    I modeled the domain by defining three distinct subgraphs—Users, Products, and Reviews—referencing each other via Federation directives (`@key`, `@shareable`). I designed the entity relationships so that Reviews could "extend" Users and Products without tight coupling, using `__resolveReference` to hydrate entities across service boundaries. This separation of concerns allowed each subgraph to evolve independently while maintaining a cohesive API surface at the gateway.
    *   [Federation Entities](https://www.apollographql.com/docs/federation/entities/)
    *   [Apollo Server Subgraph Setup](https://www.apollographql.com/docs/apollo-server/using-federation/build-subgraph-schemas/)

4.  **Minimal, Composable Output**
    I focused on writing modular, composable code for the Gateway. I isolated specific responsibilities into dedicated services: `auth.ts` for security context extraction, `ratelimit.ts` for traffic control, and `caching.ts` for Redis integration. I used `graphql-query-complexity` to calculate query cost dynamically, ensuring that the system produces predictable output even for malicious or deeply nested queries. This keep the `index.ts` entry point clean and focused on wiring these components together.
    *   [GraphQL Query Complexity](https://github.com/slicknode/graphql-query-complexity)
    *   [GraphQL WS (Subscriptions)](https://github.com/enisdenjo/graphql-ws)

5.  **Verification**
    I prioritized correctness and maintainability by setting up a strict integration test suite in `tests/gateway.test.ts`. I established a "Test-Before" baseline to confirm the environment was clean, then implemented "Test-After" checks to verify that the Gateway correctly enforced authentication, rate limits, and resolved federated queries. I ensured that the `evaluation` script could deterministically prove compliance by running these tests in a containerized environment, guaranteeing reproducible results.
    *   [Opentelemetry JS](https://opentelemetry.io/docs/languages/js/)
    *   [Jest Testing Framework](https://jestjs.io/)

6.  **Input/Output Specs & Post-generation Validation**
    Finally, I validated the entire pipeline by defining strict Inputs (the Federation Schema) and Outputs (the JSON Audit Report). I used the `evaluation.ts` script to act as the final arbiter, parsing these outputs to confirm that every requirement—from basic connectivity to complex query rejection—was met. This step served as the post-generation validation, ensuring the deployed artifact matched the initial performance contract and domain requirements.
