"use client"
import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Box,
  PenToolIcon as Tool,
  Users,
  FileText,
  Settings,
  ShieldCheck,
  Building2,
  Tag,
  ChevronDown,
  PanelRightClose,
  PanelLeftClose,
  ForkKnife,
  ClipboardList,
  ShoppingCart,
  Package,
  Receipt,
  Warehouse,
  Scale,
  ChefHat,
  Truck,
  ClipboardCheck,
  ArrowLeftRight,
  UserCircle,
  BarChart3,
  ChevronRight,
  Cable,
  Shirt,
  Store,
  Building,
  Signal,
  Heart,
  Factory,
  GraduationCap,
  HardHat,
  Zap,
  ShoppingBag,
  Hotel,
  MapPin,
  Hash,
  ArrowRight,
  ReceiptText
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import menuData from "./sidebarmenu.json"
import { Button } from "../ui/button"
import { usePlugins } from "@/lib/context/plugin-context"

interface SubMenuItem {
  href?: string
  label: string
  submenu?: SubMenuItem[]
  icon?: string
}

interface MenuItem {
  href: string
  icon: string
  label: string
  submenu?: SubMenuItem[]
}

// Icon mapping object
const iconMap: { [key: string]: any } = {
  LayoutDashboard,
  Box,
  Tool,
  Users,
  FileText,
  Settings,
  ShieldCheck,
  Building2,
  Tag,
  ForkKnife,
  ClipboardList,
  ShoppingCart,
  Package,
  Receipt,
  Warehouse,
  Scale,
  ChefHat,
  Truck,
  ClipboardCheck,
  ArrowLeftRight,
  UserCircle,
  BarChart3,
  Cable,
  Shirt,
  Store,
  Building,
  Signal,
  Heart,
  Factory,
  GraduationCap,
  HardHat,
  Zap,
  ShoppingBag,
  Hotel,
  MapPin,
  Hash,
  ArrowRight,
  ReceiptText
}

