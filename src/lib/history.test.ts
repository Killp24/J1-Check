import { describe, expect, it } from "vitest";
import { currentTeams, formCells, headToHead, matchTeam, normName, parseHistory, venueSplit } from "./history";

const CSV = [
  "Country,League,Season,Date,Time,Home,Away,HG,AG,Res,PSCH",
  "Japan,J1 League,2024,01/03/2024,05:00,Old Town,Team Alpha,1,0,H,1.5",
  "Japan,J1 League,2024,01/03/2024,05:00,Team Alpha,Team Beta,2,1,H,1.5",
  "Japan,J1 League,2025,01/03/2025,05:00,Team Alpha,Team Beta,0,0,D,2.0",
  "Japan,J1 League,2025,08/03/2025,05:00,Team Beta,Team Alpha,1,2,A,3.0",
  "Japan,J1 League,2026,01/03/2026,05:00,Team Gamma,Team Alpha,0,1,A,2.2",
  "Japan,J1 League,2026,02/03/2026,05:00,Future Home,Future Away,,,",
].join("\n");

describe("history", () => {
  const matches = parseHistory(`\uFEFF${CSV}`);

  it("drops unfinished rows and keeps results", () => {
    expect(matches).toHaveLength(5);
    expect(matches[0]?.home).toBe("Old Town");
    expect(matches.at(-1)?.away).toBe("Team Alpha");
  });

  it("keeps only teams from the last two seasons", () => {
    expect(currentTeams(matches)).toEqual(["Team Alpha", "Team Beta", "Team Gamma"]);
  });

  it("matches shortened club names", () => {
    expect(normName("FC Tokyo")).toBe(normName("Tokyo"));
    const teams = ["FC Tokyo", "Kawasaki Frontale", "Kashima Antlers", "Urawa Reds"];
    expect(matchTeam("Tokyo", teams)).toBe("FC Tokyo");
    expect(matchTeam("Urawa Red Diamonds", teams)).toBe("Urawa Reds");
    expect(matchTeam("Antlers", teams)).toBe("Antlers");
  });

  it("builds form, venue splits, and head to head", () => {
    expect(formCells(matches, "Team Alpha").map((cell) => cell.kind)).toEqual(["l", "w", "d", "w", "w"]);
    const home = venueSplit(matches, "Team Alpha", "home");
    expect(home.wins).toBe(1);
    expect(home.played).toBe(2);
    expect(home.goalsPerGame).toBeCloseTo(1.5, 12);
    const h2h = headToHead(matches, "Team Alpha", "Team Beta");
    expect(h2h.meetings).toHaveLength(3);
    expect(h2h.homeWins).toBe(2);
    expect(h2h.awayWins).toBe(0);
    expect(h2h.goalsPerGame).toBeCloseTo(2, 12);
    expect(h2h.over25Rate).toBeCloseTo(2 / 3, 12);
  });
});
