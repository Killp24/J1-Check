import type { HistMatch } from "./types";

export function normName(name: string): string {
  return String(name || "")
    .toLowerCase()
    .replace(/f\.?c\.?/g, " ")
    .replace(/[^a-z]/g, "")
    .slice(0, 7);
}

export function matchTeam(input: string, teams: readonly string[]): string | null {
  const key = normName(input);
  if (!key) return null;
  const exact = teams.filter((team) => normName(team) === key);
  if (exact.length === 1) return exact[0] ?? null;
  const loose = teams.filter((team) => {
    const teamKey = normName(team);
    return teamKey.startsWith(key.slice(0, 5)) || key.startsWith(teamKey.slice(0, 5));
  });
  if (loose.length === 1) return loose[0] ?? null;
  const trimmed = input.trim();
  return trimmed || null;
}

export function parseHistory(text: string): HistMatch[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const head = lines[0]!.replace(/^\uFEFF/, "").split(",");
  const matches: HistMatch[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    head.forEach((column, index) => {
      row[column.trim()] = (cells[index] ?? "").trim();
    });
    if (!row.Home || !row.Res) continue;
    matches.push({
      date: row.Date ?? "",
      season: row.Season ?? "",
      home: row.Home,
      away: row.Away ?? "",
      hg: Number(row.HG),
      ag: Number(row.AG),
      res: row.Res,
    });
  }
  return matches;
}

export async function fetchHistory(url: string): Promise<HistMatch[]> {
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`History request failed (${response.status})`);
  const text = await response.text();
  if (!text.trim()) throw new Error("no data");
  const matches = parseHistory(text);
  if (!matches.length) throw new Error("no data");
  return matches;
}

export function seasonList(matches: readonly HistMatch[]): string[] {
  return [...new Set(matches.map((match) => match.season))].sort();
}

export function currentTeams(matches: readonly HistMatch[]): string[] {
  const seasons = seasonList(matches);
  const recent = new Set(seasons.slice(-2));
  const live = new Set<string>();
  for (const match of matches) {
    if (!recent.has(match.season)) continue;
    live.add(match.home);
    live.add(match.away);
  }
  return [...live].sort();
}

export interface FormCell {
  kind: "w" | "l" | "d";
  title: string;
}

export function formCells(matches: readonly HistMatch[], team: string, count = 6): FormCell[] {
  return matches
    .filter((match) => match.home === team || match.away === team)
    .slice(-count)
    .map((match) => {
      const atHome = match.home === team;
      const goalsFor = atHome ? match.hg : match.ag;
      const goalsAgainst = atHome ? match.ag : match.hg;
      const kind = goalsFor > goalsAgainst ? "w" : goalsFor < goalsAgainst ? "l" : "d";
      return {
        kind,
        title: `${match.date} ${match.home} ${match.hg}-${match.ag} ${match.away}`,
      };
    });
}

export interface VenueSplit {
  wins: number;
  played: number;
  goalsPerGame: number;
}

export function venueSplit(matches: readonly HistMatch[], team: string, venue: "home" | "away"): VenueSplit {
  const all = matches.filter((match) => (venue === "home" ? match.home === team : match.away === team));
  const last = all.slice(-10);
  const wins = last.filter((match) => (venue === "home" ? match.hg > match.ag : match.ag > match.hg)).length;
  const goalsPerGame = last.length
    ? last.reduce((total, match) => total + match.hg + match.ag, 0) / last.length
    : 0;
  return { wins, played: last.length, goalsPerGame };
}

export interface HeadToHead {
  meetings: HistMatch[];
  homeWins: number;
  awayWins: number;
  goalsPerGame: number;
  over25Rate: number;
}

export function headToHead(matches: readonly HistMatch[], home: string, away: string): HeadToHead {
  const meetings = matches.filter(
    (match) => (match.home === home && match.away === away) || (match.home === away && match.away === home),
  );
  const winsFor = (team: string) =>
    meetings.filter((match) => (match.home === team && match.hg > match.ag) || (match.away === team && match.ag > match.hg))
      .length;
  const goalsPerGame = meetings.length
    ? meetings.reduce((total, match) => total + match.hg + match.ag, 0) / meetings.length
    : 0;
  const over25Rate = meetings.length
    ? meetings.filter((match) => match.hg + match.ag > 2.5).length / meetings.length
    : 0;
  return {
    meetings,
    homeWins: winsFor(home),
    awayWins: winsFor(away),
    goalsPerGame,
    over25Rate,
  };
}