export function Sidebar({ activePage }: { activePage?: string }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null)
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const { isPluginInstalled } = usePlugins()

  useEffect(() => {
    setMounted(true)
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState) {
      setIsCollapsed(savedState === 'true')
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('sidebarCollapsed', isCollapsed.toString())
    }
  }, [isCollapsed, mounted])

  useEffect(() => {
    const newOpenMenus: Record<string, boolean> = {}
    
    const checkSubmenu = (items: MenuItem[]) => {
      items.forEach(item => {
        if (item.submenu) {
          const isActive = item.submenu.some(subItem => {
            // Check if any nested item is active (including deeper levels)
            return checkNestedActive(subItem)
          })
          if (isActive) {
            newOpenMenus[item.href] = true
          }
          // Check nested submenus
          item.submenu.forEach(subItem => {
            if (subItem.submenu) {
              const isNestedActive = subItem.submenu.some(nestedItem =>
                checkNestedActive(nestedItem)
              )
              if (isNestedActive) {
                newOpenMenus[subItem.label] = true
              }
            }
          })
        }
      })
    }
    
    // Helper function to check if any nested item is active
    const checkNestedActive = (item: SubMenuItem): boolean => {
      if (item.href) {
        return pathname === item.href || pathname.startsWith(item.href + '/')
      }
      if (item.submenu) {
        return item.submenu.some(subItem => checkNestedActive(subItem))
      }
      return false
    }
    
    checkSubmenu(menuData.mainMenu)
    setOpenMenus(newOpenMenus)
  }, [pathname])

  // Add effect to handle mobile menu state
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(false)
    }
  }, [pathname])

  // Add cleanup for timeout
  useEffect(() => {
    return () => {
      if (closeTimeout) {
        clearTimeout(closeTimeout)
      }
    }
  }, [closeTimeout])

  const handleMouseEnter = (href: string) => {
    if (closeTimeout) {
      clearTimeout(closeTimeout)
    }
    setHoveredMenu(href)
  }

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setHoveredMenu(null)
    }, 500) // 1 second delay
    setCloseTimeout(timeout)
  }

  const toggleSubmenu = (href: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [href]: !prev[href]
    }))
  }

  // Filter menu items based on plugin installation status
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.map(item => {
      if (item.href === '/plugins') {
        // For plugins menu, filter submenu items based on installation status
        if (item.submenu) {
          const filteredSubmenu = item.submenu.filter(subItem => {
            // Always show marketplace
            if (subItem.href === '/plugins') {
              return true
            }
            // Check plugin installation status
            if (subItem.href === '/restaurant') {
              return isPluginInstalled('restaurant')
            }
            if (subItem.href === '/garments') {
              return isPluginInstalled('garments')
            }
            if (subItem.href === '/bank') {
              return isPluginInstalled('bank')
            }
            if (subItem.href === '/telco') {
              return isPluginInstalled('telco')
            }
            if (subItem.href === '/healthcare') {
              return isPluginInstalled('healthcare')
            }
            if (subItem.href === '/manufacturing') {
              return isPluginInstalled('manufacturing')
            }
            if (subItem.href === '/education') {
              return isPluginInstalled('education')
            }
            if (subItem.href === '/logistics') {
              return isPluginInstalled('logistics')
            }
            if (subItem.href === '/construction') {
              return isPluginInstalled('construction')
            }
            if (subItem.href === '/energy') {
              return isPluginInstalled('energy')
            }
            if (subItem.href === '/retail') {
              return isPluginInstalled('retail')
            }
            if (subItem.href === '/hospitality') {
              return isPluginInstalled('hospitality')
            }
            return true // Show other items
          })
          return { ...item, submenu: filteredSubmenu }
        }
      }
      return item
    })
  }

  const renderSubmenuItem = (item: SubMenuItem, level: number = 0, parentKey?: string) => {
    const isGroup = !item.href && item.submenu
    const hasSubmenu = !!item.submenu
    const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false
    const isOpen = openMenus[item.label]
    const key = parentKey ? `${parentKey}-${item.label}` : item.label
    const Icon = item.icon ? iconMap[item.icon] : null

    if (isGroup || hasSubmenu) {
      return (
        <div key={key} className="space-y-0">
          <Button
            onClick={() => toggleSubmenu(item.label)}
            variant="ghost"
            className={cn(
              "flex items-center w-full px-4 py-2 text-sm font-medium rounded-none",
              "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
              isOpen && "text-gray-900 bg-gray-50"
            )}
          >
            {Icon && <Icon className="h-4 w-4 mr-2" />}
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen ? "rotate-90" : ""
              )}
            />
          </Button>
          {isOpen && (
            <div className="pl-4 space-y-0 max-h-[40vh] overflow-y-auto">
              {item.submenu?.map(subItem => renderSubmenuItem(subItem, level + 1, key))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={key}
        href={item.href || '#'}
        className={cn(
          "flex items-center px-4 py-2 text-sm rounded-none",
          isActive
            ? "bg-emerald-50 text-emerald-600"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
          level > 0 && "pl-8"
        )}
      >
        {Icon && <Icon className="h-4 w-4 mr-2" />}
        {item.label}
      </Link>
    )
  }

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasSubmenu = !!item.submenu
    
    // Check if any nested item is active (including deeper levels)
    const checkNestedActive = (subItem: SubMenuItem): boolean => {
      if (subItem.href) {
        return pathname === subItem.href || pathname.startsWith(subItem.href + '/')
      }
      if (subItem.submenu) {
        return subItem.submenu.some(nestedItem => checkNestedActive(nestedItem))
      }
      return false
    }
    
    const isSubmenuItemActive = item.submenu?.some(sub => checkNestedActive(sub))
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/') || isSubmenuItemActive
    const isOpen = openMenus[item.href]
    const isHovered = hoveredMenu === item.href
    const Icon = iconMap[item.icon]

    return (
      <div
        key={item.href}
        className="relative group"
        onMouseEnter={() => hasSubmenu && setHoveredMenu(item.href)}
        onMouseLeave={() => setHoveredMenu(null)}
      >
        <Link
          href={item.href}
          onClick={(e) => {
            // Always prevent default for items with submenus to open dropdown instead
            if (hasSubmenu) {
              e.preventDefault()
              toggleSubmenu(item.href)
            }
          }}
          className={cn(
            "flex items-center px-4 py-3 rounded-md w-full",
            isActive
              ? "bg-gray-50 text-gray-900 border-l-4 border-gray-300"
              : "text-gray-600 hover:bg-gray-50",
            level > 0 && "pl-8"
          )}
        >
          {Icon && <Icon className={cn(
            "h-5 w-5",
            isActive ? "text-gray-900" : "text-gray-400"
          )} />}
          {!isCollapsed && (
            <>
              <span className={cn("ml-3", isActive ? "font-medium" : "")}>{item.label}</span>
              {hasSubmenu && (
                <ChevronRight
                  className={cn(
                    "ml-auto h-4 w-4 transition-transform duration-200",
                    isOpen ? "rotate-90" : ""
                  )}
                />
              )}
            </>
          )}
        </Link>
        {hasSubmenu && item.submenu && (
          <div
            className={cn(
              "transition-all duration-200 ease-in-out",
              isCollapsed
                ? "fixed bg-white shadow-lg rounded-md py-2 min-w-[200px] z-[99999] -mt-10"
                : "relative bg-white shadow-lg rounded-md py-0 min-w-[200px] mt-1",
              isCollapsed && !isHovered && "opacity-0 pointer-events-none",
              isCollapsed && isHovered && "opacity-100",
              !isCollapsed && !isOpen && "max-h-0 opacity-0 overflow-hidden",
              !isCollapsed && isOpen && "max-h-[500px] opacity-100"
            )}
            style={{
              transform: isCollapsed ? 'translateX(80px)' : 'translateX(0)',
              transformOrigin: 'left top',
              zIndex: 99999
            }}
          >
            {item.submenu.map((subItem) => renderSubmenuItem(subItem, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (!mounted) {
    return null
  }

  // Filter menu items based on plugin installation
  const filteredMenuItems = filterMenuItems(menuData.mainMenu)

  return (
    <>
      <aside className={cn(
        "bg-white flex flex-col border-r border-gray-200 transition-all duration-300 ease-in-out m-4 border-2 rounded-lg shadow-sm relative",
        isCollapsed ? "w-20" : "w-64",
        "h-[calc(100vh-2rem)]",
        "fixed md:relative",
        "top-0 left-0 z-[9999]",
        "transform transition-all duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        "md:w-auto",
        isMobileMenuOpen && "w-[280px]"
      )}>
        <div className="p-4 flex items-center justify-center cursor-pointer"
        onClick={() => router.push('/dashboard')}
        >
          {isCollapsed ? (
            <Image src="/logo.svg" alt="AssetIQ Logo" width={40} height={40} priority />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <Image src="/asset-iq-logo.svg" alt="AssetIQ Logo" width={120} height={40} priority />
              <p className="text-xs text-gray-500 mt-1">Asset Management System</p>
              
            </div>
          )}
        </div>

        <Button
          onClick={() => {
            if (window.innerWidth < 768) {
              setIsMobileMenuOpen(!isMobileMenuOpen)
              if (!isMobileMenuOpen) {
                setIsCollapsed(false)
              }
            } else {
              setIsCollapsed(!isCollapsed)
            }
          }}
          className={cn(
            "absolute text-gray-600 bg-white rounded-md border border-gray-200 shadow-sm hover:bg-gray-50",
            "top-4 -right-8 p-2"
          )}
        >
          {window.innerWidth < 768 ? (
            isMobileMenuOpen ? <PanelLeftClose size={24} /> : <PanelRightClose size={24} />
          ) : (
            isCollapsed ? <PanelRightClose size={24} /> : <PanelLeftClose size={24} />
          )}
        </Button>

        <nav className={cn(
          "flex-1 px-4 py-6 space-y-1 overflow-y-auto",
          "scrollbar-hide",
          "hover:scrollbar-default",
          "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
          "relative"
        )}>
          {filteredMenuItems.map(item => renderMenuItem(item))}
        </nav>
        {!isCollapsed && (
          <Image
            src="/footerimg.png"
            alt="Team"
            width={300}
            height={150}
            className="object-contain pb-6"
          />
        )}
        <p className="text-center text-sm font-semibold text-green-500 pb-1 cursor-pointer"
        onClick={() => router.push('/changelog')}
        >v 1.2.74</p>
      </aside>
    </>
  )
}
