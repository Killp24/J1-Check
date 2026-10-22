export const SHARP_BOOK = "Pinnacle" as const;
export const SOFT_BOOKS = ["Bet365", "DraftKings", "FanDuel"] as const;
export const BOOKS = [SHARP_BOOK, ...SOFT_BOOKS] as const;

export type BookName = (typeof BOOKS)[number];
export type SoftBook = (typeof SOFT_BOOKS)[number];

export const MARKETS = {
  "1x2": { labels: ["Home", "Draw", "Away"] },
  ou: { labels: ["Over", "Under"] },
  ah: { labels: ["Home", "Away"] },
} as const;

export type MarketKey = keyof typeof MARKETS;
export const MARKET_KEYS: readonly MarketKey[] = ["1x2", "ou", "ah"];

export function marketTitle(market: MarketKey): string {
  if (market === "1x2") return "Match result";
  if (market === "ou") return "Goals";
  return "Handicap";
}
