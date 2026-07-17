import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, Search, Shuffle, Wallet, Bookmark, Check, Minus, ArrowUpRight, Plus, ChevronDown, ChevronLeft } from 'lucide-react';
import { useCards } from '../hooks/useCards';
import CardVisual from './CardVisual';
import { CreditCard } from '../types';
import { cardRewardBullets, leadWithNumber } from '../lib/rewards';
import { cardMatchesQuery } from '../lib/cardSearch';

interface CompareProps {
  watchlist: string[];
  setWatchlist: React.Dispatch<React.SetStateAction<string[]>>;
  ownedCards: string[];
  setOwnedCards: React.Dispatch<React.SetStateAction<string[]>>;
}

// --- Fact parsing --------------------------------------------------------
// The crawled facts are strings ("$95", "Variable APR 19.99%-28.99%",
// "None"); the editorial layout wants a bare numeral for the two hero
// stats and a clean yes/no/unknown for the parity checklist. `null` means
// "we genuinely don't know" (issuer-site fallbacks) and renders as a dash
// rather than a misleading check or cross.

type Tri = true | false | null;

function feeParts(fee: string): { value: string; unit: string | null } {
  const m = fee.match(/\$\s*([\d,]+)/);
  if (!m) return { value: '—', unit: null };
  return { value: m[1], unit: '$' };
}

function aprParts(apr: string): { value: string; unit: string | null } {
  const found = apr.match(/\d+\.?\d*%/g);
  if (!found) return { value: '—', unit: null };
  const high = Math.max(...found.map((n) => parseFloat(n)));
  return { value: String(high), unit: '%' };
}

function parity(card: CreditCard): { label: string; state: Tri }[] {
  const f = card.facts;
  const noFee: Tri = /see issuer|not specified/i.test(f.annualFee) ? null : /\$\s*0\b/.test(f.annualFee);
  const rewards: Tri = /see issuer/i.test(f.rewards) ? null : f.rewards.trim().length > 0;
  const bonus: Tri = /see issuer/i.test(f.bonus) ? null : !/^(none|no\b|n\/a)/i.test(f.bonus.trim());
  const ff = f.foreignFee.toLowerCase();
  const noForeign: Tri = /not specified|see issuer/.test(ff)
    ? null
    : /none|no foreign|\b0%|\$?0\b/.test(ff);
  return [
    { label: 'No annual fee', state: noFee },
    { label: 'Rewards on purchases', state: rewards },
    { label: 'Sign-up bonus', state: bonus },
    { label: 'No foreign transaction fee', state: noForeign },
  ];
}

