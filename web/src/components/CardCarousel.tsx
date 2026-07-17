import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, ChevronDown, Sparkles, Plus, X, ArrowUpRight } from 'lucide-react';
import CardVisual from './CardVisual';
import CardFacts from './CardFacts';
import BubbleFilters from './BubbleFilters';
import AISearchBar from './AISearchBar';
import { buildDeck } from '../lib/ranking';
import { describeFilters } from '../lib/filters';
import { fetchAdvisorNote, advisorEnabled } from '../lib/advisor';
import { pushRecentlyViewed } from '../lib/recentlyViewed';
import CardInsightsPanel from './CardInsightsPanel';
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
  // Per-card "why this fits you" bullets from the recommender (match mode).
  const [explanations, setExplanations] = useState<Record<string, string[]>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [providerFilter, setProviderFilter] = useState('all');
  // Landing state: on first load show only the centered search + filters; the
  // deck appears once the user searches or picks a filter.
  const [started, setStarted] = useState(false);
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
    setExplanations(Object.fromEntries((result.results || []).map((r) => [r.card.id, r.explanation])));
    setCurrentIndex(0);
  }, [allCards, activeFilters, ownedCards, matchMode, matchAnswers, providerFilter]);

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

  const cardTransition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.8 };

  const activeCard = cards[currentIndex];
  const filterDetail = describeFilters(activeFilters);
  const rankLabel = filterDetail
    ? `best choice for ${filterDetail}`
    : complement ? 'best choice for you' : 'best match';
  // Results appear once the user has expressed intent — a match, a filter, or
  // a search. Otherwise the page shows just the centered search + filters.
  const showResults = matchMode || started || activeFilters.length > 0;
  // Show the tailored reasoning only in match mode (Find Me a Card results).
  // Rendered as "Fits you because" in the insights panel, not under the name.
  const activeWhy = matchMode && activeCard ? explanations[activeCard.id] : undefined;

  // AI advisor note (Phase 2) for the active best-match card. Only runs when
  // the endpoint is configured; degrades to nothing otherwise.
  const [advisorNote, setAdvisorNote] = useState<string | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  useEffect(() => {
    setAdvisorNote(null);
    setAdvisorLoading(false);
    if (!advisorEnabled || !activeCard || !activeWhy || activeWhy.length === 0) return;
    const card = {
      id: activeCard.id, name: activeCard.name, issuer: activeCard.issuer,
      annualFee: activeCard.facts.annualFee, rewards: activeCard.facts.rewards,
      topPerk: activeCard.facts.topPerk, bonus: activeCard.facts.bonus, tags: activeCard.tags,
    };
    const profile = {
      ownedCardNames: ownedCards.map((id) => allCards.find((c) => c.id === id)?.name).filter(Boolean) as string[],
      spend: matchAnswers?.spend as Record<string, number> | undefined,
      credit: matchAnswers?.credit as string | undefined,
      maxFee: matchAnswers?.maxFee as number | undefined,
      rewardPref: activeFilters.includes('cashback') ? 'cash back' : activeFilters.includes('rewards') ? 'points/miles' : 'no preference',
      whyBullets: activeWhy,
    };
    let cancelled = false;
    setAdvisorLoading(true);
    fetchAdvisorNote(card, profile).then((note) => {
      if (!cancelled) { setAdvisorNote(note); setAdvisorLoading(false); }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCard?.id, matchMode, explanations]);

  // Remember the focused card for the "Recently viewed" rail (Compare page) —
  // only once results are shown, so the hero deck doesn't pollute the list.
  useEffect(() => {
    if (showResults && activeCard) pushRecentlyViewed(activeCard.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCard?.id, showResults]);

  // Landing hero: nothing but the search + filters, centered on the page.
  if (!showResults) {
    return (
      <section className="compare-light relative w-full min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 lg:px-24 bg-[var(--cl-bg)]">
        <div className="w-full max-w-4xl flex flex-col items-center gap-7 mt-6">
          <div className="text-center">
            <h1 className="font-display font-semibold text-4xl md:text-5xl text-[var(--cl-ink)] text-balance">Find what fits you best</h1>
            <p className="mt-3 text-[var(--cl-muted)]">Describe your ideal card, or tap a filter to begin.</p>
          </div>
          <AISearchBar
            submitOnly
            onQueryChange={() => {}}
            onFiltersParsed={setActiveFilters}
            onSubmit={() => setStarted(true)}
          />
          <BubbleFilters
            activeFilters={activeFilters}
            onFiltersChange={(f) => { setActiveFilters(f); setStarted(true); }}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="compare-light relative w-full min-h-screen pt-[clamp(4.25rem,7vh,6.5rem)] pb-[clamp(1.25rem,3vh,2.5rem)] flex flex-col items-center bg-[var(--cl-bg)]">
      {matchMode && (
        <div className="relative z-20 w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 text-center mb-2">
          <h2 className="font-display font-semibold text-3xl md:text-4xl text-[var(--cl-ink)]">Your best matches</h2>
          <button
            onClick={() => { setStarted(true); onBrowseAll(); }}
            className="shrink-0 h-7 px-3 rounded-full bg-transparent border border-[var(--cl-hairline-strong)] flex items-center gap-1.5 hover:bg-[var(--cl-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 transition-colors text-[var(--cl-muted)] hover:text-[var(--cl-ink)] text-xs font-medium"
          >
            Browse all cards instead
          </button>
        </div>
      )}

      {/* Auto-margins center the whole group vertically when it fits, and cleanly
          top-align + scroll (never clip) when the viewport is too short. */}
      <div className="w-full flex flex-col items-center my-auto">
      {activeCard ? (
      <>
      {/* Centered stage: caps its width on large monitors and scales fluidly so
          it fits every desktop height. The whole section is vertically centered
          and grows to scroll only on very short screens (never clips). */}
      <div className="w-full flex flex-col gap-[clamp(1rem,3vh,3rem)] max-w-[105rem] mx-auto">
      {/* Upper: carousel (left) + analysis (right). Fixed (fluid) height on
          desktop so the card sits at the same spot regardless of how tall the
          active card's analysis panel is — keeps positions stable across cards. */}
      <div className="relative z-10 w-full px-[clamp(1rem,3vw,3rem)] grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-[clamp(3rem,6vw,7rem)] items-center lg:h-[clamp(300px,37vh,420px)]">
        {/* Left: carousel (edges fade into the page bg) with the controls
            sitting directly below the main card. */}
        <div className="flex flex-col items-center">
          <div className="relative w-full h-[clamp(210px,27vh,340px)] flex items-center justify-center perspective-[1200px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_14%,#000_86%,transparent)]">
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
                  <CardVisual card={card} variant="fluid" />
                </motion.div>
              );
            })}
          </AnimatePresence>
          </div>
          </div>
          {/* Carousel controls, right below the main card: prev · watchlist ·
              visit · next. Labels reveal on hover. */}
          <div className="shrink-0 -mt-2 flex items-center justify-center gap-3.5">
            <button
              onClick={prevCard}
              aria-label="Previous card"
              className="p-3 rounded-full bg-[var(--cl-bg)] border border-[var(--cl-hairline-strong)] shadow-sm hover:bg-[var(--cl-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 transition-colors text-[var(--cl-muted)] hover:text-[var(--cl-ink)]"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            <div className="group relative flex items-center justify-center">
              <button
                onClick={() => setWatchlist((prev) => (prev.includes(activeCard.id) ? prev.filter((id) => id !== activeCard.id) : [...prev, activeCard.id]))}
                aria-label={watchlist.includes(activeCard.id) ? `Remove ${activeCard.name} from watchlist` : `Add ${activeCard.name} to watchlist`}
                className="p-3 rounded-full bg-[var(--cl-bg)] border border-[var(--cl-hairline-strong)] shadow-sm text-[var(--cl-muted)] hover:text-[var(--cl-ink)] hover:border-[var(--cl-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 transition-colors flex items-center justify-center"
              >
                {watchlist.includes(activeCard.id) ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
              </button>
              <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wider text-[var(--cl-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-150">{watchlist.includes(activeCard.id) ? 'Saved' : 'Watchlist'}</span>
            </div>
            <div className="group relative flex items-center justify-center">
              {activeCard.applyUrl ? (
                <a
                  href={activeCard.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit ${activeCard.name} on the issuer's site`}
                  className="p-3 rounded-full bg-[var(--cl-pill)] text-[var(--cl-pill-ink)] shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/40 transition-opacity flex items-center justify-center"
                >
                  <ArrowUpRight className="w-6 h-6" />
                </a>
              ) : (
                <span aria-hidden="true" title="Application link unavailable" className="p-3 rounded-full bg-[var(--cl-pill)]/30 text-[var(--cl-pill-ink)]/50 flex items-center justify-center cursor-not-allowed">
                  <ArrowUpRight className="w-6 h-6" />
                </span>
              )}
              <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wider text-[var(--cl-gold)] opacity-0 group-hover:opacity-100 transition-opacity duration-150">Visit</span>
            </div>
            <button
              onClick={nextCard}
              aria-label="Next card"
              className="p-3 rounded-full bg-[var(--cl-bg)] border border-[var(--cl-hairline-strong)] shadow-sm hover:bg-[var(--cl-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 transition-colors text-[var(--cl-muted)] hover:text-[var(--cl-ink)]"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </div>
        </div>

        {/* Right: compact analysis */}
        <CardInsightsPanel card={activeCard} whyBullets={activeWhy} />
      </div>

      {/* Lower: card identity + headline facts. Fixed (fluid) height, content
          top-aligned, so the title starts at a constant vertical point and the
          search bar below always begins at the same place across cards. */}
      <div aria-live="polite" className="relative z-20 w-full flex flex-col items-center gap-[clamp(0.75rem,2vh,1.25rem)] px-4 lg:h-[clamp(250px,29vh,320px)] lg:overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCard.id}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex flex-col items-center"
          >
            {/* Card name, centered. Watchlist / Visit actions live in the
                carousel control row beneath the card. */}
            <div className="w-full flex justify-center px-2">
              <div className="text-center">
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cl-gold)] mb-1">{activeCard.issuer}</p>
                <h1 className="font-display font-semibold text-[clamp(1.125rem,1.7vw,1.75rem)] leading-[1.1] text-[var(--cl-ink)] text-balance">{activeCard.name}</h1>
                {ranked && (
                  <p className="mt-1 text-sm font-medium text-[var(--cl-muted)]">
                    <span className="text-[var(--cl-gold)] font-semibold">#{currentIndex + 1}</span> {rankLabel}
                  </p>
                )}
              </div>
            </div>

            {advisorLoading ? (
              <p className="mt-2 flex items-center justify-center gap-2 text-xs text-[var(--cl-muted)]">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-[var(--cl-gold)]" /> Analyzing your wallet…
              </p>
            ) : advisorNote ? (
              <p className="mt-2 max-w-md mx-auto text-sm text-[var(--cl-ink)] leading-relaxed text-center">
                <Sparkles className="inline w-3.5 h-3.5 text-[var(--cl-gold)] mr-1 align-[-0.15em]" />{advisorNote}
              </p>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {/* Headline facts: Annual Fee · Rewards · Sign-up Bonus */}
        <CardFacts card={activeCard} />
      </div>
      </div>

      {/* PARKED FOR THE FUTURE: the "cards above your selected annual fee
          limit" suggestions. Stashed off with `false &&` — the aboveLimit
          data still computes in buildDeck/effect, so re-enabling is just
          deleting the `false &&`. */}
      {false && matchMode && aboveLimit.length > 0 && (
        <div className="relative z-10 mt-5 w-full max-w-3xl px-4">
          <div className="border-t border-[var(--cl-hairline)] pt-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cl-muted)]">Cards above your selected annual fee limit</p>
            <p className="mt-2 text-sm text-[var(--cl-muted)]">
              {aboveLimit.slice(0, 3).map((card, i) => (
                <span key={card.id}>
                  {i > 0 && ' · '}
                  {card.applyUrl ? (
                    <a
                      href={card.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-[var(--cl-hairline-strong)] underline-offset-2 hover:text-[var(--cl-ink)] transition-colors"
                    >
                      {card.name}
                    </a>
                  ) : (
                    card.name
                  )}
                </span>
              ))}
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

      {/* Bottom refine bar: provider (inside the bar) + search + filters.
          Small top gap (less padding before the search bar); the section's
          pb-8 plus the natural bottom slack open the space below it. */}
      {!matchMode && (
        <div className="relative z-20 w-full shrink-0 flex flex-col items-center gap-[clamp(0.75rem,2vh,1.5rem)] mt-[clamp(0.75rem,3vh,2.5rem)]">
          <div className="w-full px-4">
            <AISearchBar
              onQueryChange={(q) => { if (q.trim()) setStarted(true); }}
              onFiltersParsed={setActiveFilters}
              leftSlot={
                <div className="relative flex items-center">
                  <select
                    value={providerFilter}
                    onChange={(e) => setProviderFilter(e.target.value)}
                    aria-label="Filter by card provider"
                    className="appearance-none bg-transparent text-sm font-medium text-[var(--cl-ink)] pl-1 pr-6 py-1 focus:outline-none cursor-pointer max-w-[9rem] truncate"
                  >
                    <option value="all">All providers</option>
                    {providers.map((p) => (
                      <option key={p} value={p}>{providerLabel(p)}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-0 pointer-events-none text-[var(--cl-muted)]" />
                </div>
              }
            />
          </div>
          <BubbleFilters activeFilters={activeFilters} onFiltersChange={setActiveFilters} />
        </div>
      )}
      </div>
    </section>
  );
}
