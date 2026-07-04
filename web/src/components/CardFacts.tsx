import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CreditCard as CreditCardType } from '../types';
import { ArrowUpRight, Plus, X } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';

interface CardFactsProps {
  card: CreditCardType;
  watchlist: string[];
  setWatchlist: Dispatch<SetStateAction<string[]>>;
}

/**
 * 3x3 "tic-tac-toe" fact grid: internal grid lines only (no boxes, no
 * outer border), every cell text-centered, the card identity + actions in
 * the center square with the eight facts around it.
 */
export default function CardFacts({ card, watchlist, setWatchlist }: CardFactsProps) {
  const onWatchlist = watchlist.includes(card.id);
  const reducedMotion = useReducedMotion();

  const cells: Array<{ label: string; value: string } | 'center'> = [
    { label: 'Annual Fee', value: card.facts.annualFee },
    { label: 'Rewards', value: card.facts.rewards },
    { label: 'Sign-up Bonus', value: card.facts.bonus },
    { label: 'APR', value: card.facts.apr },
    'center',
    { label: 'Best For', value: card.facts.bestFor },
    { label: 'Credit Needed', value: card.facts.creditNeeded },
    { label: 'Foreign Fee', value: card.facts.foreignFee },
    { label: 'Top Perk', value: card.facts.topPerk },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={card.id}
        initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[96rem] mx-auto px-4 md:px-6"
      >
        <div className="grid grid-cols-3">
          {cells.map((cell, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const lines = `${col < 2 ? 'border-r' : ''} ${row < 2 ? 'border-b' : ''} border-[var(--cl-hairline)]`;

            if (cell === 'center') {
              return (
                <div key="center" className={`${lines} flex items-center justify-center gap-4 md:gap-8 p-5 md:p-6 min-h-[150px] md:min-h-[170px]`}>
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => {
                        setWatchlist(prev =>
                          prev.includes(card.id) ? prev.filter(id => id !== card.id) : [...prev, card.id]
                        );
                      }}
                      aria-label={onWatchlist ? `Remove ${card.name} from watchlist` : `Add ${card.name} to watchlist`}
                      className="w-11 h-11 rounded-full bg-transparent border border-[var(--cl-hairline-strong)] text-[var(--cl-muted)] hover:text-[var(--cl-ink)] hover:border-[var(--cl-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 transition-colors flex items-center justify-center"
                    >
                      {onWatchlist ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cl-muted)]">
                      {onWatchlist ? 'Saved' : 'Watchlist'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    {card.applyUrl ? (
                      <a
                        href={card.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Visit ${card.name} on the issuer's site`}
                        className="w-11 h-11 rounded-full bg-[var(--cl-pill)] text-[var(--cl-pill-ink)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/40 transition-opacity flex items-center justify-center"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </a>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="w-11 h-11 rounded-full bg-[var(--cl-pill)]/30 text-[var(--cl-pill-ink)]/50 flex items-center justify-center cursor-not-allowed"
                        title="Application link unavailable"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </span>
                    )}
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cl-gold)]">Visit</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={cell.label} className={`${lines} flex flex-col items-center justify-center text-center gap-2 p-5 md:p-6 min-h-[150px] md:min-h-[170px]`}>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cl-muted)]">{cell.label}</span>
                <p className="text-sm md:text-base font-medium text-[var(--cl-ink)] leading-relaxed max-w-[60ch] [overflow-wrap:anywhere]">{cell.value}</p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
