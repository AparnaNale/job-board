// Flat line-art hero illustration: person at a laptop with a presentation
// board, a bar-chart card and a potted plant behind them. Built as one SVG
// so it scales cleanly and reuses the brand's violet accent.
export default function HeroIllustration({ className = "" }) {
  return (
    <svg
      viewBox="0 0 640 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Illustration of a person working on a laptop with charts nearby"
    >
      {/* Potted plant, back-most layer */}
      <g>
        <path
          d="M520 300c-4-46 6-92 34-118M520 300c10-44 34-84 68-104M520 300c-18-40-20-84-8-122"
          stroke="#15121F"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M478 330h84l-10 46a12 12 0 0 1-12 10h-40a12 12 0 0 1-12-10l-10-46Z" fill="#15121F" />
      </g>

      {/* Presentation board on a stand */}
      <g>
        <path d="M300 168v104" stroke="#15121F" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="230" y="52" width="140" height="96" rx="4" fill="#FFFFFF" stroke="#15121F" strokeWidth="2.5" />
        <path d="M222 52h156" stroke="#15121F" strokeWidth="4" strokeLinecap="round" />
        {/* pie chart */}
        <circle cx="258" cy="82" r="16" fill="#FFFFFF" stroke="#15121F" strokeWidth="2" />
        <path d="M258 82 L258 66 A16 16 0 0 1 271 90 Z" fill="#6D28D9" />
        {/* text lines */}
        <path d="M286 72h68M286 80h50M286 88h58" stroke="#15121F" strokeWidth="2.5" strokeLinecap="round" />
        {/* mini area/mountain chart */}
        <path d="M238 132l16-14 14 10 16-18 20 12 18-8" stroke="#15121F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M238 138h124v-6l-18 8-20-12-16 18-14-10-16 14-40 4v-16Z" fill="#6D28D9" opacity="0.9" />
      </g>

      {/* Bar chart card, in front of the plant */}
      <g>
        <rect x="392" y="172" width="128" height="104" rx="10" fill="#FFFFFF" stroke="#15121F" strokeWidth="2.5" />
        <g stroke="#15121F" strokeWidth="2" strokeLinecap="round">
          <path d="M414 250v-24" />
          <path d="M436 250v-40" />
          <path d="M458 250v-16" />
          <path d="M480 250v-34" />
          <path d="M502 250v-52" />
        </g>
      </g>

      {/* Person */}
      <g>
        {/* body / sweater */}
        <path
          d="M150 476c-4-58 6-98 34-122 20-17 46-24 72-24s52 7 72 24c28 24 38 64 34 122H150Z"
          fill="#6D28D9"
          stroke="#15121F"
          strokeWidth="2.5"
        />
        {/* collar */}
        <path d="M230 336l26 24 26-24" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M226 332c10 4 18 6 30 6s20-2 30-6" stroke="#15121F" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* buttons/pocket */}
        <circle cx="248" cy="368" r="2.6" fill="#FFFFFF" />
        <circle cx="248" cy="382" r="2.6" fill="#FFFFFF" />
        <rect x="270" y="372" width="20" height="6" rx="2" fill="#FFFFFF" opacity="0.85" />

        {/* neck + head */}
        <rect x="240" y="298" width="34" height="30" rx="10" fill="#F4D9B8" />
        <circle cx="257" cy="272" r="40" fill="#F4D9B8" />
        {/* hair */}
        <path
          d="M215 268c-4-30 16-52 42-52s46 22 42 52c-6-4-10-14-10-14s-4 12-14 14c2-10-2-16-2-16s-6 10-18 10-18-8-22-14c-2 8-6 12-6 12s-8-2-12 8Z"
          fill="#15121F"
        />
        {/* ear */}
        <circle cx="219" cy="278" r="5" fill="#F4D9B8" stroke="#15121F" strokeWidth="1.5" />
        {/* face */}
        <circle cx="248" cy="276" r="2.3" fill="#15121F" />
        <path d="M275 268c3 2 5 5 4 9" stroke="#15121F" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M240 292c5 5 13 6 19 2" stroke="#15121F" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="207" cy="288" r="1.6" fill="#15121F" opacity="0.5" />

        {/* far arm resting on laptop */}
        <path
          d="M170 420c6-30 22-46 40-52"
          stroke="#6D28D9"
          strokeWidth="34"
          strokeLinecap="round"
        />
        <path
          d="M170 420c6-30 22-46 40-52"
          stroke="#15121F"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M156 400l-6 34 22 6" stroke="#F4D9B8" strokeWidth="16" strokeLinecap="round" />
        <path d="M156 400l-6 34 22 6" stroke="#15121F" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>

      {/* laptop, drawn over the arms */}
      <g>
        <path d="M182 460l4-70a8 8 0 0 1 8-7h96a8 8 0 0 1 8 7l4 70Z" fill="#FFFFFF" stroke="#15121F" strokeWidth="2.5" />
        <circle cx="278" cy="422" r="13" fill="none" stroke="#15121F" strokeWidth="2" />
        <path d="M170 460h172l-6 16a8 8 0 0 1-8 6H184a8 8 0 0 1-8-6l-6-16Z" fill="#FFFFFF" stroke="#15121F" strokeWidth="2.5" />
      </g>

      {/* near arm / hand on trackpad, drawn last so it sits above the laptop base */}
      <path
        d="M300 452c14-4 26-2 36 6"
        stroke="#F4D9B8"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M300 452c14-4 26-2 36 6"
        stroke="#15121F"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
