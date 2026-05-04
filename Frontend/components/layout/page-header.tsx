import { Breadcrumb } from "@/components/breadcrumb"

interface PageHeaderProps {
  title: string
  breadcrumbItems?: { label: string; href: string }[]
  actions?: React.ReactNode
}

export function PageHeader({ title, breadcrumbItems, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-emerald-500">{title}</h1>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {breadcrumbItems && <Breadcrumb items={breadcrumbItems} />}
    </div>
  )
}
