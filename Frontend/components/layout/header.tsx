"use client"

import { Bell, ChevronDown, Search, Menu, LogOut, User, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/lib/context/auth-context"
import { useRole } from "@/hooks/use-role"
import { useRouter } from "next/navigation"

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { user, logout } = useAuth()
  const { role } = useRole()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        const sidebar = document.querySelector('aside')
        if (sidebar) {
          const isOpen = !sidebar.classList.contains('-translate-x-full')
          setIsMobileMenuOpen(isOpen)
        }
      } else {
        setIsMobileMenuOpen(true)
      }
    }

    // Initial check
    handleResize()

    // Add resize listener
    window.addEventListener('resize', handleResize)

    // Add mutation observer to watch for sidebar changes
    const observer = new MutationObserver(handleResize)
    const sidebar = document.querySelector('aside')
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] })
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
    }
  }, [])

  return (
    <header className={cn(
      "bg-white py-4 px-6 flex items-center justify-between shadow-sm rounded-lg ml-0 mr-4 my-4 border-2",
      "transition-all duration-300",
      "md:translate-x-0",
      // Hide header when sidebar is hidden on mobile
      // isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      isMobileMenuOpen ? "ml-0" : "ml-8"
    )}>
      {/* Search - Always visible */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-500 h-4 w-4" />
        <Input type="text" placeholder="Search..." className="pl-10 py-2 w-full bg-white border-gray-200 rounded-xl" />
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-8 w-8 text-white bg-emerald-500 rounded-xl p-1" />
          <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full"></span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                <span className="text-sm font-medium">
                  {user ? getUserInitials(user.name) : 'U'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium">{user?.name || 'User'}</span>
                <ChevronDown className="h-4 w-4 ml-1 text-gray-500" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{role?.replace('_', ' ')}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="flex items-center text-red-600">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile View */}
      <div className="flex md:hidden items-center space-x-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-6 w-6 text-white bg-emerald-500 rounded-xl p-1" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full"></span>
        </Button>
        
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <div className="flex flex-col space-y-4 mt-4">
              <div className="flex items-center space-x-2 p-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                  <span className="text-sm font-medium">
                    {user ? getUserInitials(user.name) : 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 capitalize">{role?.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <Link href="/profile" className="flex items-center px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Link>
                <Link href="/settings" className="flex items-center px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 rounded-md text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
