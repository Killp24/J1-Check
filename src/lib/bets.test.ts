import { describe, expect, it } from "vitest";
import { profit, summarizeBets } from "./bets";
import type { Bet } from "./types";

function bet(overrides: Partial<Bet>): Bet {
  return {
    id: "b1",
    made: 1,
    home: "Home",
    away: "Away",
    when: "",
    mkt: "1x2",
    side: 0,
    line: "",
    label: "Home",
    book: "Bet365",
    dec: 2,
    stake: 10,
    fair: 0.5,
    edge: 0,
    status: "pending",
    ...overrides,
  };
}

describe("summarizeBets", () => {
  it("compares settled profit with expected wins from fair probabilities", () => {
    const bets = [
      bet({ id: "w", status: "won", stake: 10, dec: 2.4, fair: 0.45, edge: 0.08 }),
      bet({ id: "l", status: "lost", stake: 10, dec: 2, fair: 0.55, edge: 0.03 }),
      bet({ id: "p", status: "pending", stake: 25, fair: 0.9 }),
    ];
    expect(profit(bets[0]!)).toBeCloseTo(14, 12);
    expect(profit(bets[1]!)).toBe(-10);
    const summary = summarizeBets(bets);
    expect(summary.settled).toBe(2);
    expect(summary.won).toBe(1);
    expect(summary.lost).toBe(1);
    expect(summary.stake).toBe(20);
    expect(summary.profit).toBeCloseTo(4, 12);
    expect(summary.expectedWins).toBeCloseTo(1, 12);
    expect(summary.roi).toBeCloseTo(20, 12);
  });
});
