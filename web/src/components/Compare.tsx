import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, Search, Shuffle, Wallet, Bookmark } from 'lucide-react';
import { useCards } from '../hooks/useCards';
import CardVisual from './CardVisual';
import { CreditCard } from '../types';

interface CompareProps {
  watchlist: string[];
  setWatchlist: React.Dispatch<React.SetStateAction<string[]>>;
  ownedCards: string[];
  setOwnedCards: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function Compare({ watchlist, setWatchlist, ownedCards, setOwnedCards }: CompareProps) {
  const { cards: allCards } = useCards();
  const [leftCardId, setLeftCardId] = useState<string | null>(null);
  const [rightCardId, setRightCardId] = useState<string | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<'left' | 'right' | 'watchlist' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const leftCard = allCards.find(c => c.id === leftCardId);
  const rightCard = allCards.find(c => c.id === rightCardId);

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('cardId', cardId);
  };

  const handleDrop = (e: React.DragEvent, slot: 'left' | 'right') => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId) {
      if (slot === 'left') setLeftCardId(cardId);
      else setRightCardId(cardId);
    }
  };

  const openSearch = (slot: 'left' | 'right' | 'watchlist') => {
    setActiveSlot(slot);
    setIsSearchOpen(true);
    setSearchQuery('');
  };

  const selectCard = (cardId: string) => {
    if (activeSlot === 'left') setLeftCardId(cardId);
    if (activeSlot === 'right') setRightCardId(cardId);
    if (activeSlot === 'watchlist') {
      if (!watchlist.includes(cardId)) {
        setWatchlist(prev => [...prev, cardId]);
      }
    }
    setIsSearchOpen(false);
  };

  // Draw a random 1v1: prefer the user's own cards + watchlist as the
  // pool, falling back to the full deck so Shuffle always does something.
  const shuffleCards = () => {
    const pool = [...new Set([...ownedCards, ...watchlist])];
    const source = pool.length >= 2 ? pool : allCards.map(c => c.id);
    if (source.length < 2) return;
    const shuffled = [...source].sort(() => 0.5 - Math.random());
    setLeftCardId(shuffled[0]);
    setRightCardId(shuffled[1]);
  };

  const filteredCards = allCards.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.issuer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-20 pb-16 flex flex-col items-center px-4 md:px-6 relative">
      {/* Background ambient light */}
      <div className="absolute inset-0 pointer-events-none flex justify-center items-center opacity-20">
        <div className="w-[1000px] h-[500px] bg-primary/10 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-6xl relative z-10 flex flex-col items-center">
        {/* Card rails: the user's own cards, kept separate from the watchlist */}
        <div className="w-full mt-8 md:mt-12 mb-14 flex flex-col sm:flex-row items-start justify-center gap-6">
          {ownedCards.length > 0 && (
            <>
              <Rail
                label="My Cards"
                icon={<Wallet className="w-3.5 h-3.5" />}
                ids={ownedCards}
                allCards={allCards}
                onDragStart={handleDragStart}
                onRemove={id => setOwnedCards(prev => prev.filter(x => x !== id))}
              />
              <div className="self-stretch hidden sm:flex items-center">
                <div className="w-px h-full min-h-[160px] bg-gradient-to-b from-transparent via-border-strong to-transparent" />
              </div>
              <div className="w-full h-px sm:hidden bg-border" />
            </>
          )}
          <Rail
            label="Watchlist"
            icon={<Bookmark className="w-3.5 h-3.5" />}
            ids={watchlist}
            allCards={allCards}
            onDragStart={handleDragStart}
            onRemove={id => setWatchlist(prev => prev.filter(x => x !== id))}
            addButton={
              <button
                onClick={() => openSearch('watchlist')}
                className="shrink-0 w-[96px] h-[144px] md:w-[112px] md:h-[168px] rounded-[0.6rem] md:rounded-[0.8rem] border-2 border-dashed border-border text-muted/50 hover:text-muted hover:border-border-strong transition-colors bg-surface cursor-pointer flex flex-col items-center justify-center"
              >
                <span className="text-3xl font-light">+</span>
                <span className="text-xs mt-1">Add</span>
              </button>
            }
          />
        </div>

        {/* 1v1 Battle Section */}
        <div className="w-full relative flex justify-center items-stretch mt-4 min-h-[500px]">
          <LightningDivider onShuffle={shuffleCards} live={!!(leftCard && rightCard)} />

          <div className="w-1/2 flex justify-center items-center pr-6 md:pr-14 z-10 relative">
            <Slot
              side="left"
              card={leftCard}
              onDrop={(e) => handleDrop(e, 'left')}
              onOpenSearch={() => openSearch('left')}
              onRemove={() => setLeftCardId(null)}
            />
          </div>

          <div className="w-1/2 flex justify-center items-center pl-6 md:pl-14 z-10 relative">
            <Slot
              side="right"
              card={rightCard}
              onDrop={(e) => handleDrop(e, 'right')}
              onOpenSearch={() => openSearch('right')}
              onRemove={() => setRightCardId(null)}
            />
          </div>
        </div>

        {/* Compare Stats below slots if both are present */}
        {(leftCard || rightCard) && (
          <div className="w-full mt-16 max-w-4xl mx-auto flex flex-col gap-6">
            <CompareRow label="Annual Fee" left={leftCard?.facts.annualFee} right={rightCard?.facts.annualFee} />
            <CompareRow label="Rewards" left={leftCard?.facts.rewards} right={rightCard?.facts.rewards} />
            <CompareRow label="Sign-up Bonus" left={leftCard?.facts.bonus} right={rightCard?.facts.bonus} />
            <CompareRow label="Top Perk" left={leftCard?.facts.topPerk} right={rightCard?.facts.topPerk} />
          </div>
        )}
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
            >
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Search className="w-5 h-5 text-muted" />
                <input
                  type="text"
                  placeholder="Search for a card..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none flex-1 text-ink placeholder-muted text-lg"
                  autoFocus
                />
                <button onClick={() => setIsSearchOpen(false)} className="text-muted hover:text-ink p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-2">
                {filteredCards.length > 0 ? filteredCards.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectCard(c.id)}
                    className="w-full text-left p-4 hover:bg-surface-raised rounded-xl flex items-center gap-4 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-lg ${c.gradient} shadow-inner shrink-0`} />
                    <div>
                      <div className="text-ink font-medium text-lg">{c.name}</div>
                      <div className="text-muted text-sm uppercase tracking-wider">{c.issuer}</div>
                    </div>
                  </button>
                )) : (
                  <div className="p-12 text-center text-muted">No cards found matching your search.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Slot({ card, onDrop, onOpenSearch, onRemove }: { card?: CreditCard, side: 'left' | 'right', onDrop: (e: React.DragEvent) => void, onOpenSearch: () => void, onRemove: () => void }) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="relative w-[280px] h-[420px] shrink-0"
    >
      {/* Fighter spotlight */}
      {card && (
        <div aria-hidden="true" className="absolute -inset-8 -z-0 pointer-events-none rounded-full bg-primary/10 blur-3xl" />
      )}
      {card ? (
        <div className="w-full h-full relative group z-10">
          <div className="absolute top-0 left-0 w-[280px] h-[420px] pointer-events-none transform origin-center transition-transform group-hover:scale-105">
            <CardVisual card={card} />
          </div>
          <div className="absolute top-full left-0 right-0 mt-4 text-center px-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{card.issuer}</p>
            <p className="font-display font-semibold text-ink text-lg leading-tight text-balance">{card.name}</p>
          </div>
          <button
            onClick={onRemove}
            aria-label={`Remove ${card.name}`}
            className="absolute -top-4 -right-4 bg-surface-raised text-muted hover:text-ink p-2.5 rounded-full border border-border shadow-xl opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity z-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <button
          onClick={onOpenSearch}
          className="w-full h-full rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed border-border text-muted/50 hover:text-muted hover:border-border-strong transition-colors bg-surface flex flex-col items-center justify-center"
        >
          <span className="text-5xl font-light mb-4">+</span>
          <span className="font-medium">Select Card</span>
          <span className="text-sm opacity-50 mt-2">or drag from Watchlist</span>
        </button>
      )}
    </div>
  );
}

