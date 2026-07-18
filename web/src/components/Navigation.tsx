import { motion } from 'motion/react';
import { Layers } from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  findActive: boolean;
  onFindClick: () => void;
  // Clicking the wordmark returns to the pristine landing (search + filters),
  // not just the home route. Falls back to a plain home nav if unset.
  onLogoClick?: () => void;
}

/**
 * No header bar: floating corner elements. Wordmark top-left; a nav pill
 * top-right with the two pages plus a "Find Me a Card" action that opens
 * the bottom-sheet questionnaire (not a route).
 */
export default function Navigation({ currentPage, setCurrentPage, findActive, onFindClick, onLogoClick }: NavigationProps) {
  const links = [
    { id: 'home', label: 'Cards' },
    { id: 'compare', label: 'Compare' },
  ];

  return (
    <motion.div
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-4 left-4 right-4 md:top-5 md:left-6 md:right-6 z-40 flex items-center justify-between pointer-events-none"
    >
      <button
        onClick={onLogoClick ?? (() => setCurrentPage('home'))}
        className="pointer-events-auto flex items-center gap-2 group"
        aria-label="CardFit home"
      >
        <Layers className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110" />
        <span className="font-display font-bold text-lg tracking-tight text-primary">CardFit</span>
      </button>

      <nav className="pointer-events-auto flex items-center gap-1 p-1 rounded-full bg-surface/90 backdrop-blur-sm border border-border">
        {links.map(link => (
          <button
            key={link.id}
            onClick={() => setCurrentPage(link.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
              currentPage === link.id
                ? 'bg-primary text-bg'
                : 'text-muted hover:text-ink hover:bg-surface-raised'
            }`}
          >
            {link.label}
          </button>
        ))}
        <button
          onClick={onFindClick}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
            findActive ? 'bg-primary text-bg' : 'text-muted hover:text-ink hover:bg-surface-raised'
          }`}
        >
          Find Me a Card
        </button>
      </nav>
    </motion.div>
  );
}
