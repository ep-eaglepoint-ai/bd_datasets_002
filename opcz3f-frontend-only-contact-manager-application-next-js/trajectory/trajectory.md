# Trajectory

This document outlines the thinking process and architectural decisions made during the implementation of the Frontend-Only Contact Manager, following a "Refactoring to Full-Stack" mindset (adapted for a client-side persistent application).

1. **System & Product Flow Audit**  
   We began by auditing the requirements (CRUD, Search, Import/Export) to map out the application flow. Instead of a traditional code audit, we treated the requirements list as a functionality contract. We identified that a Next.js App Router structure would provide the best scaffolding for routing and layout management, while a client-side database was needed to replace the traditional backend.  
   *Resources*: [Next.js App Router](https://nextjs.org/docs/app), [React Architecture](https://react.dev/learn/thinking-in-react)

2. **Performance, API, and UX Contracts**  
   We defined strict contracts for Data and UX before implementation. The "API" contract in this context became the interface between our persistence layer (`IndexedDB`) and the UI. We established `zod` schemas as the source of truth for data validation, ensuring that both the form input (`react-hook-form`) and the storage layer adhered to the same constraints, preventing data corruption.  
   *Resources*: [Zod Documentation](https://zod.dev/), [React Hook Form](https://react-hook-form.com/)

3.  **Data Model Refactor & State Shape**  
    We refactored the conceptual data model to handle real-world complexity, such as multiple emails and phone numbers per contact. We moved from simple object shapes to defined TypeScript interfaces and Data Transfer Objects (DTOs) utilized by the storage engine. We chose `zustand` for state management to maintain a global, reactive state shape that mirrors the database but adds UI-specific state (like `isLoading`).  
    *Resources*: [TypeScript Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html), [Zustand Guide](https://docs.pmnd.rs/zustand/getting-started/introduction)

4.  **Query Optimization & Payload Shaping**  
    Since we lack a server-side query engine, we optimized query performance by implementing efficient client-side filtering and sorting algorithms. We separated this logic into pure utility functions (`contact-utils.ts`), effectively creating a "mini-query engine" that shapes the data payload before it reaches the view layer, ensuring the UI only renders what is necessary.  
    *Resources*: [MDN Array Sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort), [Memoization in React](https://react.dev/reference/react/useMemo)

5.  **Pagination & Backend logic in UI**  
    We anticipated the need for performance scaling. While initial requirements allowed for loading all contacts, we architected the `useContactStore` to handle asynchronous data fetching. This setup mimics a backend pagination strategy, where the "cursor" would eventually be the IndexedDB key range, preparing the application for virtual scrolling or lazy loading if the dataset grows into the thousands.  
    *Resources*: [IndexedDB Concepts](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [IDB Library](https://github.com/jakearchibald/idb)

6.  **Schemas, Data Flow & Latency Budgets**  
    We finalized the architecture by strictly typing data flow from Input -> Validation -> Store -> DB. We respected "latency budgets" by implementing optimistic UI patterns (using `sonner` for immediate feedback) making the async DB operations feel instantaneous to the user. This approach ensures the application feels like a native desktop tool despite running in the browser.  
    *Resources*: [Sonner Toast](https://sonner.emilkowal.ski/), [Latency Numbers](https://gist.github.com/jboner/2841832)
