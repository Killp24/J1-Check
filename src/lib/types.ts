import type { BookName, MarketKey } from "./markets";

export type MarketPrices = {
  line?: string;
} & Partial<Record<BookName, string[]>>;

export interface Fixture {
  id: string;
  when: string;
  home: string;
  away: string;
  prices: Partial<Record<MarketKey, MarketPrices>>;
  notes: string;
}

export type BetStatus = "pending" | "won" | "lost";

export interface Bet {
  id: string;
  made: number;
  home: string;
  away: string;
  when: string;
  mkt: MarketKey;
  side: number;
  line: string;
  label: string;
  book: string;
  dec: number;
  stake: number;
  fair: number | null;
  edge: number;
  status: BetStatus;
}

export interface HistMatch {
  date: string;
  season: string;
  home: string;
  away: string;
  hg: number;
  ag: number;
  res: string;
}
