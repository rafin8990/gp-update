"use client"

import { Card, CardContent } from "@/components/ui/card"

interface ServiceScheduleStatusCardProps {
  labels: string[]
  data: number[]
}

export function ServiceScheduleStatusCard({ labels, data }: ServiceScheduleStatusCardProps) {
  const maxValue = Math.max(...data)
  
  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Service Schedule Status</h3>
          <div className="text-gray-500 text-xs">LAST YEAR</div>
        </div>

        <div className="space-y-3">
          {labels.map((label, index) => {
            const percentage = maxValue > 0 ? (data[index] / maxValue) * 100 : 0
            return (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 truncate flex-1 mr-2">{label}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {data[index].toFixed(1)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
