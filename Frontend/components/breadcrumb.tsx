import Link from "next/link"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  // Add default value and validation
  if (!items || !Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div className="text-sm">
      {items.map((item, index) => (
        <span key={index}>
          {index > 0 && <span className="mx-1 text-emerald-500">/</span>}
          {item.href ? (
            <Link href={item.href} className="text-emerald-500 hover:text-emerald-600">
              {item.label}
            </Link>
          ) : (
            <span className={index !== items.length - 1 ? "text-emerald-500" : "text-gray-500"}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}
