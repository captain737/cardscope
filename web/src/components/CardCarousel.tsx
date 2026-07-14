import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, ChevronDown, Shuffle, Sparkles, Plus, X, ArrowUpRight } from 'lucide-react';
import CardVisual from './CardVisual';
import CardFacts from './CardFacts';
import BubbleFilters from './BubbleFilters';
import AISearchBar from './AISearchBar';
import { buildDeck } from '../lib/ranking';
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

// Rank a reason so the two most substantive ones lead: a concrete reward
// rate or complementarity beats the generic fee-fit / approval lines.
function reasonRank(line: string): number {
  if (/^Strong /.test(line) || /^Complements/.test(line)) return 3;
  if (/^Adds meaningful|^Keeps costs|^Supports credit/.test(line)) return 2;
  if (/^Fits your \$/.test(line)) return 1;
  return 0; // approval language
}

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
  const [nonce, setNonce] = useState(0); // bump to force a reshuffle
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
  // Results appear once the user has expressed intent — a match, a filter, or
  // a search. Otherwise the page shows just the centered search + filters.
  const showResults = matchMode || started || activeFilters.length > 0;
  // Show the tailored reasoning only in match mode (Find Me a Card results).
  const activeWhy = matchMode && activeCard ? explanations[activeCard.id] : undefined;
  // The two strongest reasons, shown as centered bullets under the rank badge.
  const topReasons = (activeWhy ?? []).slice().sort((a, b) => reasonRank(b) - reasonRank(a)).slice(0, 2);

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
      <section className="compare-light relative w-full min-h-screen flex flex-col items-center justify-center px-4 bg-[var(--cl-bg)]">
        <div className="w-full max-w-2xl flex flex-col items-center gap-7 -mt-16">
          <div className="text-center">
            <h1 className="font-display font-semibold text-4xl md:text-5xl text-[var(--cl-ink)] text-balance">Find what fits you best</h1>
            <p className="mt-3 text-[var(--cl-muted)]">Describe your ideal card, or tap a filter to begin.</p>
          </div>
          <AISearchBar
            onQueryChange={(q) => { if (q.trim()) setStarted(true); }}
            onFiltersParsed={(f) => { setActiveFilters(f); setStarted(true); }}
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
    <section className="compare-light relative w-full min-h-screen pt-24 pb-24 flex flex-col items-center overflow-hidden bg-[var(--cl-bg)]">
      {matchMode && (
        <div className="relative z-20 w-full flex flex-col items-center gap-3 px-4 text-center mb-2">
          <h2 className="font-display font-semibold text-3xl md:text-4xl text-[var(--cl-ink)]">Your best matches</h2>
          <button
            onClick={() => { setStarted(true); onBrowseAll(); }}
            className="h-9 px-4 rounded-full bg-transparent border border-[var(--cl-hairline-strong)] flex items-center gap-2 hover:bg-[var(--cl-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 transition-colors text-[var(--cl-muted)] hover:text-[var(--cl-ink)] text-sm font-medium"
          >
            Browse all cards instead
          </button>
        </div>
      )}

      {activeCard ? (
      <>
      {/* Upper: card carousel (left) + full analysis (right) */}
      <div className="relative z-10 w-full max-w-7xl px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Navigation arrows at the section edges, aligned to the card row */}
        <button
          onClick={prevCard}
          aria-label="Previous card"
          className="hidden md:flex absolute left-0 top-[170px] lg:top-[210px] -translate-y-1/2 z-30 p-3 rounded-full bg-[var(--cl-bg)] border border-[var(--cl-hairline-strong)] shadow-sm hover:bg-[var(--cl-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 transition-colors text-[var(--cl-muted)] hover:text-[var(--cl-ink)]"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextCard}
          aria-label="Next card"
          className="hidden md:flex absolute right-0 top-[170px] lg:top-[210px] -translate-y-1/2 z-30 p-3 rounded-full bg-[var(--cl-bg)] border border-[var(--cl-hairline-strong)] shadow-sm hover:bg-[var(--cl-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 transition-colors text-[var(--cl-muted)] hover:text-[var(--cl-ink)]"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Left: card carousel */}
        <div className="relative h-[340px] md:h-[420px] flex items-center justify-center perspective-[1200px] overflow-hidden">
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

        {/* Right: full analysis, always expanded */}
        <CardInsightsPanel
          card={activeCard}
          allCards={allCards}
          onSelectCard={(id) => {
            const idx = cards.findIndex((c) => c.id === id);
            if (idx >= 0) setCurrentIndex(idx);
          }}
        />
      </div>

      {/* Lower: card identity + actions + headline facts */}
      <div aria-live="polite" className="relative z-20 w-full mt-10 md:mt-12 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCard.id}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cl-gold)] mb-1.5">{activeCard.issuer}</p>
            <h1 className="font-display font-semibold text-3xl md:text-4xl text-[var(--cl-ink)] text-balance">{activeCard.name}</h1>
            {ranked && (
              <p className="mt-2 text-sm font-medium text-[var(--cl-muted)]">
                <span className="text-[var(--cl-gold)] font-semibold">#{currentIndex + 1}</span> {rankLabel}
              </p>
            )}
            {activeWhy && activeWhy.length > 0 && (
              <ul className="mt-3 flex flex-col items-center gap-1.5">
                {topReasons.map((line, i) => (
                  <li key={i} className="flex items-baseline justify-center gap-2 text-sm text-[var(--cl-ink)]">
                    <span aria-hidden className="h-1 w-1 rounded-full bg-[var(--cl-gold)] shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
            {advisorLoading ? (
              <p className="mt-2.5 flex items-center justify-center gap-2 text-xs text-[var(--cl-muted)]">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-[var(--cl-gold)]" /> Analyzing your wallet…
              </p>
            ) : advisorNote ? (
              <p className="mt-2.5 max-w-md mx-auto text-sm text-[var(--cl-ink)] leading-relaxed">
                <Sparkles className="inline w-3.5 h-3.5 text-[var(--cl-gold)] mr-1 align-[-0.15em]" />{advisorNote}
              </p>
            ) : null}

            {/* Watchlist + Visit */}
            <div className="mt-5 flex items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => setWatchlist((prev) => (prev.includes(activeCard.id) ? prev.filter((id) => id !== activeCard.id) : [...prev, activeCard.id]))}
                  aria-label={watchlist.includes(activeCard.id) ? `Remove ${activeCard.name} from watchlist` : `Add ${activeCard.name} to watchlist`}
                  className="w-11 h-11 rounded-full bg-transparent border border-[var(--cl-hairline-strong)] text-[var(--cl-muted)] hover:text-[var(--cl-ink)] hover:border-[var(--cl-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 transition-colors flex items-center justify-center"
                >
                  {watchlist.includes(activeCard.id) ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cl-muted)]">{watchlist.includes(activeCard.id) ? 'Saved' : 'Watchlist'}</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                {activeCard.applyUrl ? (
                  <a
                    href={activeCard.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${activeCard.name} on the issuer's site`}
                    className="w-11 h-11 rounded-full bg-[var(--cl-pill)] text-[var(--cl-pill-ink)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/40 transition-opacity flex items-center justify-center"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                ) : (
                  <span aria-hidden="true" title="Application link unavailable" className="w-11 h-11 rounded-full bg-[var(--cl-pill)]/30 text-[var(--cl-pill-ink)]/50 flex items-center justify-center cursor-not-allowed">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                )}
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cl-gold)]">Visit</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Headline facts: Annual Fee · Rewards · Sign-up Bonus */}
        <div className="mt-8">
          <CardFacts card={activeCard} />
        </div>
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

      {/* Persistent refine bar at the bottom: search + filters + provider/shuffle */}
      {!matchMode && (
        <div className="relative z-20 w-full mt-16 flex flex-col items-center gap-5">
          <div className="w-full px-4">
            <AISearchBar onQueryChange={(q) => { if (q.trim()) setStarted(true); }} onFiltersParsed={setActiveFilters} />
          </div>
          <BubbleFilters activeFilters={activeFilters} onFiltersChange={setActiveFilters} />
          <div className="flex items-center gap-3">
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
        </div>
      )}
    </section>
  );
}
