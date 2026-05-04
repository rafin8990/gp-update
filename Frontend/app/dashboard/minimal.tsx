"use client"

import { useState, useEffect } from "react"

export default function MinimalDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/v1/dashboard/data")
        const result = await response.json()
        
        if (result.success) {
          setData(result.data)
        } else {
          throw new Error('Backend API returned unsuccessful response')
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        // Set fallback data
        setData({
          metrics: [
            { name: "categories", value: 0, label: "Total Categories" },
            { name: "locations", value: 0, label: "Total Locations" },
            { name: "rfid", value: 0, label: "Available RFID" },
            { name: "vendors", value: 0, label: "Total Vendors" },
            { name: "items", value: 0, label: "Total Items" },
            { name: "requisitions", value: 0, label: "Available Requisitions" },
            { name: "purchase_orders", value: 0, label: "Total Purchase Orders" },
            { name: "pending_purchase_orders", value: 0, label: "Pending Purchase Orders" }
          ]
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div>Loading...</div>
  if (!data) return <div>No data</div>

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Minimal Dashboard</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {data.metrics?.map((metric: any) => (
          <div key={metric.name} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{metric.label}</h3>
            <p className="text-xl font-bold text-emerald-600">{metric.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Check In/Out Activity</h2>
        <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
          <p className="text-gray-500">Chart placeholder</p>
        </div>
      </div>
    </div>
  )
}
