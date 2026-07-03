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
        className="w-full max-w-6xl mx-auto px-4 md:px-6"
      >
        <div className="grid grid-cols-3">
          {cells.map((cell, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const lines = `${col < 2 ? 'border-r' : ''} ${row < 2 ? 'border-b' : ''} border-border`;

            if (cell === 'center') {
              return (
                <div key="center" className={`${lines} flex items-center justify-center gap-4 md:gap-8 p-3 md:p-6 min-h-[130px] md:min-h-[150px]`}>
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => {
                        setWatchlist(prev =>
                          prev.includes(card.id) ? prev.filter(id => id !== card.id) : [...prev, card.id]
                        );
                      }}
                      aria-label={onWatchlist ? `Remove ${card.name} from watchlist` : `Add ${card.name} to watchlist`}
                      className="w-11 h-11 rounded-full bg-surface border border-border text-muted hover:text-ink hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors flex items-center justify-center"
                    >
                      {onWatchlist ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
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
                        className="w-11 h-11 rounded-full bg-primary text-bg hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors flex items-center justify-center"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </a>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="w-11 h-11 rounded-full bg-primary/30 text-bg/50 flex items-center justify-center cursor-not-allowed"
                        title="Application link unavailable"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </span>
                    )}
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Visit</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={cell.label} className={`${lines} flex flex-col items-center justify-center text-center gap-1.5 p-4 md:p-6 min-h-[130px] md:min-h-[150px]`}>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{cell.label}</span>
                <p className="text-sm md:text-base font-medium text-ink leading-snug line-clamp-3 max-w-[32ch]">{cell.value}</p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
