import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Search, Plus } from 'lucide-react';
import { normalizeFilters } from '../lib/filters';
import { loadProfile } from '../lib/profile';
import { useCards } from '../hooks/useCards';
import type { MatchResult } from '../App';

interface FindMyCardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (result: MatchResult) => void;
}

type Answers = {
  firstName: string;
  lastName: string;
  email: string;
  hasCard?: boolean;
  ownedCards: string[];
  credit?: string;
  type?: string;
  rewards?: string;
  maxFee: number;
  spend: Record<string, number>; // 0 a little, 1 some, 2 a lot
};

const SPEND_CATS = [
  { key: 'dining', label: 'Dining & Takeout' },
  { key: 'groceries', label: 'Groceries' },
  { key: 'travel', label: 'Flights & Hotels' },
  { key: 'gas', label: 'Gas & Transit' },
];

const BLANK: Answers = {
  firstName: '', lastName: '', email: '',
  ownedCards: [], maxFee: 0,
  spend: { dining: 1, groceries: 1, travel: 1, gas: 1 },
};

function deriveFilters(a: Answers): string[] {
  const ids: string[] = [];
  if (a.type) ids.push(a.type);
  if (a.rewards === 'cashback') ids.push('cashback');
  if (a.rewards === 'points') ids.push('travel');
  if (a.maxFee === 0) ids.push('no-fee');
  else if (a.maxFee >= 250) ids.push('premium');
  const spendGoal: Record<string, string> = { dining: 'dining', groceries: 'groceries', travel: 'travel', gas: 'gas' };
  const top = Object.entries(a.spend).sort((x, y) => y[1] - x[1])[0];
  if (top && top[1] >= 2 && spendGoal[top[0]]) ids.push(spendGoal[top[0]]);
  return normalizeFilters([...new Set(ids)]);
}

