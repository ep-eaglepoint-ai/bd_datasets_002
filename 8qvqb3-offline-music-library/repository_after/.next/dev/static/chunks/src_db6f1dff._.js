(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/db/indexed-db.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "dbManager",
    ()=>dbManager
]);
const DB_NAME = 'MusicLibraryDB';
const DB_VERSION = 1;
class IndexedDBManager {
    db = null;
    initPromise = null;
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }
        this.initPromise = new Promise((resolve, reject)=>{
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = ()=>reject(request.error);
            request.onsuccess = ()=>{
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (event)=>{
                const db = event.target.result;
                // Tracks store
                if (!db.objectStoreNames.contains('tracks')) {
                    const tracksStore = db.createObjectStore('tracks', {
                        keyPath: 'id'
                    });
                    tracksStore.createIndex('artist', 'artist', {
                        unique: false
                    });
                    tracksStore.createIndex('album', 'album', {
                        unique: false
                    });
                    tracksStore.createIndex('genre', 'genre', {
                        unique: false
                    });
                    tracksStore.createIndex('year', 'year', {
                        unique: false
                    });
                    tracksStore.createIndex('fileHash', 'fileHash', {
                        unique: false
                    });
                    tracksStore.createIndex('dateAdded', 'dateAdded', {
                        unique: false
                    });
                    tracksStore.createIndex('playCount', 'playCount', {
                        unique: false
                    });
                }
                // Playlists store
                if (!db.objectStoreNames.contains('playlists')) {
                    const playlistsStore = db.createObjectStore('playlists', {
                        keyPath: 'id'
                    });
                    playlistsStore.createIndex('type', 'type', {
                        unique: false
                    });
                    playlistsStore.createIndex('dateCreated', 'dateCreated', {
                        unique: false
                    });
                }
                // Listening events store
                if (!db.objectStoreNames.contains('listeningEvents')) {
                    const eventsStore = db.createObjectStore('listeningEvents', {
                        keyPath: 'id'
                    });
                    eventsStore.createIndex('trackId', 'trackId', {
                        unique: false
                    });
                    eventsStore.createIndex('timestamp', 'timestamp', {
                        unique: false
                    });
                    eventsStore.createIndex('source', 'source', {
                        unique: false
                    });
                }
                // Duplicate groups store
                if (!db.objectStoreNames.contains('duplicateGroups')) {
                    const duplicatesStore = db.createObjectStore('duplicateGroups', {
                        keyPath: 'id'
                    });
                    duplicatesStore.createIndex('resolved', 'resolved', {
                        unique: false
                    });
                    duplicatesStore.createIndex('duplicateType', 'duplicateType', {
                        unique: false
                    });
                }
                // Metadata cache store for search optimization
                if (!db.objectStoreNames.contains('searchCache')) {
                    db.createObjectStore('searchCache', {
                        keyPath: 'key'
                    });
                }
            };
        });
        return this.initPromise;
    }
    ensureDB() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db;
    }
    // Tracks operations
    async addTrack(track) {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'tracks'
        ], 'readwrite');
        const store = transaction.objectStore('tracks');
        await new Promise((resolve, reject)=>{
            const request = store.add(track);
            request.onsuccess = ()=>resolve();
            request.onerror = ()=>reject(request.error);
        });
    }
    async updateTrack(track) {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'tracks'
        ], 'readwrite');
        const store = transaction.objectStore('tracks');
        await new Promise((resolve, reject)=>{
            const request = store.put(track);
            request.onsuccess = ()=>resolve();
            request.onerror = ()=>reject(request.error);
        });
    }
    async getTrack(id) {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'tracks'
        ], 'readonly');
        const store = transaction.objectStore('tracks');
        return new Promise((resolve, reject)=>{
            const request = store.get(id);
            request.onsuccess = ()=>resolve(request.result || null);
            request.onerror = ()=>reject(request.error);
        });
    }
    async getAllTracks() {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'tracks'
        ], 'readonly');
        const store = transaction.objectStore('tracks');
        return new Promise((resolve, reject)=>{
            const request = store.getAll();
            request.onsuccess = ()=>resolve(request.result);
            request.onerror = ()=>reject(request.error);
        });
    }
    async getTracksByIndex(indexName, value) {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'tracks'
        ], 'readonly');
        const store = transaction.objectStore('tracks');
        const index = store.index(indexName);
        return new Promise((resolve, reject)=>{
            const request = index.getAll(value);
            request.onsuccess = ()=>resolve(request.result);
            request.onerror = ()=>reject(request.error);
        });
    }
    async deleteTrack(id) {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'tracks'
        ], 'readwrite');
        const store = transaction.objectStore('tracks');
        await new Promise((resolve, reject)=>{
            const request = store.delete(id);
            request.onsuccess = ()=>resolve();
            request.onerror = ()=>reject(request.error);
        });
    }
    // Playlists operations
    async addPlaylist(playlist) {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'playlists'
        ], 'readwrite');
        const store = transaction.objectStore('playlists');
        await new Promise((resolve, reject)=>{
            const request = store.add(playlist);
            request.onsuccess = ()=>resolve();
            request.onerror = ()=>reject(request.error);
        });
    }
    async updatePlaylist(playlist) {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'playlists'
        ], 'readwrite');
        const store = transaction.objectStore('playlists');
        await new Promise((resolve, reject)=>{
            const request = store.put(playlist);
            request.onsuccess = ()=>resolve();
            request.onerror = ()=>reject(request.error);
        });
    }
    async getAllPlaylists() {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'playlists'
        ], 'readonly');
        const store = transaction.objectStore('playlists');
        return new Promise((resolve, reject)=>{
            const request = store.getAll();
            request.onsuccess = ()=>resolve(request.result);
            request.onerror = ()=>reject(request.error);
        });
    }
    async deletePlaylist(id) {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'playlists'
        ], 'readwrite');
        const store = transaction.objectStore('playlists');
        await new Promise((resolve, reject)=>{
            const request = store.delete(id);
            request.onsuccess = ()=>resolve();
            request.onerror = ()=>reject(request.error);
        });
    }
    // Listening events operations
    async addListeningEvent(event) {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'listeningEvents'
        ], 'readwrite');
        const store = transaction.objectStore('listeningEvents');
        await new Promise((resolve, reject)=>{
            const request = store.add(event);
            request.onsuccess = ()=>resolve();
            request.onerror = ()=>reject(request.error);
        });
    }
    async getListeningEvents(trackId, limit) {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'listeningEvents'
        ], 'readonly');
        const store = transaction.objectStore('listeningEvents');
        return new Promise((resolve, reject)=>{
            let request;
            if (trackId) {
                const index = store.index('trackId');
                request = index.getAll(trackId);
            } else {
                request = store.getAll();
            }
            request.onsuccess = ()=>{
                let result = request.result;
                if (limit) {
                    result = result.slice(-limit); // Get most recent events
                }
                resolve(result);
            };
            request.onerror = ()=>reject(request.error);
        });
    }
    // Duplicate groups operations
    async addDuplicateGroup(group) {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'duplicateGroups'
        ], 'readwrite');
        const store = transaction.objectStore('duplicateGroups');
        await new Promise((resolve, reject)=>{
            const request = store.add(group);
            request.onsuccess = ()=>resolve();
            request.onerror = ()=>reject(request.error);
        });
    }
    async updateDuplicateGroup(group) {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'duplicateGroups'
        ], 'readwrite');
        const store = transaction.objectStore('duplicateGroups');
        await new Promise((resolve, reject)=>{
            const request = store.put(group);
            request.onsuccess = ()=>resolve();
            request.onerror = ()=>reject(request.error);
        });
    }
    async getAllDuplicateGroups() {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'duplicateGroups'
        ], 'readonly');
        const store = transaction.objectStore('duplicateGroups');
        return new Promise((resolve, reject)=>{
            const request = store.getAll();
            request.onsuccess = ()=>resolve(request.result);
            request.onerror = ()=>reject(request.error);
        });
    }
    // Cache operations for search optimization
    async setCache(key, value) {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'searchCache'
        ], 'readwrite');
        const store = transaction.objectStore('searchCache');
        await new Promise((resolve, reject)=>{
            const request = store.put({
                key,
                value,
                timestamp: Date.now()
            });
            request.onsuccess = ()=>resolve();
            request.onerror = ()=>reject(request.error);
        });
    }
    async getCache(key) {
        const db = this.ensureDB();
        const transaction = db.transaction([
            'searchCache'
        ], 'readonly');
        const store = transaction.objectStore('searchCache');
        return new Promise((resolve, reject)=>{
            const request = store.get(key);
            request.onsuccess = ()=>{
                const result = request.result;
                if (result && Date.now() - result.timestamp < 300000) {
                    resolve(result.value);
                } else {
                    resolve(null);
                }
            };
            request.onerror = ()=>reject(request.error);
        });
    }
}
const dbManager = new IndexedDBManager();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/services/search-service.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "searchService",
    ()=>searchService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fuse$2e$js$2f$dist$2f$fuse$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/fuse.js/dist/fuse.mjs [app-client] (ecmascript)");
