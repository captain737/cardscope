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
  const details: { label: string; value: string }[] = [
    ...apr.map((s) => ({ label: `${s.label} APR`, value: s.value })),
    { label: 'Credit needed', value: card.facts.creditNeeded },
    { label: 'Foreign fee', value: card.facts.foreignFee },
    { label: 'Top perk', value: topPerkDisplay(card.facts) },
    { label: 'Best for', value: card.facts.bestFor },
  ];

  return (
    <div className="w-full h-full overflow-y-auto hide-scrollbar rounded-2xl border border-[var(--cl-hairline)] bg-[var(--cl-panel)]/40 p-5 md:p-6 text-left flex flex-col gap-5">
      <Section title="Best for">
        <ul className="flex flex-col gap-1.5">
          {ins.bestFor.map((it, i) => (
            <li key={i} className="flex gap-2 text-sm text-[var(--cl-ink)] leading-relaxed">
              <Check className="w-3.5 h-3.5 mt-[0.2em] shrink-0 text-[var(--cl-gold)]" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Section title="Approval difficulty"><p className="text-sm text-[var(--cl-ink)]">{ins.approval.label}</p></Section>
        <Section title="Redemption options"><p className="text-sm text-[var(--cl-ink)]">{ins.redemption.join(' · ')}</p></Section>
      </div>

      <Section title="Card details">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {details.map((d) => (
            <div key={d.label} className="flex flex-col">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--cl-muted)]">{d.label}</dt>
              <dd className="text-sm text-[var(--cl-ink)] leading-snug [overflow-wrap:anywhere]">{d.value}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cl-muted)] mb-2">{title}</p>
      {children}
    </div>
  );
}
