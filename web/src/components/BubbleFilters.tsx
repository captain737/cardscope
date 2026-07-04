import { motion } from 'motion/react';
import { FILTERS, toggleFilter } from '../lib/filters';

interface BubbleFiltersProps {
  activeFilters: string[];
  onFiltersChange?: (filters: string[]) => void;
}

const GROUP_ORDER: Array<'account' | 'goal' | 'quality'> = ['account', 'goal', 'quality'];

export default function BubbleFilters({ activeFilters, onFiltersChange }: BubbleFiltersProps) {
  const handleToggle = (id: string) => {
    onFiltersChange?.(toggleFilter(activeFilters, id));
  };

  let renderIndex = 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-6 z-20 relative flex flex-wrap justify-center items-center gap-x-2 gap-y-2.5">
      {GROUP_ORDER.map((group, gi) => (
        <div key={group} className="contents">
          {gi > 0 && (
            <span aria-hidden="true" className="mx-1 h-4 w-px bg-[var(--cl-hairline-strong)] self-center hidden sm:inline-block" />
          )}
          {FILTERS.filter(f => f.group === group).map(filter => {
            const isActive = activeFilters.includes(filter.id);
            const i = renderIndex++;
            return (
              <motion.button
                key={filter.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.015, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => handleToggle(filter.id)}
                aria-pressed={isActive}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 ${
                  isActive
                    ? 'bg-[var(--cl-pill)] text-[var(--cl-pill-ink)] border-[var(--cl-pill)]'
                    : 'bg-transparent text-[var(--cl-muted)] border-[var(--cl-hairline-strong)] hover:bg-[var(--cl-panel)] hover:text-[var(--cl-ink)]'
                }`}
              >
                {filter.label}
              </motion.button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
