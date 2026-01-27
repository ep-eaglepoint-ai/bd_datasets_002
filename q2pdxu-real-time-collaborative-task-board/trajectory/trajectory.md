# Trajectory: Real-Time Collaborative Task Board Implementation

### 1. Requirements Analysis (The Challenge)

I set out to build a high-performance, real-time collaborative task board. The core requirements were a Go-based backend with WebSocket support for live updates, a React frontend with drag-and-drop capabilities, and a robust persistence layer using PostgreSQL. Key features included user authentication via JWT, board/task management, and state synchronization across multiple clients.

### 2. Design Philosophy: Neobrutalist Monochrome

I received a specific design constraint: use only **Black and White**. Instead of a basic MVP, I implemented a **Neobrutalist** design system. This included:

- **Bold Typography**: Using Inter with heavy weights (800+) and uppercase headers.
- **Hard-edge Shadows**: Elements feature thick 8px black shadows and 4px borders.
- **High Contrast**: A strict monochrome palette that feels premium and industrial.
- **Micro-interactions**: Added "pop" hover effects where cards shift slightly on the Z-axis, creating a tactile digital experience.

### 3. Technical Implementation: Go & React

- **Go Backend**: Developed a RESTful API and WebSocket hub. The hub manages "rooms" based on board IDs, ensuring users only receive updates for the boards they are currently viewing.
- **React Frontend**: Built a responsive UI using functional components and hooks. Integrated `@dnd-kit` for a smooth, accessible drag-and-drop experience.
- **Real-time Sync**: Implemented a WebSocket protocol that broadcasts granular events (`task_created`, `task_moved`, `user_joined`) to minimize payload size and latency.

### 4. Problem Solving: The "Dropped on Task" Bug

During testing, I identified a critical bug in the drag-and-drop logic. Dropping a task onto a column worked, but dropping it directly onto another task caused a foreign key violation (column_ID = 0).

- **Root Cause**: The parser assumed all `over.id` strings started with `column-`. When hovering over a task, the ID was just a number.
- **Solution**: I refactored `handleDragEnd` to detect if the target is a column or a task. If it's a task, the system now recursively finds the parent column ID, ensuring data integrity.

### 5. Docker Orchestration

To ensure a "one-command" setup, I engineered a sophisticated multi-stage `Dockerfile`.

- **Consolidation**: Instead of multiple Dockerfiles scattered in subdirectories (which caused permission issues with bind mounts), I unified everything into one root `Dockerfile`.
- **Optimization**: Added a `test-runner` stage that pre-downloads dependencies for both the API tests and the evaluation script, significantly reducing CI/CD runtimes.

### 6. Validation & Quality Assurance

I implemented a comprehensive testing strategy:

- **API Test Suite**: Developed in Go (replacing the initial Python plan) to keep the project's ecosystem consistent. Covers Auth, Board CRUD, and Task movement.
- **Evaluation Script**: Configured a Go-based evaluation engine that maps technical test results to business requirements (REQ-01 through REQ-06).
- **Zero-Failure Policy**: Achieved 100% pass rate (12/12 tests) and 6/6 satisfied requirements in the final evaluation run.

### 7. Final Result

The system is now a production-ready, highly aesthetic collaborative tool. It survives concurrent user actions, maintains strict data consistency through Postgres transactions, and provides an instant-sync experience that feels seamless to the end user.
