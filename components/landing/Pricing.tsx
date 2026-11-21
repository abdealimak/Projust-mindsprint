import { ButtonLink } from "@/components/ui/Button";

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    note: "for students, always",
    items: ["1 project", "Tutor, limited questions a day", "First modules of your course", "Basic certificate"],
    cta: "Start free",
    primary: false,
  },
  {
    name: "Pro",
    price: "₹299",
    note: "a month, or ₹699 for 3 months",
    items: ["Unlimited tutor", "Full course and unlimited retakes", "Full detailed report", "Common-project courses"],
    cta: "Go Pro",
    primary: true,
  },
  {
    name: "Interview",
    price: "₹399–599",
    note: "per interview",
    items: ["AI voice interview on your project", "Human review of the transcript", "Adds Interview-verified level", "Interviewer briefing"],
    cta: "Join the waitlist",
    primary: false,
  },
];

export function Pricing() {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-[16px] border bg-sheet p-6 ${
              p.primary ? "border-ink shadow-[var(--shadow-lift)]" : "border-rule"
            }`}
          >
            <p className="flex items-center justify-between text-[16px] font-medium text-ink">
              {p.name}
              {p.primary && <span className="rounded-md bg-mark px-2 py-0.5 text-[12px] font-medium">Best for interviews</span>}
            </p>
            <p className="font-display mt-4 text-[44px] leading-none">{p.price}</p>
            <p className="mt-2 text-[14px] text-ink-2">{p.note}</p>
            <ul className="mt-6 flex-1 space-y-2.5 border-t border-rule pt-5">
              {p.items.map((it) => (
                <li key={it} className="flex gap-2.5 text-[15px] text-ink">
                  <svg viewBox="0 0 16 16" className="mt-1 h-4 w-4 shrink-0 text-seal" aria-hidden>
                    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {it}
                </li>
              ))}
            </ul>
            <ButtonLink href="#start" variant={p.primary ? "primary" : "secondary"} className="mt-6 w-full">
              {p.cta}
            </ButtonLink>
          </div>
        ))}
      </div>
      <p className="mt-6 text-[14px] text-ink-3">
        Companies pay a listing fee and a fee per verified report; applying stays free for students. College licences are
        planned. Prices are a draft.
      </p>
    </div>
  );
}
