export function ProjustLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="pj-logo-grad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#pj-logo-grad)" />
      {/* Code verification check + node shield icon */}
      <path
        d="M10 16L14 20L22 12"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22" cy="12" r="1.5" fill="#34d399" />
    </svg>
  );
}

export function ProjustWordmark({ className = 'text-[15px]' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight text-fg select-none ${className}`}>
      <ProjustLogo className="w-6 h-6 shadow-sm" />
      <span className="font-semibold text-[16px] tracking-tight">Projust</span>
      <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
        Beta
      </span>
    </div>
  );
}
