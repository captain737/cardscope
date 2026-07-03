import { CreditCard } from './types';

export const MOCK_CARDS: CreditCard[] = [
  {
    id: 'lumina-black',
    name: 'Lumina Black',
    issuer: 'LUMINA',
    last4: '4092',
    gradient: 'bg-gradient-to-br from-neutral-800 via-neutral-900 to-black',
    tags: ['premium', 'travel', 'lounge', 'dining', 'flights'],
    facts: {
      annualFee: '$550',
      rewards: '4x dining, 3x flights, 1x other',
      bonus: '80,000 pts (after $4k spend)',
      apr: '22.24% - 29.24% Var.',
      bestFor: 'Luxury Travel',
      creditNeeded: 'Excellent (720+)',
      foreignFee: 'None',
      topPerk: 'Global Lounge Access'
    }
  },
  {
    id: 'neon-miles',
    name: 'Neon Miles',
    issuer: 'NEXUS',
    last4: '8831',
    gradient: 'bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-600',
    tags: ['travel', 'personal', 'dining'],
    facts: {
      annualFee: '$95',
      rewards: '3x transit, 2x dining, 1x other',
      bonus: '50,000 pts (after $3k spend)',
      apr: '19.99% - 26.99% Var.',
      bestFor: 'City Commuters',
      creditNeeded: 'Good (690+)',
      foreignFee: 'None',
      topPerk: '$100 Rideshare Credit'
    }
  },
  {
    id: 'orbit-rewards',
    name: 'Orbit Rewards',
    issuer: 'ORBIT',
    last4: '2119',
    gradient: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-700',
    tags: ['no-fee', 'low-apr', 'personal', 'beginner'],
    facts: {
      annualFee: '$0',
      rewards: '1.5x on everything',
      bonus: '$200 (after $500 spend)',
      apr: '0% for 15 mo, then 20.49%+',
      bestFor: 'Everyday Spend',
      creditNeeded: 'Good (670+)',
      foreignFee: '3%',
      topPerk: 'Cell Phone Protection'
    }
  },
  {
    id: 'velvet-cash',
    name: 'Velvet Cash',
    issuer: 'AURA',
    last4: '5501',
    gradient: 'bg-gradient-to-br from-rose-400 via-red-500 to-rose-700',
    tags: ['cashback', 'no-fee', 'personal', 'groceries', 'gas'],
    facts: {
      annualFee: '$0',
      rewards: '5x rotating, 1x other',
      bonus: 'Cashback Match (Year 1)',
      apr: '18.24% - 28.24% Var.',
      bestFor: 'Maximizing Cash Back',
      creditNeeded: 'Good (690+)',
      foreignFee: '3%',
      topPerk: 'Quarterly 5x Categories'
    }
  },
  {
    id: 'flux-platinum',
    name: 'Flux Platinum',
    issuer: 'FLUX',
    last4: '9920',
    gradient: 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600',
    tags: ['premium', 'business', 'flights', 'hotels', 'lounge'],
    facts: {
      annualFee: '$695',
      rewards: '5x flights, 5x hotels, 1x other',
      bonus: '100,000 pts (after $8k spend)',
      apr: '21.24% - 28.24% Var.',
      bestFor: 'Frequent Flyers',
      creditNeeded: 'Excellent (740+)',
      foreignFee: 'None',
      topPerk: '$200 Hotel Credit'
    }
  },
  {
    id: 'aurora-travel',
    name: 'Aurora Travel',
    issuer: 'AURORA',
    last4: '3024',
    gradient: 'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600',
    tags: ['travel', 'groceries', 'gas', 'hotels'],
    facts: {
      annualFee: '$95',
      rewards: '3x groceries, 3x gas, 1x other',
      bonus: '60,000 pts (after $4k spend)',
      apr: '20.99% - 27.99% Var.',
      bestFor: 'Road Trips & Groceries',
      creditNeeded: 'Good (700+)',
      foreignFee: 'None',
      topPerk: '$50 Annual Hotel Credit'
    }
  },
  {
    id: 'zenith-gold',
    name: 'Zenith Gold',
    issuer: 'ZENITH',
    last4: '1102',
    gradient: 'bg-gradient-to-br from-amber-300 via-yellow-500 to-orange-600',
    tags: ['dining', 'groceries', 'personal'],
    facts: {
      annualFee: '$250',
      rewards: '4x dining, 4x groceries',
      bonus: '60,000 pts (after $4k spend)',
      apr: '21.24% - 28.24% Var.',
      bestFor: 'Foodies',
      creditNeeded: 'Good (700+)',
      foreignFee: 'None',
      topPerk: '$120 Dining Credit'
    }
  },
  {
    id: 'apex-business',
    name: 'Apex Pro',
    issuer: 'APEX',
    last4: '8812',
    gradient: 'bg-gradient-to-br from-sky-500 via-indigo-600 to-blue-800',
    tags: ['business', 'cashback', 'gas'],
    facts: {
      annualFee: '$95',
      rewards: '2% unlimited cash back',
      bonus: '$500 (after $5k spend)',
      apr: '19.99% - 26.99% Var.',
      bestFor: 'Business Owners',
      creditNeeded: 'Excellent (720+)',
      foreignFee: 'None',
      topPerk: 'Free Employee Cards'
    }
  },
  {
    id: 'pulse-student',
    name: 'Pulse Student',
    issuer: 'PULSE',
    last4: '4450',
    gradient: 'bg-gradient-to-br from-lime-400 via-green-500 to-emerald-600',
    tags: ['students', 'no-fee', 'beginner', 'dining'],
    facts: {
      annualFee: '$0',
      rewards: '3x dining, 1x other',
      bonus: 'Good Grades Match',
      apr: '19.24% Var.',
      bestFor: 'Building Credit',
      creditNeeded: 'Fair (580+)',
      foreignFee: '3%',
      topPerk: '$20 Good Grade Reward'
    }
  },
  {
    id: 'nova-balance',
    name: 'Nova Transfer',
    issuer: 'NOVA',
    last4: '7721',
    gradient: 'bg-gradient-to-br from-purple-400 via-pink-500 to-rose-600',
    tags: ['balance', 'low-apr', 'no-fee', 'personal'],
    facts: {
      annualFee: '$0',
      rewards: 'None',
      bonus: 'None',
      apr: '0% for 21 mo, then 20.49%+',
      bestFor: 'Paying Off Debt',
      creditNeeded: 'Good (670+)',
      foreignFee: '3%',
      topPerk: '0% APR for 21 Months'
    }
  },
  {
    id: 'horizon-blue',
    name: 'Horizon Blue',
    issuer: 'HORIZON',
    last4: '2901',
    gradient: 'bg-gradient-to-br from-blue-300 via-cyan-500 to-teal-500',
    tags: ['travel', 'no-fee', 'beginner'],
    facts: {
      annualFee: '$0',
      rewards: '2x travel, 1x other',
      bonus: '20,000 pts (after $1k spend)',
      apr: '20.24% - 27.24% Var.',
      bestFor: 'Casual Travelers',
      creditNeeded: 'Good (680+)',
      foreignFee: 'None',
      topPerk: 'No Foreign Transaction Fees'
    }
  },
  {
    id: 'titan-reserve',
    name: 'Titan Reserve',
    issuer: 'TITAN',
    last4: '6610',
    gradient: 'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700',
    tags: ['premium', 'business', 'travel', 'lounge'],
    facts: {
      annualFee: '$595',
      rewards: '3x travel, 3x business',
      bonus: '120,000 pts (after $10k spend)',
      apr: '21.49% - 28.49% Var.',
      bestFor: 'Corporate Travel',
      creditNeeded: 'Excellent (750+)',
      foreignFee: 'None',
      topPerk: 'Priority Pass Select'
    }
  },
  {
    id: 'echo-cash',
    name: 'Echo Everyday',
    issuer: 'ECHO',
    last4: '3349',
    gradient: 'bg-gradient-to-br from-orange-400 via-red-500 to-pink-600',
    tags: ['cashback', 'groceries', 'gas', 'no-fee'],
    facts: {
      annualFee: '$0',
      rewards: '3x groceries, 3x gas, 1x other',
      bonus: '$200 (after $1k spend)',
      apr: '18.99% - 25.99% Var.',
      bestFor: 'Family Expenses',
      creditNeeded: 'Good (670+)',
      foreignFee: '3%',
      topPerk: 'Unlimited 3x Categories'
    }
  },
  {
    id: 'stellar-hotel',
    name: 'Stellar Nights',
    issuer: 'STELLAR',
    last4: '9902',
    gradient: 'bg-gradient-to-br from-violet-500 via-purple-700 to-indigo-900',
    tags: ['hotels', 'travel', 'personal'],
    facts: {
      annualFee: '$95',
      rewards: '10x stellar hotels, 2x travel',
      bonus: '150,000 pts (after $3k spend)',
      apr: '22.99% - 29.99% Var.',
      bestFor: 'Brand Loyalists',
      creditNeeded: 'Good (690+)',
      foreignFee: 'None',
      topPerk: 'Free Anniversary Night'
    }
  },
  {
    id: 'vanguard-base',
    name: 'Vanguard Start',
    issuer: 'VANGUARD',
    last4: '1004',
    gradient: 'bg-gradient-to-br from-teal-300 via-green-400 to-emerald-500',
    tags: ['beginner', 'no-fee', 'personal'],
    facts: {
      annualFee: '$0',
      rewards: '1x everything',
      bonus: 'None',
      apr: '24.99% Var.',
      bestFor: 'First Credit Card',
      creditNeeded: 'Fair (600+)',
      foreignFee: '3%',
      topPerk: 'Free FICO Score'
    }
  }
];
