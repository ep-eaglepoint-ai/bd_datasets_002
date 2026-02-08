import { 
  StorageSnapshot, 
  HeapPage, 
  IndexPage, 
  PageHeader, 
  TupleHeader, 
  LinePointer, 
  Tuple, 
  FreeSpaceMap, 
  StorageMetrics,
  BinaryInspection 
} from '@/types/storage'
import { SnapshotSchema } from './schemas'

export class StorageParser {
  private static readonly PAGE_SIZE = 8192
  private static readonly PAGE_HEADER_SIZE = 24
  private static readonly TUPLE_HEADER_SIZE = 23
  private static readonly LINE_POINTER_SIZE = 4

  static async parseFile(file: File): Promise<StorageSnapshot> {
    let buffer: ArrayBuffer
    if (file && typeof (file as any).arrayBuffer === 'function') {
      buffer = await (file as any).arrayBuffer()
    } else if (file && typeof (file as any).text === 'function') {
      const text = await (file as any).text()
      buffer = new TextEncoder().encode(text).buffer
    } else {
      throw new Error('Unsupported file object: missing arrayBuffer/text methods')
    }
    const dataView = new DataView(buffer)
    
    try {
      const snapshot = await this.detectFormatAndParse(buffer, dataView, file.name)
      return snapshot
    } catch (error) {
      throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static parseJSONData(data: unknown, filename: string): StorageSnapshot {
    const validated = SnapshotSchema.parse(data)
    return this.convertJSONToSnapshot(validated, filename)
  }

  static recomputeSnapshot(snapshot: StorageSnapshot): StorageSnapshot {
    const freeSpaceMap = this.buildFreeSpaceMap(snapshot.heapPages)
    const metrics = this.calculateMetrics(snapshot.heapPages, snapshot.indexPages, snapshot.metrics.totalPages)
    const heatmapData = snapshot.heapPages.map(p => ({
      pageNumber: p.header.pageNumber,
      density: p.fillFactor,
      fragmentation: p.deadTupleRatio
    }))
    const pageHeatmaps = this.buildPageHeatmaps(snapshot.heapPages)

    return {
      ...snapshot,
      freeSpaceMap,
      metrics,
      heatmapData,
      pageHeatmaps
    }
  }

  private static async detectFormatAndParse(buffer: ArrayBuffer, dataView: DataView, filename: string): Promise<StorageSnapshot> {
    if (this.isJSONFormat(buffer)) {
      return this.parseJSONDump(buffer, filename)
    } else if (this.isPostgreSQLDumpFormat(dataView)) {
      return this.parsePostgreSQLDump(buffer, dataView, filename)
    } else if (this.isBinaryPageFormat(dataView)) {
      return this.parseBinaryPages(buffer, dataView, filename)
    } else {
      throw new Error('Unsupported database dump format')
    }
  }

  private static isPostgreSQLDumpFormat(dataView: DataView): boolean {
    if (dataView.byteLength < 24) return false
    
    const lsn = dataView.getUint32(4, true)
    const checksum = dataView.getUint32(8, true)
    const lower = dataView.getUint16(16, true)
    const upper = dataView.getUint16(18, true)
    
    return lsn !== 0 && checksum !== 0 && lower < this.PAGE_SIZE && upper < this.PAGE_SIZE
  }

  private static isJSONFormat(buffer: ArrayBuffer): boolean {
    const bytes = new Uint8Array(buffer)
    let i = 0
    // skip BOM and whitespace
    while (i < bytes.length) {
      const b = bytes[i]
      if (b === 0xEF && bytes[i + 1] === 0xBB && bytes[i + 2] === 0xBF) {
        i += 3
        continue
      }
      if (b === 0x20 || b === 0x0A || b === 0x0D || b === 0x09 || b === 0x00) {
        i++
        continue
      }
      return b === 0x7B || b === 0x5B // '{' or '['
    }
    return false
  }

  private static isBinaryPageFormat(dataView: DataView): boolean {
    if (dataView.byteLength < 24) return false
    
    const lower = dataView.getUint16(16, true)
    const upper = dataView.getUint16(18, true)
    
    return lower > 0 && upper > 0 && lower < this.PAGE_SIZE && upper < this.PAGE_SIZE
  }

  private static async parsePostgreSQLDump(buffer: ArrayBuffer, dataView: DataView, filename: string): Promise<StorageSnapshot> {
    const pages: HeapPage[] = []
    const indexPages: IndexPage[] = []
    const corruptedPages: number[] = []
    const parsingErrors: string[] = []
    
    const totalPages = Math.floor(buffer.byteLength / this.PAGE_SIZE)
    const CHUNK_SIZE = 64
    
    for (let start = 0; start < totalPages; start += CHUNK_SIZE) {
      const end = Math.min(totalPages, start + CHUNK_SIZE)
      for (let pageNum = start; pageNum < end; pageNum++) {
        const pageOffset = pageNum * this.PAGE_SIZE
        const pageBuffer = buffer.slice(pageOffset, pageOffset + this.PAGE_SIZE)
        const pageDataView = new DataView(pageBuffer)
        
        try {
          const pageHeader = this.parsePageHeader(pageDataView, pageNum)
          
          if (pageHeader.pageType === 'heap') {
            const result = this.parseHeapPage(pageBuffer, pageDataView, pageHeader)
            pages.push(result.page)
            if (result.errors.length > 0) {
              corruptedPages.push(pageNum)
              parsingErrors.push(...result.errors)
            }
          } else if (pageHeader.pageType === 'index' || pageHeader.pageType === 'btree') {
            const result = this.parseIndexPage(pageBuffer, pageDataView, pageHeader)
            indexPages.push(result.page)
            if (result.errors.length > 0) {
              corruptedPages.push(pageNum)
              parsingErrors.push(...result.errors)
            }
          }
        } catch (error) {
          corruptedPages.push(pageNum)
          parsingErrors.push(`Page ${pageNum}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    
    this.validateIndexReferences(indexPages, corruptedPages, parsingErrors)

    const freeSpaceMap = this.buildFreeSpaceMap(pages)
    const metrics = this.calculateMetrics(pages, indexPages, totalPages)
    const heatmapData = pages.map(p => ({
      pageNumber: p.header.pageNumber,
      density: p.fillFactor,
      fragmentation: p.deadTupleRatio
    }))
    const pageHeatmaps = this.buildPageHeatmaps(pages)

    return {
      id: this.generateId(`pgdump:${filename}:${buffer.byteLength}:${pages.length}:${indexPages.length}`),
      name: filename,
      timestamp: 0,
      databaseName: this.extractDatabaseName(filename),
      tableName: this.extractTableName(filename),
      heapPages: pages,
      indexPages,
      freeSpaceMap,
      heatmapData,
      pageHeatmaps,
      metrics,
      corruptedPages,
      parsingErrors
    }
  }

  private static parseJSONDump(buffer: ArrayBuffer, filename: string): StorageSnapshot {
    try {
      const jsonText = new TextDecoder().decode(buffer)
      const parsed = JSON.parse(jsonText)
      // Validate incoming JSON against a Zod schema to ensure deterministic decoding
      const data = SnapshotSchema.parse(parsed)

      return this.convertJSONToSnapshot(data, filename)
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static parseBinaryPages(buffer: ArrayBuffer, dataView: DataView, filename: string): Promise<StorageSnapshot> {
    return this.parsePostgreSQLDump(buffer, dataView, filename)
  }

  private static parsePageHeader(dataView: DataView, pageNumber: number): PageHeader {
    if (dataView.byteLength < this.PAGE_HEADER_SIZE) {
      throw new Error('Page too small for header')
    }
    
    const lsn = dataView.getUint32(4, true)
    const checksum = dataView.getUint32(8, true)
    const lower = dataView.getUint16(16, true)
    const upper = dataView.getUint16(18, true)
    const special = dataView.getUint32(20, true)
    const flags = dataView.getUint16(14, true)
    const pruneXid = dataView.getUint32(12, true)
    
    if (lower > this.PAGE_SIZE || upper > this.PAGE_SIZE) {
      throw new Error('Invalid page header offsets')
    }
    // In PostgreSQL-style heap pages, lower should be <= upper; free space spans between them.
    if (lower > upper) {
      throw new Error('Corrupted page header: lower > upper')
    }
    if (lower < this.PAGE_HEADER_SIZE) {
      throw new Error('Corrupted page header: lower < header size')
    }
    if (special > this.PAGE_SIZE) {
      throw new Error('Corrupted page header: special > page size')
    }
    if (special !== 0 && special < upper) {
      throw new Error('Corrupted page header: special < upper')
    }

    let pageType: PageHeader['pageType'] = 'heap'
    if (flags & 0x0001) pageType = 'index'
    if (flags & 0x0002) pageType = 'btree'
    if (flags & 0x0004) pageType = 'overflow'
    
    return {
      pageType,
      pageNumber,
      lsn,
      checksum,
      lower,
      upper,
      special,
      flags,
      pruneXid
    }
  }

  private static parseHeapPage(buffer: ArrayBuffer, dataView: DataView, header: PageHeader): { page: HeapPage; errors: string[] } {
    const linePointers: LinePointer[] = []
    const tuples: Tuple[] = []
    const errors: string[] = []
    
    const numLinePointers = Math.floor((header.lower - this.PAGE_HEADER_SIZE) / this.LINE_POINTER_SIZE)
    const specialOffset = header.special > 0 ? header.special : this.PAGE_SIZE
    
    for (let i = 0; i < numLinePointers; i++) {
      const offset = this.PAGE_HEADER_SIZE + (i * this.LINE_POINTER_SIZE)
      const raw = dataView.getUint32(offset, true)
      const lpOffset = raw & 0x7fff
      const lpFlags = (raw >> 15) & 0x3
      const lpLength = (raw >> 17) & 0x7fff
      
      if (lpOffset > 0 && lpLength > 0) {
        if (!this.isLinePointerValid(lpOffset, lpLength, header, specialOffset)) {
          errors.push(`Page ${header.pageNumber} line pointer ${i} invalid bounds`)
          continue
        }
        const linePointer: LinePointer = {
          offset: lpOffset,
          length: lpLength,
          flags: lpFlags
        }
        
        linePointers.push(linePointer)
        
        try {
          const tuple = this.parseTuple(buffer, dataView, linePointer, header)
          tuples.push(tuple)
        } catch (error) {
          const msg = `Page ${header.pageNumber} tuple ${lpOffset}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.warn(msg)
          errors.push(msg)
        }
      }
    }
    
    const freeSpace = {
      offset: header.lower,
      length: Math.max(0, header.upper - header.lower)
    }
    
    const fillFactor = ((this.PAGE_SIZE - freeSpace.length) / this.PAGE_SIZE) * 100
    const deadTuples = tuples.filter(t => t.isDead).length
    const deadTupleRatio = tuples.length > 0 ? deadTuples / tuples.length : 0
    
    const page: HeapPage = {
      header,
      linePointers,
      tuples,
      rawBytes: new Uint8Array(buffer),
      freeSpace,
      fillFactor,
      deadTupleRatio
    }
    return { page, errors }
  }

  private static parseTuple(buffer: ArrayBuffer, dataView: DataView, linePointer: LinePointer, pageHeader: PageHeader): Tuple {
    const tupleOffset = linePointer.offset
    const tupleBuffer = buffer.slice(tupleOffset, tupleOffset + linePointer.length)
    const tupleDataView = new DataView(tupleBuffer)
    
    if (tupleBuffer.byteLength < this.TUPLE_HEADER_SIZE) {
      throw new Error('Tuple too small for header')
    }
    
    const tXmin = tupleDataView.getUint32(0, true)
    const tXmax = tupleDataView.getUint32(4, true)
    const tCid = tupleDataView.getUint32(8, true)
    const tInfomask2 = tupleDataView.getUint16(12, true)
    const tInfomask = tupleDataView.getUint16(14, true)
    const tHoff = tupleDataView.getUint8(16)
    
    const hasNulls = (tInfomask & 0x0001) !== 0
    const numAttrs = Math.min(tInfomask2 & 0x07FF, 512)
    const nullBitmapSize = hasNulls ? Math.ceil((numAttrs + 1) / 8) : 0
    
    const nullBitmap: boolean[] = []
    if (hasNulls && nullBitmapSize > 0 && (this.TUPLE_HEADER_SIZE + nullBitmapSize) <= tupleBuffer.byteLength) {
      for (let i = 0; i < numAttrs; i++) {
        const byteIndex = Math.floor(i / 8)
        const bitIndex = i % 8
        const bitmapByte = tupleDataView.getUint8(this.TUPLE_HEADER_SIZE + byteIndex)
        nullBitmap.push((bitmapByte & (1 << (7 - bitIndex))) !== 0)
      }
    }
    
    const isVisible = tXmax === 0
    const isDead = !isVisible
    
    const dataStart = tupleOffset + tHoff
    const dataLength = Math.max(0, linePointer.length - tHoff)
    const data = buffer.slice(dataStart, dataStart + dataLength)
    
    const values = this.extractTupleValues(data, tupleDataView, tHoff, numAttrs, nullBitmap)
    
    return {
      id: `tuple-${pageHeader.pageNumber}-${linePointer.offset}`,
      header: {
        tXmin,
        tXmax,
        tCid,
        tInfomask2,
        tInfomask,
        tHoff,
        tBits: nullBitmap.map(b => b ? 1 : 0)
      },
      linePointer,
      data: new Uint8Array(data),
      isVisible,
      isDead,
      values,
      nullBitmap,
      offset: linePointer.offset,
      length: linePointer.length
    }
  }

  private static parseIndexPage(buffer: ArrayBuffer, dataView: DataView, header: PageHeader): { page: IndexPage; errors: string[] } {
    const specialOffset = header.special > 0 ? header.special : this.PAGE_SIZE
    const isLeaf = (header.flags & 0x0010) !== 0
    const errors: string[] = []

    const keys: string[] = []
    const childPointers: number[] = []

    const numLinePointers = Math.floor((header.lower - this.PAGE_HEADER_SIZE) / this.LINE_POINTER_SIZE)
    for (let i = 0; i < numLinePointers; i++) {
      const offset = this.PAGE_HEADER_SIZE + (i * this.LINE_POINTER_SIZE)
      const raw = dataView.getUint32(offset, true)
      const lpOffset = raw & 0x7fff
      const lpFlags = (raw >> 15) & 0x3
      const lpLength = (raw >> 17) & 0x7fff

      if (lpOffset === 0 || lpLength === 0) continue
      if (!this.isLinePointerValid(lpOffset, lpLength, header, specialOffset)) {
        errors.push(`Index page ${header.pageNumber} line pointer ${i} invalid bounds`)
        continue
      }

      const tupleBytes = buffer.slice(lpOffset, lpOffset + lpLength)
      const tupleView = new DataView(tupleBytes)

      // Deterministic, structure-aware decoding:
      // For internal pages, the first 4 bytes are treated as a child pointer candidate.
      if (!isLeaf && tupleBytes.byteLength >= 4) {
        childPointers.push(tupleView.getUint32(0, true))
      }

      const keyBytes = tupleBytes.byteLength > 4 ? tupleBytes.slice(4) : tupleBytes
      keys.push(this.decodeKeyBytes(new Uint8Array(keyBytes)))
    }

    const level = (header.flags >> 5) & 0x0F
    const utilization = Math.max(
      0,
      Math.min(100, ((specialOffset - header.lower) / (this.PAGE_SIZE - this.PAGE_HEADER_SIZE)) * 100)
    )

    const keyRanges = this.calculateKeyRanges(keys)

    const page: IndexPage = {
      header,
      node: {
        keys,
        childPointers,
        isLeaf,
        level,
        leftSibling: 0,
        rightSibling: 0
      },
      keyRanges,
      utilization
    }
    return { page, errors }
  }

  private static buildFreeSpaceMap(pages: HeapPage[]): FreeSpaceMap {
    const pagesMap = pages.map(page => ({
      pageNumber: page.header.pageNumber,
      freeBytes: page.freeSpace.length,
      isFull: page.freeSpace.length < 100,
      hasDeadTuples: page.deadTupleRatio > 0
    }))
    
    const totalFreeSpace = pagesMap.reduce((sum, p) => sum + p.freeBytes, 0)
    const fragmentationIndex = this.calculateFragmentationIndex(pages)
    
    return {
      pages: pagesMap,
      totalFreeSpace,
      fragmentationIndex
    }
  }

  private static calculateMetrics(pages: HeapPage[], indexPages: IndexPage[], totalPages: number): StorageMetrics {
    const usedPages = pages.length + indexPages.length
    const freePages = totalPages - usedPages
    const totalBytes = totalPages * this.PAGE_SIZE
    const usedBytes = usedPages * this.PAGE_SIZE
    const freeBytes = freePages * this.PAGE_SIZE
    
    const totalTuples = pages.reduce((sum, p) => sum + p.tuples.length, 0)
    const deadTuples = pages.reduce((sum, p) => sum + p.tuples.filter(t => t.isDead).length, 0)
    const deadTupleRatio = totalTuples > 0 ? deadTuples / totalTuples : 0
    
    const averageFillFactor = pages.length > 0 
      ? pages.reduce((sum, p) => sum + p.fillFactor, 0) / pages.length 
      : 0
    
    const fragmentationRatio = this.calculateFragmentationRatio(pages)
    const bloatEstimate = this.calculateBloatEstimate(pages)
    const indexBloatEstimate = this.calculateIndexBloatEstimate(indexPages)
    const pageDensity = totalPages > 0 ? usedPages / totalPages : 0
    
    return {
      totalPages,
      usedPages,
      freePages,
      totalBytes,
      usedBytes,
      freeBytes,
      fragmentationRatio,
      bloatEstimate,
      indexBloatEstimate,
      averageFillFactor,
      deadTupleRatio,
      pageDensity
    }
  }

  private static calculateFragmentationIndex(pages: HeapPage[]): number {
    if (pages.length === 0) return 0
    
    const freeSpaceVariance = this.calculateVariance(pages.map(p => p.freeSpace.length))
    const maxFreeSpace = Math.max(...pages.map(p => p.freeSpace.length))

    if (maxFreeSpace <= 0) return 0
    return (freeSpaceVariance / (maxFreeSpace * maxFreeSpace)) * 100
  }

  private static calculateFragmentationRatio(pages: HeapPage[]): number {
    if (pages.length === 0) return 0
    
    const totalFreeSpace = pages.reduce((sum, p) => sum + p.freeSpace.length, 0)
    const totalSpace = pages.length * this.PAGE_SIZE
    
    return (totalFreeSpace / totalSpace) * 100
  }

  private static calculateBloatEstimate(pages: HeapPage[]): number {
    if (pages.length === 0) return 0
    
    const deadTupleSpace = pages.reduce((sum, p) => {
      const deadTuples = p.tuples.filter(t => t.isDead)
      return sum + deadTuples.reduce((tupleSum, t) => tupleSum + t.data.byteLength, 0)
    }, 0)
    
    const totalTupleSpace = pages.reduce((sum, p) => {
      return sum + p.tuples.reduce((tupleSum, t) => tupleSum + t.data.byteLength, 0)
    }, 0)
    
    return totalTupleSpace > 0 ? (deadTupleSpace / totalTupleSpace) * 100 : 0
  }

  private static calculateIndexBloatEstimate(indexPages: IndexPage[]): number {
    if (indexPages.length === 0) return 0
    
    const averageUtilization = indexPages.reduce((sum, p) => sum + p.utilization, 0) / indexPages.length
    return Math.max(0, 100 - averageUtilization)
  }

  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
  }

  private static calculateKeyRanges(keys: string[]): Array<{ min: string; max: string }> {
    if (keys.length === 0) return []
    
    const ranges: Array<{ min: string; max: string }> = []
    for (let i = 0; i < keys.length - 1; i++) {
      ranges.push({
        min: keys[i],
        max: keys[i + 1]
      })
    }
    
    return ranges
  }

  private static extractTupleValues(data: ArrayBuffer, dataView: DataView, offset: number, numAttrs: number, nullBitmap: boolean[]): Record<string, any> {
    const values: Record<string, any> = {}
    let currentOffset = 0
    
    for (let i = 0; i < numAttrs; i++) {
      if (nullBitmap[i]) {
        values[`attr_${i}`] = null
        continue
      }
      
      if (currentOffset >= data.byteLength) break
      
      const valueSize = Math.min(4, data.byteLength - currentOffset)
      const valueBytes = new Uint8Array(data, currentOffset, valueSize)
      
      if (valueSize === 4) {
        values[`attr_${i}`] = dataView.getUint32(offset + currentOffset, true)
      } else if (valueSize === 2) {
        values[`attr_${i}`] = dataView.getUint16(offset + currentOffset, true)
      } else if (valueSize === 1) {
        values[`attr_${i}`] = dataView.getUint8(offset + currentOffset)
      } else {
        values[`attr_${i}`] = new TextDecoder().decode(valueBytes)
      }
      
      currentOffset += valueSize
    }
    
    return values
  }

  private static convertJSONToSnapshot(data: any, filename: string): StorageSnapshot {
    const heapPages: HeapPage[] = (data.heapPages || []).map((pageData: any) => {
      const freeSpace = pageData.freeSpace || { offset: 0, length: 0 }
      const tuples = pageData.tuples || []
      const fillFactor = typeof pageData.fillFactor === 'number'
        ? pageData.fillFactor
        : ((this.PAGE_SIZE - (freeSpace.length || 0)) / this.PAGE_SIZE) * 100
      const deadTupleRatio = typeof pageData.deadTupleRatio === 'number'
        ? pageData.deadTupleRatio
        : (tuples.length > 0 ? (tuples.filter((t: any) => t.isDead).length / tuples.length) : 0)

      return {
        header: pageData.header,
        linePointers: pageData.linePointers || [],
        tuples: (tuples || []).map((tuple: any) => ({
          ...tuple,
          offset: tuple.offset ?? tuple.linePointer?.offset,
          length: tuple.length ?? tuple.linePointer?.length
        })),
        freeSpace,
        fillFactor,
        deadTupleRatio,
        rawBytes: Array.isArray(pageData.rawBytes) ? new Uint8Array(pageData.rawBytes) : undefined
      }
    })
    
    const indexPages: IndexPage[] = (data.indexPages || []).map((pageData: any) => ({
      header: pageData.header,
      node: pageData.node,
      keyRanges: pageData.keyRanges || [],
      utilization: pageData.utilization || 0
    }))
    
    const freeSpaceMap = this.buildFreeSpaceMap(heapPages)
    const metrics = this.calculateMetrics(heapPages, indexPages, data.totalPages || heapPages.length + indexPages.length)
    const heatmapData = heapPages
      .map(p => ({
        pageNumber: p.header.pageNumber,
        density: typeof p.fillFactor === 'number' ? p.fillFactor : 0,
        fragmentation: typeof p.deadTupleRatio === 'number' ? p.deadTupleRatio : 0
      }))
      .sort((a, b) => a.pageNumber - b.pageNumber)
    const pageHeatmaps = Array.isArray(data.pageHeatmaps)
      ? data.pageHeatmaps
      : this.buildPageHeatmaps(heapPages)

    return {
      id: this.generateId(`json:${filename}:${heapPages.length}:${indexPages.length}:${data.totalPages || 0}`),
      name: filename,
      timestamp: typeof data.timestamp === 'number' ? data.timestamp : 0,
      databaseName: data.databaseName || 'unknown',
      tableName: data.tableName || 'unknown',
      heapPages,
      indexPages,
      freeSpaceMap,
      heatmapData,
      pageHeatmaps,
      metrics,
      corruptedPages: data.corruptedPages || [],
      parsingErrors: data.parsingErrors || []
    }
  }

  private static extractDatabaseName(filename: string): string {
    const match = filename.match(/(.+?)_/)
    return match ? match[1] : 'unknown'
  }

  private static extractTableName(filename: string): string {
    const match = filename.match(/_(.+?)(?:\..+)?$/)
    return match ? match[1] : 'unknown'
  }

  private static generateId(seed: string): string {
    const hash = this.hashString(seed)
    return `snap-${hash}`
  }

  private static hashString(input: string): string {
    let hash = 5381
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) + hash) + input.charCodeAt(i)
      hash = hash & 0xffffffff
    }
    return (hash >>> 0).toString(36)
  }

  static inspectBinary(snapshot: StorageSnapshot, pageNumber: number, offset: number, length: number): BinaryInspection[] {
    const inspections: BinaryInspection[] = []
    const page = snapshot.heapPages.find(p => p.header.pageNumber === pageNumber)
    
    if (!page) {
      throw new Error(`Page ${pageNumber} not found`)
    }
    if (!page.rawBytes) {
      throw new Error(`Page ${pageNumber} has no raw byte data`)
    }
    
    const dataView = new DataView(page.rawBytes.buffer)
    
    const maxOffset = Math.min(this.PAGE_SIZE, page.rawBytes.length)
    for (let i = 0; i < length; i++) {
      const currentOffset = offset + i
      if (currentOffset >= maxOffset) break
      
      const byte = dataView.getUint8(currentOffset)
      const bytes = [byte]
      const hexString = ('0' + byte.toString(16)).slice(-2)
      const asciiString = (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.'
      
      let interpretation = 'Data byte'
      if (currentOffset < this.PAGE_HEADER_SIZE) {
        interpretation = this.interpretHeaderByte(currentOffset, byte)
      }
      
      inspections.push({
        offset: currentOffset,
        bytes,
        hexString,
        asciiString,
        interpretation
      })
    }
    
    return inspections
  }

  private static interpretHeaderByte(offset: number, byte: number): string {
    switch (offset) {
      case 0: case 1: case 2: case 3:
        return `Page Number: ${byte}`
      case 4: case 5: case 6: case 7:
        return `LSN byte ${offset - 4}`
      case 8: case 9: case 10: case 11:
        return `Checksum byte ${offset - 8}`
      case 16: case 17:
        return `Lower offset byte ${offset - 16}`
      case 18: case 19:
        return `Upper offset byte ${offset - 18}`
      default:
        return 'Header metadata'
    }
  }

  private static buildPageHeatmaps(pages: HeapPage[]) {
    return pages.map(page => {
      const tupleCount = page.tuples.length
      const deadRatio = page.deadTupleRatio
      const freeRatio = page.freeSpace.length / this.PAGE_SIZE
      return {
        pageNumber: page.header.pageNumber,
        accessFrequency: Math.max(0, Math.min(100, tupleCount * 3)),
        modificationDensity: Math.max(0, Math.min(100, deadRatio * 100)),
        storageChurn: Math.max(0, Math.min(100, (1 - freeRatio) * 100)),
        lastAccessed: 0,
        lastModified: 0
      }
    })
  }

  private static validateIndexReferences(indexPages: IndexPage[], corruptedPages: number[], parsingErrors: string[]) {
    if (indexPages.length === 0) return
    const pageNumbers = new Set(indexPages.map(p => p.header.pageNumber))
    indexPages.forEach((page) => {
      if (!page.node.childPointers || page.node.childPointers.length === 0) return
      page.node.childPointers.forEach((ptr) => {
        if (!pageNumbers.has(ptr)) {
          parsingErrors.push(`Index page ${page.header.pageNumber} references missing child page ${ptr}`)
          if (!corruptedPages.includes(page.header.pageNumber)) {
            corruptedPages.push(page.header.pageNumber)
          }
        }
      })
    })
  }

  private static isLinePointerValid(offset: number, length: number, header: PageHeader, specialOffset: number): boolean {
    const end = offset + length
    if (offset < header.upper) return false
    if (end > this.PAGE_SIZE) return false
    if (specialOffset > 0 && end > specialOffset) return false
    return true
  }

  private static decodeKeyBytes(bytes: Uint8Array): string {
    if (bytes.length === 0) return ''
    const printable = bytes.every(b => b >= 32 && b <= 126)
    if (printable) {
      return new TextDecoder().decode(bytes)
    }
    return Array.from(bytes)
      .map(b => ('00' + b.toString(16)).slice(-2))
      .join('')
  }
}
