"use client"

import { Card, CardContent } from "@/components/ui/card"

interface AreaChartProps {
  labels: string[]
  data: number[]
  activeTab: string
}

export function AreaChart({ labels, data, activeTab }: AreaChartProps) {
  const maxValue = Math.max(...data)
  const minValue = Math.min(...data)
  const range = maxValue - minValue

  return (
    <div className="w-full h-full">
      <div className="flex items-end justify-between h-48 space-x-1">
        {data.map((value, index) => {
          const height = range > 0 ? ((value - minValue) / range) * 100 : 0
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-emerald-500 rounded-t"
                style={{ height: `${Math.max(height, 5)}%` }}
              />
              <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                {labels[index]}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">Active Tab: {activeTab}</p>
      </div>
    </div>
  )
}
