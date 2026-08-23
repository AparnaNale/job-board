import Link from "next/link";
import SaveButton from "@/components/SaveButton";

export default function JobCard({ job }) {
  const pct = job.match_score != null ? Math.round(job.match_score * 100) : null;
  const activeBars = pct == null ? 0 : Math.max(1, Math.ceil(pct / 25));

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group relative flex flex-col h-full border border-line rounded-xl p-4 mt-2 sm:p-5 bg-white hover:border-violet hover:-translate-y-0.5 hover:shadow-lg focus-visible:border-violet focus-visible:-translate-y-0.5 focus-visible:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40 transition-all duration-200"
    >
      <SaveButton jobId={job.id} className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10" />

      <div className="flex items-start justify-between gap-3 sm:gap-4 pr-10">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-widest text-mint uppercase mb-1">
            {job.source_platform?.replace(/_/g, " ")}
          </p>
          <h3 className="font-display font-bold text-base sm:text-lg leading-snug line-clamp-2 min-h-[2.6em] group-hover:text-violet transition-colors">
            {job.title}
          </h3>
          <p className="text-sm text-slate mt-1 line-clamp-1">
            {job.company} · {job.location || "Remote / Unspecified"}
          </p>
        </div>

        {pct != null && (
          <div className="shrink-0 text-right">
            <div className={`signal-bars ${activeBars >= 3 ? "active" : ""}`}>
              <span></span><span></span><span></span><span></span>
            </div>
            <p className="font-mono text-[10px] text-slate mt-1">{pct}% match</p>
          </div>
        )}
      </div>

      {/* mt-auto pushes the tag row to the bottom of the card, so every
          card in a grid lines up the same way regardless of how many
          lines the title/company text above took up. */}
      <div className="flex flex-wrap gap-2 pt-4 mt-auto">
        {(job.tags || []).slice(0, 4).map((t) => (
          <span
            key={t}
            className="text-xs px-2 py-1 rounded-full bg-surface text-ink/70 group-hover:bg-violetSoft group-hover:text-violet transition-colors"
          >
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}