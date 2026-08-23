import Logo from "@/components/Logo";

const FOOTER_COLUMNS = [
  {
    heading: "Explore",
    links: [
      { href: "/jobs", label: "Browse jobs" },
      { href: "/#jobs", label: "Live listings" },
      { href: "/resume", label: "Match my resume" },
      { href: "/saved", label: "Saved Jobs" },
    ],
  },
  {
    heading: "About",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
];


export default function SiteFooter() {
  return (
    <footer className="bg-gradient-to-b from-surface to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-16 pb-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
          <div className="sm:col-span-2 lg:col-span-1">
            <a href="/" className="text-violet font-bold text-2xl ">
              JobBoard
            </a>
            <p className="text-sm text-slate mt-4 max-w-[32ch] lg:max-w-[26ch] leading-relaxed">
               Discover relevant opportunities from LinkedIn, Naukri, Indeed, and Internshala in one place. Upload your resume, get personalized job recommendations
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="font-serif text-lg text-ink mb-4">{col.heading}</p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate hover:text-violet focus-visible:text-violet focus-visible:outline-none transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 sm:mt-16 pt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate">
            © {new Date().getFullYear()} JobBoard. All rights reserved.
          </p>
          
        </div>
      </div>
      <div
        aria-hidden
        className="h-[3px] bg-gradient-to-r from-ink via-violet to-ink"
      />
    </footer>
  );
}