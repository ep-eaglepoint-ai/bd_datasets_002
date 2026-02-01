# Engineering Process: Bulk Import Tool

## Analysis
The primary objective was to replace slow, error-prone manual data entry with a robust bulk import feature. I deconstructed the prompt into several critical mission requirements:
- **Scalable CSV Parsing**: Needed a way to handle large datasets without blocking the main thread.
- **Strict Validation**: Every row must be checked against a schema (name, email, age) with immediate feedback.
- **Data Integrity**: Only "clean" data should be sent for import, but we must also re-validate on the server to prevent bypass.
- **User Feedback**: A dashboard to show valid vs. invalid counts and a preview table highlighting specific errors.

## Strategy
I chose a **modern web architecture** using the following tools and patterns:
- **Next.js (App Router)**: Provides a seamless integration of client-side interactivity and server-side API logic.
- **Zod for Schema-First Development**: I defined a single source of truth for row data in `lib/schema.ts`. This allows the exact same validation logic to run in the browser (for immediate feedback) and in the API (for security).
- **PapaParse**: Used for fast, reliable CSV parsing in the client. It handles edge cases like quoted fields and different line endings better than a custom regex.
- **Normalization Strategy**: Implemented a normalization layer to trim whitespace and lowercase headers, making the tool resilient to common CSV formatting inconsistencies.
- **State Partitioning**: Separated the raw parsed data from the validation metrics to keep the UI responsive during large uploads.

## Execution
1.  **Library Core**: Implemented `lib/schema.ts` with a Zod schema for rows, enforcing email formats and age ranges (0-150).
2.  **Validation Logic**: Created `lib/validation.ts` with utilities for `normalizeRow`, `validateHeaders`, and `formatErrors` to convert Zod issues into human-readable field-level messages.
3.  **UI Componentry**:
    -   `CSVUploader`: Manages the file input and coordinates the parsing/validation flow.
    -   `SummaryDashboard`: Displays real-time metrics (Total, Valid, Invalid).
    -   `PreviewTable`: Renders the first 20 rows with conditional CSS classes (`error-row`) and tooltips/lists for error details.
4.  **Backend Integration**: Built `/api/import` as a Next.js Route Handler that iterates through submitted rows, applies the same normalization and Zod validation, and returns an import summary.
5.  **Aesthetics**: Applied a clean, dark-themed UI with glassmorphism effects and distinct status badges to ensure a premium feel.

## Resources
- [Zod Documentation](https://zod.dev/) - Shared schema validation.
- [PapaParse](https://www.papaparse.com/) - Browser-based CSV parsing.
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) - Server-side import logic.
- [Playwright](https://playwright.dev/) - End-to-end verification.
