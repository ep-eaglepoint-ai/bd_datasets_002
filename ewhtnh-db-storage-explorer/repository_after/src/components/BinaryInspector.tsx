'use client'

import { useMemo } from 'react'
import { StorageSnapshot, HeapPage, Tuple } from '@/types/storage'

interface BinaryInspectorProps {
  snapshot: StorageSnapshot
  selectedPage?: HeapPage
  selectedTuple?: Tuple
}

export default function BinaryInspector({ snapshot, selectedPage, selectedTuple }: BinaryInspectorProps) {
  const binaryData = useMemo(() => {
    if (selectedTuple) {
      return {
        type: 'tuple',
        data: selectedTuple.data,
        offset: 0,
        size: selectedTuple.data.length
      }
    }
    
    if (selectedPage) {
      const pageData = new Uint8Array(8192)
      
      const headerBytes = new TextEncoder().encode(JSON.stringify(selectedPage.header))
      pageData.set(headerBytes.slice(0, 24), 0)
      
      selectedPage.linePointers.forEach((lp, index) => {
        const offset = 24 + index * 4
        pageData[offset] = lp.offset & 0xff
        pageData[offset + 1] = (lp.offset >> 8) & 0xff
        pageData[offset + 2] = (lp.offset >> 16) & 0xff
        pageData[offset + 3] = (lp.offset >> 24) & 0xff
      })
      
      selectedPage.tuples.forEach(tuple => {
        if ((tuple.offset || 0) > 0) {
          pageData.set(tuple.data, tuple.offset || 0)
        }
      })
      
      return {
        type: 'page',
        data: pageData,
        offset: 0,
        size: 8192
      }
    }
    
    return null
  }, [selectedPage, selectedTuple])

  const formatHexByte = (byte: number) => {
    return ('0' + byte.toString(16).toUpperCase()).slice(-2)
  }

  const formatBinaryByte = (byte: number) => {
    return ('00000000' + byte.toString(2)).slice(-8)
  }

  const formatAsciiChar = (byte: number) => {
    return (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.'
  }

  const getByteInterpretation = (byte: number, offset: number) => {
    const interpretations = []
    
    if (byte === 0) interpretations.push('NULL')
    if (byte === 1) interpretations.push('TRUE')
    if (byte === 255) interpretations.push('-1 (signed)')
    
    if (byte >= 48 && byte <= 57) {
      interpretations.push(`'${String.fromCharCode(byte)}' (digit)`)
    }
    
    if (byte >= 65 && byte <= 90) {
      interpretations.push(`'${String.fromCharCode(byte)}' (uppercase)`)
    }
    
    if (byte >= 97 && byte <= 122) {
      interpretations.push(`'${String.fromCharCode(byte)}' (lowercase)`)
    }
    
    if (offset % 4 === 0 && offset + 3 < (binaryData?.data.length || 0)) {
      const view = new DataView(binaryData!.data.buffer, offset, 4)
      interpretations.push(`i32: ${view.getInt32(0, true)}`)
      interpretations.push(`u32: ${view.getUint32(0, true)}`)
    }
    
    if (offset % 8 === 0 && offset + 7 < (binaryData?.data.length || 0)) {
      const view = new DataView(binaryData!.data.buffer, offset, 8)
      interpretations.push(`i64: ${view.getInt32(0, true)}`)
      interpretations.push(`f64: ${view.getFloat64(0, true)}`)
    }
    
    return interpretations
  }

  if (!binaryData) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-lg font-medium">No binary data selected</div>
        <div className="text-sm">Select a page or tuple to inspect binary data</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Binary Inspector
        </h3>
        <div className="text-sm text-gray-600">
          {binaryData.type === 'tuple' ? 'Tuple Data' : 'Page Data'} | 
          Size: {binaryData.size} bytes
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 mr-1"></div>
            <span>Hex View</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-green-300 mr-1"></div>
            <span>Binary View</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 mr-1"></div>
            <span>ASCII View</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Offset</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hex</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Binary</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ASCII</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Interpretation</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: Math.min(binaryData.size, 256) }).map((_, index) => {
                const offset = index
                const byte = binaryData.data[offset]
                const interpretations = getByteInterpretation(byte, offset)
                
                return (
                  <tr key={offset} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-mono">
                      {('0000' + offset.toString(16)).slice(-4).toUpperCase()}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono bg-blue-50">
                      0x{formatHexByte(byte)}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono bg-green-50 text-xs">
                      {formatBinaryByte(byte)}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono bg-gray-50">
                      {formatAsciiChar(byte)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <div className="space-y-1">
                        {interpretations.map((interp, i) => (
                          <div key={i} className="text-gray-600">
                            {interp}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {binaryData.size > 256 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Showing first 256 bytes of {binaryData.size} total bytes
        </div>
      )}

      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Data Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Byte Statistics</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Zero bytes:</span>
                <span className="font-mono">
                  {Array.from(binaryData.data).filter(b => b === 0).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Non-zero bytes:</span>
                <span className="font-mono">
                  {Array.from(binaryData.data).filter(b => b !== 0).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Printable ASCII:</span>
                <span className="font-mono">
                  {Array.from(binaryData.data).filter(b => b >= 32 && b <= 126).length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Pattern Detection</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Repeating patterns:</span>
                <span className="font-mono">
                  {findRepeatingPatterns(binaryData.data).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Null sequences:</span>
                <span className="font-mono">
                  {findNullSequences(binaryData.data).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Text segments:</span>
                <span className="font-mono">
                  {findTextSegments(binaryData.data).length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Structure Info</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Data type:</span>
                <span className="font-mono capitalize">{binaryData.type}</span>
              </div>
              <div className="flex justify-between">
                <span>Endianness:</span>
                <span className="font-mono">Little Endian</span>
              </div>
              <div className="flex justify-between">
                <span>Alignment:</span>
                <span className="font-mono">8-byte</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function findRepeatingPatterns(data: Uint8Array): Array<{pattern: string, count: number, offsets: number[]}> {
  const patterns = new Map<string, {count: number, offsets: number[]}>()
  
  for (let i = 0; i < data.length - 3; i++) {
    const pattern = Array.from(data.slice(i, i + 4))
      .map((b: number) => ('00' + b.toString(16)).slice(-2))
      .join('')
    
    if (!patterns.has(pattern)) {
      patterns.set(pattern, {count: 0, offsets: []})
    }
    
    const info = patterns.get(pattern)!
    info.count++
    info.offsets.push(i)
  }
  
  return Array.from(patterns.entries())
    .filter(([_, info]) => info.count > 1)
    .map(([pattern, info]) => ({pattern, count: info.count, offsets: info.offsets}))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function findNullSequences(data: Uint8Array): Array<{offset: number, length: number}> {
  const sequences = []
  let currentStart = -1
  let currentLength = 0
  
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0) {
      if (currentStart === -1) {
        currentStart = i
        currentLength = 1
      } else {
        currentLength++
      }
    } else {
      if (currentStart !== -1 && currentLength > 1) {
        sequences.push({offset: currentStart, length: currentLength})
      }
      currentStart = -1
      currentLength = 0
    }
  }
  
  if (currentStart !== -1 && currentLength > 1) {
    sequences.push({offset: currentStart, length: currentLength})
  }
  
  return sequences
}

function findTextSegments(data: Uint8Array): Array<{offset: number, text: string}> {
  const segments = []
  let currentStart = -1
  let currentText = ''
  
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]
    if (byte >= 32 && byte <= 126) {
      if (currentStart === -1) {
        currentStart = i
        currentText = String.fromCharCode(byte)
      } else {
        currentText += String.fromCharCode(byte)
      }
    } else {
      if (currentStart !== -1 && currentText.length > 3) {
        segments.push({offset: currentStart, text: currentText})
      }
      currentStart = -1
      currentText = ''
    }
  }
  
  if (currentStart !== -1 && currentText.length > 3) {
    segments.push({offset: currentStart, text: currentText})
  }
  
  return segments
}
