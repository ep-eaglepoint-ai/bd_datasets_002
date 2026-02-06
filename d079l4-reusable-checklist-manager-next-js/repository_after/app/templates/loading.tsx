export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse"></div>
          <div className="h-4 w-64 bg-slate-200 rounded animate-pulse mt-2"></div>
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded animate-pulse"></div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-6 space-y-4">
            <div className="h-6 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 w-2/3 bg-slate-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
