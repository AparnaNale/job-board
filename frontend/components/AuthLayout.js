export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left panel — matches the landing page's visual language */}
      <div className="hidden md:flex flex-col items-center justify-center bg-surface border-r border-line px-12">
        <div className="max-w-sm">
          <p className="font-mono text-xs tracking-[0.2em] text-violet mb-4 uppercase">
            AI-Powered Job Board
          </p>
          <h2 className="font-display text-3xl font-bold text-ink mb-4">
            Every platform, one signal.
          </h2>
          <p className="text-slate leading-relaxed">
            Sign in to save your resume profile, get AI-matched
            recommendations, and pick up your chat history with the AI Job
            Assistant.
          </p>
        </div>
      </div>

      {/* Right panel (form) */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