;
class SearchService {
    fuse = null;
    tracks = [];
    fuseOptions = {
        keys: [
            {
                name: 'title',
                weight: 0.3
            },
            {
                name: 'artist',
                weight: 0.25
            },
            {
                name: 'album',
                weight: 0.2
            },
            {
                name: 'genre',
                weight: 0.1
            },
            {
                name: 'customTags',
                weight: 0.1
            },
            {
                name: 'mood',
                weight: 0.05
            }
        ],
        threshold: 0.4,
        includeScore: true,
        includeMatches: true,
        minMatchCharLength: 2
    };
    initialize(tracks) {
        this.tracks = tracks;
        this.fuse = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fuse$2e$js$2f$dist$2f$fuse$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"](tracks, this.fuseOptions);
    }
    addTracks(newTracks) {
        this.tracks = [
            ...this.tracks,
            ...newTracks
        ];
        this.fuse = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fuse$2e$js$2f$dist$2f$fuse$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"](this.tracks, this.fuseOptions);
    }
    updateTrack(updatedTrack) {
        const index = this.tracks.findIndex((track)=>track.id === updatedTrack.id);
        if (index !== -1) {
            this.tracks[index] = updatedTrack;
            this.fuse = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fuse$2e$js$2f$dist$2f$fuse$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"](this.tracks, this.fuseOptions);
        }
    }
    removeTrack(trackId) {
        this.tracks = this.tracks.filter((track)=>track.id !== trackId);
        this.fuse = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fuse$2e$js$2f$dist$2f$fuse$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"](this.tracks, this.fuseOptions);
    }
    search(query, filters = {}) {
        if (!this.fuse) {
            return [];
        }
        let results;
        // Perform fuzzy search
        if (query.trim()) {
            const fuseResults = this.fuse.search(query);
            results = fuseResults.map((result)=>result.item);
        } else {
            results = [
                ...this.tracks
            ];
        }
        // Apply filters
        results = this.applyFilters(results, filters);
        return results;
    }
    applyFilters(tracks, filters) {
        return tracks.filter((track)=>{
            // Genre filter
            if (filters.genre && track.genre !== filters.genre) {
                return false;
            }
            // Artist filter
            if (filters.artist && track.artist !== filters.artist) {
                return false;
            }
            // Album filter
            if (filters.album && track.album !== filters.album) {
                return false;
            }
            // Year filter
            if (filters.year && track.year !== filters.year) {
                return false;
            }
            // Rating filter
            if (filters.rating && track.rating !== filters.rating) {
                return false;
            }
            return true;
        });
    }
    // Advanced search with compound queries
    advancedSearch(searchParams) {
        return this.tracks.filter((track)=>{
            // Title search
            if (searchParams.title && !track.title.toLowerCase().includes(searchParams.title.toLowerCase())) {
                return false;
            }
            // Artist search
            if (searchParams.artist && !track.artist.toLowerCase().includes(searchParams.artist.toLowerCase())) {
                return false;
            }
            // Album search
            if (searchParams.album && !track.album.toLowerCase().includes(searchParams.album.toLowerCase())) {
                return false;
            }
            // Genre search
            if (searchParams.genre && track.genre !== searchParams.genre) {
                return false;
            }
            // Year range
            if (searchParams.yearRange && track.year) {
                const [minYear, maxYear] = searchParams.yearRange;
                if (track.year < minYear || track.year > maxYear) {
                    return false;
                }
            }
            // Rating range
            if (searchParams.ratingRange && track.rating) {
                const [minRating, maxRating] = searchParams.ratingRange;
                if (track.rating < minRating || track.rating > maxRating) {
                    return false;
                }
            }
            // Play count range
            if (searchParams.playCountRange) {
                const [minCount, maxCount] = searchParams.playCountRange;
                if (track.playCount < minCount || track.playCount > maxCount) {
                    return false;
                }
            }
            // Custom tags
            if (searchParams.customTags && searchParams.customTags.length > 0) {
                const hasAllTags = searchParams.customTags.every((tag)=>track.customTags.some((trackTag)=>trackTag.toLowerCase().includes(tag.toLowerCase())));
                if (!hasAllTags) {
                    return false;
                }
            }
            // Mood
            if (searchParams.mood && track.mood !== searchParams.mood) {
                return false;
            }
            return true;
        });
    }
    // Get suggestions for autocomplete
    getSuggestions(field, query, limit = 10) {
        const values = new Set();
        this.tracks.forEach((track)=>{
            const value = track[field];
            if (typeof value === 'string' && value.toLowerCase().includes(query.toLowerCase())) {
                values.add(value);
            } else if (Array.isArray(value)) {
                value.forEach((item)=>{
                    if (typeof item === 'string' && item.toLowerCase().includes(query.toLowerCase())) {
                        values.add(item);
                    }
                });
            }
        });
        return Array.from(values).slice(0, limit).sort();
    }
    // Get unique values for filter dropdowns
    getUniqueValues(field) {
        const values = new Set();
        this.tracks.forEach((track)=>{
            const value = track[field];
            if (typeof value === 'string' && value) {
                values.add(value);
            } else if (Array.isArray(value)) {
                value.forEach((item)=>{
                    if (typeof item === 'string' && item) {
                        values.add(item);
                    }
                });
            }
        });
        return Array.from(values).sort();
    }
    // Search within specific playlist
    searchInPlaylist(query, trackIds) {
        const playlistTracks = this.tracks.filter((track)=>trackIds.includes(track.id));
        if (!query.trim()) {
            return playlistTracks;
        }
        const playlistFuse = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fuse$2e$js$2f$dist$2f$fuse$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"](playlistTracks, this.fuseOptions);
        const results = playlistFuse.search(query);
        return results.map((result)=>result.item);
    }
}
const searchService = new SearchService();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/services/duplicate-detection-service.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "duplicateDetectionService",
    ()=>duplicateDetectionService
]);
class DuplicateDetectionService {
    // Detect exact duplicates by file hash
    detectExactDuplicates(tracks) {
        const hashGroups = new Map();
        tracks.forEach((track)=>{
            // Skip tracks without fileHash
            if (!track.fileHash) return;
            const existing = hashGroups.get(track.fileHash) || [];
            existing.push(track);
            hashGroups.set(track.fileHash, existing);
        });
        const duplicateGroups = [];
        hashGroups.forEach((groupTracks, hash)=>{
            if (groupTracks.length > 1) {
                duplicateGroups.push({
                    id: crypto.randomUUID(),
                    trackIds: groupTracks.map((t)=>t.id),
                    similarityScore: 1.0,
                    duplicateType: 'exact',
                    resolved: false
                });
            }
        });
        return duplicateGroups;
    }
    // Detect metadata-based duplicates
    detectMetadataDuplicates(tracks) {
        const duplicateGroups = [];
        const processed = new Set();
        for(let i = 0; i < tracks.length; i++){
            if (processed.has(tracks[i].id)) continue;
            const currentTrack = tracks[i];
            const similarTracks = [
                currentTrack
            ];
            processed.add(currentTrack.id);
            for(let j = i + 1; j < tracks.length; j++){
                if (processed.has(tracks[j].id)) continue;
                const compareTrack = tracks[j];
                const similarity = this.calculateMetadataSimilarity(currentTrack, compareTrack);
                if (similarity >= 0.9) {
                    similarTracks.push(compareTrack);
                    processed.add(compareTrack.id);
                }
            }
            if (similarTracks.length > 1) {
                duplicateGroups.push({
                    id: crypto.randomUUID(),
                    trackIds: similarTracks.map((t)=>t.id),
                    similarityScore: this.calculateGroupSimilarity(similarTracks),
                    duplicateType: 'metadata',
                    resolved: false
                });
            }
        }
        return duplicateGroups;
    }
    // Detect duration-based duplicates (same duration, similar metadata)
    detectDurationDuplicates(tracks) {
        const duplicateGroups = [];
        const processed = new Set();
        for(let i = 0; i < tracks.length; i++){
            if (processed.has(tracks[i].id)) continue;
            const currentTrack = tracks[i];
            const similarTracks = [
                currentTrack
            ];
            processed.add(currentTrack.id);
            for(let j = i + 1; j < tracks.length; j++){
                if (processed.has(tracks[j].id)) continue;
                const compareTrack = tracks[j];
                // Check if durations are very close (within 2 seconds)
                const durationDiff = Math.abs(currentTrack.duration - compareTrack.duration);
                if (durationDiff <= 2) {
                    const metadataSimilarity = this.calculateMetadataSimilarity(currentTrack, compareTrack);
                    if (metadataSimilarity >= 0.7) {
                        similarTracks.push(compareTrack);
                        processed.add(compareTrack.id);
                    }
                }
            }
            if (similarTracks.length > 1) {
                duplicateGroups.push({
                    id: crypto.randomUUID(),
                    trackIds: similarTracks.map((t)=>t.id),
                    similarityScore: this.calculateGroupSimilarity(similarTracks),
                    duplicateType: 'duration',
                    resolved: false
                });
            }
        }
        return duplicateGroups;
    }
    // Detect fuzzy duplicates using Levenshtein distance
    detectFuzzyDuplicates(tracks) {
        const duplicateGroups = [];
        const processed = new Set();
        for(let i = 0; i < tracks.length; i++){
            if (processed.has(tracks[i].id)) continue;
            const currentTrack = tracks[i];
            const similarTracks = [
                currentTrack
            ];
            processed.add(currentTrack.id);
            for(let j = i + 1; j < tracks.length; j++){
                if (processed.has(tracks[j].id)) continue;
                const compareTrack = tracks[j];
                const similarity = this.calculateFuzzySimilarity(currentTrack, compareTrack);
                if (similarity >= 0.8) {
                    similarTracks.push(compareTrack);
                    processed.add(compareTrack.id);
                }
            }
            if (similarTracks.length > 1) {
                duplicateGroups.push({
                    id: crypto.randomUUID(),
                    trackIds: similarTracks.map((t)=>t.id),
                    similarityScore: this.calculateGroupSimilarity(similarTracks),
                    duplicateType: 'fuzzy',
                    resolved: false
                });
            }
        }
        return duplicateGroups;
    }
    // Calculate metadata similarity between two tracks
    calculateMetadataSimilarity(track1, track2) {
        let score = 0;
        let factors = 0;
        // Title similarity (most important)
        if (this.normalizeString(track1.title) === this.normalizeString(track2.title)) {
            score += 0.4;
        }
        factors += 0.4;
        // Artist similarity
        if (this.normalizeString(track1.artist) === this.normalizeString(track2.artist)) {
            score += 0.3;
        }
        factors += 0.3;
        // Album similarity
        if (this.normalizeString(track1.album) === this.normalizeString(track2.album)) {
            score += 0.2;
        }
        factors += 0.2;
        // Duration similarity (within 5 seconds)
        const durationDiff = Math.abs(track1.duration - track2.duration);
        if (durationDiff <= 5) {
            score += 0.1;
        }
        factors += 0.1;
        return factors > 0 ? score / factors : 0;
    }
    // Calculate fuzzy similarity using Levenshtein distance
    calculateFuzzySimilarity(track1, track2) {
        const titleSim = this.levenshteinSimilarity(this.normalizeString(track1.title), this.normalizeString(track2.title));
        const artistSim = this.levenshteinSimilarity(this.normalizeString(track1.artist), this.normalizeString(track2.artist));
        const albumSim = this.levenshteinSimilarity(this.normalizeString(track1.album), this.normalizeString(track2.album));
        // Weighted average
        return titleSim * 0.5 + artistSim * 0.3 + albumSim * 0.2;
    }
    // Calculate overall similarity for a group of tracks
    calculateGroupSimilarity(tracks) {
        if (tracks.length < 2) return 1.0;
        let totalSimilarity = 0;
        let comparisons = 0;
        for(let i = 0; i < tracks.length; i++){
            for(let j = i + 1; j < tracks.length; j++){
                totalSimilarity += this.calculateMetadataSimilarity(tracks[i], tracks[j]);
                comparisons++;
            }
        }
        return comparisons > 0 ? totalSimilarity / comparisons : 0;
    }
    // Normalize string for comparison
    normalizeString(str) {
        return str.toLowerCase().trim().replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        ;
    }
    // Calculate Levenshtein similarity (0-1 scale)
    levenshteinSimilarity(str1, str2) {
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        return maxLength === 0 ? 1 : 1 - distance / maxLength;
    }
    // Calculate Levenshtein distance
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(()=>Array(str1.length + 1).fill(null));
        for(let i = 0; i <= str1.length; i++){
            matrix[0][i] = i;
        }
        for(let j = 0; j <= str2.length; j++){
            matrix[j][0] = j;
        }
        for(let j = 1; j <= str2.length; j++){
            for(let i = 1; i <= str1.length; i++){
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        return matrix[str2.length][str1.length];
    }
    // Main duplicate detection method
    async detectDuplicates(tracks) {
        // Safety check
        if (!tracks || tracks.length === 0) {
            return [];
        }
        const allDuplicates = [];
        try {
            // Detect different types of duplicates
            const exactDuplicates = this.detectExactDuplicates(tracks);
            const metadataDuplicates = this.detectMetadataDuplicates(tracks);
            const durationDuplicates = this.detectDurationDuplicates(tracks);
            const fuzzyDuplicates = this.detectFuzzyDuplicates(tracks);
            allDuplicates.push(...exactDuplicates);
            allDuplicates.push(...metadataDuplicates);
            allDuplicates.push(...durationDuplicates);
            allDuplicates.push(...fuzzyDuplicates);
            // Remove overlapping groups (prefer higher similarity scores)
            return this.deduplicateGroups(allDuplicates);
        } catch (error) {
            console.error('Error during duplicate detection:', error);
            return [];
        }
    }
    // Remove overlapping duplicate groups
    deduplicateGroups(groups) {
        const sortedGroups = groups.sort((a, b)=>b.similarityScore - a.similarityScore);
        const usedTrackIds = new Set();
        const finalGroups = [];
        for (const group of sortedGroups){
            const hasOverlap = group.trackIds.some((id)=>usedTrackIds.has(id));
            if (!hasOverlap) {
                finalGroups.push(group);
                group.trackIds.forEach((id)=>usedTrackIds.add(id));
            }
        }
        return finalGroups;
    }
    // Get recommended action for a duplicate group
    getRecommendedAction(group, tracks) {
        // Safety checks
        if (!group || !tracks || tracks.length === 0) {
            return {
                action: 'manual_review',
                reason: 'Invalid group or tracks data'
            };
        }
        const groupTracks = tracks.filter((t)=>t && group.trackIds && group.trackIds.includes(t.id));
        if (groupTracks.length === 0) {
            return {
                action: 'manual_review',
                reason: 'No valid tracks found in group'
            };
        }
        if (group.duplicateType === 'exact') {
            // For exact duplicates, keep the highest quality version
            const highestQuality = groupTracks.reduce((best, current)=>{
                const bestBitrate = best.bitrate || 0;
                const currentBitrate = current.bitrate || 0;
                return currentBitrate > bestBitrate ? current : best;
            });
            return {
                action: 'keep_highest_quality',
                recommendedTrackId: highestQuality.id,
                reason: `Keep highest quality version (${highestQuality.bitrate || 'unknown'} kbps)`
            };
        }
        if (group.similarityScore >= 0.95) {
            // For very similar tracks, keep the most played one
            const mostPlayed = groupTracks.reduce((best, current)=>current.playCount > best.playCount ? current : best);
            if (mostPlayed.playCount > 0) {
                return {
                    action: 'keep_most_played',
                    recommendedTrackId: mostPlayed.id,
                    reason: `Keep most played version (${mostPlayed.playCount} plays)`
                };
            }
            // If no plays, keep the newest
            const newest = groupTracks.reduce((best, current)=>current.dateAdded > best.dateAdded ? current : best);
            return {
                action: 'keep_newest',
                recommendedTrackId: newest.id,
                reason: 'Keep most recently added version'
            };
        }
        return {
            action: 'manual_review',
            reason: 'Similarity too low for automatic resolution'
        };
    }
}
const duplicateDetectionService = new DuplicateDetectionService();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/services/playlist-service.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "playlistService",
    ()=>playlistService
]);
class PlaylistService {
    // Create or update tag-based playlists automatically
    async createTagBasedPlaylists(allTracks, existingPlaylists) {
        // Get all unique tags from tracks
        const allTags = new Set();
        allTracks.forEach((track)=>{
            track.customTags.forEach((tag)=>allTags.add(tag));
        });
        const tagBasedPlaylists = [];
        // Create or update playlist for each tag
        for (const tag of allTags){
            const playlistName = `🏷️ ${tag}`;
            // Check if tag-based playlist already exists
            let existingPlaylist = existingPlaylists.find((p)=>p.name === playlistName && p.type === 'smart');
            // Get tracks with this tag
            const tracksWithTag = allTracks.filter((track)=>track.customTags.includes(tag)).map((track)=>track.id);
            if (existingPlaylist) {
                // Update existing playlist
                const updatedPlaylist = {
                    ...existingPlaylist,
                    trackIds: tracksWithTag,
                    dateModified: new Date(),
                    rules: [
                        {
                            field: 'customTags',
                            operator: 'contains',
                            value: tag
                        }
                    ]
                };
                tagBasedPlaylists.push(updatedPlaylist);
            } else {
                // Create new tag-based playlist
                const newPlaylist = {
                    id: crypto.randomUUID(),
                    name: playlistName,
                    description: `Automatically generated playlist for tracks tagged with "${tag}"`,
                    type: 'smart',
                    rules: [
                        {
                            field: 'customTags',
                            operator: 'contains',
                            value: tag
                        }
                    ],
                    trackIds: tracksWithTag,
                    dateCreated: new Date(),
                    dateModified: new Date(),
                    sortBy: 'dateAdded',
                    sortOrder: 'desc'
                };
                tagBasedPlaylists.push(newPlaylist);
            }
        }
        return tagBasedPlaylists;
    }
    // Clean up tag-based playlists that no longer have corresponding tags
    cleanupOrphanedTagPlaylists(allTracks, existingPlaylists) {
        // Get all current tags
        const currentTags = new Set();
        allTracks.forEach((track)=>{
            track.customTags.forEach((tag)=>currentTags.add(tag));
        });
        // Find tag-based playlists that no longer have corresponding tags
        const orphanedPlaylistIds = [];
        existingPlaylists.forEach((playlist)=>{
            if (this.isTagBasedPlaylist(playlist)) {
                const tag = this.getTagFromPlaylist(playlist);
                if (tag && !currentTags.has(tag)) {
                    orphanedPlaylistIds.push(playlist.id);
                }
            }
        });
        return orphanedPlaylistIds;
    }
    // Check if a playlist is tag-based
    isTagBasedPlaylist(playlist) {
        return playlist.name.startsWith('🏷️ ') && playlist.type === 'smart';
    }
    // Get the tag name from a tag-based playlist
    getTagFromPlaylist(playlist) {
        if (this.isTagBasedPlaylist(playlist)) {
            return playlist.name.substring(3).trim() // Remove "🏷️ " prefix and trim whitespace
            ;
        }
        return null;
    }
    // Evaluate smart playlist rules and return matching tracks
    evaluateSmartPlaylist(playlist, allTracks) {
        if (playlist.type !== 'smart' || playlist.rules.length === 0) {
            return playlist.trackIds;
        }
        let matchingTracks = allTracks;
        // Apply each rule (AND logic between rules)
        for (const rule of playlist.rules){
            matchingTracks = this.applyRule(matchingTracks, rule);
        }
        // Sort tracks according to playlist settings
        matchingTracks = this.sortTracks(matchingTracks, playlist.sortBy, playlist.sortOrder);
        return matchingTracks.map((track)=>track.id);
    }
    // Apply a single rule to filter tracks
    applyRule(tracks, rule) {
        return tracks.filter((track)=>{
            const fieldValue = this.getFieldValue(track, rule.field);
            return this.evaluateCondition(fieldValue, rule.operator, rule.value);
        });
    }
    // Get field value from track
    getFieldValue(track, field) {
        switch(field){
            case 'genre':
                return track.genre || '';
            case 'artist':
                return track.artist;
            case 'album':
                return track.album;
            case 'year':
                return track.year || 0;
            case 'rating':
                return track.rating || 0;
            case 'playCount':
                return track.playCount;
            case 'dateAdded':
                return track.dateAdded;
            case 'customTags':
                return track.customTags;
            case 'mood':
                return track.mood || '';
            default:
                return null;
        }
    }
    // Evaluate condition based on operator
    evaluateCondition(fieldValue, operator, ruleValue) {
        switch(operator){
            case 'equals':
                return fieldValue === ruleValue;
            case 'contains':
                if (typeof fieldValue === 'string' && typeof ruleValue === 'string') {
                    return fieldValue.toLowerCase().includes(ruleValue.toLowerCase());
                }
                if (Array.isArray(fieldValue) && typeof ruleValue === 'string') {
                    return fieldValue.some((item)=>typeof item === 'string' && item.toLowerCase().includes(ruleValue.toLowerCase()));
                }
                return false;
            case 'startsWith':
                if (typeof fieldValue === 'string' && typeof ruleValue === 'string') {
                    return fieldValue.toLowerCase().startsWith(ruleValue.toLowerCase());
                }
                return false;
            case 'endsWith':
                if (typeof fieldValue === 'string' && typeof ruleValue === 'string') {
                    return fieldValue.toLowerCase().endsWith(ruleValue.toLowerCase());
                }
                return false;
            case 'greaterThan':
                if (typeof fieldValue === 'number' && typeof ruleValue === 'number') {
                    return fieldValue > ruleValue;
                }
                if (fieldValue instanceof Date && typeof ruleValue === 'number') {
                    return fieldValue.getTime() > ruleValue;
                }
                if (fieldValue instanceof Date && ruleValue instanceof Date) {
                    return fieldValue > ruleValue;
                }
                return false;
            case 'lessThan':
                if (typeof fieldValue === 'number' && typeof ruleValue === 'number') {
                    return fieldValue < ruleValue;
                }
                if (fieldValue instanceof Date && typeof ruleValue === 'number') {
                    return fieldValue.getTime() < ruleValue;
                }
                if (fieldValue instanceof Date && ruleValue instanceof Date) {
                    return fieldValue < ruleValue;
                }
                return false;
            case 'between':
                if (Array.isArray(ruleValue) && ruleValue.length === 2) {
                    const [min, max] = ruleValue;
                    if (typeof fieldValue === 'number') {
                        return fieldValue >= min && fieldValue <= max;
                    }
                    if (fieldValue instanceof Date) {
                        const timestamp = fieldValue.getTime();
                        return timestamp >= min && timestamp <= max;
                    }
                }
                return false;
            case 'in':
                if (Array.isArray(ruleValue)) {
                    return ruleValue.includes(fieldValue);
                }
                return false;
            default:
                return false;
        }
    }
    // Sort tracks based on criteria
    sortTracks(tracks, sortBy, sortOrder) {
        const sorted = [
            ...tracks
        ].sort((a, b)=>{
            let aValue;
            let bValue;
            switch(sortBy){
                case 'title':
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                case 'artist':
                    aValue = a.artist.toLowerCase();
                    bValue = b.artist.toLowerCase();
                    break;
                case 'album':
                    aValue = a.album.toLowerCase();
                    bValue = b.album.toLowerCase();
                    break;
                case 'dateAdded':
                    aValue = a.dateAdded;
                    bValue = b.dateAdded;
                    break;
                case 'playCount':
                    aValue = a.playCount;
                    bValue = b.playCount;
                    break;
                case 'rating':
                    aValue = a.rating || 0;
                    bValue = b.rating || 0;
                    break;
                case 'duration':
                    aValue = a.duration;
                    bValue = b.duration;
                    break;
                default:
                    return 0;
            }
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }
    // Generate dynamic playlist based on listening behavior
    generateDynamicPlaylist(allTracks, type, limit = 50) {
        let tracks;
        switch(type){
            case 'recently_played':
                tracks = allTracks.filter((track)=>track.lastPlayed).sort((a, b)=>{
                    const aTime = a.lastPlayed?.getTime() || 0;
                    const bTime = b.lastPlayed?.getTime() || 0;
                    return bTime - aTime;
                }).slice(0, limit);
                break;
            case 'most_played':
                tracks = allTracks.filter((track)=>track.playCount > 0).sort((a, b)=>b.playCount - a.playCount).slice(0, limit);
                break;
            case 'recently_added':
                tracks = allTracks.sort((a, b)=>b.dateAdded.getTime() - a.dateAdded.getTime()).slice(0, limit);
                break;
            case 'highly_rated':
                tracks = allTracks.filter((track)=>track.rating && track.rating >= 4).sort((a, b)=>(b.rating || 0) - (a.rating || 0)).slice(0, limit);
                break;
            case 'discover_weekly':
                // Generate discovery playlist based on listening patterns
                tracks = this.generateDiscoveryPlaylist(allTracks, limit);
                break;
            default:
                tracks = [];
        }
        return tracks.map((track)=>track.id);
    }
    // Generate discovery playlist using similarity and listening patterns
    generateDiscoveryPlaylist(allTracks, limit) {
        // Get user's most played genres and artists
        const genrePlayCounts = new Map();
        const artistPlayCounts = new Map();
        allTracks.forEach((track)=>{
            if (track.genre) {
                genrePlayCounts.set(track.genre, (genrePlayCounts.get(track.genre) || 0) + track.playCount);
            }
            artistPlayCounts.set(track.artist, (artistPlayCounts.get(track.artist) || 0) + track.playCount);
        });
        // Get top genres and artists
        const topGenres = Array.from(genrePlayCounts.entries()).sort(([, a], [, b])=>b - a).slice(0, 5).map(([genre])=>genre);
        const topArtists = Array.from(artistPlayCounts.entries()).sort(([, a], [, b])=>b - a).slice(0, 10).map(([artist])=>artist);
        // Find tracks that match user preferences but haven't been played much
        const discoveryTracks = allTracks.filter((track)=>{
            // Skip heavily played tracks
            if (track.playCount > 5) return false;
            // Include tracks from favorite genres
            if (track.genre && topGenres.includes(track.genre)) return true;
            // Include tracks from favorite artists (but not overplayed)
            if (topArtists.includes(track.artist) && track.playCount < 3) return true;
            // Include highly rated but underplayed tracks
            if (track.rating && track.rating >= 4 && track.playCount < 2) return true;
            return false;
        });
        // Sort by potential interest (combination of rating, genre preference, and freshness)
        discoveryTracks.sort((a, b)=>{
            let aScore = 0;
            let bScore = 0;
            // Genre preference score
            if (a.genre && topGenres.includes(a.genre)) {
                aScore += topGenres.indexOf(a.genre) * 10;
            }
            if (b.genre && topGenres.includes(b.genre)) {
                bScore += topGenres.indexOf(b.genre) * 10;
            }
            // Rating score
            aScore += (a.rating || 0) * 5;
            bScore += (b.rating || 0) * 5;
            // Freshness score (newer tracks get bonus)
            const now = Date.now();
            const aAge = now - a.dateAdded.getTime();
            const bAge = now - b.dateAdded.getTime();
            const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
            ;
            if (aAge < maxAge) aScore += (maxAge - aAge) / maxAge * 10;
            if (bAge < maxAge) bScore += (maxAge - bAge) / maxAge * 10;
            return bScore - aScore;
        });
        return discoveryTracks.slice(0, limit);
    }
    // Create playlist from similar tracks
    createSimilarTracksPlaylist(seedTrack, allTracks, limit = 25) {
        const similarTracks = allTracks.filter((track)=>track.id !== seedTrack.id).map((track)=>({
                track,
                similarity: this.calculateTrackSimilarity(seedTrack, track)
            })).filter(({ similarity })=>similarity > 0.3).sort((a, b)=>b.similarity - a.similarity).slice(0, limit).map(({ track })=>track);
        return similarTracks.map((track)=>track.id);
    }
    // Calculate similarity between two tracks
    calculateTrackSimilarity(track1, track2) {
        let similarity = 0;
        let factors = 0;
        // Genre similarity
        if (track1.genre && track2.genre) {
            similarity += track1.genre === track2.genre ? 0.3 : 0;
            factors += 0.3;
        }
        // Artist similarity
        similarity += track1.artist === track2.artist ? 0.4 : 0;
        factors += 0.4;
        // Album similarity
        similarity += track1.album === track2.album ? 0.2 : 0;
        factors += 0.2;
        // Duration similarity (within 30 seconds)
        const durationDiff = Math.abs(track1.duration - track2.duration);
        if (durationDiff <= 30) {
            similarity += 0.1;
        }
        factors += 0.1;
        return factors > 0 ? similarity / factors : 0;
    }
    // Validate playlist rules
    validatePlaylistRules(rules) {
        const errors = [];
        rules.forEach((rule, index)=>{
            // Check if field and operator combination is valid
            if (rule.field === 'dateAdded' && ![
                'greaterThan',
                'lessThan',
                'between'
            ].includes(rule.operator)) {
                errors.push(`Rule ${index + 1}: Date fields only support date comparison operators`);
            }
            if ([
                'playCount',
                'rating',
                'year'
            ].includes(rule.field) && ![
                'equals',
                'greaterThan',
                'lessThan',
                'between',
                'in'
            ].includes(rule.operator)) {
                errors.push(`Rule ${index + 1}: Numeric fields don't support text operators`);
            }
            // Check if value type matches field type
            if (rule.operator === 'between' && !Array.isArray(rule.value)) {
                errors.push(`Rule ${index + 1}: 'between' operator requires an array of two values`);
            }
            if (rule.operator === 'in' && !Array.isArray(rule.value)) {
                errors.push(`Rule ${index + 1}: 'in' operator requires an array of values`);
            }
        });
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    // Get suggested rules based on user's library
    getSuggestedRules(allTracks) {
        const suggestions = [];
        // Most common genres
        const genreCounts = new Map();
        allTracks.forEach((track)=>{
            if (track.genre) {
                genreCounts.set(track.genre, (genreCounts.get(track.genre) || 0) + 1);
            }
        });
        const topGenres = Array.from(genreCounts.entries()).sort(([, a], [, b])=>b - a).slice(0, 3).map(([genre])=>genre);
        topGenres.forEach((genre)=>{
            suggestions.push({
                field: 'genre',
                operator: 'equals',
                value: genre
            });
        });
        // High-rated tracks
        const hasRatedTracks = allTracks.some((track)=>track.rating && track.rating > 0);
        if (hasRatedTracks) {
            suggestions.push({
                field: 'rating',
                operator: 'greaterThan',
                value: 3
            });
        }
        // Recently added
        suggestions.push({
            field: 'dateAdded',
            operator: 'greaterThan',
            value: Date.now() - 30 * 24 * 60 * 60 * 1000 // Last 30 days as timestamp
        });
        // Frequently played
        const hasPlayCounts = allTracks.some((track)=>track.playCount > 0);
        if (hasPlayCounts) {
            suggestions.push({
                field: 'playCount',
                operator: 'greaterThan',
                value: 2
            });
        }
        return suggestions;
    }
}
const playlistService = new PlaylistService();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/services/analytics-service.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "analyticsService",
    ()=>analyticsService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$startOfDay$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/startOfDay.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$startOfWeek$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/startOfWeek.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$startOfMonth$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/startOfMonth.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$subDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/subDays.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$subWeeks$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/subWeeks.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$subMonths$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/subMonths.mjs [app-client] (ecmascript)");
;
class AnalyticsService {
    // Calculate basic library statistics
    calculateLibraryStats(tracks) {
        if (tracks.length === 0) {
            return {
                totalTracks: 0,
                totalAlbums: 0,
                totalArtists: 0,
                totalDuration: 0,
                totalSize: 0,
                averageRating: undefined,
                mostPlayedGenre: undefined,
                recentlyAdded: 0
            };
        }
        const uniqueAlbums = new Set(tracks.map((t)=>`${t.artist}-${t.album}`));
        const uniqueArtists = new Set(tracks.map((t)=>t.artist));
        const totalDuration = tracks.reduce((sum, t)=>sum + t.duration, 0);
        const totalSize = tracks.reduce((sum, t)=>sum + t.fileSize, 0);
        // Calculate average rating
        const ratedTracks = tracks.filter((t)=>t.rating && t.rating > 0);
        const averageRating = ratedTracks.length > 0 ? ratedTracks.reduce((sum, t)=>sum + (t.rating || 0), 0) / ratedTracks.length : undefined;
        // Find most played genre
        const genrePlayCounts = new Map();
        tracks.forEach((track)=>{
            if (track.genre) {
                genrePlayCounts.set(track.genre, (genrePlayCounts.get(track.genre) || 0) + track.playCount);
            }
        });
        const mostPlayedGenre = genrePlayCounts.size > 0 ? Array.from(genrePlayCounts.entries()).reduce((a, b)=>a[1] > b[1] ? a : b)[0] : undefined;
        // Recently added (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentlyAdded = tracks.filter((t)=>t.dateAdded > sevenDaysAgo).length;
        return {
            totalTracks: tracks.length,
            totalAlbums: uniqueAlbums.size,
            totalArtists: uniqueArtists.size,
            totalDuration,
            totalSize,
            averageRating,
            mostPlayedGenre,
            recentlyAdded
        };
    }
    // Calculate genre distribution
    calculateGenreDistribution(tracks) {
        const genreStats = new Map();
        tracks.forEach((track)=>{
            const genre = track.genre || 'Unknown';
            const existing = genreStats.get(genre) || {
                count: 0,
                totalDuration: 0
            };
            genreStats.set(genre, {
                count: existing.count + 1,
                totalDuration: existing.totalDuration + track.duration
            });
        });
        const totalTracks = tracks.length;
        return Array.from(genreStats.entries()).map(([genre, stats])=>({
                genre,
                count: stats.count,
                percentage: stats.count / totalTracks * 100,
                totalDuration: stats.totalDuration
            })).sort((a, b)=>b.count - a.count);
    }
    // Calculate artist statistics
    calculateArtistStats(tracks) {
        const artistStats = new Map();
        tracks.forEach((track)=>{
            const existing = artistStats.get(track.artist) || {
                trackCount: 0,
                totalPlayCount: 0,
                totalDuration: 0,
                totalRating: 0,
                ratedTracks: 0
            };
            artistStats.set(track.artist, {
                trackCount: existing.trackCount + 1,
                totalPlayCount: existing.totalPlayCount + track.playCount,
                totalDuration: existing.totalDuration + track.duration,
                totalRating: existing.totalRating + (track.rating || 0),
                ratedTracks: existing.ratedTracks + (track.rating ? 1 : 0)
            });
        });
        return Array.from(artistStats.entries()).map(([artist, stats])=>({
                artist,
                trackCount: stats.trackCount,
                totalPlayCount: stats.totalPlayCount,
                totalDuration: stats.totalDuration,
                averageRating: stats.ratedTracks > 0 ? stats.totalRating / stats.ratedTracks : 0
            })).sort((a, b)=>b.totalPlayCount - a.totalPlayCount);
    }
    // Analyze listening patterns by hour
    analyzeListeningPatterns(events) {
        const hourlyStats = new Map();
        // Initialize all hours
        for(let hour = 0; hour < 24; hour++){
            hourlyStats.set(hour, {
                playCount: 0,
                totalDuration: 0
            });
        }
        events.forEach((event)=>{
            const hour = event.timestamp.getHours();
            const existing = hourlyStats.get(hour);
            hourlyStats.set(hour, {
                playCount: existing.playCount + 1,
                totalDuration: existing.totalDuration + event.duration
            });
        });
        return Array.from(hourlyStats.entries()).map(([hour, stats])=>({
                hour,
                playCount: stats.playCount,
                averageDuration: stats.playCount > 0 ? stats.totalDuration / stats.playCount : 0
            }));
    }
    // Calculate library growth over time
    calculateLibraryGrowth(tracks, days = 30) {
        const growth = [];
        const sortedTracks = [
            ...tracks
        ].sort((a, b)=>a.dateAdded.getTime() - b.dateAdded.getTime());
        for(let i = days - 1; i >= 0; i--){
            const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$subDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subDays"])(new Date(), i);
            const dayStart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$startOfDay$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["startOfDay"])(date);
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            const totalTracks = sortedTracks.filter((t)=>t.dateAdded < dayEnd).length;
            const tracksAdded = sortedTracks.filter((t)=>t.dateAdded >= dayStart && t.dateAdded < dayEnd).length;
            growth.push({
                date: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(date, 'yyyy-MM-dd'),
                totalTracks,
                tracksAdded
            });
        }
        return growth;
    }
    // Calculate playback statistics
    calculatePlaybackStats(events) {
        if (events.length === 0) {
            return {
                totalPlayTime: 0,
                averageSessionLength: 0,
                skipRate: 0,
                completionRate: 0,
                mostPlayedHour: 0
            };
        }
        const totalPlayTime = events.reduce((sum, event)=>sum + event.duration, 0);
        const completedEvents = events.filter((event)=>event.completed);
        const skippedEvents = events.filter((event)=>event.skipped);
        const completionRate = completedEvents.length / events.length * 100;
        const skipRate = skippedEvents.length / events.length * 100;
        // Calculate average session length (group events by proximity)
        const sessions = this.groupEventsIntoSessions(events);
        const averageSessionLength = sessions.length > 0 ? sessions.reduce((sum, session)=>sum + session.duration, 0) / sessions.length : 0;
        // Find most played hour
        const hourlyPlayCounts = new Map();
        events.forEach((event)=>{
            const hour = event.timestamp.getHours();
            hourlyPlayCounts.set(hour, (hourlyPlayCounts.get(hour) || 0) + 1);
        });
        const mostPlayedHour = hourlyPlayCounts.size > 0 ? Array.from(hourlyPlayCounts.entries()).reduce((a, b)=>a[1] > b[1] ? a : b)[0] : 0;
        return {
            totalPlayTime,
            averageSessionLength,
            skipRate,
            completionRate,
            mostPlayedHour
        };
    }
    // Group listening events into sessions
    groupEventsIntoSessions(events) {
        const sortedEvents = [
            ...events
        ].sort((a, b)=>a.timestamp.getTime() - b.timestamp.getTime());
        const sessions = [];
        let currentSession = {
            duration: 0,
            eventCount: 0
        };
        let lastEventTime = 0;
        sortedEvents.forEach((event)=>{
            const eventTime = event.timestamp.getTime();
            const timeSinceLastEvent = eventTime - lastEventTime;
            // If more than 30 minutes since last event, start new session
            if (timeSinceLastEvent > 30 * 60 * 1000 && currentSession.eventCount > 0) {
                sessions.push(currentSession);
                currentSession = {
                    duration: 0,
                    eventCount: 0
                };
            }
            currentSession.duration += event.duration;
            currentSession.eventCount += 1;
            lastEventTime = eventTime;
        });
        if (currentSession.eventCount > 0) {
            sessions.push(currentSession);
        }
        return sessions;
    }
    // Get top tracks by various metrics
    getTopTracks(tracks, metric, limit = 10) {
        let sortedTracks;
        switch(metric){
            case 'playCount':
                sortedTracks = [
                    ...tracks
                ].sort((a, b)=>b.playCount - a.playCount);
                break;
            case 'rating':
                sortedTracks = [
                    ...tracks
                ].filter((t)=>t.rating && t.rating > 0).sort((a, b)=>(b.rating || 0) - (a.rating || 0));
                break;
            case 'duration':
                sortedTracks = [
                    ...tracks
                ].sort((a, b)=>b.duration - a.duration);
                break;
            case 'recent':
                sortedTracks = [
                    ...tracks
                ].filter((t)=>t.lastPlayed).sort((a, b)=>{
                    const aTime = a.lastPlayed?.getTime() || 0;
                    const bTime = b.lastPlayed?.getTime() || 0;
                    return bTime - aTime;
                });
                break;
            default:
                sortedTracks = tracks;
        }
        return sortedTracks.slice(0, limit);
    }
    // Calculate listening trends over time periods
    calculateListeningTrends(events, period, duration = 30) {
        const trends = [];
        for(let i = duration - 1; i >= 0; i--){
            let periodStart;
            let periodEnd;
            let formatString;
            switch(period){
                case 'daily':
                    periodStart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$startOfDay$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["startOfDay"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$subDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subDays"])(new Date(), i));
                    periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
                    formatString = 'MMM dd';
                    break;
                case 'weekly':
                    periodStart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$startOfWeek$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["startOfWeek"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$subWeeks$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subWeeks"])(new Date(), i));
                    periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
                    formatString = 'MMM dd';
                    break;
                case 'monthly':
                    periodStart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$startOfMonth$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["startOfMonth"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$subMonths$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subMonths"])(new Date(), i));
                    periodEnd = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$startOfMonth$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["startOfMonth"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$subMonths$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subMonths"])(new Date(), i - 1));
                    formatString = 'MMM yyyy';
                    break;
                default:
                    continue;
            }
            const periodEvents = events.filter((event)=>event.timestamp >= periodStart && event.timestamp < periodEnd);
            const uniqueTracks = new Set(periodEvents.map((event)=>event.trackId)).size;
            trends.push({
                period: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(periodStart, formatString),
                playCount: periodEvents.length,
                uniqueTracks
            });
        }
        return trends;
    }
    // Export analytics data
    exportAnalyticsData(tracks, events) {
        return {
            libraryStats: this.calculateLibraryStats(tracks),
            genreDistribution: this.calculateGenreDistribution(tracks),
            artistStats: this.calculateArtistStats(tracks),
            listeningPatterns: this.analyzeListeningPatterns(events),
            playbackStats: this.calculatePlaybackStats(events),
            topTracks: {
                mostPlayed: this.getTopTracks(tracks, 'playCount'),
                highestRated: this.getTopTracks(tracks, 'rating'),
                recentlyPlayed: this.getTopTracks(tracks, 'recent')
            }
        };
    }
}
const analyticsService = new AnalyticsService();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/store/music-store.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useMusicStore",
    ()=>useMusicStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/middleware.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/indexed-db.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$search$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/search-service.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$duplicate$2d$detection$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/duplicate-detection-service.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$playlist$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/playlist-service.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$analytics$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/analytics-service.ts [app-client] (ecmascript)");
'use client';
;
;
;
;
;
;
;
const useMusicStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])()((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subscribeWithSelector"])((set, get)=>({
        // Initial state
        tracks: [],
        playlists: [],
        listeningEvents: [],
        duplicateGroups: [],
        viewState: {
            currentView: 'library',
            selectedTrackIds: [],
            searchQuery: '',
            filters: {},
            sortBy: 'dateAdded',
            sortOrder: 'desc'
        },
        importProgress: {
            isImporting: false,
            currentFile: '',
            processedFiles: 0,
            totalFiles: 0,
            errors: []
        },
        libraryStats: null,
        isInitialized: false,
        isLoading: false,
        showImportModal: false,
        selectedPlaylistId: null,
        // Initialize the store
        initialize: async ()=>{
            set({
                isLoading: true
            });
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].initialize();
                // Load all data from IndexedDB
                const [tracks, playlists, duplicateGroups] = await Promise.all([
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].getAllTracks(),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].getAllPlaylists(),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].getAllDuplicateGroups()
                ]);
                // Initialize search service
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$search$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["searchService"].initialize(tracks);
                set({
                    tracks,
                    playlists,
                    duplicateGroups,
                    isInitialized: true,
                    isLoading: false
                });
                // Refresh stats
                get().refreshStats();
            } catch (error) {
                console.error('Failed to initialize music store:', error);
                set({
                    isLoading: false
                });
            }
        },
        // Track operations
        addTracks: async (newTracks)=>{
            const { tracks } = get();
            try {
                // Add tracks to database
                await Promise.all(newTracks.map((track)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].addTrack(track)));
                // Update store
                const updatedTracks = [
                    ...tracks,
                    ...newTracks
                ];
                set({
                    tracks: updatedTracks
                });
                // Update search index
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$search$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["searchService"].addTracks(newTracks);
                // Sync tag-based playlists for new tracks with tags
                const hasTaggedTracks = newTracks.some((track)=>track.customTags.length > 0);
                if (hasTaggedTracks) {
                    get().syncTagBasedPlaylists();
                }
                // Refresh stats
                get().refreshStats();
            } catch (error) {
                console.error('Failed to add tracks:', error);
                throw error;
            }
        },
        updateTrack: async (updatedTrack)=>{
            const { tracks } = get();
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].updateTrack(updatedTrack);
                const updatedTracks = tracks.map((track)=>track.id === updatedTrack.id ? updatedTrack : track);
                set({
                    tracks: updatedTracks
                });
                // Update search index
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$search$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["searchService"].updateTrack(updatedTrack);
                // Sync tag-based playlists when track tags change
                get().syncTagBasedPlaylists();
            } catch (error) {
                console.error('Failed to update track:', error);
                throw error;
            }
        },
        deleteTrack: async (id)=>{
            const { tracks, playlists } = get();
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].deleteTrack(id);
                // Remove from tracks
                const updatedTracks = tracks.filter((track)=>track.id !== id);
                // Remove from playlists
                const updatedPlaylists = playlists.map((playlist)=>({
                        ...playlist,
                        trackIds: playlist.trackIds.filter((trackId)=>trackId !== id)
                    }));
                set({
                    tracks: updatedTracks,
                    playlists: updatedPlaylists
                });
                // Update search index
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$search$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["searchService"].removeTrack(id);
                // Update playlists in database
                await Promise.all(updatedPlaylists.filter((playlist)=>playlist.trackIds.length !== playlists.find((p)=>p.id === playlist.id)?.trackIds.length).map((playlist)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].updatePlaylist(playlist)));
                get().refreshStats();
            } catch (error) {
                console.error('Failed to delete track:', error);
                throw error;
            }
        },
        // Playlist operations
        createPlaylist: async (playlistData)=>{
            const { playlists } = get();
            const newPlaylist = {
                ...playlistData,
                id: crypto.randomUUID(),
                dateCreated: new Date(),
                dateModified: new Date()
            };
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].addPlaylist(newPlaylist);
                set({
                    playlists: [
                        ...playlists,
                        newPlaylist
                    ]
                });
            } catch (error) {
                console.error('Failed to create playlist:', error);
                throw error;
            }
        },
        updatePlaylist: async (updatedPlaylist)=>{
            const { playlists } = get();
            const playlistWithUpdatedDate = {
                ...updatedPlaylist,
                dateModified: new Date()
            };
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].updatePlaylist(playlistWithUpdatedDate);
                const updatedPlaylists = playlists.map((playlist)=>playlist.id === updatedPlaylist.id ? playlistWithUpdatedDate : playlist);
                set({
                    playlists: updatedPlaylists
                });
            } catch (error) {
                console.error('Failed to update playlist:', error);
                throw error;
            }
        },
        deletePlaylist: async (id)=>{
            const { playlists } = get();
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].deletePlaylist(id);
                set({
                    playlists: playlists.filter((playlist)=>playlist.id !== id)
                });
            } catch (error) {
                console.error('Failed to delete playlist:', error);
                throw error;
            }
        },
        // Tag-based playlist management
        syncTagBasedPlaylists: async ()=>{
            const { tracks, playlists } = get();
            try {
                // Create or update tag-based playlists
                const tagBasedPlaylists = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$playlist$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playlistService"].createTagBasedPlaylists(tracks, playlists);
                // Update existing playlists or create new ones
                for (const playlist of tagBasedPlaylists){
                    const existingIndex = playlists.findIndex((p)=>p.id === playlist.id);
                    if (existingIndex >= 0) {
                        // Update existing playlist
                        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].updatePlaylist(playlist);
                    } else {
                        // Create new playlist
                        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].addPlaylist(playlist);
                    }
                }
                // Clean up orphaned tag playlists
                const orphanedIds = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$playlist$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playlistService"].cleanupOrphanedTagPlaylists(tracks, playlists);
                for (const id of orphanedIds){
                    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].deletePlaylist(id);
                }
                // Update store with all playlists
                const updatedPlaylists = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].getAllPlaylists();
                set({
                    playlists: updatedPlaylists
                });
            } catch (error) {
                console.error('Failed to sync tag-based playlists:', error);
            }
        },
        createTagBasedPlaylist: async (tag)=>{
            const { tracks } = get();
            try {
                const tracksWithTag = tracks.filter((track)=>track.customTags.includes(tag));
                const newPlaylist = {
                    id: crypto.randomUUID(),
                    name: `🏷️ ${tag}`,
                    description: `Automatically generated playlist for tracks tagged with "${tag}"`,
                    type: 'smart',
                    rules: [
                        {
                            field: 'customTags',
                            operator: 'contains',
                            value: tag
                        }
                    ],
                    trackIds: tracksWithTag.map((track)=>track.id),
                    dateCreated: new Date(),
                    dateModified: new Date(),
                    sortBy: 'dateAdded',
                    sortOrder: 'desc'
                };
                await get().createPlaylist(newPlaylist);
            } catch (error) {
                console.error('Failed to create tag-based playlist:', error);
                throw error;
            }
        },
        // Listening events
        recordListeningEvent: async (eventData)=>{
            const event = {
                ...eventData,
                id: crypto.randomUUID()
            };
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].addListeningEvent(event);
                // Update track play count
                const { tracks } = get();
                const track = tracks.find((t)=>t.id === event.trackId);
                if (track) {
                    const updatedTrack = {
                        ...track,
                        playCount: track.playCount + 1,
                        lastPlayed: event.timestamp
                    };
                    get().updateTrack(updatedTrack);
                }
            } catch (error) {
                console.error('Failed to record listening event:', error);
            }
        },
        // Search and filtering
        searchTracks: (query)=>{
            const { tracks, viewState } = get();
            if (!query.trim()) {
                return tracks;
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$search$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["searchService"].search(query, viewState.filters);
        },
        setFilters: (filters)=>{
            set((state)=>({
                    viewState: {
                        ...state.viewState,
                        filters: {
                            ...state.viewState.filters,
                            ...filters
                        }
                    }
                }));
        },
        setSorting: (sortBy, sortOrder)=>{
            set((state)=>({
                    viewState: {
                        ...state.viewState,
                        sortBy,
                        sortOrder
                    }
                }));
        },
        // UI actions
        setCurrentView: (currentView)=>{
            set((state)=>({
                    viewState: {
                        ...state.viewState,
                        currentView
                    }
                }));
        },
        setSelectedTracks: (selectedTrackIds)=>{
            set((state)=>({
                    viewState: {
                        ...state.viewState,
                        selectedTrackIds
                    }
                }));
        },
        toggleImportModal: ()=>{
            set((state)=>({
                    showImportModal: !state.showImportModal
                }));
        },
        setSelectedPlaylist: (selectedPlaylistId)=>{
            set({
                selectedPlaylistId
            });
        },
        // Import operations
        startImport: ()=>{
            set({
                importProgress: {
                    isImporting: true,
                    currentFile: '',
                    processedFiles: 0,
                    totalFiles: 0,
                    errors: []
                }
            });
        },
        updateImportProgress: (progress)=>{
            set((state)=>({
                    importProgress: {
                        ...state.importProgress,
                        ...progress
                    }
                }));
        },
        // Analytics
        refreshStats: async ()=>{
            const { tracks } = get();
            const stats = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$analytics$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analyticsService"].calculateLibraryStats(tracks);
            set({
                libraryStats: stats
            });
        },
        // Duplicate detection
        detectDuplicates: async ()=>{
            const { tracks } = get();
            try {
                const duplicateGroups = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$duplicate$2d$detection$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["duplicateDetectionService"].detectDuplicates(tracks);
                // Save to database
                await Promise.all(duplicateGroups.map((group)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].addDuplicateGroup(group)));
                set({
                    duplicateGroups
                });
            } catch (error) {
                console.error('Failed to detect duplicates:', error);
            }
        },
        resolveDuplicateGroup: async (groupId, preferredTrackId)=>{
            const { duplicateGroups } = get();
            const group = duplicateGroups.find((g)=>g.id === groupId);
            if (!group) return;
            const resolvedGroup = {
                ...group,
                resolved: true,
                preferredTrackId
            };
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$indexed$2d$db$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dbManager"].updateDuplicateGroup(resolvedGroup);
                const updatedGroups = duplicateGroups.map((g)=>g.id === groupId ? resolvedGroup : g);
                set({
                    duplicateGroups: updatedGroups
                });
            } catch (error) {
                console.error('Failed to resolve duplicate group:', error);
            }
        }
    })));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/utils/cn.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/layout/Sidebar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Sidebar",
    ()=>Sidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store/music-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/cn.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Music$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/music.js [app-client] (ecmascript) <export default as Music>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListMusic$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/list-music.js [app-client] (ecmascript) <export default as ListMusic>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-column.js [app-client] (ecmascript) <export default as BarChart3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/copy.js [app-client] (ecmascript) <export default as Copy>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/house.js [app-client] (ecmascript) <export default as Home>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
