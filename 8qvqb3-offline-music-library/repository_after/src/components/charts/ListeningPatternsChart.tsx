'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ListeningPattern } from '@/lib/services/analytics-service'
import { formatTimeOfDay } from '@/lib/utils/format'

interface ListeningPatternsChartProps {
  data: ListeningPattern[]
}

export function ListeningPatternsChart({ data }: ListeningPatternsChartProps) {
  const chartData = data.map(item => ({
    ...item,
    hourLabel: formatTimeOfDay(item.hour)
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="hourLabel" 
            stroke="#9CA3AF"
            fontSize={12}
            interval={1}
          />
          <YAxis stroke="#9CA3AF" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
            formatter={(value: number) => [`${value} plays`, 'Play Count']}
            labelFormatter={(label: string) => `Time: ${label}`}
          />
          <Bar dataKey="playCount" fill="#3B82F6" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}