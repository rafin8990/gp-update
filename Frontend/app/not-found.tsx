"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <img
            src="/asset-iq-logo.svg"
            alt="AssetIQ Logo"
            className="h-12 w-auto"
          />
        </div>

        {/* 404 Content */}
        <div className="space-y-4">
          <h1 className="text-9xl font-bold text-emerald-600">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900">Page Not Found</h2>
          <p className="text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            Go Back
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-sm text-gray-500">
          <p>If you believe this is an error, please contact support.</p>
        </div>
      </div>
    </div>
  )
} 