const navigationItems = [
    {
        id: 'library',
        label: 'Library',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Music$3e$__["Music"]
    },
    {
        id: 'playlists',
        label: 'Playlists',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListMusic$3e$__["ListMusic"]
    },
    {
        id: 'analytics',
        label: 'Analytics',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"]
    },
    {
        id: 'duplicates',
        label: 'Duplicates',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__["Copy"]
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"]
    }
];
function Sidebar() {
    _s();
    const { viewState, setCurrentView, toggleImportModal, playlists, libraryStats } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-64 bg-gray-800 border-r border-gray-700 flex flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-4 border-b border-gray-700",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2 mb-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__["Home"], {
                                className: "w-6 h-6 text-blue-400"
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 32,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-lg font-semibold text-white",
                                children: "Music Library"
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 33,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 31,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: toggleImportModal,
                        className: "w-full flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                className: "w-4 h-4"
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 40,
                                columnNumber: 11
                            }, this),
                            "Import Music"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 36,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 30,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                className: "flex-1 p-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-1",
                        children: navigationItems.map((item)=>{
                            const Icon = item.icon;
                            const isActive = viewState.currentView === item.id;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setCurrentView(item.id),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                                        lineNumber: 63,
                                        columnNumber: 17
                                    }, this),
                                    item.label
                                ]
                            }, item.id, true, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 53,
                                columnNumber: 15
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 47,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between mb-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-xs font-semibold text-gray-400 uppercase tracking-wider",
                                        children: "Playlists"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                                        lineNumber: 73,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>{
                                        // TODO: Open create playlist modal
                                        },
                                        className: "text-gray-400 hover:text-white",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                            className: "w-4 h-4"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/layout/Sidebar.tsx",
                                            lineNumber: 82,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                                        lineNumber: 76,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 72,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-1 max-h-48 overflow-y-auto",
                                children: [
                                    playlists.map((playlist)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>{
                                                setCurrentView('playlists');
                                            // TODO: Select playlist
                                            },
                                            className: "w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors text-left",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListMusic$3e$__["ListMusic"], {
                                                    className: "w-4 h-4 flex-shrink-0"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                                                    lineNumber: 96,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "truncate",
                                                    children: playlist.name
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                                                    lineNumber: 97,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-xs text-gray-500 ml-auto",
                                                    children: playlist.trackIds.length
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                                                    lineNumber: 98,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, playlist.id, true, {
                                            fileName: "[project]/src/components/layout/Sidebar.tsx",
                                            lineNumber: 88,
                                            columnNumber: 15
                                        }, this)),
                                    playlists.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-gray-500 px-3 py-2",
                                        children: "No playlists yet"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                                        lineNumber: 105,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 86,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 71,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 46,
                columnNumber: 7
            }, this),
            libraryStats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-4 border-t border-gray-700",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-xs text-gray-400 space-y-1",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Tracks:"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                                    lineNumber: 118,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-white",
                                    children: libraryStats.totalTracks.toLocaleString()
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                                    lineNumber: 119,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/layout/Sidebar.tsx",
                            lineNumber: 117,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Artists:"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                                    lineNumber: 122,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-white",
                                    children: libraryStats.totalArtists.toLocaleString()
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                                    lineNumber: 123,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/layout/Sidebar.tsx",
                            lineNumber: 121,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Albums:"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                                    lineNumber: 126,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-white",
                                    children: libraryStats.totalAlbums.toLocaleString()
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                                    lineNumber: 127,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/layout/Sidebar.tsx",
                            lineNumber: 125,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                    lineNumber: 116,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 115,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/layout/Sidebar.tsx",
        lineNumber: 28,
        columnNumber: 5
    }, this);
}
_s(Sidebar, "co7NUxf6g5VLSjS+I4xj+q4L+Ss=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"]
    ];
});
_c = Sidebar;
var _c;
__turbopack_context__.k.register(_c, "Sidebar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/SearchBar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SearchBar",
    ()=>SearchBar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
'use client';
;
;
function SearchBar({ value, onChange, placeholder = "Search..." }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                className: "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/SearchBar.tsx",
                lineNumber: 14,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "text",
                value: value,
                onChange: (e)=>onChange(e.target.value),
                placeholder: placeholder,
                className: "w-full pl-10 pr-10 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/SearchBar.tsx",
                lineNumber: 15,
                columnNumber: 7
            }, this),
            value && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>onChange(''),
                className: "absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                    className: "w-4 h-4"
                }, void 0, false, {
                    fileName: "[project]/src/components/ui/SearchBar.tsx",
                    lineNumber: 27,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/ui/SearchBar.tsx",
                lineNumber: 23,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/SearchBar.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
_c = SearchBar;
var _c;
__turbopack_context__.k.register(_c, "SearchBar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/services/tag-service.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "tagService",
    ()=>tagService
]);
class TagService {
    // Get all unique tags from the library
    getAllTags(tracks) {
        const tagCounts = new Map();
        tracks.forEach((track)=>{
            track.customTags.forEach((tag)=>{
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            });
        });
        return Array.from(tagCounts.entries()).map(([tag, count])=>({
                tag,
                count,
                category: 'custom'
            })).sort((a, b)=>b.count - a.count);
    }
    // Get all unique moods from the library
    getAllMoods(tracks) {
        const moodCounts = new Map();
        tracks.forEach((track)=>{
            if (track.mood) {
                moodCounts.set(track.mood, (moodCounts.get(track.mood) || 0) + 1);
            }
        });
        return Array.from(moodCounts.entries()).map(([mood, count])=>({
                mood,
                count
            })).sort((a, b)=>b.count - a.count);
    }
    // Get tag suggestions based on partial input
    getTagSuggestions(tracks, query, limit = 10) {
        const allTags = this.getAllTags(tracks);
        if (!query.trim()) {
            return allTags.slice(0, limit);
        }
        const queryLower = query.toLowerCase();
        return allTags.filter(({ tag })=>tag.toLowerCase().includes(queryLower)).slice(0, limit);
    }
    // Get mood suggestions based on partial input
    getMoodSuggestions(tracks, query, limit = 10) {
        const allMoods = this.getAllMoods(tracks);
        if (!query.trim()) {
            return allMoods.slice(0, limit);
        }
        const queryLower = query.toLowerCase();
        return allMoods.filter(({ mood })=>mood.toLowerCase().includes(queryLower)).slice(0, limit);
    }
    // Normalize tag names (consistent casing, remove duplicates)
    normalizeTags(tags) {
        const normalized = new Set();
        tags.forEach((tag)=>{
            const trimmed = tag.trim();
            if (trimmed) {
                // Convert to title case for consistency
                const titleCase = trimmed.toLowerCase().split(' ').map((word)=>word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                normalized.add(titleCase);
            }
        });
        return Array.from(normalized).sort();
    }
    // Normalize mood names
    normalizeMood(mood) {
        const trimmed = mood.trim();
        if (!trimmed) return '';
        // Convert to title case
        return trimmed.toLowerCase().split(' ').map((word)=>word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    // Get popular tags (most used)
    getPopularTags(tracks, limit = 20) {
        return this.getAllTags(tracks).slice(0, limit);
    }
    // Get popular moods (most used)
    getPopularMoods(tracks, limit = 10) {
        return this.getAllMoods(tracks).slice(0, limit);
    }
    // Find similar tags (for deduplication)
    findSimilarTags(tracks, threshold = 0.8) {
        const allTags = this.getAllTags(tracks);
        const similar = [];
        for(let i = 0; i < allTags.length; i++){
            const tag1 = allTags[i];
            const similarTags = [];
            for(let j = i + 1; j < allTags.length; j++){
                const tag2 = allTags[j];
                if (this.calculateSimilarity(tag1.tag, tag2.tag) >= threshold) {
                    similarTags.push(tag2.tag);
                }
            }
            if (similarTags.length > 0) {
                similar.push({
                    original: tag1.tag,
                    similar: similarTags,
                    count: tag1.count
                });
            }
        }
        return similar.sort((a, b)=>b.count - a.count);
    }
    // Calculate string similarity (Levenshtein distance based)
    calculateSimilarity(str1, str2) {
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();
        if (s1 === s2) return 1;
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        if (longer.length === 0) return 1;
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }
    levenshteinDistance(str1, str2) {
        const matrix = [];
        for(let i = 0; i <= str2.length; i++){
            matrix[i] = [
                i
            ];
        }
        for(let j = 0; j <= str1.length; j++){
            matrix[0][j] = j;
        }
        for(let i = 1; i <= str2.length; i++){
            for(let j = 1; j <= str1.length; j++){
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
    // Predefined mood categories for suggestions
    getPredefinedMoods() {
        return [
            'Happy',
            'Sad',
            'Energetic',
            'Calm',
            'Melancholic',
            'Upbeat',
            'Relaxing',
            'Intense',
            'Peaceful',
            'Aggressive',
            'Romantic',
            'Nostalgic',
            'Motivational',
            'Dark',
            'Bright',
            'Dreamy',
            'Powerful',
            'Gentle',
            'Mysterious',
            'Playful'
        ];
    }
    // Predefined tag categories for suggestions
    getPredefinedTags() {
        return [
            'Favorite',
            'Workout',
            'Study',
            'Party',
            'Driving',
            'Sleep',
            'Focus',
            'Chill',
            'Dance',
            'Acoustic',
            'Live',
            'Cover',
            'Instrumental',
            'Vocal',
            'Classic',
            'New',
            'Discovered',
            'Recommended',
            'Seasonal',
            'Holiday'
        ];
    }
}
const tagService = new TagService();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/FilterBar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FilterBar",
    ()=>FilterBar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$search$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/search-service.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/tag-service.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$filter$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Filter$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/filter.js [app-client] (ecmascript) <export default as Filter>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function FilterBar({ tracks, filters, onFiltersChange }) {
    _s();
    const [showFilters, setShowFilters] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const genres = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$search$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["searchService"].getUniqueValues('genre');
    const artists = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$search$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["searchService"].getUniqueValues('artist');
    const albums = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$search$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["searchService"].getUniqueValues('album');
    const years = Array.from(new Set(tracks.map((t)=>t.year).filter(Boolean))).sort((a, b)=>b - a);
    const fileFormats = Array.from(new Set(tracks.map((t)=>t.fileFormat).filter(Boolean))).sort();
    const allTags = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].getAllTags(tracks);
    const allMoods = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].getAllMoods(tracks);
    const activeFiltersCount = Object.values(filters).filter(Boolean).length;
    const clearFilters = ()=>{
        onFiltersChange({
            genre: undefined,
            artist: undefined,
            album: undefined,
            year: undefined,
            rating: undefined,
            fileFormat: undefined,
            customTag: undefined,
            mood: undefined
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>setShowFilters(!showFilters),
                className: "flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700 transition-colors",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$filter$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Filter$3e$__["Filter"], {
                        className: "w-4 h-4"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/FilterBar.tsx",
                        lineNumber: 47,
                        columnNumber: 9
                    }, this),
                    "Filters",
                    activeFiltersCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "bg-blue-600 text-white text-xs px-2 py-1 rounded-full",
                        children: activeFiltersCount
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/FilterBar.tsx",
                        lineNumber: 50,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/FilterBar.tsx",
                lineNumber: 43,
                columnNumber: 7
            }, this),
            showFilters && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute top-full right-0 mt-2 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between mb-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-white font-medium",
                                    children: "Filters"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                    lineNumber: 60,
                                    columnNumber: 15
                                }, this),
                                activeFiltersCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: clearFilters,
                                    className: "text-blue-400 hover:text-blue-300 text-sm",
                                    children: "Clear all"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                    lineNumber: 62,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                            lineNumber: 59,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-sm font-medium text-gray-300 mb-2",
                                            children: "Genre"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                                            lineNumber: 74,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: filters.genre || '',
                                            onChange: (e)=>onFiltersChange({
                                                    genre: e.target.value || undefined
                                                }),
                                            className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "All genres"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                    lineNumber: 82,
                                                    columnNumber: 19
                                                }, this),
                                                genres.map((genre)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: genre,
                                                        children: genre
                                                    }, genre, false, {
                                                        fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                        lineNumber: 84,
                                                        columnNumber: 21
                                                    }, this))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                                            lineNumber: 77,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                    lineNumber: 73,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-sm font-medium text-gray-300 mb-2",
                                            children: "Artist"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                                            lineNumber: 91,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: filters.artist || '',
                                            onChange: (e)=>onFiltersChange({
                                                    artist: e.target.value || undefined
                                                }),
                                            className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "All artists"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                    lineNumber: 99,
                                                    columnNumber: 19
                                                }, this),
                                                artists.slice(0, 50).map((artist)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: artist,
                                                        children: artist
                                                    }, artist, false, {
                                                        fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                        lineNumber: 101,
                                                        columnNumber: 21
                                                    }, this))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                                            lineNumber: 94,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                    lineNumber: 90,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-sm font-medium text-gray-300 mb-2",
                                            children: "Year"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                                            lineNumber: 108,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: filters.year || '',
                                            onChange: (e)=>onFiltersChange({
                                                    year: e.target.value ? parseInt(e.target.value) : undefined
                                                }),
                                            className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "All years"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                    lineNumber: 116,
                                                    columnNumber: 19
                                                }, this),
                                                years.map((year)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: year,
                                                        children: year
                                                    }, year, false, {
                                                        fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                        lineNumber: 118,
                                                        columnNumber: 21
                                                    }, this))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                                            lineNumber: 111,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                    lineNumber: 107,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-sm font-medium text-gray-300 mb-2",
                                            children: "File Format"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                                            lineNumber: 125,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: filters.fileFormat || '',
                                            onChange: (e)=>onFiltersChange({
                                                    fileFormat: e.target.value || undefined
                                                }),
                                            className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "All formats"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                    lineNumber: 133,
                                                    columnNumber: 19
                                                }, this),
                                                fileFormats.map((format)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: format,
                                                        children: format.toUpperCase()
                                                    }, format, false, {
                                                        fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                        lineNumber: 135,
                                                        columnNumber: 21
                                                    }, this))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                                            lineNumber: 128,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                    lineNumber: 124,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-sm font-medium text-gray-300 mb-2",
                                            children: "Rating"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                                            lineNumber: 142,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: filters.rating || '',
                                            onChange: (e)=>onFiltersChange({
                                                    rating: e.target.value ? parseInt(e.target.value) : undefined
                                                }),
                                            className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "All ratings"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                    lineNumber: 150,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "5",
                                                    children: "★★★★★ (5 stars)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                    lineNumber: 151,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "4",
                                                    children: "★★★★☆ (4+ stars)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                    lineNumber: 152,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "3",
                                                    children: "★★★☆☆ (3+ stars)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                    lineNumber: 153,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "2",
                                                    children: "★★☆☆☆ (2+ stars)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                    lineNumber: 154,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "1",
                                                    children: "★☆☆☆☆ (1+ stars)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                    lineNumber: 155,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                                            lineNumber: 145,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                    lineNumber: 141,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-sm font-medium text-gray-300 mb-2",
                                            children: "Tag"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                                            lineNumber: 161,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: filters.customTag || '',
                                            onChange: (e)=>onFiltersChange({
                                                    customTag: e.target.value || undefined
                                                }),
                                            className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "All tags"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                    lineNumber: 169,
                                                    columnNumber: 19
                                                }, this),
                                                allTags.slice(0, 20).map(({ tag, count })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: tag,
                                                        children: [
                                                            tag,
                                                            " (",
                                                            count,
                                                            ")"
                                                        ]
                                                    }, tag, true, {
                                                        fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                        lineNumber: 171,
                                                        columnNumber: 21
                                                    }, this))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                                            lineNumber: 164,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                    lineNumber: 160,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-sm font-medium text-gray-300 mb-2",
                                            children: "Mood"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                                            lineNumber: 178,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: filters.mood || '',
                                            onChange: (e)=>onFiltersChange({
                                                    mood: e.target.value || undefined
                                                }),
                                            className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "All moods"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                    lineNumber: 186,
                                                    columnNumber: 19
                                                }, this),
                                                allMoods.slice(0, 15).map(({ mood, count })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: mood,
                                                        children: [
                                                            mood,
                                                            " (",
                                                            count,
                                                            ")"
                                                        ]
                                                    }, mood, true, {
                                                        fileName: "[project]/src/components/ui/FilterBar.tsx",
                                                        lineNumber: 188,
                                                        columnNumber: 21
                                                    }, this))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                                            lineNumber: 181,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                                    lineNumber: 177,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ui/FilterBar.tsx",
                            lineNumber: 71,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ui/FilterBar.tsx",
                    lineNumber: 58,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/ui/FilterBar.tsx",
                lineNumber: 57,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/FilterBar.tsx",
        lineNumber: 42,
        columnNumber: 5
    }, this);
}
_s(FilterBar, "oJ1PYJsWFrwlzYtlEiE9hrxrFU0=");
_c = FilterBar;
var _c;
__turbopack_context__.k.register(_c, "FilterBar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/utils/format.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Format duration in seconds to MM:SS or HH:MM:SS
__turbopack_context__.s([
    "formatBitrate",
    ()=>formatBitrate,
    "formatDiscNumber",
    ()=>formatDiscNumber,
    "formatDuration",
    ()=>formatDuration,
    "formatFileFormat",
    ()=>formatFileFormat,
    "formatFileSize",
    ()=>formatFileSize,
    "formatNumber",
    ()=>formatNumber,
    "formatPercentage",
    ()=>formatPercentage,
    "formatPlayCount",
    ()=>formatPlayCount,
    "formatRating",
    ()=>formatRating,
    "formatRelativeDate",
    ()=>formatRelativeDate,
    "formatSimilarity",
    ()=>formatSimilarity,
    "formatTimeOfDay",
    ()=>formatTimeOfDay,
    "formatTrackNumber",
    ()=>formatTrackNumber,
    "formatYearRange",
    ()=>formatYearRange,
    "truncateText",
    ()=>truncateText
]);
function formatDuration(seconds) {
    if (seconds < 0) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = [
        'B',
        'KB',
        'MB',
        'GB'
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
function formatBitrate(bitrate) {
    if (!bitrate) return 'Unknown';
    return `${bitrate} kbps`;
}
function formatPlayCount(count) {
    if (count === 0) return 'Never played';
    if (count === 1) return '1 play';
    if (count < 1000) return `${count} plays`;
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K plays`;
    return `${(count / 1000000).toFixed(1)}M plays`;
}
function formatRelativeDate(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}
function formatPercentage(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
}
function formatRating(rating) {
    if (!rating) return '☆☆☆☆☆';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(emptyStars);
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}
function formatTrackNumber(trackNumber, totalTracks) {
    if (!trackNumber) return '';
    const digits = totalTracks ? totalTracks.toString().length : 2;
    return trackNumber.toString().padStart(digits, '0');
}
function formatDiscNumber(discNumber) {
    if (!discNumber) return '';
    return `Disc ${discNumber}`;
}
function formatFileFormat(format) {
    if (!format) return 'Unknown';
    return format.toUpperCase();
}
function formatYearRange(startYear, endYear) {
    if (!startYear && !endYear) return '';
    if (!endYear || startYear === endYear) return startYear?.toString() || '';
    return `${startYear}-${endYear}`;
}
function formatTimeOfDay(hour) {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
}
function formatNumber(num) {
    return num.toLocaleString();
}
function formatSimilarity(score) {
    return `${Math.round(score * 100)}%`;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/TrackRow.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TrackRow",
    ()=>TrackRow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2d$pen$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Edit$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/square-pen.js [app-client] (ecmascript) <export default as Edit>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$ellipsis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MoreHorizontal$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/ellipsis.js [app-client] (ecmascript) <export default as MoreHorizontal>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListPlus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/list-plus.js [app-client] (ecmascript) <export default as ListPlus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/cn.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function TrackRow({ track, index, isSelected = false, onSelect, onDelete, onEdit, onAddToPlaylist, context = 'library' }) {
    _s();
    const [showActionsMenu, setShowActionsMenu] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleDelete = ()=>{
        if (confirm(`Are you sure you want to delete "${track.title}" from your library? This cannot be undone.`)) {
            onDelete?.(track.id);
        }
        setShowActionsMenu(false);
    };
    const handleEdit = ()=>{
        onEdit?.(track.id);
        setShowActionsMenu(false);
    };
    const handleAddToPlaylist = ()=>{
        onAddToPlaylist?.(track.id);
        setShowActionsMenu(false);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex items-center px-6 py-3 hover:bg-gray-800 transition-colors group', isSelected && 'bg-gray-800', index % 2 === 0 && 'bg-gray-900/50'),
        children: [
            onSelect && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "checkbox",
                checked: isSelected,
                onChange: (e)=>onSelect(e.target.checked),
                className: "mr-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/TrackRow.tsx",
                lineNumber: 65,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 grid grid-cols-24 gap-2 items-center text-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-4 flex items-center gap-3 min-w-0",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "min-w-0",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-white font-medium truncate",
                                    title: track.title,
                                    children: track.title
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/TrackRow.tsx",
                                    lineNumber: 77,
                                    columnNumber: 13
                                }, this),
                                track.customTags.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-wrap gap-1 mt-1",
                                    children: [
                                        track.customTags.slice(0, 2).map((tag, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "inline-block px-1 py-0.5 bg-blue-600 text-xs text-white rounded",
                                                title: track.customTags.join(', '),
                                                children: tag
                                            }, idx, false, {
                                                fileName: "[project]/src/components/ui/TrackRow.tsx",
                                                lineNumber: 84,
                                                columnNumber: 19
                                            }, this)),
                                        track.customTags.length > 2 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-xs text-gray-400",
                                            children: [
                                                "+",
                                                track.customTags.length - 2
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/ui/TrackRow.tsx",
                                            lineNumber: 93,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/ui/TrackRow.tsx",
                                    lineNumber: 82,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ui/TrackRow.tsx",
                            lineNumber: 76,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackRow.tsx",
                        lineNumber: 75,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-3 text-gray-300 truncate",
                        title: track.artist,
                        children: track.artist
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackRow.tsx",
                        lineNumber: 103,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-3 text-gray-300 truncate",
                        title: track.album,
                        children: track.album
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackRow.tsx",
                        lineNumber: 108,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-2 text-gray-400 truncate",
                        title: track.genre || 'Unknown',
                        children: track.genre || 'Unknown'
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackRow.tsx",
                        lineNumber: 113,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-1 text-gray-400 text-center",
                        children: track.year || '—'
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackRow.tsx",
                        lineNumber: 118,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-1 text-gray-400 text-center",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatTrackNumber"])(track.trackNumber)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackRow.tsx",
                        lineNumber: 123,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-1 text-gray-400 text-center",
                        children: track.discNumber || '—'
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackRow.tsx",
                        lineNumber: 128,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-2 text-gray-400",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDuration"])(track.duration)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackRow.tsx",
                        lineNumber: 133,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-2 text-gray-400",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatBitrate"])(track.bitrate)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackRow.tsx",
                        lineNumber: 138,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-1 text-gray-400 text-center",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatFileFormat"])(track.fileFormat)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackRow.tsx",
                        lineNumber: 143,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-1 text-gray-400 text-center",
                        children: track.playCount
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackRow.tsx",
                        lineNumber: 148,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-2 text-gray-400",
                        children: [
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRating"])(track.rating),
                            track.mood && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-xs text-blue-400 truncate",
                                title: track.mood,
                                children: track.mood
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackRow.tsx",
                                lineNumber: 156,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/TrackRow.tsx",
                        lineNumber: 153,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-1 flex justify-center relative",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setShowActionsMenu(!showActionsMenu),
                                className: "p-2 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$ellipsis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MoreHorizontal$3e$__["MoreHorizontal"], {
                                    className: "w-4 h-4"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/TrackRow.tsx",
                                    lineNumber: 168,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackRow.tsx",
                                lineNumber: 164,
                                columnNumber: 11
                            }, this),
                            showActionsMenu && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "py-1",
                                    children: [
                                        onEdit && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: handleEdit,
                                            className: "w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2d$pen$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Edit$3e$__["Edit"], {
                                                    className: "w-4 h-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/TrackRow.tsx",
                                                    lineNumber: 181,
                                                    columnNumber: 21
                                                }, this),
                                                "Edit Metadata"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/ui/TrackRow.tsx",
                                            lineNumber: 177,
                                            columnNumber: 19
                                        }, this),
                                        context === 'library' && onAddToPlaylist && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: handleAddToPlaylist,
                                            className: "w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListPlus$3e$__["ListPlus"], {
                                                    className: "w-4 h-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/TrackRow.tsx",
                                                    lineNumber: 192,
                                                    columnNumber: 21
                                                }, this),
                                                "Add to Playlist"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/ui/TrackRow.tsx",
                                            lineNumber: 188,
                                            columnNumber: 19
                                        }, this),
                                        onDelete && (onEdit || context === 'library' && onAddToPlaylist) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "border-t border-gray-600 my-1"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/ui/TrackRow.tsx",
                                            lineNumber: 199,
                                            columnNumber: 19
                                        }, this),
                                        onDelete && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: handleDelete,
                                            className: "w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 hover:text-red-300 flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                    className: "w-4 h-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/TrackRow.tsx",
                                                    lineNumber: 208,
                                                    columnNumber: 21
                                                }, this),
                                                "Delete from Library"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/ui/TrackRow.tsx",
                                            lineNumber: 204,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/ui/TrackRow.tsx",
                                    lineNumber: 174,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackRow.tsx",
                                lineNumber: 173,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/TrackRow.tsx",
                        lineNumber: 163,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/TrackRow.tsx",
                lineNumber: 73,
                columnNumber: 7
            }, this),
            showActionsMenu && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-5",
                onClick: ()=>setShowActionsMenu(false)
            }, void 0, false, {
                fileName: "[project]/src/components/ui/TrackRow.tsx",
                lineNumber: 220,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/TrackRow.tsx",
        lineNumber: 56,
        columnNumber: 5
    }, this);
}
_s(TrackRow, "/OjFsec0mHqnpsVLvk4LymUnCVQ=");
_c = TrackRow;
var _c;
__turbopack_context__.k.register(_c, "TrackRow");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/TrackCard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TrackCard",
    ()=>TrackCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$play$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Play$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/play.js [app-client] (ecmascript) <export default as Play>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Music$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/music.js [app-client] (ecmascript) <export default as Music>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/cn.ts [app-client] (ecmascript)");
'use client';
;
;
;
;
function TrackCard({ track, isSelected, onSelect }) {
    const handlePlay = ()=>{
        // TODO: Implement play functionality
        console.log('Play track:', track.title);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors group cursor-pointer', isSelected && 'ring-2 ring-blue-500'),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "aspect-square bg-gray-700 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Music$3e$__["Music"], {
                        className: "w-12 h-12 text-gray-500"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackCard.tsx",
                        lineNumber: 29,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: handlePlay,
                        className: "absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$play$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Play$3e$__["Play"], {
                                className: "w-6 h-6 text-white ml-0.5"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackCard.tsx",
                                lineNumber: 37,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/TrackCard.tsx",
                            lineNumber: 36,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackCard.tsx",
                        lineNumber: 32,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "checkbox",
                        checked: isSelected,
                        onChange: (e)=>onSelect(e.target.checked),
                        className: "absolute top-2 right-2 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackCard.tsx",
                        lineNumber: 42,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/TrackCard.tsx",
                lineNumber: 28,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-white font-medium truncate",
                        title: track.title,
                        children: track.title
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackCard.tsx",
                        lineNumber: 52,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-gray-400 text-sm truncate",
                        title: track.artist,
                        children: track.artist
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackCard.tsx",
                        lineNumber: 55,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-gray-500 text-xs truncate",
                        title: track.album,
                        children: track.album
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackCard.tsx",
                        lineNumber: 58,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between pt-1 text-xs text-gray-500",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: track.genre || 'Unknown'
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackCard.tsx",
                                lineNumber: 63,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: track.year || '—'
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackCard.tsx",
                                lineNumber: 64,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/TrackCard.tsx",
                        lineNumber: 62,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between pt-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-gray-500 text-xs",
                                children: [
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDuration"])(track.duration),
                                    " • ",
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatFileFormat"])(track.fileFormat)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ui/TrackCard.tsx",
                                lineNumber: 68,
                                columnNumber: 11
                            }, this),
                            track.rating && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-gray-500 text-xs",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRating"])(track.rating)
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackCard.tsx",
                                lineNumber: 72,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/TrackCard.tsx",
                        lineNumber: 67,
                        columnNumber: 9
                    }, this),
                    track.bitrate && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-gray-500 text-xs",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatBitrate"])(track.bitrate)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackCard.tsx",
                        lineNumber: 79,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/TrackCard.tsx",
                lineNumber: 51,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/TrackCard.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
_c = TrackCard;
var _c;
__turbopack_context__.k.register(_c, "TrackCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/TrackGrid.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TrackGrid",
    ()=>TrackGrid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TrackCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/TrackCard.tsx [app-client] (ecmascript)");
'use client';
;
;
function TrackGrid({ tracks, selectedTrackIds, onTrackSelect }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "p-6",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6",
            children: tracks.map((track)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TrackCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TrackCard"], {
                    track: track,
                    isSelected: selectedTrackIds.includes(track.id),
                    onSelect: (isSelected)=>onTrackSelect(track.id, isSelected)
                }, track.id, false, {
                    fileName: "[project]/src/components/ui/TrackGrid.tsx",
                    lineNumber: 17,
                    columnNumber: 11
                }, this))
        }, void 0, false, {
            fileName: "[project]/src/components/ui/TrackGrid.tsx",
            lineNumber: 15,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/ui/TrackGrid.tsx",
        lineNumber: 14,
        columnNumber: 5
    }, this);
}
_c = TrackGrid;
var _c;
__turbopack_context__.k.register(_c, "TrackGrid");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/TrackList.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TrackList",
    ()=>TrackList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TrackRow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/TrackRow.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TrackGrid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/TrackGrid.tsx [app-client] (ecmascript)");
'use client';
;
;
;
function TrackList({ tracks, viewMode, selectedTrackIds = [], onSelectionChange, onDelete, onEdit, onAddToPlaylist, onBulkEdit, onBulkAddToPlaylist, showSelection = false, context = 'library' }) {
    const handleTrackSelect = (trackId, isSelected)=>{
        if (!onSelectionChange) return;
        if (isSelected) {
            onSelectionChange([
                ...selectedTrackIds,
                trackId
            ]);
        } else {
            onSelectionChange(selectedTrackIds.filter((id)=>id !== trackId));
        }
    };
    const handleSelectAll = ()=>{
        if (!onSelectionChange) return;
        if (selectedTrackIds.length === tracks.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(tracks.map((t)=>t.id));
        }
    };
    if (viewMode === 'grid') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TrackGrid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TrackGrid"], {
            tracks: tracks,
            selectedTrackIds: selectedTrackIds,
            onTrackSelect: handleTrackSelect
        }, void 0, false, {
            fileName: "[project]/src/components/ui/TrackList.tsx",
            lineNumber: 55,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col h-full",
        children: [
            showSelection && selectedTrackIds.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between px-6 py-3 bg-blue-600 text-white",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-sm font-medium",
                        children: [
                            selectedTrackIds.length,
                            " track",
                            selectedTrackIds.length !== 1 ? 's' : '',
                            " selected"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/TrackList.tsx",
                        lineNumber: 68,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>onBulkEdit?.(selectedTrackIds),
                                className: "px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm transition-colors",
                                children: "Edit Selected"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 72,
                                columnNumber: 13
                            }, this),
                            context === 'library' && onBulkAddToPlaylist && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>onBulkAddToPlaylist(selectedTrackIds),
                                className: "px-3 py-1 bg-green-700 hover:bg-green-800 rounded text-sm transition-colors",
                                children: "Add to Playlist"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 79,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>onSelectionChange?.([]),
                                className: "px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm transition-colors",
                                children: "Clear Selection"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 86,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/TrackList.tsx",
                        lineNumber: 71,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/TrackList.tsx",
                lineNumber: 67,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center px-6 py-3 border-b border-gray-700 bg-gray-800",
                children: [
                    showSelection && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "checkbox",
                        checked: selectedTrackIds.length === tracks.length && tracks.length > 0,
                        onChange: handleSelectAll,
                        className: "mr-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TrackList.tsx",
                        lineNumber: 99,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 grid grid-cols-24 gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "col-span-4",
                                children: "Title"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 107,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "col-span-3",
                                children: "Artist"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 108,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "col-span-3",
                                children: "Album"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 109,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "col-span-2",
                                children: "Genre"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 110,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "col-span-1",
                                children: "Year"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 111,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "col-span-1",
                                children: "Track"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 112,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "col-span-1",
                                children: "Disc"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 113,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "col-span-2",
                                children: "Duration"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 114,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "col-span-2",
                                children: "Bitrate"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 115,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "col-span-1",
                                children: "Format"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 116,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "col-span-1",
                                children: "Plays"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 117,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "col-span-2",
                                children: "Rating"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 118,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "col-span-1",
                                children: "Actions"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TrackList.tsx",
                                lineNumber: 119,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/TrackList.tsx",
                        lineNumber: 106,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/TrackList.tsx",
                lineNumber: 97,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 overflow-auto",
                children: tracks.map((track, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TrackRow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TrackRow"], {
                        track: track,
                        index: index,
                        isSelected: selectedTrackIds.includes(track.id),
                        onSelect: showSelection ? (isSelected)=>handleTrackSelect(track.id, isSelected) : undefined,
                        onDelete: onDelete,
                        onEdit: onEdit,
                        onAddToPlaylist: onAddToPlaylist,
                        context: context
                    }, track.id, false, {
                        fileName: "[project]/src/components/ui/TrackList.tsx",
                        lineNumber: 126,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/ui/TrackList.tsx",
                lineNumber: 124,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/TrackList.tsx",
        lineNumber: 64,
        columnNumber: 5
    }, this);
}
_c = TrackList;
var _c;
__turbopack_context__.k.register(_c, "TrackList");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/ViewControls.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ViewControls",
    ()=>ViewControls
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__List$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/list.js [app-client] (ecmascript) <export default as List>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$grid$2d$3x3$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Grid$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/grid-3x3.js [app-client] (ecmascript) <export default as Grid>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUpDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-up-down.js [app-client] (ecmascript) <export default as ArrowUpDown>");
'use client';
;
;
const sortOptions = [
    {
        key: 'title',
        label: 'Title'
    },
    {
        key: 'artist',
        label: 'Artist'
    },
    {
        key: 'album',
        label: 'Album'
    },
    {
        key: 'genre',
        label: 'Genre'
    },
    {
        key: 'year',
        label: 'Year'
    },
    {
        key: 'trackNumber',
        label: 'Track Number'
    },
    {
        key: 'discNumber',
        label: 'Disc Number'
    },
    {
        key: 'duration',
        label: 'Duration'
    },
    {
        key: 'bitrate',
        label: 'Bitrate'
    },
    {
        key: 'fileFormat',
        label: 'File Format'
    },
    {
        key: 'dateAdded',
        label: 'Date Added'
    },
    {
        key: 'playCount',
        label: 'Play Count'
    },
    {
        key: 'rating',
        label: 'Rating'
    }
];
function ViewControls({ viewMode, onViewModeChange, sortBy, sortOrder, onSortChange }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center gap-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                        value: sortBy,
                        onChange: (e)=>onSortChange(e.target.value, sortOrder),
                        className: "px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm",
                        children: sortOptions.map((option)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: option.key,
                                children: option.label
                            }, option.key, false, {
                                fileName: "[project]/src/components/ui/ViewControls.tsx",
                                lineNumber: 47,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/ViewControls.tsx",
                        lineNumber: 41,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc'),
                        className: "p-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700 transition-colors",
                        title: `Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUpDown$3e$__["ArrowUpDown"], {
                            className: `w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/ViewControls.tsx",
                            lineNumber: 58,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/ViewControls.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/ViewControls.tsx",
                lineNumber: 40,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex bg-gray-800 border border-gray-600 rounded-lg",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>onViewModeChange('list'),
                        className: `p-2 rounded-l-lg transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`,
                        title: "List view",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__List$3e$__["List"], {
                            className: "w-4 h-4"
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/ViewControls.tsx",
                            lineNumber: 73,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/ViewControls.tsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>onViewModeChange('grid'),
                        className: `p-2 rounded-r-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`,
                        title: "Grid view",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$grid$2d$3x3$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Grid$3e$__["Grid"], {
                            className: "w-4 h-4"
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/ViewControls.tsx",
                            lineNumber: 84,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/ViewControls.tsx",
                        lineNumber: 75,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/ViewControls.tsx",
                lineNumber: 63,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/ViewControls.tsx",
        lineNumber: 38,
        columnNumber: 5
    }, this);
}
_c = ViewControls;
var _c;
__turbopack_context__.k.register(_c, "ViewControls");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/EmptyState.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EmptyState",
    ()=>EmptyState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
'use client';
;
function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "text-center py-12",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                className: "w-16 h-16 mx-auto text-gray-500 mb-4"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/EmptyState.tsx",
                lineNumber: 22,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "text-lg font-semibold text-white mb-2",
                children: title
            }, void 0, false, {
                fileName: "[project]/src/components/ui/EmptyState.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-gray-400 mb-6 max-w-md mx-auto",
                children: description
            }, void 0, false, {
                fileName: "[project]/src/components/ui/EmptyState.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, this),
            actionLabel && onAction && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: onAction,
                className: "px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors",
                children: actionLabel
            }, void 0, false, {
                fileName: "[project]/src/components/ui/EmptyState.tsx",
                lineNumber: 27,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/EmptyState.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
_c = EmptyState;
var _c;
__turbopack_context__.k.register(_c, "EmptyState");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/modals/EditTrackModal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EditTrackModal",
    ()=>EditTrackModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store/music-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/tag-service.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/star.js [app-client] (ecmascript) <export default as Star>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function EditTrackModal({ isOpen, onClose, track, tracks = [], isBulkEdit = false }) {
    _s();
    const { updateTrack, tracks: allTracks } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"])();
    // Form state
    const [title, setTitle] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [artist, setArtist] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [album, setAlbum] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [genre, setGenre] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [year, setYear] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [trackNumber, setTrackNumber] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [discNumber, setDiscNumber] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [rating, setRating] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [mood, setMood] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [customTags, setCustomTags] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [newTag, setNewTag] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [showTagSuggestions, setShowTagSuggestions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showMoodSuggestions, setShowMoodSuggestions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Bulk edit specific state
    const [bulkFields, setBulkFields] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        genre: false,
        year: false,
        rating: false,
        mood: false,
        customTags: false
    });
    // Initialize form with track data
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EditTrackModal.useEffect": ()=>{
            if (track && !isBulkEdit) {
                setTitle(track.title);
                setArtist(track.artist);
                setAlbum(track.album);
                setGenre(track.genre || '');
                setYear(track.year || '');
                setTrackNumber(track.trackNumber || '');
                setDiscNumber(track.discNumber || '');
                setRating(track.rating || 0);
                setMood(track.mood || '');
                setCustomTags([
                    ...track.customTags || []
                ]);
            } else if (isBulkEdit) {
                // Reset form for bulk edit
                setTitle('');
                setArtist('');
                setAlbum('');
                setGenre('');
                setYear('');
                setTrackNumber('');
                setDiscNumber('');
                setRating(0);
                setMood('');
                setCustomTags([]);
                setBulkFields({
                    genre: false,
                    year: false,
                    rating: false,
                    mood: false,
                    customTags: false
                });
            }
        }
    }["EditTrackModal.useEffect"], [
        track,
        isBulkEdit,
        isOpen
    ]);
    const handleAddTag = ()=>{
        if (newTag.trim() && !customTags.includes(newTag.trim())) {
            const normalizedTags = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].normalizeTags([
                ...customTags,
                newTag.trim()
            ]);
            setCustomTags(normalizedTags);
            setNewTag('');
            setShowTagSuggestions(false);
        }
    };
    const handleAddSuggestedTag = (tag)=>{
        if (!customTags.includes(tag)) {
            setCustomTags([
                ...customTags,
                tag
            ]);
        }
        setShowTagSuggestions(false);
    };
    const handleAddSuggestedMood = (mood)=>{
        setMood(mood);
        setShowMoodSuggestions(false);
    };
    const handleRemoveTag = (tagToRemove)=>{
        setCustomTags(customTags.filter((tag)=>tag !== tagToRemove));
    };
    const handleSubmit = async (e)=>{
        e.preventDefault();
        if (isBulkEdit) {
            // Bulk update selected tracks
            for (const trackToUpdate of tracks){
                const updatedTrack = {
                    ...trackToUpdate,
                    ...bulkFields.genre && {
                        genre
                    },
                    ...bulkFields.year && year && {
                        year: Number(year)
                    },
                    ...bulkFields.rating && {
                        rating
                    },
                    ...bulkFields.mood && {
                        mood: mood ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].normalizeMood(mood) : undefined
                    },
                    ...bulkFields.customTags && {
                        customTags: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].normalizeTags([
                            ...trackToUpdate.customTags,
                            ...customTags
                        ])
                    }
                };
                await updateTrack(updatedTrack);
            }
        } else if (track) {
            // Single track update
            const updatedTrack = {
                ...track,
                title,
                artist,
                album,
                genre: genre || undefined,
                year: year ? Number(year) : undefined,
                trackNumber: trackNumber ? Number(trackNumber) : undefined,
                discNumber: discNumber ? Number(discNumber) : undefined,
                rating,
                mood: mood ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].normalizeMood(mood) : undefined,
                customTags: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].normalizeTags(customTags)
            };
            await updateTrack(updatedTrack);
        }
        onClose();
    };
    const renderStarRating = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center gap-1",
            children: [
                [
                    1,
                    2,
                    3,
                    4,
                    5
                ].map((star)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>setRating(star === rating ? 0 : star),
                        className: `p-1 rounded transition-colors ${star <= rating ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-gray-300'}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__["Star"], {
                            className: `w-5 h-5 ${star <= rating ? 'fill-current' : ''}`
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                            lineNumber: 162,
                            columnNumber: 11
                        }, this)
                    }, star, false, {
                        fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                        lineNumber: 152,
                        columnNumber: 9
                    }, this)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "ml-2 text-sm text-gray-400",
                    children: rating > 0 ? `${rating}/5` : 'No rating'
                }, void 0, false, {
                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                    lineNumber: 165,
                    columnNumber: 7
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
            lineNumber: 150,
            columnNumber: 5
        }, this);
    if (!isOpen) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-bold text-white",
                            children: isBulkEdit ? `Edit ${tracks.length} Tracks` : `Edit Track: ${track?.title}`
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                            lineNumber: 177,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onClose,
                            className: "text-gray-400 hover:text-white transition-colors",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                className: "w-6 h-6"
                            }, void 0, false, {
                                fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                lineNumber: 187,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                            lineNumber: 183,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                    lineNumber: 176,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSubmit,
                    className: "space-y-4",
                    children: [
                        !isBulkEdit && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-2 gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-sm font-medium text-gray-300 mb-1",
                                                    children: "Title"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 197,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "text",
                                                    value: title,
                                                    onChange: (e)=>setTitle(e.target.value),
                                                    className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                                                    required: true
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 200,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 196,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-sm font-medium text-gray-300 mb-1",
                                                    children: "Artist"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 209,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "text",
                                                    value: artist,
                                                    onChange: (e)=>setArtist(e.target.value),
                                                    className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                                                    required: true
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 212,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 208,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                    lineNumber: 195,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-2 gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-sm font-medium text-gray-300 mb-1",
                                                    children: "Album"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 224,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "text",
                                                    value: album,
                                                    onChange: (e)=>setAlbum(e.target.value),
                                                    className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                                                    required: true
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 227,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 223,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-sm font-medium text-gray-300 mb-1",
                                                    children: "Genre"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 236,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "text",
                                                    value: genre,
                                                    onChange: (e)=>setGenre(e.target.value),
                                                    className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 239,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 235,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                    lineNumber: 222,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-3 gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-sm font-medium text-gray-300 mb-1",
                                                    children: "Year"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 250,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "number",
                                                    value: year,
                                                    onChange: (e)=>setYear(e.target.value ? Number(e.target.value) : ''),
                                                    className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                                                    min: "1900",
                                                    max: "2100"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 253,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 249,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-sm font-medium text-gray-300 mb-1",
                                                    children: "Track #"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 263,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "number",
                                                    value: trackNumber,
                                                    onChange: (e)=>setTrackNumber(e.target.value ? Number(e.target.value) : ''),
                                                    className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                                                    min: "1"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 266,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 262,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-sm font-medium text-gray-300 mb-1",
                                                    children: "Disc #"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 275,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "number",
                                                    value: discNumber,
                                                    onChange: (e)=>setDiscNumber(e.target.value ? Number(e.target.value) : ''),
                                                    className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                                                    min: "1"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 278,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 274,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                    lineNumber: 248,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-4 border-t border-gray-600 pt-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-lg font-medium text-white",
                                    children: isBulkEdit ? 'Bulk Edit Fields' : 'Additional Metadata'
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                    lineNumber: 292,
                                    columnNumber: 13
                                }, this),
                                isBulkEdit && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "checkbox",
                                            id: "bulk-genre",
                                            checked: bulkFields.genre,
                                            onChange: (e)=>setBulkFields((prev)=>({
                                                        ...prev,
                                                        genre: e.target.checked
                                                    })),
                                            className: "rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 299,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            htmlFor: "bulk-genre",
                                            className: "text-sm font-medium text-gray-300 flex-1",
                                            children: "Genre"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 306,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: genre,
                                            onChange: (e)=>setGenre(e.target.value),
                                            disabled: !bulkFields.genre,
                                            className: "px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed",
                                            placeholder: "Enter genre"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 309,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                    lineNumber: 298,
                                    columnNumber: 15
                                }, this),
                                isBulkEdit && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "checkbox",
                                            id: "bulk-year",
                                            checked: bulkFields.year,
                                            onChange: (e)=>setBulkFields((prev)=>({
                                                        ...prev,
                                                        year: e.target.checked
                                                    })),
                                            className: "rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 323,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            htmlFor: "bulk-year",
                                            className: "text-sm font-medium text-gray-300 flex-1",
                                            children: "Year"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 330,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "number",
                                            value: year,
                                            onChange: (e)=>setYear(e.target.value ? Number(e.target.value) : ''),
                                            disabled: !bulkFields.year,
                                            className: "px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed",
                                            placeholder: "Enter year",
                                            min: "1900",
                                            max: "2100"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 333,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                    lineNumber: 322,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: isBulkEdit ? "flex items-center gap-3" : "",
                                    children: [
                                        isBulkEdit && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "checkbox",
                                                    id: "bulk-rating",
                                                    checked: bulkFields.rating,
                                                    onChange: (e)=>setBulkFields((prev)=>({
                                                                ...prev,
                                                                rating: e.target.checked
                                                            })),
                                                    className: "rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 350,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    htmlFor: "bulk-rating",
                                                    className: "text-sm font-medium text-gray-300 flex-1",
                                                    children: "Rating"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 357,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true),
                                        !isBulkEdit && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-sm font-medium text-gray-300 mb-2",
                                            children: "Rating"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 363,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: isBulkEdit && !bulkFields.rating ? "opacity-50 pointer-events-none" : "",
                                            children: renderStarRating()
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 367,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                    lineNumber: 347,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: isBulkEdit ? "flex items-center gap-3" : "",
                                    children: [
                                        isBulkEdit && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "checkbox",
                                                    id: "bulk-mood",
                                                    checked: bulkFields.mood,
                                                    onChange: (e)=>setBulkFields((prev)=>({
                                                                ...prev,
                                                                mood: e.target.checked
                                                            })),
                                                    className: "rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 376,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    htmlFor: "bulk-mood",
                                                    className: "text-sm font-medium text-gray-300 w-20",
                                                    children: "Mood"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 383,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true),
                                        !isBulkEdit && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-sm font-medium text-gray-300 mb-1",
                                            children: "Mood"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 389,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: `relative ${isBulkEdit ? 'flex-1' : 'w-full'}`,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "text",
                                                    value: mood,
                                                    onChange: (e)=>setMood(e.target.value),
                                                    onFocus: ()=>setShowMoodSuggestions(true),
                                                    onBlur: ()=>setTimeout(()=>setShowMoodSuggestions(false), 200),
                                                    disabled: isBulkEdit && !bulkFields.mood,
                                                    className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed",
                                                    placeholder: "e.g., Happy, Melancholic, Energetic"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 394,
                                                    columnNumber: 17
                                                }, this),
                                                showMoodSuggestions && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20 max-h-40 overflow-y-auto",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "p-2 border-b border-gray-600",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "text-xs text-gray-400 mb-1",
                                                                    children: "Suggested"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                    lineNumber: 410,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex flex-wrap gap-1",
                                                                    children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].getPredefinedMoods().slice(0, 10).map((suggestedMood)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                            type: "button",
                                                                            onClick: ()=>handleAddSuggestedMood(suggestedMood),
                                                                            className: "px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors",
                                                                            children: suggestedMood
                                                                        }, suggestedMood, false, {
                                                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                            lineNumber: 413,
                                                                            columnNumber: 27
                                                                        }, this))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                    lineNumber: 411,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                            lineNumber: 409,
                                                            columnNumber: 21
                                                        }, this),
                                                        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].getMoodSuggestions(allTracks, mood, 5).length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "p-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "text-xs text-gray-400 mb-1",
                                                                    children: "From your library"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                    lineNumber: 428,
                                                                    columnNumber: 25
                                                                }, this),
                                                                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].getMoodSuggestions(allTracks, mood, 5).map(({ mood: existingMood, count })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        type: "button",
                                                                        onClick: ()=>handleAddSuggestedMood(existingMood),
                                                                        className: "block w-full text-left px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors",
                                                                        children: [
                                                                            existingMood,
                                                                            " ",
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-gray-500",
                                                                                children: [
                                                                                    "(",
                                                                                    count,
                                                                                    ")"
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                                lineNumber: 436,
                                                                                columnNumber: 44
                                                                            }, this)
                                                                        ]
                                                                    }, existingMood, true, {
                                                                        fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                        lineNumber: 430,
                                                                        columnNumber: 27
                                                                    }, this))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                            lineNumber: 427,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 407,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 393,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                    lineNumber: 373,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: isBulkEdit ? "flex items-start gap-3" : "",
                                    children: [
                                        isBulkEdit && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "checkbox",
                                                    id: "bulk-tags",
                                                    checked: bulkFields.customTags,
                                                    onChange: (e)=>setBulkFields((prev)=>({
                                                                ...prev,
                                                                customTags: e.target.checked
                                                            })),
                                                    className: "rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 mt-2"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 450,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    htmlFor: "bulk-tags",
                                                    className: "text-sm font-medium text-gray-300 w-20 mt-2",
                                                    children: "Add Tags"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 457,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: `${isBulkEdit ? 'flex-1' : 'w-full'} ${isBulkEdit && !bulkFields.customTags ? "opacity-50 pointer-events-none" : ""}`,
                                            children: [
                                                !isBulkEdit && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-sm font-medium text-gray-300 mb-2",
                                                    children: "Custom Tags"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 464,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "relative",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex gap-2 mb-3",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    type: "text",
                                                                    value: newTag,
                                                                    onChange: (e)=>setNewTag(e.target.value),
                                                                    onFocus: ()=>setShowTagSuggestions(true),
                                                                    onBlur: ()=>setTimeout(()=>setShowTagSuggestions(false), 200),
                                                                    onKeyPress: (e)=>e.key === 'Enter' && (e.preventDefault(), handleAddTag()),
                                                                    className: "flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                                                                    placeholder: "Add a tag..."
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                    lineNumber: 472,
                                                                    columnNumber: 21
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    type: "button",
                                                                    onClick: handleAddTag,
                                                                    className: "px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                                                        className: "w-4 h-4"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                        lineNumber: 487,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                    lineNumber: 482,
                                                                    columnNumber: 21
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                            lineNumber: 471,
                                                            columnNumber: 19
                                                        }, this),
                                                        showTagSuggestions && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20 max-h-40 overflow-y-auto",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "p-2 border-b border-gray-600",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "text-xs text-gray-400 mb-1",
                                                                            children: "Suggested"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                            lineNumber: 496,
                                                                            columnNumber: 25
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex flex-wrap gap-1",
                                                                            children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].getPredefinedTags().slice(0, 10).map((suggestedTag)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                    type: "button",
                                                                                    onClick: ()=>handleAddSuggestedTag(suggestedTag),
                                                                                    className: "px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors",
                                                                                    children: suggestedTag
                                                                                }, suggestedTag, false, {
                                                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                                    lineNumber: 499,
                                                                                    columnNumber: 29
                                                                                }, this))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                            lineNumber: 497,
                                                                            columnNumber: 25
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                    lineNumber: 495,
                                                                    columnNumber: 23
                                                                }, this),
                                                                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].getTagSuggestions(allTracks, newTag, 5).length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "p-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "text-xs text-gray-400 mb-1",
                                                                            children: "From your library"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                            lineNumber: 514,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].getTagSuggestions(allTracks, newTag, 5).map(({ tag, count })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                type: "button",
                                                                                onClick: ()=>handleAddSuggestedTag(tag),
                                                                                className: "block w-full text-left px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors",
                                                                                children: [
                                                                                    tag,
                                                                                    " ",
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "text-gray-500",
                                                                                        children: [
                                                                                            "(",
                                                                                            count,
                                                                                            ")"
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                                        lineNumber: 522,
                                                                                        columnNumber: 37
                                                                                    }, this)
                                                                                ]
                                                                            }, tag, true, {
                                                                                fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                                lineNumber: 516,
                                                                                columnNumber: 29
                                                                            }, this))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                    lineNumber: 513,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                            lineNumber: 493,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 470,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex flex-wrap gap-2",
                                                    children: customTags.map((tag, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-sm rounded-full",
                                                            children: [
                                                                tag,
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    type: "button",
                                                                    onClick: ()=>handleRemoveTag(tag),
                                                                    className: "text-blue-200 hover:text-white transition-colors",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                                                        className: "w-3 h-3"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                        lineNumber: 544,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                                    lineNumber: 539,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, index, true, {
                                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                            lineNumber: 534,
                                                            columnNumber: 21
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                                    lineNumber: 532,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                            lineNumber: 462,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                    lineNumber: 447,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                            lineNumber: 291,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-end gap-3 pt-4 border-t border-gray-600",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: onClose,
                                    className: "px-4 py-2 text-gray-300 hover:text-white transition-colors",
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                    lineNumber: 555,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors",
                                    children: isBulkEdit ? `Update ${tracks.length} Tracks` : 'Save Changes'
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                                    lineNumber: 562,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                            lineNumber: 554,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/EditTrackModal.tsx",
                    lineNumber: 191,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/modals/EditTrackModal.tsx",
            lineNumber: 175,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/modals/EditTrackModal.tsx",
        lineNumber: 174,
        columnNumber: 5
    }, this);
}
_s(EditTrackModal, "uVq3FvhCmSvw9Nj/EnkO7BkiBGA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"]
    ];
});
_c = EditTrackModal;
var _c;
__turbopack_context__.k.register(_c, "EditTrackModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/modals/TagManagementModal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TagManagementModal",
    ()=>TagManagementModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store/music-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/tag-service.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2d$pen$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Edit$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/square-pen.js [app-client] (ecmascript) <export default as Edit>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$merge$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Merge$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/merge.js [app-client] (ecmascript) <export default as Merge>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function TagManagementModal({ isOpen, onClose }) {
    _s();
    const { tracks, updateTrack } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"])();
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('tags');
    const [allTags, setAllTags] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [allMoods, setAllMoods] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [similarTags, setSimilarTags] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedTags, setSelectedTags] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [editingTag, setEditingTag] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [newTagName, setNewTagName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TagManagementModal.useEffect": ()=>{
            if (isOpen) {
                setAllTags(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].getAllTags(tracks));
                setAllMoods(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].getAllMoods(tracks));
                setSimilarTags(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].findSimilarTags(tracks));
            }
        }
    }["TagManagementModal.useEffect"], [
        isOpen,
        tracks
    ]);
    const handleDeleteTag = async (tagToDelete)=>{
        if (!confirm(`Are you sure you want to delete the tag "${tagToDelete}" from all tracks?`)) {
            return;
        }
        const tracksWithTag = tracks.filter((track)=>track.customTags.includes(tagToDelete));
        for (const track of tracksWithTag){
            const updatedTrack = {
                ...track,
                customTags: track.customTags.filter((tag)=>tag !== tagToDelete)
            };
            await updateTrack(updatedTrack);
        }
        // Refresh data
        setAllTags(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].getAllTags(tracks));
    };
    const handleRenameTag = async (oldTag, newTag)=>{
        if (!newTag.trim() || oldTag === newTag) return;
        const normalizedNewTag = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].normalizeTags([
            newTag
        ])[0];
        const tracksWithTag = tracks.filter((track)=>track.customTags.includes(oldTag));
        for (const track of tracksWithTag){
            const updatedTags = track.customTags.map((tag)=>tag === oldTag ? normalizedNewTag : tag);
            const updatedTrack = {
                ...track,
                customTags: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].normalizeTags(updatedTags)
            };
            await updateTrack(updatedTrack);
        }
        setEditingTag(null);
        setNewTagName('');
        setAllTags(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].getAllTags(tracks));
    };
    const handleMergeTags = async (originalTag, tagsToMerge)=>{
        if (!confirm(`Merge ${tagsToMerge.length} similar tags into "${originalTag}"?`)) {
            return;
        }
        const allTagsToMerge = [
            originalTag,
            ...tagsToMerge
        ];
        const tracksToUpdate = tracks.filter((track)=>track.customTags.some((tag)=>allTagsToMerge.includes(tag)));
        for (const track of tracksToUpdate){
            const updatedTags = track.customTags.filter((tag)=>!allTagsToMerge.includes(tag));
            updatedTags.push(originalTag);
            const updatedTrack = {
                ...track,
                customTags: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].normalizeTags(updatedTags)
            };
            await updateTrack(updatedTrack);
        }
        // Refresh data
        setAllTags(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].getAllTags(tracks));
        setSimilarTags(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].findSimilarTags(tracks));
    };
    const handleBulkDeleteTags = async ()=>{
        if (selectedTags.length === 0) return;
        if (!confirm(`Delete ${selectedTags.length} selected tags from all tracks?`)) {
            return;
        }
        const tracksToUpdate = tracks.filter((track)=>track.customTags.some((tag)=>selectedTags.includes(tag)));
        for (const track of tracksToUpdate){
            const updatedTrack = {
                ...track,
                customTags: track.customTags.filter((tag)=>!selectedTags.includes(tag))
            };
            await updateTrack(updatedTrack);
        }
        setSelectedTags([]);
        setAllTags(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$tag$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tagService"].getAllTags(tracks));
    };
    if (!isOpen) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-bold text-white",
                            children: "Tag Management"
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                            lineNumber: 125,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onClose,
                            className: "text-gray-400 hover:text-white transition-colors",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                className: "w-6 h-6"
                            }, void 0, false, {
                                fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                lineNumber: 130,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                            lineNumber: 126,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                    lineNumber: 124,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex border-b border-gray-600 mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setActiveTab('tags'),
                            className: `px-4 py-2 font-medium transition-colors ${activeTab === 'tags' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`,
                            children: [
                                "Tags (",
                                allTags.length,
                                ")"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                            lineNumber: 136,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setActiveTab('moods'),
                            className: `px-4 py-2 font-medium transition-colors ${activeTab === 'moods' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`,
                            children: [
                                "Moods (",
                                allMoods.length,
                                ")"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                            lineNumber: 146,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setActiveTab('cleanup'),
                            className: `px-4 py-2 font-medium transition-colors ${activeTab === 'cleanup' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`,
                            children: [
                                "Cleanup (",
                                similarTags.length,
                                ")"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                            lineNumber: 156,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                    lineNumber: 135,
                    columnNumber: 9
                }, this),
                activeTab === 'tags' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-4",
                    children: [
                        selectedTags.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between p-3 bg-blue-600 rounded-lg",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-white",
                                    children: [
                                        selectedTags.length,
                                        " tag",
                                        selectedTags.length !== 1 ? 's' : '',
                                        " selected"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                    lineNumber: 173,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: handleBulkDeleteTags,
                                    className: "px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors",
                                    children: "Delete Selected"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                    lineNumber: 176,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                            lineNumber: 172,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid gap-2 max-h-96 overflow-y-auto",
                            children: allTags.map(({ tag, count })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between p-3 bg-gray-700 rounded-lg",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "checkbox",
                                                    checked: selectedTags.includes(tag),
                                                    onChange: (e)=>{
                                                        if (e.target.checked) {
                                                            setSelectedTags([
                                                                ...selectedTags,
                                                                tag
                                                            ]);
                                                        } else {
                                                            setSelectedTags(selectedTags.filter((t)=>t !== tag));
                                                        }
                                                    },
                                                    className: "rounded border-gray-600 bg-gray-600 text-blue-600 focus:ring-blue-500"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                    lineNumber: 192,
                                                    columnNumber: 21
                                                }, this),
                                                editingTag === tag ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "text",
                                                    value: newTagName,
                                                    onChange: (e)=>setNewTagName(e.target.value),
                                                    onKeyPress: (e)=>{
                                                        if (e.key === 'Enter') {
                                                            handleRenameTag(tag, newTagName);
                                                        } else if (e.key === 'Escape') {
                                                            setEditingTag(null);
                                                            setNewTagName('');
                                                        }
                                                    },
                                                    onBlur: ()=>handleRenameTag(tag, newTagName),
                                                    className: "px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                                                    autoFocus: true
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                    lineNumber: 205,
                                                    columnNumber: 23
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white font-medium",
                                                    children: tag
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                    lineNumber: 222,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-gray-400 text-sm",
                                                    children: [
                                                        "(",
                                                        count,
                                                        " tracks)"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                    lineNumber: 224,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                            lineNumber: 191,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>{
                                                        setEditingTag(tag);
                                                        setNewTagName(tag);
                                                    },
                                                    className: "p-1 text-gray-400 hover:text-blue-400 transition-colors",
                                                    title: "Rename tag",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2d$pen$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Edit$3e$__["Edit"], {
                                                        className: "w-4 h-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                        lineNumber: 236,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                    lineNumber: 228,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>handleDeleteTag(tag),
                                                    className: "p-1 text-gray-400 hover:text-red-400 transition-colors",
                                                    title: "Delete tag",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                        className: "w-4 h-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                        lineNumber: 243,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                    lineNumber: 238,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                            lineNumber: 227,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, tag, true, {
                                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                    lineNumber: 187,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                            lineNumber: 185,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                    lineNumber: 170,
                    columnNumber: 11
                }, this),
                activeTab === 'moods' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-2 max-h-96 overflow-y-auto",
                        children: allMoods.map(({ mood, count })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between p-3 bg-gray-700 rounded-lg",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-white font-medium",
                                            children: mood
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                            lineNumber: 262,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-gray-400 text-sm",
                                            children: [
                                                "(",
                                                count,
                                                " tracks)"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                            lineNumber: 263,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                    lineNumber: 261,
                                    columnNumber: 19
                                }, this)
                            }, mood, false, {
                                fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                lineNumber: 257,
                                columnNumber: 17
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                        lineNumber: 255,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                    lineNumber: 254,
                    columnNumber: 11
                }, this),
                activeTab === 'cleanup' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-gray-400 text-sm",
                            children: "Similar tags that might be duplicates or variations of the same concept."
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                            lineNumber: 274,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid gap-4 max-h-96 overflow-y-auto",
                            children: [
                                similarTags.map(({ original, similar, count })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 bg-gray-700 rounded-lg",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between mb-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-white font-medium",
                                                                children: original
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                                lineNumber: 286,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-gray-400 text-sm ml-2",
                                                                children: [
                                                                    "(",
                                                                    count,
                                                                    " tracks)"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                                lineNumber: 287,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                        lineNumber: 285,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>handleMergeTags(original, similar),
                                                        className: "px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors flex items-center gap-1",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$merge$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Merge$3e$__["Merge"], {
                                                                className: "w-3 h-3"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                                lineNumber: 293,
                                                                columnNumber: 23
                                                            }, this),
                                                            "Merge All"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                        lineNumber: 289,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                lineNumber: 284,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-sm text-gray-300",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-gray-400",
                                                        children: "Similar tags:"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                        lineNumber: 299,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex flex-wrap gap-2 mt-1",
                                                        children: similar.map((tag)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "px-2 py-1 bg-gray-600 rounded text-xs",
                                                                children: tag
                                                            }, tag, false, {
                                                                fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                                lineNumber: 302,
                                                                columnNumber: 25
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                        lineNumber: 300,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                                lineNumber: 298,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, original, true, {
                                        fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                        lineNumber: 280,
                                        columnNumber: 17
                                    }, this)),
                                similarTags.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-center py-8 text-gray-400",
                                    children: "No similar tags found. Your tags are well organized!"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                                    lineNumber: 315,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                            lineNumber: 278,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                    lineNumber: 273,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex justify-end pt-4 border-t border-gray-600 mt-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onClose,
                        className: "px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors",
                        children: "Close"
                    }, void 0, false, {
                        fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                        lineNumber: 325,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/modals/TagManagementModal.tsx",
                    lineNumber: 324,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/modals/TagManagementModal.tsx",
            lineNumber: 123,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/modals/TagManagementModal.tsx",
        lineNumber: 122,
        columnNumber: 5
    }, this);
}
_s(TagManagementModal, "XRE0E75dD1s657RhrZfsioNPCBs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"]
    ];
});
_c = TagManagementModal;
var _c;
__turbopack_context__.k.register(_c, "TagManagementModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/modals/AddToPlaylistModal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AddToPlaylistModal",
    ()=>AddToPlaylistModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store/music-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$playlist$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/playlist-service.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListMusic$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/list-music.js [app-client] (ecmascript) <export default as ListMusic>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$tag$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tag$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/tag.js [app-client] (ecmascript) <export default as Tag>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function AddToPlaylistModal({ isOpen, onClose, trackIds }) {
    _s();
    const { playlists, tracks, updatePlaylist, createPlaylist } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"])();
    const [showCreateNew, setShowCreateNew] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [newPlaylistName, setNewPlaylistName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [selectedPlaylistId, setSelectedPlaylistId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [isAdding, setIsAdding] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const trackTitles = trackIds.map((id)=>tracks.find((t)=>t.id === id)?.title).filter(Boolean);
    // Get only manual playlists (not tag-based)
    const manualPlaylists = playlists.filter((p)=>p.type === 'manual' && !__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$playlist$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playlistService"].isTagBasedPlaylist(p));
    const handleAddToSelectedPlaylist = async ()=>{
        if (!selectedPlaylistId) return;
        const playlist = playlists.find((p)=>p.id === selectedPlaylistId);
        if (!playlist) return;
        setIsAdding(true);
        try {
            // Add tracks to playlist, avoiding duplicates
            const existingTrackIds = new Set(playlist.trackIds);
            const newTrackIds = trackIds.filter((id)=>!existingTrackIds.has(id));
            if (newTrackIds.length === 0) {
                alert('All selected tracks are already in this playlist.');
                return;
            }
            const updatedPlaylist = {
                ...playlist,
                trackIds: [
                    ...playlist.trackIds,
                    ...newTrackIds
                ],
                dateModified: new Date()
            };
            await updatePlaylist(updatedPlaylist);
            onClose();
        } catch (error) {
            console.error('Failed to add tracks to playlist:', error);
            alert('Failed to add tracks to playlist. Please try again.');
        } finally{
            setIsAdding(false);
        }
    };
    const handleCreateNewPlaylist = async ()=>{
        if (!newPlaylistName.trim()) return;
        setIsAdding(true);
        try {
            await createPlaylist({
                name: newPlaylistName.trim(),
                type: 'manual',
                rules: [],
                trackIds: [
                    ...trackIds
                ],
                sortBy: 'dateAdded',
                sortOrder: 'desc'
            });
            setNewPlaylistName('');
            setShowCreateNew(false);
            onClose();
        } catch (error) {
            console.error('Failed to create playlist:', error);
            alert('Failed to create playlist. Please try again.');
        } finally{
            setIsAdding(false);
        }
    };
    const getPlaylistInfo = (playlistId)=>{
        const playlist = playlists.find((p)=>p.id === playlistId);
        if (!playlist) return {
            tracksInPlaylist: 0,
            newTracks: trackIds.length
        };
        const tracksInPlaylist = trackIds.filter((id)=>playlist.trackIds.includes(id)).length;
        const newTracks = trackIds.length - tracksInPlaylist;
        return {
            tracksInPlaylist,
            newTracks
        };
    };
    if (!isOpen) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-bold text-white",
                            children: "Add to Playlist"
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                            lineNumber: 101,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onClose,
                            className: "text-gray-400 hover:text-white transition-colors",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                className: "w-6 h-6"
                            }, void 0, false, {
                                fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                lineNumber: 108,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                            lineNumber: 104,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                    lineNumber: 100,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-6 p-3 bg-gray-700 rounded-lg",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-gray-300 mb-2",
                            children: [
                                "Adding ",
                                trackIds.length,
                                " track",
                                trackIds.length !== 1 ? 's' : '',
                                ":"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                            lineNumber: 114,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "max-h-20 overflow-y-auto",
                            children: [
                                trackTitles.slice(0, 3).map((title, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-white truncate",
                                        children: [
                                            "• ",
                                            title
                                        ]
                                    }, index, true, {
                                        fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                        lineNumber: 119,
                                        columnNumber: 15
                                    }, this)),
                                trackTitles.length > 3 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm text-gray-400",
                                    children: [
                                        "... and ",
                                        trackTitles.length - 3,
                                        " more"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                    lineNumber: 124,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                            lineNumber: 117,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                    lineNumber: 113,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-4",
                    children: !showCreateNew ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setShowCreateNew(true),
                        className: "w-full flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                className: "w-5 h-5"
                            }, void 0, false, {
                                fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                lineNumber: 138,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Create New Playlist"
                            }, void 0, false, {
                                fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                lineNumber: 139,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                        lineNumber: 134,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                value: newPlaylistName,
                                onChange: (e)=>setNewPlaylistName(e.target.value),
                                onKeyDown: (e)=>e.key === 'Enter' && handleCreateNewPlaylist(),
                                placeholder: "Enter playlist name",
                                className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
                                autoFocus: true
                            }, void 0, false, {
                                fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                lineNumber: 143,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleCreateNewPlaylist,
                                        disabled: !newPlaylistName.trim() || isAdding,
                                        className: "flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors",
                                        children: isAdding ? 'Creating...' : 'Create'
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                        lineNumber: 153,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>{
                                            setShowCreateNew(false);
                                            setNewPlaylistName('');
                                        },
                                        disabled: isAdding,
                                        className: "flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white rounded-lg transition-colors",
                                        children: "Cancel"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                        lineNumber: 160,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                lineNumber: 152,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                        lineNumber: 142,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                    lineNumber: 132,
                    columnNumber: 9
                }, this),
                manualPlaylists.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "text-sm font-medium text-gray-300 mb-3",
                            children: "Add to Existing Playlist"
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                            lineNumber: 178,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative mb-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    value: selectedPlaylistId,
                                    onChange: (e)=>setSelectedPlaylistId(e.target.value),
                                    className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "",
                                            className: "text-gray-400",
                                            children: "Select a playlist..."
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                            lineNumber: 189,
                                            columnNumber: 17
                                        }, this),
                                        manualPlaylists.map((playlist)=>{
                                            console.log("ManualPlaylist: ", playlist);
                                            const { tracksInPlaylist, newTracks } = getPlaylistInfo(playlist.id);
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: playlist.id,
                                                className: "text-white",
                                                children: [
                                                    playlist.name,
                                                    " (",
                                                    playlist.trackIds.length,
                                                    " tracks)",
                                                    tracksInPlaylist > 0 ? ` • ${tracksInPlaylist} already added` : ''
                                                ]
                                            }, playlist.id, true, {
                                                fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                                lineNumber: 196,
                                                columnNumber: 21
                                            }, this);
                                        })
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                    lineNumber: 184,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                    className: "absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                    lineNumber: 203,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                            lineNumber: 183,
                            columnNumber: 13
                        }, this),
                        selectedPlaylistId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-3 p-3 bg-gray-700/50 border border-gray-600 rounded-lg",
                            children: (()=>{
                                const playlist = playlists.find((p)=>p.id === selectedPlaylistId);
                                const { tracksInPlaylist, newTracks } = getPlaylistInfo(selectedPlaylistId);
                                if (!playlist) return null;
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListMusic$3e$__["ListMusic"], {
                                            className: "w-5 h-5 text-blue-400 flex-shrink-0"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                            lineNumber: 217,
                                            columnNumber: 23
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex-1 min-w-0",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-white font-medium truncate",
                                                    children: playlist.name
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                                    lineNumber: 219,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-gray-400 text-sm",
                                                    children: [
                                                        playlist.trackIds.length,
                                                        " tracks",
                                                        tracksInPlaylist > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-yellow-400",
                                                            children: [
                                                                ' ',
                                                                "• ",
                                                                tracksInPlaylist,
                                                                " already added"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                                            lineNumber: 225,
                                                            columnNumber: 29
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                                    lineNumber: 222,
                                                    columnNumber: 25
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                            lineNumber: 218,
                                            columnNumber: 23
                                        }, this),
                                        (()=>{
                                            const { newTracks } = getPlaylistInfo(selectedPlaylistId);
                                            return newTracks > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "bg-blue-600 text-white text-xs px-2 py-1 rounded-full",
                                                children: [
                                                    "+",
                                                    newTracks
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                                lineNumber: 234,
                                                columnNumber: 27
                                            }, this);
                                        })()
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                    lineNumber: 216,
                                    columnNumber: 21
                                }, this);
                            })()
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                            lineNumber: 208,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: handleAddToSelectedPlaylist,
                            disabled: !selectedPlaylistId || isAdding,
                            className: "w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors",
                            children: isAdding ? 'Adding...' : 'Add to Selected Playlist'
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                            lineNumber: 246,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                    lineNumber: 177,
                    columnNumber: 11
                }, this),
                playlists.some((p)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$playlist$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playlistService"].isTagBasedPlaylist(p)) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-4 p-3 bg-gray-700/50 border border-gray-600 rounded-lg",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-2 mb-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$tag$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tag$3e$__["Tag"], {
                                    className: "w-4 h-4 text-blue-400"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                    lineNumber: 260,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm font-medium text-gray-300",
                                    children: "Tag-Based Playlists"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                    lineNumber: 261,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                            lineNumber: 259,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-gray-400",
                            children: 'Tracks are automatically added to tag-based playlists when you assign matching tags. Use the "Edit Metadata" option to add tags to tracks.'
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                            lineNumber: 263,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                    lineNumber: 258,
                    columnNumber: 11
                }, this),
                manualPlaylists.length === 0 && !showCreateNew && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center py-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListMusic$3e$__["ListMusic"], {
                            className: "w-12 h-12 text-gray-500 mx-auto mb-3"
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                            lineNumber: 273,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-gray-400 text-sm",
                            children: [
                                "No manual playlists available.",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                                    lineNumber: 276,
                                    columnNumber: 15
                                }, this),
                                "Create a new playlist to add tracks."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                            lineNumber: 274,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                    lineNumber: 272,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex justify-end pt-4 border-t border-gray-600 mt-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onClose,
                        disabled: isAdding,
                        className: "px-4 py-2 text-gray-300 hover:text-white disabled:text-gray-500 transition-colors",
                        children: "Cancel"
                    }, void 0, false, {
                        fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                        lineNumber: 284,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
                    lineNumber: 283,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
            lineNumber: 99,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/modals/AddToPlaylistModal.tsx",
        lineNumber: 98,
        columnNumber: 5
    }, this);
}
_s(AddToPlaylistModal, "P+CtbLFDOFoz1v8wQO+HXFTmxpc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"]
    ];
});
_c = AddToPlaylistModal;
var _c;
__turbopack_context__.k.register(_c, "AddToPlaylistModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/views/LibraryView.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LibraryView",
    ()=>LibraryView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store/music-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$SearchBar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/SearchBar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$FilterBar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/FilterBar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TrackList$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/TrackList.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$ViewControls$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/ViewControls.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$EmptyState$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/EmptyState.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$modals$2f$EditTrackModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/modals/EditTrackModal.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$modals$2f$TagManagementModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/modals/TagManagementModal.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$modals$2f$AddToPlaylistModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/modals/AddToPlaylistModal.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Music$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/music.js [app-client] (ecmascript) <export default as Music>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2d$pen$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Edit$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/square-pen.js [app-client] (ecmascript) <export default as Edit>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$tags$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tags$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/tags.js [app-client] (ecmascript) <export default as Tags>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
;
;
;
function LibraryView() {
    _s();
    const { tracks, viewState, searchTracks, setFilters, setSorting, setSelectedTracks, deleteTrack } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"])();
    const [searchQuery, setSearchQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [viewMode, setViewMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('list');
    const [showSelection, setShowSelection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [editModalOpen, setEditModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [editingTrack, setEditingTrack] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [bulkEditTracks, setBulkEditTracks] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [tagManagementOpen, setTagManagementOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [addToPlaylistOpen, setAddToPlaylistOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [tracksToAddToPlaylist, setTracksToAddToPlaylist] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const handleDeleteTrack = async (trackId)=>{
        try {
            await deleteTrack(trackId);
        } catch (error) {
            console.error('Failed to delete track:', error);
        // TODO: Show error toast
        }
    };
    const handleEditTrack = (trackId)=>{
        setEditingTrack(trackId);
        setEditModalOpen(true);
    };
    const handleBulkEdit = (trackIds)=>{
        setBulkEditTracks(trackIds);
        setEditModalOpen(true);
    };
    const handleCloseEditModal = ()=>{
        setEditModalOpen(false);
        setEditingTrack(null);
        setBulkEditTracks([]);
    };
    const handleAddToPlaylist = (trackId)=>{
        setTracksToAddToPlaylist([
            trackId
        ]);
        setAddToPlaylistOpen(true);
    };
    const handleBulkAddToPlaylist = (trackIds)=>{
        setTracksToAddToPlaylist(trackIds);
        setAddToPlaylistOpen(true);
    };
    const handleCloseAddToPlaylistModal = ()=>{
        setAddToPlaylistOpen(false);
        setTracksToAddToPlaylist([]);
    };
    const toggleSelection = ()=>{
        setShowSelection(!showSelection);
        if (showSelection) {
            setSelectedTracks([]);
        }
    };
    // Filter and search tracks
    const filteredTracks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "LibraryView.useMemo[filteredTracks]": ()=>{
            let result = tracks;
            // Apply search
            if (searchQuery.trim()) {
                result = searchTracks(searchQuery);
            }
            // Apply filters
            if (viewState.filters.genre) {
                result = result.filter({
                    "LibraryView.useMemo[filteredTracks]": (track)=>track.genre === viewState.filters.genre
                }["LibraryView.useMemo[filteredTracks]"]);
            }
            if (viewState.filters.artist) {
                result = result.filter({
                    "LibraryView.useMemo[filteredTracks]": (track)=>track.artist === viewState.filters.artist
                }["LibraryView.useMemo[filteredTracks]"]);
            }
            if (viewState.filters.album) {
                result = result.filter({
                    "LibraryView.useMemo[filteredTracks]": (track)=>track.album === viewState.filters.album
                }["LibraryView.useMemo[filteredTracks]"]);
            }
            if (viewState.filters.year) {
                result = result.filter({
                    "LibraryView.useMemo[filteredTracks]": (track)=>track.year === viewState.filters.year
                }["LibraryView.useMemo[filteredTracks]"]);
            }
            if (viewState.filters.rating) {
                result = result.filter({
                    "LibraryView.useMemo[filteredTracks]": (track)=>track.rating && track.rating >= viewState.filters.rating
                }["LibraryView.useMemo[filteredTracks]"]);
            }
            if (viewState.filters.fileFormat) {
                result = result.filter({
                    "LibraryView.useMemo[filteredTracks]": (track)=>track.fileFormat === viewState.filters.fileFormat
                }["LibraryView.useMemo[filteredTracks]"]);
            }
            if (viewState.filters.customTag) {
                result = result.filter({
                    "LibraryView.useMemo[filteredTracks]": (track)=>track.customTags.includes(viewState.filters.customTag)
                }["LibraryView.useMemo[filteredTracks]"]);
            }
            if (viewState.filters.mood) {
                result = result.filter({
                    "LibraryView.useMemo[filteredTracks]": (track)=>track.mood === viewState.filters.mood
                }["LibraryView.useMemo[filteredTracks]"]);
            }
            // Apply sorting
            result = [
                ...result
            ].sort({
                "LibraryView.useMemo[filteredTracks]": (a, b)=>{
                    const aValue = a[viewState.sortBy];
                    const bValue = b[viewState.sortBy];
                    if (aValue === undefined && bValue === undefined) return 0;
                    if (aValue === undefined) return 1;
                    if (bValue === undefined) return -1;
                    let comparison = 0;
                    if (typeof aValue === 'string' && typeof bValue === 'string') {
                        comparison = aValue.localeCompare(bValue);
                    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                        comparison = aValue - bValue;
                    } else if (aValue instanceof Date && bValue instanceof Date) {
                        comparison = aValue.getTime() - bValue.getTime();
                    }
                    return viewState.sortOrder === 'asc' ? comparison : -comparison;
                }
            }["LibraryView.useMemo[filteredTracks]"]);
            return result;
        }
    }["LibraryView.useMemo[filteredTracks]"], [
        tracks,
        searchQuery,
        viewState,
        searchTracks
    ]);
    if (tracks.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex-1 flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$EmptyState$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmptyState"], {
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Music$3e$__["Music"],
                title: "No music in your library",
                description: "Import your music files to get started",
                actionLabel: "Import Music",
                onAction: ()=>{
                // TODO: Open import modal
                }
            }, void 0, false, {
                fileName: "[project]/src/components/views/LibraryView.tsx",
                lineNumber: 145,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/views/LibraryView.tsx",
            lineNumber: 144,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex-1 flex flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-6 border-b border-gray-700",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between mb-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "text-2xl font-bold text-white",
                                        children: "Music Library"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/views/LibraryView.tsx",
                                        lineNumber: 164,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-gray-400",
                                        children: [
                                            filteredTracks.length,
                                            " of ",
                                            tracks.length,
                                            " tracks",
                                            viewState.selectedTrackIds.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "ml-2 text-blue-400",
                                                children: [
                                                    "• ",
                                                    viewState.selectedTrackIds.length,
                                                    " selected"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/views/LibraryView.tsx",
                                                lineNumber: 168,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/views/LibraryView.tsx",
                                        lineNumber: 165,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/views/LibraryView.tsx",
                                lineNumber: 163,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setTagManagementOpen(true),
                                        className: "px-3 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$tags$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tags$3e$__["Tags"], {
                                                className: "w-4 h-4 mr-2 inline"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/views/LibraryView.tsx",
                                                lineNumber: 180,
                                                columnNumber: 15
                                            }, this),
                                            "Manage Tags"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/views/LibraryView.tsx",
                                        lineNumber: 176,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: toggleSelection,
                                        className: `px-3 py-2 rounded-md text-sm font-medium transition-colors ${showSelection ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2d$pen$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Edit$3e$__["Edit"], {
                                                className: "w-4 h-4 mr-2 inline"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/views/LibraryView.tsx",
                                                lineNumber: 192,
                                                columnNumber: 15
                                            }, this),
                                            showSelection ? 'Exit Selection' : 'Select Tracks'
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/views/LibraryView.tsx",
                                        lineNumber: 184,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$ViewControls$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ViewControls"], {
                                        viewMode: viewMode,
                                        onViewModeChange: setViewMode,
                                        sortBy: viewState.sortBy,
                                        sortOrder: viewState.sortOrder,
                                        onSortChange: setSorting
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/views/LibraryView.tsx",
                                        lineNumber: 196,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/views/LibraryView.tsx",
                                lineNumber: 175,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/views/LibraryView.tsx",
                        lineNumber: 162,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$SearchBar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SearchBar"], {
                                    value: searchQuery,
                                    onChange: setSearchQuery,
                                    placeholder: "Search tracks, artists, albums..."
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/LibraryView.tsx",
                                    lineNumber: 208,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/views/LibraryView.tsx",
                                lineNumber: 207,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$FilterBar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FilterBar"], {
                                tracks: tracks,
                                filters: viewState.filters,
                                onFiltersChange: setFilters
                            }, void 0, false, {
                                fileName: "[project]/src/components/views/LibraryView.tsx",
                                lineNumber: 215,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/views/LibraryView.tsx",
                        lineNumber: 206,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/views/LibraryView.tsx",
                lineNumber: 161,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 overflow-hidden",
                children: filteredTracks.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 flex items-center justify-center",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$EmptyState$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmptyState"], {
                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Music$3e$__["Music"],
                        title: "No tracks found",
                        description: "Try adjusting your search or filters"
                    }, void 0, false, {
                        fileName: "[project]/src/components/views/LibraryView.tsx",
                        lineNumber: 227,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/views/LibraryView.tsx",
                    lineNumber: 226,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TrackList$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TrackList"], {
                    tracks: filteredTracks,
                    viewMode: viewMode,
                    selectedTrackIds: viewState.selectedTrackIds,
                    onSelectionChange: setSelectedTracks,
                    onDelete: handleDeleteTrack,
                    onEdit: handleEditTrack,
                    onAddToPlaylist: handleAddToPlaylist,
                    onBulkEdit: handleBulkEdit,
                    onBulkAddToPlaylist: handleBulkAddToPlaylist,
                    showSelection: showSelection
                }, void 0, false, {
                    fileName: "[project]/src/components/views/LibraryView.tsx",
                    lineNumber: 234,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/views/LibraryView.tsx",
                lineNumber: 224,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$modals$2f$EditTrackModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EditTrackModal"], {
                isOpen: editModalOpen,
                onClose: handleCloseEditModal,
                track: editingTrack ? tracks.find((t)=>t.id === editingTrack) || null : null,
                tracks: bulkEditTracks.map((id)=>tracks.find((t)=>t.id === id)).filter(Boolean),
                isBulkEdit: bulkEditTracks.length > 0
            }, void 0, false, {
                fileName: "[project]/src/components/views/LibraryView.tsx",
                lineNumber: 250,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$modals$2f$TagManagementModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TagManagementModal"], {
                isOpen: tagManagementOpen,
                onClose: ()=>setTagManagementOpen(false)
            }, void 0, false, {
                fileName: "[project]/src/components/views/LibraryView.tsx",
                lineNumber: 258,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$modals$2f$AddToPlaylistModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AddToPlaylistModal"], {
                isOpen: addToPlaylistOpen,
                onClose: handleCloseAddToPlaylistModal,
                trackIds: tracksToAddToPlaylist
            }, void 0, false, {
                fileName: "[project]/src/components/views/LibraryView.tsx",
                lineNumber: 264,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/views/LibraryView.tsx",
        lineNumber: 159,
        columnNumber: 5
    }, this);
}
_s(LibraryView, "zzmzvVQ54I3EEciLAfOOoicZbe0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"]
    ];
});
_c = LibraryView;
var _c;
__turbopack_context__.k.register(_c, "LibraryView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/PlaylistCard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PlaylistCard",
    ()=>PlaylistCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListMusic$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/list-music.js [app-client] (ecmascript) <export default as ListMusic>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/zap.js [app-client] (ecmascript) <export default as Zap>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/cn.ts [app-client] (ecmascript)");
'use client';
;
;
;
;
function PlaylistCard({ playlist, isSelected, onClick }) {
    const Icon = playlist.type === 'smart' ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"] : __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListMusic$3e$__["ListMusic"];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        onClick: onClick,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer', isSelected && 'ring-2 ring-blue-500'),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-3 mb-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                            className: "w-6 h-6 text-blue-400"
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/PlaylistCard.tsx",
                            lineNumber: 27,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/PlaylistCard.tsx",
                        lineNumber: 26,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 min-w-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-white font-medium truncate",
                                children: playlist.name
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/PlaylistCard.tsx",
                                lineNumber: 30,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-gray-400 text-sm",
                                children: playlist.type === 'smart' ? 'Smart Playlist' : 'Manual Playlist'
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/PlaylistCard.tsx",
                                lineNumber: 31,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/PlaylistCard.tsx",
                        lineNumber: 29,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/PlaylistCard.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this),
            playlist.description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-gray-400 text-sm mb-4 line-clamp-2",
                children: playlist.description
            }, void 0, false, {
                fileName: "[project]/src/components/ui/PlaylistCard.tsx",
                lineNumber: 38,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between text-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-gray-400",
                        children: [
                            playlist.trackIds.length,
                            " tracks"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/PlaylistCard.tsx",
                        lineNumber: 44,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-gray-500",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRelativeDate"])(playlist.dateModified)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/PlaylistCard.tsx",
                        lineNumber: 47,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/PlaylistCard.tsx",
                lineNumber: 43,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/PlaylistCard.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
_c = PlaylistCard;
var _c;
__turbopack_context__.k.register(_c, "PlaylistCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/modals/CreatePlaylistModal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CreatePlaylistModal",
    ()=>CreatePlaylistModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store/music-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function CreatePlaylistModal({ isOpen, onClose }) {
    _s();
    const { createPlaylist } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"])();
    const [name, setName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [description, setDescription] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [type, setType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('manual');
    const handleSubmit = async (e)=>{
        e.preventDefault();
        if (!name.trim()) return;
        try {
            await createPlaylist({
                name: name.trim(),
                description: description.trim() || undefined,
                type,
                rules: [],
                trackIds: [],
                sortBy: 'dateAdded',
                sortOrder: 'desc'
            });
            // Reset form and close modal
            setName('');
            setDescription('');
            setType('manual');
            onClose();
        } catch (error) {
            console.error('Failed to create playlist:', error);
        }
    };
    if (!isOpen) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-semibold text-white",
                            children: "Create Playlist"
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                            lineNumber: 51,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onClose,
                            className: "text-gray-400 hover:text-white",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                className: "w-6 h-6"
                            }, void 0, false, {
                                fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                lineNumber: 56,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                            lineNumber: 52,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                    lineNumber: 50,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSubmit,
                    className: "space-y-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-sm font-medium text-gray-300 mb-2",
                                    children: "Playlist Name"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                    lineNumber: 63,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    value: name,
                                    onChange: (e)=>setName(e.target.value),
                                    placeholder: "Enter playlist name",
                                    className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                                    required: true
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                    lineNumber: 66,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                            lineNumber: 62,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-sm font-medium text-gray-300 mb-2",
                                    children: "Description (Optional)"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                    lineNumber: 77,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                    value: description,
                                    onChange: (e)=>setDescription(e.target.value),
                                    placeholder: "Enter playlist description",
                                    rows: 3,
                                    className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                    lineNumber: 80,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                            lineNumber: 76,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-sm font-medium text-gray-300 mb-2",
                                    children: "Playlist Type"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                    lineNumber: 90,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "flex items-center",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "radio",
                                                    name: "type",
                                                    value: "manual",
                                                    checked: type === 'manual',
                                                    onChange: (e)=>setType(e.target.value),
                                                    className: "text-blue-600 focus:ring-blue-500"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                                    lineNumber: 95,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "ml-2 text-white",
                                                    children: "Manual Playlist"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                                    lineNumber: 103,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                            lineNumber: 94,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "flex items-center",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "radio",
                                                    name: "type",
                                                    value: "smart",
                                                    checked: type === 'smart',
                                                    onChange: (e)=>setType(e.target.value),
                                                    className: "text-blue-600 focus:ring-blue-500"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                                    lineNumber: 106,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "ml-2 text-white",
                                                    children: "Smart Playlist"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                                    lineNumber: 114,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                            lineNumber: 105,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                    lineNumber: 93,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs text-gray-400 mt-1",
                                    children: type === 'smart' ? 'Automatically updates based on rules you define' : 'Manually add and remove tracks'
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                    lineNumber: 117,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                            lineNumber: 89,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-3 pt-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: onClose,
                                    className: "flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors",
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                    lineNumber: 127,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    className: "flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors",
                                    children: "Create Playlist"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                                    lineNumber: 134,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                            lineNumber: 126,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
                    lineNumber: 61,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
            lineNumber: 48,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/modals/CreatePlaylistModal.tsx",
        lineNumber: 47,
        columnNumber: 5
    }, this);
}
_s(CreatePlaylistModal, "xiRX8Sk6RlRRY2dZOrSr2GV/nMg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"]
    ];
});
_c = CreatePlaylistModal;
var _c;
__turbopack_context__.k.register(_c, "CreatePlaylistModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/views/PlaylistsView.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PlaylistsView",
    ()=>PlaylistsView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store/music-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$playlist$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/playlist-service.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$EmptyState$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/EmptyState.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$PlaylistCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/PlaylistCard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$modals$2f$CreatePlaylistModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/modals/CreatePlaylistModal.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListMusic$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/list-music.js [app-client] (ecmascript) <export default as ListMusic>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$tag$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tag$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/tag.js [app-client] (ecmascript) <export default as Tag>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-client] (ecmascript) <export default as RefreshCw>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
function PlaylistsView() {
    _s();
    const { playlists, selectedPlaylistId, setSelectedPlaylist, syncTagBasedPlaylists } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"])();
    const [showCreateModal, setShowCreateModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('all');
    const [isSyncing, setIsSyncing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleSyncTagPlaylists = async ()=>{
        setIsSyncing(true);
        try {
            await syncTagBasedPlaylists();
        } finally{
            setIsSyncing(false);
        }
    };
    // Filter playlists based on type
    const filteredPlaylists = playlists.filter((playlist)=>{
        if (filter === 'manual') {
            return playlist.type === 'manual' || !__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$playlist$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playlistService"].isTagBasedPlaylist(playlist);
        }
        if (filter === 'tag-based') {
            return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$playlist$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playlistService"].isTagBasedPlaylist(playlist);
        }
        return true // 'all'
        ;
    });
    // Separate manual and tag-based playlists for display
    const manualPlaylists = filteredPlaylists.filter((p)=>p.type === 'manual' || !__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$playlist$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playlistService"].isTagBasedPlaylist(p));
    const tagBasedPlaylists = filteredPlaylists.filter((p)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$playlist$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playlistService"].isTagBasedPlaylist(p));
    if (playlists.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex-1 flex items-center justify-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$EmptyState$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmptyState"], {
                    icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListMusic$3e$__["ListMusic"],
                    title: "No playlists yet",
                    description: "Create your first playlist or add tags to tracks to generate automatic playlists",
                    actionLabel: "Create Playlist",
                    onAction: ()=>setShowCreateModal(true)
                }, void 0, false, {
                    fileName: "[project]/src/components/views/PlaylistsView.tsx",
                    lineNumber: 48,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$modals$2f$CreatePlaylistModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CreatePlaylistModal"], {
                    isOpen: showCreateModal,
                    onClose: ()=>setShowCreateModal(false)
                }, void 0, false, {
                    fileName: "[project]/src/components/views/PlaylistsView.tsx",
                    lineNumber: 55,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/views/PlaylistsView.tsx",
            lineNumber: 47,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex-1 flex flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-6 border-b border-gray-700",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between mb-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "text-2xl font-bold text-white",
                                        children: "Playlists"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                        lineNumber: 69,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-gray-400",
                                        children: [
                                            playlists.length,
                                            " playlists (",
                                            manualPlaylists.length,
                                            " manual, ",
                                            tagBasedPlaylists.length,
                                            " tag-based)"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                        lineNumber: 70,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                lineNumber: 68,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleSyncTagPlaylists,
                                        disabled: isSyncing,
                                        className: "flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 rounded-lg text-gray-300 text-sm font-medium transition-colors",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                                className: `w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                                lineNumber: 82,
                                                columnNumber: 15
                                            }, this),
                                            isSyncing ? 'Syncing...' : 'Sync Tags'
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                        lineNumber: 77,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setShowCreateModal(true),
                                        className: "flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                                lineNumber: 90,
                                                columnNumber: 15
                                            }, this),
                                            "Create Playlist"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                        lineNumber: 86,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                lineNumber: 76,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/views/PlaylistsView.tsx",
                        lineNumber: 67,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-1 bg-gray-800 rounded-lg p-1",
                        children: [
                            {
                                key: 'all',
                                label: 'All',
                                count: playlists.length
                            },
                            {
                                key: 'manual',
                                label: 'Manual',
                                count: manualPlaylists.length
                            },
                            {
                                key: 'tag-based',
                                label: 'Tag-Based',
                                count: tagBasedPlaylists.length
                            }
                        ].map((tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setFilter(tab.key),
                                className: `flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === tab.key ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`,
                                children: [
                                    tab.label,
                                    " (",
                                    tab.count,
                                    ")"
                                ]
                            }, tab.key, true, {
                                fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                lineNumber: 103,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/views/PlaylistsView.tsx",
                        lineNumber: 97,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/views/PlaylistsView.tsx",
                lineNumber: 66,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 p-6",
                children: filteredPlaylists.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 flex items-center justify-center",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$EmptyState$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmptyState"], {
                        icon: filter === 'tag-based' ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$tag$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tag$3e$__["Tag"] : __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListMusic$3e$__["ListMusic"],
                        title: filter === 'manual' ? "No manual playlists" : filter === 'tag-based' ? "No tag-based playlists" : "No playlists found",
                        description: filter === 'manual' ? "Create a manual playlist to organize your music" : filter === 'tag-based' ? "Add tags to your tracks to automatically generate playlists" : "Switch tabs to see other playlists",
                        actionLabel: filter === 'manual' ? "Create Playlist" : undefined,
                        onAction: filter === 'manual' ? ()=>setShowCreateModal(true) : undefined
                    }, void 0, false, {
                        fileName: "[project]/src/components/views/PlaylistsView.tsx",
                        lineNumber: 122,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/views/PlaylistsView.tsx",
                    lineNumber: 121,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-8",
                    children: [
                        (filter === 'all' || filter === 'manual') && manualPlaylists.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                filter === 'all' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-lg font-semibold text-white mb-4 flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListMusic$3e$__["ListMusic"], {
                                            className: "w-5 h-5"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                            lineNumber: 149,
                                            columnNumber: 21
                                        }, this),
                                        "Manual Playlists"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                    lineNumber: 148,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
                                    children: manualPlaylists.map((playlist)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$PlaylistCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PlaylistCard"], {
                                            playlist: playlist,
                                            isSelected: selectedPlaylistId === playlist.id,
                                            onClick: ()=>setSelectedPlaylist(playlist.id)
                                        }, playlist.id, false, {
                                            fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                            lineNumber: 155,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                    lineNumber: 153,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/views/PlaylistsView.tsx",
                            lineNumber: 146,
                            columnNumber: 15
                        }, this),
                        (filter === 'all' || filter === 'tag-based') && tagBasedPlaylists.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                filter === 'all' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-lg font-semibold text-white mb-4 flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$tag$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tag$3e$__["Tag"], {
                                            className: "w-5 h-5"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                            lineNumber: 171,
                                            columnNumber: 21
                                        }, this),
                                        "Tag-Based Playlists"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                    lineNumber: 170,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
                                    children: tagBasedPlaylists.map((playlist)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$PlaylistCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PlaylistCard"], {
                                            playlist: playlist,
                                            isSelected: selectedPlaylistId === playlist.id,
                                            onClick: ()=>setSelectedPlaylist(playlist.id)
                                        }, playlist.id, false, {
                                            fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                            lineNumber: 177,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/PlaylistsView.tsx",
                                    lineNumber: 175,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/views/PlaylistsView.tsx",
                            lineNumber: 168,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/views/PlaylistsView.tsx",
                    lineNumber: 143,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/views/PlaylistsView.tsx",
                lineNumber: 119,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$modals$2f$CreatePlaylistModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CreatePlaylistModal"], {
                isOpen: showCreateModal,
                onClose: ()=>setShowCreateModal(false)
            }, void 0, false, {
                fileName: "[project]/src/components/views/PlaylistsView.tsx",
                lineNumber: 191,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/views/PlaylistsView.tsx",
        lineNumber: 64,
        columnNumber: 5
    }, this);
}
_s(PlaylistsView, "X0MUo7mV3FeyZnpxFU6AZd+cW4Y=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"]
    ];
});
_c = PlaylistsView;
var _c;
__turbopack_context__.k.register(_c, "PlaylistsView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/StatsCard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StatsCard",
    ()=>StatsCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
'use client';
;
function StatsCard({ title, value, icon: Icon, trend }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-gray-800 rounded-lg p-6",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-between",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-gray-400 text-sm font-medium",
                            children: title
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/StatsCard.tsx",
                            lineNumber: 17,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-2xl font-bold text-white mt-1",
                            children: value
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/StatsCard.tsx",
                            lineNumber: 18,
                            columnNumber: 11
                        }, this),
                        trend && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-green-400 text-sm mt-1",
                            children: trend
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/StatsCard.tsx",
                            lineNumber: 20,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ui/StatsCard.tsx",
                    lineNumber: 16,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                    className: "w-8 h-8 text-blue-400"
                }, void 0, false, {
                    fileName: "[project]/src/components/ui/StatsCard.tsx",
                    lineNumber: 23,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ui/StatsCard.tsx",
            lineNumber: 15,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/ui/StatsCard.tsx",
        lineNumber: 14,
        columnNumber: 5
    }, this);
}
_c = StatsCard;
var _c;
__turbopack_context__.k.register(_c, "StatsCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/charts/GenreChart.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GenreChart",
    ()=>GenreChart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$PieChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/PieChart.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$polar$2f$Pie$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/polar/Pie.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Cell.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/ResponsiveContainer.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Tooltip.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Legend.js [app-client] (ecmascript)");
'use client';
;
;
const COLORS = [
    '#3B82F6',
    '#EF4444',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#84CC16',
    '#F97316',
    '#6366F1'
];
function GenreChart({ data }) {
    const chartData = data.slice(0, 10) // Show top 10 genres
    ;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "h-64",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
            width: "100%",
            height: "100%",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$PieChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PieChart"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$polar$2f$Pie$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Pie"], {
                        data: chartData,
                        cx: "50%",
                        cy: "50%",
                        outerRadius: 80,
                        dataKey: "count",
                        nameKey: "genre",
                        children: chartData.map((entry, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Cell"], {
                                fill: COLORS[index % COLORS.length]
                            }, `cell-${index}`, false, {
                                fileName: "[project]/src/components/charts/GenreChart.tsx",
                                lineNumber: 31,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/GenreChart.tsx",
                        lineNumber: 22,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tooltip"], {
                        contentStyle: {
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#F9FAFB'
                        },
                        formatter: (value, name)=>[
                                `${value} tracks (${(value / data.reduce((sum, item)=>sum + item.count, 0) * 100).toFixed(1)}%)`,
                                name
                            ]
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/GenreChart.tsx",
                        lineNumber: 34,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Legend"], {
                        wrapperStyle: {
                            color: '#9CA3AF'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/GenreChart.tsx",
                        lineNumber: 46,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/charts/GenreChart.tsx",
                lineNumber: 21,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/charts/GenreChart.tsx",
            lineNumber: 20,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/charts/GenreChart.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, this);
}
_c = GenreChart;
var _c;
__turbopack_context__.k.register(_c, "GenreChart");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/charts/ListeningPatternsChart.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ListeningPatternsChart",
    ()=>ListeningPatternsChart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$BarChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/BarChart.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/Bar.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/XAxis.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/YAxis.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/CartesianGrid.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Tooltip.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/ResponsiveContainer.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/format.ts [app-client] (ecmascript)");
'use client';
;
;
;
function ListeningPatternsChart({ data }) {
    const chartData = data.map((item)=>({
            ...item,
            hourLabel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatTimeOfDay"])(item.hour)
        }));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "h-64",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
            width: "100%",
            height: "100%",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$BarChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BarChart"], {
                data: chartData,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                        strokeDasharray: "3 3",
                        stroke: "#374151"
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/ListeningPatternsChart.tsx",
                        lineNumber: 21,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["XAxis"], {
                        dataKey: "hourLabel",
                        stroke: "#9CA3AF",
                        fontSize: 12,
                        interval: 1
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/ListeningPatternsChart.tsx",
                        lineNumber: 22,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["YAxis"], {
                        stroke: "#9CA3AF",
                        fontSize: 12
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/ListeningPatternsChart.tsx",
                        lineNumber: 28,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tooltip"], {
                        contentStyle: {
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#F9FAFB'
                        },
                        formatter: (value)=>[
                                `${value} plays`,
                                'Play Count'
                            ],
                        labelFormatter: (label)=>`Time: ${label}`
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/ListeningPatternsChart.tsx",
                        lineNumber: 29,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Bar"], {
                        dataKey: "playCount",
                        fill: "#3B82F6",
                        radius: [
                            2,
                            2,
                            0,
                            0
                        ]
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/ListeningPatternsChart.tsx",
                        lineNumber: 39,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/charts/ListeningPatternsChart.tsx",
                lineNumber: 20,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/charts/ListeningPatternsChart.tsx",
            lineNumber: 19,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/charts/ListeningPatternsChart.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
_c = ListeningPatternsChart;
var _c;
__turbopack_context__.k.register(_c, "ListeningPatternsChart");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/charts/LibraryGrowthChart.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LibraryGrowthChart",
    ()=>LibraryGrowthChart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$LineChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/LineChart.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/Line.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/XAxis.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/YAxis.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/CartesianGrid.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Tooltip.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/ResponsiveContainer.js [app-client] (ecmascript)");
'use client';
;
;
function LibraryGrowthChart({ data }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "h-64",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
            width: "100%",
            height: "100%",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$LineChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LineChart"], {
                data: data,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                        strokeDasharray: "3 3",
                        stroke: "#374151"
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/LibraryGrowthChart.tsx",
                        lineNumber: 15,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["XAxis"], {
                        dataKey: "date",
                        stroke: "#9CA3AF",
                        fontSize: 12,
                        tickFormatter: (value)=>new Date(value).toLocaleDateString()
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/LibraryGrowthChart.tsx",
                        lineNumber: 16,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["YAxis"], {
                        stroke: "#9CA3AF",
                        fontSize: 12
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/LibraryGrowthChart.tsx",
                        lineNumber: 22,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tooltip"], {
                        contentStyle: {
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#F9FAFB'
                        },
                        labelFormatter: (value)=>`Date: ${new Date(value).toLocaleDateString()}`,
                        formatter: (value, name)=>[
                                value,
                                name === 'totalTracks' ? 'Total Tracks' : 'Tracks Added'
                            ]
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/LibraryGrowthChart.tsx",
                        lineNumber: 23,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Line"], {
                        type: "monotone",
                        dataKey: "totalTracks",
                        stroke: "#3B82F6",
                        strokeWidth: 2,
                        dot: {
                            fill: '#3B82F6',
                            strokeWidth: 2,
                            r: 4
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/LibraryGrowthChart.tsx",
                        lineNumber: 36,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Line"], {
                        type: "monotone",
                        dataKey: "tracksAdded",
                        stroke: "#10B981",
                        strokeWidth: 2,
                        dot: {
                            fill: '#10B981',
                            strokeWidth: 2,
                            r: 4
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/charts/LibraryGrowthChart.tsx",
                        lineNumber: 43,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/charts/LibraryGrowthChart.tsx",
                lineNumber: 14,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/charts/LibraryGrowthChart.tsx",
            lineNumber: 13,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/charts/LibraryGrowthChart.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, this);
}
_c = LibraryGrowthChart;
var _c;
__turbopack_context__.k.register(_c, "LibraryGrowthChart");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/TopTracksTable.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TopTracksTable",
    ()=>TopTracksTable
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/format.ts [app-client] (ecmascript)");
'use client';
;
;
function TopTracksTable({ tracks, metric }) {
    const formatMetricValue = (track)=>{
        switch(metric){
            case 'playCount':
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatPlayCount"])(track.playCount);
            case 'rating':
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRating"])(track.rating);
            case 'lastPlayed':
                return track.lastPlayed ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRelativeDate"])(track.lastPlayed) : 'Never';
            default:
                return '';
        }
    };
    if (tracks.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-center py-8 text-gray-400",
            children: "No tracks available"
        }, void 0, false, {
            fileName: "[project]/src/components/ui/TopTracksTable.tsx",
            lineNumber: 27,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-2",
        children: tracks.slice(0, 10).map((track, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-3 p-2 hover:bg-gray-700 rounded-lg transition-colors",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-6 text-center text-gray-400 text-sm font-medium",
                        children: index + 1
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TopTracksTable.tsx",
                        lineNumber: 37,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 min-w-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-white text-sm font-medium truncate",
                                children: track.title
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TopTracksTable.tsx",
                                lineNumber: 41,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-gray-400 text-xs truncate",
                                children: track.artist
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/TopTracksTable.tsx",
                                lineNumber: 44,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/TopTracksTable.tsx",
                        lineNumber: 40,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-gray-400 text-xs",
                        children: formatMetricValue(track)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/TopTracksTable.tsx",
                        lineNumber: 48,
                        columnNumber: 11
                    }, this)
                ]
            }, track.id, true, {
                fileName: "[project]/src/components/ui/TopTracksTable.tsx",
                lineNumber: 36,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/components/ui/TopTracksTable.tsx",
        lineNumber: 34,
        columnNumber: 5
    }, this);
}
_c = TopTracksTable;
var _c;
__turbopack_context__.k.register(_c, "TopTracksTable");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/views/AnalyticsView.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AnalyticsView",
    ()=>AnalyticsView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store/music-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$analytics$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/analytics-service.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$StatsCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/StatsCard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$charts$2f$GenreChart$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/charts/GenreChart.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$charts$2f$ListeningPatternsChart$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/charts/ListeningPatternsChart.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$charts$2f$LibraryGrowthChart$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/charts/LibraryGrowthChart.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TopTracksTable$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/TopTracksTable.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$EmptyState$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/EmptyState.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-column.js [app-client] (ecmascript) <export default as BarChart3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Music$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/music.js [app-client] (ecmascript) <export default as Music>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clock.js [app-client] (ecmascript) <export default as Clock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/format.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
;
;
;
function AnalyticsView() {
    _s();
    const { tracks, listeningEvents, libraryStats } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"])();
    const analytics = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AnalyticsView.useMemo[analytics]": ()=>{
            if (tracks.length === 0) return null;
            return {
                genreDistribution: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$analytics$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analyticsService"].calculateGenreDistribution(tracks),
                artistStats: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$analytics$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analyticsService"].calculateArtistStats(tracks),
                listeningPatterns: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$analytics$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analyticsService"].analyzeListeningPatterns(listeningEvents),
                libraryGrowth: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$analytics$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analyticsService"].calculateLibraryGrowth(tracks),
                playbackStats: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$analytics$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analyticsService"].calculatePlaybackStats(listeningEvents),
                topTracks: {
                    mostPlayed: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$analytics$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analyticsService"].getTopTracks(tracks, 'playCount'),
                    highestRated: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$analytics$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analyticsService"].getTopTracks(tracks, 'rating'),
                    recent: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$analytics$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analyticsService"].getTopTracks(tracks, 'recent')
                }
            };
        }
    }["AnalyticsView.useMemo[analytics]"], [
        tracks,
        listeningEvents
    ]);
    if (!analytics || tracks.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex-1 flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$EmptyState$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmptyState"], {
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"],
                title: "No analytics available",
                description: "Import music and start listening to see your analytics"
            }, void 0, false, {
                fileName: "[project]/src/components/views/AnalyticsView.tsx",
                lineNumber: 38,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/views/AnalyticsView.tsx",
            lineNumber: 37,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex-1 overflow-auto",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "text-2xl font-bold text-white mb-2",
                            children: "Analytics"
                        }, void 0, false, {
                            fileName: "[project]/src/components/views/AnalyticsView.tsx",
                            lineNumber: 52,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-gray-400",
                            children: "Insights into your music library and listening habits"
                        }, void 0, false, {
                            fileName: "[project]/src/components/views/AnalyticsView.tsx",
                            lineNumber: 53,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                    lineNumber: 51,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$StatsCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatsCard"], {
                            title: "Total Tracks",
                            value: libraryStats?.totalTracks.toLocaleString() || '0',
                            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Music$3e$__["Music"],
                            trend: libraryStats?.recentlyAdded ? `+${libraryStats.recentlyAdded} this week` : undefined
                        }, void 0, false, {
                            fileName: "[project]/src/components/views/AnalyticsView.tsx",
                            lineNumber: 58,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$StatsCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatsCard"], {
                            title: "Artists",
                            value: libraryStats?.totalArtists.toLocaleString() || '0',
                            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"]
                        }, void 0, false, {
                            fileName: "[project]/src/components/views/AnalyticsView.tsx",
                            lineNumber: 64,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$StatsCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatsCard"], {
                            title: "Total Duration",
                            value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDuration"])(libraryStats?.totalDuration || 0),
                            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"]
                        }, void 0, false, {
                            fileName: "[project]/src/components/views/AnalyticsView.tsx",
                            lineNumber: 69,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$StatsCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatsCard"], {
                            title: "Library Size",
                            value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatFileSize"])(libraryStats?.totalSize || 0),
                            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"]
                        }, void 0, false, {
                            fileName: "[project]/src/components/views/AnalyticsView.tsx",
                            lineNumber: 74,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                    lineNumber: 57,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-gray-800 rounded-lg p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-lg font-semibold text-white mb-4",
                                    children: "Genre Distribution"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                                    lineNumber: 85,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$charts$2f$GenreChart$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GenreChart"], {
                                    data: analytics.genreDistribution
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                                    lineNumber: 86,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/views/AnalyticsView.tsx",
                            lineNumber: 84,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-gray-800 rounded-lg p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-lg font-semibold text-white mb-4",
                                    children: "Listening Patterns"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                                    lineNumber: 91,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$charts$2f$ListeningPatternsChart$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ListeningPatternsChart"], {
                                    data: analytics.listeningPatterns
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                                    lineNumber: 92,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/views/AnalyticsView.tsx",
                            lineNumber: 90,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                    lineNumber: 82,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-gray-800 rounded-lg p-6 mb-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "text-lg font-semibold text-white mb-4",
                            children: "Library Growth"
                        }, void 0, false, {
                            fileName: "[project]/src/components/views/AnalyticsView.tsx",
                            lineNumber: 98,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$charts$2f$LibraryGrowthChart$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LibraryGrowthChart"], {
                            data: analytics.libraryGrowth
                        }, void 0, false, {
                            fileName: "[project]/src/components/views/AnalyticsView.tsx",
                            lineNumber: 99,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                    lineNumber: 97,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 lg:grid-cols-3 gap-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-gray-800 rounded-lg p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-lg font-semibold text-white mb-4",
                                    children: "Most Played"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                                    lineNumber: 105,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TopTracksTable$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TopTracksTable"], {
                                    tracks: analytics.topTracks.mostPlayed,
                                    metric: "playCount"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                                    lineNumber: 106,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/views/AnalyticsView.tsx",
                            lineNumber: 104,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-gray-800 rounded-lg p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-lg font-semibold text-white mb-4",
                                    children: "Highest Rated"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                                    lineNumber: 110,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TopTracksTable$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TopTracksTable"], {
                                    tracks: analytics.topTracks.highestRated,
                                    metric: "rating"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                                    lineNumber: 111,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/views/AnalyticsView.tsx",
                            lineNumber: 109,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-gray-800 rounded-lg p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-lg font-semibold text-white mb-4",
                                    children: "Recently Played"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                                    lineNumber: 115,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$TopTracksTable$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TopTracksTable"], {
                                    tracks: analytics.topTracks.recent,
                                    metric: "lastPlayed"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                                    lineNumber: 116,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/views/AnalyticsView.tsx",
                            lineNumber: 114,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/views/AnalyticsView.tsx",
                    lineNumber: 103,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/views/AnalyticsView.tsx",
            lineNumber: 49,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/views/AnalyticsView.tsx",
        lineNumber: 48,
        columnNumber: 5
    }, this);
}
_s(AnalyticsView, "3pFjJd42T99FaOS1bG+g3U7bTPo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"]
    ];
});
_c = AnalyticsView;
var _c;
__turbopack_context__.k.register(_c, "AnalyticsView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/DuplicateGroupCard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DuplicateGroupCard",
    ()=>DuplicateGroupCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$duplicate$2d$detection$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/duplicate-detection-service.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function DuplicateGroupCard({ group, tracks, onResolve }) {
    _s();
    const [selectedTrackId, setSelectedTrackId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Safety checks
    if (!group || !tracks || tracks.length === 0) {
        return null;
    }
    const recommendation = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$duplicate$2d$detection$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["duplicateDetectionService"].getRecommendedAction(group, tracks);
    const handleResolve = ()=>{
        const trackId = selectedTrackId || recommendation.recommendedTrackId;
        if (trackId) {
            onResolve(trackId);
        }
    };
    if (group.resolved) {
        const preferredTrack = tracks.find((t)=>t.id === group.preferredTrackId);
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-gray-800 rounded-lg p-6 border border-green-700",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2 mb-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                            className: "w-5 h-5 text-green-400"
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                            lineNumber: 37,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "text-white font-medium",
                            children: "Resolved Duplicate Group"
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                            lineNumber: 38,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-xs bg-green-900 text-green-300 px-2 py-1 rounded",
                            children: [
                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatSimilarity"])(group.similarityScore),
                                " similar"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                            lineNumber: 39,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                    lineNumber: 36,
                    columnNumber: 9
                }, this),
                preferredTrack && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-gray-300",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "font-medium",
                            children: preferredTrack.title
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                            lineNumber: 46,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-gray-400",
                            children: [
                                preferredTrack.artist,
                                " - ",
                                preferredTrack.album
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                            lineNumber: 47,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                    lineNumber: 45,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
            lineNumber: 35,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-gray-800 rounded-lg p-6 border border-yellow-700",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between mb-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                className: "w-5 h-5 text-yellow-400"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                lineNumber: 58,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-white font-medium",
                                children: "Duplicate Group"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                lineNumber: 59,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs bg-yellow-900 text-yellow-300 px-2 py-1 rounded",
                                children: [
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatSimilarity"])(group.similarityScore),
                                    " similar"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                lineNumber: 60,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded",
                                children: group.duplicateType
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                lineNumber: 63,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                        lineNumber: 57,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: handleResolve,
                        disabled: !selectedTrackId && !recommendation.recommendedTrackId,
                        className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white text-sm font-medium transition-colors",
                        children: "Resolve"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                        lineNumber: 68,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this),
            recommendation.recommendedTrackId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-blue-300 text-sm",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                            children: "Recommendation:"
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                            lineNumber: 81,
                            columnNumber: 13
                        }, this),
                        " ",
                        recommendation.reason
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                    lineNumber: 80,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                lineNumber: 79,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3",
                children: tracks.map((track)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `p-3 border rounded-lg cursor-pointer transition-colors ${selectedTrackId === track.id ? 'border-blue-500 bg-blue-900/20' : recommendation.recommendedTrackId === track.id ? 'border-green-500 bg-green-900/20' : 'border-gray-600 hover:border-gray-500'}`,
                        onClick: ()=>setSelectedTrackId(track.id),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex-1",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "radio",
                                                    name: `duplicate-${group.id}`,
                                                    checked: selectedTrackId === track.id,
                                                    onChange: ()=>setSelectedTrackId(track.id),
                                                    className: "text-blue-600 focus:ring-blue-500"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                                    lineNumber: 103,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-white font-medium",
                                                            children: track.title
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                                            lineNumber: 111,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-400 text-sm",
                                                            children: [
                                                                track.artist,
                                                                " - ",
                                                                track.album
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                                            lineNumber: 112,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                                    lineNumber: 110,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                            lineNumber: 102,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                        lineNumber: 101,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-right text-sm text-gray-400",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatFileSize"])(track.fileSize)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                                lineNumber: 118,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatBitrate"])(track.bitrate)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                                lineNumber: 119,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    track.playCount,
                                                    " plays"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                                lineNumber: 120,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                        lineNumber: 117,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                lineNumber: 100,
                                columnNumber: 13
                            }, this),
                            recommendation.recommendedTrackId === track.id && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-2 text-xs text-green-400",
                                children: "✓ Recommended"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                                lineNumber: 125,
                                columnNumber: 15
                            }, this)
                        ]
                    }, track.id, true, {
                        fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                        lineNumber: 89,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
                lineNumber: 87,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/DuplicateGroupCard.tsx",
        lineNumber: 55,
        columnNumber: 5
    }, this);
}
_s(DuplicateGroupCard, "Zxot5S/JIj64AV4IEBebrXGIWBU=");
_c = DuplicateGroupCard;
var _c;
__turbopack_context__.k.register(_c, "DuplicateGroupCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/LoadingSpinner.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LoadingSpinner",
    ()=>LoadingSpinner
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/cn.ts [app-client] (ecmascript)");
'use client';
;
;
function LoadingSpinner({ className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('animate-spin rounded-full border-2 border-gray-300 border-t-blue-600', className)
    }, void 0, false, {
        fileName: "[project]/src/components/ui/LoadingSpinner.tsx",
        lineNumber: 11,
        columnNumber: 5
    }, this);
}
_c = LoadingSpinner;
var _c;
__turbopack_context__.k.register(_c, "LoadingSpinner");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/views/DuplicatesView.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DuplicatesView",
    ()=>DuplicatesView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store/music-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$DuplicateGroupCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/DuplicateGroupCard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$EmptyState$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/EmptyState.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$LoadingSpinner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/LoadingSpinner.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/copy.js [app-client] (ecmascript) <export default as Copy>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
