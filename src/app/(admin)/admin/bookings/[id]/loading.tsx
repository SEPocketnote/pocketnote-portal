export default function Loading() {
  return (
    <div className="max-w-3xl animate-pulse space-y-4">
      <div className="h-4 w-32 bg-muted rounded" />
      <div className="h-8 w-64 bg-muted rounded" />
      <div className="h-40 bg-white rounded-2xl shadow-card" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-24 bg-white rounded-2xl shadow-card" />
        <div className="h-24 bg-white rounded-2xl shadow-card" />
      </div>
      <div className="h-64 bg-white rounded-2xl shadow-card" />
    </div>
  )
}
