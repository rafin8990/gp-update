"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Plugin {
  id: string
  name: string
  description: string
  icon: string
  version: string
  category: string
  features: string[]
  isInstalled: boolean
}

interface PluginResponse {
  success: boolean
  data: {
    available: Plugin[]
    installed: string[]
  }
}

interface PluginContextType {
  plugins: Plugin[]
  installedPlugins: string[]
  loading: boolean
  error: string | null
  isPluginInstalled: (pluginId: string) => boolean
  refreshPlugins: () => void
  installPlugin: (pluginId: string) => Promise<boolean>
  uninstallPlugin: (pluginId: string) => Promise<boolean>
}

const PluginContext = createContext<PluginContextType | undefined>(undefined)

export function PluginProvider({ children }: { children: ReactNode }) {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [installedPlugins, setInstalledPlugins] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlugins = async () => {
    try {
      setLoading(true)
      setError(null)
      // API functionality removed - using mock data
      const mockPlugins: Plugin[] = [
        {
          id: 'analytics',
          name: 'Analytics Dashboard',
          description: 'Advanced analytics and reporting',
          icon: '📊',
          version: '1.0.0',
          category: 'Analytics',
          features: ['Reports', 'Charts', 'Export'],
          isInstalled: false
        }
      ]
      setPlugins(mockPlugins)
      setInstalledPlugins([])
    } catch (error) {
      console.error('Error fetching plugins:', error)
      setError('Failed to load plugins')
    } finally {
      setLoading(false)
    }
  }

  const isPluginInstalled = (pluginId: string): boolean => {
    return installedPlugins.includes(pluginId)
  }

  const refreshPlugins = () => {
    fetchPlugins()
  }

  const installPlugin = async (pluginId: string): Promise<boolean> => {
    try {
      // API functionality removed - mock success
      setInstalledPlugins(prev => [...prev, pluginId])
      return true
    } catch (error) {
      console.error('Error installing plugin:', error)
      return false
    }
  }

  const uninstallPlugin = async (pluginId: string): Promise<boolean> => {
    try {
      // API functionality removed - mock success
      setInstalledPlugins(prev => prev.filter(id => id !== pluginId))
      return true
    } catch (error) {
      console.error('Error uninstalling plugin:', error)
      return false
    }
  }

  useEffect(() => {
    fetchPlugins()
  }, [])

  const value: PluginContextType = {
    plugins,
    installedPlugins,
    loading,
    error,
    isPluginInstalled,
    refreshPlugins,
    installPlugin,
    uninstallPlugin
  }

  return (
    <PluginContext.Provider value={value}>
      {children}
    </PluginContext.Provider>
  )
}

export function usePlugins() {
  const context = useContext(PluginContext)
  if (context === undefined) {
    throw new Error('usePlugins must be used within a PluginProvider')
  }
  return context
} 