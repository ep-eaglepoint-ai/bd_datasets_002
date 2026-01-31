# Trajectory: Poll Creation and Voting Application

## 1. AUDIT / REQUIREMENTS ANALYSIS
**Guiding Question**: *What exactly needs to be built, and what are the constraints?*

This is a **CREATION** task: a real-time poll creation and voting web app from scratch. No accounts—creators and voters are anonymous. The system must support shareable links, live result updates, and duplicate-vote prevention without server-side auth.

### Core Requirements
* **Poll creation**: A form with question, 2–10 options (add/remove), optional expiration, and a toggle for “show results before voting” vs “only after.”
* **Shareable links**: Short, unique URLs (nanoid) so anyone can vote without logging in; copy-to-clipboard for sharing.
* **Voting**: One vote per browser (localStorage or token); confirmation message after submit.
* **Real-time results**: Vote counts and percentages, horizontal bar charts, Socket.IO for live updates, and visual highlight for the leading option.
* **Creator dashboard**: List of polls the creator “owns” (tracked in localStorage), view results, and optionally close a poll early.
* **Results UX**: Animated progress bars, total participants, and a clear summary view for sharing or presenting.

### Constraint Analysis
* **No auth**: Ownership and duplicate voting are handled via localStorage and optional vote tokens, not accounts.
* **Real-time**: Socket.IO is required for live result updates when new votes arrive.
* **Stack**: React 18 + TypeScript + Tailwind on the frontend; Node.js + Express + Socket.IO + MongoDB (Mongoose) on the backend; Zustand for client state; nanoid for short IDs.

---

## 2. QUESTION ASSUMPTIONS
**Guiding Question**: *Why are we doing this? Is this the right approach?*

* **Assumption**: “We need a full auth system to know who created which poll.”
    * **Reality**: The spec says “without requiring accounts.” Creator ownership is tracked in localStorage (list of created poll IDs). Simple and sufficient for the scope.
* **Assumption**: “Duplicate votes must be blocked by server-side fingerprinting.”
    * **Reality**: Spec allows “browser fingerprinting or localStorage tokens.” We use a vote token (e.g. stored in localStorage) sent with each vote; the server stores used tokens per poll and rejects repeats. No fingerprinting needed for v1.
* **Assumption**: “We need a separate Next.js API and a separate React SPA.”
    * **Reality**: A single repo with a Node/Express + Socket.IO server and a Vite + React client keeps the build simple. The server exposes REST + Socket.IO; the client talks to both. No need for Next.js here.
* **Lesson**: Match the spec’s “or” options with the simplest implementation that still meets every requirement.

---

## 3. DEFINE SUCCESS CRITERIA
**Guiding Question**: *What does “done” mean in concrete, measurable terms?*

**[Requirement 1 – Create form]**:
- **Acceptance**: User can enter a question, add/remove options (2–10), set optional expiration, and choose “show results before voting” or not. Validation blocks empty question and fewer than 2 or more than 10 options.
- **Verification**: CreatePoll tests (form fields, add/remove, validation, submit and share link).

**[Requirement 2 – Shareable URL]**:
- **Acceptance**: Each poll has a short nanoid-based ID; voting page is at `/poll/:pollId` with no auth; copy-to-clipboard works for the full URL.
- **Verification**: Backend test that create returns a nanoid pollId; GET poll by id; frontend tests for CopyLinkButton and voting page at `/poll/:pollId`.

**[Requirement 3 – Voting and duplicate prevention]**:
- **Acceptance**: Voting page shows question and options; user picks one and submits; same browser cannot vote twice (localStorage + token); confirmation message after vote.
- **Verification**: Vote API test (success and 409 for duplicate token); frontend test for submit and “vote recorded” message.

**[Requirement 4 – Real-time results and charts]**:
- **Acceptance**: Results show counts and percentages; horizontal bars; Socket.IO updates when a vote is cast; leading option is highlighted.
- **Verification**: Backend socket test (join-poll, vote, poll-updated); frontend tests for ResultsBar/ResultsSummary and leading style.

