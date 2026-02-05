# Survey Analysis Tool

A high-performance, offline-first survey and research analysis web application built with Next.js, TypeScript, and TailwindCSS.

## Features

- **Survey Design**: Create surveys with multiple question types (multiple-choice, rating scales, numeric, text, ranking, matrix)
- **Data Import**: Import responses via CSV or JSON with comprehensive validation
- **Data Cleaning**: Remove duplicates, normalize text, standardize labels, handle missing values, flag outliers
- **Statistical Analysis**: Compute summaries, cross-tabulations, frequency distributions, confidence intervals
- **Visualization**: Interactive charts using Recharts (bar charts, pie charts, histograms)
- **Sentiment Analysis**: Analyze open-ended responses for sentiment and themes (client-side)
- **Bias Detection**: Detect straight-lining, random answering, duplicates, extreme response bias
- **Annotation System**: Tag qualitative responses with codes and themes
- **Export**: Export data as CSV, JSON, or research reports
- **Offline-First**: All data stored in IndexedDB for offline functionality

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Validation**: Zod
- **Storage**: IndexedDB (via idb)
- **CSV Parsing**: PapaParse
- **Visualization**: Recharts
- **Text Analysis**: Custom sentiment analysis (client-side)

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
repository_after/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page
│   ├── surveys/           # Survey pages
│   └── analytics/         # Analytics dashboard
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── survey/           # Survey-related components
│   ├── data/             # Data import/export components
│   └── analytics/        # Analytics and visualization components
├── lib/
│   ├── schemas/          # Zod schemas
│   ├── store/            # Zustand stores
│   ├── storage/          # IndexedDB storage layer
│   └── utils/            # Utility functions
│       ├── dataProcessing.ts
│       ├── biasDetection.ts
│       ├── sentimentAnalysis.ts
│       ├── csvImport.ts
│       ├── crossTabulation.ts
│       └── export.ts
└── package.json
```

## Usage

### Creating a Survey

1. Navigate to "Create New Survey"
2. Enter survey title and description
3. Add questions by selecting question types
4. Configure each question (options, scales, etc.)
5. Save the survey

### Importing Responses

1. Open a survey
2. Click "Import Responses"
3. Select a CSV or JSON file
4. Review import results and errors
5. Responses are automatically validated and stored

### Analyzing Data

1. View statistical summaries for each question
2. Explore visualizations (bar charts, pie charts)
3. Check bias detection results
4. Analyze sentiment for text responses
5. Add annotations to qualitative responses

### Exporting Data

1. From the survey detail page, click export buttons
2. Choose CSV, JSON, or Markdown report format
3. Files are downloaded to your device

## Data Validation

All data is validated using Zod schemas to ensure:
- Survey structure integrity
- Response format correctness
- Type safety throughout the application

## Performance

- Memoized computations for statistics
- Efficient IndexedDB queries
- Virtualized rendering for large datasets (ready for implementation)
- Web Worker support for heavy computations (ready for implementation)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Requires IndexedDB support.

## License

MIT
