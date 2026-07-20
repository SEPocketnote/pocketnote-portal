export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-28 bg-muted rounded-lg" />
      <div className="h-48 bg-muted rounded-lg" />
      <div className="h-48 bg-muted rounded-lg" />
    </div>
  )
}