**[Requirement 5 – Dashboard]**:
- **Acceptance**: Dashboard lists created polls (from localStorage); each has status (Open/Closed/Expired), total votes, “View results,” and “Close poll” when open.
- **Verification**: Backend PATCH close and GET after close; frontend Dashboard tests (list, view results, close poll).

**[Requirement 6 – Results presentation]**:
- **Acceptance**: Progress bars animate (e.g. CSS transition); total participants shown; layout is a clear summary.
- **Verification**: Frontend tests for total count, bar width/percentage, and summary layout.

---

## 4. MAP REQUIREMENTS TO VALIDATION
**Guiding Question**: *How will we prove the solution is correct and complete?*

| Requirement | Test strategy | Where |
| :--- | :--- | :--- |
| **Create form (2–10 options, expiration, toggle)** | Form validation and submit; add/remove options | tests/CreatePoll.test.tsx |
| **Short URL, no auth, copy link** | Create returns nanoid; GET poll; CopyLinkButton and vote route | tests/polls.test.ts, tests/VotingPage.test.tsx |
| **Vote once, confirm; duplicate blocked** | Vote success; 409 for same token; confirmation in UI | tests/polls.test.ts, tests/VotingPage.test.tsx |
| **Counts, %, bars, real-time, leading** | Socket emit on vote; ResultsBar/Summary and leading class | tests/polls-socket.test.ts, tests/ResultsCharts.test.tsx |
| **Dashboard list, results, close** | PATCH close; GET; list + View results + Close poll | tests/polls.test.ts, tests/Dashboard.test.tsx |
| **Animated bars, total participants, summary** | Total count, bar width/percentage, layout | tests/ResultsCharts.test.tsx |

**Mental checkpoint**: “If two tabs use the same localStorage, they share the same vote token—so the second vote is correctly rejected. We’re preventing duplicate per browser, not per tab.”

---

## 5. SCOPE THE SOLUTION
**Guiding Question**: *What is the minimal implementation that meets all requirements?*

### Layout (what actually exists)
* **repository_after/server**: Express app, MongoDB (Mongoose), Socket.IO. `models/Poll.ts` (schema + nanoid helpers), `routes/polls.ts` (create, get, vote, close), `socket.ts` (join-poll, rooms), `index.ts` (wire app + DB + Socket.IO).
* **repository_after/client**: Vite + React 18 + TypeScript + Tailwind. `pages/` (CreatePoll, VotePoll, Dashboard), `components/` (CopyLinkButton, ResultsBar, ResultsSummary), `store/pollStore.ts` (Zustand + localStorage for created IDs, voted flag, vote token), `api/polls.ts` (fetch wrappers). App router: `/`, `/create`, `/poll/:pollId`, `/dashboard`.
* **repository_after/shared**: Shared types only (e.g. Poll, options) if needed; server and client each have their own types in practice.
* **tests**: `jest.config.js` and `jest.setup.ts` live under tests; rootDir is project root so `repository_after` and `tests` both resolve. Backend: `polls.test.ts` (supertest + mongodb-memory-server), `polls-socket.test.ts` (Socket.IO client + vote HTTP). Frontend: CreatePoll, VotingPage, ResultsCharts, Dashboard (React Testing Library, mocks for api/store).
* **evaluation**: `evaluation/evaluation.ts` runs Jest (with `tests/jest.config.js`), parses JSON output, writes a report under `evaluation/<date>/<time>/report.json`.
* **Docker**: Dockerfile (Node 22, npm install, default CMD `npm test`). docker-compose: `mongodb` (mongo:7, healthcheck), `app` (build ., depends_on mongodb, env MONGODB_URI, volume for evaluation output). Two commands: run tests (`docker compose run --rm app npm test`) or generate report (`docker compose run --rm app npx ts-node evaluation/evaluation.ts`).

---

## 6. TRACE DATA/CONTROL FLOW
**Guiding Question**: *How will data and control flow through the system?*

