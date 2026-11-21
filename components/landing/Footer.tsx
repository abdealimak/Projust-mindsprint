import { Guilloche } from "@/components/seal/Guilloche";
import { ButtonLink, GitHubMark } from "@/components/ui/Button";
import { Mark } from "@/components/ui/Mark";
import { Logo } from "./Nav";

export function FinalCta() {
  return (
    <section id="start" aria-labelledby="start-title" className="px-4 pb-24 sm:px-6">
      <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[24px] border border-rule bg-sheet px-6 py-16 sm:px-12 sm:py-20">
        <Guilloche size={520} className="pointer-events-none absolute -bottom-48 -right-40 opacity-30" />
        <div className="relative max-w-[620px]">
          <h2 id="start-title" className="font-display text-h2 font-normal">
            Your next interview will ask why. <Mark onView delay={0.2}>Be ready.</Mark>
          </h2>
          <p className="mt-5 max-w-[46ch] text-lead text-ink-2">
            Import a repo and get your concept map in about two minutes. No card needed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="#start">
              <GitHubMark />
              Import a repo
            </ButtonLink>
            <ButtonLink href="#verify" variant="secondary">
              Check a certificate
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo />
          <p className="mt-2 text-[14px] text-ink-3">Justice for honest builders.</p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-2">
          <li><a href="#how" className="hover:text-ink">How it works</a></li>
          <li><a href="#verify" className="hover:text-ink">Check a certificate</a></li>
          <li><a href="#pricing" className="hover:text-ink">Pricing</a></li>
          <li><a href="#trust" className="hover:text-ink">How we prevent cheating</a></li>
        </ul>
        <p className="text-[13px] text-ink-3">A certificate is strong evidence, not absolute proof.</p>
      </div>
    </footer>
  );
}
