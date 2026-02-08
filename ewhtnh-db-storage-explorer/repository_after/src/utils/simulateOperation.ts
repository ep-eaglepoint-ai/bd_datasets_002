import { StorageSnapshot, Tuple, HeapPage } from '@/types/storage'
import { StorageParser } from '@/utils/storageParser'

export type SimulationOp = 'insert' | 'update' | 'delete' | 'vacuum' | 'compact'

export function simulateOperation(snapshot: StorageSnapshot, op: SimulationOp): StorageSnapshot {
  const heapPages = snapshot.heapPages.map(page => ({
    ...page,
    header: { ...page.header },
    linePointers: page.linePointers.map(lp => ({ ...lp })),
    tuples: page.tuples.map(t => ({
      ...t,
      data: new Uint8Array(t.data),
      header: { ...t.header },
      linePointer: { ...t.linePointer }
    })),
    freeSpace: { ...page.freeSpace }
  }))

  const tupleSize = 32
  const tupleHeaderSize = 24

  const targetPage = pickTargetPage(heapPages, tupleSize)
  const page = targetPage || createNewPage(heapPages)
  if (!page) return snapshot

  switch (op) {
    case 'insert':
      insertTuple(page, tupleSize, tupleHeaderSize)
      break
    case 'delete':
      markTupleDead(page)
      break
    case 'update':
      if (!markTupleDead(page)) {
        insertTuple(page, tupleSize, tupleHeaderSize)
      } else {
        insertTuple(page, tupleSize, tupleHeaderSize)
      }
      break
    case 'vacuum':
      repackPage(page, true)
      break
    case 'compact':
      repackPage(page, true)
      break
  }

  const updated: StorageSnapshot = {
    ...snapshot,
    id: `sim-${snapshot.id}-${op}-${hashString(`${snapshot.id}:${op}:${page.header.pageNumber}:${page.tuples.length}:${page.freeSpace.offset}:${page.freeSpace.length}`)}`,
    timestamp: snapshot.timestamp + 1,
    heapPages
  }

  return StorageParser.recomputeSnapshot(updated)
}

function hashString(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i)
    hash = hash & 0xffffffff
  }
  return (hash >>> 0).toString(36)
}

const PAGE_SIZE = 8192
const PAGE_HEADER_SIZE = 24
const LINE_POINTER_SIZE = 4

function pickTargetPage(pages: HeapPage[], tupleSize: number): HeapPage | null {
  const candidates = pages.filter(p => p.freeSpace.length >= (tupleSize + LINE_POINTER_SIZE))
  if (candidates.length === 0) return null
  return candidates.sort((a, b) => {
    if (b.freeSpace.length !== a.freeSpace.length) return b.freeSpace.length - a.freeSpace.length
    return a.header.pageNumber - b.header.pageNumber
  })[0]
}

function createNewPage(pages: HeapPage[]): HeapPage {
  const nextPageNumber = pages.length > 0
    ? Math.max(...pages.map(p => p.header.pageNumber)) + 1
    : 0
  const header = {
    pageType: 'heap' as const,
    pageNumber: nextPageNumber,
    lsn: 0,
    checksum: 0,
    lower: PAGE_HEADER_SIZE,
    upper: PAGE_SIZE,
    special: 0,
    flags: 0,
    pruneXid: 0
  }
  const page: HeapPage = {
    header,
    linePointers: [],
    tuples: [],
    freeSpace: { offset: header.lower, length: header.upper - header.lower },
    fillFactor: 0,
    deadTupleRatio: 0
  }
  pages.push(page)
  return page
}

function insertTuple(page: HeapPage, tupleSize: number, tupleHeaderSize: number) {
  if (page.freeSpace.length < tupleSize + LINE_POINTER_SIZE) return

  const newLower = page.header.lower + LINE_POINTER_SIZE
  const newUpper = page.header.upper - tupleSize

  if (newUpper <= newLower) return

  const newTuple: Tuple = {
    id: `tuple-${page.header.pageNumber}-${page.tuples.length}`,
    header: {
      tXmin: 1,
      tXmax: 0,
      tCid: 0,
      tInfomask2: 0,
      tInfomask: 0,
      tHoff: tupleHeaderSize,
      tBits: []
    },
    linePointer: { offset: newUpper, length: tupleSize, flags: 0 },
    data: new Uint8Array(Math.max(0, tupleSize - tupleHeaderSize)),
    isVisible: true,
    isDead: false,
    values: { attr_0: 0 },
    nullBitmap: [],
    offset: newUpper,
    length: tupleSize
  }

  page.tuples.push(newTuple)
  page.linePointers.push(newTuple.linePointer)
  page.header.lower = newLower
  page.header.upper = newUpper
  page.freeSpace = { offset: page.header.lower, length: Math.max(0, page.header.upper - page.header.lower) }
}

function markTupleDead(page: HeapPage): boolean {
  const tuple = page.tuples.find(t => t.isVisible)
  if (!tuple) return false
  tuple.isDead = true
  tuple.isVisible = false
  tuple.header.tXmax = tuple.header.tXmax || 1
  return true
}

function repackPage(page: HeapPage, removeDead: boolean) {
  const tuples = removeDead ? page.tuples.filter(t => !t.isDead) : page.tuples.slice()
  const totalTupleBytes = tuples.reduce((sum, t) => sum + (t.length || t.linePointer.length), 0)
  const newUpper = PAGE_SIZE - totalTupleBytes
  const newLower = PAGE_HEADER_SIZE + tuples.length * LINE_POINTER_SIZE

  page.header.lower = newLower
  page.header.upper = Math.max(newUpper, newLower)
  page.tuples = tuples.map((t, i) => ({
    ...t,
    linePointer: {
      ...t.linePointer,
      offset: page.header.upper + tuples.slice(0, i).reduce((s, cur) => s + (cur.length || cur.linePointer.length), 0)
    }
  }))
  page.linePointers = page.tuples.map(t => ({ ...t.linePointer }))
  page.freeSpace = { offset: page.header.lower, length: Math.max(0, page.header.upper - page.header.lower) }
}
