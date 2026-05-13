export default function Loading() {
  return (
    <div className="p-5 space-y-5 animate-fade-in">
      {/* Header shimmer */}
      <div className="flex items-center justify-between pt-3">
        <div>
          <div className="h-5 w-32 shimmer rounded-lg mb-2" />
          <div className="h-3 w-20 shimmer rounded-md" />
        </div>
        <div className="w-10 h-10 shimmer rounded-xl" />
      </div>

      {/* Hero card shimmer */}
      <div className="h-36 shimmer rounded-2xl" />

      {/* Stats shimmer */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 shimmer rounded-2xl" />
        <div className="h-24 shimmer rounded-2xl" />
      </div>

      {/* AI Digest shimmer */}
      <div className="h-28 shimmer rounded-2xl" />

      {/* Transaction list shimmer */}
      <div className="space-y-2.5">
        <div className="h-4 w-28 shimmer rounded-md" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 shimmer rounded-xl" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    </div>
  );
}