export default function Compare({ watchlist, setWatchlist, ownedCards, setOwnedCards }: CompareProps) {
  const { cards: allCards } = useCards();
  // Exactly two comparison slots.
  const [slots, setSlots] = useState<(string | null)[]>([null, null]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | 'watchlist' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const reduce = useReducedMotion();

  const cardAt = (i: number) => allCards.find((c) => c.id === slots[i]);

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('cardId', cardId);
  };

  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId) setSlots((prev) => prev.map((s, idx) => (idx === i ? cardId : s)));
  };

  const openSearch = (slot: number | 'watchlist') => {
    setActiveSlot(slot);
    setIsSearchOpen(true);
    setSearchQuery('');
  };

  const selectCard = (cardId: string) => {
    if (activeSlot === 'watchlist') {
      if (!watchlist.includes(cardId)) setWatchlist((prev) => [...prev, cardId]);
    } else if (typeof activeSlot === 'number') {
      const i = activeSlot;
      setSlots((prev) => prev.map((s, idx) => (idx === i ? cardId : s)));
    }
    setIsSearchOpen(false);
  };

  // Clears a slot in place rather than removing it — there are always exactly two.
  const removeSlot = (i: number) => {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? null : s)));
  };

  // Shuffle fills both slots with distinct random cards. Prefers the
  // user's own cards + watchlist, falling back to the full deck.
  const shuffleCards = () => {
    const pool = [...new Set([...ownedCards, ...watchlist])];
    const source = pool.length >= slots.length ? pool : allCards.map((c) => c.id);
    if (source.length < slots.length) return;
    const shuffled = [...source].sort(() => 0.5 - Math.random());
    setSlots((prev) => prev.map((_, i) => shuffled[i]));
  };

  // Empty query = browse mode: show the whole deck rather than nothing.
  const filteredCards = searchQuery.trim()
    ? allCards.filter((c) => cardMatchesQuery(c, searchQuery))
    : allCards;

  const hasAny = slots.some((s) => s);

  const watchlistAddMini = (
    <button
      onClick={() => openSearch('watchlist')}
      className="shrink-0 w-[115px] h-[73px] md:w-[134px] md:h-[85px] rounded-[0.6rem] border-2 border-dashed border-[var(--cl-hairline-strong)] text-[var(--cl-muted)] hover:text-[var(--cl-ink)] hover:border-[var(--cl-ink)] transition-colors flex flex-col items-center justify-center"
    >
      <Plus className="w-5 h-5" strokeWidth={1.5} />
      <span className="text-[11px] mt-0.5">Add</span>
    </button>
  );

  return (
    <div className="compare-light min-h-screen overflow-x-clip bg-[var(--cl-bg)] pt-24 pb-24 px-4 md:px-8">
      {/* Mobile / tablet: horizontal wallet rails on top. On desktop these
          live as vertical drawers on the page edges instead. */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Rail
          label="My Cards"
          icon={<Wallet className="w-3.5 h-3.5" />}
          ids={ownedCards}
          allCards={allCards}
          onDragStart={handleDragStart}
          onRemove={(id) => setOwnedCards((prev) => prev.filter((x) => x !== id))}
          emptyHint="Cards you own will show here."
        />
        <Rail
          label="Watchlist"
          icon={<Bookmark className="w-3.5 h-3.5" />}
          ids={watchlist}
          allCards={allCards}
          onDragStart={handleDragStart}
          onRemove={(id) => setWatchlist((prev) => prev.filter((x) => x !== id))}
          addButton={watchlistAddMini}
        />
      </div>

      {/* Desktop: My Cards + Watchlist drawers docked to the left screen edge,
          stacked vertically. The comparison stage is offset right to clear them. */}
      <div className="hidden lg:flex fixed left-0 top-[4.5rem] bottom-4 z-30 w-[178px] flex-col gap-3">
        <VerticalRail
          label="My Cards"
          icon={<Wallet className="w-3.5 h-3.5" />}
          ids={ownedCards}
          allCards={allCards}
          onDragStart={handleDragStart}
          onRemove={(id) => setOwnedCards((prev) => prev.filter((x) => x !== id))}
          emptyHint="Cards you own show here."
        />
        <VerticalRail
          label="Watchlist"
          icon={<Bookmark className="w-3.5 h-3.5" />}
          ids={watchlist}
          allCards={allCards}
          onDragStart={handleDragStart}
          onRemove={(id) => setWatchlist((prev) => prev.filter((x) => x !== id))}
          addButton={watchlistAddMini}
        />
      </div>

      <div className="w-full max-w-[100rem] mx-auto lg:pl-[190px]">
        <div className="min-w-0">
          {/* Shuffle control */}
          <div className="flex justify-end mb-2">
            <button
              onClick={shuffleCards}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--cl-hairline-strong)] px-4 h-10 text-sm font-medium text-[var(--cl-ink)] hover:bg-[var(--cl-panel)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30"
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Shuffle</span>
            </button>
          </div>

          {!hasAny ? (
            /* Empty stage: two hand-placed dashed slots waiting for cards. */
            <div className="flex flex-col xl:flex-row items-center justify-center gap-10 xl:gap-8 py-14 min-h-[68vh] xl:perspective-midrange">
              <TiltedSlot
                tilt="-rotate-[5deg] xl:rotate-[10deg] xl:rotate-y-[15deg]"
                onClick={() => openSearch(0)}
                onDrop={(e) => handleDrop(e, 0)}
              />
              <TiltedSlot
                tilt="rotate-[4deg] xl:-rotate-[9deg] xl:-rotate-y-[14deg]"
                onClick={() => openSearch(1)}
                onDrop={(e) => handleDrop(e, 1)}
              />
            </div>
          ) : (
            /* Editorial comparison: two cards side by side */
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-x-12 lg:gap-x-20 md:items-stretch md:[grid-template-rows:repeat(9,auto)]"
            >
              <CompareColumn
                card={cardAt(0)}
                onDrop={(e) => handleDrop(e, 0)}
                onOpenSearch={() => openSearch(0)}
                onRemove={() => removeSlot(0)}
              />
              <CompareColumn
                card={cardAt(1)}
                onDrop={(e) => handleDrop(e, 1)}
                onOpenSearch={() => openSearch(1)}
                onRemove={() => removeSlot(1)}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[30vh] pb-4 bg-[var(--cl-ink)]/25 backdrop-blur-sm"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-[var(--cl-bg)] border border-[var(--cl-hairline)] rounded-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col max-h-[70vh]"
            >
              <div className="p-4 border-b border-[var(--cl-hairline)] flex items-center gap-3">
                <Search className="w-5 h-5 text-[var(--cl-muted)]" />
                <input
                  type="text"
                  placeholder="Search for a card..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none flex-1 text-[var(--cl-ink)] placeholder-[var(--cl-muted)] text-lg"
                  autoFocus
                />
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="text-[var(--cl-muted)] hover:text-[var(--cl-ink)] p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[256px] overflow-y-auto p-2">
                {filteredCards.length > 0 ? (
                  filteredCards.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCard(c.id)}
                      className="w-full text-left p-4 hover:bg-[var(--cl-panel)] rounded-xl flex items-center gap-4 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-lg ${c.gradient} shadow-inner shrink-0`} />
                      <div className="min-w-0">
                        <div className="text-[var(--cl-ink)] font-medium text-lg truncate">{c.name}</div>
                        <div className="text-[var(--cl-muted)] text-sm uppercase tracking-wider">{c.issuer}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-12 text-center text-[var(--cl-muted)]">No cards found matching your search.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Empty stage ----------------------------------------------------------

// A hand-placed dashed card slot: tilted at rest, it straightens under the
// pointer as a drop/click affordance.
function TiltedSlot({ tilt, onClick, onDrop }: { tilt: string; onClick: () => void; onDrop: (e: React.DragEvent) => void }) {
  return (
    <button
      onClick={onClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      aria-label="Select a card to compare"
      className={`${tilt} hover:rotate-0 hover:rotate-y-0 w-[clamp(280px,26vw,500px)] aspect-[400/252] rounded-[1.25rem] border-2 border-dashed border-[var(--cl-hairline-strong)] flex flex-col items-center justify-center gap-2.5 xl:gap-4 text-[var(--cl-muted)] hover:text-[var(--cl-ink)] hover:border-[var(--cl-ink)]/50 transition-all duration-300 ease-out motion-reduce:transition-none shrink-0`}
    >
      <Plus className="w-7 h-7 xl:w-10 xl:h-10" strokeWidth={1.25} />
      <span className="font-medium text-[var(--cl-ink)] xl:text-lg">Select a card</span>
      <span className="text-sm">or drag one from the side</span>
    </button>
  );
}

// --- Comparison column ---------------------------------------------------

function CompareColumn({
  card,
  onDrop,
  onOpenSearch,
  onRemove,
}: {
  card?: CreditCard;
  onDrop: (e: React.DragEvent) => void;
  onOpenSearch: () => void;
  onRemove: () => void;
}) {
  if (!card) {
    return (
      <div className="md:row-span-full flex justify-center py-4 md:py-0">
        <button
          onClick={onOpenSearch}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          aria-label="Select a card to compare"
          className="w-[320px] h-[202px] md:w-full md:h-full rounded-[1.25rem] border-2 border-dashed border-[var(--cl-hairline-strong)] flex flex-col items-center justify-center gap-2.5 text-[var(--cl-muted)] hover:text-[var(--cl-ink)] hover:border-[var(--cl-ink)]/50 transition-colors"
        >
          <Plus className="w-7 h-7" strokeWidth={1.25} />
          <span className="font-medium text-[var(--cl-ink)]">Select a card</span>
          <span className="text-sm">or drag one from the side</span>
        </button>
      </div>
    );
  }

  const fee = feeParts(card.facts.annualFee);
  const apr = aprParts(card.facts.apr);
  const rows = parity(card);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="md:row-span-full flex flex-col md:grid md:grid-rows-subgrid relative rounded-[2rem] px-6 py-8 md:px-10 md:py-11 bg-[var(--cl-panel)] shadow-[0_20px_50px_-30px_rgba(0,0,0,0.35)]"
    >
      {/* Masthead: identity + controls + product shot */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cl-muted)]">{card.issuer}</p>
          <h2 className="mt-2 font-display font-semibold text-[1.75rem] md:text-[2.1rem] text-[var(--cl-ink)] leading-[1.1] text-balance">
            {card.name}
          </h2>
          <div className="mt-4 h-[3px] w-12 rounded-full bg-[var(--cl-gold)]" />
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="flex items-center">
            <button
              onClick={onOpenSearch}
              className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cl-muted)] hover:text-[var(--cl-ink)] px-2 py-1 transition-colors"
            >
              Change
            </button>
            <button
              onClick={onRemove}
              aria-label={`Remove ${card.name}`}
              className="p-1.5 rounded-full text-[var(--cl-muted)] hover:text-[var(--cl-ink)] hover:bg-[var(--cl-hairline)]/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative w-[126px] h-[80px] hidden md:block">
            <div className="absolute top-0 left-0 origin-top-left scale-[0.3] pointer-events-none">
              <CardVisual card={card} />
            </div>
          </div>
        </div>
      </div>

      {/* Hero stats: fee + APR share one row */}
      <div className="mt-8 grid grid-cols-2 divide-x divide-[var(--cl-hairline)] border-y border-[var(--cl-hairline)]">
        <StatBig value={fee.value} unit={fee.unit} label="Annual Fee" />
        <StatBig value={apr.value} unit={apr.unit} label="APR" />
      </div>

      {/* At-a-glance parity, two columns */}
      <ul className="mt-7 grid grid-cols-2 gap-x-4 gap-y-3.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2.5">
            <ParityIcon state={r.state} />
            <span className={`text-[14px] ${r.state === false ? 'text-[var(--cl-muted)]' : 'text-[var(--cl-ink)]'}`}>
              {r.label}
            </span>
          </li>
        ))}
      </ul>

      {/* Detail spec list. `contents` keeps each row as its own subgrid
          track (aligned with the other card) while still grouping them
          under one <dl> for markup semantics. APR is dropped here since
          the hero stat above already covers it. */}
      <dl className="contents">
        <SpecRow label="Rewards" value={card.facts.rewards} bullets={cardRewardBullets(card.facts)} />
        <SpecRow label="Sign-up bonus" value={leadWithNumber(card.facts.bonus)} />
        <SpecRow label="Foreign fee" value={card.facts.foreignFee} />
        <SpecRow label="Best for" value={card.facts.bestFor} />
        <SpecRow label="Credit needed" value={card.facts.creditNeeded} />
      </dl>

      {/* CTA */}
      <div className="mt-9">
        {card.applyUrl ? (
          <a
            href={card.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--cl-pill)] text-[var(--cl-pill-ink)] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cl-panel)]"
          >
            Visit site <ArrowUpRight className="w-4 h-4" />
          </a>
        ) : (
          <span className="text-[11px] uppercase tracking-wider text-[var(--cl-muted)]">Link unavailable</span>
        )}
      </div>
    </div>
  );
}

