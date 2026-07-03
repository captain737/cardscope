import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUp, X } from 'lucide-react';
import { parseQueryToFilters } from '../lib/searchParse';

const PLACEHOLDERS = [
  "a travel card with lounge access and no foreign fees...",
  "cashback for groceries and gas...",
  "my first card, something to build credit with...",
  "big sign-up bonus, fee under $100...",
];

interface AISearchBarProps {
  onQueryChange: (query: string) => void;
  onFiltersParsed: (filters: string[]) => void;
}

export default function AISearchBar({ onQueryChange, onFiltersParsed }: AISearchBarProps) {
  const [value, setValue] = useState('');
  const [parsing, setParsing] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [phIndex, setPhIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const parseSeq = useRef(0);
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Typewriter placeholder, same behavior as the Find My Card free-text
  // step. Static text under prefers-reduced-motion.
  useEffect(() => {
    if (reducedMotion.current) {
      setPlaceholder('Describe your ideal card...');
      return;
    }
    let timeout: ReturnType<typeof setTimeout>;
    if (!isDeleting) {
      if (charIndex < PLACEHOLDERS[phIndex].length) {
        timeout = setTimeout(() => {
          setPlaceholder(prev => prev + PLACEHOLDERS[phIndex][charIndex]);
          setCharIndex(c => c + 1);
        }, 45);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 2800);
      }
    } else {
      if (charIndex > 0) {
        timeout = setTimeout(() => {
          setPlaceholder(prev => prev.slice(0, -1));
          setCharIndex(c => c - 1);
        }, 18);
      } else {
        setIsDeleting(false);
        setPhIndex(p => (p + 1) % PLACEHOLDERS.length);
      }
    }
    return () => clearTimeout(timeout);
  }, [charIndex, phIndex, isDeleting]);

  // Parse free text into filter toggles. Sequence-guarded so a slow LLM
  // response can never clobber the result of a newer keystroke.
  const runParse = useCallback(async (query: string) => {
    if (!query.trim()) return;
    const seq = ++parseSeq.current;
    setParsing(true);
    try {
      const filters = await parseQueryToFilters(query);
      if (seq === parseSeq.current) onFiltersParsed(filters);
    } finally {
      if (seq === parseSeq.current) setParsing(false);
    }
  }, [onFiltersParsed]);

  const handleChange = (next: string) => {
    setValue(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onQueryChange(next);
      runParse(next);
    }, 500);
  };

  const submit = () => {
    clearTimeout(debounceRef.current);
    onQueryChange(value);
    runParse(value);
  };

  const clear = () => {
    setValue('');
    clearTimeout(debounceRef.current);
    parseSeq.current++;
    setParsing(false);
    onQueryChange('');
  };

  return (
    <div className="relative flex-1 max-w-3xl">
      <div className="flex items-center gap-2 rounded-[28px] bg-surface-raised border border-border shadow-[0_8px_32px_-8px_rgb(0_0_0_/_0.55)] pl-6 pr-2.5 py-2.5 focus-within:border-border-strong transition-colors">
        <input
          type="text"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder={value ? '' : placeholder + (reducedMotion.current ? '' : '|')}
          aria-label="Describe the card you're looking for"
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-ink placeholder-muted text-[15px] py-1.5"
        />
        {value && (
          <button
            onClick={clear}
            aria-label="Clear search"
            className="text-muted hover:text-ink transition-colors p-1.5 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={submit}
          disabled={!value.trim()}
          aria-label="Match filters to my description"
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            value.trim()
              ? 'bg-primary text-bg hover:bg-primary-deep'
              : 'bg-border/60 text-muted cursor-default'
          }`}
        >
          {parsing ? (
            <span className="w-4 h-4 rounded-full border-2 border-bg/30 border-t-bg animate-spin" aria-hidden="true" />
          ) : (
            <ArrowUp className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
