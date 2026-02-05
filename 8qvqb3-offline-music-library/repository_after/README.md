# Music Library Intelligence

A fully offline music library intelligence web application built with Next.js and TailwindCSS. This application provides comprehensive music library management, analytics, and discovery features without requiring any external APIs or cloud services.

## Features

### 🎵 Core Library Management
- **Import & Index**: Import local audio files (MP3, FLAC, WAV, M4A, AAC, OGG, WMA)
- **Metadata Extraction**: Automatic extraction and normalization of track metadata
- **Smart Organization**: Organize music by artist, album, genre, year, and custom tags
- **File Integrity**: Safe handling of corrupted files and missing metadata

### 🔍 Advanced Search & Discovery
- **Full-Text Search**: Fast fuzzy search across all metadata fields
- **Advanced Filtering**: Filter by genre, artist, album, year, rating, and custom criteria
- **Smart Suggestions**: Autocomplete suggestions for search queries
- **Similarity Discovery**: Find related tracks based on metadata and acoustic features

### 📊 Analytics & Insights
- **Library Statistics**: Comprehensive stats about your music collection
- **Listening Analytics**: Track play counts, listening patterns, and trends
- **Genre Distribution**: Visual breakdown of your music preferences
- **Growth Tracking**: Monitor how your library evolves over time
- **Listening Patterns**: Analyze when and how you listen to music

### 🎯 Smart Playlists
- **Rule-Based Playlists**: Create playlists that automatically update based on criteria
- **Dynamic Generation**: Auto-generated playlists for discovery and mood
- **Manual Curation**: Traditional playlist creation and management
- **Similarity Playlists**: Generate playlists based on seed tracks

### 🔄 Duplicate Detection
- **Multi-Level Detection**: Find exact, metadata-based, duration-based, and fuzzy duplicates
- **Smart Recommendations**: AI-powered suggestions for resolving duplicates
- **Quality Analysis**: Compare bitrate, file size, and play history
- **Batch Resolution**: Efficiently manage large numbers of duplicates

### 📈 Performance Optimizations
- **Virtualized Lists**: Handle thousands of tracks without performance issues
- **Incremental Indexing**: Fast import and processing of large libraries
- **Background Processing**: Web Workers for non-blocking operations
- **Memoized Selectors**: Optimized state management and rendering
- **Offline Storage**: IndexedDB for persistent, reliable data storage

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: TailwindCSS 4
- **State Management**: Zustand with persistence
- **Database**: IndexedDB for offline storage
- **Search**: Fuse.js for fuzzy search
- **Charts**: Recharts for data visualization
- **Validation**: Zod for schema validation
- **Testing**: Jest, React Testing Library
- **Audio Processing**: music-metadata (simulated in demo)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd music-library-intelligence
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Usage

### Importing Music

1. Click the "Import Music" button in the sidebar
2. Drag and drop audio files or click to browse
3. Wait for metadata extraction and processing
4. Your music will appear in the library view

### Creating Smart Playlists

1. Navigate to the Playlists view
2. Click "Create Playlist"
3. Choose "Smart Playlist" type
4. Define rules (genre, rating, play count, etc.)
5. The playlist will automatically update as your library changes

### Analyzing Your Library

1. Go to the Analytics view
2. Explore various charts and statistics:
   - Genre distribution pie chart
   - Listening patterns by hour
   - Library growth over time
   - Top tracks by various metrics

### Managing Duplicates

1. Visit the Duplicates view
2. Click "Scan for Duplicates" to detect potential duplicates
3. Review detected groups and their similarity scores
4. Choose preferred versions or follow AI recommendations
5. Resolve duplicates to clean up your library

## Architecture

### Data Flow

```
User Input → Zustand Store → Services → IndexedDB
     ↑                                      ↓
UI Components ← Computed State ← Background Processing
```

### Key Services

- **MetadataService**: Extracts and normalizes audio file metadata
- **SearchService**: Provides fast, fuzzy search capabilities
- **DuplicateDetectionService**: Identifies and analyzes duplicate tracks
- **PlaylistService**: Manages smart playlist rules and evaluation
- **AnalyticsService**: Computes statistics and insights

### Storage Strategy

- **IndexedDB**: Primary storage for tracks, playlists, and listening events
- **Zustand**: In-memory state management with selective persistence
- **Search Index**: Optimized Fuse.js index for fast search operations

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

The application includes comprehensive tests for:
- Store management and state updates
- Search functionality and filtering
- Duplicate detection algorithms
- Playlist rule evaluation
- Analytics calculations
- Utility functions

## Performance Considerations

### Large Libraries (10,000+ tracks)

- **Virtualized Scrolling**: Only renders visible items in track lists
- **Incremental Loading**: Processes imports in batches
- **Background Workers**: Offloads heavy computations
- **Memoized Selectors**: Prevents unnecessary re-computations
- **Efficient Indexing**: Optimized database queries and indexes

### Memory Management

- **Lazy Loading**: Components and data loaded on demand
- **Cleanup**: Proper cleanup of event listeners and subscriptions
- **Caching**: Strategic caching of computed values
- **Debouncing**: Prevents excessive API calls during user input

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires support for:
- IndexedDB
- Web Workers
- ES2020 features
- CSS Grid and Flexbox

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Use semantic commit messages
- Ensure accessibility compliance
- Optimize for performance

## Roadmap

### Planned Features

- **Audio Visualization**: Waveform display and spectrum analysis
- **Advanced Tagging**: Mood detection and energy level analysis
- **Export/Import**: Backup and restore library data
- **Themes**: Dark/light mode and custom themes
- **Keyboard Shortcuts**: Power user navigation
- **Plugin System**: Extensible architecture for custom features

### Performance Improvements

- **Web Assembly**: Audio processing acceleration
- **Service Workers**: Background sync and caching
- **Streaming**: Large file processing without memory issues
- **Compression**: Optimized storage formats

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [Fuse.js](https://fusejs.io/) - Fuzzy search library
- [Recharts](https://recharts.org/) - Chart library
- [Lucide React](https://lucide.dev/) - Icon library

## Support

For support, please open an issue on GitHub or contact the development team.

---

Built with ❤️ for music lovers who want complete control over their digital music libraries.