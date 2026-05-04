"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface DrawerContextType {
  isAnyDrawerOpen: boolean
  setIsAnyDrawerOpen: (open: boolean) => void
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined)

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [isAnyDrawerOpen, setIsAnyDrawerOpen] = useState(false)

  return (
    <DrawerContext.Provider value={{ isAnyDrawerOpen, setIsAnyDrawerOpen }}>
      {children}
    </DrawerContext.Provider>
  )
}

export function useDrawer() {
  const context = useContext(DrawerContext)
  if (context === undefined) {
    throw new Error('useDrawer must be used within a DrawerProvider')
  }
  return context
}