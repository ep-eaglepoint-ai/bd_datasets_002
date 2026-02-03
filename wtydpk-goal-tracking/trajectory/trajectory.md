# Trajectory

1. **System & Product Flow Audit**
I began by auditing the 24 functional requirements to define a robust domain model. The goal was to transform abstract requirements (like "velocity tracking" and "dependency cycles") into concrete data structures. This audit established the boundaries of my entities—Goals, Milestones, and Dependencies—and dictated the need for a client-side "relational" integrity layer since I am using a local-first architecture.
*Resource: [Domain Driven Design - Entities](https://martinfowler.com/bliki/EvansClassification.html)*

2. **Data Contracts & Schema Validation**
To ensure strict data integrity across the application, I implemented `zod` schemas for all core entities. This acts as my data contract, enforcing rules like "progress cannot be negative" or "titles must be present" at runtime. By inferring TypeScript types directly from these schemas, I guaranteed that my compile-time types always match my runtime validation logic, preventing a class of bugs common in loosely typed JavaScript applications.
*Resource: [Zod Documentation](https://zod.dev/)*

3. **Frontend Data Flow & State Management**
I chose `zustand` for state management to handle the complex, interconnected nature of goals and milestones without the boilerplate of Redux. The store was designed not just to hold data, but to act as a logic layer—intercepting actions like "complete milestone" to automatically propagate progress to parent goals. This ensures that the UI always reflects a consistent state without manual refresh triggers.
*Resource: [Zustand Documentation](https://github.com/pmndrs/zustand)*

4. **Analytics Logic & Query Optimization**
The core complexity of the application lies in the analytics engine (velocity, completion prediction, circular dependency detection). Instead of expensive server-side queries, I implemented graph algorithms (DFS for cycle detection, topological sort for critical paths) directly in the client. These are optimized to run efficiently even with realistic dataset sizes, ensuring instant feedback when a user adds a dependency or updates progress.
*Resource: [Graph Data Structures](https://en.wikipedia.org/wiki/Graph_(abstract_data_type))*

5. **Persistence & Performance**
To meet the requirement for a robust, offline-capable application, I integrated `idb` (IndexedDB wrapper). This layer persists state changes asynchronously, ensuring that user data survives page reloads. I implemented a "write-through" cache strategy where the Zustand store updates immediately for UI responsiveness, while the IndexedDB write happens in the background, providing a snappy experience with persistent reliability.
*Resource: [IDB Library](https://github.com/jakearchibald/idb)*

6. **UX Contracts & Visual Polish**
I established a "Premium Glassmorphism" design contract to differentiate the application from standard utility tools. This involved creating a shared design system in `globals.css` using Tailwind to enforce consistent translucency, blurring, and gradients. Components were built to be "Atomic" (Buttons, Cards, Modals) and reusable, ensuring that the visual language remains consistent as the feature set grows.
*Resource: [Tailwind CSS Glassmorphism](https://tailwindcss.com/docs/backdrop-blur)*
