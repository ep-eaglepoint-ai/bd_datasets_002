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

export class StorageParser {
  private static readonly PAGE_SIZE = 8192
  private static readonly PAGE_HEADER_SIZE = 24
  private static readonly TUPLE_HEADER_SIZE = 23
  private static readonly LINE_POINTER_SIZE = 4

  static async parseFile(file: File): Promise<StorageSnapshot> {
    const buffer = await file.arrayBuffer()
    const dataView = new DataView(buffer)
    
    try {
      const snapshot = this.detectFormatAndParse(buffer, dataView, file.name)
      return snapshot
    } catch (error) {
      throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static detectFormatAndParse(buffer: ArrayBuffer, dataView: DataView, filename: string): StorageSnapshot {
    const firstBytes = new Uint8Array(buffer.slice(0, 16))
    const hexString = Array.from(firstBytes).map(byte => ('0' + byte.toString(16)).slice(-2)).join('')
    
    if (this.isPostgreSQLDumpFormat(dataView)) {
      return this.parsePostgreSQLDump(buffer, dataView, filename)
    } else if (this.isJSONFormat(buffer)) {
      return this.parseJSONDump(buffer, filename)
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
    
    return lsn !== 0 && checksum !== 0
  }

  private static isJSONFormat(buffer: ArrayBuffer): boolean {
    const text = new TextDecoder().decode(buffer.slice(0, 100))
    return text.trim().startsWith('{') || text.trim().startsWith('[')
  }

  private static isBinaryPageFormat(dataView: DataView): boolean {
    if (dataView.byteLength < 24) return false
    
    const lower = dataView.getUint16(16, true)
    const upper = dataView.getUint16(18, true)
    
    return lower > 0 && upper > 0 && lower < this.PAGE_SIZE && upper < this.PAGE_SIZE
  }

  private static parsePostgreSQLDump(buffer: ArrayBuffer, dataView: DataView, filename: string): StorageSnapshot {
    const pages: HeapPage[] = []
    const indexPages: IndexPage[] = []
    const corruptedPages: number[] = []
    const parsingErrors: string[] = []
    
    const totalPages = Math.floor(buffer.byteLength / this.PAGE_SIZE)
    
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const pageOffset = pageNum * this.PAGE_SIZE
      const pageBuffer = buffer.slice(pageOffset, pageOffset + this.PAGE_SIZE)
      const pageDataView = new DataView(pageBuffer)
      
      try {
        const pageHeader = this.parsePageHeader(pageDataView, pageNum)
        
        if (pageHeader.pageType === 'heap') {
          const heapPage = this.parseHeapPage(pageBuffer, pageDataView, pageHeader)
          pages.push(heapPage)
        } else if (pageHeader.pageType === 'index' || pageHeader.pageType === 'btree') {
          const indexPage = this.parseIndexPage(pageBuffer, pageDataView, pageHeader)
          indexPages.push(indexPage)
        }
      } catch (error) {
        corruptedPages.push(pageNum)
        parsingErrors.push(`Page ${pageNum}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    const freeSpaceMap = this.buildFreeSpaceMap(pages)
    const metrics = this.calculateMetrics(pages, indexPages, totalPages)
    
    return {
      id: this.generateId(),
      name: filename,
      timestamp: Date.now(),
      databaseName: this.extractDatabaseName(filename),
      tableName: this.extractTableName(filename),
      heapPages: pages,
      indexPages,
      freeSpaceMap,
      metrics,
      corruptedPages,
      parsingErrors
    }
  }

  private static parseJSONDump(buffer: ArrayBuffer, filename: string): StorageSnapshot {
    try {
      const jsonText = new TextDecoder().decode(buffer)
      const data = JSON.parse(jsonText)
      
      return this.convertJSONToSnapshot(data, filename)
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static parseBinaryPages(buffer: ArrayBuffer, dataView: DataView, filename: string): StorageSnapshot {
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

  private static parseHeapPage(buffer: ArrayBuffer, dataView: DataView, header: PageHeader): HeapPage {
    const linePointers: LinePointer[] = []
    const tuples: Tuple[] = []
    
    const numLinePointers = Math.floor((header.lower - this.PAGE_HEADER_SIZE) / this.LINE_POINTER_SIZE)
    
    for (let i = 0; i < numLinePointers; i++) {
      const offset = this.PAGE_HEADER_SIZE + (i * this.LINE_POINTER_SIZE)
      const lpOffset = dataView.getUint16(offset, true)
      const lpFlags = dataView.getUint16(offset + 2, true)
      
      if (lpOffset > 0) {
        const linePointer: LinePointer = {
          offset: lpOffset,
          length: 0,
          flags: lpFlags
        }
        
        if (i < numLinePointers - 1) {
          const nextOffset = dataView.getUint16(offset + this.LINE_POINTER_SIZE, true)
          linePointer.length = nextOffset - lpOffset
        } else {
          linePointer.length = header.upper - lpOffset
        }
        
        linePointers.push(linePointer)
        
        try {
          const tuple = this.parseTuple(buffer, dataView, linePointer, header)
          tuples.push(tuple)
        } catch (error) {
          console.warn(`Failed to parse tuple at offset ${lpOffset}:`, error)
        }
      }
    }
    
    const freeSpace = {
      offset: header.upper,
      length: header.lower - header.upper
    }
    
    const fillFactor = ((this.PAGE_SIZE - freeSpace.length) / this.PAGE_SIZE) * 100
    const deadTuples = tuples.filter(t => t.isDead).length
    const deadTupleRatio = tuples.length > 0 ? deadTuples / tuples.length : 0
    
    return {
      header,
      linePointers,
      tuples,
      freeSpace,
      fillFactor,
      deadTupleRatio
    }
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
    const numAttrs = tInfomask2 & 0x07FF
    const nullBitmapSize = hasNulls ? Math.ceil((numAttrs + 1) / 8) : 0
    
    const nullBitmap: boolean[] = []
    if (hasNulls && nullBitmapSize > 0) {
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
    const dataLength = linePointer.length - tHoff
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
      nullBitmap
    }
  }

  private static parseIndexPage(buffer: ArrayBuffer, dataView: DataView, header: PageHeader): IndexPage {
    const specialOffset = header.special
    const isLeaf = (header.flags & 0x0010) !== 0
    
    const keys: string[] = []
    const childPointers: number[] = []
    
    let offset = this.PAGE_HEADER_SIZE
    while (offset < specialOffset) {
      const keySize = dataView.getUint16(offset, true)
      offset += 2
      
      if (keySize > 0) {
        const keyData = buffer.slice(offset, offset + keySize)
        keys.push(new TextDecoder().decode(keyData))
        offset += keySize
      }
      
      if (!isLeaf) {
        const childPtr = dataView.getUint32(offset, true)
        childPointers.push(childPtr)
        offset += 4
      }
    }
    
    const level = (header.flags >> 5) & 0x0F
    const utilization = ((specialOffset - this.PAGE_HEADER_SIZE) / (this.PAGE_SIZE - this.PAGE_HEADER_SIZE)) * 100
    
    const keyRanges = this.calculateKeyRanges(keys)
    
    return {
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
    const pageDensity = usedPages / totalPages
    
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
    const heapPages: HeapPage[] = (data.heapPages || []).map((pageData: any) => ({
      header: pageData.header,
      linePointers: pageData.linePointers || [],
      tuples: pageData.tuples || [],
      freeSpace: pageData.freeSpace || { offset: 0, length: 0 },
      fillFactor: pageData.fillFactor || 0,
      deadTupleRatio: pageData.deadTupleRatio || 0
    }))
    
    const indexPages: IndexPage[] = (data.indexPages || []).map((pageData: any) => ({
      header: pageData.header,
      node: pageData.node,
      keyRanges: pageData.keyRanges || [],
      utilization: pageData.utilization || 0
    }))
    
    const freeSpaceMap = this.buildFreeSpaceMap(heapPages)
    const metrics = this.calculateMetrics(heapPages, indexPages, data.totalPages || heapPages.length + indexPages.length)
    
    return {
      id: this.generateId(),
      name: filename,
      timestamp: Date.now(),
      databaseName: data.databaseName || 'unknown',
      tableName: data.tableName || 'unknown',
      heapPages,
      indexPages,
      freeSpaceMap,
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

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  static inspectBinary(snapshot: StorageSnapshot, pageNumber: number, offset: number, length: number): BinaryInspection[] {
    const inspections: BinaryInspection[] = []
    const page = snapshot.heapPages.find(p => p.header.pageNumber === pageNumber)
    
    if (!page) {
      throw new Error(`Page ${pageNumber} not found`)
    }
    
    const pageBuffer = new ArrayBuffer(this.PAGE_SIZE)
    const dataView = new DataView(pageBuffer)
    
    for (let i = 0; i < length; i++) {
      const currentOffset = offset + i
      if (currentOffset >= this.PAGE_SIZE) break
      
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
}