function CompareRow({ label, left, right }: { label: string, left?: string, right?: string }) {
  return (
    <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-surface border border-border rounded-lg p-6">
      <div className="text-right text-ink font-medium">
        {left || <span className="text-muted/50">-</span>}
      </div>
      <div className="px-6 py-1 rounded-full bg-bg border border-border text-[11px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap">
        {label}
      </div>
      <div className="text-left text-ink font-medium">
        {right || <span className="text-muted/50">-</span>}
      </div>
    </div>
  );
}

function Rail({ label, icon, ids, allCards, onDragStart, onRemove, addButton }: {
  label: string;
  icon: React.ReactNode;
  ids: string[];
  allCards: CreditCard[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onRemove: (id: string) => void;
  addButton?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 min-w-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
        <span className="text-primary">{icon}</span> {label}
      </span>
      <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar max-w-full">
        {ids.map(id => {
          const card = allCards.find(c => c.id === id);
          if (!card) return null;
          return (
            <div
              key={id}
              draggable
              onDragStart={(e) => onDragStart(e, id)}
              className="shrink-0 relative w-[96px] h-[144px] md:w-[112px] md:h-[168px] cursor-grab active:cursor-grabbing transition-transform hover:scale-105 group"
            >
              <div className="absolute top-0 left-0 pointer-events-none origin-top-left scale-[0.4]">
                <CardVisual card={card} />
              </div>
              <button
                onClick={() => onRemove(id)}
                aria-label={`Remove ${card.name}`}
                className="absolute -top-2 -right-2 bg-surface-raised text-muted hover:text-ink p-1.5 rounded-full border border-border shadow-lg opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity z-30"
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

// Vertical lightning bolt down the arena centre; the shuffle "clash" node
// sits at its midpoint. Glows brighter once both fighters are in.
function LightningDivider({ onShuffle, live }: { onShuffle: () => void; live: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-24 z-0 flex justify-center pointer-events-none">
      <motion.svg
        viewBox="0 0 40 400"
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden="true"
        animate={reduce ? {} : { opacity: live ? [0.55, 1, 0.7] : [0.35, 0.55, 0.4] }}
        transition={reduce ? {} : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M20 0 L11 92 L27 150 L9 236 L25 300 L15 400"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={live ? 3 : 2}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 ${live ? 8 : 4}px var(--color-primary))` }}
        />
      </motion.svg>
      <button
        onClick={onShuffle}
        aria-label="Shuffle a random 1v1 matchup"
        className="pointer-events-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-bg border border-border-strong shadow-[0_0_24px_-4px_var(--color-primary)] hover:bg-surface hover:shadow-[0_0_32px_0_var(--color-primary)] transition-all text-primary flex items-center justify-center group z-10"
      >
        <Shuffle className="w-6 h-6 transition-transform group-hover:rotate-180 duration-500" />
      </button>
    </div>
  );
}
