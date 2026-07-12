import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, Search, Shuffle, Wallet, Bookmark, Check, Minus, ArrowUpRight, Plus } from 'lucide-react';
import { useCards } from '../hooks/useCards';
import CardVisual from './CardVisual';
import { CreditCard } from '../types';
import { cardRewardBullets, leadWithNumber } from '../lib/rewards';
import { aprSections } from '../lib/apr';

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
  // Up to three comparison slots. Starts as a 1v1; the "+" adds a third.
  const [slots, setSlots] = useState<(string | null)[]>([null, null]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | 'watchlist' | 'new' | null>(null);
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

  // Dropping onto the empty middle placeholder materializes the third column
  // with the dragged card (mirrors addSlot + selectCard's 'new' branch).
  const handleDropNew = (e: React.DragEvent) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId) setSlots((prev) => (prev.length >= 3 ? prev : [...prev, cardId]));
  };

  const openSearch = (slot: number | 'watchlist') => {
    setActiveSlot(slot);
    setIsSearchOpen(true);
    setSearchQuery('');
  };

  const selectCard = (cardId: string) => {
    if (activeSlot === 'watchlist') {
      if (!watchlist.includes(cardId)) setWatchlist((prev) => [...prev, cardId]);
    } else if (activeSlot === 'new') {
      setSlots((prev) => (prev.length >= 3 ? prev : [...prev, cardId]));
    } else if (typeof activeSlot === 'number') {
      const i = activeSlot;
      setSlots((prev) => prev.map((s, idx) => (idx === i ? cardId : s)));
    }
    setIsSearchOpen(false);
  };

  // Add a third card: opens search; the new column materializes in the
  // middle once a card is chosen (see selectCard's 'new' branch).
  const addSlot = () => {
    if (slots.length >= 3) return;
    setActiveSlot('new');
    setIsSearchOpen(true);
    setSearchQuery('');
  };

  // X clears the first two slots in place; a third slot is removed outright.
  const removeSlot = (i: number) => {
    setSlots((prev) =>
      i >= 2 ? prev.filter((_, idx) => idx !== i) : prev.map((s, idx) => (idx === i ? null : s)),
    );
  };

  // Shuffle fills every current slot with a distinct random card. Prefers the
  // user's own cards + watchlist, falling back to the full deck.
  const shuffleCards = () => {
    const pool = [...new Set([...ownedCards, ...watchlist])];
    const source = pool.length >= slots.length ? pool : allCards.map((c) => c.id);
    if (source.length < slots.length) return;
    const shuffled = [...source].sort(() => 0.5 - Math.random());
    setSlots((prev) => prev.map((_, i) => shuffled[i]));
  };

  const filteredCards = allCards.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.issuer.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const hasAny = slots.some((s) => s);

  return (
    <div className="compare-light min-h-screen bg-[var(--cl-bg)] pt-24 pb-24 px-4 md:px-8">
      <div className="w-full max-w-[80rem] mx-auto">
        {/* Card rails: the user's own cards, kept separate from the watchlist */}
        <div className="flex flex-col sm:flex-row items-start justify-center gap-6 mb-14">
          {ownedCards.length > 0 && (
            <>
              <Rail
                label="My Cards"
                icon={<Wallet className="w-3.5 h-3.5" />}
                ids={ownedCards}
                allCards={allCards}
                onDragStart={handleDragStart}
                onRemove={(id) => setOwnedCards((prev) => prev.filter((x) => x !== id))}
              />
              <div className="self-stretch hidden sm:flex items-center">
                <div className="w-px h-full min-h-[150px] bg-[var(--cl-hairline)]" />
              </div>
              <div className="w-full h-px sm:hidden bg-[var(--cl-hairline)]" />
            </>
          )}
          <Rail
            label="Watchlist"
            icon={<Bookmark className="w-3.5 h-3.5" />}
            ids={watchlist}
            allCards={allCards}
            onDragStart={handleDragStart}
            onRemove={(id) => setWatchlist((prev) => prev.filter((x) => x !== id))}
            addButton={
              <button
                onClick={() => openSearch('watchlist')}
                className="shrink-0 w-[96px] h-[144px] md:w-[112px] md:h-[168px] rounded-[0.8rem] border-2 border-dashed border-[var(--cl-hairline-strong)] text-[var(--cl-muted)] hover:text-[var(--cl-ink)] hover:border-[var(--cl-ink)] transition-colors flex flex-col items-center justify-center"
              >
                <Plus className="w-6 h-6" strokeWidth={1.5} />
                <span className="text-xs mt-1">Add</span>
              </button>
            }
          />
        </div>

        {/* Shuffle control */}
        <div className="flex justify-end mb-4">
          <button
            onClick={shuffleCards}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--cl-hairline-strong)] px-4 h-10 text-sm font-medium text-[var(--cl-ink)] hover:bg-[var(--cl-panel)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30"
          >
            <Shuffle className="w-4 h-4" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
        </div>

        {/* Editorial comparison: up to three cards */}
        <motion.div
          key={slots.length}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row items-stretch gap-2 md:gap-3"
        >
          <div className="flex-1 min-w-0">
            <CompareColumn
              card={cardAt(0)}
              onDrop={(e) => handleDrop(e, 0)}
              onOpenSearch={() => openSearch(0)}
              onRemove={() => removeSlot(0)}
            />
          </div>

          {/* Middle: the third card, or a card-shaped "add" placeholder */}
          <div className="flex-1 min-w-0">
            {slots.length === 3 ? (
              <CompareColumn
                card={cardAt(2)}
                onDrop={(e) => handleDrop(e, 2)}
                onOpenSearch={() => openSearch(2)}
                onRemove={() => removeSlot(2)}
              />
            ) : (
              <AddCardSlot onClick={addSlot} onDrop={handleDropNew} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <CompareColumn
              card={cardAt(1)}
              onDrop={(e) => handleDrop(e, 1)}
              onOpenSearch={() => openSearch(1)}
              onRemove={() => removeSlot(1)}
            />
          </div>
        </motion.div>

        {!hasAny && (
          <p className="mt-8 text-center text-sm text-[var(--cl-muted)]">
            Pick a card for each side, add a third with +, or hit Shuffle for a random matchup.
          </p>
        )}
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[42vh] pb-4 bg-[var(--cl-ink)]/25 backdrop-blur-sm"
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
      <div className="w-full flex justify-center py-4">
        <button
          onClick={onOpenSearch}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          aria-label="Select a card to compare"
          className="w-[240px] h-[360px] md:w-[280px] md:h-[420px] rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed border-[var(--cl-hairline-strong)] flex flex-col items-center justify-center gap-3 text-[var(--cl-muted)] hover:text-[var(--cl-ink)] hover:border-[var(--cl-ink)]/50 transition-colors"
        >
          <Plus className="w-8 h-8" strokeWidth={1.25} />
          <span className="font-medium text-[var(--cl-ink)]">Select a card</span>
          <span className="text-sm">or drag one from above</span>
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
      className="relative rounded-[2rem] px-6 py-8 md:px-10 md:py-11 bg-[var(--cl-panel)] shadow-[0_20px_50px_-30px_rgba(0,0,0,0.35)]"
    >
      {/* Masthead: identity + controls + product shot */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cl-muted)]">{card.issuer}</p>
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
          <div className="relative w-[92px] h-[138px] hidden sm:block">
            <div className="absolute top-0 left-0 origin-top-left scale-[0.33] pointer-events-none">
              <CardVisual card={card} />
            </div>
          </div>
        </div>
      </div>

      {/* Hero stats */}
      <div className="mt-8 border-y border-[var(--cl-hairline)] divide-y divide-[var(--cl-hairline)]">
        <StatBig value={fee.value} unit={fee.unit} label="Annual Fee" />
        <StatBig value={apr.value} unit={apr.unit} label="APR" />
      </div>

      {/* At-a-glance parity */}
      <ul className="mt-7 space-y-3.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3">
            <ParityIcon state={r.state} />
            <span className={`text-[15px] ${r.state === false ? 'text-[var(--cl-muted)]' : 'text-[var(--cl-ink)]'}`}>
              {r.label}
            </span>
          </li>
        ))}
      </ul>

      {/* Detail spec list */}
      <dl className="mt-8 border-t border-[var(--cl-hairline)]">
        <SpecRow label="Rewards" value={card.facts.rewards} bullets={cardRewardBullets(card.facts)} />
        <SpecRow label="Sign-up bonus" value={leadWithNumber(card.facts.bonus)} />
        <SpecRow label="APR" value={card.facts.apr} sections={aprSections(card.facts)} />
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

