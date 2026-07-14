import { motion } from 'motion/react';
import { FILTERS, toggleFilter, FilterDef } from '../lib/filters';

interface BubbleFiltersProps {
  activeFilters: string[];
  onFiltersChange?: (filters: string[]) => void;
}

// Two tiers: the primary filters (account · reward · quality, incl. No Annual
// Fee / Premium) on top, and the spend-category refinements (Dining, Groceries,
// Gas, Balance Transfer) below as comparatively smaller bubbles.
const UPPER_GROUPS: Array<FilterDef['group']> = ['account', 'reward', 'quality'];

export default function BubbleFilters({ activeFilters, onFiltersChange }: BubbleFiltersProps) {
  const handleToggle = (id: string) => onFiltersChange?.(toggleFilter(activeFilters, id));

  const bubble = (filter: FilterDef, i: number, small: boolean) => {
    const isActive = activeFilters.includes(filter.id);
    return (
      <motion.button
        key={filter.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: i * 0.015, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => handleToggle(filter.id)}
        aria-pressed={isActive}
        className={`${small ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'} font-medium rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-ink)]/30 ${
          isActive
            ? 'bg-[var(--cl-pill)] text-[var(--cl-pill-ink)] border-[var(--cl-pill)]'
            : 'bg-transparent text-[var(--cl-muted)] border-[var(--cl-hairline-strong)] hover:bg-[var(--cl-panel)] hover:text-[var(--cl-ink)]'
        }`}
      >
        {filter.label}
      </motion.button>
    );
  };

  let i = 0;
  const spend = FILTERS.filter((f) => f.group === 'spend');

  return (
    <div className="w-full flex flex-col items-center gap-2.5 z-20 relative">
      {/* Upper: primary filters */}
      <div className="max-w-3xl px-4 md:px-6 flex flex-wrap justify-center items-center gap-x-2 gap-y-2">
        {UPPER_GROUPS.map((group, gi) => (
          <div key={group} className="contents">
            {gi > 0 && (
              <span aria-hidden="true" className="mx-1 h-4 w-px bg-[var(--cl-hairline-strong)] self-center hidden sm:inline-block" />
            )}
            {FILTERS.filter((f) => f.group === group).map((filter) => bubble(filter, i++, false))}
          </div>
        ))}
      </div>

      {/* Lower: spend-category refinements, smaller */}
      {spend.length > 0 && (
        <div className="max-w-2xl px-4 flex flex-wrap justify-center items-center gap-1.5">
          {spend.map((filter) => bubble(filter, i++, true))}
        </div>
      )}
    </div>
  );
}
