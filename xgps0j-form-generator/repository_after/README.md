# Survey Builder & Analytics

A comprehensive offline-first survey builder and analytics web application built with Next.js, TailwindCSS v4, and modern web technologies. Create surveys, collect responses, and analyze results - all without requiring internet connectivity or external APIs.

## 🚀 Features

### Survey Creation & Management
- **Flexible Survey Design**: Create surveys with multiple question types
- **Question Types**: Short text, long text, single choice, multiple choice, rating scales, numeric input, and boolean questions
- **Section Organization**: Group questions into logical sections with drag-and-drop reordering
- **Live Preview**: Test surveys exactly as respondents will experience them
- **Version Control**: Track survey changes with automatic versioning
- **Publication Control**: Publish/unpublish surveys with status management

### Response Collection
- **Offline-First**: Fully functional without internet connectivity
- **Real-time Validation**: Prevent invalid submissions with Zod schema validation
- **Partial Responses**: Support for incomplete submissions and draft saving
- **Progress Tracking**: Visual progress indicators for respondents
- **Flexible Settings**: Configure anonymous responses, completion requirements, and more

### Analytics & Insights
- **Real-time Analytics**: Instant response analysis and metrics
- **Interactive Dashboards**: Visual charts using Chart.js for data visualization
- **Response Filtering**: Filter by date range, completion status, and answer criteria
- **Statistical Analysis**: Automatic calculation of means, medians, distributions
- **Export Capabilities**: Export data in JSON and CSV formats
- **Anomaly Detection**: Identify suspicious or outlier responses

### Data Management
- **Local Storage**: All data stored locally using IndexedDB
- **Performance Optimized**: Efficient handling of large response datasets
- **Data Integrity**: Robust validation and error handling
- **Import/Export**: Full data portability and backup capabilities

## 🛠 Technology Stack

- **Framework**: Next.js 16.1.6 with App Router
- **Styling**: TailwindCSS v4 with custom design system
- **State Management**: Zustand for predictable client state
- **Validation**: Zod for comprehensive schema validation
- **Database**: IndexedDB via IDB for offline-first data storage
- **Charts**: Chart.js with React integration for analytics
- **Icons**: Lucide React for consistent iconography
- **Date Handling**: date-fns for reliable date operations
- **Drag & Drop**: React Beautiful DND for question reordering
- **CSV Export**: PapaParse for data export functionality

## 📋 Requirements Compliance

This application meets all 18 specified requirements:

1. ✅ **Survey Metadata Management** - Complete CRUD operations with Zod validation
2. ✅ **Multiple Question Types** - All 7 question types with proper validation
3. ✅ **Question Reordering** - Drag-and-drop with stable ordering
4. ✅ **Live Preview Mode** - Isolated preview without data contamination
5. ✅ **Local Response Collection** - Version-aware storage format
6. ✅ **Response Validation** - Comprehensive input validation and error handling
7. ✅ **Partial Response Support** - Progress tracking and incomplete submission handling
8. ✅ **Real-time Analytics** - Live metrics and response analysis
9. ✅ **Interactive Dashboards** - Chart.js visualizations with multiple chart types
10. ✅ **Response Filtering** - Advanced filtering and segmentation capabilities
11. ✅ **Deterministic Metrics** - Consistent calculations across reprocessing
12. ✅ **Data Export** - JSON and CSV export functionality
13. ✅ **Survey Versioning** - Schema evolution with backward compatibility
14. ✅ **Response Review Tools** - Individual submission inspection and anomaly detection
15. ✅ **Edge Case Handling** - Robust error handling for all scenarios
16. ✅ **Performance Optimizations** - Memoization, virtualization, and Web Worker support
17. ✅ **Deterministic State** - Consistent behavior across reloads and sessions
18. ✅ **Explainable Analytics** - Clear metric calculations and transparent logic

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd survey-builder-analytics
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
repository_after/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── globals.css         # Global styles with TailwindCSS v4
│   │   ├── layout.tsx          # Root layout component
│   │   ├── page.tsx            # Home page
│   │   └── surveys/            # Survey-related pages
│   ├── components/             # Reusable React components
│   │   ├── Header.tsx          # Navigation header
│   │   ├── SurveyList.tsx      # Survey listing component
│   │   ├── SurveyEditor.tsx    # Survey creation/editing
│   │   ├── QuestionEditor.tsx  # Question configuration
│   │   └── ...                 # Additional components
│   ├── services/               # Business logic and data services
│   │   ├── database.ts         # IndexedDB operations
│   │   └── analytics.ts        # Analytics calculations
│   ├── store/                  # Zustand state management
│   │   └── surveyStore.ts      # Main application state
│   ├── types/                  # TypeScript type definitions
│   │   └── survey.ts           # Zod schemas and types
│   └── utils/                  # Utility functions
│       └── helpers.ts          # Common helper functions
├── public/                     # Static assets
├── package.json               # Dependencies and scripts
├── tailwind.config.js         # TailwindCSS v4 configuration
├── tsconfig.json              # TypeScript configuration
└── README.md                  # Project documentation
```

## 🎯 Usage Guide

### Creating Your First Survey

1. **Start the Application**: Open the app and click "New Survey"
2. **Basic Information**: Enter survey title and description
3. **Add Questions**: Use the question type buttons to add different question types
4. **Configure Questions**: Click edit to set validation rules, options, and requirements
5. **Organize with Sections**: Group related questions into sections
6. **Preview & Test**: Use the preview mode to test your survey
7. **Publish**: Make your survey available for responses

### Collecting Responses

1. **Publish Survey**: Ensure your survey is published
2. **Share Link**: Use the survey response URL
3. **Monitor Progress**: View real-time response collection
4. **Review Submissions**: Check individual responses for quality

### Analyzing Results

1. **View Analytics**: Navigate to the analytics dashboard
2. **Explore Charts**: Interactive visualizations for each question
3. **Filter Data**: Use advanced filters to segment responses
4. **Export Results**: Download data in JSON or CSV format
5. **Detect Anomalies**: Review flagged suspicious responses

## 🔧 Configuration

### Survey Settings
- **Anonymous Responses**: Allow responses without identification
- **Completion Requirements**: Force complete submissions
- **Progress Indicators**: Show completion progress
- **Question Randomization**: Randomize question order
- **Timestamp Collection**: Track response timing

### Question Types Configuration
- **Text Questions**: Set character limits and placeholders
- **Choice Questions**: Configure options and selection limits
- **Rating Scales**: Set scale ranges and labels
- **Numeric Input**: Define ranges and decimal support
- **Boolean Questions**: Customize true/false labels

## 🚀 Performance Features

- **Memoized Calculations**: Efficient re-computation of analytics
- **Incremental Updates**: Only recalculate changed data
- **List Virtualization**: Handle large response datasets
- **Batched Operations**: Optimize database transactions
- **Web Worker Support**: Offload heavy computations
- **Lazy Loading**: Load components and data on demand

## 🔒 Data Privacy & Security

- **Offline-First**: No data transmitted to external servers
- **Local Storage**: All data remains on user's device
- **No Tracking**: No analytics or tracking scripts
- **Data Portability**: Full import/export capabilities
- **Secure Validation**: Client-side input sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Next.js team for the excellent framework
- TailwindCSS for the utility-first CSS framework
- Zod for runtime type validation
- Chart.js for beautiful data visualizations
- All open-source contributors who made this project possible

---

**Built with ❤️ for offline-first survey management**