import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, X, Sparkles, ArrowRight } from 'lucide-react';
import { CreditCard } from '../types';
import { cardInsights, similarCards } from '../lib/insights';

// Enhanced Card Profile (PRD F2) + Contextual Guidance (F3) + Tradeoffs (F5),
// all deterministic. Collapsed by default so it never crowds the card; one
// tap reveals the full analysis.
export default function CardInsightsPanel({
  card, allCards, onSelectCard,
}: {
  card: CreditCard;
  allCards: CreditCard[];
  onSelectCard?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ins = cardInsights(card);
  const similar = similarCards(card, allCards);

  return (
    <div className="w-full max-w-xl mx-auto mt-6 px-4">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-center gap-2 h-10 rounded-full border border-[var(--cl-hairline-strong)] text-sm font-medium text-[var(--cl-ink)] hover:bg-[var(--cl-panel)] transition-colors"
      >
        {open ? 'Hide full analysis' : 'See full analysis'}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-col gap-5 text-left">
              {/* Contextual guidance */}
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
                <Section title="Best for">
                  <PillList items={ins.bestFor} tone="good" />
                </Section>
                <Section title="Not ideal for">
                  <PillList items={ins.notIdealFor} tone="bad" />
                </Section>
              </div>

              <Section title="Reward examples">
                <ul className="flex flex-col gap-1.5">
                  {ins.rewardExamples.map((line, i) => (
                    <li key={i} className="text-sm text-[var(--cl-ink)] leading-relaxed">{line}</li>
                  ))}
                </ul>
              </Section>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Section title="Approval difficulty">
                  <p className="text-sm text-[var(--cl-ink)]">{ins.approval.label}</p>
                </Section>
                <Section title="Redemption options">
                  <p className="text-sm text-[var(--cl-ink)]">{ins.redemption.join(' · ')}</p>
                </Section>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
