import { describe, expect, it } from "vitest";
import {
  americanFrom,
  edge,
  fairProbabilities,
  formatAmerican,
  toDecimal,
  type AmericanOdds,
  type DecimalOdds,
} from "./odds";

const decimalAndAmericanStayDistinct: [
  AmericanOdds extends DecimalOdds ? never : true,
  DecimalOdds extends AmericanOdds ? never : true,
] = [true, true];

function americanCannotPriceEdge(am: AmericanOdds, fair: number): number {
  // @ts-expect-error American odds cannot be passed where decimal odds are required
  return edge(fair, am);
}

function mustDecimal(input: string): DecimalOdds {
  const decimal = toDecimal(input);
  if (!decimal) throw new Error(`expected decimal odds from ${input}`);
  return decimal;
}

describe("toDecimal", () => {
  it("reads decimal odds", () => {
    expect(toDecimal("2.10")).toBeCloseTo(2.1, 12);
    expect(toDecimal("  2.50 ")).toBeCloseTo(2.5, 12);
  });

  it("reads American odds, including a unicode minus", () => {
    expect(toDecimal("+110")).toBeCloseTo(2.1, 12);
    expect(toDecimal("-130")).toBeCloseTo(1 + 100 / 130, 12);
    expect(toDecimal("\u2212130")).toBeCloseTo(1 + 100 / 130, 12);
    expect(toDecimal("+ 110")).toBeCloseTo(2.1, 12);
  });

  it("treats an unsigned price of 100 or more as American", () => {
    expect(toDecimal("100")).toBeCloseTo(2, 12);
    expect(toDecimal("+100")).toBeCloseTo(2, 12);
    expect(toDecimal("-100")).toBeCloseTo(2, 12);
  });

  it("rejects empty and unusable prices", () => {
    expect(toDecimal("")).toBeNull();
    expect(toDecimal("   ")).toBeNull();
    expect(toDecimal("1")).toBeNull();
    expect(toDecimal("1.00")).toBeNull();
    expect(toDecimal("0.5")).toBeNull();
    expect(toDecimal("+99")).toBeNull();
    expect(toDecimal("-50")).toBeNull();
    expect(toDecimal("abc")).toBeNull();
    expect(toDecimal("+")).toBeNull();
    expect(toDecimal("-")).toBeNull();
  });
});

describe("americanFrom", () => {
  it("uses a plus price at even money and above", () => {
    expect(americanFrom(mustDecimal("2.00"))).toBe(100);
    expect(americanFrom(mustDecimal("+110"))).toBe(110);
    expect(americanFrom(mustDecimal("3.50"))).toBe(250);
  });

  it("uses a minus price below even money", () => {
    expect(americanFrom(mustDecimal("-130"))).toBe(-130);
    expect(americanFrom(mustDecimal("-200"))).toBe(-200);
  });

  it("rejects a decimal price that is not greater than 1", () => {
    expect(() => americanFrom(1 as DecimalOdds)).toThrow(RangeError);
  });
});

describe("American and decimal round-trips", () => {
  const prices = ["+100", "+110", "+250", "-110", "-130", "-200", "\u2212150", "+10000", "2.00", "1.50"];

  it.each(prices)("converts %s to American and back to the same American price", (input) => {
    const decimal = mustDecimal(input);
    const american = americanFrom(decimal);
    const text = american >= 0 ? `+${american}` : String(american);
    const back = mustDecimal(text);
    expect(americanFrom(back)).toBe(american);
  });

  it("preserves integer American prices exactly", () => {
    expect(americanFrom(mustDecimal("+110"))).toBe(110);
    expect(americanFrom(mustDecimal("-130"))).toBe(-130);
    expect(americanFrom(mustDecimal("\u2212150"))).toBe(-150);
    expect(formatAmerican(americanFrom(mustDecimal("-130")))).toBe("\u2212130");
    expect(formatAmerican(americanFrom(mustDecimal("+110")))).toBe("+110");
  });

  it("does not treat American and decimal odds as the same type", () => {
    expect(decimalAndAmericanStayDistinct).toEqual([true, true]);
    expect(americanCannotPriceEdge).toEqual(expect.any(Function));
  });
});

describe("fairProbabilities", () => {
  it("strips a three-way margin proportionally", () => {
    const decimals = [mustDecimal("2.10"), mustDecimal("3.40"), mustDecimal("3.80")];
    const fair = fairProbabilities(decimals);
    expect(fair).not.toBeNull();
    const implied = decimals.map((dec) => 1 / dec);
    const sum = implied.reduce((total, price) => total + price, 0);

    expect(sum).toBeGreaterThan(1);
    expect(fair?.margin).toBeCloseTo(sum - 1, 12);
    expect(fair?.probabilities).toHaveLength(3);
    const total = fair?.probabilities.reduce((acc, price) => acc + price, 0) ?? 0;
    expect(total).toBeCloseTo(1, 12);
    fair?.probabilities.forEach((probability, index) => {
      expect(probability).toBeCloseTo(implied[index]! / sum, 12);
      expect(probability).toBeLessThan(implied[index]!);
    });
    expect((fair?.probabilities[0] ?? 0) / (fair?.probabilities[1] ?? 1)).toBeCloseTo(
      implied[0]! / implied[1]!,
      12,
    );
  });

  it("keeps a zero-margin three-way line unchanged", () => {
    const decimals = [mustDecimal("2"), mustDecimal("3"), mustDecimal("6")];
    const fair = fairProbabilities(decimals);
    expect(fair?.margin).toBeCloseTo(0, 12);
    expect(fair?.probabilities[0]).toBeCloseTo(0.5, 12);
    expect(fair?.probabilities[1]).toBeCloseTo(1 / 3, 12);
    expect(fair?.probabilities[2]).toBeCloseTo(1 / 6, 12);
  });

  it("returns null when there is nothing to normalise", () => {
    expect(fairProbabilities([])).toBeNull();
    expect(fairProbabilities([1 as DecimalOdds, mustDecimal("2.00")])).toBeNull();
  });
});

describe("edge", () => {
  it("is fair probability times decimal odds, minus one", () => {
    const price = mustDecimal("2.20");
    expect(edge(0.5, price)).toBeCloseTo(0.1, 12);
    expect(edge(1 / 2.2, price)).toBeCloseTo(0, 10);
    expect(edge(0.4, price)).toBeLessThan(0);
  });
});
