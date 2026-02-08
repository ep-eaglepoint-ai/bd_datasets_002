export interface PageHeader {
  pageType: 'heap' | 'index' | 'btree' | 'overflow'
  pageNumber: number
  lsn: number
  checksum: number
  lower: number
  upper: number
  special: number
  flags: number
  pruneXid: number
}

export interface TupleHeader {
  tXmin: number
  tXmax: number
  tCid: number
  tInfomask2: number
  tInfomask: number
  tHoff: number
  tBits: number[]
}

export interface LinePointer {
  offset: number
  length: number
  flags: number
}

export interface Tuple {
  id: string
  header: TupleHeader
  linePointer: LinePointer
  data: Uint8Array
  isVisible: boolean
  isDead: boolean
  values: Record<string, any>
  nullBitmap: boolean[]
  offset?: number
  length?: number
}

export interface HeapPage {
  header: PageHeader
  linePointers: LinePointer[]
  tuples: Tuple[]
  rawBytes?: Uint8Array
  freeSpace: {
    offset: number
    length: number
  }
  fillFactor: number
  deadTupleRatio: number
}

export interface IndexNode {
  keys: string[]
  childPointers: number[]
  isLeaf: boolean
  level: number
  leftSibling?: number
  rightSibling?: number
}

export interface IndexPage {
  header: PageHeader
  node: IndexNode
  keyRanges: Array<{ min: string; max: string }>
  utilization: number
}

export interface FreeSpaceMap {
  pages: Array<{
    pageNumber: number
    freeBytes: number
    isFull: boolean
    hasDeadTuples: boolean
  }>
  totalFreeSpace: number
  fragmentationIndex: number
}

export interface StorageMetrics {
  totalPages: number
  usedPages: number
  freePages: number
  totalBytes: number
  usedBytes: number
  freeBytes: number
  fragmentationRatio: number
  bloatEstimate: number
  indexBloatEstimate: number
  averageFillFactor: number
  deadTupleRatio: number
  pageDensity: number
}

export interface HeatmapData {
  pageNumber: number
  density: number
  fragmentation: number
  accessFrequency?: number
  modificationDensity?: number
  storageChurn?: number
}

export interface StorageSnapshot {
  id: string
  name: string
  timestamp: number
  databaseName: string
  tableName: string
  heapPages: HeapPage[]
  indexPages: IndexPage[]
  freeSpaceMap: FreeSpaceMap
  metrics: StorageMetrics
  heatmapData?: HeatmapData[]
  pageHeatmaps?: PageHeatmap[]
  corruptedPages: number[]
  parsingErrors: string[]
}

export interface PageHeatmap {
  pageNumber: number
  accessFrequency: number
  modificationDensity: number
  storageChurn: number
  lastAccessed: number
  lastModified: number
}

export interface InspectionLog {
  id: string
  timestamp: number
  action: string
  snapshotId: string
  details: Record<string, any>
  errors?: string[]
}

export interface BinaryInspection {
  offset: number
  bytes: number[]
  hexString: string
  asciiString: string
  interpretation: string
  fieldStructure?: {
    name: string
    type: string
    size: number
    value: any
  }
}

export interface StorageOperation {
  type: 'insert' | 'update' | 'delete' | 'vacuum' | 'compact'
  targetPage: number
  targetTuple?: number
  beforeState: StorageSnapshot
  afterState: StorageSnapshot
  impact: {
    pagesAffected: number[]
    bytesFreed: number
    bytesAllocated: number
    fragmentationChange: number
  }
}

export interface ComparisonResult {
  snapshot1: string
  snapshot2: string
  pageChanges: Array<{
    pageNumber: number
    changeType: 'modified' | 'added' | 'removed'
    details: string
  }>
  metricChanges: Partial<StorageMetrics>
  fragmentationTrend: 'increasing' | 'decreasing' | 'stable'
  recommendations: string[]
}