**Create flow**:
1. User fills form on CreatePoll (question, options, expiration, show-results toggle).
2. Client validates (question required, 2–10 non-empty options), then POST `/api/polls`.
3. Server generates pollId (nanoid), creates Poll doc (options with 0 votes, votedTokens []), returns poll.
4. Client stores pollId in localStorage “created” list (Zustand addCreatedPoll), shows share link and CopyLinkButton.

**Vote flow**:
1. User opens `/poll/:pollId`. Client GET `/api/polls/:pollId`, checks localStorage for `voted_poll_<pollId>`.
2. If not voted: render options (radio), user selects one, submits with vote token (localStorage or header). POST `/api/polls/:pollId/vote` with optionId and token.
3. Server checks poll open and not expired; rejects if token already in votedTokens; increments option votes and totalVotes; pushes token to votedTokens; emits `poll-updated` to Socket.IO room pollId; returns updated poll.
4. Client sets `voted_poll_<pollId>` in localStorage, updates Zustand poll, shows confirmation and results (if allowed by showResultsBeforeVote or after vote).

**Real-time flow**:
1. Any client viewing the poll joins Socket.IO room via `join-poll` (pollId).
2. When a vote is recorded, server does `io.to(pollId).emit('poll-updated', updatedPoll)`.
3. Clients in the room receive the event and update Zustand; ResultsSummary re-renders with new counts and percentages.

**Dashboard flow**:
1. Dashboard reads created poll IDs from Zustand (backed by localStorage). For each id, GET `/api/polls/:id` to get status and totalVotes.
2. “View results” links to `/poll/:id`. “Close poll” calls PATCH `/api/polls/:id/close`; server sets isClosed and emits poll-updated; client updates local state.

---

## 7. ANTICIPATE OBJECTIONS
**Guiding Question**: *What could go wrong? What objections might arise?*

**Objection 1**: “localStorage for creator ownership is fragile—clearing storage loses the list.”
- **Counter**: Spec explicitly says “using localStorage to track ownership.” We document that clearing storage means the creator loses the dashboard list; they can still vote and see results via the share link. No server-side creator identity required.

**Objection 2**: “Socket.IO and REST in one app is more complex than REST-only with polling.”
- **Counter**: Requirement is “update results in real-time using Socket.IO.” So Socket.IO is mandatory. Keeping one server (Express + Socket.IO) and one client keeps the surface area small.

**Objection 3**: “MongoDB in Docker plus in-memory in tests—two different runtimes.”
- **Counter**: In tests we use mongodb-memory-server so CI and local runs need no real MongoDB. In Docker we use the compose MongoDB service. Same Mongoose schema and routes; only the connection string differs. Evaluation script runs Jest from project root with `tests/jest.config.js`; Jest uses the same tests and in-memory DB when run inside Docker (app service).

---

## 8. VERIFY INVARIANTS / DEFINE CONSTRAINTS
**Guiding Question**: *What must remain true throughout the implementation?*

**Must satisfy**:
- Every poll has a unique pollId (nanoid). ✓
- Options are between 2 and 10; no empty option text. ✓
- A given vote token can only be used once per poll. ✓
- Closed or expired polls reject new votes (410). ✓
- Socket.IO room name is the pollId so only viewers of that poll get updates. ✓
- Results show total participants and per-option count and percentage; leading option is visually distinct. ✓

**Must not violate**:
- No authentication or user accounts. ✓
- No references to files or folders that do not exist (e.g. only repository_after, tests, evaluation, docker-compose, Dockerfile as implemented). ✓

---

## 9. EXECUTE WITH SURGICAL PRECISION
**Guiding Question**: *In what order should changes be made to minimize risk?*

