# System & Product Flow Audit
I started by rigorously auditing the rules of Three Men's Morris to understand the distinct game phases: Placement and Movement. I mapped out the state transitions—from an empty board to placing pieces, then switching to movement logic once six pieces are on the board, and finally detecting win conditions (orthogonal and diagonal). This ensured the "product flow" was fully defined before a single line of code was written, preventing logic regressions later.
*Resource: [Three Men's Morris Rules](https://en.wikipedia.org/wiki/Three_Men%27s_Morris)*

# API, UX, and Data Contracts
I defined strict TypeScript interfaces (`GameState`, `Player`, `Cell`) to act as the "contract" between the game logic and the UI components. This ensured that the `GameBoard` and `Cell` components received exactly the data they needed (e.g., `currentPlayer`, `legalMoves`) without being coupled to the internal logic of *how* that data was derived, effectively behaving like an API contract within the frontend application.
*Resource: [TypeScript Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html), [React Props as Contracts](https://react.dev/learn/passing-props-to-a-component)*

# DTOs and Frontend State Shape
Refactoring the conceptual model into a concrete frontend state shape, I leveraged a custom React hook (`useGameState`) to encapsulate the data model. This hook acts similarly to a DTO (Data Transfer Object), exposing only the necessary state (`board` array, `status` string) and action handlers (`handleCellClick`, `resetGame`) to the view layer, keeping the component tree clean and focused solely on rendering.
*Resource: [React Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks), [State Shape Design](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape)*

# API Payload Shaping
I optimized the "payload" of logic operations by creating pure utility functions for expensive calculations like `checkWinner` and `getLegalMoves`. Instead of recalculating these on every render within the component, they are derived only when the state changes. This approach mimics API payload shaping by ensuring the frontend receives pre-computed, efficient data structures (e.g., returning indices of legal moves directly).
*Resource: [Pure Functions in JavaScript](https://medium.com/@jamesjefferyuk/javascript-what-are-pure-functions-4d4d5392d49c), [React Memoization](https://react.dev/reference/react/useMemo)*

# Backend + UI Pagination/Flow
I treated the transition between the "Placement" phase and "Movement" phase like a pagination or state machine flow. The UI dynamically adjusts its interactivity—disabling piece selection during placement and enabling it during movement—ensuring the user is guided through the "pages" of the game loop without overwhelming them with invalid options. This provides a distinct, managed flow similar to backend-driven pagination.
*Resource: [Finite State Machines in UI](https://xstate.js.org/docs/guides/introduction-to-state-machines-and-statecharts/), [Conditional Rendering](https://react.dev/learn/conditional-rendering)*

# API Schemas, Data Flow, and Latency Budgets
Finally, I verified the entire system using a rigorous testing suite (`tests/`) and Dockerized environment, acting as the schema validation for my application. By enforcing pass/fail conditions on `implementation_after` (while confirming `implementation_before` fails), I established a "latency budget" for logic correctness—ensuring that no matter how complex the rule variants (like diagonal wins) became, the data flow remained valid and the application performed predictably under test conditions.
*Resource: [Jest Testing Framework](https://jestjs.io/docs/getting-started), [Docker for Development](https://docs.docker.com/get-started/)*