export default function FindMyCard({ open, onClose, onComplete }: FindMyCardProps) {
  const reducedMotion = useReducedMotion();
  const [answers, setAnswers] = useState<Answers>(BLANK);
  const [index, setIndex] = useState(0);

  // Prefill a returning visitor's details each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    const p = loadProfile();
    const [first = '', ...rest] = (p.name || '').split(' ');
    setAnswers({
      ...BLANK,
      firstName: first,
      lastName: rest.join(' '),
      email: p.email || '',
      ownedCards: p.ownedCards || [],
    });
    setIndex(0);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const set = (patch: Partial<Answers>) => setAnswers(prev => ({ ...prev, ...patch }));

  // The step order branches on whether they already hold a card.
  const steps = useMemo(() => {
    const owns = answers.hasCard === true ? ['ownedCards', 'credit'] : [];
    return ['email', 'hasCard', ...owns, 'type', 'rewards', 'fee', 'spend'];
  }, [answers.hasCard]);

  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;

  // Every step except the email intro is required to advance.
  const answered = (() => {
    switch (step) {
      case 'email': return true;
      case 'hasCard': return answers.hasCard !== undefined;
      case 'ownedCards': return answers.ownedCards.length > 0;
      case 'credit': return !!answers.credit;
      case 'type': return !!answers.type;
      case 'rewards': return !!answers.rewards;
      default: return true; // fee + spend always have a value
    }
  })();

  const go = (n: number) => setIndex(Math.max(0, Math.min(steps.length - 1, n)));

  const finish = () => onComplete({
    filters: deriveFilters(answers),
    ownedCards: answers.ownedCards,
    name: `${answers.firstName} ${answers.lastName}`.trim() || undefined,
    email: answers.email || undefined,
    answers: { credit: answers.credit, type: answers.type, rewards: answers.rewards, maxFee: answers.maxFee, spend: answers.spend, hasCard: answers.hasCard },
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 overflow-y-auto bg-bg/45 backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="fixed top-5 right-5 z-10 w-10 h-10 rounded-full bg-surface/70 backdrop-blur border border-border text-muted hover:text-ink hover:border-border-strong transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>

          <motion.div
            className="min-h-full w-full max-w-xl mx-auto px-6 py-24 flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.96, y: reducedMotion ? 0 : 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.97 }}
            transition={{ duration: reducedMotion ? 0.15 : 0.32, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
          >
            <motion.div
              key={step}
              initial={{ opacity: 0, x: reducedMotion ? 0 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: reducedMotion ? 0.16 : 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col items-center text-center"
            >
              {step === 'email' && <EmailStep answers={answers} set={set} />}
              {step === 'hasCard' && <HasCardStep answers={answers} set={set} />}
              {step === 'ownedCards' && <OwnedCardsStep answers={answers} set={set} />}
              {step === 'credit' && <CreditStep answers={answers} set={set} />}
              {step === 'type' && <TypeStep answers={answers} set={set} />}
              {step === 'rewards' && <RewardsStep answers={answers} set={set} />}
              {step === 'fee' && <FeeStep answers={answers} set={set} />}
              {step === 'spend' && <SpendStep answers={answers} set={set} />}
            </motion.div>

            <div className="flex items-center justify-center gap-3 mt-10">
              {step === 'email' ? (
                <>
                  <button
                    onClick={() => go(index + 1)}
                    className="px-6 py-3 rounded-full bg-surface-raised border border-border text-muted hover:text-ink hover:border-border-strong font-medium transition-colors"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={() => go(index + 1)}
                    className="px-7 py-3 rounded-full bg-primary text-bg hover:bg-primary-deep font-semibold flex items-center gap-2 transition-colors"
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => go(index - 1)}
                    className="px-6 py-3 rounded-full bg-surface-raised border border-border text-muted hover:text-ink hover:border-border-strong font-medium flex items-center gap-2 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  {isLast ? (
                    <button
                      onClick={finish}
                      className="px-8 py-3 rounded-full bg-primary text-bg hover:bg-primary-deep font-bold flex items-center gap-2 transition-colors"
                    >
                      Find My Matches <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => go(index + 1)}
                      disabled={!answered}
                      className={`px-7 py-3 rounded-full font-semibold flex items-center gap-2 transition-colors ${
                        answered ? 'bg-primary text-bg hover:bg-primary-deep' : 'bg-border/60 text-muted cursor-not-allowed'
                      }`}
                    >
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------- steps ------------------------------- */

function Heading({ title, hint }: { title: string; hint?: string }) {
  return (
    <>
      <h2 className="font-display font-bold text-2xl md:text-3xl text-ink text-balance mb-2">{title}</h2>
      {hint && <p className="text-muted text-sm mb-7 max-w-md">{hint}</p>}
      {!hint && <div className="mb-7" />}
    </>
  );
}

interface StepProps { answers: Answers; set: (p: Partial<Answers>) => void; }

function EmailStep({ answers, set }: StepProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <Heading title="Save your progress" hint="Drop your name and email so we remember your cards and matches next time. Totally optional." />
      <div className="w-full max-w-md flex flex-col gap-3">
        <div className="flex gap-3">
          <input
            value={answers.firstName}
            onChange={e => set({ firstName: e.target.value })}
            placeholder="First name"
            className="flex-1 min-w-0 h-12 px-4 rounded-2xl bg-bg border border-border text-ink placeholder-muted text-[15px] focus:outline-none focus:border-primary transition-colors"
          />
          <input
            value={answers.lastName}
            onChange={e => set({ lastName: e.target.value })}
            placeholder="Last name"
            className="flex-1 min-w-0 h-12 px-4 rounded-2xl bg-bg border border-border text-ink placeholder-muted text-[15px] focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <input
          type="email"
          value={answers.email}
          onChange={e => set({ email: e.target.value })}
          placeholder="Email address"
          className="w-full h-12 px-4 rounded-2xl bg-bg border border-border text-ink placeholder-muted text-[15px] focus:outline-none focus:border-primary transition-colors"
        />
        <p className="text-xs text-muted mt-1">No account, no password. We just use this to remember you.</p>
      </div>
    </div>
  );
}

function HasCardStep({ answers, set }: StepProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <Heading title="Do you have a credit card right now?" />
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        {[
          { v: true, label: 'Yes, I have one' },
          { v: false, label: 'No, this is my first' },
        ].map(o => (
          <button
            key={String(o.v)}
            onClick={() => set({ hasCard: o.v, ...(o.v ? {} : { ownedCards: [], credit: undefined }) })}
            aria-pressed={answers.hasCard === o.v}
            className={`flex-1 px-6 py-5 rounded-2xl border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              answers.hasCard === o.v ? 'bg-primary/10 border-primary text-ink' : 'bg-bg border-border text-muted hover:border-border-strong hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OwnedCardsStep({ answers, set }: StepProps) {
  const { cards } = useCards();
  const [query, setQuery] = useState('');
  const matches = query.trim()
    ? cards.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.issuer.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];
  const add = (id: string) => { if (!answers.ownedCards.includes(id)) set({ ownedCards: [...answers.ownedCards, id] }); setQuery(''); };
  const remove = (id: string) => set({ ownedCards: answers.ownedCards.filter(x => x !== id) });

  return (
    <div className="w-full flex flex-col items-center">
      <Heading title="Which cards do you already have?" hint="Add at least one. These go straight to your Compare board." />
      <div className="w-full max-w-md">
        {answers.ownedCards.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {answers.ownedCards.map(id => {
              const c = cards.find(x => x.id === id);
              if (!c) return null;
              return (
                <div key={id} className="flex items-center gap-3 bg-bg border border-border rounded-2xl p-2.5 pl-3">
                  <div className={`w-9 h-9 rounded-lg ${c.gradient} shrink-0`} />
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-ink font-medium text-sm truncate">{c.name}</div>
                    <div className="text-muted text-xs uppercase tracking-wide">{c.issuer}</div>
                  </div>
                  <button onClick={() => remove(id)} aria-label={`Remove ${c.name}`} className="w-8 h-8 rounded-full text-muted hover:text-ink flex items-center justify-center shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for a card…"
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-bg border border-border text-ink placeholder-muted text-[15px] focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        {matches.length > 0 && (
          <div className="mt-2 bg-bg border border-border rounded-2xl overflow-hidden">
            {matches.map(c => (
              <button key={c.id} onClick={() => add(c.id)} className="w-full flex items-center gap-3 p-2.5 pl-3 hover:bg-surface-raised transition-colors text-left">
                <div className={`w-8 h-8 rounded-lg ${c.gradient} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="text-ink font-medium text-sm truncate">{c.name}</div>
                  <div className="text-muted text-xs uppercase tracking-wide">{c.issuer}</div>
                </div>
                <Plus className="w-4 h-4 text-primary shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreditStep({ answers, set }: StepProps) {
  const opts = [
    { id: 'excellent', label: 'Excellent', sub: '720+' },
    { id: 'good', label: 'Good', sub: '690–719' },
    { id: 'fair', label: 'Fair', sub: '630–689' },
    { id: 'building', label: 'Building', sub: 'under 630' },
  ];
  return (
    <div className="w-full flex flex-col items-center">
      <Heading title="What's your credit score?" hint="A rough idea is plenty — no hard check." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-lg">
        {opts.map(o => (
          <button
            key={o.id}
            onClick={() => set({ credit: o.id })}
            aria-pressed={answers.credit === o.id}
            className={`p-5 rounded-2xl border flex flex-col items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              answers.credit === o.id ? 'bg-primary/10 border-primary text-ink' : 'bg-bg border-border text-muted hover:border-border-strong hover:text-ink'
            }`}
          >
            <span className="font-display font-semibold text-lg">{o.label}</span>
            <span className="text-xs opacity-70">{o.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TypeStep({ answers, set }: StepProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <Heading title="What type of card are you after?" />
      <ToggleRow
        options={[{ id: 'personal', label: 'Personal' }, { id: 'business', label: 'Business' }, { id: 'students', label: 'Student' }]}
        active={answers.type}
        onChange={id => set({ type: id })}
      />
    </div>
  );
}

function RewardsStep({ answers, set }: StepProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <Heading title="How do you want your rewards?" />
      <ToggleRow
        large
        options={[
          { id: 'cashback', label: 'Cash Back', desc: 'Simple statement credits' },
          { id: 'points', label: 'Rewards Points', desc: 'Miles for travel & upgrades' },
        ]}
        active={answers.rewards}
        onChange={id => set({ rewards: id })}
      />
    </div>
  );
}

function FeeStep({ answers, set }: StepProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <Heading title="What's your max annual fee?" />
      <div className="w-full max-w-md bg-bg border border-border rounded-2xl p-6">
        <div className="font-display font-bold text-4xl text-primary mb-6">${answers.maxFee}</div>
        <div className="relative w-full h-1.5 bg-border rounded-full mb-2">
          <div className="absolute top-0 left-0 h-full bg-primary rounded-full" style={{ width: `${(answers.maxFee / 700) * 100}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-ink rounded-full border-2 border-bg shadow-md" />
          </div>
          <input
            type="range" min="0" max="700" step="50" value={answers.maxFee}
            onChange={e => set({ maxFee: parseInt(e.target.value) })}
            className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
            aria-label="Maximum annual fee"
          />
        </div>
        <p className="text-muted text-sm mt-4">{answers.maxFee === 0 ? 'Targeting cards with no annual fee' : 'Open to a fee for better perks'}</p>
      </div>
    </div>
  );
}

function SpendStep({ answers, set }: StepProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <Heading title="Where does your money go?" hint="Set how much you spend in each." />
      <div className="flex flex-col gap-3 w-full max-w-md">
        {SPEND_CATS.map(cat => (
          <div key={cat.key} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-bg border border-border rounded-2xl p-4">
            <span className="font-medium text-ink text-[15px] flex-1 text-center sm:text-left">{cat.label}</span>
            <div className="flex gap-1 bg-surface rounded-full p-1 border border-border mx-auto sm:mx-0" role="group" aria-label={`${cat.label} spending`}>
              {['A little', 'Some', 'A lot'].map((lbl, i) => (
                <button
                  key={lbl}
                  onClick={() => set({ spend: { ...answers.spend, [cat.key]: i } })}
                  aria-pressed={answers.spend[cat.key] === i}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${answers.spend[cat.key] === i ? 'bg-primary text-bg' : 'text-muted hover:text-ink'}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({ options, active, onChange, large = false }: { options: { id: string; label: string; desc?: string }[]; active?: string; onChange: (id: string) => void; large?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          aria-pressed={active === opt.id}
          className={`flex-1 rounded-2xl border p-5 flex flex-col items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            active === opt.id ? 'bg-primary/10 border-primary text-ink' : 'bg-bg border-border text-muted hover:border-border-strong hover:text-ink'
          }`}
        >
          <span className={large ? 'text-lg font-display font-semibold' : 'font-medium'}>{opt.label}</span>
          {opt.desc && <span className="text-xs opacity-70">{opt.desc}</span>}
        </button>
      ))}
    </div>
  );
}
