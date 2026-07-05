export interface CardFacts {
  annualFee: string;
  rewards: string;
  /** LLM-generated rewards bullet points, when the crawler has produced
   *  them. Absent for mock data and un-reprocessed rows; the UI falls back
   *  to splitting `rewards` client-side (see lib/rewards.ts). */
  rewardsBullets?: string[];
  bonus: string;
  apr: string;
  bestFor: string;
  creditNeeded: string;
  foreignFee: string;
  topPerk: string;
}

export interface CreditCard {
  id: string;
  name: string;
  issuer: string;
  last4: string;
  gradient: string;
  /** Real card art scraped from the issuer page; the stylized gradient
   *  face renders whenever this is absent. */
  imageUrl?: string;
  /** Issuer product page, used by the apply arrow. Absent on mock data. */
  applyUrl?: string;
  facts: CardFacts;
  tags: string[];
}
