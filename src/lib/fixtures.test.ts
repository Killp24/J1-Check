import { describe, expect, it } from "vitest";
import { bestEdge, marketOffers, parseFixtureLines } from "./fixtures";
import { edge, fairProbabilities, toDecimal } from "./odds";
import type { Fixture } from "./types";

const teams = ["FC Tokyo", "Kawasaki Frontale", "Kashima Antlers", "Urawa Reds"];

describe("parseFixtureLines", () => {
  it("reads time, home, and away, and resolves club names", () => {
    const fixtures = parseFixtureLines(
      "Sat 19:00 | Tokyo | Kawasaki\nnope\nKashima | Urawa Red Diamonds\n",
      teams,
      () => "f1",
    );
    expect(fixtures).toHaveLength(2);
    expect(fixtures[0]).toMatchObject({ when: "Sat 19:00", home: "FC Tokyo", away: "Kawasaki Frontale" });
    expect(fixtures[1]).toMatchObject({ when: "", home: "Kashima Antlers", away: "Urawa Reds" });
  });

  it("skips a side that resolves to the same club", () => {
    expect(parseFixtureLines("Tokyo | FC Tokyo", teams, () => "f1")).toEqual([]);
  });
});

describe("bestEdge", () => {
  it("picks the largest edge against Pinnacle's fair price", () => {
    const pinnacle = ["2.10", "3.40", "3.50"];
    const home = "2.40";
    const fixture: Fixture = {
      id: "f1",
      when: "",
      home: "Kashima Antlers",
      away: "Urawa Reds",
      notes: "",
      prices: {
        "1x2": { Pinnacle: pinnacle, Bet365: [home, "", ""] },
        ou: { line: "2.5", Pinnacle: ["1.90", "1.90"], DraftKings: ["2.05", ""] },
      },
    };
    const best = bestEdge(fixture);
    const fair = fairProbabilities(pinnacle.map((price) => toDecimal(price)!))!;
    const homeEdge = edge(fair.probabilities[0]!, toDecimal(home)!);
    expect(best?.book).toBe("Bet365");
    expect(best?.market).toBe("1x2");
    expect(best?.side).toBe(0);
    expect(best?.edge).toBeCloseTo(homeEdge, 12);
    expect(homeEdge).toBeGreaterThan(0.04);
  });

  it("lists every priced book, with no edge until Pinnacle is complete", () => {
    const fixture: Fixture = {
      id: "f1",
      when: "",
      home: "A",
      away: "B",
      notes: "",
      prices: { "1x2": { Bet365: ["2.40", "", ""], DraftKings: ["", "3.60", ""] } },
    };
    const open = marketOffers(fixture, "1x2");
    expect(open.map((offer) => [offer.book, offer.side, offer.edge])).toEqual([
      ["Bet365", 0, null],
      ["DraftKings", 1, null],
    ]);
    fixture.prices["1x2"] = { ...fixture.prices["1x2"], Pinnacle: ["2.10", "3.40", "3.50"] };
    const priced = marketOffers(fixture, "1x2");
    expect(priced[0]?.edge).toBeGreaterThan(0);
    expect(priced[1]?.edge).not.toBeNull();
  });

  it("returns null until every Pinnacle price is present", () => {
    const fixture: Fixture = {
      id: "f1",
      when: "",
      home: "A",
      away: "B",
      notes: "",
      prices: { "1x2": { Pinnacle: ["2.10"], Bet365: ["3.00", "3.00", "3.00"] } },
    };
    expect(bestEdge(fixture)).toBeNull();
  });
});
