import { StorageSnapshot, ComparisonResult } from '@/types/storage'

export function compareSnapshots(snapshot1: StorageSnapshot, snapshot2: StorageSnapshot): ComparisonResult {
  const metricChanges = {
    totalPages: snapshot2.metrics.totalPages - snapshot1.metrics.totalPages,
    usedPages: snapshot2.metrics.usedPages - snapshot1.metrics.usedPages,
    freePages: snapshot2.metrics.freePages - snapshot1.metrics.freePages,
    fragmentationRatio: snapshot2.metrics.fragmentationRatio - snapshot1.metrics.fragmentationRatio,
    bloatEstimate: snapshot2.metrics.bloatEstimate - snapshot1.metrics.bloatEstimate,
    indexBloatEstimate: snapshot2.metrics.indexBloatEstimate - snapshot1.metrics.indexBloatEstimate,
    averageFillFactor: snapshot2.metrics.averageFillFactor - snapshot1.metrics.averageFillFactor,
    deadTupleRatio: snapshot2.metrics.deadTupleRatio - snapshot1.metrics.deadTupleRatio,
    pageDensity: snapshot2.metrics.pageDensity - snapshot1.metrics.pageDensity
  }

  const pageChanges = buildPageChanges(snapshot1, snapshot2)

  const fragmentationTrend =
    metricChanges.fragmentationRatio > 0.01 ? 'increasing' :
    metricChanges.fragmentationRatio < -0.01 ? 'decreasing' :
    'stable'

  const recommendations: string[] = []
  if (metricChanges.fragmentationRatio > 5) recommendations.push('Fragmentation increased. Consider VACUUM.')
  if (metricChanges.deadTupleRatio > 0.05) recommendations.push('Dead tuple ratio increased. Investigate write patterns.')
  if (pageChanges.some(p => p.changeType === 'added')) recommendations.push('New pages detected. Monitor growth trends.')
  if (pageChanges.some(p => p.changeType === 'removed')) recommendations.push('Pages removed. Check compaction or vacuum activity.')
  if (recommendations.length === 0) recommendations.push('No significant regression detected.')

  return {
    snapshot1: snapshot1.id,
    snapshot2: snapshot2.id,
    pageChanges,
    metricChanges,
    fragmentationTrend,
    recommendations
  }
}

function buildPageChanges(snapshot1: StorageSnapshot, snapshot2: StorageSnapshot) {
  const pageMap1 = new Map<number, { type: 'heap' | 'index'; summary: string }>()
  snapshot1.heapPages.forEach(p => {
    pageMap1.set(p.header.pageNumber, {
      type: 'heap',
      summary: `tuples=${p.tuples.length} dead=${(p.deadTupleRatio * 100).toFixed(1)}% fill=${p.fillFactor.toFixed(1)}%`
    })
  })
  snapshot1.indexPages.forEach(p => {
    pageMap1.set(p.header.pageNumber, {
      type: 'index',
      summary: `keys=${p.node.keys.length} util=${p.utilization.toFixed(1)}% level=${p.node.level}`
    })
  })

  const pageMap2 = new Map<number, { type: 'heap' | 'index'; summary: string }>()
  snapshot2.heapPages.forEach(p => {
    pageMap2.set(p.header.pageNumber, {
      type: 'heap',
      summary: `tuples=${p.tuples.length} dead=${(p.deadTupleRatio * 100).toFixed(1)}% fill=${p.fillFactor.toFixed(1)}%`
    })
  })
  snapshot2.indexPages.forEach(p => {
    pageMap2.set(p.header.pageNumber, {
      type: 'index',
      summary: `keys=${p.node.keys.length} util=${p.utilization.toFixed(1)}% level=${p.node.level}`
    })
  })

  const allPageNumbers = new Set<number>([...pageMap1.keys(), ...pageMap2.keys()])
  const changes = []

  for (const pageNumber of Array.from(allPageNumbers).sort((a, b) => a - b)) {
    const before = pageMap1.get(pageNumber)
    const after = pageMap2.get(pageNumber)

    if (!before && after) {
      changes.push({
        pageNumber,
        changeType: 'added' as const,
        details: `${after.type} page added: ${after.summary}`
      })
    } else if (before && !after) {
      changes.push({
        pageNumber,
        changeType: 'removed' as const,
        details: `${before.type} page removed: ${before.summary}`
      })
    } else if (before && after && before.summary !== after.summary) {
      changes.push({
        pageNumber,
        changeType: 'modified' as const,
        details: `${before.type} page changed: ${before.summary} → ${after.summary}`
      })
    }
  }

  return changes
}