function StatBig({ value, unit, label }: { value: string; unit: string | null; label: string }) {
  return (
    <div className="flex flex-col gap-1 py-6 px-4 first:pl-0 last:pr-0">
      <span className="font-mono text-4xl md:text-[2.75rem] leading-none tracking-tight text-[var(--cl-ink)] tabular-nums">
        {value}
        {unit && <sup className="text-[0.4em] font-medium ml-1 top-[-0.8em]">{unit}</sup>}
      </span>
      <span className="text-xs uppercase tracking-wide text-[var(--cl-muted)]">{label}</span>
    </div>
  );
}

function ParityIcon({ state }: { state: Tri }) {
  if (state === true) return <Check className="w-[18px] h-[18px] shrink-0 text-[var(--cl-ink)]" strokeWidth={2.5} />;
  if (state === false) return <X className="w-[18px] h-[18px] shrink-0 text-[var(--cl-muted)]" strokeWidth={2.5} />;
  return <Minus className="w-[18px] h-[18px] shrink-0 text-[var(--cl-hairline-strong)]" strokeWidth={2.5} />;
}

function SpecRow({
  label,
  value,
  bullets,
}: {
  label: string;
  value: string;
  bullets?: string[];
}) {
  const showBullets = bullets && bullets.length >= 1;
  return (
    <div className="flex justify-between gap-6 py-3.5 border-[var(--cl-hairline)] border-b last:border-b-0 first:mt-8 first:border-t">
      <dt className="shrink-0 pt-0.5 text-[13px] text-[var(--cl-muted)]">{label}</dt>
      <dd className="max-w-[64%] text-right text-[14px] leading-relaxed text-[var(--cl-ink)] [overflow-wrap:anywhere]">
        {showBullets ? (
          <ul className="flex flex-col gap-1.5 text-left">
            {bullets!.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="mt-[0.5em] h-1 w-1 rounded-full bg-[var(--cl-gold)] shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

// --- Mini card thumb ------------------------------------------------------
// Landscape thumbnail of the real card art, draggable into a slot.

function MiniCard({
  card,
  onDragStart,
  onRemove,
}: {
  card: CreditCard;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      className="shrink-0 relative w-[115px] h-[73px] md:w-[134px] md:h-[85px] cursor-grab active:cursor-grabbing group"
    >
      {/* Clip the card art (and its heavy drop-shadow) to a neat, card-shaped
          rectangle so it sits flat in the rail. */}
      <div className="absolute inset-0 overflow-hidden rounded-[0.6rem]">
        <div className="absolute top-0 left-0 pointer-events-none origin-top-left scale-[0.32]">
          <CardVisual card={card} />
        </div>
      </div>
      <button
        onClick={() => onRemove(card.id)}
        aria-label={`Remove ${card.name}`}
        className="absolute top-1 right-1 bg-[var(--cl-bg)] text-[var(--cl-muted)] hover:text-[var(--cl-ink)] p-1 rounded-full border border-[var(--cl-hairline-strong)] shadow-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity z-30"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// --- Vertical wallet drawer (desktop) --------------------------------------
// Docked flush to the left screen edge (flat left, rounded right). Fills its
// share of the stacked sidebar when open; collapses to a slim tab that yields
// its height to its sibling.

function VerticalRail({
  label,
  icon,
  ids,
  allCards,
  onDragStart,
  onRemove,
  addButton,
  emptyHint,
}: {
  label: string;
  icon: React.ReactNode;
  ids: string[];
  allCards: CreditCard[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onRemove: (id: string) => void;
  addButton?: React.ReactNode;
  emptyHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const known = ids.filter((id) => allCards.some((c) => c.id === id));

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-label={`Expand ${label}`}
        className="shrink-0 flex flex-row items-center justify-between gap-2 rounded-r-2xl border border-l-0 border-[var(--cl-hairline)] bg-[var(--cl-panel)]/40 pl-4 pr-2.5 py-3 text-[var(--cl-muted)] hover:text-[var(--cl-ink)] hover:bg-[var(--cl-panel)] transition-colors"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-[var(--cl-gold)]">{icon}</span> {label} ({known.length})
        </span>
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-r-2xl border border-l-0 border-[var(--cl-hairline)] bg-[var(--cl-panel)]/40 pl-4 pr-3 py-3">
      <div className="flex items-center justify-between gap-1 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cl-muted)] flex items-center gap-1.5 min-w-0">
          <span className="text-[var(--cl-gold)] shrink-0">{icon}</span>
          <span className="truncate">{label}</span>
          <span className="text-[var(--cl-muted)]/70 normal-case tracking-normal shrink-0">({known.length})</span>
        </span>
        <button
          onClick={() => setOpen(false)}
          aria-expanded
          aria-label={`Collapse ${label}`}
          className="p-1 rounded-full text-[var(--cl-muted)] hover:text-[var(--cl-ink)] hover:bg-[var(--cl-hairline)]/60 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex-1 min-h-0 flex flex-col items-center gap-3 overflow-y-auto hide-scrollbar">
        {known.map((id) => {
          const card = allCards.find((c) => c.id === id)!;
          return <MiniCard key={id} card={card} onDragStart={onDragStart} onRemove={onRemove} />;
        })}
        {addButton}
        {known.length === 0 && !addButton && (
          <p className="text-xs text-[var(--cl-muted)] py-8 px-1 text-center">{emptyHint || 'Nothing here yet.'}</p>
        )}
      </div>
    </div>
  );
}

// --- Horizontal card rail (mobile wallets + recently-viewed tray) -----------

function Rail({
  label,
  icon,
  ids,
  allCards,
  onDragStart,
  onRemove,
  addButton,
  emptyHint,
}: {
  label: string;
  icon: React.ReactNode;
  ids: string[];
  allCards: CreditCard[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onRemove: (id: string) => void;
  addButton?: React.ReactNode;
  emptyHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const known = ids.filter((id) => allCards.some((c) => c.id === id));
  return (
    <div className="rounded-2xl border border-[var(--cl-hairline)] bg-[var(--cl-panel)]/40 px-4 py-3 min-w-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cl-muted)] flex items-center gap-1.5">
          <span className="text-[var(--cl-gold)]">{icon}</span> {label}
          <span className="text-[var(--cl-muted)]/70 normal-case tracking-normal">({known.length})</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--cl-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex gap-3.5 overflow-x-auto pt-3 pb-1 hide-scrollbar max-w-full">
              {known.map((id) => {
                const card = allCards.find((c) => c.id === id)!;
                return <MiniCard key={id} card={card} onDragStart={onDragStart} onRemove={onRemove} />;
              })}
              {addButton}
              {known.length === 0 && !addButton && (
                <p className="text-sm text-[var(--cl-muted)] py-6 px-1">{emptyHint || 'Nothing here yet.'}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
