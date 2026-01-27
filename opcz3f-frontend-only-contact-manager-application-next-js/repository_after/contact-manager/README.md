# Contact Manager

A frontend-only Contact Manager application built with Next.js 16, TypeScript, Tailwind CSS, and IndexedDB.

## Features

- **Local Persistence**: All data is stored securely in your browser using IndexedDB. No backend required.
- **Contact Management**: Create, edit, delete, and organize contacts.
- **Advanced Fields**: Support for multiple emails, phone numbers, and custom tags.
- **Search & Filter**: Find contacts instantly by name, email, or tags.
- **Dashboard**: View statistics and recent activity.
- **Import/Export**: Backup your data to JSON/CSV or migrate from other tools.
- **Offline Ready**: Works without an internet connection (once loaded).

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Database**: IndexedDB (via `idb`)
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Toast**: Sonner

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Load Seed Data

To quickly test the application, go to **Settings** -> **Developer Tools** and click **Load Test Data**. This will populate the app with sample contacts.

## License

MIT
