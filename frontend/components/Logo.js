// Small globe-grid mark used next to the "ProjectBoard" wordmark in the
// header. Pure inline SVG so it inherits currentColor and needs no asset.
export function GlobeMark({ className = "w-6 h-6" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M2.75 12h18.5M12 2.75c2.6 2.4 4 5.6 4 9.25s-1.4 6.85-4 9.25c-2.6-2.4-4-5.6-4-9.25s1.4-6.85 4-9.25Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4.2 7.2c1.9 1.15 4.8 1.85 7.8 1.85s5.9-.7 7.8-1.85M4.2 16.8c1.9-1.15 4.8-1.85 7.8-1.85s5.9.7 7.8 1.85"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Logo({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <GlobeMark className="w-6 h-6 sm:w-7 sm:h-7 text-violet" />
      <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-violet">
        ProjectBoard
      </span>
    </span>
  );
}
