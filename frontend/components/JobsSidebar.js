"use client";

function titleCase(s) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function FilterGroup({ label, children }) {
  return (
    <div className="mb-6">
      <p className="font-mono text-[11px] tracking-[0.15em] text-slate uppercase mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-line rounded-lg px-3 py-2.5 bg-white text-sm text-ink focus:outline-none focus:border-violet transition-colors"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// Sidebar for the full jobs-listing page. Lets the user narrow results by
// location, experience level, role/skill, and platform -- each filter maps
// directly to a query param the parent page passes through to /api/jobs.
export default function JobsSidebar({
  filters,
  setFilters,
  facets,
  resultCount,
}) {
  const { source, tag, location, experienceLevel, q } = filters;

  function update(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const hasActiveFilters = source || tag || location || experienceLevel || q;

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="lg:sticky lg:top-24 border border-line rounded-xl bg-white p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-sm">Filter roles</h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() =>
                setFilters({ source: "", tag: "", location: "", experienceLevel: "", q: "" })
              }
              className="text-xs text-violet hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        <FilterGroup label="Location">
          <SelectField
            value={location}
            onChange={(v) => update("location", v)}
            placeholder="All locations"
            options={(facets.locations || []).map((l) => ({ value: l, label: l }))}
          />
        </FilterGroup>

        <FilterGroup label="Experience">
          <SelectField
            value={experienceLevel}
            onChange={(v) => update("experienceLevel", v)}
            placeholder="All levels"
            options={(facets.experience_levels || []).map((e) => ({
              value: e,
              label: titleCase(e),
            }))}
          />
        </FilterGroup>

        <FilterGroup label="Role / Skill">
          <SelectField
            value={tag}
            onChange={(v) => update("tag", v)}
            placeholder="All roles"
            options={(facets.tags || []).map((t) => ({ value: t, label: t }))}
          />
        </FilterGroup>

        <FilterGroup label="Platform">
          <SelectField
            value={source}
            onChange={(v) => update("source", v)}
            placeholder="All platforms"
            options={(facets.sources || []).map((s) => ({
              value: s,
              label: titleCase(s),
            }))}
          />
        </FilterGroup>

        <p className="text-xs text-slate font-mono pt-1 border-t border-line mt-1">
          {resultCount.toLocaleString()} roles match
        </p>
      </div>
    </aside>
  );
}
