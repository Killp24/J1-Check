import type { Bet } from "./types";

export function profit(bet: Bet): number {
  if (bet.status === "won") return bet.stake * (bet.dec - 1);
  if (bet.status === "lost") return -bet.stake;
  return 0;
}

export interface BetSummary {
  settled: number;
  won: number;
  lost: number;
  stake: number;
  profit: number;
  expectedWins: number;
  roi: number | null;
}

export function summarizeBets(bets: readonly Bet[]): BetSummary {
  const done = bets.filter((bet) => bet.status === "won" || bet.status === "lost");
  const stake = done.reduce((total, bet) => total + bet.stake, 0);
  const pl = done.reduce((total, bet) => total + profit(bet), 0);
  const expectedWins = done.reduce((total, bet) => total + (bet.fair || 0), 0);
  const won = done.filter((bet) => bet.status === "won").length;
  return {
    settled: done.length,
    won,
    lost: done.length - won,
    stake,
    profit: pl,
    expectedWins,
    roi: stake ? (pl / stake) * 100 : null,
  };
}
