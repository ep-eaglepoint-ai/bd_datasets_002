# Trajectory for Notes App (CRUD + Tags)

## Server-Side Logic

1. Set up a Node.js server with Express to handle HTTP requests.
2. Created REST endpoints for notes (GET/POST/PUT/DELETE).
3. Implemented tag aggregation to return tag counts for filtering.
4. Enabled query filtering for notes by tag via query params.
5. Validated request payloads for creating and updating notes.
6. Added basic logging for incoming requests and actions.

## Client-Side Logic

7. Bootstrapped a React application for the notes UI.
8. Built a form component to create notes with title, content, and tags.
9. Implemented a list component to render notes and enable edit/delete.
10. Added a tag filter component to filter notes by selected tag.
11. Connected the UI to the API via a dedicated notes API module.
12. Managed app state in the root component to load, create, update, and delete notes.
