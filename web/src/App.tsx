/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import CardCarousel from './components/CardCarousel';
import FindMyCard from './components/FindMyCard';
import Compare from './components/Compare';
import CursorGlow from './components/CursorGlow';
import { loadProfile, saveProfile } from './lib/profile';
import { saveRemoteProfile } from './lib/remoteProfile';

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
  // Bumped to remount CardCarousel on a logo click, resetting its internal
  // landing state (started flag, search text, provider, index).
  const [homeResetKey, setHomeResetKey] = useState(0);

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
    const profile = {
      name: r.name,
      email: r.email,
      ownedCards: r.ownedCards,
      filters: r.filters,
      answers: r.answers,
    };
    saveProfile(profile);
    // Also persist to Supabase (keyed by email) for cross-device recall.
    // Fire-and-forget: localStorage already has it if this fails.
    void saveRemoteProfile(profile);
    setFindOpen(false);
    setCurrentPage('home');
  };

  // Exit "Your best matches" back to normal browsing with filter bubbles.
  const browseAll = () => {
    setMatchMode(false);
    setHomeFilters([]);
    setMatchAnswers(undefined);
  };

  // Logo click: return to the pristine landing (just the search + filters).
  // Clears the match/filter state and remounts CardCarousel so its internal
  // landing state resets too.
  const goHome = () => {
    setCurrentPage('home');
    browseAll();
    setHomeResetKey((k) => k + 1);
  };

  return (
    <>
      {/* Cursor layer lives OUTSIDE .app-zoom so its fixed elements track the
          real pointer 1:1 (a zoomed ancestor would scale their coordinates). */}
      <CursorGlow />
      <div className="app-zoom compare-light min-h-screen bg-[var(--cl-bg)] text-[var(--cl-ink)] font-sans selection:bg-primary/30">
      <Navigation
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        findActive={findOpen}
        onFindClick={() => setFindOpen(true)}
        onLogoClick={goHome}
      />

      <main>
        {currentPage === 'home' && (
          <CardCarousel
            key={homeResetKey}
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
            onFindClick={() => setFindOpen(true)}
          />
        )}
      </main>

      <footer className="border-t border-[var(--cl-hairline)] py-12 text-center text-[var(--cl-muted)] text-sm">
        <p>© 2026 CardFit.</p>
      </footer>

      <FindMyCard open={findOpen} onClose={() => setFindOpen(false)} onComplete={handleComplete} />
      </div>
    </>
  );
}
