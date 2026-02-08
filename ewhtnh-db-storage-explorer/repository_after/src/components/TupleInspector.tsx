'use client'

import { useMemo } from 'react'
import { Tuple, HeapPage } from '@/types/storage'

interface TupleInspectorProps {
  tuple: Tuple | null
  page: HeapPage | null
}

export default function TupleInspector({ tuple, page }: TupleInspectorProps) {
  const headerAnalysis = useMemo(() => {
    if (!tuple) return null
    
    return {
      hasNulls: (tuple.header.tInfomask & 0x0001) !== 0,
      hasVarlena: (tuple.header.tInfomask & 0x0002) !== 0,
      isAlternate: (tuple.header.tInfomask & 0x0004) !== 0,
      isExpanded: (tuple.header.tInfomask & 0x0008) !== 0,
      isCompressed: (tuple.header.tInfomask & 0x0010) !== 0,
      isLocked: (tuple.header.tInfomask & 0x0020) !== 0,
      isUpdated: (tuple.header.tInfomask & 0x0040) !== 0,
      numAttributes: tuple.header.tInfomask2 & 0x07FF,
      transactionLevel: (tuple.header.tInfomask2 >> 11) & 0x03
    }
  }, [tuple])

  const visibilityInfo = useMemo(() => {
    if (!tuple) return null
    
    return {
      isVisible: tuple.isVisible,
      isDead: tuple.isDead,
      xmin: tuple.header.tXmin,
      xmax: tuple.header.tXmax,
      cid: tuple.header.tCid,
      status: tuple.isVisible ? 'VISIBLE' : 'DEAD',
      lifecycle: getTupleLifecycle(tuple)
    }
  }, [tuple])

  if (!tuple || !page) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-lg font-medium">No tuple selected</div>
        <div className="text-sm">Select a tuple from the page layout to inspect</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Tuple Inspector
        </h3>
        <div className="text-sm text-gray-600">
          Page {page.header.pageNumber} | Offset {tuple.linePointer.offset} | 
          Size {tuple.data.byteLength} bytes
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Tuple Header</h4>
          <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>Xmin:</div>
              <div className="font-bold">{tuple.header.tXmin}</div>
              <div>Xmax:</div>
              <div className="font-bold">{tuple.header.tXmax}</div>
              <div>Command ID:</div>
              <div className="font-bold">{tuple.header.tCid}</div>
              <div>Infomask:</div>
              <div className="font-bold">0x{tuple.header.tInfomask.toString(16)}</div>
              <div>Infomask2:</div>
              <div className="font-bold">0x{tuple.header.tInfomask2.toString(16)}</div>
              <div>Header Size:</div>
              <div className="font-bold">{tuple.header.tHoff} bytes</div>
              <div>Data Size:</div>
              <div className="font-bold">{tuple.data.byteLength} bytes</div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Visibility Information</h4>
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-bold ${
                  visibilityInfo?.isVisible 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {visibilityInfo?.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Created by TX:</span>
                <span className="font-mono">{visibilityInfo?.xmin}</span>
              </div>
              <div className="flex justify-between">
                <span>Deleted by TX:</span>
                <span className="font-mono">
                  {visibilityInfo?.xmax === 0 ? 'N/A' : visibilityInfo?.xmax}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Command ID:</span>
                <span className="font-mono">{visibilityInfo?.cid}</span>
              </div>
              <div className="flex justify-between">
                <span>Lifecycle:</span>
                <span className="font-medium">{visibilityInfo?.lifecycle}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Header Flags</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <FlagBadge 
              label="Has NULLs" 
              active={headerAnalysis?.hasNulls || false}
            />
            <FlagBadge 
              label="Varlena" 
              active={headerAnalysis?.hasVarlena || false}
            />
            <FlagBadge 
              label="Alternate" 
              active={headerAnalysis?.isAlternate || false}
            />
            <FlagBadge 
              label="Expanded" 
              active={headerAnalysis?.isExpanded || false}
            />
            <FlagBadge 
              label="Compressed" 
              active={headerAnalysis?.isCompressed || false}
            />
            <FlagBadge 
              label="Locked" 
              active={headerAnalysis?.isLocked || false}
            />
            <FlagBadge 
              label="Updated" 
              active={headerAnalysis?.isUpdated || false}
            />
            <div className="text-gray-600">
              <div className="font-medium">Attributes</div>
              <div>{headerAnalysis?.numAttributes}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">NULL Bitmap</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          {tuple.nullBitmap.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 mb-2">
                NULL bitmap shows which attributes are NULL:
              </div>
              <div className="flex flex-wrap gap-2">
                {tuple.nullBitmap.map((isNull, index) => (
                  <div
                    key={index}
                    className={`px-3 py-1 rounded-full text-xs font-mono ${
                      isNull 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    Attr {index}: {isNull ? 'NULL' : 'NOT NULL'}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No NULL bitmap (all attributes NOT NULL)</div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Tuple Data</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              Raw tuple data ({tuple.data.byteLength} bytes):
            </div>
            
            <div className="bg-white border border-gray-200 rounded p-3 font-mono text-xs overflow-x-auto">
              <div className="max-h-32 overflow-y-auto">
                {formatHexDump(new Uint8Array(tuple.data).buffer)}
              </div>
            </div>

            {Object.keys(tuple.values).length > 0 && (
              <div>
                <div className="text-sm text-gray-600 mb-2">Decoded Values:</div>
                <div className="bg-white border border-gray-200 rounded divide-y divide-gray-200">
                  {Object.keys(tuple.values).map((key: string) => (
                    <div key={key} className="px-3 py-2 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">{key}:</span>
                      <span className="text-sm font-mono text-gray-700">
                        {tuple.values[key] === null ? (
                          <span className="text-red-600">NULL</span>
                        ) : (
                          String(tuple.values[key])
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Line Pointer</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Offset:</div>
              <div className="font-mono font-bold">{tuple.linePointer.offset}</div>
            </div>
            <div>
              <div className="text-gray-600">Length:</div>
              <div className="font-mono font-bold">{tuple.linePointer.length}</div>
            </div>
            <div>
              <div className="text-gray-600">Flags:</div>
              <div className="font-mono font-bold">0x{tuple.linePointer.flags.toString(16)}</div>
            </div>
            <div>
              <div className="text-gray-600">Total Size:</div>
              <div className="font-mono font-bold">
                {tuple.linePointer.length + tuple.header.tHoff} bytes
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FlagBadgeProps {
  label: string
  active: boolean
}

function FlagBadge({ label, active }: FlagBadgeProps) {
  return (
    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
      active 
        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
        : 'bg-gray-100 text-gray-500 border border-gray-200'
    }`}>
      {label}
    </div>
  )
}

function getTupleLifecycle(tuple: Tuple): string {
  if (tuple.isVisible && tuple.header.tXmax === 0) {
    return 'LIVE - Visible and not deleted'
  } else if (!tuple.isVisible && tuple.header.tXmax > 0) {
    return 'DEAD - Deleted by transaction'
  } else if (!tuple.isVisible && tuple.header.tXmax === 0) {
    return 'INVISIBLE - Not visible to current transaction'
  } else {
    return 'UNKNOWN - Ambiguous state'
  }
}

function formatHexDump(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data)
  const lines = []
  
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16)
    const hex = Array.from(chunk)
      .map(b => ('0' + b.toString(16)).slice(-2))
      .join(' ')
    const ascii = Array.from(chunk)
      .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
      .join('')
    
    lines.push(
      ('0000' + i.toString(16)).slice(-4) + '  ' + hex.padEnd(47) + ' |' + ascii + '|'
    )
  }
  
  return lines.join('\n')
}
