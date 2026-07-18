import { Check } from 'lucide-react';
import { CreditCard } from '../types';
import { cardInsights } from '../lib/insights';
import { aprSections } from '../lib/apr';
import { topPerkDisplay } from '../lib/rewards';

// The compact analysis shown in the upper-right of the results view: just
// Best For (or, in match mode, the personalized "Fits you because" reasons),
// Approval Difficulty, Redemption Options, and the folded Card Details (APR,
// credit, foreign fee, top perk). Scrolls internally if it's taller than its
// column.
export default function CardInsightsPanel({ card, whyBullets }: { card: CreditCard; whyBullets?: string[] }) {
  const ins = cardInsights(card);
  const apr = aprSections(card.facts);
  const personalized = !!whyBullets && whyBullets.length > 0;
  // "Best for" is intentionally omitted here — it has its own bulleted section
  // below. Foreign fee and Top perk share the last row (two columns).
  // Short (<100 char) glossary for the APR rows, surfaced via a hover tooltip.
  const APR_HINTS: Record<string, string> = {
    Intro: 'A reduced interest rate for a set period after you open the card.',
    Regular: "The ongoing yearly interest rate charged on any balance you don't pay in full.",
  };
  const details: { label: string; value: string; hint?: string }[] = [
    ...apr.map((s) => ({ label: `${s.label} APR`, value: s.value, hint: APR_HINTS[s.label] })),
    { label: 'Foreign fee', value: card.facts.foreignFee },
    { label: 'Top perk', value: topPerkDisplay(card.facts) },
  ];

  return (
    <div className="w-full text-left flex flex-col gap-[clamp(0.9rem,2.2vh,1.9rem)] pr-1">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-[clamp(0.9rem,1.8vh,1.35rem)]">
        {details.map((d) => (
          <div key={d.label} className="flex flex-col gap-1.5">
            <dt className="font-display text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--cl-muted)]">
              {d.label}{d.hint && <InfoStar text={d.hint} />}
            </dt>
            <dd className="text-[15px] font-medium text-[var(--cl-ink)] leading-snug [overflow-wrap:anywhere]">{d.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-[var(--cl-hairline)] pt-[clamp(0.85rem,2vh,1.75rem)]">
        <Section title="Approval difficulty"><p className="text-[15px] text-[var(--cl-ink)] leading-relaxed">{ins.approval.label}</p></Section>
        <Section title="Redemption options"><p className="text-[15px] text-[var(--cl-ink)] leading-relaxed">{ins.redemption.join(' · ')}</p></Section>
      </div>

      <Section title={personalized ? 'Fits you because' : 'Best for'} divided>
        <ul className={personalized ? 'flex flex-col gap-2' : 'grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2.5'}>
          {(personalized ? whyBullets! : ins.bestFor.slice(0, 3)).map((it, i) => (
            <li key={i} className="flex items-start gap-2 min-w-0 text-[15px] text-[var(--cl-ink)] leading-snug">
              <Check className="w-4 h-4 mt-[0.15em] shrink-0 text-[var(--cl-gold)]" strokeWidth={2.5} />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

// A gold "*" that reveals a short definition on hover or keyboard focus.
function InfoStar({ text }: { text: string }) {
  return (
    <span className="relative inline-block group align-super">
      <button
        type="button"
        aria-label={text}
        className="ml-0.5 text-[var(--cl-gold)] cursor-help rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-gold)]/40"
      >
        *
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 w-max max-w-[14rem] -translate-x-1/2 rounded-lg bg-[var(--cl-ink)] px-2.5 py-1.5 text-[11px] font-medium normal-case leading-snug tracking-normal text-[var(--cl-bg)] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

function Section({ title, children, divided }: { title: string; children: React.ReactNode; divided?: boolean }) {
  return (
    <div className={divided ? 'border-t border-[var(--cl-hairline)] pt-[clamp(0.85rem,2vh,1.75rem)]' : undefined}>
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.11em] text-[var(--cl-muted)] mb-3">{title}</p>
      {children}
    </div>
  );
}
