import { AspectRadar } from "@/components/landing/AspectRadar";
import { Audience } from "@/components/landing/Audience";
import { FinalCta, Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { Loop } from "@/components/landing/Loop";
import { Nav } from "@/components/landing/Nav";
import { Pricing } from "@/components/landing/Pricing";
import { Problem } from "@/components/landing/Problem";
import { Trust } from "@/components/landing/Trust";
import { VerifyCert } from "@/components/landing/VerifyCert";
import { Mark } from "@/components/ui/Mark";

/** Section shell: one heading + intro, then content. Keeps spacing in one place. */
function Section({
  id,
  title,
  intro,
  children,
  tone = "paper",
}: {
  id: string;
  title: React.ReactNode;
  intro: string;
  children: React.ReactNode;
  tone?: "paper" | "band";
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`py-24 sm:py-32 ${tone === "band" ? "border-y border-rule bg-paper-2/60" : ""}`}
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="max-w-[640px]">
          <h2 id={`${id}-title`} className="font-display text-h2 font-normal">
            {title}
          </h2>
          <p className="mt-5 text-lead text-ink-2">{intro}</p>
        </div>
        <div className="mt-14">{children}</div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Loop />
        <Section
          id="aspects"
          tone="band"
          title={<>Six scores, <Mark onView delay={0.2}>one honest bar</Mark></>}
          intro="Every quiz answer is scored on six aspects. The certificate unlocks when the average reaches 60 and no aspect is under 40. Try it."
        >
          <AspectRadar />
        </Section>
        <Section
          id="verify"
          title={<>Anyone can check it <Mark onView delay={0.2}>in seconds</Mark></>}
          intro="Each certificate has a unique ID, a QR code and a public page. Recruiters see the live version, with its full history."
        >
          <VerifyCert />
        </Section>
        <Section
          id="who"
          tone="band"
          title="Built for everyone in the room"
          intro="The student who built it, the teacher grading it, and the person deciding whether to hire them."
        >
          <Audience />
        </Section>
        <Section
          id="trust"
          title="Hard to fake, fair to the nervous"
          intro="No single check is cheat-proof, so we stack several. Here is what is built today and what comes next."
        >
          <Trust />
        </Section>
        <Section
          id="pricing"
          tone="band"
          title="Free to start, honest about the rest"
          intro="Students never pay to apply for a job or to get a basic certificate."
        >
          <Pricing />
        </Section>
        <div className="pt-24 sm:pt-32">
          <FinalCta />
        </div>
      </main>
      <Footer />
    </>
  );
}
