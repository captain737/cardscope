import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, ChevronDown, Shuffle } from 'lucide-react';
import CardVisual from './CardVisual';
import CardFacts from './CardFacts';
import BubbleFilters from './BubbleFilters';
import { buildDeck } from '../lib/ranking';
import { useCards } from '../hooks/useCards';
import { CreditCard } from '../types';

// Friendly names for the provider filter; unknown slugs fall back to a
// title-cased version of the slug.
const PROVIDER_LABELS: Record<string, string> = {
  chase: 'Chase', citi: 'Citi', capital_one: 'Capital One', amex: 'American Express',
  wells_fargo: 'Wells Fargo', us_bank: 'U.S. Bank', discover: 'Discover',
  barclays: 'Barclays', bank_of_america: 'Bank of America', synchrony: 'Synchrony',
};
const providerLabel = (p: string) =>
  PROVIDER_LABELS[p] ?? p.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

interface CardCarouselProps {
  watchlist: string[];
  setWatchlist: React.Dispatch<React.SetStateAction<string[]>>;
  filters: string[];
  setFilters: React.Dispatch<React.SetStateAction<string[]>>;
  ownedCards: string[];
  matchMode: boolean;
  matchAnswers?: Record<string, unknown>;
  onBrowseAll: () => void;
}

