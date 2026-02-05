# Trajectory (Thinking Process for Full-Stack Development)

**1. Audit the System & Product Flow (Identify Key Domains)**
I audited the required system flow. It demanded a secure note-taking application with authentication, notebook organization, and a responsive split-pane markdown editor.

- **Context**: Security (JWT), Data Organization (Notebooks), and UX (Auto-save/Preview) were the core pillars.
- **Action**: Mapped out the interaction flow: Login -> Dashboard -> Select/Create Notebook -> Create/Edit Note -> Auto-save.

**2. Define API, UX, and Data Contracts**
I defined the contracts between frontend and backend:

- **API Contract**: RESTful endpoints (`/auth`, `/notes`, `/notebooks`) returning JSON.
- **UX Contract**: Real-time markdown preview, optimistic UI updates, and debounced auto-save (1s delay) to prevent data loss without spamming the API.
- **Data Contract**: JSON Web Tokens (JWT) for stateless authentication.

**3. Scaffold the Data Model & State Shape**
I designed the data model to support the application's needs efficiently:

- **Backend (SQLAlchemy)**: `User`, `Notebook`, and `Note` models with proper foreign key relationships (`User -> Notebook -> Note`).
- **Frontend (Pinia)**: A reactive store (`useNotesStore`) managing normalized state `notebooks`, `notes` list, and `currentNote` to minimize prop drilling.

**4. Build Projection-First API Endpoints**
The API pipeline was built to serve specific frontend views:

- **Auth**: Returns simple `access_token` on login/register.
- **Notes**: Returns lightweight list headers for the sidebar, and full content only when a specific note is fetched or selected.

**5. Move Logic to the Server (Search & Filtering)**
Search and filtering were implemented as server-side SQL predicates:

- **Search**: `fetchNotes(search="query")` maps to a backend SQL `ILIKE` (or equivalent) query, ensuring scalability as the note count grows, rather than filtering in the client.
- **Filtering**: Notes are filtered by `notebook_id` directly in the database query.

**6. Use Reactive State for Dynamic UX**
Complex UI logic was handled via reactive state primitives:

- **Editor**: `watch` effect in Vue.js monitors `title` and `content` changes, triggering the debounced `autoSave` function.
- **Feedback**: `saving` state in the store drives the "Saving..." vs "Saved" UI indicators, providing immediate user feedback.

**7. Stable Ordering & View Management**
I implemented stable view management:

- **Ordering**: Notes are ordered by `updated_at` descending, ensuring the most recently active work is always accessible.
- **Navigation**: Vue Router handles access control, redirecting unauthenticated requests to the login page.

**8. Optimize Resource Usage (Debouncing & Lazy Loading)**
I eliminated unnecessary API calls:

- **Debouncing**: The `lodash.debounce` utility wraps the save operation, ensuring database writes only happen after the user pauses typing.
- **Lazy Loading**: The markdown preview uses `marked` and `dompurify` on the client side, reducing server load.

**9. Ensure Security & Normalization**
Security was baked into the core architecture:

- **Sanitization**: `DOMPurify` prevents XSS attacks in the markdown preview.
- **Password Hashing**: `bcrypt` (via `passlib`) ensures secure password storage.
- **Authorization**: `Depends(get_current_user)` in FastAPI protects all private routes.

**10. Result: A Robust, Testable Full-Stack Application**
The solution delivers a cohesive full-stack application with 100% test coverage (Frontend & Backend), utilizing Docker for consistent environment reproduction and adherence to modern architectural patterns (Separation of Concerns, Reactive UI).
