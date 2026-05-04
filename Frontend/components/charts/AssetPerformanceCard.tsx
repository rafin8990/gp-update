"use client"

import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

interface AssetPerformanceCardProps {
  value: number
  status: string
  statusIcon: string
  chart: {
    labels: string[]
    data: number[]
  }
}

export function AssetPerformanceCard({ value, status, statusIcon, chart }: AssetPerformanceCardProps) {
  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Asset Performance</h3>
            <div className="text-gray-500 text-xs">LAST YEAR</div>
          </div>
          <div className="w-12 h-12 relative">
            <Image 
              src={statusIcon} 
              alt={status} 
              fill
              className="object-contain"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
          <div className="text-sm text-emerald-600 font-medium">{status}</div>
        </div>

        {/* Simple chart representation */}
        <div className="flex items-end space-x-1 h-16">
          {chart.data.map((value, index) => {
            const height = (value / Math.max(...chart.data)) * 100
            return (
              <div
                key={index}
                className="flex-1 bg-emerald-200 rounded-t"
                style={{ height: `${Math.max(height, 10)}%` }}
              />
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
