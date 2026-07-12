/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import CardCarousel from './components/CardCarousel';
import FindMyCard from './components/FindMyCard';
import Compare from './components/Compare';
import { loadProfile, saveProfile } from './lib/profile';

export interface MatchResult {
  filters: string[];
  ownedCards: string[];
  name?: string;
  email?: string;
  answers?: Record<string, unknown>;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  // Cards the user told us they already hold (via Find Me a Card). Kept
  // separate from the general watchlist and shown apart on Compare.
  const [ownedCards, setOwnedCards] = useState<string[]>([]);
  const [homeFilters, setHomeFilters] = useState<string[]>([]);
  const [matchAnswers, setMatchAnswers] = useState<Record<string, unknown> | undefined>();
  const [findOpen, setFindOpen] = useState(false);
  // True right after Find Me a Card completes: the home page shows only
  // "Your best matches" (no filter bubbles) until the user browses all.
  const [matchMode, setMatchMode] = useState(false);

  // Restore a returning visitor's cards + filters on load.
  useEffect(() => {
    const p = loadProfile();
    if (p.ownedCards?.length) setOwnedCards(p.ownedCards);
    if (p.filters?.length) setHomeFilters(p.filters);
  }, []);

  const handleComplete = (r: MatchResult) => {
    setHomeFilters(r.filters);
    setOwnedCards(r.ownedCards);
    setMatchAnswers(r.answers);
    setMatchMode(true);
    saveProfile({
      name: r.name,
      email: r.email,
      ownedCards: r.ownedCards,
      filters: r.filters,
      answers: r.answers,
    });
    setFindOpen(false);
    setCurrentPage('home');
  };

  // Exit "Your best matches" back to normal browsing with filter bubbles.
  const browseAll = () => {
    setMatchMode(false);
    setHomeFilters([]);
    setMatchAnswers(undefined);
  };

  return (
    <div className="compare-light min-h-screen bg-[var(--cl-bg)] text-[var(--cl-ink)] font-sans selection:bg-primary/30">
      <Navigation
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        findActive={findOpen}
        onFindClick={() => setFindOpen(true)}
      />

      <main>
        {currentPage === 'home' && (
          <CardCarousel
            watchlist={watchlist}
            setWatchlist={setWatchlist}
            filters={homeFilters}
            setFilters={setHomeFilters}
            ownedCards={ownedCards}
            matchMode={matchMode}
            matchAnswers={matchAnswers}
            onBrowseAll={browseAll}
          />
        )}
        {currentPage === 'compare' && (
          <Compare
            watchlist={watchlist}
            setWatchlist={setWatchlist}
            ownedCards={ownedCards}
            setOwnedCards={setOwnedCards}
          />
        )}
      </main>

      <footer className="border-t border-[var(--cl-hairline)] py-12 text-center text-[var(--cl-muted)] text-sm">
        <p>© 2026 CardScope.</p>
      </footer>

      <FindMyCard open={findOpen} onClose={() => setFindOpen(false)} onComplete={handleComplete} />
    </div>
  );
}
