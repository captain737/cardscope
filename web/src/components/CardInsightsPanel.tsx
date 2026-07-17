import { Check } from 'lucide-react';
import { CreditCard } from '../types';
import { cardInsights } from '../lib/insights';
import { aprSections } from '../lib/apr';
import { topPerkDisplay } from '../lib/rewards';

// The compact analysis shown in the upper-right of the results view: just
// Best For, Approval Difficulty, Redemption Options, and the folded Card
// Details (APR, credit, foreign fee, top perk, best for). Scrolls internally
// if it's taller than its column.
export default function CardInsightsPanel({ card }: { card: CreditCard }) {
  const ins = cardInsights(card);
  const apr = aprSections(card.facts);
  // "Best for" is intentionally omitted here — it has its own bulleted section
  // below. Foreign fee and Top perk share the last row (two columns).
  const details: { label: string; value: string }[] = [
    ...apr.map((s) => ({ label: `${s.label} APR`, value: s.value })),
    { label: 'Foreign fee', value: card.facts.foreignFee },
    { label: 'Top perk', value: topPerkDisplay(card.facts) },
  ];

  return (
    <div className="w-full text-left flex flex-col gap-[clamp(0.9rem,2.2vh,1.9rem)] pr-1">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-[clamp(0.9rem,1.8vh,1.35rem)]">
        {details.map((d) => (
          <div key={d.label} className="flex flex-col gap-1.5">
            <dt className="font-display text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--cl-muted)]">{d.label}</dt>
            <dd className="text-[15px] font-medium text-[var(--cl-ink)] leading-snug [overflow-wrap:anywhere]">{d.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-[var(--cl-hairline)] pt-[clamp(0.85rem,2vh,1.75rem)]">
        <Section title="Approval difficulty"><p className="text-[15px] text-[var(--cl-ink)] leading-relaxed">{ins.approval.label}</p></Section>
        <Section title="Redemption options"><p className="text-[15px] text-[var(--cl-ink)] leading-relaxed">{ins.redemption.join(' · ')}</p></Section>
      </div>

      <Section title="Best for" divided>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2.5">
          {ins.bestFor.slice(0, 3).map((it, i) => (
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

function Section({ title, children, divided }: { title: string; children: React.ReactNode; divided?: boolean }) {
  return (
    <div className={divided ? 'border-t border-[var(--cl-hairline)] pt-[clamp(0.85rem,2vh,1.75rem)]' : undefined}>
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.11em] text-[var(--cl-muted)] mb-3">{title}</p>
      {children}
    </div>
  );
}
