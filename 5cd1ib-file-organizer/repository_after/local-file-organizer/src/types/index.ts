export interface Tag {
  id: number;
  name: string;
}

export interface FileRecord {
  id: number;
  path: string;
  filename: string;
  extension: string;
  size: string;
  createdAt: string;
  updatedAt: string;
  mimeType?: string;
  hash?: string;
  tags: Tag[];
  isDirectory?: boolean;
  lastScannedAt?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ScanProgress {
  filesScanned: number;
  directoriesScanned: number;
  errors: ScanError[];
  currentPath: string;
}

export interface ScanError {
  path: string;
  error: string;
  type: "permission" | "symlink_cycle" | "read_error" | "hash_error" | "unknown";
}

export interface ScanStatus {
  isScanning: boolean;
  currentPath: string;
  status: "idle" | "scanning" | "completed" | "cancelled" | "error";
  error: string | null;
  startTime: string | null;
  progress: ScanProgress | null;
}

export interface DuplicateGroup {
  files: FileRecord[];
  hash: string;
  size: string;
  count: number;
}

export interface FilesResponse {
  data: FileRecord[];
  pagination: Pagination;
  filters: {
    search?: string;
    extension?: string;
    minSize?: string;
    maxSize?: string;
    fromDate?: string;
    toDate?: string;
    tags?: string;
    directory?: string;
  };
}

export interface DuplicatesResponse {
  groups: FileRecord[][];
  totalGroups: number;
  displayedGroups: number;
  pagination: Pagination;
  stats: {
    totalDuplicateFiles: number;
    potentialSpaceSaved: string;
  };
}

export interface BulkDeleteResult {
  id: number;
  path: string;
  success: boolean;
  error?: string;
  dryRun: boolean;
}

export interface BulkDeleteResponse {
  results: BulkDeleteResult[];
  summary: {
    total: number;
    success: number;
    failed: number;
    dryRun: boolean;
  };
}
