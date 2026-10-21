import { matchTeam } from "./history";
import { MARKETS, SOFT_BOOKS, type MarketKey, type SoftBook } from "./markets";
import { edge, fairProbabilities, toDecimal, type DecimalOdds } from "./odds";
import type { Fixture } from "./types";

export interface BestEdge {
  edge: number;
  book: SoftBook;
  market: MarketKey;
  side: number;
  dec: DecimalOdds;
  line?: string;
}

export function edgeBand(value: number): "go" | "thin" | "no" {
  if (value >= 0.04) return "go";
  if (value >= 0.02) return "thin";
  return "no";
}

export function formatEdgePercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

export function selectionLabel(market: MarketKey, side: number, line?: string): string {
  const name = MARKETS[market].labels[side] ?? "";
  if (market !== "1x2" && line) return `${name} ${line}`;
  return name;
}

function readDecimals(values: readonly string[] | undefined, count: number): DecimalOdds[] | null {
  if (!values || values.length < count) return null;
  const decimals: DecimalOdds[] = [];
  for (let index = 0; index < count; index += 1) {
    const decimal = toDecimal(values[index] ?? "");
    if (!decimal) return null;
    decimals.push(decimal);
  }
  return decimals;
}

export function bestEdge(fixture: Fixture): BestEdge | null {
  let best: BestEdge | null = null;
  const prices = fixture.prices ?? {};
  for (const market of Object.keys(MARKETS) as MarketKey[]) {
    const marketPrices = prices[market];
    if (!marketPrices) continue;
    const count = MARKETS[market].labels.length;
    const pinnacle = readDecimals(marketPrices.Pinnacle, count);
    if (!pinnacle) continue;
    const fair = fairProbabilities(pinnacle);
    if (!fair) continue;
    for (const book of SOFT_BOOKS) {
      const mine = marketPrices[book] ?? [];
      for (let side = 0; side < count; side += 1) {
        const decimal = toDecimal(mine[side] ?? "");
        if (!decimal) continue;
        const value = edge(fair.probabilities[side] ?? 0, decimal);
        if (!best || value > best.edge) {
          best = {
            edge: value,
            book,
            market,
            side,
            dec: decimal,
            line: marketPrices.line,
          };
        }
      }
    }
  }
  return best;
}

export function parseFixtureLines(text: string, teams: readonly string[], id: () => string): Fixture[] {
  const added: Fixture[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length < 2) continue;
    let when = "";
    let homeRaw: string;
    let awayRaw: string;
    if (parts.length >= 3) {
      when = parts[0] ?? "";
      homeRaw = parts[1] ?? "";
      awayRaw = parts[2] ?? "";
    } else {
      homeRaw = parts[0] ?? "";
      awayRaw = parts[1] ?? "";
    }
    const home = matchTeam(homeRaw, teams);
    const away = matchTeam(awayRaw, teams);
    if (!home || !away || home === away) continue;
    added.push({ id: id(), when, home, away, prices: {}, notes: "" });
  }
  return added;
}
