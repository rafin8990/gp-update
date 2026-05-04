import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from '@/components/providers'
import { AuthProvider } from "@/lib/context/auth-context"
import { PluginProvider } from "@/lib/context/plugin-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AssetIQ | Asset Management System",
  description: "Manage your assets efficiently with AssetIQ",
  generator: 'mave',
  icons: {
    icon: [
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon.ico', sizes: 'any' }
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      {
        rel: 'android-chrome-192x192',
        url: '/favicon/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        rel: 'android-chrome-512x512',
        url: '/favicon/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  },
  manifest: '/favicon/site.webmanifest'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <PluginProvider>
            <Providers>
              {children}
            </Providers>
          </PluginProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}


import './globals.css'