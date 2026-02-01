self.onmessage = function (e) {
  const { text, filename } = e.data

  try {
    const data = JSON.parse(text)

    const heapPages = (data.heapPages || []).map((pageData) => ({
      header: pageData.header || { pageType: 'heap', pageNumber: 0 },
      linePointers: pageData.linePointers || [],
      tuples: pageData.tuples || [],
      freeSpace: pageData.freeSpace || { offset: 0, length: 0 },
      fillFactor: pageData.fillFactor || 0,
      deadTupleRatio: pageData.deadTupleRatio || 0
    }))

    const indexPages = (data.indexPages || []).map((p) => ({ header: p.header || { pageNumber: 0 }, node: p.node || { keys: [], isLeaf: true, level: 0, childPointers: [] }, keyRanges: p.keyRanges || [], utilization: p.utilization || 0 }))

    const heatmapData = heapPages.map((p) => ({ pageNumber: p.header.pageNumber, density: p.fillFactor || 0, fragmentation: p.deadTupleRatio || 0 }))

    const totalPages = data.totalPages || heapPages.length + indexPages.length

    const usedPages = heapPages.length + indexPages.length
    const freePages = Math.max(0, totalPages - usedPages)
    const PAGE_SIZE = 8192

    const metrics = {
      totalPages,
      usedPages,
      freePages,
      totalBytes: totalPages * PAGE_SIZE,
      usedBytes: usedPages * PAGE_SIZE,
      freeBytes: freePages * PAGE_SIZE,
      fragmentationRatio: heapPages.length === 0 ? 0 : (heapPages.reduce((s, p) => s + (p.deadTupleRatio || 0), 0) / heapPages.length) * 100,
      bloatEstimate: 0,
      indexBloatEstimate: 0,
      averageFillFactor: heapPages.length === 0 ? 0 : heapPages.reduce((s, p) => s + (p.fillFactor || 0), 0) / heapPages.length,
      deadTupleRatio: heapPages.length === 0 ? 0 : heapPages.reduce((s, p) => s + (p.deadTupleRatio || 0), 0) / heapPages.length,
      pageDensity: totalPages === 0 ? 0 : usedPages / totalPages
    }

    const freeSpaceMap = {
      pages: heapPages.map((page) => ({ pageNumber: page.header.pageNumber, freeBytes: page.freeSpace.length || 0, isFull: (page.freeSpace.length || 0) < 100, hasDeadTuples: (page.deadTupleRatio || 0) > 0 })),
      totalFreeSpace: heapPages.reduce((s, p) => s + (p.freeSpace.length || 0), 0),
      fragmentationIndex: 0
    }

    const snapshot = {
      id: 'wk-' + Math.random().toString(36).substr(2, 9),
      name: filename,
      timestamp: Date.now(),
      databaseName: data.databaseName || 'unknown',
      tableName: data.tableName || 'unknown',
      heapPages,
      indexPages,
      freeSpaceMap,
      heatmapData,
      metrics,
      corruptedPages: data.corruptedPages || [],
      parsingErrors: data.parsingErrors || []
    }

    self.postMessage({ snapshot })
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) })
  }
}
