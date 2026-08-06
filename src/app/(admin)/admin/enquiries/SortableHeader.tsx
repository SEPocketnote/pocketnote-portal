import Link from 'next/link'

export default function SortableHeader({
  column,
  label,
  currentSort,
  currentDir,
  baseParams,
}: {
  column: string
  label: string
  currentSort?: string
  currentDir?: string
  baseParams: Record<string, string>
}) {
  const isActive = currentSort === column
  const nextDir = isActive && currentDir === 'asc' ? 'desc' : 'asc'
  const params = { ...baseParams, sort: column, dir: nextDir }
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()

  return (
    <Link
      href={`/admin/enquiries?${qs}`}
      className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      <span className="text-xs">
        {isActive ? (currentDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </Link>
  )
}
