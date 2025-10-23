interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export function LoadingSkeleton({ lines = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`} role="status" aria-label="Loading content">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-300 rounded ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
      <span className="sr-only">Loading content...</span>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse" role="status" aria-label="Loading table">
      {/* Header row */}
      <div className="flex gap-4">
        <div className="h-6 bg-gray-400 rounded w-1/4" />
        <div className="h-6 bg-gray-400 rounded w-1/4" />
        <div className="h-6 bg-gray-400 rounded w-1/4" />
        <div className="h-6 bg-gray-400 rounded w-1/4" />
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 bg-gray-300 rounded w-1/4" />
          <div className="h-4 bg-gray-300 rounded w-1/4" />
          <div className="h-4 bg-gray-300 rounded w-1/4" />
          <div className="h-4 bg-gray-300 rounded w-1/4" />
        </div>
      ))}
      <span className="sr-only">Loading table...</span>
    </div>
  );
}
