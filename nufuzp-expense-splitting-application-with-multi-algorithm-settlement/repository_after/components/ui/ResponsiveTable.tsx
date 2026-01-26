'use client'

import { ReactNode } from 'react'

interface ResponsiveTableProps {
  headers: string[]
  rows: ReactNode[][]
  mobileCardRender?: (row: ReactNode[], index: number) => ReactNode
}

export default function ResponsiveTable({
  headers,
  rows,
  mobileCardRender,
}: ResponsiveTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-black font-medium">
        <p>No data available</p>
      </div>
    )
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-black"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-4">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="bg-white rounded-lg shadow p-4 border border-gray-200"
          >
            {mobileCardRender ? (
              mobileCardRender(row, rowIndex)
            ) : (
              <div className="space-y-2">
                {headers.map((header, headerIndex) => (
                  <div key={headerIndex} className="flex justify-between">
                    <span className="text-sm font-semibold text-black">
                      {header}:
                    </span>
                    <span className="text-sm text-black">{row[headerIndex]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