// Card-shaped placeholder that adds a third comparison card — click to search,
// or drag a card from a rail straight onto it.
function AddCardSlot({ onClick, onDrop }: { onClick: () => void; onDrop: (e: React.DragEvent) => void }) {
  return (
    <div className="w-full flex justify-center py-4">
      <button
        onClick={onClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        aria-label="Add a third card to compare"
        className="w-[240px] h-[360px] md:w-[280px] md:h-[420px] rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed border-[var(--cl-hairline-strong)] flex flex-col items-center justify-center gap-3 text-[var(--cl-muted)] hover:text-[var(--cl-ink)] hover:border-[var(--cl-ink)]/50 transition-colors"
      >
        <Plus className="w-8 h-8" strokeWidth={1.25} />
        <span className="font-medium text-[var(--cl-ink)]">Add a card</span>
        <span className="text-sm">compare up to three</span>
      </button>
    </div>
  );
}

function StatBig({ value, unit, label }: { value: string; unit: string | null; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-6">
      <span className="font-mono text-5xl md:text-[3.5rem] leading-none tracking-tight text-[var(--cl-ink)] tabular-nums">
        {value}
        {unit && <sup className="text-[0.4em] font-medium ml-1 top-[-0.8em]">{unit}</sup>}
      </span>
      <span className="text-sm text-[var(--cl-muted)] whitespace-nowrap">{label}</span>
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
  sections,
}: {
  label: string;
  value: string;
  bullets?: string[];
  sections?: { label: string; value: string }[];
}) {
  const showBullets = bullets && bullets.length >= 1;
  const showSections = sections && sections.length >= 1;
  return (
    <div className="flex justify-between gap-6 py-3.5 border-b border-[var(--cl-hairline)] last:border-b-0">
      <dt className="shrink-0 pt-0.5 text-[13px] text-[var(--cl-muted)]">{label}</dt>
      <dd className="max-w-[64%] text-right text-[14px] leading-relaxed text-[var(--cl-ink)] [overflow-wrap:anywhere]">
        {showSections ? (
          <dl className="flex flex-col gap-1.5">
            {sections!.map((s) => (
              <div key={s.label} className="flex gap-2 justify-center leading-snug">
                <dt className="font-semibold uppercase tracking-wide text-[var(--cl-muted)] shrink-0">{s.label}:</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        ) : showBullets ? (
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

// --- Card rail -----------------------------------------------------------

function Rail({
  label,
  icon,
  ids,
  allCards,
  onDragStart,
  onRemove,
  addButton,
}: {
  label: string;
  icon: React.ReactNode;
  ids: string[];
  allCards: CreditCard[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onRemove: (id: string) => void;
  addButton?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-6 min-w-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cl-muted)] flex items-center gap-1.5">
        <span className="text-[var(--cl-gold)]">{icon}</span> {label}
      </span>
      <div className="flex gap-4 overflow-x-auto pt-2 pb-2 hide-scrollbar max-w-full">
        {ids.map((id) => {
          const card = allCards.find((c) => c.id === id);
          if (!card) return null;
          return (
            <div
              key={id}
              draggable
              onDragStart={(e) => onDragStart(e, id)}
              className="shrink-0 relative w-[96px] h-[144px] md:w-[112px] md:h-[168px] cursor-grab active:cursor-grabbing group"
            >
              {/* Clip the card art (and its heavy drop-shadow) to a neat,
                  card-shaped rectangle so it sits flat in the rail. */}
              <div className="absolute inset-0 overflow-hidden rounded-[0.7rem]">
                <div className="absolute top-0 left-0 pointer-events-none origin-top-left scale-[0.4]">
                  <CardVisual card={card} />
                </div>
              </div>
              <button
                onClick={() => onRemove(id)}
                aria-label={`Remove ${card.name}`}
                className="absolute top-1.5 right-1.5 bg-[var(--cl-bg)] text-[var(--cl-muted)] hover:text-[var(--cl-ink)] p-1 rounded-full border border-[var(--cl-hairline-strong)] shadow-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity z-30"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        {addButton}
      </div>
    </div>
  );
}
