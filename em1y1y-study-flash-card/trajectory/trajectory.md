# Trajectory

## Implementation Steps

1. **Analyzed the requirements** – Read through the task requirements to understand what needed to be built: a Flash Card Study web app with deck management, card creation/editing, study mode with spaced repetition, statistics tracking, and import/export functionality.

2. **Set up the Next.js project** – Initialized a new Next.js application with TypeScript and Tailwind CSS in `repository_after/flash-card-app/`.
   - Configured TypeScript with strict mode
   - Set up Tailwind CSS v4 with PostCSS
   - Created Next.js configuration for standalone output

3. **Designed data models** – Created TypeScript interfaces for:
   - `FlashCard`: Individual card with front/back content
   - `Deck`: Collection of cards with metadata and statistics
   - `StudySession`: Tracks individual study sessions
   - `CardStats`: Tracks performance metrics per card
   - `AppData`: Root data structure for localStorage

4. **Implemented localStorage persistence** – Created `src/lib/storage.ts` with functions for:
   - Loading and saving app data
   - Deck CRUD operations
   - Session tracking
   - Import/export functionality (JSON and CSV)

5. **Built utility functions** – Created `src/lib/utils.ts` with:
   - ID generation
   - Mastery percentage calculation
   - Card difficulty tracking and updates
   - Card ordering by difficulty (spaced repetition)
   - Array shuffling for random mode

6. **Created main pages**:
   - **Home page (`/`)**: Deck list with create/import/export functionality
   - **Deck page (`/deck/[id]`)**: Card management, editing, renaming
   - **Study page (`/study/[id]`)**: Interactive study mode with card flipping
   - **Stats page (`/stats/[id]`)**: Statistics, session history, accuracy trends

7. **Implemented study mode features**:
   - Card flipping (click or keyboard)
   - Mark correct/incorrect/skip
   - Progress tracking (cards reviewed, accuracy, remaining)
   - Keyboard shortcuts (Space/Enter flip, C correct, X incorrect, S skip, arrows navigate)
   - Difficulty-based card prioritization
   - Sequential and random modes

8. **Added statistics tracking**:
   - Mastery percentage per deck
   - Session-level metrics (cards reviewed, accuracy)
   - Long-term stats (total reviews, sessions)
   - Accuracy trends over time
   - Most-missed cards identification
   - Card-level performance tracking

9. **Implemented import/export**:
   - JSON export/import for full deck data
   - CSV export for card content
   - File upload support for imports

10. **Created unit and integration tests** – Built comprehensive **Jest + React Testing Library** test suite covering:
    - Deck creation, renaming, deletion
    - Card creation, editing, deletion
    - Study mode functionality (flipping, marking correct/incorrect)
    - Keyboard shortcuts
    - Progress tracking
    - Statistics display
    - Import/export
    - Difficulty prioritization
    - Tests run in **JSDOM**, no browser required

11. **Set up evaluation infrastructure**:
    - Updated Dockerfile for Node.js/Next.js
    - Updated evaluation script to run Jest tests and generate structured reports
    - Updated docker-compose.yml
    - Updated README with Docker commands

---

## Key Design Decisions

1. **LocalStorage for persistence** – Chose localStorage over a database for simplicity and offline-first approach. No authentication needed, fully self-contained.

2. **Difficulty-based prioritization** – Implemented a simple difficulty score (0-1) that increases when cards are marked incorrect and decreases when correct. Cards are sorted by difficulty and last reviewed time.

3. **Session-based tracking** – Each study session is tracked separately, allowing users to see progress within a session and review historical performance.

4. **Keyboard-first design** – Study mode is optimized for keyboard navigation to enable fast, focused studying without mouse interaction.

5. **Mobile-responsive UI** – Used Tailwind CSS with responsive breakpoints to ensure the app works well on mobile devices.

6. **Component structure** – Used Next.js App Router with client components for interactivity, keeping server components minimal.

---

## Technical Challenges Solved

1. **State management** – Used React hooks (useState, useEffect) with localStorage synchronization to maintain state across page navigations.

2. **Card difficulty algorithm** – Implemented a simple but effective difficulty tracking system that adjusts based on user performance and prioritizes difficult cards.

3. **Keyboard event handling** – Added comprehensive keyboard shortcuts with proper event handling to prevent conflicts with form inputs.

4. **Data migration** – Ensured imported decks get new IDs and updated timestamps to prevent conflicts.

5. **Progress calculation** – Calculated real-time progress during study sessions, updating UI as cards are reviewed.

6. **Unit/Integration testing** – Using **Jest + React Testing Library**, enabling automated evaluation without a browser.

---

## Verification Checklist

- ✅ Users can create, rename, delete, and organize decks  
- ✅ Users can create flash cards with front/back content  
- ✅ Users can edit and delete cards  
- ✅ Study mode allows flipping cards and marking correct/incorrect  
- ✅ System prioritizes difficult cards in future sessions  
- ✅ Session-level progress is displayed (cards reviewed, accuracy, remaining)  
- ✅ Long-term stats are tracked (mastery, review history, accuracy trends, most-missed)  
- ✅ Keyboard shortcuts work for all study actions  
- ✅ Data persists in localStorage  
- ✅ UI is clean, minimal, and mobile-friendly  
- ✅ Export/import functionality works for JSON and CSV  
- ✅ All requirements met and tested with Jest + React Testing Library  

---

## Resources Used

- [Next.js Documentation](https://nextjs.org/docs)  
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)  
- [Jest Documentation](https://jestjs.io/docs)  
- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro)  
- [React Hooks Documentation](https://react.dev/reference/react)  
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
