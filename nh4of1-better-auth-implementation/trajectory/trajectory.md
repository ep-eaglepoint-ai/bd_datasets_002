1. Audit the Requirements (Minimal Scope Definition):
   I audited the requirements for a minimal authentication system. The goal was strictly username/email + password auth using Better-Auth and MongoDB, explicitly excluding OAuth, external providers, and complex features.
   Better Auth Documentation: [https://better-auth.com/docs](https://better-auth.com/docs)
   Next.js Authentication Patterns: [https://nextjs.org/docs/app/building-your-application/authentication](https://nextjs.org/docs/app/building-your-application/authentication)

2. Define the Tech Stack and Constraints
   I selected Next.js (App Router) for the framework, MongoDB for the database, and Better-Auth for the authentication logic. I strictly avoided Tailwind CSS to keep styling minimal and "vanilla" as likely preferred for a foundational example.
   MongoDB Node.js Driver best practices: [https://www.mongodb.com/docs/drivers/node/current/](https://www.mongodb.com/docs/drivers/node/current/)

3. Initialize the Project Structure
   I initialized a clean Next.js project. Due to repository constraints, I handled existing file conflicts (`__init__.py`) by briefly moving them during the `create-next-app` process, ensuring a clean scaffold without data loss.

4. Configure Database Connectivity (Singleton Pattern)
   I implemented a MongoDB connection using the Singleton pattern in `lib/mongodb.ts`. This ensures that in development mode, the database connection is preserved across hot reloads, preventing connection pool exhaustion.
   Managing MongoDB connections in Serverless/Next.js: [https://www.mongodb.com/developer/languages/javascript/nextjs-with-mongodb/](https://www.mongodb.com/developer/languages/javascript/nextjs-with-mongodb/)

5. Implement Core Authentication Logic with Better-Auth
   I configured Better-Auth in `lib/auth.ts` with the MongoDB adapter. This layer abstracts session management and security, allowing us to focus on the business logic of "signing up" and "signing in" without reinventing password hashing or session cookies.
   Better Auth MongoDB Adapter: [https://better-auth.com/docs/adapters/mongodb](https://better-auth.com/docs/adapters/mongodb)

6.  Expose Authentication APIs
    I created the necessary API routes in `app/api/auth/[...all]/route.ts`. This enables the client-side hooks to communicate securely with the backend for session validation, login, and registration.

7.  Build Safe Client-Side Interactions
    I implemented `lib/auth-client.ts` to instantiate the Better-Auth client. This allows UI components to reactively check session state (`useSession`) and perform actions (`signIn`, `signUp`) without exposing sensitive server-side logic.

8.  Construct the User Interface (Sign Up & Sign In)
    I built dedicated pages for Sign Up and Sign In. I used standard HTML forms with React state management to capture credentials and pass them to the auth client, providing immediate user feedback on success or error.
    React Forms Best Practices: [https://react.dev/reference/react-dom/components/input](https://react.dev/reference/react-dom/components/input)

9.  Implement Protected Routes (Server-Side Verification)
    I created a dashboard page that strictly enforces authentication. By checking the session on the server side (`auth.api.getSession`) within the App Router, we ensure that unauthenticated requests are redirected *before* any sensitive data is rendered.

10. Verify with Comprehensive Static Testing
    I established a robust test suite in the `tests/` directory using TypeScript. I wrote 7 distinct tests to verify every constraint (e.g., "No OAuth", "MongoDB Usage", "No External Services") via static analysis of the codebase, ensuring the implementation strictly adhered to the "minimal" and "custom-only" mandate.
