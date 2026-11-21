import { cn } from '@/lib/utils';

/** Landing-page wordmark: "Projust°" in Geist 650, tight tracking. */
export function ProjustLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-start gap-[2px] font-sans font-[650] text-[21px] leading-none tracking-[-0.03em] text-ink select-none',
        className
      )}
    >
      Projust<sup className="text-[11px] font-medium mt-[2px]">°</sup>
    </span>
  );
}

export function ProjustWordmark({ className }: { className?: string }) {
  return <ProjustLogo className={className} />;
}
