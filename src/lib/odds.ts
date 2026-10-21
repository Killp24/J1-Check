declare const decimalBrand: unique symbol;
declare const americanBrand: unique symbol;

/** Decimal odds, such as 2.10. Not interchangeable with American odds. */
export type DecimalOdds = number & { readonly [decimalBrand]: "DecimalOdds" };

/** American odds, such as +110 or −130, stored as a signed number. */
export type AmericanOdds = number & { readonly [americanBrand]: "AmericanOdds" };

function asDecimal(value: number): DecimalOdds {
  return value as DecimalOdds;
}

function asAmerican(value: number): AmericanOdds {
  return value as AmericanOdds;
}

/**
 * Accepts decimal odds (`2.10`) or American odds (`+110`, `-130`, `−130`).
 * A number whose absolute value is 100 or more, with or without a sign, is American.
 * Returns null when the text is empty or not a usable price.
 */
export function toDecimal(input: string): DecimalOdds | null {
  if (input == null) return null;
  const text = String(input).trim().replace(/\u2212/g, "-").replace(/\s/g, "");
  if (!text) return null;
  if (/^[+-]/.test(text) || Math.abs(Number.parseFloat(text)) >= 100) {
    const american = Number.parseFloat(text);
    if (Number.isNaN(american) || Math.abs(american) < 100) return null;
    const decimal = american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
    return asDecimal(decimal);
  }
  const decimal = Number.parseFloat(text);
  if (Number.isNaN(decimal) || decimal <= 1) return null;
  return asDecimal(decimal);
}

/** American price for a decimal price. Positive means a plus price, negative a minus price. */
export function americanFrom(dec: DecimalOdds): AmericanOdds {
  if (!(dec > 1) || !Number.isFinite(dec)) {
    throw new RangeError("Decimal odds must be greater than 1");
  }
  if (dec >= 2) return asAmerican(Math.round((dec - 1) * 100));
  return asAmerican(-Math.round(100 / (dec - 1)));
}

export function formatAmerican(odds: AmericanOdds): string {
  if (odds > 0) return `+${odds}`;
  if (odds < 0) return `\u2212${Math.abs(odds)}`;
  return "0";
}

/** Format a number that is already decimal odds, for prices read back from storage. */
export function formatDecimalAsAmerican(dec: number): string {
  if (!(dec > 1) || !Number.isFinite(dec)) return "";
  return formatAmerican(americanFrom(asDecimal(dec)));
}

export interface FairLine {
  probabilities: number[];
  margin: number;
}

/**
 * Remove the bookmaker margin in proportion to each outcome's implied probability.
 * `probabilities` sum to 1. `margin` is the overround (implied total minus 1).
 */
export function fairProbabilities(decimals: readonly DecimalOdds[]): FairLine | null {
  if (decimals.length === 0) return null;
  if (decimals.some((dec) => !(dec > 1) || !Number.isFinite(dec))) return null;
  const implied = decimals.map((dec) => 1 / dec);
  const sum = implied.reduce((total, price) => total + price, 0);
  if (!(sum > 0) || !Number.isFinite(sum)) return null;
  return {
    probabilities: implied.map((price) => price / sum),
    margin: sum - 1,
  };
}

/** Expected value of a 1-unit stake: fair probability times decimal odds, minus 1. */
export function edge(fair: number, dec: DecimalOdds): number {
  return fair * dec - 1;
}
