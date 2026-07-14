import { Check, X, Sparkles, ArrowRight } from 'lucide-react';
import { CreditCard } from '../types';
import { cardInsights, similarCards } from '../lib/insights';
import { aprSections } from '../lib/apr';
import { topPerkDisplay } from '../lib/rewards';

// Always-expanded analysis for the upper-right of the results view (PRD
// F2/F3/F5): contextual guidance, pros/cons, reward examples, approval,
// redemption, tradeoffs, similar cards — plus the folded raw facts (APR,
// credit, foreign fee, top perk, best for) that no longer sit in the matrix.
export default function CardInsightsPanel({
  card, allCards, onSelectCard,
}: {
  card: CreditCard;
  allCards: CreditCard[];
  onSelectCard?: (id: string) => void;
}) {
  const ins = cardInsights(card);
  const similar = similarCards(card, allCards);
  const apr = aprSections(card.facts);
  const details: { label: string; value: string }[] = [
    ...apr.map((s) => ({ label: `${s.label} APR`, value: s.value })),
    { label: 'Credit needed', value: card.facts.creditNeeded },
    { label: 'Foreign fee', value: card.facts.foreignFee },
    { label: 'Top perk', value: topPerkDisplay(card.facts) },
    { label: 'Best for', value: card.facts.bestFor },
  ];

  return (
    <div className="w-full rounded-2xl border border-[var(--cl-hairline)] bg-[var(--cl-panel)]/40 p-5 md:p-6 text-left flex flex-col gap-5">
      <Section title="What it's worth to you">
        <ul className="flex flex-col gap-2">
          {ins.contextual.map((line, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-[var(--cl-ink)] leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 mt-[0.2em] text-[var(--cl-gold)] shrink-0" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Section title="Best for"><PillList items={ins.bestFor} tone="good" /></Section>
        <Section title="Not ideal for"><PillList items={ins.notIdealFor} tone="bad" /></Section>
      </div>

      <Section title="Reward examples">
        <ul className="flex flex-col gap-1.5">
          {ins.rewardExamples.map((line, i) => (
            <li key={i} className="text-sm text-[var(--cl-ink)] leading-relaxed">{line}</li>
          ))}
        </ul>
      </Section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Section title="Approval difficulty"><p className="text-sm text-[var(--cl-ink)]">{ins.approval.label}</p></Section>
        <Section title="Redemption options"><p className="text-sm text-[var(--cl-ink)]">{ins.redemption.join(' · ')}</p></Section>
      </div>

      <Section title="Tradeoffs">
        <ul className="flex flex-col gap-1.5">
          {ins.tradeoffs.map((line, i) => (
            <li key={i} className="text-sm text-[var(--cl-muted)] leading-relaxed">{line}</li>
          ))}
        </ul>
      </Section>

      {similar.length > 0 && (
        <Section title="Similar alternatives">
          <div className="flex flex-col gap-1.5">
            {similar.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectCard?.(s.id)}
                disabled={!onSelectCard}
                className="group flex items-center justify-between gap-3 text-left rounded-lg px-2 py-1.5 -mx-2 hover:bg-[var(--cl-panel)] transition-colors disabled:hover:bg-transparent disabled:cursor-default"
              >
                <span className="text-sm text-[var(--cl-ink)] truncate">{s.name}</span>
                <span className="text-xs text-[var(--cl-muted)] shrink-0 flex items-center gap-1">
                  {s.facts.annualFee}
                  {onSelectCard && <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}

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

function PillList({ items, tone }: { items: string[]; tone: 'good' | 'bad' }) {
  const Icon = tone === 'good' ? Check : X;
  const color = tone === 'good' ? 'text-[var(--cl-gold)]' : 'text-[var(--cl-muted)]';
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm text-[var(--cl-ink)] leading-relaxed">
          <Icon className={`w-3.5 h-3.5 mt-[0.2em] shrink-0 ${color}`} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