export default function CardCarousel({
  watchlist, setWatchlist,
  filters: activeFilters, setFilters: setActiveFilters,
  ownedCards, matchMode, matchAnswers, onBrowseAll,
}: CardCarouselProps) {
  const { cards: allCards } = useCards();
  const [cards, setCards] = useState<CreditCard[]>(allCards);
  const [ranked, setRanked] = useState(false);
  const [complement, setComplement] = useState(false);
  const [aboveLimit, setAboveLimit] = useState<CreditCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nonce, setNonce] = useState(0); // bump to force a reshuffle
  const [providerFilter, setProviderFilter] = useState('all');
  const reducedMotion = useReducedMotion();

  // Distinct providers present in the deck, for the filter dropdown.
  const providers = useMemo(
    () => [...new Set(allCards.map((c) => c.provider).filter(Boolean) as string[])].sort(),
    [allCards],
  );

  // Rebuild the deck whenever the inputs to ranking change. Ranked decks
  // are deterministic (best-first, stable); browse decks are shuffled.
  useEffect(() => {
    const pool = providerFilter === 'all' ? allCards : allCards.filter((c) => c.provider === providerFilter);
    const result = buildDeck(pool, activeFilters, ownedCards, matchMode, matchAnswers);
    setCards(result.deck);
    setRanked(result.ranked);
    setComplement(result.complement);
    setAboveLimit(result.aboveAnnualFeeLimit?.map((r) => r.card) || []);
    setCurrentIndex(0);
  }, [allCards, activeFilters, ownedCards, matchMode, matchAnswers, nonce, providerFilter]);

  const nextCard = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  }, [cards.length]);

  const prevCard = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  }, [cards.length]);

  // Arrow keys browse the deck, except while typing in a field.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') prevCard();
      if (e.key === 'ArrowRight') nextCard();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextCard, prevCard]);

  // Shuffle clears filters and re-draws a random browse deck.
  const shuffleCards = useCallback(() => {
    if (activeFilters.length) setActiveFilters([]);
    setNonce((n) => n + 1);
  }, [activeFilters.length, setActiveFilters]);

  const cardTransition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.8 };

  const activeCard = cards[currentIndex];
  const rankLabel = complement ? 'best choice for you' : 'best match';

  return (
    <section className="compare-light relative w-full min-h-screen pt-24 pb-24 flex flex-col items-center overflow-hidden bg-[var(--cl-bg)]">
      {matchMode ? (
        <div className="relative z-20 w-full mt-4 md:mt-6 flex flex-col items-center gap-3 px-4 text-center">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-3xl md:text-4xl text-[var(--cl-ink)]">Your best matches</h2>
          </div>
          <button
            onClick={onBrowseAll}
            className="h-9 px-4 rounded-full bg-transparent border border-[var(--cl-hairline-strong)] flex items-center gap-2 hover:bg-[var(--cl-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 transition-colors text-[var(--cl-muted)] hover:text-[var(--cl-ink)] text-sm font-medium"
          >
            Browse all cards instead
          </button>
        </div>
      ) : (
        <>
          <div className="relative z-20 w-full mt-4 md:mt-6">
            <BubbleFilters activeFilters={activeFilters} onFiltersChange={setActiveFilters} />
          </div>

          <div className="relative z-20 w-full max-w-6xl mx-auto px-4 md:px-6 mt-5 flex justify-end items-center gap-3">
            <div className="relative">
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                aria-label="Filter by card provider"
                className="appearance-none h-10 pl-4 pr-9 rounded-full border border-[var(--cl-hairline-strong)] bg-transparent text-sm font-medium text-[var(--cl-ink)] hover:bg-[var(--cl-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 transition-colors cursor-pointer"
              >
                <option value="all">All providers</option>
                {providers.map((p) => (
                  <option key={p} value={p}>{providerLabel(p)}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--cl-muted)]" />
            </div>
            <button
              onClick={shuffleCards}
              aria-label="Shuffle deck and clear filters"
              className="h-10 px-4 rounded-full bg-transparent border border-[var(--cl-hairline-strong)] flex items-center gap-2 hover:bg-[var(--cl-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 transition-colors text-[var(--cl-ink)]"
            >
              <Shuffle className="w-4 h-4" />
              <span className="text-sm font-medium">Shuffle</span>
            </button>
          </div>
        </>
      )}

      {activeCard ? (
      <>
      {/* Carousel */}
      <div className="relative z-10 w-full h-[360px] md:h-[440px] mt-8 md:mt-10 flex items-center justify-center perspective-[1200px]">
        {/* Navigation Arrows */}
        <button
          onClick={prevCard}
          aria-label="Previous card"
          className="absolute left-3 md:left-[6%] z-30 p-3 rounded-full bg-[var(--cl-bg)] border border-[var(--cl-hairline-strong)] shadow-sm hover:bg-[var(--cl-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 transition-colors text-[var(--cl-muted)] hover:text-[var(--cl-ink)]"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={nextCard}
          aria-label="Next card"
          className="absolute right-3 md:right-[6%] z-30 p-3 rounded-full bg-[var(--cl-bg)] border border-[var(--cl-hairline-strong)] shadow-sm hover:bg-[var(--cl-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 transition-colors text-[var(--cl-muted)] hover:text-[var(--cl-ink)]"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div className="relative w-full h-full flex justify-center items-center transform-style-3d">
          <AnimatePresence initial={false}>
            {cards.map((card, index) => {
              // Calculate circular offset
              let offset = index - currentIndex;
              const total = cards.length;
              if (offset > Math.floor(total / 2)) offset -= total;
              if (offset < -Math.floor(total / 2)) offset += total;

              // Center card plus two on each side: five cards fill the
              // horizontal space that used to sit empty.
              const isVisible = Math.abs(offset) <= 2;
              if (!isVisible) return null;

              const isCenter = offset === 0;
              const depth = Math.abs(offset);

              return (
                <motion.div
                  key={card.id}
                  initial={false}
                  animate={{
                    x: `calc(${offset * 92}% + ${offset * (window.innerWidth < 768 ? 14 : 52)}px)`,
                    scale: isCenter ? 1 : depth === 1 ? 0.85 : 0.72,
                    rotateY: reducedMotion ? 0 : offset * -13,
                    z: isCenter ? 50 : depth === 1 ? 0 : -40,
                    opacity: isCenter ? 1 : depth === 1 ? 0.45 : 0.22,
                    filter: `blur(${isCenter ? 0 : depth === 1 ? 3 : 6}px)`,
                  }}
                  transition={cardTransition}
                  className={`absolute origin-center will-change-transform ${isCenter ? 'z-20 cursor-default' : depth === 1 ? 'z-10 cursor-pointer' : 'z-0 cursor-pointer'}`}
                  onClick={() => {
                    if (offset < 0) prevCard();
                    if (offset > 0) nextCard();
                  }}
                >
                  <CardVisual card={card} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Focused card identity, announced to screen readers on change */}
      <div aria-live="polite" className="relative z-20 mt-8 md:mt-10 px-4 text-center min-h-[5.5rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCard.id}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cl-gold)] mb-1.5">{activeCard.issuer}</p>
            <h1 className="font-display font-semibold text-3xl md:text-4xl text-[var(--cl-ink)] text-balance">
              {activeCard.name}
            </h1>
            {ranked && (
              <p className="mt-2 text-sm font-medium text-[var(--cl-muted)]">
                <span className="text-[var(--cl-gold)] font-semibold">#{currentIndex + 1}</span> {rankLabel}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Facts Section */}
      <div className="relative z-20 w-full mt-4 md:mt-5">
        <CardFacts card={activeCard} watchlist={watchlist} setWatchlist={setWatchlist} />
      </div>

      {/* Data provenance footnote */}
      <p className="relative z-10 font-mono text-xs text-[var(--cl-muted)] tracking-wide mt-12 px-4 text-center">
        {ranked
          ? `${cards.length} ${complement ? 'complementary' : 'matching'} card${cards.length === 1 ? '' : 's'} · ranked best-first`
          : `${cards.length} of ${allCards.length} cards · data crawled daily from issuer sites`}
      </p>
      {matchMode && aboveLimit.length > 0 && (
        <div className="relative z-10 mt-5 w-full max-w-3xl px-4">
          <div className="border-t border-[var(--cl-hairline)] pt-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cl-muted)]">Cards above your selected annual fee limit</p>
            <p className="mt-2 text-sm text-[var(--cl-muted)]">
              {aboveLimit.slice(0, 3).map((card) => card.name).join(' · ')}
            </p>
          </div>
        </div>
      )}
      </>
      ) : (
        <div className="relative z-20 mt-24 md:mt-32 px-6 text-center flex flex-col items-center gap-3">
          <p className="font-display text-2xl md:text-3xl text-[var(--cl-ink)]">No cards match these filters</p>
          <p className="text-sm text-[var(--cl-muted)] max-w-sm">These categories are strict — try removing one to widen the results.</p>
          <button
            onClick={() => { setActiveFilters([]); setProviderFilter('all'); }}
            className="mt-2 h-10 px-5 rounded-full bg-[var(--cl-pill)] text-[var(--cl-pill-ink)] text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
