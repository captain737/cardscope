import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CreditCard as CreditCardType } from '../types';
import { cardRewardBullets, leadWithNumber } from '../lib/rewards';

interface CardFactsProps {
  card: CreditCardType;
}

/**
 * The headline facts shown beneath the card identity in the results view:
 * Annual Fee · Rewards · Sign-up Bonus. Every other fact (APR, credit, foreign
 * fee, top perk, best for) lives in the analysis panel (CardInsightsPanel).
 */
export default function CardFacts({ card }: CardFactsProps) {
  const reducedMotion = useReducedMotion();
  // Cap at 4 so the headline matrix keeps a bounded height across cards.
  const rewardsBullets = cardRewardBullets(card.facts).slice(0, 4);

  const cells = [
    { label: 'Annual Fee', value: card.facts.annualFee, rewards: false },
    { label: 'Rewards', value: card.facts.rewards, rewards: true },
    { label: 'Sign-up Bonus', value: leadWithNumber(card.facts.bonus), rewards: false },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={card.id}
        initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[88rem] mx-auto px-4"
      >
        {/* Sized for the 13" MacBook (1440 logical): Rewards holds ~655px while
            the Annual Fee / Sign-up Bonus sides take the widened remainder. */}
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_2fr_1.1fr]">
          {cells.map((cell, i) => (
            <div
              key={cell.label}
              className={`flex flex-col items-center text-center gap-2.5 p-5 md:px-8 md:py-6 ${i < 2 ? 'border-b md:border-b-0 md:border-r' : ''} border-[var(--cl-hairline)]`}
            >
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.11em] text-[var(--cl-muted)]">{cell.label}</span>
              {cell.rewards && rewardsBullets.length >= 1 ? (
                <ul className="flex flex-col gap-2 text-left">
                  {rewardsBullets.map((b, j) => (
                    <li key={j} className="flex gap-2.5 min-w-0 text-[15px] font-medium text-[var(--cl-ink)] leading-relaxed">
                      <span aria-hidden className="mt-[0.55em] h-1.5 w-1.5 rounded-full bg-[var(--cl-gold)] shrink-0" />
                      <span className="line-clamp-2">{b}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[15px] font-medium text-[var(--cl-ink)] leading-relaxed max-w-[46ch] [overflow-wrap:anywhere] line-clamp-4">{cell.value}</p>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
