'use client'

import { DrawerProvider } from '@/lib/context/drawer-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DrawerProvider>
      {children}
    </DrawerProvider>
  )
}