function DuplicatesView() {
    _s();
    const { tracks, duplicateGroups, detectDuplicates, resolveDuplicateGroup } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"])();
    const [isScanning, setIsScanning] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('unresolved');
    const filteredGroups = duplicateGroups.filter((group)=>{
        if (!group) return false;
        if (filter === 'unresolved') return !group.resolved;
        if (filter === 'resolved') return group.resolved;
        return true;
    });
    const handleScanForDuplicates = async ()=>{
        setIsScanning(true);
        try {
            await detectDuplicates();
        } finally{
            setIsScanning(false);
        }
    };
    const handleResolveGroup = async (groupId, preferredTrackId)=>{
        await resolveDuplicateGroup(groupId, preferredTrackId);
    };
    if (tracks.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex-1 flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$EmptyState$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmptyState"], {
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__["Copy"],
                title: "No music to scan",
                description: "Import music files first to detect duplicates"
            }, void 0, false, {
                fileName: "[project]/src/components/views/DuplicatesView.tsx",
                lineNumber: 45,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/views/DuplicatesView.tsx",
            lineNumber: 44,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex-1 flex flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-6 border-b border-gray-700",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between mb-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "text-2xl font-bold text-white",
                                        children: "Duplicate Detection"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/views/DuplicatesView.tsx",
                                        lineNumber: 60,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-gray-400",
                                        children: [
                                            duplicateGroups.length,
                                            " duplicate groups found"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/views/DuplicatesView.tsx",
                                        lineNumber: 61,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/views/DuplicatesView.tsx",
                                lineNumber: 59,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleScanForDuplicates,
                                disabled: isScanning,
                                className: "flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors",
                                children: [
                                    isScanning ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$LoadingSpinner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoadingSpinner"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/views/DuplicatesView.tsx",
                                        lineNumber: 72,
                                        columnNumber: 15
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/views/DuplicatesView.tsx",
                                        lineNumber: 74,
                                        columnNumber: 15
                                    }, this),
                                    isScanning ? 'Scanning...' : 'Scan for Duplicates'
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/views/DuplicatesView.tsx",
                                lineNumber: 66,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/views/DuplicatesView.tsx",
                        lineNumber: 58,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-1 bg-gray-800 rounded-lg p-1",
                        children: [
                            {
                                key: 'unresolved',
                                label: 'Unresolved',
                                count: duplicateGroups.filter((g)=>g && !g.resolved).length
                            },
                            {
                                key: 'resolved',
                                label: 'Resolved',
                                count: duplicateGroups.filter((g)=>g && g.resolved).length
                            },
                            {
                                key: 'all',
                                label: 'All',
                                count: duplicateGroups.length
                            }
                        ].map((tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setFilter(tab.key),
                                className: `flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === tab.key ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`,
                                children: [
                                    tab.label,
                                    " (",
                                    tab.count,
                                    ")"
                                ]
                            }, tab.key, true, {
                                fileName: "[project]/src/components/views/DuplicatesView.tsx",
                                lineNumber: 87,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/views/DuplicatesView.tsx",
                        lineNumber: 81,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/views/DuplicatesView.tsx",
                lineNumber: 57,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 overflow-auto",
                children: isScanning ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 flex items-center justify-center",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$LoadingSpinner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoadingSpinner"], {
                                className: "w-8 h-8 mx-auto mb-4"
                            }, void 0, false, {
                                fileName: "[project]/src/components/views/DuplicatesView.tsx",
                                lineNumber: 107,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-gray-400",
                                children: "Scanning for duplicates..."
                            }, void 0, false, {
                                fileName: "[project]/src/components/views/DuplicatesView.tsx",
                                lineNumber: 108,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/views/DuplicatesView.tsx",
                        lineNumber: 106,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/views/DuplicatesView.tsx",
                    lineNumber: 105,
                    columnNumber: 11
                }, this) : filteredGroups.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 flex items-center justify-center",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$EmptyState$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmptyState"], {
                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__["Copy"],
                        title: filter === 'unresolved' ? "No unresolved duplicates" : filter === 'resolved' ? "No resolved duplicates" : "No duplicates found",
                        description: duplicateGroups.length === 0 ? "Your library looks clean! No duplicate tracks detected." : "Switch tabs to see other duplicate groups.",
                        actionLabel: duplicateGroups.length === 0 ? "Scan Again" : undefined,
                        onAction: duplicateGroups.length === 0 ? handleScanForDuplicates : undefined
                    }, void 0, false, {
                        fileName: "[project]/src/components/views/DuplicatesView.tsx",
                        lineNumber: 113,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/views/DuplicatesView.tsx",
                    lineNumber: 112,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-6 space-y-6",
                    children: filteredGroups.map((group)=>{
                        if (!group || !group.trackIds) return null;
                        const groupTracks = tracks.filter((t)=>t && group.trackIds.includes(t.id));
                        if (groupTracks.length === 0) return null;
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$DuplicateGroupCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DuplicateGroupCard"], {
                            group: group,
                            tracks: groupTracks,
                            onResolve: (preferredTrackId)=>handleResolveGroup(group.id, preferredTrackId)
                        }, group.id, false, {
                            fileName: "[project]/src/components/views/DuplicatesView.tsx",
                            lineNumber: 140,
                            columnNumber: 17
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/src/components/views/DuplicatesView.tsx",
                    lineNumber: 132,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/views/DuplicatesView.tsx",
                lineNumber: 103,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/views/DuplicatesView.tsx",
        lineNumber: 55,
        columnNumber: 5
    }, this);
}
_s(DuplicatesView, "aCtKdFQxopPmRY8EeA2C3Hjg/BY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"]
    ];
});
_c = DuplicatesView;
var _c;
__turbopack_context__.k.register(_c, "DuplicatesView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/views/SettingsView.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SettingsView",
    ()=>SettingsView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store/music-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$analytics$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/analytics-service.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/download.js [app-client] (ecmascript) <export default as Download>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-client] (ecmascript) <export default as RefreshCw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/database.js [app-client] (ecmascript) <export default as Database>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function SettingsView() {
    _s();
    const { tracks, listeningEvents, refreshStats } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"])();
    const [isExporting, setIsExporting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleExportData = async ()=>{
        setIsExporting(true);
        try {
            const analyticsData = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$analytics$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analyticsService"].exportAnalyticsData(tracks, listeningEvents);
            const dataToExport = {
                exportDate: new Date().toISOString(),
                tracks: tracks.length,
                listeningEvents: listeningEvents.length,
                analytics: analyticsData
            };
            const blob = new Blob([
                JSON.stringify(dataToExport, null, 2)
            ], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `music-library-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } finally{
            setIsExporting(false);
        }
    };
    const handleClearData = async ()=>{
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            // TODO: Implement clear data functionality
            console.log('Clear data requested');
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex-1 overflow-auto",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "text-2xl font-bold text-white mb-2",
                            children: "Settings"
                        }, void 0, false, {
                            fileName: "[project]/src/components/views/SettingsView.tsx",
                            lineNumber: 53,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-gray-400",
                            children: "Manage your music library and application preferences"
                        }, void 0, false, {
                            fileName: "[project]/src/components/views/SettingsView.tsx",
                            lineNumber: 54,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/views/SettingsView.tsx",
                    lineNumber: 52,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-gray-800 rounded-lg p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-lg font-semibold text-white mb-4 flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"], {
                                            className: "w-5 h-5"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 62,
                                            columnNumber: 15
                                        }, this),
                                        "Library Management"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                    lineNumber: 61,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center justify-between",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-white font-medium",
                                                            children: "Refresh Library Stats"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                                            lineNumber: 69,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-400 text-sm",
                                                            children: "Recalculate library statistics and analytics"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                                            lineNumber: 70,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                                    lineNumber: 68,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: refreshStats,
                                                    className: "flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                                            className: "w-4 h-4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                                            lineNumber: 76,
                                                            columnNumber: 19
                                                        }, this),
                                                        "Refresh"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                                    lineNumber: 72,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 67,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center justify-between",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-white font-medium",
                                                            children: "Export Library Data"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                                            lineNumber: 83,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-400 text-sm",
                                                            children: "Download your library metadata and analytics"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                                            lineNumber: 84,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                                    lineNumber: 82,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: handleExportData,
                                                    disabled: isExporting,
                                                    className: "flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__["Download"], {
                                                            className: "w-4 h-4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                                            lineNumber: 91,
                                                            columnNumber: 19
                                                        }, this),
                                                        isExporting ? 'Exporting...' : 'Export'
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                                    lineNumber: 86,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 81,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center justify-between",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-white font-medium",
                                                            children: "Clear All Data"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                                            lineNumber: 98,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-gray-400 text-sm",
                                                            children: "Remove all tracks, playlists, and listening history"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                                            lineNumber: 99,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                                    lineNumber: 97,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: handleClearData,
                                                    className: "flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                            className: "w-4 h-4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                                            lineNumber: 105,
                                                            columnNumber: 19
                                                        }, this),
                                                        "Clear Data"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                                    lineNumber: 101,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 96,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                    lineNumber: 66,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/views/SettingsView.tsx",
                            lineNumber: 60,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-gray-800 rounded-lg p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-lg font-semibold text-white mb-4",
                                    children: "Import Settings"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                    lineNumber: 114,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-white font-medium mb-2",
                                                    children: "Supported File Formats"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                                    lineNumber: 118,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-gray-400 text-sm",
                                                    children: "MP3, FLAC, WAV, M4A, AAC, OGG, WMA"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                                    lineNumber: 121,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 117,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "flex items-center gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "checkbox",
                                                        defaultChecked: true,
                                                        className: "rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/views/SettingsView.tsx",
                                                        lineNumber: 128,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-white",
                                                        children: "Auto-detect duplicates during import"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/views/SettingsView.tsx",
                                                        lineNumber: 133,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/views/SettingsView.tsx",
                                                lineNumber: 127,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 126,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "flex items-center gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "checkbox",
                                                        defaultChecked: true,
                                                        className: "rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/views/SettingsView.tsx",
                                                        lineNumber: 139,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-white",
                                                        children: "Extract metadata from file tags"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/views/SettingsView.tsx",
                                                        lineNumber: 144,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/views/SettingsView.tsx",
                                                lineNumber: 138,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 137,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "flex items-center gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "checkbox",
                                                        className: "rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/views/SettingsView.tsx",
                                                        lineNumber: 150,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-white",
                                                        children: "Use folder structure for metadata"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/views/SettingsView.tsx",
                                                        lineNumber: 154,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/views/SettingsView.tsx",
                                                lineNumber: 149,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 148,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                    lineNumber: 116,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/views/SettingsView.tsx",
                            lineNumber: 113,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-gray-800 rounded-lg p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-lg font-semibold text-white mb-4",
                                    children: "Performance"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                    lineNumber: 162,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-white font-medium mb-2",
                                                    children: "Virtual List Item Height"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                                    lineNumber: 166,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                    className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "compact",
                                                            children: "Compact (48px)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                                            lineNumber: 170,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "normal",
                                                            selected: true,
                                                            children: "Normal (64px)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                                            lineNumber: 171,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "comfortable",
                                                            children: "Comfortable (80px)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                                            lineNumber: 172,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                                    lineNumber: 169,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 165,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "flex items-center gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "checkbox",
                                                        defaultChecked: true,
                                                        className: "rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/views/SettingsView.tsx",
                                                        lineNumber: 178,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-white",
                                                        children: "Enable virtualized scrolling"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/views/SettingsView.tsx",
                                                        lineNumber: 183,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/views/SettingsView.tsx",
                                                lineNumber: 177,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 176,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "flex items-center gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "checkbox",
                                                        defaultChecked: true,
                                                        className: "rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/views/SettingsView.tsx",
                                                        lineNumber: 189,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-white",
                                                        children: "Use Web Workers for background processing"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/views/SettingsView.tsx",
                                                        lineNumber: 194,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/views/SettingsView.tsx",
                                                lineNumber: 188,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 187,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                    lineNumber: 164,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/views/SettingsView.tsx",
                            lineNumber: 161,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-gray-800 rounded-lg p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-lg font-semibold text-white mb-4",
                                    children: "About"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                    lineNumber: 202,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-2 text-gray-400",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                className: "text-white",
                                                children: "Music Library Intelligence"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/views/SettingsView.tsx",
                                                lineNumber: 205,
                                                columnNumber: 18
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 205,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "Version 1.0.0"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 206,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "A fully offline music library management application"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 207,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "Built with Next.js, TailwindCSS, and Zustand"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/views/SettingsView.tsx",
                                            lineNumber: 208,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/views/SettingsView.tsx",
                                    lineNumber: 204,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/views/SettingsView.tsx",
                            lineNumber: 201,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/views/SettingsView.tsx",
                    lineNumber: 58,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/views/SettingsView.tsx",
            lineNumber: 50,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/views/SettingsView.tsx",
        lineNumber: 49,
        columnNumber: 5
    }, this);
}
_s(SettingsView, "k4i8Zbl3oi0XwQ1P12FsGRnPwT8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"]
    ];
});
_c = SettingsView;
var _c;
__turbopack_context__.k.register(_c, "SettingsView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/layout/MainContent.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MainContent",
    ()=>MainContent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store/music-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$views$2f$LibraryView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/views/LibraryView.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$views$2f$PlaylistsView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/views/PlaylistsView.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$views$2f$AnalyticsView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/views/AnalyticsView.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$views$2f$DuplicatesView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/views/DuplicatesView.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$views$2f$SettingsView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/views/SettingsView.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
function MainContent() {
    _s();
    const { viewState } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"])();
    const renderView = ()=>{
        switch(viewState.currentView){
            case 'library':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$views$2f$LibraryView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LibraryView"], {}, void 0, false, {
                    fileName: "[project]/src/components/layout/MainContent.tsx",
                    lineNumber: 16,
                    columnNumber: 16
                }, this);
            case 'playlists':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$views$2f$PlaylistsView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PlaylistsView"], {}, void 0, false, {
                    fileName: "[project]/src/components/layout/MainContent.tsx",
                    lineNumber: 18,
                    columnNumber: 16
                }, this);
            case 'analytics':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$views$2f$AnalyticsView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnalyticsView"], {}, void 0, false, {
                    fileName: "[project]/src/components/layout/MainContent.tsx",
                    lineNumber: 20,
                    columnNumber: 16
                }, this);
            case 'duplicates':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$views$2f$DuplicatesView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DuplicatesView"], {}, void 0, false, {
                    fileName: "[project]/src/components/layout/MainContent.tsx",
                    lineNumber: 22,
                    columnNumber: 16
                }, this);
            case 'settings':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$views$2f$SettingsView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SettingsView"], {}, void 0, false, {
                    fileName: "[project]/src/components/layout/MainContent.tsx",
                    lineNumber: 24,
                    columnNumber: 16
                }, this);
            default:
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$views$2f$LibraryView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LibraryView"], {}, void 0, false, {
                    fileName: "[project]/src/components/layout/MainContent.tsx",
                    lineNumber: 26,
                    columnNumber: 16
                }, this);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex-1 flex flex-col bg-gray-900",
        children: renderView()
    }, void 0, false, {
        fileName: "[project]/src/components/layout/MainContent.tsx",
        lineNumber: 31,
        columnNumber: 5
    }, this);
}
_s(MainContent, "OzUKAKWMlV4d1YhKuZPb74S5udg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"]
    ];
});
_c = MainContent;
var _c;
__turbopack_context__.k.register(_c, "MainContent");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/services/metadata-service.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "metadataService",
    ()=>metadataService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$music$2d$metadata$2d$browser$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/music-metadata-browser/lib/index.js [app-client] (ecmascript)");
;
class MetadataService {
    // Extract metadata from audio file using music-metadata-browser
    async extractMetadata(file) {
        try {
            // Use music-metadata-browser to parse the audio file
            const metadata = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$music$2d$metadata$2d$browser$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseBlob"])(file);
            return this.normalizeMetadata(metadata, file);
        } catch (error) {
            console.error('Failed to extract metadata from', file.name, ':', error);
            return await this.createFallbackMetadata(file);
        }
    }
    // Normalize and clean metadata from music-metadata-browser
    async normalizeMetadata(metadata, file) {
        const now = new Date();
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
        // Extract common metadata fields
        const common = metadata.common || {};
        const format = metadata.format || {};
        return {
            id: crypto.randomUUID(),
            title: this.normalizeString(common.title || this.extractTitleFromFilename(file.name)),
            artist: this.normalizeString(common.artist || common.albumartist || 'Unknown Artist'),
            album: this.normalizeString(common.album || 'Unknown Album'),
            genre: common.genre && common.genre.length > 0 ? this.normalizeString(common.genre[0]) : undefined,
            year: common.year || common.date ? parseInt(String(common.year || common.date)) : undefined,
            trackNumber: common.track?.no || undefined,
            discNumber: common.disk?.no || undefined,
            duration: format.duration ? Math.round(format.duration) : 0,
            bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : undefined,
            fileSize: file.size,
            filePath: file.name,
            fileFormat: fileExtension,
            fileHash: await this.calculateFileHash(file),
            dateAdded: now,
            dateModified: new Date(file.lastModified),
            playCount: 0,
            customTags: [],
            // Additional metadata that might be available
            mood: common.mood || undefined
        };
    }
    // Create fallback metadata when extraction fails
    async createFallbackMetadata(file) {
        const now = new Date();
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
        // Try to extract metadata from filename and path
        const pathMetadata = this.extractMetadataFromPath(file.name);
        return {
            id: crypto.randomUUID(),
            title: pathMetadata.title || this.extractTitleFromFilename(file.name),
            artist: pathMetadata.artist || 'Unknown Artist',
            album: pathMetadata.album || 'Unknown Album',
            genre: pathMetadata.genre,
            year: pathMetadata.year,
            duration: 0,
            fileSize: file.size,
            filePath: file.name,
            fileFormat: fileExtension,
            fileHash: await this.calculateFileHash(file),
            dateAdded: now,
            dateModified: new Date(file.lastModified),
            playCount: 0,
            customTags: []
        };
    }
    // Normalize string values (trim, fix casing, etc.)
    normalizeString(value) {
        if (!value) return '';
        return value.trim().replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/^\w/, (c)=>c.toUpperCase()) // Capitalize first letter
        ;
    }
    // Extract title from filename
    extractTitleFromFilename(filename) {
        // Remove extension
        let title = filename.replace(/\.[^/.]+$/, '');
        // Remove track numbers (e.g., "01 - Song Title" -> "Song Title")
        title = title.replace(/^\d+\s*[-.\s]\s*/, '');
        // If filename contains " - ", assume format is "Artist - Title"
        const parts = title.split(' - ');
        if (parts.length >= 2) {
            return parts[parts.length - 1].trim() // Take the last part as title
            ;
        }
        return title;
    }
    // Extract metadata from file path structure
    extractMetadataFromPath(filePath) {
        const pathParts = filePath.split(/[/\\]/);
        const metadata = {};
        const filename = pathParts[pathParts.length - 1];
        // Try to parse filename patterns
        // Pattern 1: "Artist - Title.ext"
        let match = filename.match(/^(.+?)\s*-\s*(.+?)\.[^.]+$/);
        if (match) {
            metadata.artist = this.normalizeString(match[1]);
            metadata.title = this.normalizeString(match[2]);
            return metadata;
        }
        // Pattern 2: "Track# Artist - Title.ext"
        match = filename.match(/^\d+\s*[-.\s]\s*(.+?)\s*-\s*(.+?)\.[^.]+$/);
        if (match) {
            metadata.artist = this.normalizeString(match[1]);
            metadata.title = this.normalizeString(match[2]);
            return metadata;
        }
        // Pattern 3: "Track# Title.ext"
        match = filename.match(/^\d+\s*[-.\s]\s*(.+?)\.[^.]+$/);
        if (match) {
            metadata.title = this.normalizeString(match[1]);
            return metadata;
        }
        // Common directory patterns:
        // Artist/Album/Track.ext or Genre/Artist/Album/Track.ext
        if (pathParts.length >= 3) {
            const albumDir = pathParts[pathParts.length - 2];
            const artistDir = pathParts[pathParts.length - 3];
            // Check if directory names look like metadata (not years or generic folders)
            if (!albumDir.match(/^\d{4}$/) && albumDir !== 'Unknown Album' && albumDir.length > 0) {
                metadata.album = this.normalizeString(albumDir);
            }
            if (!artistDir.match(/^\d{4}$/) && artistDir !== 'Unknown Artist' && artistDir.length > 0) {
                metadata.artist = this.normalizeString(artistDir);
            }
        }
        return metadata;
    }
    // Calculate file hash for duplicate detection
    async calculateFileHash(file) {
        try {
            // For performance, hash only the first 64KB of the file
            const chunkSize = 64 * 1024 // 64KB
            ;
            const chunk = file.slice(0, Math.min(chunkSize, file.size));
            const buffer = await chunk.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map((b)=>b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Failed to calculate file hash:', error);
            // Fallback: use file size, name, and modification time as pseudo-hash
            return `${file.size}-${file.name.length}-${file.lastModified}`;
        }
    }
    // Batch process multiple files with progress tracking
    async extractMetadataFromFiles(files, onProgress) {
        const results = [];
        for(let i = 0; i < files.length; i++){
            const file = files[i];
            if (onProgress) {
                onProgress(i, files.length, file.name);
            }
            try {
                const metadata = await this.extractMetadata(file);
                results.push(metadata);
            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
                // Add fallback metadata for failed files
                results.push(await this.createFallbackMetadata(file));
            }
            // Add a small delay to prevent blocking the UI
            if (i % 10 === 0) {
                await new Promise((resolve)=>setTimeout(resolve, 1));
            }
        }
        if (onProgress) {
            onProgress(files.length, files.length, '');
        }
        return results;
    }
    // Validate and clean existing metadata
    validateAndCleanMetadata(track) {
        return {
            ...track,
            title: this.normalizeString(track.title || 'Unknown Title'),
            artist: this.normalizeString(track.artist || 'Unknown Artist'),
            album: this.normalizeString(track.album || 'Unknown Album'),
            genre: track.genre ? this.normalizeString(track.genre) : undefined,
            year: track.year && track.year > 1900 && track.year <= new Date().getFullYear() ? track.year : undefined,
            trackNumber: track.trackNumber && track.trackNumber > 0 ? track.trackNumber : undefined,
            discNumber: track.discNumber && track.discNumber > 0 ? track.discNumber : undefined,
            rating: track.rating && track.rating >= 0 && track.rating <= 5 ? track.rating : undefined,
            customTags: track.customTags.filter((tag)=>tag.trim().length > 0)
        };
    }
    // Merge metadata from multiple sources
    mergeMetadata(primary, secondary) {
        return {
            ...secondary,
            ...primary,
            // Special handling for arrays
            customTags: [
                ...primary.customTags || [],
                ...secondary.customTags || []
            ].filter((tag, index, array)=>array.indexOf(tag) === index)
        };
    }
    // Get supported audio file extensions
    getSupportedExtensions() {
        return [
            '.mp3',
            '.flac',
            '.wav',
            '.m4a',
            '.aac',
            '.ogg',
            '.wma',
            '.opus',
            '.webm'
        ];
    }
    // Check if file is supported audio format
    isSupportedAudioFile(file) {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        return this.getSupportedExtensions().includes(extension);
    }
    // Get detailed format information
    async getDetailedFormat(file) {
        try {
            const metadata = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$music$2d$metadata$2d$browser$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseBlob"])(file);
            return {
                format: metadata.format,
                quality: metadata.quality,
                native: metadata.native
            };
        } catch (error) {
            console.error('Failed to get detailed format:', error);
            return null;
        }
    }
}
const metadataService = new MetadataService();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/modals/ImportModal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ImportModal",
    ()=>ImportModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store/music-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$metadata$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/metadata-service.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/upload.js [app-client] (ecmascript) <export default as Upload>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileMusic$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-music.js [app-client] (ecmascript) <export default as FileMusic>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-client] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$LoadingSpinner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/LoadingSpinner.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function ImportModal() {
    _s();
    const { showImportModal, toggleImportModal, importProgress, startImport, updateImportProgress, addTracks } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"])();
    const [dragActive, setDragActive] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const handleFiles = async (files)=>{
        const audioFiles = Array.from(files).filter((file)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$metadata$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["metadataService"].isSupportedAudioFile(file));
        if (audioFiles.length === 0) {
            alert('No supported audio files found. Please select MP3, FLAC, WAV, M4A, AAC, OGG, WMA, OPUS, or WEBM files.');
            return;
        }
        startImport();
        updateImportProgress({
            totalFiles: audioFiles.length,
            processedFiles: 0,
            currentFile: '',
            errors: []
        });
        try {
            const trackMetadata = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$metadata$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["metadataService"].extractMetadataFromFiles(audioFiles, (processed, total, currentFile)=>{
                updateImportProgress({
                    processedFiles: processed,
                    currentFile
                });
            });
            // Filter out any failed extractions and validate metadata
            const validTracks = trackMetadata.filter((track)=>track.id).map((track)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$metadata$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["metadataService"].validateAndCleanMetadata(track));
            if (validTracks.length > 0) {
                await addTracks(validTracks);
            }
            const failedCount = audioFiles.length - validTracks.length;
            if (failedCount > 0) {
                updateImportProgress({
                    errors: [
                        `${failedCount} files could not be processed`
                    ]
                });
            }
            updateImportProgress({
                isImporting: false,
                currentFile: ''
            });
            // Close modal after successful import
            setTimeout(()=>{
                toggleImportModal();
            }, 2000);
        } catch (error) {
            console.error('Import failed:', error);
            updateImportProgress({
                isImporting: false,
                errors: [
                    'Import failed. Please try again.'
                ]
            });
        }
    };
    const handleDrag = (e)=>{
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };
    const handleDrop = (e)=>{
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };
    const handleFileSelect = ()=>{
        fileInputRef.current?.click();
    };
    if (!showImportModal) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-semibold text-white",
                            children: "Import Music"
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/ImportModal.tsx",
                            lineNumber: 117,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: toggleImportModal,
                            disabled: importProgress.isImporting,
                            className: "text-gray-400 hover:text-white disabled:opacity-50",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                className: "w-6 h-6"
                            }, void 0, false, {
                                fileName: "[project]/src/components/modals/ImportModal.tsx",
                                lineNumber: 123,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/ImportModal.tsx",
                            lineNumber: 118,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/ImportModal.tsx",
                    lineNumber: 116,
                    columnNumber: 9
                }, this),
                importProgress.isImporting ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center py-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$LoadingSpinner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoadingSpinner"], {
                            className: "w-8 h-8 mx-auto mb-4"
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/ImportModal.tsx",
                            lineNumber: 130,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-white mb-2",
                            children: [
                                "Processing ",
                                importProgress.processedFiles,
                                " of ",
                                importProgress.totalFiles,
                                " files"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/ImportModal.tsx",
                            lineNumber: 131,
                            columnNumber: 13
                        }, this),
                        importProgress.currentFile && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-gray-400 text-sm truncate",
                            children: importProgress.currentFile
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/ImportModal.tsx",
                            lineNumber: 135,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "w-full bg-gray-700 rounded-full h-2 mt-4",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-blue-600 h-2 rounded-full transition-all duration-300",
                                style: {
                                    width: `${importProgress.processedFiles / importProgress.totalFiles * 100}%`
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/modals/ImportModal.tsx",
                                lineNumber: 140,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/ImportModal.tsx",
                            lineNumber: 139,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/modals/ImportModal.tsx",
                    lineNumber: 129,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            onDragEnter: handleDrag,
                            onDragLeave: handleDrag,
                            onDragOver: handleDrag,
                            onDrop: handleDrop,
                            className: `border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$music$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileMusic$3e$__["FileMusic"], {
                                    className: "w-12 h-12 mx-auto text-gray-400 mb-4"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/ImportModal.tsx",
                                    lineNumber: 162,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-white mb-2",
                                    children: "Drag and drop your music files here"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/ImportModal.tsx",
                                    lineNumber: 163,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-gray-400 text-sm mb-4",
                                    children: "or click to browse files"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/ImportModal.tsx",
                                    lineNumber: 166,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: handleFileSelect,
                                    className: "px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {
                                            className: "w-4 h-4 inline mr-2"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/ImportModal.tsx",
                                            lineNumber: 173,
                                            columnNumber: 17
                                        }, this),
                                        "Choose Files"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/ImportModal.tsx",
                                    lineNumber: 169,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/ImportModal.tsx",
                            lineNumber: 151,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-4 text-center",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-gray-400 text-sm",
                                children: "Supported formats: MP3, FLAC, WAV, M4A, AAC, OGG, WMA, OPUS, WEBM"
                            }, void 0, false, {
                                fileName: "[project]/src/components/modals/ImportModal.tsx",
                                lineNumber: 180,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/modals/ImportModal.tsx",
                            lineNumber: 179,
                            columnNumber: 13
                        }, this),
                        importProgress.errors.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2 text-red-400 mb-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                            className: "w-4 h-4"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/ImportModal.tsx",
                                            lineNumber: 189,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-medium",
                                            children: "Import Errors"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/modals/ImportModal.tsx",
                                            lineNumber: 190,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/modals/ImportModal.tsx",
                                    lineNumber: 188,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    className: "text-red-300 text-sm space-y-1",
                                    children: importProgress.errors.map((error, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: error
                                        }, index, false, {
                                            fileName: "[project]/src/components/modals/ImportModal.tsx",
                                            lineNumber: 194,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/modals/ImportModal.tsx",
                                    lineNumber: 192,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/modals/ImportModal.tsx",
                            lineNumber: 187,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    ref: fileInputRef,
                    type: "file",
                    multiple: true,
                    accept: ".mp3,.flac,.wav,.m4a,.aac,.ogg,.wma,.opus,.webm",
                    onChange: (e)=>e.target.files && handleFiles(e.target.files),
                    className: "hidden"
                }, void 0, false, {
                    fileName: "[project]/src/components/modals/ImportModal.tsx",
                    lineNumber: 203,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/modals/ImportModal.tsx",
            lineNumber: 114,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/modals/ImportModal.tsx",
        lineNumber: 113,
        columnNumber: 5
    }, this);
}
_s(ImportModal, "TOMIsXy5fpBlwKhqAQovF9OJcgA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"]
    ];
});
_c = ImportModal;
var _c;
__turbopack_context__.k.register(_c, "ImportModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/LoadingScreen.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LoadingScreen",
    ()=>LoadingScreen
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$LoadingSpinner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/LoadingSpinner.tsx [app-client] (ecmascript)");
'use client';
;
;
function LoadingScreen() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "h-screen bg-gray-900 flex items-center justify-center",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$LoadingSpinner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoadingSpinner"], {
                    className: "w-12 h-12 mx-auto mb-4 text-blue-500"
                }, void 0, false, {
                    fileName: "[project]/src/components/ui/LoadingScreen.tsx",
                    lineNumber: 9,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "text-xl font-semibold text-white mb-2",
                    children: "Loading Music Library"
                }, void 0, false, {
                    fileName: "[project]/src/components/ui/LoadingScreen.tsx",
                    lineNumber: 10,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-gray-400",
                    children: "Initializing your music collection..."
                }, void 0, false, {
                    fileName: "[project]/src/components/ui/LoadingScreen.tsx",
                    lineNumber: 11,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ui/LoadingScreen.tsx",
            lineNumber: 8,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/ui/LoadingScreen.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, this);
}
_c = LoadingScreen;
var _c;
__turbopack_context__.k.register(_c, "LoadingScreen");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>HomePage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store/music-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/Sidebar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$MainContent$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/MainContent.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$modals$2f$ImportModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/modals/ImportModal.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$LoadingScreen$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/LoadingScreen.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
function HomePage() {
    _s();
    const { isInitialized, initialize } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "HomePage.useEffect": ()=>{
            initialize();
        }
    }["HomePage.useEffect"], [
        initialize
    ]);
    if (!isInitialized) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$LoadingScreen$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoadingScreen"], {}, void 0, false, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 18,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex h-screen bg-gray-900",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Sidebar"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$MainContent$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MainContent"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$modals$2f$ImportModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ImportModal"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
_s(HomePage, "YWMxF6rtm7xfNwoTolrme9+XSVk=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2f$music$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMusicStore"]
    ];
});
_c = HomePage;
var _c;
__turbopack_context__.k.register(_c, "HomePage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_db6f1dff._.js.map