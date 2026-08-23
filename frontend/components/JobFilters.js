"use client";

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export default function JobFilters({
  q,
  setQ,
  source,
  setSource,
  tag,
  setTag,
  availableSources,
  availableTags,
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 mb-8 text-sm">
      {/* Search Bar - 50% */}
      <label className="relative w-full lg:w-1/2">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate">
          <SearchIcon />
        </span>

        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search roles — e.g. Frontend Developer"
          className="w-full border border-line rounded-full pl-10 pr-9 py-2 bg-white text-ink placeholder:text-slate/70 focus:outline-none focus:border-violet transition-colors"
        />

        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-violet transition-colors text-xs"
          >
            ✕
          </button>
        )}
      </label>

      {/* Two Dropdowns - 50% */}
      <div className="w-full lg:w-1/2 flex gap-3">
        {/* Platform */}
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-1/2 border border-line rounded-full pl-4 pr-8 py-2 bg-white text-ink focus:outline-none focus:border-violet transition-colors"
        >
          <option value="">All platforms</option>

          {(availableSources || []).map((s) => (
            <option key={s} value={s}>
              {s
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>

        {/* Skills */}
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="w-1/2 border border-line rounded-full pl-4 pr-8 py-2 bg-white text-ink focus:outline-none focus:border-violet transition-colors"
        >
          <option value="">All skills</option>

          {(availableTags || []).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Clear Button */}
      {(q || source || tag) && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setSource("");
            setTag("");
          }}
          className="text-slate hover:text-violet transition-colors text-sm self-center whitespace-nowrap"
        >
          Clear ✕
        </button>
      )}
    </div>
  );
}