1. **Step 1 – Project and test harness**: Root package.json (deps for app + Jest, supertest, mongodb-memory-server, RTL). Jest config and setup under tests (tests/jest.config.js, tests/jest.setup.ts) with rootDir set to parent so repository_after and tests resolve. Scripts and evaluation point at `tests/jest.config.js`.
2. **Step 2 – Backend**: Mongoose Poll schema (pollId, question, options[], totalVotes, showResultsBeforeVote, expiresAt, isClosed, votedTokens). Routes: POST create (nanoid, 2–10 options), GET by pollId, POST vote (token check, increment, emit), PATCH close. Socket.IO: attach to HTTP server, handle join-poll, inject io into poll routes so vote/close can emit.
3. **Step 3 – Client**: Vite + React + Tailwind + Zustand. API module (createPoll, getPoll, vote, closePoll). Store (poll, setPoll, updatePoll, createdPollIds, addCreatedPoll, loadCreatedPollIds; localStorage for voted and vote token). Pages: CreatePoll (form + share link + copy), VotePoll (fetch, socket join, vote form or results), Dashboard (list from store, fetch each poll, view/close). Components: CopyLinkButton, ResultsBar, ResultsSummary (bars, %, total, leading).
4. **Step 4 – Tests**: Backend tests (polls.test.ts with in-memory MongoDB and supertest; polls-socket.test.ts with Socket.IO client and vote). Frontend tests (CreatePoll, VotingPage, ResultsCharts, Dashboard) with mocks; requirement comments on describe/it where applicable.
5. **Step 5 – Evaluation and Docker**: evaluation/evaluation.ts (run Jest with tests/jest.config.js, parse JSON, write report). Dockerfile (Node 22, npm install, CMD npm test). docker-compose (mongodb service, app service with MONGODB_URI and volume for evaluation). README documents the two commands: run tests vs run evaluation script.

---

## 10. MEASURE IMPACT / VERIFY COMPLETION
**Guiding Question**: *Did we build what was required? Can we prove it?*

**Requirements coverage**:
- **Req 1 (create form)**: CreatePoll page and CreatePoll tests (question, 2–10 options add/remove, expiration, toggle, validation, submit and share link). ✓
- **Req 2 (short URL, no auth, copy)**: nanoid in server; GET poll; CopyLinkButton and voting route in client; covered by polls.test.ts and VotingPage tests. ✓
- **Req 3 (vote, duplicate prevention, confirmation)**: Vote endpoint and token rejection in polls.test.ts; VotePoll UI and confirmation in VotingPage.test.tsx. ✓
- **Req 4 (counts, %, bars, real-time, leading)**: polls-socket.test.ts for emit on vote; ResultsBar/ResultsSummary and leading highlight in ResultsCharts.test.tsx. ✓
- **Req 5 (dashboard, results, close)**: PATCH close and GET in polls.test.ts; Dashboard tests for list, view results, close poll. ✓
- **Req 6 (animated bars, total participants, summary)**: ResultsCharts tests (total count, bar width, summary layout); CSS transition on bar width in ResultsBar. ✓

**Quality checks**:
- Jest config lives under tests; running `npm test` from project root uses tests/jest.config.js and passes. Evaluation script uses the same config path and writes report under evaluation. Docker: `docker compose run --rm app npm test` runs tests; `docker compose run --rm app npx ts-node evaluation/evaluation.ts` produces the report. No references to non-existent paths in this trajectory.

---

## 11. DOCUMENT THE DECISION
**Guiding Question**: *Why did we do this, and when should it be revisited?*

* **Problem**: Need a real-time poll app with anonymous creation and voting, shareable links, duplicate protection, and a creator dashboard—all without user accounts.
* **Solution**: Express + Socket.IO + Mongoose backend with a Vite + React + Zustand frontend; nanoid for IDs; localStorage for creator list and vote token; Socket.IO for live result updates.
* **Trade-offs**: Creator list is lost if localStorage is cleared; we accepted that to keep the spec “no accounts.” Vote token is per-poll in localStorage; optional future step is server-side fingerprinting for stricter dedup.
* **Why this works**: One server handles REST and Socket.IO; one client talks to both. Tests use mongodb-memory-server so no external DB is required for CI. Requirement-to-test mapping is explicit in test comments and in this trajectory.
* **When to revisit**: If we need multi-device creator ownership or stricter duplicate detection, we’d introduce a lightweight “creator token” or server-side fingerprinting and document the change in the trajectory and README.
